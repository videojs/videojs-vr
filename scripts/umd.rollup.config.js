/**
 * Rollup configuration for packaging the plugin in a module that is consumable
 * as the `src` of a `script` tag or via AMD or similar client-side loading.
 *
 * This module DOES include its dependencies.
 */
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import resolve from 'rollup-plugin-node-resolve';
import replace from './rollup-replace';

export default {
  input: 'src/plugin.js',
  output: {
    name: 'videojsVr',
    file: 'dist/videojs-vr.js',
    format: 'umd',
    globals: {
      'video.js': 'videojs'
    }
  },
  external: [
    'video.js'
  ],
  legacy: true,
  plugins: [
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
