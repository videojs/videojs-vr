/**
 * Rollup configuration for packaging the plugin in a module that is consumable
 * by either CommonJS (e.g. Node or Browserify) or ECMAScript (e.g. Rollup).
 *
 * These modules DO NOT include their dependencies as we expect those to be
 * handled by the module system.
 */
import babel from 'rollup-plugin-babel';
import json from 'rollup-plugin-json';

export default {
  moduleName: 'videojsVr',
  entry: 'src/plugin.js',
  external: ['video.js'],
  globals: {
    'video.js': 'videojs'
  },
  plugins: [
    json(),
    babel({
      babelrc: false,
      exclude: 'node_modules/**',
      presets: [
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
  ],
  targets: [
    {dest: 'dist/videojs-vr.cjs.js', format: 'cjs'},
    {dest: 'dist/videojs-vr.es.js', format: 'es'}
  ]
};
