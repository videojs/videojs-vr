global.THREE = require('three');
require('three/examples/js/controls/VRControls.js');
require('three/examples/js/effects/VREffect.js');
global.WebVRConfig = require('./webvr.config.js');
var WebVrPolyfill = require('webvr-polyfill');
var WebVRManager = require('webvr-boilerplate');
window.WebVRManager = WebVRManager;
require('./videojs.vr.js');
