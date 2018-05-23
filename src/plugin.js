import {version as VERSION} from '../package.json';
import window from 'global/window';
import document from 'global/document';
import WebVRPolyfill from 'webvr-polyfill';
import videojs from 'video.js';
import * as THREE from 'three';
import VRControls from 'three/examples/js/controls/VRControls.js';
import VREffect from 'three/examples/js/effects/VREffect.js';
import OrbitOrientationContols from './orbit-orientation-controls.js';
import * as utils from './utils';

// import controls so they get regisetered with videojs
import './cardboard-button';
import './big-vr-play-button';

// Default options for the plugin.
const defaults = {
  projection: 'AUTO',
  forceCardboard: false,
  debug: false
};

const errors = {
  'web-vr-out-of-date': {
    headline: '360 is out of date',
    type: '360_OUT_OF_DATE',
    message: "Your browser supports 360 but not the latest version. See <a href='http://webvr.info'>http://webvr.info</a> for more info."
  },
  'web-vr-not-supported': {
    headline: '360 not supported on this device',
    type: '360_NOT_SUPPORTED',
    message: "Your browser does not support 360. See <a href='http://webvr.info'>http://webvr.info</a> for assistance."
  },
  'web-vr-hls-cors-not-supported': {
    headline: '360 HLS video not supported on this device',
    type: '360_NOT_SUPPORTED',
    message: "Your browser/device does not support HLS 360 video. See <a href='http://webvr.info'>http://webvr.info</a> for assistance."
  }
};

const Plugin = videojs.getPlugin('plugin');
const Component = videojs.getComponent('Component');

class VR extends Plugin {
  constructor(player, options) {
    const settings = videojs.mergeOptions(defaults, options);

    super(player, settings);

    this.options_ = settings;
    this.player_ = player;
    this.bigPlayButtonIndex_ = player.children().indexOf(player.getChild('BigPlayButton')) || 0;

    // custom videojs-errors integration boolean
    this.videojsErrorsSupport_ = !!videojs.errors;

    if (this.videojsErrorsSupport_) {
      player.errors({errors});
    }

    // IE 11 does not support enough webgl to be supported
    // older safari does not support cors, so it wont work
    if (videojs.browser.IE_VERSION || !utils.corsSupport) {
      // if a player triggers error before 'loadstart' is fired
      // video.js will reset the error overlay
      this.player_.on('loadstart', () => {
        this.triggerError_({code: 'web-vr-not-supported', dismiss: false});
      });
      return;
    }

    this.polyfill_ = new WebVRPolyfill({
      // do not show rotate instructions
      ROTATE_INSTRUCTIONS_DISABLED: true
    });
    this.polyfill_ = new WebVRPolyfill();

    this.handleVrDisplayActivate_ = videojs.bind(this, this.handleVrDisplayActivate_);
    this.handleVrDisplayDeactivate_ = videojs.bind(this, this.handleVrDisplayDeactivate_);
    this.handleResize_ = videojs.bind(this, this.handleResize_);
    this.animate_ = videojs.bind(this, this.animate_);

    this.setProjection(this.options_.projection);

    this.on(player, 'loadedmetadata', this.init);
  }

