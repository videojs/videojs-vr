const generate = require('videojs-generate-rollup-config');
const replace = require('./rollup-replace');

// see https://github.com/videojs/videojs-generate-rollup-config
// for options
const options = {
  primedPlugins(defaults) {
    return Object.assign(defaults, {replace});
  },
  plugins(defaults) {

    // add replace just after json for each build
    Object.keys(defaults).forEach((type) => {
      defaults[type].splice(defaults[type].indexOf('json') + 1, '0', 'replace');
    });

    return defaults;
  }
};
const config = generate(options);

// Add additonal builds/customization here!

// export the builds to rollup
export default Object.values(config.builds);
