/* eslint-disable no-console */
const serveStatic = require('serve-static');
const path = require('path');
const serve = serveStatic(
  path.join(__dirname, '..'),
  {index: ['index.html', 'index.htm']}
);

const StaticMiddlewareFactory = function(config) {
  console.log(`**** Dev server started at http://${config.listenAddress}:${config.port}/ *****`);

  return function(req, res, next) {
    res.setHeader('Cache-Control', 'no-cache,must-revalidate');
    return serve(req, res, next);
  };
};

module.exports = function(config) {
  const detectBrowsers = {
    enabled: false,
    usePhantomJS: false
  };

  // On Travis CI, we can only run in Firefox and Chrome; so, enforce that.
  if (process.env.TRAVIS) {
    config.browsers = ['Firefox', 'travisChrome'];
  }

  // If no browsers are specified, we enable `karma-detect-browsers`
  // this will detect all browsers that are available for testing
  if (config.browsers !== false && !config.browsers.length) {
    detectBrowsers.enabled = true;
  }

  config.set({
    basePath: '..',
    frameworks: ['qunit', 'detectBrowsers'],
    files: [
      'node_modules/video.js/dist/video-js.css',
      'dist/videojs-vr.css',
      'node_modules/sinon/pkg/sinon.js',
      'node_modules/video.js/dist/video.js',
      'test/dist/bundle.js'
    ],
    customLaunchers: {
      travisChrome: {
        base: 'Chrome',
        flags: ['--no-sandbox']
      }
    },
    client: {
      clearContext: false,
      qunit: {
        showUI: true,
        testTimeout: 5000
      }
    },
    detectBrowsers,
    reporters: ['dots'],
    port: 9999,
    urlRoot: '/test/',
    plugins: [
      {'middleware:static': ['factory', StaticMiddlewareFactory]},
      'karma-*'
    ],
    middleware: ['static'],
    colors: true,
    autoWatch: false,
    singleRun: true,
    concurrency: Infinity
  });
};