  changeProjection_(projection) {
    projection = utils.getInternalProjectionName(projection);
    // don't change to an invalid projection
    if (!projection) {
      projection = 'NONE';
    }

    const position = {x: 0, y: 0, z: 0 };

    if (this.scene) {
      this.scene.remove(this.movieScreen);
    }
    if (projection === 'AUTO') {
      // mediainfo cannot be set to auto or we would infinite loop here
      // each source should know wether they are 360 or not, if using AUTO
      if (this.player_.mediainfo && this.player_.mediainfo.projection && this.player_.mediainfo.projection !== 'AUTO') {
        const autoProjection = utils.getInternalProjectionName(this.player_.mediainfo.projection);

        return this.changeProjection_(autoProjection);
      }
      return this.changeProjection_('NONE');
    } else if (projection === '360') {

      this.movieGeometry = new THREE.SphereBufferGeometry(256, 32, 32);
      this.movieMaterial = new THREE.MeshBasicMaterial({ map: this.videoTexture, overdraw: true, side: THREE.BackSide });

      this.movieScreen = new THREE.Mesh(this.movieGeometry, this.movieMaterial);
      this.movieScreen.position.set(position.x, position.y, position.z);

      this.movieScreen.scale.x = -1;
      this.movieScreen.quaternion.setFromAxisAngle({x: 0, y: 1, z: 0}, -Math.PI / 2);
      this.scene.add(this.movieScreen);
    } else if (projection === '360_LR' || projection === '360_TB') {
      let geometry = new THREE.SphereGeometry(256, 32, 32);

      // Left eye view
      let uvs = geometry.faceVertexUvs[ 0 ];

      for (let i = 0; i < uvs.length; i++) {
        for (let j = 0; j < 3; j++) {
          if (projection === '360_LR') {
            uvs[ i ][ j ].x *= 0.5;
          } else {
            uvs[ i ][ j ].y *= 0.5;
            uvs[ i ][ j ].y += 0.5;
          }
        }
      }
      geometry.scale(-1, 1, 1);

      this.movieGeometry = new THREE.BufferGeometry().fromGeometry(geometry);
      this.movieMaterial = new THREE.MeshBasicMaterial({ map: this.videoTexture, overdraw: true, side: THREE.BackSide });

      this.movieScreen = new THREE.Mesh(this.movieGeometry, this.movieMaterial);
      this.movieScreen.rotation.y = -Math.PI / 2;
      // display in left eye only
      this.movieScreen.layers.set(1);
      this.scene.add(this.movieScreen);

      // Right eye view
      geometry = new THREE.SphereGeometry(256, 32, 32);

      uvs = geometry.faceVertexUvs[ 0 ];

      for (let i = 0; i < uvs.length; i++) {
        for (let j = 0; j < 3; j++) {
          if (projection === '360_LR') {
            uvs[ i ][ j ].x *= 0.5;
            uvs[ i ][ j ].x += 0.5;
          } else {
            uvs[ i ][ j ].y *= 0.5;
          }
        }
      }
      geometry.scale(-1, 1, 1);

      this.movieGeometry = new THREE.BufferGeometry().fromGeometry(geometry);
      this.movieMaterial = new THREE.MeshBasicMaterial({ map: this.videoTexture, overdraw: true, side: THREE.BackSide });

      this.movieScreen = new THREE.Mesh(this.movieGeometry, this.movieMaterial);
      this.movieScreen.rotation.y = -Math.PI / 2;
      // display in right eye only
      this.movieScreen.layers.set(2);
      this.scene.add(this.movieScreen);

    } else if (projection === '360_CUBE') {
      this.movieGeometry = new THREE.BoxGeometry(256, 256, 256);
      this.movieMaterial = new THREE.MeshBasicMaterial({ map: this.videoTexture, overdraw: true, side: THREE.BackSide });

      const left = [new THREE.Vector2(0, 0.5), new THREE.Vector2(0.333, 0.5), new THREE.Vector2(0.333, 1), new THREE.Vector2(0, 1)];
      const right = [new THREE.Vector2(0.333, 0.5), new THREE.Vector2(0.666, 0.5), new THREE.Vector2(0.666, 1), new THREE.Vector2(0.333, 1)];
      const top = [new THREE.Vector2(0.666, 0.5), new THREE.Vector2(1, 0.5), new THREE.Vector2(1, 1), new THREE.Vector2(0.666, 1)];
      const bottom = [new THREE.Vector2(0, 0), new THREE.Vector2(0.333, 0), new THREE.Vector2(0.333, 0.5), new THREE.Vector2(0, 0.5)];
      const front = [new THREE.Vector2(0.333, 0), new THREE.Vector2(0.666, 0), new THREE.Vector2(0.666, 0.5), new THREE.Vector2(0.333, 0.5)];
      const back = [new THREE.Vector2(0.666, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1, 0.5), new THREE.Vector2(0.666, 0.5)];

      this.movieGeometry.faceVertexUvs[0] = [];

      this.movieGeometry.faceVertexUvs[0][0] = [ right[2], right[1], right[3] ];
      this.movieGeometry.faceVertexUvs[0][1] = [ right[1], right[0], right[3] ];

      this.movieGeometry.faceVertexUvs[0][2] = [ left[2], left[1], left[3] ];
      this.movieGeometry.faceVertexUvs[0][3] = [ left[1], left[0], left[3] ];

      this.movieGeometry.faceVertexUvs[0][4] = [ top[2], top[1], top[3] ];
      this.movieGeometry.faceVertexUvs[0][5] = [ top[1], top[0], top[3] ];

      this.movieGeometry.faceVertexUvs[0][6] = [ bottom[2], bottom[1], bottom[3] ];
      this.movieGeometry.faceVertexUvs[0][7] = [ bottom[1], bottom[0], bottom[3] ];

      this.movieGeometry.faceVertexUvs[0][8] = [ front[2], front[1], front[3] ];
      this.movieGeometry.faceVertexUvs[0][9] = [ front[1], front[0], front[3] ];

      this.movieGeometry.faceVertexUvs[0][10] = [ back[2], back[1], back[3] ];
      this.movieGeometry.faceVertexUvs[0][11] = [ back[1], back[0], back[3] ];

      this.movieScreen = new THREE.Mesh(this.movieGeometry, this.movieMaterial);
      this.movieScreen.position.set(position.x, position.y, position.z);
      this.movieScreen.rotation.y = -Math.PI;

      this.scene.add(this.movieScreen);
    }

    this.currentProjection_ = projection;

  }

