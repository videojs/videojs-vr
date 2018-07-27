/* eslint-disable no-console */
const postcss = require('postcss');
const path = require('path');
const pkg = require('../package.json');
const banner = `@name ${pkg.name} @version ${pkg.version} @license ${pkg.license}`;
const getNow = () => Date.now();

let startTime = getNow();

/**
 * by default there is no way to print that file was written
 * this does that.
 */
const printOutput = postcss.plugin('postcss-print-output', function(opts) {
  opts = opts || {};

  return function(root, results) {
    const relativeFrom = path.relative(process.cwd(), results.opts.from);
    const relativeTo = path.relative(process.cwd(), results.opts.to);

    console.log(`${relativeFrom} -> ${relativeTo} in ${getNow() - startTime}ms`);
  };
});

/**
 * A function to set the startTime of postcss so that
 * we can print the time taken in the output.
 */
const setTime = postcss.plugin('postcss-set-time', function(opts) {
  return function(root, results) {
    startTime = getNow();
  };
});

module.exports = function(context) {
  return {
    plugins: [
      // set the startTime so that we can print the end time
      setTime(),

      // inlines local file imports
      require('postcss-import')(),

      // allows you to use newer css features, by converting
      // them into something browsers can support now.
      // see https://preset-env.cssdb.org/features
      // by default we use stage 3+
      require('postcss-preset-env')({
        browsers: pkg.browserslist,
        stage: false,
        features: {
          // turn `var(xyz)` in the actual value
          'custom-properties': {preserve: false, warnings: true},

          // flatten nested rules
          'nesting-rules': true
        }
      }),

      // adds a banner to the top of the file
      require('postcss-banner')({important: true, inline: true, banner}),

      // add/remove vendor prefixes based on browser list
      require('autoprefixer')(pkg.browserslist),

      // minify
      require('cssnano')({
        safe: true,
        preset: ['default', {
          autoprefixer: pkg.browserslist
        }]
      }),

      printOutput()
    ]
  };
};
