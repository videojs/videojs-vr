import 'webvr-polyfill/build/webvr-polyfill';

import videojs from 'video.js';
import {version as VERSION} from '../package.json';
import window from 'global/window';

import * as THREE from 'three';

// previously we used
// * three/examples/js/controls/VRControls.js
// * three/examples/js/effects/VREffects.js
// but since we are using es6 now, there is no good way to make them export to us
// so the code has been copied locally to allow exporting
import VRControls from './VRControls.js';
import VREffect from './VREffect.js';

import WebVrConfig from './webvr.config.js';
import WebVRManager from 'webvr-boilerplate';

window.WebVrConfig = WebVrConfig;
window.WebVRManager = WebVRManager;

const navigator = window.navigator;
const validProjections = ['360', '360_LR', '360_TB', '360_CUBE', 'NONE', 'AUTO'];
// Default options for the plugin.
const defaults = {
  projection: 'AUTO',
  debug: false
};
const errors = {
  'web-vr-no-devices-found': {
    headline: 'No 360 devices found',
    type: '360_NO_DEVICES_FOUND',
    message: 'Your browser supports 360, but no 360 displays found.'
  },
  'web-vr-out-of-date': {
    headline: '360 is out of date',
    type: '360_OUT_OF_DATE',
    message: "Your browser supports 360 but not the latest version. See <a href='http://webvr.info'>webvr.info</a> for more info."
  },
  'web-vr-not-supported': {
    headline: '360 not supported on this device',
    type: '360_NOT_SUPPORTED',
    message: "Your browser does not support 360. See <a href='http://webvr.info'>webvr.info</a> for assistance."
  }
};

/**
 * Initializes the plugin
 */