  triggerError_(errorObj) {
    // if we have videojs-errors use it
    if (this.videojsErrorsSupport_) {
      this.player_.error(errorObj);
    // if we don't have videojs-errors just use a normal player error
    } else {
      // strip any html content from the error message
      // as it is not supported outside of videojs-errors
      const div = document.createElement('div');

      div.innerHTML = errors[errorObj.code].message;

      const message = div.textContent || div.innerText || '';

      this.player_.error({
        code: errorObj.code,
        message
      });
    }
  }

  log(...msgs) {
    if (!this.options_.debug) {
      return;
    }

    msgs.forEach((msg) => {
      videojs.log(msg);
    });
  }

  handleVrDisplayActivate_() {
    if (!this.vrDisplay) {
      return;
    }
    this.vrDisplay.requestPresent([{source: this.renderedCanvas}]).then(() => {
      if (!this.vrDisplay.cardboardUI_ || !videojs.browser.IS_IOS) {
        return;
      }

      // webvr-polyfill/cardboard ui only watches for click events
      // to tell that the back arrow button is pressed during cardboard vr.
      // but somewhere along the line these events are silenced with preventDefault
      // but only on iOS, so we translate them ourselves here
      let touches = [];
      const iosCardboardTouchStart_ = (e) => {
        for (let i = 0; i < e.touches.length; i++) {
          touches.push(e.touches[i]);
        }
      };

      const iosCardboardTouchEnd_ = (e) => {
        if (!touches.length) {
          return;
        }

        touches.forEach((t) => {
          const simulatedClick = new window.MouseEvent('click', {
            screenX: t.screenX,
            screenY: t.screenY,
            clientX: t.clientX,
            clientY: t.clientY
          });

          this.renderedCanvas.dispatchEvent(simulatedClick);
        });

        touches = [];
      };

      this.renderedCanvas.addEventListener('touchstart', iosCardboardTouchStart_);
      this.renderedCanvas.addEventListener('touchend', iosCardboardTouchEnd_);

      this.iosRevertTouchToClick_ = () => {
        this.renderedCanvas.removeEventListener('touchstart', iosCardboardTouchStart_);
        this.renderedCanvas.removeEventListener('touchend', iosCardboardTouchEnd_);
        this.iosRevertTouchToClick_ = null;
      };
    });
  }

  handleVrDisplayDeactivate_() {
    if (!this.vrDisplay || !this.vrDisplay.isPresenting) {
      return;
    }
    if (this.iosRevertTouchToClick_) {
      this.iosRevertTouchToClick_();
    }
    this.vrDisplay.exitPresent();

  }

  requestAnimationFrame(fn) {
    if (this.vrDisplay) {
      return this.vrDisplay.requestAnimationFrame(fn);
    }

    return Component.prototype.requestAnimationFrame.call(this, fn);
  }

  cancelAnimationFrame(id) {
    if (this.vrDisplay) {
      return this.vrDisplay.cancelAnimationFrame(id);
    }

    return Component.prototype.cancelAnimationFrame.call(this, id);
  }

  togglePlay_() {
    if (this.player_.paused()) {
      this.player_.play();
    } else {
      this.player_.pause();
    }
  }

