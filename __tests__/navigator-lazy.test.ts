/** @jest-environment node */
import { execFileSync } from 'child_process';
import { resolve } from 'path';
import { runInNewContext } from 'vm';

type TransformedNavigator = {
  profile: string;
  inlineRequires: boolean;
  dependencies: string[];
  code: string;
};

// Run the installed production transformer outside Jest's Babel/module mocks.
// Only Navigator.tsx is transformed: no dependency graph, Metro server or bundle.
const transformScript = `
const fs = require('fs');
const path = require('path');
const { transform } = require('metro-transform-worker');
const { getTransformFn } = require('metro/private/lib/transformHelpers');
(async () => {
  const config = await require('./metro.config');
  const filename = path.resolve('src/navigation/Navigator.tsx');
  const results = [];
  for (const profile of ['default', 'hermes-stable']) {
    let appliedOptions;
    const bundler = {
      transformFile: (file, options) => {
        appliedOptions = options;
        return transform(config.transformer, process.cwd(),
          path.relative(process.cwd(), file), fs.readFileSync(file), options);
      },
      getDependencyGraph: () => { throw new Error('No graph allowed in this test'); },
    };
    const deltaBundler = {
      getDependencies: () => { throw new Error('No bundle allowed in this test'); },
    };
    const transformFile = await getTransformFn(
      [filename], bundler, deltaBundler, config,
      { dev: false, minify: true, platform: 'android', type: 'module',
        unstable_transformProfile: profile }, {},
    );
    const result = await transformFile(filename);
    results.push({ profile, inlineRequires: appliedOptions.inlineRequires,
      dependencies: result.dependencies.map(dependency => dependency.name),
      code: result.output.find(output => output.type === 'js/module').data.code });
  }
  process.stdout.write(JSON.stringify(results));
})().catch(error => { console.error(error); process.exitCode = 1; });
`;

let transformed: TransformedNavigator[];
beforeAll(() => {
  transformed = JSON.parse(
    execFileSync(process.execPath, ['-e', transformScript], {
      cwd: resolve(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'production', BABEL_ENV: 'production' },
      encoding: 'utf8',
      timeout: 20000,
    }),
  );
}, 25000);

type Element = {
  type: unknown;
  props: {
    children?: Element | Element[];
    name?: string;
    component?: unknown;
    getComponent?: () => unknown;
    onStateChange?: () => void;
    options?: { title?: string };
  };
};

it.each(['default', 'hermes-stable'])(
  '%s production transform resolves screen modules only when getComponent is called',
  profile => {
    const result = transformed.find(item => item.profile === profile)!;
    expect(result.inlineRequires).toBe(true);
    const screenModules = result.dependencies.filter(
      name => name.startsWith('../screens/') || name === './routeScreens',
    );
    expect(screenModules.length).toBeGreaterThan(0);
    const resolutions: string[] = [];
    const moduleCache = new Map<string, object>();
    const Screen = Symbol('Screen');
    let role = 'ADMIN';
    let language = 'en';
    let active = 'Fleet';
    let route = 'Fleet';
    const jsx = (type: unknown, props: Element['props']) => ({ type, props });
    const dependencies: Record<string, unknown> = {
      '@babel/runtime/helpers/interopRequireDefault': require('@babel/runtime/helpers/interopRequireDefault'),
      '@babel/runtime/helpers/slicedToArray': require('@babel/runtime/helpers/slicedToArray'),
      react: {
        Fragment: Symbol('Fragment'),
        useState: () => [
          active,
          (value: string) => {
            active = value;
          },
        ],
      },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      'react-native': {
        View: Symbol('View'),
        StyleSheet: { create: (value: unknown) => value },
      },
      '@react-navigation/native-stack': {
        createNativeStackNavigator: () => ({
          Screen,
          Navigator: Symbol('Stack'),
        }),
      },
      '@react-navigation/native': {
        DefaultTheme: { colors: {} },
        NavigationContainer: Symbol('NavigationContainer'),
        createNavigationContainerRef: () => ({
          getCurrentRoute: () => ({ name: route }),
        }),
      },
      '../context/AuthContext': {
        useAuth: () => ({ session: { user: { role } } }),
      },
      '../i18n': {
        useTranslation: () => ({
          t: (title: string) => language + ':' + title,
        }),
      },
      '../theme': { colors: {} },
      './tabs': { adminTabs: [], parentTabs: [] },
      './TabBar': { TabBar: Symbol('TabBar') },
    };
    const load = (name: string) => {
      if (screenModules.includes(name)) {
        resolutions.push(name);
        if (!moduleCache.has(name)) {
          // Stable exports model Metro's module cache. Actual screen identities
          // and all route mappings are covered by navigation-language.test.tsx.
          const exports: Record<string, () => null> = {};
          moduleCache.set(
            name,
            new Proxy(exports, {
              get: (target, key: string) => (target[key] ||= () => null),
            }),
          );
        }
        return moduleCache.get(name);
      }
      if (name in dependencies) return dependencies[name];
      throw new Error('Unexpected Navigator dependency: ' + name);
    };
    const module = { exports: {} as { Navigator: () => Element } };
    runInNewContext(
      result.code,
      {
        __d: (factory: (...args: unknown[]) => void) =>
          factory(
            {},
            load,
            load,
            load,
            module,
            module.exports,
            result.dependencies,
          ),
      },
      { timeout: 1000 },
    );
    expect(resolutions).toEqual([]);

    const registered = (element: Element): Element[] => {
      if (!element) return [];
      if (element.type === Screen) return [element];
      return [element.props.children]
        .flat()
        .flatMap(child => (child ? registered(child) : []));
    };
    let tree = module.exports.Navigator();
    const initial = registered(tree);
    expect(initial).toHaveLength(32);
    expect(resolutions).toEqual([]);
    const fleet = initial.find(node => node.props.name === 'Fleet')!;
    expect(fleet.props.component).toBeUndefined();
    const home = fleet.props.getComponent!();
    expect(home).toEqual(expect.any(Function));
    expect(resolutions).toEqual(['../screens/HomeScreen']);
    resolutions.length = 0;

    // Changing language, navigation state or auth role must not resolve more
    // screens; new callbacks must keep returning the cached component identity.
    language = 'bn';
    route = 'Bills';
    tree.props.onStateChange!();
    expect(active).toBe('Bills');
    for (const nextRole of ['ADMIN', 'GUARDIAN', 'ADMIN']) {
      role = nextRole;
      tree = module.exports.Navigator();
      expect(resolutions).toEqual([]);
      const routes = registered(tree);
      expect(routes).toHaveLength(role === 'ADMIN' ? 32 : 24);
      expect(
        routes.find(node => node.props.name === 'Bills')!.props.options!.title,
      ).toBe('bn:Payment');
      expect(
        routes.find(node => node.props.name === 'Fleet')!.props.getComponent!(),
      ).toBe(home);
      expect(resolutions.every(name => name === '../screens/HomeScreen')).toBe(
        true,
      );
      resolutions.length = 0;
    }
    const vehicles = registered(tree).find(
      node => node.props.name === 'Vehicles',
    )!;
    const vehicleScreen = vehicles.props.getComponent!();
    expect(vehicleScreen).toEqual(expect.any(Function));
    expect(vehicleScreen).not.toBe(home);
    expect(resolutions).toEqual(['../screens/fleet']);
    expect(vehicles.props.getComponent!()).toBe(vehicleScreen);
  },
);
