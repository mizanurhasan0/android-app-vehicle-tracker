/* eslint-env node */
// Writes diagnostics only to a fresh temporary directory, never the app assets.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Metro = require('metro');
const { loadConfig, mergeConfig } = require('metro-config');

async function main() {
  const root = path.resolve(__dirname, '..');
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'tracker-bundle-'));
  const base = await loadConfig({
    cwd: root,
    config: path.join(root, 'metro.config.js'),
  });
  const config = mergeConfig(base, {
    maxWorkers: 2,
    cacheStores: [],
    fileMapCacheDirectory: output,
    resolver: { useWatchman: false },
  });
  const bundle = path.join(output, 'index.android.js');
  await Metro.runBuild(config, {
    entry: 'index.js',
    platform: 'android',
    dev: false,
    minify: true,
    out: bundle,
    sourceMap: true,
    sourceMapOut: bundle + '.map',
    sourceMapUrl: 'index.android.js.map',
  });
  const map = JSON.parse(fs.readFileSync(bundle + '.map', 'utf8'));
  const sources =
    map.sources || map.sections.flatMap(section => section.map.sources);
  console.log(
    JSON.stringify(
      {
        output,
        minifiedBytes: fs.statSync(bundle).size,
        modules: sources.length,
        lucideModules: sources.filter(source =>
          source.includes('/lucide-react-native/'),
        ).length,
      },
      null,
      2,
    ),
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
