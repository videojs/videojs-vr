/**
 * Rollup configuration for packaging the plugin in various formats.
 */
const babel = require('rollup-plugin-babel');
const commonjs = require('rollup-plugin-commonjs');
const json = require('rollup-plugin-json');
const multiEntry = require('rollup-plugin-multi-entry');
const resolve = require('rollup-plugin-node-resolve');
const {uglify} = require('rollup-plugin-uglify');
const {minify} = require('uglify-es');
const pkg = require('../package.json');
const replace = require('./rollup-replace');

/* to prevent going into a screen during rollup */
process.stderr.isTTY = false;

let isWatch = false;

process.argv.forEach((a) => {
  if ((/-w|--watch/).test(a)) {
    isWatch = true;
  }
});

/* configuration for plugins */
const primedPlugins = {
  babel: babel({
    babelrc: false,
    exclude: 'node_modules/**',
    presets: [
      ['env', {loose: true, modules: false, targets: {browsers: pkg.browserslist}}]
    ],
    plugins: [
      'external-helpers',
      'transform-object-assign'
    ]
  }),
  commonjs: commonjs({sourceMap: false}),
  json: json(),
  multiEntry: multiEntry({exports: false}),
  resolve: resolve({browser: true, main: true, jsnext: true}),
  uglify: uglify({output: {comments: 'some'}}, minify),
  replace
};

/* General Globals */
const moduleName = 'videojsVr';
const pluginName = 'videojs-vr';

// globals, aka replace require calls with this
const globals = {
  umd: {
    'video.js': 'videojs',
    'global': 'window',
    'global/window': 'window',
    'global/document': 'document'
  },
  module: {
    'video.js': 'videojs'
  },
  test: {
    'qunit': 'QUnit',
    'qunitjs': 'QUnit',
    'sinon': 'sinon',
    'video.js': 'videojs'
  }
};

// externals, aka don't bundle these and if not
// listed as a global don't require them either
const externals = {
  umd: Object.keys(globals.umd).concat([

  ]),
  module: Object.keys(globals.module).concat([
    'global',
    'global/document',
    'global/window'
  ]),
  test: Object.keys(globals.test).concat([

  ])
};

/* plugins that should be used in each bundle with caveats as comments */
const plugins = {
  // note uglify will be added before babel for minified bundle
  umd: [
    primedPlugins.resolve,
    primedPlugins.json,
    primedPlugins.replace,
    primedPlugins.commonjs,
    primedPlugins.babel
  ],

  module: [
    primedPlugins.resolve,
    primedPlugins.json,
    primedPlugins.replace,
    primedPlugins.commonjs,
    primedPlugins.babel
  ],

  test: [
    primedPlugins.multiEntry,
    primedPlugins.resolve,
    primedPlugins.json,
    primedPlugins.replace,
    primedPlugins.commonjs,
    primedPlugins.babel
  ]
};

/* make a build with the specifed settings */
const makeBuild = (name, settings) => {
  const b = Object.assign({}, {
    plugins: plugins[name],
    external: externals[name],
    input: 'src/plugin.js'
  }, settings);

  const fixOutput = (o) => {
    if (!o.banner) {
      o.banner = `/*! @name ${pkg.name} @version ${pkg.version} @license ${pkg.license} */`;
    }
    if (!o.globals) {
      o.globals = globals[name];
    }

    return o;
  };

  if (!Array.isArray(b.output)) {
    b.output = fixOutput(b.output);
  } else {
    b.output = b.output.map(fixOutput);
  }

  return b;
};

/* all rollup builds by name. note only object values will be used */
const builds = {
  umd: makeBuild('umd', {
    output: [{
      name: moduleName,
      file: `dist/${pluginName}.js`,
      format: 'umd'
    }]
  }),
  cjs: makeBuild('module', {
    output: [{
      file: `dist/${pluginName}.cjs.js`,
      format: 'cjs'
    }]
  }),
  es: makeBuild('module', {
    output: [{
      file: `dist/${pluginName}.es.js`,
      format: 'es'
    }]
  }),
  test: makeBuild('test', {
    input: 'test/**/*.test.js',
    output: [{
      name: `${moduleName}Tests`,
      file: 'test/dist/bundle.js',
      format: 'iife'
    }]
  })
};

if (!isWatch) {
  builds.minUmd = makeBuild('umd', {
    output: [{
      name: moduleName,
      file: `dist/${pluginName}.min.js`,
      format: 'umd'
    }],
    // we need to minify before babel
    plugins: plugins.umd
      .filter((p) => p !== primedPlugins.babel)
      .concat([primedPlugins.uglify, primedPlugins.babel])
  });

}

export default Object.values(builds);
