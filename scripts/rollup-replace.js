import replace from 'rollup-plugin-re';

// three modules to find-replace in
const modules = [
  'VRControls',
  'VREffect',
  'OrbitControls'
];

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
          code = code.replace(`THREE.${m} =`, `import * as THREE from 'three';\nconst ${m} =`);

          // change references from the global modification to the local variable
          code = code.replace(new RegExp(`THREE.${m}`, 'g'), m);

          // export that local variable as default from this module
          code += `\nexport default ${m};`;
        });
        return code;
      }}
    ]}, options || {}));
}