  animate_() {
    if (!this.initialized_) {
      return;
    }
    if (this.getVideoEl_().readyState === this.getVideoEl_().HAVE_ENOUGH_DATA) {
      if (this.videoTexture) {
        this.videoTexture.needsUpdate = true;
      }
    }

    this.controls3d.update();
    this.effect.render(this.scene, this.camera);

    if (window.navigator.getGamepads) {
      // Grab all gamepads
      const gamepads = window.navigator.getGamepads();

      for (let i = 0; i < gamepads.length; ++i) {
        const gamepad = gamepads[i];

        // Make sure gamepad is defined
        // Only take input if state has changed since we checked last
        if (!gamepad || !gamepad.timestamp || gamepad.timestamp === this.prevTimestamps_[i]) {
          continue;
        }
        for (let j = 0; j < gamepad.buttons.length; ++j) {
          if (gamepad.buttons[j].pressed) {
            this.togglePlay_();
            this.prevTimestamps_[i] = gamepad.timestamp;
            break;
          }
        }
      }
    }
    this.camera.getWorldDirection(this.cameraVector);

    this.animationFrameId_ = this.requestAnimationFrame(this.animate_);
  }

  handleResize_() {
    const width = this.player_.currentWidth();
    const height = this.player_.currentHeight();

    this.effect.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  setProjection(projection) {

    if (!utils.getInternalProjectionName(projection)) {
      videojs.log.error('videojs-vr: please pass a valid projection ' + utils.validProjections.join(', '));
      return;
    }

    this.currentProjection_ = projection;
    this.defaultProjection_ = projection;
  }

  init() {
    this.reset();

    this.camera = new THREE.PerspectiveCamera(75, this.player_.currentWidth() / this.player_.currentHeight(), 1, 1000);
    // Store vector representing the direction in which the camera is looking, in world space.
    this.cameraVector = new THREE.Vector3();

    if (this.currentProjection_ === '360_LR' || this.currentProjection_ === '360_TB') {
      // Render left eye when not in VR mode
      this.camera.layers.enable(1);
    }

    this.scene = new THREE.Scene();
    this.videoTexture = new THREE.VideoTexture(this.getVideoEl_());

    // shared regardless of wether VideoTexture is used or
    // an image canvas is used
    this.videoTexture.generateMipmaps = false;
    this.videoTexture.minFilter = THREE.LinearFilter;
    this.videoTexture.magFilter = THREE.LinearFilter;
    this.videoTexture.format = THREE.RGBFormat;

    this.changeProjection_(this.currentProjection_);

    if (this.currentProjection_ === 'NONE') {
      this.log('Projection is NONE, dont init');
      this.reset();
      return;
    }

    this.player_.removeChild('BigPlayButton');
    this.player_.addChild('BigVrPlayButton', {}, this.bigPlayButtonIndex_);
    this.player_.bigPlayButton = this.player_.getChild('BigVrPlayButton');

    // mobile devices, or cardboard forced to on
    if (this.options_.forceCardboard ||
        videojs.browser.IS_ANDROID ||
        videojs.browser.IS_IOS) {
      this.addCardboardButton_();
    }

    // if ios remove full screen toggle
    if (videojs.browser.IS_IOS) {
      this.player_.controlBar.fullscreenToggle.hide();
    }

    this.camera.position.set(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({
      devicePixelRatio: window.devicePixelRatio,
      alpha: false,
      clearColor: 0xffffff,
      antialias: true
    });

    const webglContext = this.renderer.getContext('webgl');
    const oldTexImage2D = webglContext.texImage2D;

    /* this is a workaround since threejs uses try catch */
    webglContext.texImage2D = (...args) => {
      try {
        return oldTexImage2D.apply(webglContext, args);
      } catch (e) {
        this.reset();
        this.player_.pause();
        this.triggerError_({code: 'web-vr-hls-cors-not-supported', dismiss: false});
        throw new Error(e);
      }
    };

    this.renderer.setSize(this.player_.currentWidth(), this.player_.currentHeight(), false);
    this.effect = new VREffect(this.renderer);

    this.effect.setSize(this.player_.currentWidth(), this.player_.currentHeight(), false);
    this.vrDisplay = null;

    // Previous timestamps for gamepad updates
    this.prevTimestamps_ = [];

    this.renderedCanvas = this.renderer.domElement;
    this.renderedCanvas.setAttribute('style', 'width: 100%; height: 100%; position: absolute; top:0;');
    this.player_.el().insertBefore(this.renderedCanvas, this.player_.el().firstChild);
    this.getVideoEl_().style.display = 'none';

    if (window.navigator.getVRDisplays) {
      this.log('VR is supported, getting vr displays');
      window.navigator.getVRDisplays().then((displays) => {
        if (displays.length > 0) {
          this.log('VR Displays found', displays);
          this.vrDisplay = displays[0];

          // Native WebVR Head Mounted Displays (HMDs) like the HTC Vive
          // also need the cardboard button to enter fully immersive mode
          // so, we want to add the button if we're not polyfilled.
          if (!this.vrDisplay.isPolyfilled) {
            this.log('Real HMD found using VRControls', this.vrDisplay);
            this.addCardboardButton_();

            // We use VRControls here since we are working with an HMD
            // and we only want orientation controls.
            this.controls3d = new VRControls(this.camera);
          }
        }

        if (!this.controls3d) {
          this.log('no HMD found Using Orbit & Orientation Controls');
          this.controls3d = new OrbitOrientationContols({
            camera: this.camera,
            canvas: this.renderedCanvas,
            orientation: videojs.browser.IS_IOS || videojs.browser.IS_ANDROID || false
          });
        }
        this.animationFrameId_ = this.requestAnimationFrame(this.animate_);
      });
    } else if (window.navigator.getVRDevices) {
      this.triggerError_({code: 'web-vr-out-of-date', dismiss: false});
    } else {
      this.triggerError_({code: 'web-vr-not-supported', dismiss: false});
    }

    this.on(this.player_, 'fullscreenchange', this.handleResize_);
    window.addEventListener('vrdisplaypresentchange', this.handleResize_, true);
    window.addEventListener('resize', this.handleResize_, true);
    window.addEventListener('vrdisplayactivate', this.handleVrDisplayActivate_, true);
    window.addEventListener('vrdisplaydeactivate', this.handleVrDisplayDeactivate_, true);

    this.initialized_ = true;
  }

  addCardboardButton_() {
    if (!this.player_.controlBar.getChild('CardboardButton')) {
      this.player_.controlBar.addChild('CardboardButton', {});
    }
  }

  getVideoEl_() {
    return this.player_.el().getElementsByTagName('video')[0];
  }

  reset() {
    if (!this.initialized_) {
      return;
    }

    if (this.controls3d) {
      this.controls3d.dispose();
    }
    if (this.effect) {
      this.effect.dispose();
    }

    window.removeEventListener('resize', this.handleResize_);
    window.removeEventListener('vrdisplaypresentchange', this.handleResize_);
    window.removeEventListener('vrdisplayactivate', this.handleVrDisplayActivate_);
    window.removeEventListener('vrdisplaydeactivate', this.handleVrDisplayDeactivate_);

    // re-add the big play button to player
    if (!this.player_.getChild('BigPlayButton')) {
      this.player_.addChild('BigPlayButton', {}, this.bigPlayButtonIndex_);
    }

    if (this.player_.getChild('BigVrPlayButton')) {
      this.player_.removeChild('BigVrPlayButton');
    }

    // remove the cardboard button
    if (this.player_.getChild('CardboardButton')) {
      this.player_.controlBar.removeChild('CardboardButton');
    }

    // show the fullscreen again
    if (videojs.browser.IS_IOS) {
      this.player_.controlBar.fullscreenToggle.show();
    }

    // reset the video element style so that it will be displayed
    this.getVideoEl_().style.display = '';

    // set the current projection to the default
    this.currentProjection_ = this.defaultProjection_;

    if (this.observer_) {
      this.observer_.disconnect();
    }

    // reset the ios touch to click workaround
    if (this.iosRevertTouchToClick_) {
      this.iosRevertTouchToClick_();
    }

    // remove the old canvas
    if (this.renderedCanvas) {
      this.renderedCanvas.parentNode.removeChild(this.renderedCanvas);
    }

    if (this.animationFrameId_) {
      this.cancelAnimationFrame(this.animationFrameId_);
    }

    this.initialized_ = false;
  }

  dispose() {
    super.dispose();
    this.reset();
  }

  polyfillVersion() {
    return WebVRPolyfill.version;
  }
}

VR.prototype.setTimeout = Component.prototype.setTimeout;
VR.prototype.clearTimeout = Component.prototype.clearTimeout;

VR.VERSION = VERSION;

videojs.registerPlugin('vr', VR);
export default VR;
