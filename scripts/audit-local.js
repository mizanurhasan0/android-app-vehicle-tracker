/* Read-only candidate report; absence from this graph is not deletion approval. */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const absolute = file => path.join(root, file);
const relative = file => path.relative(root, file).split(path.sep).join('/');
function walk(directory) {
  return fs
    .readdirSync(absolute(directory), { withFileTypes: true })
    .flatMap(entry => {
      const file = `${directory}/${entry.name}`;
      return entry.isDirectory() ? walk(file) : [file];
    });
}
const sourcePattern = /\.[cm]?[jt]sx?$/;
const sources = ['index.js', 'App.tsx', ...walk('src')].filter(file =>
  sourcePattern.test(file),
);
const tests = walk('__tests__').filter(file => sourcePattern.test(file));
const configFile = ts.readConfigFile(
  absolute('tsconfig.json'),
  ts.sys.readFile,
);
if (configFile.error) {
  throw new Error(
    ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'),
  );
}
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
if (config.errors.length) {
  throw new Error(
    config.errors
      .map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n'))
      .join('\n'),
  );
}
// Android/React Native variants take precedence, as in Metro. This is not a
// bundle-size or export-level analysis; type-only references count as usage.
const options = {
  ...config.options,
  moduleSuffixes: ['.android', '.native', ''],
};
const edges = new Map();
const imports = [];
const unresolved = [];
const dynamic = [];
const packageName = specifier =>
  specifier.startsWith('@')
    ? specifier.split('/').slice(0, 2).join('/')
    : specifier.split('/')[0];

for (const file of [...sources, ...tests].sort()) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(absolute(file), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  edges.set(file, []);
  function visit(node) {
    let specifier;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      specifier = node.moduleSpecifier;
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      specifier = node.moduleReference.expression;
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require'))
    ) {
      specifier = node.arguments[0];
      if (!specifier) dynamic.push({ file, expression: node.getText(source) });
    }
    if (specifier) {
      const line =
        source.getLineAndCharacterOfPosition(specifier.getStart()).line + 1;
      const evidence = { file, line };
      if (!ts.isStringLiteralLike(specifier)) {
        dynamic.push({ ...evidence, expression: specifier.getText(source) });
      } else {
        const value = specifier.text;
        const resolved = ts.resolveModuleName(
          value,
          absolute(file),
          options,
          ts.sys,
        ).resolvedModule;
        const asset = path.resolve(path.dirname(absolute(file)), value);
        const target =
          resolved?.resolvedFileName ||
          (value.startsWith('.') && ts.sys.fileExists(asset)
            ? asset
            : undefined);
        if (
          target &&
          target.startsWith(`${root}${path.sep}`) &&
          !target.includes(`${path.sep}node_modules${path.sep}`)
        ) {
          edges.get(file).push(relative(target));
          imports.push({ ...evidence, target: relative(target) });
        } else if (value.startsWith('.') || path.isAbsolute(value)) {
          unresolved.push({ ...evidence, specifier: value });
        } else {
          imports.push({ ...evidence, package: packageName(value) });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

function reachable(entries) {
  const seen = new Set();
  function visit(file) {
    if (seen.has(file)) return;
    seen.add(file);
    (edges.get(file) || []).forEach(visit);
  }
  entries.forEach(visit);
  return seen;
}
const runtime = reachable(['index.js']);
const testGraph = reachable(tests);
const evidenceFor = file => imports.filter(item => item.target === file);
const dependencies = Object.keys(
  require('../package.json').dependencies,
).sort();
const manifests = new Map();
for (const name of dependencies) {
  const manifest = absolute(`node_modules/${name}/package.json`);
  if (fs.existsSync(manifest)) {
    manifests.set(name, JSON.parse(fs.readFileSync(manifest, 'utf8')));
  }
}
const dependencyReport = dependencies.map(name => {
  const references = imports.filter(item => item.package === name);
  const runtimeImports = references.filter(item => runtime.has(item.file));
  // Peer/native dependencies may have no direct app import. Report installed
  // manifest evidence instead of labelling them automatically unused.
  const requiredBy = [...manifests].flatMap(([owner, manifest]) => {
    if (owner === name) return [];
    return ['dependencies', 'peerDependencies', 'optionalDependencies']
      .filter(field => manifest[field]?.[name])
      .map(field => ({ package: owner, field, range: manifest[field][name] }));
  });
  return {
    name,
    status: runtimeImports.length
      ? 'direct-reference'
      : requiredBy.length
      ? 'required-by-installed-package'
      : 'review-candidate',
    runtimeImports,
    otherImports: references.filter(item => !runtime.has(item.file)),
    requiredBy,
  };
});

console.log(
  JSON.stringify(
    {
      entry: 'index.js',
      scope:
        'Android static imports/re-exports/require/import(), including types; src and assets only',
      limitations: [
        'Review candidates, not deletion approval; no unused-export analysis.',
        'Tests are separate roots; jest.mock strings are not import edges.',
        'Computed imports, native resources, remote URLs and string-based asset lookup need manual review.',
        'Metro resolution is approximated; asset density variants need manual review.',
        'Dependency checks cover production declarations and installed direct-package manifests, not dev tooling or the full transitive graph.',
        'Docs screenshots, native icons and deliberately retained brand sources need manual review.',
      ],
      sourceCandidates: sources
        .filter(file => !runtime.has(file))
        .sort()
        .map(file => ({
          file,
          reachableFromTests: testGraph.has(file),
          importers: evidenceFor(file),
        })),
      assetCandidates: walk('assets')
        .filter(file => !runtime.has(file))
        .sort()
        .map(file => ({
          file,
          bytes: fs.statSync(absolute(file)).size,
          importers: evidenceFor(file),
        })),
      dependencies: dependencyReport,
      missingInstalledManifests: dependencies.filter(
        name => !manifests.has(name),
      ),
      unresolved,
      dynamic,
    },
    null,
    2,
  ),
);
// Findings are informational. An incomplete graph must not look like a clean run.
if (
  unresolved.length ||
  dynamic.length ||
  manifests.size !== dependencies.length
) {
  process.exitCode = 1;
}
