/**
 * Rollup configuration for packaging the plugin in a test bundle.
 *
 * This includes all dependencies for both the plugin and its tests.
 */
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import multiEntry from 'rollup-plugin-multi-entry';
import resolve from 'rollup-plugin-node-resolve';
import replace from './rollup-replace';

const name = 'videojsVrTests';
const globals = {
  'qunit': 'QUnit',
  'qunitjs': 'QUnit',
  'sinon': 'sinon',
  'video.js': 'videojs'
};

export default {
  input: 'test/**/*.test.js',
  output: {
    name,
    globals,
    file: 'test/dist/bundle.js',
    format: 'iife'
  },
  external: [
    'qunit',
    'qunitjs',
    'sinon',
    'video.js'
  ],
  legacy: true,
  plugins: [
    multiEntry({
      exports: false
    }),
    resolve({
      browser: true,
      main: true,
      jsnext: true
    }),
    json(),
    replace(),
    commonjs({
      sourceMap: false
    }),
    babel({
      babelrc: false,
      exclude: 'node_modules/**',
      presets: [
        'es3',
        ['es2015', {
          loose: true,
          modules: false
        }]
      ],
      plugins: [
        'external-helpers',
        'transform-object-assign'
      ]
    })
  ]
};
