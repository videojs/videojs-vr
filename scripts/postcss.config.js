/* eslint-disable no-console */
const banner = require('./banner').string;
const postcss = require('postcss');
const path = require('path');
const browsersList = require('./browserslist');

/**
 * by default there is no way to print that file was written
 * this does that.
 */
const printOutput = postcss.plugin('postcss-print-output', function(opts) {
  opts = opts || {};

  return function(root, results) {
    const relativeFrom = path.relative(process.cwd(), results.opts.from);
    const relativeTo = path.relative(process.cwd(), results.opts.to);

    console.log(`${relativeFrom} -> ${relativeTo}`);
  };
});

module.exports = function(context) {
  return {
    plugins: [
      // inlines local file imports
      require('postcss-import')(),

      // allows you to use newer css features, by converting
      // them into something browsers can support now.
      // see https://preset-env.cssdb.org/features
      // by default we use stage 3+
      require('postcss-preset-env')({
        browsers: browsersList,
        stage: 3,
        features: {
          'custom-environment-variables': true,
          'nesting-rules': true
        }
      }),

      // adds a banner to the top of the file
      require('postcss-banner')({important: true, inline: true, banner}),

      // add/remove vendor prefixes based on browser list
      require('autoprefixer')(browsersList),

      // minify
      require('cssnano')({
        safe: true,
        preset: ['default', {
          autoprefixer: browsersList
        }]
      }),

      printOutput()
    ]
  };
};
