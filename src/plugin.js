import 'babel-polyfill';
import {version as VERSION} from '../package.json';
import window from 'global/window';
import document from 'global/document';
import videojs from 'video.js';
import * as THREE from 'three';
import VRControls from '../vendor/three/VRControls.js';
import VREffect from '../vendor/three/VREffect.js';
import OrbitOrientationContols from './orbit-orientation-controls.js';
import * as utils from './utils';
import CanvasPlayerControls from './canvas-player-controls';
import OmnitoneController from './omnitone-controller';

// WebXR related imports
import WebXRPolyfill from 'webxr-polyfill';
import {VRButton} from '../vendor/three/VRButton.js';
import {XRControllerModelFactory} from '../node_modules/three/examples/jsm/webxr/XRControllerModelFactory';
import {BoxLineGeometry} from '../node_modules/three/examples/jsm/geometries/BoxLineGeometry';

// import controls so they get registered with videojs
import './cardboard-button';
import './big-vr-play-button';

// Default options for the plugin.
const defaults = {
  debug: false,
  omnitone: false,
  forceCardboard: false,
  omnitoneOptions: {},
  projection: 'AUTO',
  sphereDetail: 32,
  disableTogglePlay: false
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

    this.polyfill_ = new WebXRPolyfill();

    this.handleVrDisplayActivate_ = videojs.bind(this, this.handleVrDisplayActivate_);
    this.handleVrDisplayDeactivate_ = videojs.bind(this, this.handleVrDisplayDeactivate_);
    this.handleResize_ = videojs.bind(this, this.handleResize_);
    this.animate_ = videojs.bind(this, this.animate_);

    this.setProjection(this.options_.projection);

    // any time the video element is recycled for ads
    // we have to reset the vr state and re-init after ad
    this.on(player, 'adstart', () => player.setTimeout(() => {
      // if the video element was recycled for this ad
      if (!player.ads || !player.ads.videoElementRecycled()) {
        this.log('video element not recycled for this ad, no need to reset');
        return;
      }

      this.log('video element recycled for this ad, reseting');
      this.reset();

      this.one(player, 'playing', this.init);
    }), 1);

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
      // each source should know whatever they are 360 or not, if using AUTO
      if (this.player_.mediainfo && this.player_.mediainfo.projection && this.player_.mediainfo.projection !== 'AUTO') {
        const autoProjection = utils.getInternalProjectionName(this.player_.mediainfo.projection);

        return this.changeProjection_(autoProjection);
      }
      return this.changeProjection_('NONE');
    } else if (projection === '360') {
      this.movieGeometry = new THREE.SphereBufferGeometry(256, this.options_.sphereDetail, this.options_.sphereDetail);
      this.movieMaterial = new THREE.MeshBasicMaterial({ map: this.videoTexture, side: THREE.BackSide });

      this.movieScreen = new THREE.Mesh(this.movieGeometry, this.movieMaterial);
      this.movieScreen.position.set(position.x, position.y, position.z);

      this.movieScreen.scale.x = -1;
      this.movieScreen.quaternion.setFromAxisAngle({x: 0, y: 1, z: 0}, -Math.PI / 2);
      this.scene.add(this.movieScreen);
    } else if (projection === '360_LR' || projection === '360_TB') {
      // Left eye view
      this.movieGeometry = new THREE.SphereBufferGeometry(
        256,
        this.options_.sphereDetail,
        this.options_.sphereDetail
      );

      let uvs = this.movieGeometry.getAttribute('uv');

      for (let i = 0; i < uvs.count; i++) {
        if (projection === '360_LR') {
          let xTransform = uvs.getX(i);

          xTransform *= 0.5;
          uvs.setX(i, xTransform);
        } else {
          let yTransform = uvs.getY(i);

          yTransform *= 0.5;
          yTransform += 0.5;
          uvs.setY(i, yTransform);
        }
      }

      this.movieMaterial = new THREE.MeshBasicMaterial({ map: this.videoTexture, side: THREE.BackSide });

      this.movieScreen = new THREE.Mesh(this.movieGeometry, this.movieMaterial);
      this.movieScreen.scale.x = -1;
      this.movieScreen.quaternion.setFromAxisAngle({x: 0, y: 1, z: 0}, -Math.PI / 2);
      // display in left eye only
      this.movieScreen.layers.set(1);
      this.scene.add(this.movieScreen);

      // Right eye view
      this.movieGeometry = new THREE.SphereBufferGeometry(
        256,
        this.options_.sphereDetail,
        this.options_.sphereDetail
      );

      uvs = this.movieGeometry.getAttribute('uv');
      for (let i = 0; i < uvs.count; i++) {
        if (projection === '360_LR') {
          let xTransform = uvs.getX(i);

          xTransform *= 0.5;
          xTransform += 0.5;
          uvs.setX(i, xTransform);
        } else {
          let yTransform = uvs.getY(i);

          yTransform *= 0.5;
          uvs.setY(i, yTransform);
        }
      }

      this.movieMaterial = new THREE.MeshBasicMaterial({ map: this.videoTexture, side: THREE.BackSide });

      this.movieScreen = new THREE.Mesh(this.movieGeometry, this.movieMaterial);
      this.movieScreen.scale.x = -1;
      this.movieScreen.quaternion.setFromAxisAngle({x: 0, y: 1, z: 0}, -Math.PI / 2);
      // display in right eye only
      this.movieScreen.layers.set(2);
      this.scene.add(this.movieScreen);
    } else if (projection === '360_CUBE') {
      this.movieGeometry = new THREE.BoxBufferGeometry(256, 256, 256);
      this.movieMaterial = new THREE.MeshBasicMaterial({ map: this.videoTexture, side: THREE.BackSide });

      const uvs = this.movieGeometry.getAttribute('uv');

      const front = [new THREE.Vector2(1.0 / 3.0, 1.0 / 2.0), new THREE.Vector2(1.0 / 3.0, 1), new THREE.Vector2(0, 1), new THREE.Vector2(0, 1.0 / 2.0)];
      const right = [new THREE.Vector2(2.0 / 3.0, 1.0 / 2.0), new THREE.Vector2(2.0 / 3.0, 1), new THREE.Vector2(1.0 / 3.0, 1), new THREE.Vector2(1.0 / 3.0, 1.0 / 2.0)];
      const top = [new THREE.Vector2(1, 1), new THREE.Vector2(2.0 / 3.0, 1), new THREE.Vector2(2.0 / 3.0, 1.0 / 2.0), new THREE.Vector2(1, 1.0 / 2.0)];
      const bottom = [new THREE.Vector2(0, 0), new THREE.Vector2(1.0 / 3.0, 0), new THREE.Vector2(1.0 / 3.0, 1.0 / 2.0), new THREE.Vector2(0, 1.0 / 2.0)];
      const back = [new THREE.Vector2(2.0 / 3.0, 0), new THREE.Vector2(2.0 / 3.0, 1.0 / 2.0), new THREE.Vector2(1.0 / 3.0, 1.0 / 2.0), new THREE.Vector2(1.0 / 3.0, 0)];
      const left = [new THREE.Vector2(1, 0), new THREE.Vector2(1, 1.0 / 2.0), new THREE.Vector2(2.0 / 3.0, 1.0 / 2.0), new THREE.Vector2(2.0 / 3.0, 0) ];

      // LEFT
      uvs.setXY(0, left[2].x, left[2].y);
      uvs.setXY(1, left[1].x, left[1].y);
      uvs.setXY(2, left[3].x, left[3].y);
      uvs.setXY(3, left[0].x, left[0].y);

      // BACK
      uvs.setXY(4, back[2].x, back[2].y);
      uvs.setXY(5, back[1].x, back[1].y);
      uvs.setXY(6, back[3].x, back[3].y);
      uvs.setXY(7, back[0].x, back[0].y);

      // TOP/UP
      uvs.setXY(8, top[2].x, top[2].y);
      uvs.setXY(9, top[1].x, top[1].y);
      uvs.setXY(10, top[3].x, top[3].y);
      uvs.setXY(11, top[0].x, top[0].y);

      // BOTTOM/DOWN
      uvs.setXY(12, bottom[2].x, bottom[2].y);
      uvs.setXY(13, bottom[1].x, bottom[1].y);
      uvs.setXY(14, bottom[3].x, bottom[3].y);
      uvs.setXY(15, bottom[0].x, bottom[0].y);

      // FRONT
      uvs.setXY(16, front[2].x, front[2].y);
      uvs.setXY(17, front[1].x, front[1].y);
      uvs.setXY(18, front[3].x, front[3].y);
      uvs.setXY(19, front[0].x, front[0].y);

      // RIGHT
      uvs.setXY(20, right[2].x, right[2].y);
      uvs.setXY(21, right[1].x, right[1].y);
      uvs.setXY(22, right[3].x, right[3].y);
      uvs.setXY(23, right[0].x, right[0].y);

      this.movieScreen = new THREE.Mesh(this.movieGeometry, this.movieMaterial);
      this.movieScreen.position.set(position.x, position.y, position.z);
      this.movieScreen.rotation.y = -Math.PI;

      this.scene.add(this.movieScreen);
    } else if (projection === '180' || projection === '180_LR' || projection === '180_TB') {
      this.movieGeometry = new THREE.SphereBufferGeometry(
        256,
        this.options_.sphereDetail,
        this.options_.sphereDetail,
        Math.PI,
        Math.PI
      );

      // Left eye view
      this.movieGeometry.scale(-1, 1, 1);
      let uvs = this.movieGeometry.getAttribute('uv');

      if (projection !== '180_TB') {
        for (let i = 0; i < uvs.count; i++) {
          let xTransform = uvs.getX(i);

          xTransform *= 0.5;
          uvs.setX(i, xTransform);
        }
      } else {
        for (let i = 0; i < uvs.count; i++) {
          let yTransform = uvs.getY(i);

          yTransform *= 0.5;
          uvs.setY(i, yTransform);
        }
      }

      this.movieMaterial = new THREE.MeshBasicMaterial({
        map: this.videoTexture
      });
      this.movieScreen = new THREE.Mesh(this.movieGeometry, this.movieMaterial);
      // display in left eye only
      this.movieScreen.layers.set(1);
      this.scene.add(this.movieScreen);

      // Right eye view
      this.movieGeometry = new THREE.SphereBufferGeometry(
        256,
        this.options_.sphereDetail,
        this.options_.sphereDetail,
        Math.PI,
        Math.PI
      );
      this.movieGeometry.scale(-1, 1, 1);
      uvs = this.movieGeometry.getAttribute('uv');
      if (projection !== '180_TB') {
        for (let i = 0; i < uvs.count; i++) {
          let xTransform = uvs.getX(i);

          xTransform *= 0.5;
          xTransform += 0.5;
          uvs.setX(i, xTransform);
        }
      } else {
        for (let i = 0; i < uvs.count; i++) {
          let yTransform = uvs.getY(i);

          yTransform *= 0.5;
          yTransform += 0.5;
          uvs.setY(i, yTransform);
        }
      }

      this.movieMaterial = new THREE.MeshBasicMaterial({
        map: this.videoTexture
      });
      this.movieScreen = new THREE.Mesh(this.movieGeometry, this.movieMaterial);
      // display in right eye only
      this.movieScreen.layers.set(2);
      this.scene.add(this.movieScreen);
    } else if (projection === '180_MONO') {
      this.movieGeometry = new THREE.SphereBufferGeometry(
        256,
        this.options_.sphereDetail,
        this.options_.sphereDetail,
        Math.PI,
        Math.PI
      );

      this.movieGeometry.scale(-1, 1, 1);

      this.movieMaterial = new THREE.MeshBasicMaterial({
        map: this.videoTexture
      });
      this.movieScreen = new THREE.Mesh(this.movieGeometry, this.movieMaterial);
      this.scene.add(this.movieScreen);
    } else if (projection === 'EAC' || projection === 'EAC_LR') {
      const makeScreen = (mapMatrix, scaleMatrix) => {
        // "Continuity correction?": because of discontinuous faces and aliasing,
        // we truncate the 2-pixel-wide strips on all discontinuous edges,
        const contCorrect = 2;

        this.movieGeometry = new THREE.BoxBufferGeometry(256, 256, 256);
        this.movieMaterial = new THREE.ShaderMaterial({
          side: THREE.BackSide,
          uniforms: {
            mapped: {value: this.videoTexture},
            mapMatrix: {value: mapMatrix},
            contCorrect: {value: contCorrect},
            faceWH: {value: new THREE.Vector2(1 / 3, 1 / 2).applyMatrix3(scaleMatrix)},
            vidWH: {value: new THREE.Vector2(this.videoTexture.image.videoWidth, this.videoTexture.image.videoHeight).applyMatrix3(scaleMatrix)}
          },
          vertexShader: `
varying vec2 vUv;
uniform mat3 mapMatrix;

void main() {
  vUv = (mapMatrix * vec3(uv, 1.)).xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`,
          fragmentShader: `
varying vec2 vUv;
uniform sampler2D mapped;
uniform vec2 faceWH;
uniform vec2 vidWH;
uniform float contCorrect;

const float PI = 3.1415926535897932384626433832795;

void main() {
  vec2 corner = vUv - mod(vUv, faceWH) + vec2(0, contCorrect / vidWH.y);

  vec2 faceWHadj = faceWH - vec2(0, contCorrect * 2. / vidWH.y);

  vec2 p = (vUv - corner) / faceWHadj - .5;
  vec2 q = 2. / PI * atan(2. * p) + .5;

  vec2 eUv = corner + q * faceWHadj;

  gl_FragColor = texture2D(mapped, eUv);
}`
        });

        const right = [new THREE.Vector2(0, 1 / 2), new THREE.Vector2(1 / 3, 1 / 2), new THREE.Vector2(1 / 3, 1), new THREE.Vector2(0, 1)];
        const front = [new THREE.Vector2(1 / 3, 1 / 2), new THREE.Vector2(2 / 3, 1 / 2), new THREE.Vector2(2 / 3, 1), new THREE.Vector2(1 / 3, 1)];
        const left = [new THREE.Vector2(2 / 3, 1 / 2), new THREE.Vector2(1, 1 / 2), new THREE.Vector2(1, 1), new THREE.Vector2(2 / 3, 1)];
        const bottom = [new THREE.Vector2(1 / 3, 0), new THREE.Vector2(1 / 3, 1 / 2), new THREE.Vector2(0, 1 / 2), new THREE.Vector2(0, 0)];
        const back = [new THREE.Vector2(1 / 3, 1 / 2), new THREE.Vector2(1 / 3, 0), new THREE.Vector2(2 / 3, 0), new THREE.Vector2(2 / 3, 1 / 2)];
        const top = [new THREE.Vector2(1, 0), new THREE.Vector2(1, 1 / 2), new THREE.Vector2(2 / 3, 1 / 2), new THREE.Vector2(2 / 3, 0)];

        for (const face of [right, front, left, bottom, back, top]) {
          const height = this.videoTexture.image.videoHeight;
          let lowY = 1;
          let highY = 0;

          for (const vector of face) {
            if (vector.y < lowY) {
              lowY = vector.y;
            }
            if (vector.y > highY) {
              highY = vector.y;
            }
          }

          for (const vector of face) {
            if (Math.abs(vector.y - lowY) < Number.EPSILON) {
              vector.y += contCorrect / height;
            }
            if (Math.abs(vector.y - highY) < Number.EPSILON) {
              vector.y -= contCorrect / height;
            }

            vector.x = vector.x / height * (height - contCorrect * 2) + contCorrect / height;
          }
        }

        const uvs = this.movieGeometry.getAttribute('uv');

        uvs.setXYZ(0, right[2], right[1], right[3]);
        uvs.setXYZ(1, right[1], right[0], right[3]);

        uvs.setXYZ(2, left[2], left[1], left[3]);
        uvs.setXYZ(3, left[1], left[0], left[3]);

        uvs.setXYZ(4, top[2], top[1], top[3]);
        uvs.setXYZ(5, top[1], top[0], top[3]);

        uvs.setXYZ(6, bottom[2], bottom[1], bottom[3]);
        uvs.setXYZ(7, bottom[1], bottom[0], bottom[3]);

        uvs.setXYZ(8, front[2], front[1], front[3]);
        uvs.setXYZ(9, front[1], front[0], front[3]);

        uvs.setXYZ(10, back[2], back[1], back[3]);
        uvs.setXYZ(11, back[1], back[0], back[3]);

        this.movieScreen = new THREE.Mesh(this.movieGeometry, this.movieMaterial);
        this.movieScreen.position.set(position.x, position.y, position.z);
        this.movieScreen.rotation.y = -Math.PI;
        return this.movieScreen;
      };

      if (projection === 'EAC') {
        this.scene.add(makeScreen(new THREE.Matrix3(), new THREE.Matrix3()));
      } else {
        const scaleMatrix = new THREE.Matrix3().set(
          0, 0.5, 0,
          1, 0, 0,
          0, 0, 1
        );

        makeScreen(new THREE.Matrix3().set(
          0, -0.5, 0.5,
          1, 0, 0,
          0, 0, 1
        ), scaleMatrix);
        // display in left eye only
        this.movieScreen.layers.set(1);
        this.scene.add(this.movieScreen);

        makeScreen(new THREE.Matrix3().set(
          0, -0.5, 1,
          1, 0, 0,
          0, 0, 1
        ), scaleMatrix);
        // display in right eye only
        this.movieScreen.layers.set(2);
        this.scene.add(this.movieScreen);
      }
    }

    // Add some lighting to see the immersive controls
    const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.7);

    this.scene.add(ambient);

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
      videojs.log('VR: ', msg);
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

    return this.player_.requestAnimationFrame(fn);
  }

  cancelAnimationFrame(id) {
    if (this.vrDisplay) {
      return this.vrDisplay.cancelAnimationFrame(id);
    }

    return this.player_.cancelAnimationFrame(id);
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
    if (this.omniController) {
      this.omniController.update(this.camera);
    }

    // WebXR has animation loop but if that's not available we simulate that instead
    if (this.webVREffect) {
      this.webVREffect.render(this.scene, this.camera);
    }

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
    let width = this.player_.currentWidth();
    let height = this.player_.currentHeight();

    if (this.webVREffect) {
      this.webVREffect.setSize(width, height, false);
    } else if (this.currentSession) {
      width = window.innerWidth / 2;
      height = window.innerHeight;
    }

    if (width < 300) {
      width = 300;
    }
    if (height < 300) {
      height = 300;
    }
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

    this.camera = new THREE.PerspectiveCamera(70, this.player_.currentWidth() / this.player_.currentHeight(), 1, 2000);
    this.camera.layers.enable(1);

    // Store vector representing the direction in which the camera is looking, in world space.
    this.cameraVector = new THREE.Vector3();

    if (this.currentProjection_ === '360_LR' || this.currentProjection_ === '360_TB' || this.currentProjection_ === '180' || this.currentProjection_ === '180_LR' || this.currentProjection_ === '180_TB' || this.currentProjection_ === '180_MONO' || this.currentProjection_ === 'EAC_LR') {
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
    this.videoTexture.format = THREE.RGBAFormat;

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
    if (videojs.browser.IS_IOS && this.player_.controlBar && this.player_.controlBar.fullscreenToggle) {
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

    this.vrDisplay = null;

    // Previous timestamps for gamepad updates
    this.prevTimestamps_ = [];

    this.renderedCanvas = this.renderer.domElement;
    this.renderedCanvas.setAttribute('style', 'width: 100%; height: 100%; position: absolute; top:0;');

    const videoElStyle = this.getVideoEl_().style;

    this.player_.el().insertBefore(this.renderedCanvas, this.player_.el().firstChild);
    videoElStyle.zIndex = '-1';
    videoElStyle.opacity = '0';

    let displays = [];

    if (window.navigator.getVRDisplays) {
      this.log('is supported, getting vr displays');

      window.navigator.getVRDisplays().then((displaysArray) => {
        displays = displaysArray;
      });
    }

    // Detect WebXR is supported
    if (window.navigator.xr) {
      this.log('WebXR is supported');
      window.navigator.xr.isSessionSupported('immersive-vr').then((supportsImmersiveVR) => {
        if (supportsImmersiveVR) {
          // We support WebXR show the enter VRButton
          this.vrButton = VRButton.createButton(this.renderer);
          document.body.appendChild(this.vrButton);
          this.initImmersiveVR();
          this.initXRPolyfill(displays);
        } else {
          // fallback to older WebVR if WebXR immersive session is not available
          this.initVRPolyfill(displays);
        }
        window.navigator.xr.setSession = (session) => {
          this.currentSession = session;
          this.renderer.xr.setSession(this.currentSession);
        };
      });
    } else {
      // fallback to older WebVR if WebXR Device API is not available
      this.initVRPolyfill(displays);
    }
  }

  initVRPolyfill(displays) {
    this.webVREffect = new VREffect(this.renderer);
    this.webVREffect.setSize(this.player_.currentWidth(), this.player_.currentHeight(), false);
    this.initXRPolyfill(displays);
  }

  initXRPolyfill(displays) {
    if (displays.length && displays.length > 0) {
      this.log('Displays found', displays);
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
      const options = {
        camera: this.camera,
        canvas: this.renderedCanvas,
        // check if its a half sphere view projection
        halfView: this.currentProjection_.indexOf('180') === 0,
        orientation: videojs.browser.IS_IOS || videojs.browser.IS_ANDROID || false
      };

      if (this.options_.motionControls === false) {
        options.orientation = false;
      }

      this.controls3d = new OrbitOrientationContols(options);
      this.canvasPlayerControls = new CanvasPlayerControls(this.player_, this.renderedCanvas, this.options_);
      this.animationFrameId_ = this.requestAnimationFrame(this.animate_);
    } else if (window.navigator.getVRDevices) {
      this.triggerError_({code: 'web-vr-out-of-date', dismiss: false});
    } else {
      this.triggerError_({code: 'web-vr-not-supported', dismiss: false});
    }

    if (this.options_.omnitone) {
      const audiocontext = THREE.AudioContext.getContext();

      this.omniController = new OmnitoneController(
        audiocontext,
        this.options_.omnitone, this.getVideoEl_(), this.options_.omnitoneOptions
      );
      this.omniController.one('audiocontext-suspended', () => {
        this.player.pause();
        this.player.one('playing', () => {
          audiocontext.resume();
        });
      });
    }

    this.on(this.player_, 'fullscreenchange', this.handleResize_);
    window.addEventListener('vrdisplaypresentchange', this.handleResize_, true);
    window.addEventListener('resize', this.handleResize_, true);
    window.addEventListener('vrdisplayactivate', this.handleVrDisplayActivate_, true);
    window.addEventListener('vrdisplaydeactivate', this.handleVrDisplayDeactivate_, true);

    // For iOS we need permission for the device orientation data, this will pop up an 'Allow'
    // eslint-disable-next-line
    if (typeof window.DeviceMotionEvent === 'function' &&
      typeof window.DeviceMotionEvent.requestPermission === 'function') {
      const self = this;

      window.DeviceMotionEvent.requestPermission().then(response => {
        if (response === 'granted') {
          window.addEventListener('deviceorientation', (event) => {
            self.onDeviceOrientationChange(event.beta, event.gamma, event.alpha);
          });
        }
      });
    }

    this.initialized_ = true;
    this.trigger('initialized');
  }

  onDeviceOrientationChange(pitch, roll, yaw) {
    this.log(`orientation pitch=${parseInt(pitch, 10)} roll=${parseInt(roll, 10)} yaw=${parseInt(yaw, 10)}`);
  }

  buildControllers() {
    const controllerModelFactory = new XRControllerModelFactory();

    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);

    const line = new THREE.Line(geometry);

    line.name = 'line';
    line.scale.z = 0;

    const controllers = [];

    for (let i = 0; i <= 1; i++) {
      const controller = this.renderer.xr.getController(i);

      controller.add(line.clone());
      controller.userData.selectPressed = false;
      this.scene.add(controller);

      controllers.push(controller);

      const grip = this.renderer.xr.getControllerGrip(i);

      grip.add(controllerModelFactory.createControllerModel(grip));
      this.scene.add(grip);
    }

    return controllers;
  }

  initShuttleControls() {
    this.holodeck = new THREE.LineSegments(new BoxLineGeometry(6, 6, 6, 10, 10, 10), new THREE.MeshBasicMaterial({ opacity: 0, transparent: true }));
    this.holodeck.geometry.translate(0, 3, 0);

    const geometry = new THREE.IcosahedronBufferGeometry(0.1, 2);

    this.scene.add(this.holodeck);

    // Play/Pause
    this.buttonPlayPause = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({color: 0x00ffff}));
    this.buttonPlayPause.position.x = -0.4;
    this.buttonPlayPause.position.y = -2.0;
    this.buttonPlayPause.position.z = -4.0;
    this.buttonPlayPause.buttonid = 'playpause';
    this.buttonPlayPause.visible = false;
    this.holodeck.add(this.buttonPlayPause);

    // ExitVR
    this.buttonExit = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({color: 0xff0000}));
    this.buttonExit.position.x = 0.4;
    this.buttonExit.position.y = -2.0;
    this.buttonExit.position.z = -4.0;
    this.buttonExit.buttonid = 'exit';
    this.buttonExit.visible = false;
    this.holodeck.add(this.buttonExit);

    this.highlight = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({color: 0xffffff, side: THREE.BackSide}));
    this.highlight.scale.set(1.1, 1.1, 1.1);
    this.highlight.visible = false;
    this.scene.add(this.highlight);
  }

  renderController(controller) {
    if (controller.userData.selectPressed) {
      controller.children[0].scale.z = 10;
      this.workingMatrix.identity().extractRotation(controller.matrixWorld);
      this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.workingMatrix);
      const rayTargets = this.raycaster.intersectObjects(this.holodeck.children);

      if (rayTargets.length > 0) {
        rayTargets[0].object.add(this.highlight);
        this.highlight.visible = true;
        if (controller.userData.selectPressed) {
          switch (rayTargets[0].object.buttonid) {
          case 'playpause':
            this.togglePlay_();
            break;

          case 'exit':
          default:
            this.vrButton.click();
            if (this.currentSession) {
              this.currentSession.end();
              this.player_.pause();
            }
            break;
          }
          controller.userData.selectPressed = false;
        }
        controller.children[0].scale.z = rayTargets[0].distance;
      } else {
        this.highlight.visible = false;
      }
    }
  }

  initImmersiveVR() {
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local');
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setAnimationLoop(this.render.bind(this));

    this.raycaster = new THREE.Raycaster();
    this.workingMatrix = new THREE.Matrix4();
    this.workingVector = new THREE.Vector3();

    this.initShuttleControls();

    const self = this;

    this.controllers = this.buildControllers();

    function onSelectStart() {
      this.children[0].scale.z = 10;
      this.userData.selectPressed = true;
      self.buttonExit.visible = true;
      self.buttonPlayPause.visible = true;
    }

    function onSelectEnd() {
      this.children[0].scale.z = 0;
      self.highlight.visible = false;
      this.userData.selectPressed = false;
      self.buttonExit.visible = false;
      self.buttonPlayPause.visible = false;
    }

    this.controllers.forEach((controller) => {
      controller.addEventListener('selectstart', onSelectStart);
      controller.addEventListener('selectend', onSelectEnd);
      controller.addEventListener('squeezestart', onSelectStart);
      controller.addEventListener('squeezeend', onSelectEnd);
    });

  }

  render() {
    if (this.controllers) {
      const self = this;

      this.controllers.forEach((controller) => {
        self.renderController(controller);
      });
    }

    this.renderer.render(this.scene, this.camera);
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

    if (this.omniController) {
      this.omniController.off('audiocontext-suspended');
      this.omniController.dispose();
      this.omniController = undefined;
    }

    if (this.controls3d) {
      this.controls3d.dispose();
      this.controls3d = null;
    }

    if (this.canvasPlayerControls) {
      this.canvasPlayerControls.dispose();
      this.canvasPlayerControls = null;
    }

    if (this.webVREffect) {
      this.webVREffect.dispose();
      this.webVREffect = null;
    }

    window.removeEventListener('resize', this.handleResize_, true);
    window.removeEventListener('vrdisplaypresentchange', this.handleResize_, true);
    window.removeEventListener('vrdisplayactivate', this.handleVrDisplayActivate_, true);
    window.removeEventListener('vrdisplaydeactivate', this.handleVrDisplayDeactivate_, true);

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
    if (videojs.browser.IS_IOS && this.player_.controlBar && this.player_.controlBar.fullscreenToggle) {
      this.player_.controlBar.fullscreenToggle.show();
    }

    // reset the video element style so that it will be displayed
    const videoElStyle = this.getVideoEl_().style;

    videoElStyle.zIndex = '';
    videoElStyle.opacity = '';

    // set the current projection to the default
    this.currentProjection_ = this.defaultProjection_;

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
    return WebXRPolyfill.version;
  }
}

VR.prototype.setTimeout = Component.prototype.setTimeout;
VR.prototype.clearTimeout = Component.prototype.clearTimeout;

VR.VERSION = VERSION;

videojs.registerPlugin('vr', VR);
export default VR;
