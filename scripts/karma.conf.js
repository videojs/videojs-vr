const generate = require('videojs-generate-karma-config');

module.exports = function(config) {

  // see https://github.com/videojs/videojs-generate-karma-config
  // for options
  const options = {
    browsers(aboutToRun) {
      return aboutToRun.filter(function(launcherName) {
        return !(/Chromium/).test(launcherName);
      });
    },
  };

  config = generate(config, options);

  // any other custom stuff not supported by options here!
};

