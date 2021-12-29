/*! @name videojs-vr @version 1.10.0 @license Apache-2.0 */
'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _assertThisInitialized = _interopDefault(require('@babel/runtime/helpers/assertThisInitialized'));
var _inheritsLoose = _interopDefault(require('@babel/runtime/helpers/inheritsLoose'));
var window$1 = _interopDefault(require('global/window'));
var document$1 = _interopDefault(require('global/document'));
var WebVRPolyfill = _interopDefault(require('webvr-polyfill'));
var videojs = _interopDefault(require('video.js'));
var THREE = require('three');
var webvrui = require('webvr-ui');

var version = "1.10.0";

/**
 * @author dmarcos / https://github.com/dmarcos
 * @author mrdoob / http://mrdoob.com
 *
 * originally from https://github.com/mrdoob/three.js/blob/r93/examples/js/controls/VRControls.js
 */

var VRControls = function VRControls(object, onError) {
  var scope = this;
  var vrDisplay, vrDisplays;
  var standingMatrix = new THREE.Matrix4();
  var frameData = null;

  if ('VRFrameData' in window) {
    frameData = new VRFrameData();
  }

  function gotVRDisplays(displays) {
    vrDisplays = displays;

    if (displays.length > 0) {
      vrDisplay = displays[0];
    } else {
      if (onError) onError('VR input not available.');
    }
  }

  if (navigator.getVRDisplays) {
    navigator.getVRDisplays().then(gotVRDisplays).catch(function () {
      console.warn('THREE.VRControls: Unable to get VR Displays');
    });
  } // the Rift SDK returns the position in meters
  // this scale factor allows the user to define how meters
  // are converted to scene units.


  this.scale = 1; // If true will use "standing space" coordinate system where y=0 is the
  // floor and x=0, z=0 is the center of the room.

  this.standing = false; // Distance from the users eyes to the floor in meters. Used when
  // standing=true but the VRDisplay doesn't provide stageParameters.

  this.userHeight = 1.6;

  this.getVRDisplay = function () {
    return vrDisplay;
  };

  this.setVRDisplay = function (value) {
    vrDisplay = value;
  };

  this.getVRDisplays = function () {
    console.warn('THREE.VRControls: getVRDisplays() is being deprecated.');
    return vrDisplays;
  };

  this.getStandingMatrix = function () {
    return standingMatrix;
  };

  this.update = function () {
    if (vrDisplay) {
      var pose;

      if (vrDisplay.getFrameData) {
        vrDisplay.getFrameData(frameData);
        pose = frameData.pose;
      } else if (vrDisplay.getPose) {
        pose = vrDisplay.getPose();
      }

      if (pose.orientation !== null) {
        object.quaternion.fromArray(pose.orientation);
      }

      if (pose.position !== null) {
        object.position.fromArray(pose.position);
      } else {
        object.position.set(0, 0, 0);
      }

      if (this.standing) {
        if (vrDisplay.stageParameters) {
          object.updateMatrix();
          standingMatrix.fromArray(vrDisplay.stageParameters.sittingToStandingTransform);
          object.applyMatrix(standingMatrix);
        } else {
          object.position.setY(object.position.y + this.userHeight);
        }
      }

      object.position.multiplyScalar(scope.scale);
    }
  };

  this.dispose = function () {
    vrDisplay = null;
  };
};

/**
 * @author dmarcos / https://github.com/dmarcos
 * @author mrdoob / http://mrdoob.com
 *
 * WebVR Spec: http://mozvr.github.io/webvr-spec/webvr.html
 *
 * Firefox: http://mozvr.com/downloads/
 * Chromium: https://webvr.info/get-chrome
 *
 * originally from https://github.com/mrdoob/three.js/blob/r93/examples/js/effects/VREffect.js
 */

