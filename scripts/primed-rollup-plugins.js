const babel = require('rollup-plugin-babel');
const commonjs = require('rollup-plugin-commonjs');
const json = require('rollup-plugin-json');
const multiEntry = require('rollup-plugin-multi-entry');
const resolve = require('rollup-plugin-node-resolve');
const {uglify} = require('rollup-plugin-uglify');
const {minify} = require('uglify-es');
const browsersList = require('./browserslist');
const replace = require('rollup-plugin-re');

// three modules to find-replace in
const modules = [
  'VRControls',
  'VREffect',
  'OrbitControls',
  'DeviceOrientationControls'
];

const globalReplace = function(str, pattern, replacement) {
  return str.replace(new RegExp(pattern, 'g'), replacement);
};

module.exports = {
  babel: babel({
    babelrc: false,
    exclude: 'node_modules/**',
    presets: [
      ['env', {loose: true, modules: false, targets: {browsers: browsersList}}]
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
  replace: replace({
    include: ['node_modules/three/examples/js/**'],
    patterns: [
      {transform(code, id) {
        modules.forEach((m) => {
          if (!(new RegExp(m)).test(id)) {
            return;
          }

          // trun the global modifiction into an import and a local variable definition
          code = code.replace(`THREE.${m} =`, `import * as THREE from 'three';\nvar ${m} =`);

          // change references from the global modification to the local variable
          code = globalReplace(code, `THREE.${m}`, m);

          // export that local variable as default from this module
          code += `\nexport default ${m};`;

          // expose private functions so that users can manually use controls
          // and we can add orientation controls
          if (m === 'OrbitControls') {
            code = globalReplace(code, 'function rotateLeft\\(', 'rotateLeft = function(');
            code = globalReplace(code, 'function rotateUp\\(', 'rotateUp = function(');

            code = globalReplace(code, 'rotateLeft', 'scope.rotateLeft');
            code = globalReplace(code, 'rotateUp', 'scope.rotateUp');
            // comment out the context menu prevent default line...
            code = globalReplace(code,
              "scope.domElement.addEventListener\\( 'contextmenu'",
              "\/\/scope.domElement.addEventListener\\( 'contextmenu'"
            );
          }
        });
        return code;
      }}
    ]
  })
};
