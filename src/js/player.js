var videojs = require('video.js');
global.THREE = require('three');
require('three/examples/js/controls/VRControls.js');
require('three/examples/js/effects/VREffect.js');
global.WebVRConfig = require('./webvr.config.js');
var WebVrPolyfill = require('webvr-polyfill/src/webvr-polyfill');
new WebVrPolyfill();
require('webvr-boilerplate');
require('./videojs.vr.js');