var VREffect = function VREffect(renderer, onError) {
  var vrDisplay, vrDisplays;
  var eyeTranslationL = new THREE.Vector3();
  var eyeTranslationR = new THREE.Vector3();
  var renderRectL, renderRectR;
  var headMatrix = new THREE.Matrix4();
  var eyeMatrixL = new THREE.Matrix4();
  var eyeMatrixR = new THREE.Matrix4();
  var frameData = null;

  if ('VRFrameData' in window) {
    frameData = new window.VRFrameData();
  }

  function gotVRDisplays(displays) {
    vrDisplays = displays;

    if (displays.length > 0) {
      vrDisplay = displays[0];
    } else {
      if (onError) onError('HMD not available');
    }
  }

  if (navigator.getVRDisplays) {
    navigator.getVRDisplays().then(gotVRDisplays).catch(function () {
      console.warn('THREE.VREffect: Unable to get VR Displays');
    });
  } //


  this.isPresenting = false;
  var scope = this;
  var rendererSize = renderer.getSize();
  var rendererUpdateStyle = false;
  var rendererPixelRatio = renderer.getPixelRatio();

  this.getVRDisplay = function () {
    return vrDisplay;
  };

  this.setVRDisplay = function (value) {
    vrDisplay = value;
  };

  this.getVRDisplays = function () {
    console.warn('THREE.VREffect: getVRDisplays() is being deprecated.');
    return vrDisplays;
  };

  this.setSize = function (width, height, updateStyle) {
    rendererSize = {
      width: width,
      height: height
    };
    rendererUpdateStyle = updateStyle;

    if (scope.isPresenting) {
      var eyeParamsL = vrDisplay.getEyeParameters('left');
      renderer.setPixelRatio(1);
      renderer.setSize(eyeParamsL.renderWidth * 2, eyeParamsL.renderHeight, false);
    } else {
      renderer.setPixelRatio(rendererPixelRatio);
      renderer.setSize(width, height, updateStyle);
    }
  }; // VR presentation


  var canvas = renderer.domElement;
  var defaultLeftBounds = [0.0, 0.0, 0.5, 1.0];
  var defaultRightBounds = [0.5, 0.0, 0.5, 1.0];

  function onVRDisplayPresentChange() {
    var wasPresenting = scope.isPresenting;
    scope.isPresenting = vrDisplay !== undefined && vrDisplay.isPresenting;

    if (scope.isPresenting) {
      var eyeParamsL = vrDisplay.getEyeParameters('left');
      var eyeWidth = eyeParamsL.renderWidth;
      var eyeHeight = eyeParamsL.renderHeight;

      if (!wasPresenting) {
        rendererPixelRatio = renderer.getPixelRatio();
        rendererSize = renderer.getSize();
        renderer.setPixelRatio(1);
        renderer.setSize(eyeWidth * 2, eyeHeight, false);
      }
    } else if (wasPresenting) {
      renderer.setPixelRatio(rendererPixelRatio);
      renderer.setSize(rendererSize.width, rendererSize.height, rendererUpdateStyle);
    }
  }

  window.addEventListener('vrdisplaypresentchange', onVRDisplayPresentChange, false);

  this.setFullScreen = function (boolean) {
    return new Promise(function (resolve, reject) {
      if (vrDisplay === undefined) {
        reject(new Error('No VR hardware found.'));
        return;
      }

      if (scope.isPresenting === boolean) {
        resolve();
        return;
      }

      if (boolean) {
        resolve(vrDisplay.requestPresent([{
          source: canvas
        }]));
      } else {
        resolve(vrDisplay.exitPresent());
      }
    });
  };

  this.requestPresent = function () {
    return this.setFullScreen(true);
  };

  this.exitPresent = function () {
    return this.setFullScreen(false);
  };

  this.requestAnimationFrame = function (f) {
    if (vrDisplay !== undefined) {
      return vrDisplay.requestAnimationFrame(f);
    } else {
      return window.requestAnimationFrame(f);
    }
  };

  this.cancelAnimationFrame = function (h) {
    if (vrDisplay !== undefined) {
      vrDisplay.cancelAnimationFrame(h);
    } else {
      window.cancelAnimationFrame(h);
    }
  };

  this.submitFrame = function () {
    if (vrDisplay !== undefined && scope.isPresenting) {
      vrDisplay.submitFrame();
    }
  };

  this.autoSubmitFrame = true; // render

  var cameraL = new THREE.PerspectiveCamera();
  cameraL.layers.enable(1);
  var cameraR = new THREE.PerspectiveCamera();
  cameraR.layers.enable(2);

  this.render = function (scene, camera, renderTarget, forceClear) {
    if (vrDisplay && scope.isPresenting) {
      var autoUpdate = scene.autoUpdate;

      if (autoUpdate) {
        scene.updateMatrixWorld();
        scene.autoUpdate = false;
      }

      if (Array.isArray(scene)) {
        console.warn('THREE.VREffect.render() no longer supports arrays. Use object.layers instead.');
        scene = scene[0];
      } // When rendering we don't care what the recommended size is, only what the actual size
      // of the backbuffer is.


      var size = renderer.getSize();
      var layers = vrDisplay.getLayers();
      var leftBounds;
      var rightBounds;

      if (layers.length) {
        var layer = layers[0];
        leftBounds = layer.leftBounds !== null && layer.leftBounds.length === 4 ? layer.leftBounds : defaultLeftBounds;
        rightBounds = layer.rightBounds !== null && layer.rightBounds.length === 4 ? layer.rightBounds : defaultRightBounds;
      } else {
        leftBounds = defaultLeftBounds;
        rightBounds = defaultRightBounds;
      }

      renderRectL = {
        x: Math.round(size.width * leftBounds[0]),
        y: Math.round(size.height * leftBounds[1]),
        width: Math.round(size.width * leftBounds[2]),
        height: Math.round(size.height * leftBounds[3])
      };
      renderRectR = {
        x: Math.round(size.width * rightBounds[0]),
        y: Math.round(size.height * rightBounds[1]),
        width: Math.round(size.width * rightBounds[2]),
        height: Math.round(size.height * rightBounds[3])
      };

      if (renderTarget) {
        renderer.setRenderTarget(renderTarget);
        renderTarget.scissorTest = true;
      } else {
        renderer.setRenderTarget(null);
        renderer.setScissorTest(true);
      }

      if (renderer.autoClear || forceClear) renderer.clear();
      if (camera.parent === null) camera.updateMatrixWorld();
      camera.matrixWorld.decompose(cameraL.position, cameraL.quaternion, cameraL.scale);
      cameraR.position.copy(cameraL.position);
      cameraR.quaternion.copy(cameraL.quaternion);
      cameraR.scale.copy(cameraL.scale);

      if (vrDisplay.getFrameData) {
        vrDisplay.depthNear = camera.near;
        vrDisplay.depthFar = camera.far;
        vrDisplay.getFrameData(frameData);
        cameraL.projectionMatrix.elements = frameData.leftProjectionMatrix;
        cameraR.projectionMatrix.elements = frameData.rightProjectionMatrix;
        getEyeMatrices(frameData);
        cameraL.updateMatrix();
        cameraL.matrix.multiply(eyeMatrixL);
        cameraL.matrix.decompose(cameraL.position, cameraL.quaternion, cameraL.scale);
        cameraR.updateMatrix();
        cameraR.matrix.multiply(eyeMatrixR);
        cameraR.matrix.decompose(cameraR.position, cameraR.quaternion, cameraR.scale);
      } else {
        var eyeParamsL = vrDisplay.getEyeParameters('left');
        var eyeParamsR = vrDisplay.getEyeParameters('right');
        cameraL.projectionMatrix = fovToProjection(eyeParamsL.fieldOfView, true, camera.near, camera.far);
        cameraR.projectionMatrix = fovToProjection(eyeParamsR.fieldOfView, true, camera.near, camera.far);
        eyeTranslationL.fromArray(eyeParamsL.offset);
        eyeTranslationR.fromArray(eyeParamsR.offset);
        cameraL.translateOnAxis(eyeTranslationL, cameraL.scale.x);
        cameraR.translateOnAxis(eyeTranslationR, cameraR.scale.x);
      } // render left eye


      if (renderTarget) {
        renderTarget.viewport.set(renderRectL.x, renderRectL.y, renderRectL.width, renderRectL.height);
        renderTarget.scissor.set(renderRectL.x, renderRectL.y, renderRectL.width, renderRectL.height);
      } else {
        renderer.setViewport(renderRectL.x, renderRectL.y, renderRectL.width, renderRectL.height);
        renderer.setScissor(renderRectL.x, renderRectL.y, renderRectL.width, renderRectL.height);
      }

      renderer.render(scene, cameraL, renderTarget, forceClear); // render right eye

      if (renderTarget) {
        renderTarget.viewport.set(renderRectR.x, renderRectR.y, renderRectR.width, renderRectR.height);
        renderTarget.scissor.set(renderRectR.x, renderRectR.y, renderRectR.width, renderRectR.height);
      } else {
        renderer.setViewport(renderRectR.x, renderRectR.y, renderRectR.width, renderRectR.height);
        renderer.setScissor(renderRectR.x, renderRectR.y, renderRectR.width, renderRectR.height);
      }

      renderer.render(scene, cameraR, renderTarget, forceClear);

      if (renderTarget) {
        renderTarget.viewport.set(0, 0, size.width, size.height);
        renderTarget.scissor.set(0, 0, size.width, size.height);
        renderTarget.scissorTest = false;
        renderer.setRenderTarget(null);
      } else {
        renderer.setViewport(0, 0, size.width, size.height);
        renderer.setScissorTest(false);
      }

      if (autoUpdate) {
        scene.autoUpdate = true;
      }

      if (scope.autoSubmitFrame) {
        scope.submitFrame();
      }

      return;
    } // Regular render mode if not HMD


    renderer.render(scene, camera, renderTarget, forceClear);
  };

  this.dispose = function () {
    window.removeEventListener('vrdisplaypresentchange', onVRDisplayPresentChange, false);
  }; //


  var poseOrientation = new THREE.Quaternion();
  var posePosition = new THREE.Vector3(); // Compute model matrices of the eyes with respect to the head.

  function getEyeMatrices(frameData) {
    // Compute the matrix for the position of the head based on the pose
    if (frameData.pose.orientation) {
      poseOrientation.fromArray(frameData.pose.orientation);
      headMatrix.makeRotationFromQuaternion(poseOrientation);
    } else {
      headMatrix.identity();
    }

    if (frameData.pose.position) {
      posePosition.fromArray(frameData.pose.position);
      headMatrix.setPosition(posePosition);
    } // The view matrix transforms vertices from sitting space to eye space. As such, the view matrix can be thought of as a product of two matrices:
    // headToEyeMatrix * sittingToHeadMatrix
    // The headMatrix that we've calculated above is the model matrix of the head in sitting space, which is the inverse of sittingToHeadMatrix.
    // So when we multiply the view matrix with headMatrix, we're left with headToEyeMatrix:
    // viewMatrix * headMatrix = headToEyeMatrix * sittingToHeadMatrix * headMatrix = headToEyeMatrix


    eyeMatrixL.fromArray(frameData.leftViewMatrix);
    eyeMatrixL.multiply(headMatrix);
    eyeMatrixR.fromArray(frameData.rightViewMatrix);
    eyeMatrixR.multiply(headMatrix); // The eye's model matrix in head space is the inverse of headToEyeMatrix we calculated above.

    eyeMatrixL.getInverse(eyeMatrixL);
    eyeMatrixR.getInverse(eyeMatrixR);
  }

  function fovToNDCScaleOffset(fov) {
    var pxscale = 2.0 / (fov.leftTan + fov.rightTan);
    var pxoffset = (fov.leftTan - fov.rightTan) * pxscale * 0.5;
    var pyscale = 2.0 / (fov.upTan + fov.downTan);
    var pyoffset = (fov.upTan - fov.downTan) * pyscale * 0.5;
    return {
      scale: [pxscale, pyscale],
      offset: [pxoffset, pyoffset]
    };
  }

  function fovPortToProjection(fov, rightHanded, zNear, zFar) {
    rightHanded = rightHanded === undefined ? true : rightHanded;
    zNear = zNear === undefined ? 0.01 : zNear;
    zFar = zFar === undefined ? 10000.0 : zFar;
    var handednessScale = rightHanded ? -1.0 : 1.0; // start with an identity matrix

    var mobj = new THREE.Matrix4();
    var m = mobj.elements; // and with scale/offset info for normalized device coords

    var scaleAndOffset = fovToNDCScaleOffset(fov); // X result, map clip edges to [-w,+w]

    m[0 * 4 + 0] = scaleAndOffset.scale[0];
    m[0 * 4 + 1] = 0.0;
    m[0 * 4 + 2] = scaleAndOffset.offset[0] * handednessScale;
    m[0 * 4 + 3] = 0.0; // Y result, map clip edges to [-w,+w]
    // Y offset is negated because this proj matrix transforms from world coords with Y=up,
    // but the NDC scaling has Y=down (thanks D3D?)

    m[1 * 4 + 0] = 0.0;
    m[1 * 4 + 1] = scaleAndOffset.scale[1];
    m[1 * 4 + 2] = -scaleAndOffset.offset[1] * handednessScale;
    m[1 * 4 + 3] = 0.0; // Z result (up to the app)

    m[2 * 4 + 0] = 0.0;
    m[2 * 4 + 1] = 0.0;
    m[2 * 4 + 2] = zFar / (zNear - zFar) * -handednessScale;
    m[2 * 4 + 3] = zFar * zNear / (zNear - zFar); // W result (= Z in)

    m[3 * 4 + 0] = 0.0;
    m[3 * 4 + 1] = 0.0;
    m[3 * 4 + 2] = handednessScale;
    m[3 * 4 + 3] = 0.0;
    mobj.transpose();
    return mobj;
  }

  function fovToProjection(fov, rightHanded, zNear, zFar) {
    var DEG2RAD = Math.PI / 180.0;
    var fovPort = {
      upTan: Math.tan(fov.upDegrees * DEG2RAD),
      downTan: Math.tan(fov.downDegrees * DEG2RAD),
      leftTan: Math.tan(fov.leftDegrees * DEG2RAD),
      rightTan: Math.tan(fov.rightDegrees * DEG2RAD)
    };
    return fovPortToProjection(fovPort, rightHanded, zNear, zFar);
  }
};

/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 *
 * originally from https://github.com/mrdoob/three.js/blob/r93/examples/js/controls/OrbitControls.js
 */
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one-finger move
//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
//    Pan - right mouse, or arrow keys / touch: two-finger move

