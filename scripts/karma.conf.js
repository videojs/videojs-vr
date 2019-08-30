const generate = require('videojs-generate-karma-config');

module.exports = function(config) {

  // see https://github.com/videojs/videojs-generate-karma-config
  // for options
  const options = {
    files(defaults) {
      return [
        'node_modules/omnitone/build/omnitone.js'
      ];
    }
  };

  config = generate(config, options);

  // any other custom stuff not supported by options here!
};