const vr = function(options) {
  const player = this;
  const settings = videojs.mergeOptions(defaults, options || {});
  const videoEl = this.el().getElementsByTagName('video')[0];
  const container = this.el();
  let currentProjection = settings.projection;
  let movieMaterial;
  let movieGeometry;
  let movieScreen;
  let controls3d;
  let scene;
  let cameraVector;

  const log = function(msg) {
    if (settings.debug) {
      videojs.log(msg);
    }
  };

  // custom videojs-errors integration boolean
  const videojsErrorsSupport = !!videojs.errors;

  if (videojsErrorsSupport) {
    player.errors({errors});
  }

  const triggerError = function(errorObj) {
    // if we have videojs-errors use it
    if (videojsErrorsSupport) {
      player.error(errorObj);
    // if we don't have videojs-errors just use a normal player error
    } else {
      player.error({code: errorObj.code, message: errors[errorObj.code].message});
    }
  };

  if (videoEl === undefined || videoEl === null) {
    // Player is not using HTML5 tech, so don't init it.
    return;
  }

  if (currentProjection === 'NONE' || !currentProjection) {
    // Show raw 360 video.
    return;
  }

  if (validProjections.indexOf(currentProjection) === -1) {
    videojs.log.error('videojs-vr: Please use a valid projection option: ' + validProjections.join(', '));
    return;
  }

  function isHLS() {
    const currentType = player.currentType();

    // hls video types
    const hlsTypes = [
      // Apple santioned
      'application/vnd.apple.mpegurl',
      // Very common
      'application/x-mpegurl',
      // Included for completeness
      'video/x-mpegurl',
      'video/mpegurl',
      'application/mpegurl'
    ];

    // if the current type has a case insensitivie match from the list above
    // this is hls
    return hlsTypes.some((type) => (new RegExp(type, 'i')).test(currentType));
  }

  function changeProjection(projection) {
    // don't change to an invalid projection
    if (validProjections.indexOf(projection) === -1) {
      return;
    }

    const position = {x: 0, y: 0, z: 0 };

    if (scene) {
      scene.remove(movieScreen);
    }
    if (projection === 'AUTO') {
      if (player.mediainfo && player.mediainfo.projection && player.mediainfo.projection === 'equirectangular') {
        changeProjection('360');
      } else {
        changeProjection('NONE');
      }
    } else if (projection === '360') {
      movieGeometry = new THREE.SphereBufferGeometry(256, 32, 32);

      movieScreen = new THREE.Mesh(movieGeometry, movieMaterial);
      movieScreen.position.set(position.x, position.y, position.z);

      movieScreen.scale.x = -1;
      movieScreen.quaternion.setFromAxisAngle({x: 0, y: 1, z: 0}, -Math.PI / 2);
      scene.add(movieScreen);
    } else if (projection === '360_LR' || projection === '360_TB') {
      let geometry = new THREE.SphereGeometry(256, 32, 32);

      // Left eye view
      geometry.scale(-1, 1, 1);
      let uvs = geometry.faceVertexUvs[ 0 ];

      for (let i = 0; i < uvs.length; i++) {
        for (let j = 0; j < 3; j++) {
          if (projection === '360_LR') {
            uvs[ i ][ j ].x *= 0.5;
          } else {
            uvs[ i ][ j ].y *= 0.5;
          }
        }
      }

      movieGeometry = new THREE.BufferGeometry().fromGeometry(geometry);
      movieScreen = new THREE.Mesh(movieGeometry, movieMaterial);
      movieScreen.rotation.y = -Math.PI / 2;
      // display in left eye only
      movieScreen.layers.set(1);
      scene.add(movieScreen);

      // Right eye view
      geometry = new THREE.SphereGeometry(256, 32, 32);
      geometry.scale(-1, 1, 1);
      uvs = geometry.faceVertexUvs[ 0 ];

      for (let i = 0; i < uvs.length; i++) {
        for (let j = 0; j < 3; j++) {
          if (projection === '360_LR') {
            uvs[ i ][ j ].x *= 0.5;
            uvs[ i ][ j ].x += 0.5;
          } else {
            uvs[ i ][ j ].y *= 0.5;
            uvs[ i ][ j ].y += 0.5;
          }
        }
      }

      movieGeometry = new THREE.BufferGeometry().fromGeometry(geometry);
      movieScreen = new THREE.Mesh(movieGeometry, movieMaterial);
      movieScreen.rotation.y = -Math.PI / 2;
      // display in right eye only
      movieScreen.layers.set(2);
      scene.add(movieScreen);

    } else if (projection === '360_CUBE') {
      // Currently doesn't work - need to figure out order of cube faces
      movieGeometry = new THREE.CubeGeometry(256, 256, 256);
      const face1 = [new THREE.Vector2(0, 0.5), new THREE.Vector2(0.333, 0.5), new THREE.Vector2(0.333, 1), new THREE.Vector2(0, 1)];
      const face2 = [new THREE.Vector2(0.333, 0.5), new THREE.Vector2(0.666, 0.5), new THREE.Vector2(0.666, 1), new THREE.Vector2(0.333, 1)];
      const face3 = [new THREE.Vector2(0.666, 0.5), new THREE.Vector2(1, 0.5), new THREE.Vector2(1, 1), new THREE.Vector2(0.666, 1)];
      const face4 = [new THREE.Vector2(0, 0), new THREE.Vector2(0.333, 1), new THREE.Vector2(0.333, 0.5), new THREE.Vector2(0, 0.5)];
      const face5 = [new THREE.Vector2(0.333, 1), new THREE.Vector2(0.666, 1), new THREE.Vector2(0.666, 0.5), new THREE.Vector2(0.333, 0.5)];
      const face6 = [new THREE.Vector2(0.666, 1), new THREE.Vector2(1, 0), new THREE.Vector2(1, 0.5), new THREE.Vector2(0.666, 0.5)];

      movieGeometry.faceVertexUvs[0] = [];

      movieGeometry.faceVertexUvs[0][0] = [ face1[0], face1[1], face1[3] ];
      movieGeometry.faceVertexUvs[0][1] = [ face1[1], face1[2], face1[3] ];

      movieGeometry.faceVertexUvs[0][2] = [ face2[0], face2[1], face2[3] ];
      movieGeometry.faceVertexUvs[0][3] = [ face2[1], face2[2], face2[3] ];

      movieGeometry.faceVertexUvs[0][4] = [ face3[0], face3[1], face3[3] ];
      movieGeometry.faceVertexUvs[0][5] = [ face3[1], face3[2], face3[3] ];

      movieGeometry.faceVertexUvs[0][6] = [ face4[0], face4[1], face4[3] ];
      movieGeometry.faceVertexUvs[0][7] = [ face4[1], face4[2], face4[3] ];

      movieGeometry.faceVertexUvs[0][8] = [ face5[0], face5[1], face5[3] ];
      movieGeometry.faceVertexUvs[0][9] = [ face5[1], face5[2], face5[3] ];

      movieGeometry.faceVertexUvs[0][10] = [ face6[0], face6[1], face6[3] ];
      movieGeometry.faceVertexUvs[0][11] = [ face6[1], face6[2], face6[3] ];

      movieScreen = new THREE.Mesh(movieGeometry, movieMaterial);
      movieScreen.position.set(position.x, position.y, position.z);

      scene.add(movieScreen);
    }

    currentProjection = projection;
  }

  function initScene() {
    // we need this as IE 11 reports that it has a VR display, but isnt compatible with Video as a Texture. for example
    if (videojs.browser.IE_VERSION) {
      triggerError({code: 'web-vr-not-supported', dismiss: false});
      return;
    }

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);

    // Store vector representing the direction in which the camera is looking, in world space.
    cameraVector = new THREE.Vector3();

    if (currentProjection === '360_LR' || currentProjection === '360_TB') {
      // Render left eye when not in VR mode
      camera.layers.enable(1);
    }

    scene = new THREE.Scene();
    controls3d = new VRControls(camera);

    const videoTexture = new THREE.VideoTexture(videoEl);

    videoTexture.generateMipmaps = false;
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;

    // iOS and macOS HLS fix/hacks
    // https://bugs.webkit.org/show_bug.cgi?id=163866#c3
    // https://github.com/mrdoob/three.js/issues/9754
    // On iOS with HLS, color space is wrong and texture is flipped on Y axis
    // On macOS, just need to flip texture Y axis

    if (isHLS() && videojs.browser.IS_ANY_SAFARI) {
      log('Safari + iOS + HLS = flipY and colorspace hack');
      videoTexture.format = THREE.RGBAFormat;
      videoTexture.flipY = false;
    } else if (isHLS() && videojs.browser.IS_SAFARI) {
      log('Safari + HLS = flipY hack');
      videoTexture.format = THREE.RGBFormat;
      videoTexture.flipY = false;
    } else {
      videoTexture.format = THREE.RGBFormat;
    }

    if (videoTexture.format === THREE.RGBAFormat && videoTexture.flipY === false) {
      movieMaterial = new THREE.ShaderMaterial({
        uniforms: {
          texture: { value: videoTexture }
        },
        vertexShader: [
          'varying vec2 vUV;',
          'void main() {',
          ' vUV = vec2( uv.x, 1.0 - uv.y );',
          ' gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
          '}'
        ].join('\n'),
        fragmentShader: [
          'uniform sampler2D texture;',
          'varying vec2 vUV;',
          'void main() {',
          ' gl_FragColor = texture2D( texture, vUV  ).bgra;',
          '}'
        ].join('\n')
      });
    } else if (videoTexture.format === THREE.RGBFormat && videoTexture.flipY === false) {
      movieMaterial = new THREE.ShaderMaterial({
        uniforms: {
          texture: { value: videoTexture }
        },
        vertexShader: [
          'varying vec2 vUV;',
          'void main() {',
          ' vUV = vec2( uv.x, 1.0 - uv.y );',
          ' gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
          '}'
        ].join('\n'),
        fragmentShader: [
          'uniform sampler2D texture;',
          'varying vec2 vUV;',
          'void main() {',
          ' gl_FragColor = texture2D( texture, vUV  );',
          '}'
        ].join('\n')
      });
    } else {
      movieMaterial = new THREE.MeshBasicMaterial({ map: videoTexture, overdraw: true, side: THREE.DoubleSide });
    }

    changeProjection(currentProjection);

    if (currentProjection === 'NONE') {
      log('Projection is NONE, dont init');
      return;
    }

    camera.position.set(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      devicePixelRatio: window.devicePixelRatio,
      alpha: false,
      clearColor: 0xffffff,
      antialias: true
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    const effect = new VREffect(renderer);

    effect.setSize(window.innerWidth, window.innerHeight);

    let vrDisplay = null;

    // Previous timestamps for gamepad updates
    const prevTimestamps = [];
    const manager = new WebVRManager(renderer, effect, {hideButton: true});
    const renderedCanvas = renderer.domElement;

    renderedCanvas.style.width = 'inherit';
    renderedCanvas.style.height = 'inherit';

    container.insertBefore(renderedCanvas, container.firstChild);
    videoEl.style.display = 'none';

    // Handle window resizes
    function onWindowResize(event) {
      const width = player.currentWidth();
      const height = player.currentHeight();

      effect.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    player.on(['resize', 'fullscreenchange'], onWindowResize);
    window.addEventListener('vrdisplaypresentchange', onWindowResize, true);

    function onVRRequestPresent() {
      manager.enterVRMode_();
      manager.setMode_(3);
    }

    function onVRExitPresent() {
      if (!vrDisplay.isPresenting) {
        return;
      }
      vrDisplay.exitPresent();
    }

    window.addEventListener('vrdisplayactivate', onVRRequestPresent, true);
    window.addEventListener('vrdisplaydeactivate', onVRExitPresent, true);

    if (navigator.getVRDisplays) {
      navigator.getVRDisplays().then(function(displays) {
        if (displays.length > 0) {
          log('WebVR supported, VRDisplays found.');
          vrDisplay = displays[0];
          log(vrDisplay);
        } else {
          triggerError({code: 'web-vr-no-devices-found', dismiss: false});
        }
      });
    } else if (navigator.getVRDevices) {
      triggerError({code: 'web-vr-out-of-date', dismiss: false});
    } else {
      triggerError({code: 'web-vr-not-supported', dismiss: false});
    }

    // Handle window rotate
    function onWindowRotate() {
      const screen = window.screen;

      if (window.orientation === -90 || window.orientation === 90) {
        // in iOS, width and height never changes regardless orientation
        // so when in a horizontal mode, height still greater than width
        if (screen.height > screen.width) {
          camera.aspect = screen.height / screen.width;
        } else {
          // in Android, width and height will swap value depending on orientation
          camera.aspect = screen.width / screen.height;
        }
      } else {
        camera.aspect = screen.width / screen.height;
      }
      camera.updateProjectionMatrix();
    }
    window.addEventListener('orientationchange', onWindowRotate, false);

    function togglePlay() {
      // Doesn't currently cater for case where paused due to buffering
      // and/or lack of data
      if (player.paused()) {
        player.play();
      } else {
        player.pause();
      }
    }

    (function animate() {
      if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
        if (videoTexture) {
          videoTexture.needsUpdate = true;
        }
      }

      controls3d.update();
      manager.render(scene, camera);

      if (vrDisplay) {
        vrDisplay.requestAnimationFrame(animate);

        // Grab all gamepads
        if (navigator.getGamepads) {
          const gamepads = navigator.getGamepads();

          for (let i = 0; i < gamepads.length; ++i) {
            const gamepad = gamepads[i];

            // Make sure gamepad is defined
            if (gamepad) {
              // Only take input if state has changed since we checked last
              if (gamepad.timestamp && !(gamepad.timestamp === prevTimestamps[i])) {
                for (let j = 0; j < gamepad.buttons.length; ++j) {
                  if (gamepad.buttons[j].pressed) {
                    togglePlay();
                    prevTimestamps[i] = gamepad.timestamp;
                    break;
                  }
                }
              }
            }
          }
        }
      } else {
        window.requestAnimationFrame(animate);
      }

      camera.getWorldDirection(cameraVector);
    }());

    // Expose the Three.js perspective camera and rotation values on the player under the 'vr' namespace:
    player.vr = {
      cameraVector,
      threeJs: {
        scene,
        camera,
        renderer
      }
    };

  }

  player.on('loadstart', function() {
    initScene();
  });

  player.ready(function() {

    function updateVrControls(cb) {

      // Add Carboard button
      const Button = videojs.getComponent('Button');
      const VRButton = videojs.extend(Button, {
        constructor() {
          Button.apply(this, arguments);
          log(this);
        },
        handleClick() {
          const event = new window.Event('vrdisplayactivate');

          window.dispatchEvent(event);
        },
        buildCSSClass() {
          return Button.prototype.buildCSSClass.call(this) + 'vjs-button-vr';
        }
      });

      videojs.registerComponent('VRButton', VRButton);
      cb.addChild('VRButton', {});

      // if ios remove full screen toggle
      if (videojs.browser.IS_IOS) {
        player.controlBar.fullscreenToggle.hide();
      }
    }

    // mobile devices
    if (videojs.browser.IS_ANDROID || videojs.browser.IS_IOS || videojs.browser.IS_IPAD) {
      updateVrControls(player.controlBar);
    }
  });

  return {
    changeProjection
  };
};

// register the plugin with video.js
videojs.registerPlugin('vr', vr);

// Include the version number
vr.VERSION = VERSION;

export default vr;