var OrbitControls = function OrbitControls(object, domElement) {
  this.object = object;
  this.domElement = domElement !== undefined ? domElement : document; // Set to false to disable this control

  this.enabled = true; // "target" sets the location of focus, where the object orbits around

  this.target = new THREE.Vector3(); // How far you can dolly in and out ( PerspectiveCamera only )

  this.minDistance = 0;
  this.maxDistance = Infinity; // How far you can zoom in and out ( OrthographicCamera only )

  this.minZoom = 0;
  this.maxZoom = Infinity; // How far you can orbit vertically, upper and lower limits.
  // Range is 0 to Math.PI radians.

  this.minPolarAngle = 0; // radians

  this.maxPolarAngle = Math.PI; // radians
  // How far you can orbit horizontally, upper and lower limits.
  // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].

  this.minAzimuthAngle = -Infinity; // radians

  this.maxAzimuthAngle = Infinity; // radians
  // Set to true to enable damping (inertia)
  // If damping is enabled, you must call controls.update() in your animation loop

  this.enableDamping = false;
  this.dampingFactor = 0.25; // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
  // Set to false to disable zooming

  this.enableZoom = true;
  this.zoomSpeed = 1.0; // Set to false to disable rotating

  this.enableRotate = true;
  this.rotateSpeed = 1.0; // Set to false to disable panning

  this.enablePan = true;
  this.panSpeed = 1.0;
  this.screenSpacePanning = false; // if true, pan in screen-space

  this.keyPanSpeed = 7.0; // pixels moved per arrow key push
  // Set to true to automatically rotate around the target
  // If auto-rotate is enabled, you must call controls.update() in your animation loop

  this.autoRotate = false;
  this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60
  // Set to false to disable use of the keys

  this.enableKeys = true; // The four arrow keys

  this.keys = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    BOTTOM: 40
  }; // Mouse buttons

  this.mouseButtons = {
    ORBIT: THREE.MOUSE.LEFT,
    ZOOM: THREE.MOUSE.MIDDLE,
    PAN: THREE.MOUSE.RIGHT
  }; // for reset

  this.target0 = this.target.clone();
  this.position0 = this.object.position.clone();
  this.zoom0 = this.object.zoom; //
  // public methods
  //

  this.getPolarAngle = function () {
    return spherical.phi;
  };

  this.getAzimuthalAngle = function () {
    return spherical.theta;
  };

  this.saveState = function () {
    scope.target0.copy(scope.target);
    scope.position0.copy(scope.object.position);
    scope.zoom0 = scope.object.zoom;
  };

  this.reset = function () {
    scope.target.copy(scope.target0);
    scope.object.position.copy(scope.position0);
    scope.object.zoom = scope.zoom0;
    scope.object.updateProjectionMatrix();
    scope.dispatchEvent(changeEvent);
    scope.update();
    state = STATE.NONE;
  }; // this method is exposed, but perhaps it would be better if we can make it private...


  this.update = function () {
    var offset = new THREE.Vector3(); // so camera.up is the orbit axis

    var quat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0));
    var quatInverse = quat.clone().inverse();
    var lastPosition = new THREE.Vector3();
    var lastQuaternion = new THREE.Quaternion();
    return function update() {
      var position = scope.object.position;
      offset.copy(position).sub(scope.target); // rotate offset to "y-axis-is-up" space

      offset.applyQuaternion(quat); // angle from z-axis around y-axis

      spherical.setFromVector3(offset);

      if (scope.autoRotate && state === STATE.NONE) {
        scope.rotateLeft(getAutoRotationAngle());
      }

      spherical.theta += sphericalDelta.theta;
      spherical.phi += sphericalDelta.phi; // restrict theta to be between desired limits

      spherical.theta = Math.max(scope.minAzimuthAngle, Math.min(scope.maxAzimuthAngle, spherical.theta)); // restrict phi to be between desired limits

      spherical.phi = Math.max(scope.minPolarAngle, Math.min(scope.maxPolarAngle, spherical.phi));
      spherical.makeSafe();
      spherical.radius *= scale; // restrict radius to be between desired limits

      spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, spherical.radius)); // move target to panned location

      scope.target.add(panOffset);
      offset.setFromSpherical(spherical); // rotate offset back to "camera-up-vector-is-up" space

      offset.applyQuaternion(quatInverse);
      position.copy(scope.target).add(offset);
      scope.object.lookAt(scope.target);

      if (scope.enableDamping === true) {
        sphericalDelta.theta *= 1 - scope.dampingFactor;
        sphericalDelta.phi *= 1 - scope.dampingFactor;
        panOffset.multiplyScalar(1 - scope.dampingFactor);
      } else {
        sphericalDelta.set(0, 0, 0);
        panOffset.set(0, 0, 0);
      }

      scale = 1; // update condition is:
      // min(camera displacement, camera rotation in radians)^2 > EPS
      // using small-angle approximation cos(x/2) = 1 - x^2 / 8

      if (zoomChanged || lastPosition.distanceToSquared(scope.object.position) > EPS || 8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > EPS) {
        scope.dispatchEvent(changeEvent);
        lastPosition.copy(scope.object.position);
        lastQuaternion.copy(scope.object.quaternion);
        zoomChanged = false;
        return true;
      }

      return false;
    };
  }();

  this.dispose = function () {
    scope.domElement.removeEventListener('contextmenu', onContextMenu, false);
    scope.domElement.removeEventListener('mousedown', onMouseDown, false);
    scope.domElement.removeEventListener('wheel', onMouseWheel, false);
    scope.domElement.removeEventListener('touchstart', onTouchStart, false);
    scope.domElement.removeEventListener('touchend', onTouchEnd, false);
    scope.domElement.removeEventListener('touchmove', onTouchMove, false);
    document.removeEventListener('mousemove', onMouseMove, false);
    document.removeEventListener('mouseup', onMouseUp, false);
    window.removeEventListener('keydown', onKeyDown, false); //scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?
  }; //
  // internals
  //


  var scope = this;
  var changeEvent = {
    type: 'change'
  };
  var startEvent = {
    type: 'start'
  };
  var endEvent = {
    type: 'end'
  };
  var STATE = {
    NONE: -1,
    ROTATE: 0,
    DOLLY: 1,
    PAN: 2,
    TOUCH_ROTATE: 3,
    TOUCH_DOLLY_PAN: 4
  };
  var state = STATE.NONE;
  var EPS = 0.000001; // current position in spherical coordinates

  var spherical = new THREE.Spherical();
  var sphericalDelta = new THREE.Spherical();
  var scale = 1;
  var panOffset = new THREE.Vector3();
  var zoomChanged = false;
  var rotateStart = new THREE.Vector2();
  var rotateEnd = new THREE.Vector2();
  var rotateDelta = new THREE.Vector2();
  var panStart = new THREE.Vector2();
  var panEnd = new THREE.Vector2();
  var panDelta = new THREE.Vector2();
  var dollyStart = new THREE.Vector2();
  var dollyEnd = new THREE.Vector2();
  var dollyDelta = new THREE.Vector2();

  function getAutoRotationAngle() {
    return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;
  }

  function getZoomScale() {
    return Math.pow(0.95, scope.zoomSpeed);
  }

  scope.rotateLeft = function rotateLeft(angle) {
    sphericalDelta.theta -= angle;
  };

  scope.rotateUp = function rotateUp(angle) {
    sphericalDelta.phi -= angle;
  };

  var panLeft = function () {
    var v = new THREE.Vector3();
    return function panLeft(distance, objectMatrix) {
      v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix

      v.multiplyScalar(-distance);
      panOffset.add(v);
    };
  }();

  var panUp = function () {
    var v = new THREE.Vector3();
    return function panUp(distance, objectMatrix) {
      if (scope.screenSpacePanning === true) {
        v.setFromMatrixColumn(objectMatrix, 1);
      } else {
        v.setFromMatrixColumn(objectMatrix, 0);
        v.crossVectors(scope.object.up, v);
      }

      v.multiplyScalar(distance);
      panOffset.add(v);
    };
  }(); // deltaX and deltaY are in pixels; right and down are positive


  var pan = function () {
    var offset = new THREE.Vector3();
    return function pan(deltaX, deltaY) {
      var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

      if (scope.object.isPerspectiveCamera) {
        // perspective
        var position = scope.object.position;
        offset.copy(position).sub(scope.target);
        var targetDistance = offset.length(); // half of the fov is center to top of screen

        targetDistance *= Math.tan(scope.object.fov / 2 * Math.PI / 180.0); // we use only clientHeight here so aspect ratio does not distort speed

        panLeft(2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix);
        panUp(2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix);
      } else if (scope.object.isOrthographicCamera) {
        // orthographic
        panLeft(deltaX * (scope.object.right - scope.object.left) / scope.object.zoom / element.clientWidth, scope.object.matrix);
        panUp(deltaY * (scope.object.top - scope.object.bottom) / scope.object.zoom / element.clientHeight, scope.object.matrix);
      } else {
        // camera neither orthographic nor perspective
        console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
        scope.enablePan = false;
      }
    };
  }();

  function dollyIn(dollyScale) {
    if (scope.object.isPerspectiveCamera) {
      scale /= dollyScale;
    } else if (scope.object.isOrthographicCamera) {
      scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom * dollyScale));
      scope.object.updateProjectionMatrix();
      zoomChanged = true;
    } else {
      console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
      scope.enableZoom = false;
    }
  }

  function dollyOut(dollyScale) {
    if (scope.object.isPerspectiveCamera) {
      scale *= dollyScale;
    } else if (scope.object.isOrthographicCamera) {
      scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom / dollyScale));
      scope.object.updateProjectionMatrix();
      zoomChanged = true;
    } else {
      console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
      scope.enableZoom = false;
    }
  } //
  // event callbacks - update the object state
  //


  function handleMouseDownRotate(event) {
    //console.log( 'handleMouseDownRotate' );
    rotateStart.set(event.clientX, event.clientY);
  }

  function handleMouseDownDolly(event) {
    //console.log( 'handleMouseDownDolly' );
    dollyStart.set(event.clientX, event.clientY);
  }

  function handleMouseDownPan(event) {
    //console.log( 'handleMouseDownPan' );
    panStart.set(event.clientX, event.clientY);
  }

  function handleMouseMoveRotate(event) {
    //console.log( 'handleMouseMoveRotate' );
    rotateEnd.set(event.clientX, event.clientY);
    rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);
    var element = scope.domElement === document ? scope.domElement.body : scope.domElement;
    scope.rotateLeft(2 * Math.PI * rotateDelta.x / element.clientHeight); // yes, height

    scope.rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight);
    rotateStart.copy(rotateEnd);
    scope.update();
  }

  function handleMouseMoveDolly(event) {
    //console.log( 'handleMouseMoveDolly' );
    dollyEnd.set(event.clientX, event.clientY);
    dollyDelta.subVectors(dollyEnd, dollyStart);

    if (dollyDelta.y > 0) {
      dollyIn(getZoomScale());
    } else if (dollyDelta.y < 0) {
      dollyOut(getZoomScale());
    }

    dollyStart.copy(dollyEnd);
    scope.update();
  }

  function handleMouseMovePan(event) {
    //console.log( 'handleMouseMovePan' );
    panEnd.set(event.clientX, event.clientY);
    panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
    pan(panDelta.x, panDelta.y);
    panStart.copy(panEnd);
    scope.update();
  }

  function handleMouseWheel(event) {
    // console.log( 'handleMouseWheel' );
    if (event.deltaY < 0) {
      dollyOut(getZoomScale());
    } else if (event.deltaY > 0) {
      dollyIn(getZoomScale());
    }

    scope.update();
  }

  function handleKeyDown(event) {
    //console.log( 'handleKeyDown' );
    switch (event.keyCode) {
      case scope.keys.UP:
        pan(0, scope.keyPanSpeed);
        scope.update();
        break;

      case scope.keys.BOTTOM:
        pan(0, -scope.keyPanSpeed);
        scope.update();
        break;

      case scope.keys.LEFT:
        pan(scope.keyPanSpeed, 0);
        scope.update();
        break;

      case scope.keys.RIGHT:
        pan(-scope.keyPanSpeed, 0);
        scope.update();
        break;
    }
  }

  function handleTouchStartRotate(event) {
    //console.log( 'handleTouchStartRotate' );
    rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
  }

  function handleTouchStartDollyPan(event) {
    //console.log( 'handleTouchStartDollyPan' );
    if (scope.enableZoom) {
      var dx = event.touches[0].pageX - event.touches[1].pageX;
      var dy = event.touches[0].pageY - event.touches[1].pageY;
      var distance = Math.sqrt(dx * dx + dy * dy);
      dollyStart.set(0, distance);
    }

    if (scope.enablePan) {
      var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
      var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
      panStart.set(x, y);
    }
  }

  function handleTouchMoveRotate(event) {
    //console.log( 'handleTouchMoveRotate' );
    rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
    rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);
    var element = scope.domElement === document ? scope.domElement.body : scope.domElement;
    scope.rotateLeft(2 * Math.PI * rotateDelta.x / element.clientHeight); // yes, height

    scope.rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight);
    rotateStart.copy(rotateEnd);
    scope.update();
  }

  function handleTouchMoveDollyPan(event) {
    //console.log( 'handleTouchMoveDollyPan' );
    if (scope.enableZoom) {
      var dx = event.touches[0].pageX - event.touches[1].pageX;
      var dy = event.touches[0].pageY - event.touches[1].pageY;
      var distance = Math.sqrt(dx * dx + dy * dy);
      dollyEnd.set(0, distance);
      dollyDelta.set(0, Math.pow(dollyEnd.y / dollyStart.y, scope.zoomSpeed));
      dollyIn(dollyDelta.y);
      dollyStart.copy(dollyEnd);
    }

    if (scope.enablePan) {
      var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
      var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
      panEnd.set(x, y);
      panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
      pan(panDelta.x, panDelta.y);
      panStart.copy(panEnd);
    }

    scope.update();
  }

  function handleTouchEnd(event) {
    //console.log( 'handleTouchEnd' );
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().then(function (permissionState) {
        if (permissionState === 'granted') {
          window.addEventListener('devicemotion', function () {});
        }
      }).catch(console.error);
    }
  } //
  // event handlers - FSM: listen for events and reset state
  //


  function onMouseDown(event) {
    if (scope.enabled === false) return;
    event.preventDefault();

    switch (event.button) {
      case scope.mouseButtons.ORBIT:
        if (scope.enableRotate === false) return;
        handleMouseDownRotate(event);
        state = STATE.ROTATE;
        break;

      case scope.mouseButtons.ZOOM:
        if (scope.enableZoom === false) return;
        handleMouseDownDolly(event);
        state = STATE.DOLLY;
        break;

      case scope.mouseButtons.PAN:
        if (scope.enablePan === false) return;
        handleMouseDownPan(event);
        state = STATE.PAN;
        break;
    }

    if (state !== STATE.NONE) {
      document.addEventListener('mousemove', onMouseMove, false);
      document.addEventListener('mouseup', onMouseUp, false);
      scope.dispatchEvent(startEvent);
    }
  }

  function onMouseMove(event) {
    if (scope.enabled === false) return;
    event.preventDefault();

    switch (state) {
      case STATE.ROTATE:
        if (scope.enableRotate === false) return;
        handleMouseMoveRotate(event);
        break;

      case STATE.DOLLY:
        if (scope.enableZoom === false) return;
        handleMouseMoveDolly(event);
        break;

      case STATE.PAN:
        if (scope.enablePan === false) return;
        handleMouseMovePan(event);
        break;
    }
  }

  function onMouseUp(event) {
    if (scope.enabled === false) return;
    document.removeEventListener('mousemove', onMouseMove, false);
    document.removeEventListener('mouseup', onMouseUp, false);
    scope.dispatchEvent(endEvent);
    state = STATE.NONE;
  }

  function onMouseWheel(event) {
    if (scope.enabled === false || scope.enableZoom === false || state !== STATE.NONE && state !== STATE.ROTATE) return;
    event.preventDefault();
    event.stopPropagation();
    scope.dispatchEvent(startEvent);
    handleMouseWheel(event);
    scope.dispatchEvent(endEvent);
  }

  function onKeyDown(event) {
    if (scope.enabled === false || scope.enableKeys === false || scope.enablePan === false) return;
    handleKeyDown(event);
  }

  function onTouchStart(event) {
    if (scope.enabled === false) return;
    event.preventDefault();

    switch (event.touches.length) {
      case 1:
        // one-fingered touch: rotate
        if (scope.enableRotate === false) return;
        handleTouchStartRotate(event);
        state = STATE.TOUCH_ROTATE;
        break;

      case 2:
        // two-fingered touch: dolly-pan
        if (scope.enableZoom === false && scope.enablePan === false) return;
        handleTouchStartDollyPan(event);
        state = STATE.TOUCH_DOLLY_PAN;
        break;

      default:
        state = STATE.NONE;
    }

    if (state !== STATE.NONE) {
      scope.dispatchEvent(startEvent);
    }
  }

  function onTouchMove(event) {
    if (scope.enabled === false) return;
    event.preventDefault();
    event.stopPropagation();

    switch (event.touches.length) {
      case 1:
        // one-fingered touch: rotate
        if (scope.enableRotate === false) return;
        if (state !== STATE.TOUCH_ROTATE) return; // is this needed?

        handleTouchMoveRotate(event);
        break;

      case 2:
        // two-fingered touch: dolly-pan
        if (scope.enableZoom === false && scope.enablePan === false) return;
        if (state !== STATE.TOUCH_DOLLY_PAN) return; // is this needed?

        handleTouchMoveDollyPan(event);
        break;

      default:
        state = STATE.NONE;
    }
  }

  function onTouchEnd(event) {
    if (scope.enabled === false) return;
    handleTouchEnd(event);
    scope.dispatchEvent(endEvent);
    state = STATE.NONE;
  }

  function onContextMenu(event) {
    if (scope.enabled === false) return;
    event.preventDefault();
  } //
  // scope.domElement.addEventListener( 'contextmenu', onContextMenu, false );


  scope.domElement.addEventListener('mousedown', onMouseDown, false);
  scope.domElement.addEventListener('wheel', onMouseWheel, false);
  scope.domElement.addEventListener('touchstart', onTouchStart, false);
  scope.domElement.addEventListener('touchend', onTouchEnd, false);
  scope.domElement.addEventListener('touchmove', onTouchMove, false);
  window.addEventListener('keydown', onKeyDown, false); // force an update at start

  this.update();
};

OrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype);
OrbitControls.prototype.constructor = OrbitControls;
Object.defineProperties(OrbitControls.prototype, {
  center: {
    get: function get() {
      console.warn('THREE.OrbitControls: .center has been renamed to .target');
      return this.target;
    }
  },
  // backward compatibility
  noZoom: {
    get: function get() {
      console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
      return !this.enableZoom;
    },
    set: function set(value) {
      console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
      this.enableZoom = !value;
    }
  },
  noRotate: {
    get: function get() {
      console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
      return !this.enableRotate;
    },
    set: function set(value) {
      console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
      this.enableRotate = !value;
    }
  },
  noPan: {
    get: function get() {
      console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
      return !this.enablePan;
    },
    set: function set(value) {
      console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
      this.enablePan = !value;
    }
  },
  noKeys: {
    get: function get() {
      console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
      return !this.enableKeys;
    },
    set: function set(value) {
      console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
      this.enableKeys = !value;
    }
  },
  staticMoving: {
    get: function get() {
      console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
      return !this.enableDamping;
    },
    set: function set(value) {
      console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
      this.enableDamping = !value;
    }
  },
  dynamicDampingFactor: {
    get: function get() {
      console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
      return this.dampingFactor;
    },
    set: function set(value) {
      console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
      this.dampingFactor = value;
    }
  }
});

/**
 * @author richt / http://richt.me
 * @author WestLangley / http://github.com/WestLangley
 *
 * W3C Device Orientation control (http://w3c.github.io/deviceorientation/spec-source-orientation.html)
 *
 * originally from https://github.com/mrdoob/three.js/blob/r93/examples/js/controls/DeviceOrientationControls.js
 */

var DeviceOrientationControls = function DeviceOrientationControls(object) {
  var scope = this;
  this.object = object;
  this.object.rotation.reorder('YXZ');
  this.enabled = true;
  this.deviceOrientation = {};
  this.screenOrientation = 0;
  this.alphaOffset = 0; // radians

  var onDeviceOrientationChangeEvent = function onDeviceOrientationChangeEvent(event) {
    scope.deviceOrientation = event;
  };

  var onScreenOrientationChangeEvent = function onScreenOrientationChangeEvent() {
    scope.screenOrientation = window.orientation || 0;
  }; // The angles alpha, beta and gamma form a set of intrinsic Tait-Bryan angles of type Z-X'-Y''


  var setObjectQuaternion = function () {
    var zee = new THREE.Vector3(0, 0, 1);
    var euler = new THREE.Euler();
    var q0 = new THREE.Quaternion();
    var q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // - PI/2 around the x-axis

    return function (quaternion, alpha, beta, gamma, orient) {
      euler.set(beta, alpha, -gamma, 'YXZ'); // 'ZXY' for the device, but 'YXZ' for us

      quaternion.setFromEuler(euler); // orient the device

      quaternion.multiply(q1); // camera looks out the back of the device, not the top

      quaternion.multiply(q0.setFromAxisAngle(zee, -orient)); // adjust for screen orientation
    };
  }();

  this.connect = function () {
    onScreenOrientationChangeEvent(); // run once on load

    window.addEventListener('orientationchange', onScreenOrientationChangeEvent, false);
    window.addEventListener('deviceorientation', onDeviceOrientationChangeEvent, false);
    scope.enabled = true;
  };

  this.disconnect = function () {
    window.removeEventListener('orientationchange', onScreenOrientationChangeEvent, false);
    window.removeEventListener('deviceorientation', onDeviceOrientationChangeEvent, false);
    scope.enabled = false;
  };

  this.update = function () {
    if (scope.enabled === false) return;
    var device = scope.deviceOrientation;

    if (device) {
      var alpha = device.alpha ? THREE.Math.degToRad(device.alpha) + scope.alphaOffset : 0; // Z

      var beta = device.beta ? THREE.Math.degToRad(device.beta) : 0; // X'

      var gamma = device.gamma ? THREE.Math.degToRad(device.gamma) : 0; // Y''

      var orient = scope.screenOrientation ? THREE.Math.degToRad(scope.screenOrientation) : 0; // O

      setObjectQuaternion(scope.object.quaternion, alpha, beta, gamma, orient);
    }
  };

  this.dispose = function () {
    scope.disconnect();
  };

  this.connect();
};

/**
 * Convert a quaternion to an angle
 *
 * Taken from https://stackoverflow.com/a/35448946
 * Thanks P. Ellul
 */

function Quat2Angle(x, y, z, w) {
  var test = x * y + z * w; // singularity at north pole

  if (test > 0.499) {
    var _yaw = 2 * Math.atan2(x, w);

    var _pitch = Math.PI / 2;

    var _roll = 0;
    return new THREE.Vector3(_pitch, _roll, _yaw);
  } // singularity at south pole


  if (test < -0.499) {
    var _yaw2 = -2 * Math.atan2(x, w);

    var _pitch2 = -Math.PI / 2;

    var _roll2 = 0;
    return new THREE.Vector3(_pitch2, _roll2, _yaw2);
  }

  var sqx = x * x;
  var sqy = y * y;
  var sqz = z * z;
  var yaw = Math.atan2(2 * y * w - 2 * x * z, 1 - 2 * sqy - 2 * sqz);
  var pitch = Math.asin(2 * test);
  var roll = Math.atan2(2 * x * w - 2 * y * z, 1 - 2 * sqx - 2 * sqz);
  return new THREE.Vector3(pitch, roll, yaw);
}

