import replace from 'rollup-plugin-re';

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

export default function(options) {
  return replace(Object.assign({
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
          }
        });
        return code;
      }}
    ]}, options || {}));
}