var OrbitOrientationControls = /*#__PURE__*/function () {
  function OrbitOrientationControls(options) {
    this.object = options.camera;
    this.domElement = options.canvas;
    this.orbit = new OrbitControls(this.object, this.domElement);
    this.speed = 0.5;
    this.orbit.target.set(0, 0, -1);
    this.orbit.enableZoom = false;
    this.orbit.enablePan = false;
    this.orbit.rotateSpeed = -this.speed; // if orientation is supported

    if (options.orientation) {
      this.orientation = new DeviceOrientationControls(this.object);
    } // if projection is not full view
    // limit the rotation angle in order to not display back half view


    if (options.halfView) {
      this.orbit.minAzimuthAngle = -Math.PI / 4;
      this.orbit.maxAzimuthAngle = Math.PI / 4;
    }
  }

  var _proto = OrbitOrientationControls.prototype;

  _proto.update = function update() {
    // orientation updates the camera using quaternions and
    // orbit updates the camera using angles. They are incompatible
    // and one update overrides the other. So before
    // orbit overrides orientation we convert our quaternion changes to
    // an angle change. Then save the angle into orbit so that
    // it will take those into account when it updates the camera and overrides
    // our changes
    if (this.orientation) {
      this.orientation.update();
      var quat = this.orientation.object.quaternion;
      var currentAngle = Quat2Angle(quat.x, quat.y, quat.z, quat.w); // we also have to store the last angle since quaternions are b

      if (typeof this.lastAngle_ === 'undefined') {
        this.lastAngle_ = currentAngle;
      }

      this.orbit.rotateLeft((this.lastAngle_.z - currentAngle.z) * (1 + this.speed));
      this.orbit.rotateUp((this.lastAngle_.y - currentAngle.y) * (1 + this.speed));
      this.lastAngle_ = currentAngle;
    }

    this.orbit.update();
  };

  _proto.dispose = function dispose() {
    this.orbit.dispose();

    if (this.orientation) {
      this.orientation.dispose();
    }
  };

  return OrbitOrientationControls;
}();

var corsSupport = function () {
  var video = document$1.createElement('video');
  video.crossOrigin = 'anonymous';
  return video.hasAttribute('crossorigin');
}();
var validProjections = ['360', '360_LR', '360_TB', '360_CUBE', 'EAC', 'EAC_LR', 'NONE', 'AUTO', 'Sphere', 'Cube', 'equirectangular', '180', '180_LR', '180_MONO'];
var getInternalProjectionName = function getInternalProjectionName(projection) {
  if (!projection) {
    return;
  }

  projection = projection.toString().trim();

  if (/sphere/i.test(projection)) {
    return '360';
  }

  if (/cube/i.test(projection)) {
    return '360_CUBE';
  }

  if (/equirectangular/i.test(projection)) {
    return '360';
  }

  for (var i = 0; i < validProjections.length; i++) {
    if (new RegExp('^' + validProjections[i] + '$', 'i').test(projection)) {
      return validProjections[i];
    }
  }
};

/**
 * This class reacts to interactions with the canvas and
 * triggers appropriate functionality on the player. Right now
 * it does two things:
 *
 * 1. A `mousedown`/`touchstart` followed by `touchend`/`mouseup` without any
 *    `touchmove` or `mousemove` toggles play/pause on the player
 * 2. Only moving on/clicking the control bar or toggling play/pause should
 *    show the control bar. Moving around the scene in the canvas should not.
 */

var CanvasPlayerControls = /*#__PURE__*/function (_videojs$EventTarget) {
  _inheritsLoose(CanvasPlayerControls, _videojs$EventTarget);

  function CanvasPlayerControls(player, canvas, options) {
    var _this;

    _this = _videojs$EventTarget.call(this) || this;
    _this.player = player;
    _this.canvas = canvas;
    _this.options = options;
    _this.onMoveEnd = videojs.bind(_assertThisInitialized(_this), _this.onMoveEnd);
    _this.onMoveStart = videojs.bind(_assertThisInitialized(_this), _this.onMoveStart);
    _this.onMove = videojs.bind(_assertThisInitialized(_this), _this.onMove);
    _this.onControlBarMove = videojs.bind(_assertThisInitialized(_this), _this.onControlBarMove);

    _this.player.controlBar.on(['mousedown', 'mousemove', 'mouseup', 'touchstart', 'touchmove', 'touchend'], _this.onControlBarMove); // we have to override these here because
    // video.js listens for user activity on the video element
    // and makes the user active when the mouse moves.
    // We don't want that for 3d videos


    _this.oldReportUserActivity = _this.player.reportUserActivity;

    _this.player.reportUserActivity = function () {}; // canvas movements


    _this.canvas.addEventListener('mousedown', _this.onMoveStart);

    _this.canvas.addEventListener('touchstart', _this.onMoveStart);

    _this.canvas.addEventListener('mousemove', _this.onMove);

    _this.canvas.addEventListener('touchmove', _this.onMove);

    _this.canvas.addEventListener('mouseup', _this.onMoveEnd);

    _this.canvas.addEventListener('touchend', _this.onMoveEnd);

    _this.shouldTogglePlay = false;
    return _this;
  }

  var _proto = CanvasPlayerControls.prototype;

  _proto.togglePlay = function togglePlay() {
    if (this.player.paused()) {
      this.player.play();
    } else {
      this.player.pause();
    }
  };

  _proto.onMoveStart = function onMoveStart(e) {
    // if the player does not have a controlbar or
    // the move was a mouse click but not left click do not
    // toggle play.
    if (this.options.disableTogglePlay || !this.player.controls() || e.type === 'mousedown' && !videojs.dom.isSingleLeftClick(e)) {
      this.shouldTogglePlay = false;
      return;
    }

    this.shouldTogglePlay = true;
    this.touchMoveCount_ = 0;
  };

  _proto.onMoveEnd = function onMoveEnd(e) {
    // We want to have the same behavior in VR360 Player and standard player.
    // in touchend we want to know if was a touch click, for a click we show the bar,
    // otherwise continue with the mouse logic.
    //
    // Maximum movement allowed during a touch event to still be considered a tap
    // Other popular libs use anywhere from 2 (hammer.js) to 15,
    // so 10 seems like a nice, round number.
    if (e.type === 'touchend' && this.touchMoveCount_ < 10) {
      if (this.player.userActive() === false) {
        this.player.userActive(true);
        return;
      }

      this.player.userActive(false);
      return;
    }

    if (!this.shouldTogglePlay) {
      return;
    } // We want the same behavior in Desktop for VR360  and standard player


    if (e.type === 'mouseup') {
      this.togglePlay();
    }
  };

  _proto.onMove = function onMove(e) {
    // Increase touchMoveCount_ since Android detects 1 - 6 touches when user click normally
    this.touchMoveCount_++;
    this.shouldTogglePlay = false;
  };

  _proto.onControlBarMove = function onControlBarMove(e) {
    this.player.userActive(true);
  };

  _proto.dispose = function dispose() {
    this.canvas.removeEventListener('mousedown', this.onMoveStart);
    this.canvas.removeEventListener('touchstart', this.onMoveStart);
    this.canvas.removeEventListener('mousemove', this.onMove);
    this.canvas.removeEventListener('touchmove', this.onMove);
    this.canvas.removeEventListener('mouseup', this.onMoveEnd);
    this.canvas.removeEventListener('touchend', this.onMoveEnd);
    this.player.controlBar.off(['mousedown', 'mousemove', 'mouseup', 'touchstart', 'touchmove', 'touchend'], this.onControlBarMove);
    this.player.reportUserActivity = this.oldReportUserActivity;
  };

  return CanvasPlayerControls;
}(videojs.EventTarget);

/**
 * This class manages ambisonic decoding and binaural rendering via Omnitone library.
 */

var OmnitoneController = /*#__PURE__*/function (_videojs$EventTarget) {
  _inheritsLoose(OmnitoneController, _videojs$EventTarget);

  /**
   * Omnitone controller class.
   *
   * @class
   * @param {AudioContext} audioContext - associated AudioContext.
   * @param {Omnitone library} omnitone - Omnitone library element.
   * @param {HTMLVideoElement} video - vidoe tag element.
   * @param {Object} options - omnitone options.
   */
  function OmnitoneController(audioContext, omnitone, video, options) {
    var _this;

    _this = _videojs$EventTarget.call(this) || this;
    var settings = videojs.mergeOptions({
      // Safari uses the different AAC decoder than FFMPEG. The channel order is
      // The default 4ch AAC channel layout for FFMPEG AAC channel ordering.
      channelMap: videojs.browser.IS_SAFARI ? [2, 0, 1, 3] : [0, 1, 2, 3],
      ambisonicOrder: 1
    }, options);
    _this.videoElementSource = audioContext.createMediaElementSource(video);
    _this.foaRenderer = omnitone.createFOARenderer(audioContext, settings);

    _this.foaRenderer.initialize().then(function () {
      if (audioContext.state === 'suspended') {
        _this.trigger({
          type: 'audiocontext-suspended'
        });
      }

      _this.videoElementSource.connect(_this.foaRenderer.input);

      _this.foaRenderer.output.connect(audioContext.destination);

      _this.initialized = true;

      _this.trigger({
        type: 'omnitone-ready'
      });
    }, function (error) {
      videojs.log.warn("videojs-vr: Omnitone initializes failed with the following error: " + error + ")");
    });

    return _this;
  }
  /**
   * Updates the rotation of the Omnitone decoder based on three.js camera matrix.
   *
   * @param {Camera} camera Three.js camera object
   */


  var _proto = OmnitoneController.prototype;

  _proto.update = function update(camera) {
    if (!this.initialized) {
      return;
    }

    this.foaRenderer.setRotationMatrixFromCamera(camera.matrix);
  }
  /**
   * Destroys the controller and does any necessary cleanup.
   */
  ;

  _proto.dispose = function dispose() {
    this.initialized = false;
    this.foaRenderer.setRenderingMode('bypass');
    this.foaRenderer = null;
  };

  return OmnitoneController;
}(videojs.EventTarget);

var BigPlayButton = videojs.getComponent('BigPlayButton');

var BigVrPlayButton = /*#__PURE__*/function (_BigPlayButton) {
  _inheritsLoose(BigVrPlayButton, _BigPlayButton);

  function BigVrPlayButton() {
    return _BigPlayButton.apply(this, arguments) || this;
  }

  var _proto = BigVrPlayButton.prototype;

  _proto.buildCSSClass = function buildCSSClass() {
    return "vjs-big-vr-play-button " + _BigPlayButton.prototype.buildCSSClass.call(this);
  };

  return BigVrPlayButton;
}(BigPlayButton);

videojs.registerComponent('BigVrPlayButton', BigVrPlayButton);

function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var defaults = {
  debug: false,
  omnitone: false,
  forceCardboard: false,
  omnitoneOptions: {},
  projection: 'AUTO',
  sphereDetail: 32,
  disableTogglePlay: false
};
var errors = {
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
var Plugin = videojs.getPlugin('plugin');
var Component = videojs.getComponent('Component');

var VR = /*#__PURE__*/function (_Plugin) {
  _inheritsLoose(VR, _Plugin);

  function VR(player, options) {
    var _this;

    var settings = videojs.mergeOptions(defaults, options);
    _this = _Plugin.call(this, player, settings) || this;
    _this.options_ = settings;
    _this.player_ = player;
    _this.bigPlayButtonIndex_ = player.children().indexOf(player.getChild('BigPlayButton')) || 0; // custom videojs-errors integration boolean

    _this.videojsErrorsSupport_ = !!videojs.errors;

    if (_this.videojsErrorsSupport_) {
      player.errors({
        errors: errors
      });
    } // IE 11 does not support enough webgl to be supported
    // older safari does not support cors, so it wont work


    if (videojs.browser.IE_VERSION || !corsSupport) {
      // if a player triggers error before 'loadstart' is fired
      // video.js will reset the error overlay
      _this.player_.on('loadstart', function () {
        _this.triggerError_({
          code: 'web-vr-not-supported',
          dismiss: false
        });
      });

      return _assertThisInitialized(_this);
    }

    _this.polyfill_ = new WebVRPolyfill({
      // do not show rotate instructions
      ROTATE_INSTRUCTIONS_DISABLED: true
    });
    _this.polyfill_ = new WebVRPolyfill();
    _this.handleVrDisplayActivate_ = videojs.bind(_assertThisInitialized(_this), _this.handleVrDisplayActivate_);
    _this.handleVrDisplayDeactivate_ = videojs.bind(_assertThisInitialized(_this), _this.handleVrDisplayDeactivate_);
    _this.handleResize_ = videojs.bind(_assertThisInitialized(_this), _this.handleResize_);
    _this.animate_ = videojs.bind(_assertThisInitialized(_this), _this.animate_);

    _this.setProjection(_this.options_.projection); // any time the video element is recycled for ads
    // we have to reset the vr state and re-init after ad


    _this.on(player, 'adstart', function () {
      return player.setTimeout(function () {
        // if the video element was recycled for this ad
        if (!player.ads || !player.ads.videoElementRecycled()) {
          _this.log('video element not recycled for this ad, no need to reset');

          return;
        }

        _this.log('video element recycled for this ad, reseting');

        _this.reset();

        _this.one(player, 'playing', _this.init);
      });
    }, 1);

    _this.on(player, 'loadedmetadata', _this.init);

    return _this;
  }

  var _proto = VR.prototype;

  _proto.changeProjection_ = function changeProjection_(projection) {
    var _this2 = this;

    projection = getInternalProjectionName(projection); // don't change to an invalid projection

    if (!projection) {
      projection = 'NONE';
    }

    var position = {
      x: 0,
      y: 0,
      z: 0
    };

    if (this.scene) {
      this.scene.remove(this.movieScreen);
    }

    if (projection === 'AUTO') {
      // mediainfo cannot be set to auto or we would infinite loop here
      // each source should know whatever they are 360 or not, if using AUTO
      if (this.player_.mediainfo && this.player_.mediainfo.projection && this.player_.mediainfo.projection !== 'AUTO') {
        var autoProjection = getInternalProjectionName(this.player_.mediainfo.projection);
        return this.changeProjection_(autoProjection);
      }

      return this.changeProjection_('NONE');
    } else if (projection === '360') {
      this.movieGeometry = new THREE.SphereBufferGeometry(256, this.options_.sphereDetail, this.options_.sphereDetail);
      this.movieMaterial = new THREE.MeshBasicMaterial({
        map: this.videoTexture,
        overdraw: true,
        side: THREE.BackSide
      });
      this.movieScreen = new THREE.Mesh(this.movieGeometry, this.movieMaterial);
      this.movieScreen.position.set(position.x, position.y, position.z);
      this.movieScreen.scale.x = -1;
      this.movieScreen.quaternion.setFromAxisAngle({
        x: 0,
        y: 1,
        z: 0
      }, -Math.PI / 2);
      this.scene.add(this.movieScreen);
    } else if (projection === '360_LR' || projection === '360_TB') {
      // Left eye view
      var geometry = new THREE.SphereGeometry(256, this.options_.sphereDetail, this.options_.sphereDetail);
      var uvs = geometry.faceVertexUvs[0];

      for (var i = 0; i < uvs.length; i++) {
        for (var j = 0; j < 3; j++) {
          if (projection === '360_LR') {
            uvs[i][j].x *= 0.5;
          } else {
            uvs[i][j].y *= 0.5;
            uvs[i][j].y += 0.5;
          }
        }
      }

      this.movieGeometry = new THREE.BufferGeometry().fromGeometry(geometry);
      this.movieMaterial = new THREE.MeshBasicMaterial({
        map: this.videoTexture,
        overdraw: true,
        side: THREE.BackSide
      });
      this.movieScreen = new THREE.Mesh(this.movieGeometry, this.movieMaterial);
      this.movieScreen.scale.x = -1;
      this.movieScreen.quaternion.setFromAxisAngle({
        x: 0,
        y: 1,
        z: 0
      }, -Math.PI / 2); // display in left eye only

      this.movieScreen.layers.set(1);
      this.scene.add(this.movieScreen); // Right eye view

      geometry = new THREE.SphereGeometry(256, this.options_.sphereDetail, this.options_.sphereDetail);
      uvs = geometry.faceVertexUvs[0];

      for (var _i = 0; _i < uvs.length; _i++) {
        for (var _j = 0; _j < 3; _j++) {
          if (projection === '360_LR') {
            uvs[_i][_j].x *= 0.5;
            uvs[_i][_j].x += 0.5;
          } else {
            uvs[_i][_j].y *= 0.5;
          }
        }
      }

      this.movieGeometry = new THREE.BufferGeometry().fromGeometry(geometry);
      this.movieMaterial = new THREE.MeshBasicMaterial({
        map: this.videoTexture,
        overdraw: true,
        side: THREE.BackSide
      });
      this.movieScreen = new THREE.Mesh(this.movieGeometry, this.movieMaterial);
      this.movieScreen.scale.x = -1;
      this.movieScreen.quaternion.setFromAxisAngle({
        x: 0,
        y: 1,
        z: 0
      }, -Math.PI / 2); // display in right eye only

      this.movieScreen.layers.set(2);
      this.scene.add(this.movieScreen);
    } else if (projection === '360_CUBE') {
      this.movieGeometry = new THREE.BoxGeometry(256, 256, 256);
      this.movieMaterial = new THREE.MeshBasicMaterial({
        map: this.videoTexture,
        overdraw: true,
        side: THREE.BackSide
      });
      var left = [new THREE.Vector2(0, 0.5), new THREE.Vector2(0.333, 0.5), new THREE.Vector2(0.333, 1), new THREE.Vector2(0, 1)];
      var right = [new THREE.Vector2(0.333, 0.5), new THREE.Vector2(0.666, 0.5), new THREE.Vector2(0.666, 1), new THREE.Vector2(0.333, 1)];
      var top = [new THREE.Vector2(0.666, 0.5), new THREE.Vector2(1, 0.5), new THREE.Vector2(1, 1), new THREE.Vector2(0.666, 1)];
      var bottom = [new THREE.Vector2(0, 0), new THREE.Vector2(0.333, 0), new THREE.Vector2(0.333, 0.5), new THREE.Vector2(0, 0.5)];
      var front = [new THREE.Vector2(0.333, 0), new THREE.Vector2(0.666, 0), new THREE.Vector2(0.666, 0.5), new THREE.Vector2(0.333, 0.5)];
      var back = [new THREE.Vector2(0.666, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1, 0.5), new THREE.Vector2(0.666, 0.5)];
      this.movieGeometry.faceVertexUvs[0] = [];
      this.movieGeometry.faceVertexUvs[0][0] = [right[2], right[1], right[3]];
      this.movieGeometry.faceVertexUvs[0][1] = [right[1], right[0], right[3]];
      this.movieGeometry.faceVertexUvs[0][2] = [left[2], left[1], left[3]];
      this.movieGeometry.faceVertexUvs[0][3] = [left[1], left[0], left[3]];
      this.movieGeometry.faceVertexUvs[0][4] = [top[2], top[1], top[3]];
      this.movieGeometry.faceVertexUvs[0][5] = [top[1], top[0], top[3]];
      this.movieGeometry.faceVertexUvs[0][6] = [bottom[2], bottom[1], bottom[3]];
      this.movieGeometry.faceVertexUvs[0][7] = [bottom[1], bottom[0], bottom[3]];
      this.movieGeometry.faceVertexUvs[0][8] = [front[2], front[1], front[3]];
      this.movieGeometry.faceVertexUvs[0][9] = [front[1], front[0], front[3]];
      this.movieGeometry.faceVertexUvs[0][10] = [back[2], back[1], back[3]];
      this.movieGeometry.faceVertexUvs[0][11] = [back[1], back[0], back[3]];
      this.movieScreen = new THREE.Mesh(this.movieGeometry, this.movieMaterial);
      this.movieScreen.position.set(position.x, position.y, position.z);
      this.movieScreen.rotation.y = -Math.PI;
      this.scene.add(this.movieScreen);
    } else if (projection === '180' || projection === '180_LR' || projection === '180_MONO') {
      var _geometry = new THREE.SphereGeometry(256, this.options_.sphereDetail, this.options_.sphereDetail, Math.PI, Math.PI); // Left eye view


      _geometry.scale(-1, 1, 1);

      var _uvs = _geometry.faceVertexUvs[0];

      if (projection !== '180_MONO') {
        for (var _i2 = 0; _i2 < _uvs.length; _i2++) {
          for (var _j2 = 0; _j2 < 3; _j2++) {
            _uvs[_i2][_j2].x *= 0.5;
          }
        }
      }

      this.movieGeometry = new THREE.BufferGeometry().fromGeometry(_geometry);
      this.movieMaterial = new THREE.MeshBasicMaterial({
        map: this.videoTexture,
        overdraw: true
      });
      this.movieScreen = new THREE.Mesh(this.movieGeometry, this.movieMaterial); // display in left eye only

      this.movieScreen.layers.set(1);
      this.scene.add(this.movieScreen); // Right eye view

      _geometry = new THREE.SphereGeometry(256, this.options_.sphereDetail, this.options_.sphereDetail, Math.PI, Math.PI);

      _geometry.scale(-1, 1, 1);

      _uvs = _geometry.faceVertexUvs[0];

      for (var _i3 = 0; _i3 < _uvs.length; _i3++) {
        for (var _j3 = 0; _j3 < 3; _j3++) {
          _uvs[_i3][_j3].x *= 0.5;
          _uvs[_i3][_j3].x += 0.5;
        }
      }

      this.movieGeometry = new THREE.BufferGeometry().fromGeometry(_geometry);
      this.movieMaterial = new THREE.MeshBasicMaterial({
        map: this.videoTexture,
        overdraw: true
      });
      this.movieScreen = new THREE.Mesh(this.movieGeometry, this.movieMaterial); // display in right eye only

      this.movieScreen.layers.set(2);
      this.scene.add(this.movieScreen);
    } else if (projection === 'EAC' || projection === 'EAC_LR') {
      var makeScreen = function makeScreen(mapMatrix, scaleMatrix) {
        // "Continuity correction?": because of discontinuous faces and aliasing,
        // we truncate the 2-pixel-wide strips on all discontinuous edges,
        var contCorrect = 2;
        _this2.movieGeometry = new THREE.BoxGeometry(256, 256, 256);
        _this2.movieMaterial = new THREE.ShaderMaterial({
          overdraw: true,
          side: THREE.BackSide,
          uniforms: {
            mapped: {
              value: _this2.videoTexture
            },
            mapMatrix: {
              value: mapMatrix
            },
            contCorrect: {
              value: contCorrect
            },
            faceWH: {
              value: new THREE.Vector2(1 / 3, 1 / 2).applyMatrix3(scaleMatrix)
            },
            vidWH: {
              value: new THREE.Vector2(_this2.videoTexture.image.videoWidth, _this2.videoTexture.image.videoHeight).applyMatrix3(scaleMatrix)
            }
          },
          vertexShader: "\nvarying vec2 vUv;\nuniform mat3 mapMatrix;\n\nvoid main() {\n  vUv = (mapMatrix * vec3(uv, 1.)).xy;\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);\n}",
          fragmentShader: "\nvarying vec2 vUv;\nuniform sampler2D mapped;\nuniform vec2 faceWH;\nuniform vec2 vidWH;\nuniform float contCorrect;\n\nconst float PI = 3.1415926535897932384626433832795;\n\nvoid main() {\n  vec2 corner = vUv - mod(vUv, faceWH) + vec2(0, contCorrect / vidWH.y);\n\n  vec2 faceWHadj = faceWH - vec2(0, contCorrect * 2. / vidWH.y);\n\n  vec2 p = (vUv - corner) / faceWHadj - .5;\n  vec2 q = 2. / PI * atan(2. * p) + .5;\n\n  vec2 eUv = corner + q * faceWHadj;\n\n  gl_FragColor = texture2D(mapped, eUv);\n}"
        });
        var right = [new THREE.Vector2(0, 1 / 2), new THREE.Vector2(1 / 3, 1 / 2), new THREE.Vector2(1 / 3, 1), new THREE.Vector2(0, 1)];
        var front = [new THREE.Vector2(1 / 3, 1 / 2), new THREE.Vector2(2 / 3, 1 / 2), new THREE.Vector2(2 / 3, 1), new THREE.Vector2(1 / 3, 1)];
        var left = [new THREE.Vector2(2 / 3, 1 / 2), new THREE.Vector2(1, 1 / 2), new THREE.Vector2(1, 1), new THREE.Vector2(2 / 3, 1)];
        var bottom = [new THREE.Vector2(1 / 3, 0), new THREE.Vector2(1 / 3, 1 / 2), new THREE.Vector2(0, 1 / 2), new THREE.Vector2(0, 0)];
        var back = [new THREE.Vector2(1 / 3, 1 / 2), new THREE.Vector2(1 / 3, 0), new THREE.Vector2(2 / 3, 0), new THREE.Vector2(2 / 3, 1 / 2)];
        var top = [new THREE.Vector2(1, 0), new THREE.Vector2(1, 1 / 2), new THREE.Vector2(2 / 3, 1 / 2), new THREE.Vector2(2 / 3, 0)];

        for (var _i4 = 0, _arr = [right, front, left, bottom, back, top]; _i4 < _arr.length; _i4++) {
          var face = _arr[_i4];
          var height = _this2.videoTexture.image.videoHeight;
          var lowY = 1;
          var highY = 0;

          for (var _iterator = _createForOfIteratorHelperLoose(face), _step; !(_step = _iterator()).done;) {
            var vector = _step.value;

            if (vector.y < lowY) {
              lowY = vector.y;
            }

            if (vector.y > highY) {
              highY = vector.y;
            }
          }

          for (var _iterator2 = _createForOfIteratorHelperLoose(face), _step2; !(_step2 = _iterator2()).done;) {
            var _vector = _step2.value;

            if (Math.abs(_vector.y - lowY) < Number.EPSILON) {
              _vector.y += contCorrect / height;
            }

            if (Math.abs(_vector.y - highY) < Number.EPSILON) {
              _vector.y -= contCorrect / height;
            }

            _vector.x = _vector.x / height * (height - contCorrect * 2) + contCorrect / height;
          }
        }

        _this2.movieGeometry.faceVertexUvs[0] = [];
        _this2.movieGeometry.faceVertexUvs[0][0] = [right[2], right[1], right[3]];
        _this2.movieGeometry.faceVertexUvs[0][1] = [right[1], right[0], right[3]];
        _this2.movieGeometry.faceVertexUvs[0][2] = [left[2], left[1], left[3]];
        _this2.movieGeometry.faceVertexUvs[0][3] = [left[1], left[0], left[3]];
        _this2.movieGeometry.faceVertexUvs[0][4] = [top[2], top[1], top[3]];
        _this2.movieGeometry.faceVertexUvs[0][5] = [top[1], top[0], top[3]];
        _this2.movieGeometry.faceVertexUvs[0][6] = [bottom[2], bottom[1], bottom[3]];
        _this2.movieGeometry.faceVertexUvs[0][7] = [bottom[1], bottom[0], bottom[3]];
        _this2.movieGeometry.faceVertexUvs[0][8] = [front[2], front[1], front[3]];
        _this2.movieGeometry.faceVertexUvs[0][9] = [front[1], front[0], front[3]];
        _this2.movieGeometry.faceVertexUvs[0][10] = [back[2], back[1], back[3]];
        _this2.movieGeometry.faceVertexUvs[0][11] = [back[1], back[0], back[3]];
        _this2.movieScreen = new THREE.Mesh(_this2.movieGeometry, _this2.movieMaterial);

        _this2.movieScreen.position.set(position.x, position.y, position.z);

        _this2.movieScreen.rotation.y = -Math.PI;
        return _this2.movieScreen;
      };

      if (projection === 'EAC') {
        this.scene.add(makeScreen(new THREE.Matrix3(), new THREE.Matrix3()));
      } else {
        var scaleMatrix = new THREE.Matrix3().set(0, 0.5, 0, 1, 0, 0, 0, 0, 1);
        makeScreen(new THREE.Matrix3().set(0, -0.5, 0.5, 1, 0, 0, 0, 0, 1), scaleMatrix); // display in left eye only

        this.movieScreen.layers.set(1);
        this.scene.add(this.movieScreen);
        makeScreen(new THREE.Matrix3().set(0, -0.5, 1, 1, 0, 0, 0, 0, 1), scaleMatrix); // display in right eye only

        this.movieScreen.layers.set(2);
        this.scene.add(this.movieScreen);
      }
    }

    this.currentProjection_ = projection;
  };

  _proto.triggerError_ = function triggerError_(errorObj) {
    // if we have videojs-errors use it
    if (this.videojsErrorsSupport_) {
      this.player_.error(errorObj); // if we don't have videojs-errors just use a normal player error
    } else {
      // strip any html content from the error message
      // as it is not supported outside of videojs-errors
      var div = document$1.createElement('div');
      div.innerHTML = errors[errorObj.code].message;
      var message = div.textContent || div.innerText || '';
      this.player_.error({
        code: errorObj.code,
        message: message
      });
    }
  };

  _proto.log = function log() {
    if (!this.options_.debug) {
      return;
    }

    for (var _len = arguments.length, msgs = new Array(_len), _key = 0; _key < _len; _key++) {
      msgs[_key] = arguments[_key];
    }

    msgs.forEach(function (msg) {
      videojs.log('VR: ', msg);
    });
  };

  _proto.handleVrDisplayActivate_ = function handleVrDisplayActivate_() {
    var _this3 = this;

    if (!this.vrDisplay) {
      return;
    }

    this.vrDisplay.requestPresent([{
      source: this.renderedCanvas
    }]).then(function () {
      if (!_this3.vrDisplay.cardboardUI_ || !videojs.browser.IS_IOS) {
        return;
      } // webvr-polyfill/cardboard ui only watches for click events
      // to tell that the back arrow button is pressed during cardboard vr.
      // but somewhere along the line these events are silenced with preventDefault
      // but only on iOS, so we translate them ourselves here


      var touches = [];

      var iosCardboardTouchStart_ = function iosCardboardTouchStart_(e) {
        for (var i = 0; i < e.touches.length; i++) {
          touches.push(e.touches[i]);
        }
      };

      var iosCardboardTouchEnd_ = function iosCardboardTouchEnd_(e) {
        if (!touches.length) {
          return;
        }

        touches.forEach(function (t) {
          var simulatedClick = new window$1.MouseEvent('click', {
            screenX: t.screenX,
            screenY: t.screenY,
            clientX: t.clientX,
            clientY: t.clientY
          });

          _this3.renderedCanvas.dispatchEvent(simulatedClick);
        });
        touches = [];
      };

      _this3.renderedCanvas.addEventListener('touchstart', iosCardboardTouchStart_);

      _this3.renderedCanvas.addEventListener('touchend', iosCardboardTouchEnd_);

      _this3.iosRevertTouchToClick_ = function () {
        _this3.renderedCanvas.removeEventListener('touchstart', iosCardboardTouchStart_);

        _this3.renderedCanvas.removeEventListener('touchend', iosCardboardTouchEnd_);

        _this3.iosRevertTouchToClick_ = null;
      };
    });
  };

  _proto.handleVrDisplayDeactivate_ = function handleVrDisplayDeactivate_() {
    if (!this.vrDisplay || !this.vrDisplay.isPresenting) {
      return;
    }

    if (this.iosRevertTouchToClick_) {
      this.iosRevertTouchToClick_();
    }

    this.vrDisplay.exitPresent();
  };

  _proto.requestAnimationFrame = function requestAnimationFrame(fn) {
    if (this.vrDisplay) {
      return this.vrDisplay.requestAnimationFrame(fn);
    }

    return this.player_.requestAnimationFrame(fn);
  };

  _proto.cancelAnimationFrame = function cancelAnimationFrame(id) {
    if (this.vrDisplay) {
      return this.vrDisplay.cancelAnimationFrame(id);
    }

    return this.player_.cancelAnimationFrame(id);
  };

  _proto.togglePlay_ = function togglePlay_() {
    if (this.player_.paused()) {
      this.player_.play();
    } else {
      this.player_.pause();
    }
  };

  _proto.animate_ = function animate_() {
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

    this.effect.render(this.scene, this.camera);

    if (window$1.navigator.getGamepads) {
      // Grab all gamepads
      var gamepads = window$1.navigator.getGamepads();

      for (var i = 0; i < gamepads.length; ++i) {
        var gamepad = gamepads[i]; // Make sure gamepad is defined
        // Only take input if state has changed since we checked last

        if (!gamepad || !gamepad.timestamp || gamepad.timestamp === this.prevTimestamps_[i]) {
          continue;
        }

        for (var j = 0; j < gamepad.buttons.length; ++j) {
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
  };

  _proto.handleResize_ = function handleResize_() {
    var width = this.player_.currentWidth();
    var height = this.player_.currentHeight();
    this.effect.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  _proto.setProjection = function setProjection(projection) {
    if (!getInternalProjectionName(projection)) {
      videojs.log.error('videojs-vr: please pass a valid projection ' + validProjections.join(', '));
      return;
    }

    this.currentProjection_ = projection;
    this.defaultProjection_ = projection;
  };

  _proto.init = function init() {
    var _this4 = this;

    this.reset();
    this.camera = new THREE.PerspectiveCamera(75, this.player_.currentWidth() / this.player_.currentHeight(), 1, 1000); // Store vector representing the direction in which the camera is looking, in world space.

    this.cameraVector = new THREE.Vector3();

    if (this.currentProjection_ === '360_LR' || this.currentProjection_ === '360_TB' || this.currentProjection_ === '180' || this.currentProjection_ === '180_LR' || this.currentProjection_ === '180_MONO' || this.currentProjection_ === 'EAC_LR') {
      // Render left eye when not in VR mode
      this.camera.layers.enable(1);
    }

    this.scene = new THREE.Scene();
    this.videoTexture = new THREE.VideoTexture(this.getVideoEl_()); // shared regardless of wether VideoTexture is used or
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
    this.player_.bigPlayButton = this.player_.getChild('BigVrPlayButton'); // mobile devices, or cardboard forced to on

    if (this.options_.forceCardboard || videojs.browser.IS_ANDROID || videojs.browser.IS_IOS) ; // if ios remove full screen toggle


    if (videojs.browser.IS_IOS && this.player_.controlBar && this.player_.controlBar.fullscreenToggle) {
      this.player_.controlBar.fullscreenToggle.hide();
    }

    this.camera.position.set(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({
      devicePixelRatio: window$1.devicePixelRatio,
      alpha: false,
      clearColor: 0xffffff,
      antialias: true
    });
    var options = {
      color: 'black',
      background: 'white',
      corners: 'square'
    };
    var enterVR = new webvrui.EnterVRButton(this.renderer.domElement, options);
    this.player_.el().appendChild(enterVR.domElement);
    enterVR.on('show', function () {});
    var webglContext = this.renderer.getContext('webgl');
    var oldTexImage2D = webglContext.texImage2D;
    /* this is a workaround since threejs uses try catch */

    webglContext.texImage2D = function () {
      try {
        for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }

        return oldTexImage2D.apply(webglContext, args);
      } catch (e) {
        _this4.reset();

        _this4.player_.pause();

        _this4.triggerError_({
          code: 'web-vr-hls-cors-not-supported',
          dismiss: false
        });

        throw new Error(e);
      }
    };

    this.renderer.setSize(this.player_.currentWidth(), this.player_.currentHeight(), false);
    this.effect = new VREffect(this.renderer);
    this.effect.setSize(this.player_.currentWidth(), this.player_.currentHeight(), false);
    this.vrDisplay = null; // Previous timestamps for gamepad updates

    this.prevTimestamps_ = [];
    this.renderedCanvas = this.renderer.domElement;
    this.renderedCanvas.setAttribute('style', 'width: 100%; height: 100%; position: absolute; top:0;');
    var videoElStyle = this.getVideoEl_().style;
    this.player_.el().insertBefore(this.renderedCanvas, this.player_.el().firstChild);
    videoElStyle.zIndex = '-1';
    videoElStyle.opacity = '0';

    if (window$1.navigator.getVRDisplays) {
      this.log('is supported, getting vr displays');
      window$1.navigator.getVRDisplays().then(function (displays) {
        if (displays.length > 0) {
          _this4.log('Displays found', displays);

          _this4.vrDisplay = displays[0]; // Native WebVR Head Mounted Displays (HMDs) like the HTC Vive
          // also need the cardboard button to enter fully immersive mode
          // so, we want to add the button if we're not polyfilled.

          if (!_this4.vrDisplay.isPolyfilled) {
            _this4.log('Real HMD found using VRControls', _this4.vrDisplay); // We use VRControls here since we are working with an HMD
            // and we only want orientation controls.


            _this4.controls3d = new VRControls(_this4.camera);
          }
        }

        if (!_this4.controls3d) {
          _this4.log('no HMD found Using Orbit & Orientation Controls');

          var _options = {
            camera: _this4.camera,
            canvas: _this4.renderedCanvas,
            // check if its a half sphere view projection
            halfView: _this4.currentProjection_.indexOf('180') === 0,
            orientation: videojs.browser.IS_IOS || videojs.browser.IS_ANDROID || false
          };

          if (_this4.options_.motionControls === false) {
            _options.orientation = false;
          }

          _this4.controls3d = new OrbitOrientationControls(_options);
          _this4.canvasPlayerControls = new CanvasPlayerControls(_this4.player_, _this4.renderedCanvas, _this4.options_);
        }

        _this4.animationFrameId_ = _this4.requestAnimationFrame(_this4.animate_);
      });
    } else if (window$1.navigator.getVRDevices) {
      this.triggerError_({
        code: 'web-vr-out-of-date',
        dismiss: false
      });
    } else {
      this.triggerError_({
        code: 'web-vr-not-supported',
        dismiss: false
      });
    }

    if (this.options_.omnitone) {
      var audiocontext = THREE.AudioContext.getContext();
      this.omniController = new OmnitoneController(audiocontext, this.options_.omnitone, this.getVideoEl_(), this.options_.omnitoneOptions);
      this.omniController.one('audiocontext-suspended', function () {
        _this4.player.pause();

        _this4.player.one('playing', function () {
          audiocontext.resume();
        });
      });
    }

    this.on(this.player_, 'fullscreenchange', this.handleResize_);
    window$1.addEventListener('vrdisplaypresentchange', this.handleResize_, true);
    window$1.addEventListener('resize', this.handleResize_, true);
    window$1.addEventListener('vrdisplayactivate', this.handleVrDisplayActivate_, true);
    window$1.addEventListener('vrdisplaydeactivate', this.handleVrDisplayDeactivate_, true);
    this.initialized_ = true;
    this.trigger('initialized');
  };

  _proto.getVideoEl_ = function getVideoEl_() {
    return this.player_.el().getElementsByTagName('video')[0];
  };

  _proto.reset = function reset() {
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

    if (this.effect) {
      this.effect.dispose();
      this.effect = null;
    }

    window$1.removeEventListener('resize', this.handleResize_, true);
    window$1.removeEventListener('vrdisplaypresentchange', this.handleResize_, true);
    window$1.removeEventListener('vrdisplayactivate', this.handleVrDisplayActivate_, true);
    window$1.removeEventListener('vrdisplaydeactivate', this.handleVrDisplayDeactivate_, true); // re-add the big play button to player

    if (!this.player_.getChild('BigPlayButton')) {
      this.player_.addChild('BigPlayButton', {}, this.bigPlayButtonIndex_);
    }

    if (this.player_.getChild('BigVrPlayButton')) {
      this.player_.removeChild('BigVrPlayButton');
    } // show the fullscreen again


    if (videojs.browser.IS_IOS && this.player_.controlBar && this.player_.controlBar.fullscreenToggle) {
      this.player_.controlBar.fullscreenToggle.show();
    } // reset the video element style so that it will be displayed


    var videoElStyle = this.getVideoEl_().style;
    videoElStyle.zIndex = '';
    videoElStyle.opacity = ''; // set the current projection to the default

    this.currentProjection_ = this.defaultProjection_; // reset the ios touch to click workaround

    if (this.iosRevertTouchToClick_) {
      this.iosRevertTouchToClick_();
    } // remove the old canvas


    if (this.renderedCanvas) {
      this.renderedCanvas.parentNode.removeChild(this.renderedCanvas);
    }

    if (this.animationFrameId_) {
      this.cancelAnimationFrame(this.animationFrameId_);
    }

    this.initialized_ = false;
  };

  _proto.dispose = function dispose() {
    _Plugin.prototype.dispose.call(this);

    this.reset();
  };

  _proto.polyfillVersion = function polyfillVersion() {
    return WebVRPolyfill.version;
  };

  return VR;
}(Plugin);

VR.prototype.setTimeout = Component.prototype.setTimeout;
VR.prototype.clearTimeout = Component.prototype.clearTimeout;
VR.VERSION = version;
videojs.registerPlugin('vr', VR);

module.exports = VR;
