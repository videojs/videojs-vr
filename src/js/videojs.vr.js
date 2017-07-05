/*! videojs-vr - v0.2.0 - 2016-09-10 */
/*
 * vr
 * https://github.com/MetaCDN/videojs-vr
 *
 * Copyright (c) 2014 Sean Lawrence
 * Copyright (c) 2015 James Broberg
 * Copyright (c) 2016 Brightcove Inc., HapYak Inc., MetaCDN Pty. Ltd.
 * Licensed under the MIT license.
 */
(function(vjs) {
    var utils = {
        browser: {
            isMobile: function() {
                var check = false;
                (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
                return check;
            },
            isIOS: function () {
                return /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
            },
            isSafari: function(){
                return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            },
            //we need this as IE 11 reports that it has a VR display, but isnt compatible with Video as a Texture. for example
            isBrowserCompatible: function () {
                var ua = window.navigator.userAgent;

                var msie = ua.indexOf('MSIE ');
                if (msie > 0) {
                    return false;
                }

                var trident = ua.indexOf('Trident/');
                if (trident > 0) {
                    return false;
                }

                // MS Edge and other browsers
                return true;
            }
        }
    };

    /**
     * Copies properties from one or more objects onto an original.
     */
    var extend = function(obj /*, arg1, arg2, ... */) {
        var arg, i, k;
        for (i = 1; i < arguments.length; i++) {
            arg = arguments[i];
            for (k in arg) {
                if (arg.hasOwnProperty(k)) {
                    obj[k] = arg[k];
                }
            }
        }
        return obj;
    },

    projections = ["360", "360_LR", "360_TB", "360_CUBE", "NONE", "AUTO"],

    defaults = {
        projection: "AUTO",
        debug: false
    },

    /**
     * Initializes the plugin
     */
    plugin = function(options) {
        //vars global (via closure) to the plugin
        var player = this,
            settings = extend({}, defaults, options || {}),
            videoEl = this.el().getElementsByTagName('video')[0],
            container = this.el(),
            current_proj = settings.projection,
            movieMaterial,
            movieGeometry,
            movieScreen,
            controls3d,
            scene,
            cameraVector,
            x,
            y,
            z;

        var log = function(msg){
            if(settings.debug) {
                console.log(msg);
            }
        };

        function registerErrorMessages() {
          player.errors({
              "errors": {
                  "web-vr-no-devices-found": {
                      "headline": "No 360 devices found",
                      "type": "360_NO_DEVICES_FOUND",
                      "message": "Your browser supports 360, but no 360 displays found."
                  },
                  "web-vr-out-of-date": {
                      "headline": "360 is out of date",
                      "type": "360_OUT_OF_DATE",
                      "message": "Your browser supports 360 but not the latest version. See <a href='http://webvr.info'>webvr.info</a> for more info."
                  },
                  "web-vr-not-supported": {
                      "headline": "360 not supported on this device",
                      "type": "360_NOT_SUPPORTED",
                      "message": "Your browser does not support 360. See <a href='http://webvr.info'>webvr.info</a> for assistance."
                  }
              }
          });
        }

        registerErrorMessages();

        if (videoEl == undefined || videoEl == null) {
            // Player is not using HTML5 tech, so don't init it.
            return ;
        }

        if (current_proj === "NONE") {
           // Show raw 360 video.
           return ;
        }

        function changeProjection(projection) {
            var position = {x:0, y:0, z:0 };
            if (scene) {
                scene.remove(movieScreen);
            }
            if (projection === "AUTO"){
                if(player.mediainfo && player.mediainfo.projection && player.mediainfo.projection === "equirectangular"){
                    current_proj = "360";
                    changeProjection("360");
                }
                else{
                    current_proj = "NONE";
                }
            }
            else if (projection === "360") {
                movieGeometry = new THREE.SphereBufferGeometry( 256, 32, 32 );

                movieScreen = new THREE.Mesh( movieGeometry, movieMaterial );
                movieScreen.position.set(position.x, position.y, position.z);

                movieScreen.scale.x = -1;
                movieScreen.quaternion.setFromAxisAngle({x: 0, y: 1, z: 0}, -Math.PI / 2);
                scene.add(movieScreen);

            } else if ((projection === "360_LR") || (projection === "360_TB")) {
                var geometry = new THREE.SphereGeometry( 256, 32, 32 );

                // Left eye view
                geometry.scale( - 1, 1, 1 );
                var uvs = geometry.faceVertexUvs[ 0 ];
                for ( var i = 0; i < uvs.length; i ++ ) {
                    for ( var j = 0; j < 3; j ++ ) {
                        if (projection === "360_LR") {
                            uvs[ i ][ j ].x *= 0.5;
                        } else {
                            uvs[ i ][ j ].y *= 0.5;
                        }
                    }
                }

                movieGeometry = new THREE.BufferGeometry().fromGeometry( geometry );
                movieScreen = new THREE.Mesh( movieGeometry, movieMaterial );
                movieScreen.rotation.y = - Math.PI / 2;
                movieScreen.layers.set( 1 ); // display in left eye only
                scene.add( movieScreen );

                // Right eye view
                var geometry = new THREE.SphereGeometry( 256, 32, 32 );
                geometry.scale( - 1, 1, 1 );
                var uvs = geometry.faceVertexUvs[ 0 ];

                for ( var i = 0; i < uvs.length; i ++ ) {
                    for ( var j = 0; j < 3; j ++ ) {
                        if (projection === "360_LR") {
                            uvs[ i ][ j ].x *= 0.5;
                            uvs[ i ][ j ].x += 0.5;
                        } else {
                            uvs[ i ][ j ].y *= 0.5;
                            uvs[ i ][ j ].y += 0.5;
                        }
                    }
                }

                movieGeometry = new THREE.BufferGeometry().fromGeometry( geometry );
                movieScreen = new THREE.Mesh( movieGeometry, movieMaterial );
                movieScreen.rotation.y = - Math.PI / 2;
                movieScreen.layers.set( 2 ); // display in right eye only
                scene.add( movieScreen );

            } else if (projection === "360_CUBE") {
                // Currently doesn't work - need to figure out order of cube faces
                movieGeometry = new THREE.CubeGeometry( 256, 256, 256 );
                var face1 = [new THREE.Vector2(0, .5), new THREE.Vector2(.333, .5), new THREE.Vector2(.333, 1), new THREE.Vector2(0, 1)];
                var face2 = [new THREE.Vector2(.333, .5), new THREE.Vector2(.666, .5), new THREE.Vector2(.666, 1), new THREE.Vector2(.333, 1)];
                var face3 = [new THREE.Vector2(.666, .5), new THREE.Vector2(1, .5), new THREE.Vector2(1, 1), new THREE.Vector2(0.666, 1)];
                var face4 = [new THREE.Vector2(0, 0), new THREE.Vector2(.333, 1), new THREE.Vector2(.333, .5), new THREE.Vector2(0, .5)];
                var face5 = [new THREE.Vector2(.333, 1), new THREE.Vector2(.666, 1), new THREE.Vector2(.666, .5), new THREE.Vector2(.333, .5)];
                var face6 = [new THREE.Vector2(.666, 1), new THREE.Vector2(1, 0), new THREE.Vector2(1, .5), new THREE.Vector2(.666, .5)];

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

                movieScreen = new THREE.Mesh( movieGeometry, movieMaterial );
                movieScreen.position.set(position.x, position.y, position.z);

                scene.add(movieScreen);

            }
        }

        function initScene() {

            if(!utils.browser.isBrowserCompatible())
            {
                player.error({code: 'web-vr-not-supported', dismiss: false});
                return;
            }

            var time = Date.now(),
                effect,
                videoTexture,
                requestId,
                renderer,
                camera,
                renderedCanvas;

            camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );

            cameraVector = new THREE.Vector3(); // Store vector representing the direction in which the camera is looking, in world space.

            if ((current_proj === "360_LR") || (current_proj === "360_TB")) {
                camera.layers.enable( 1 ); // Render left eye when not in VR mode
            }

            scene = new THREE.Scene();

            controls3d = new THREE.VRControls(camera);

            videoTexture = new THREE.VideoTexture( videoEl );
            videoTexture.generateMipmaps = false;
            videoTexture.minFilter = THREE.LinearFilter;
            videoTexture.magFilter = THREE.LinearFilter;

            // iOS and macOS HLS fix/hacks
            // https://bugs.webkit.org/show_bug.cgi?id=163866#c3
            // https://github.com/mrdoob/three.js/issues/9754
            // On iOS with HLS, color space is wrong and texture is flipped on Y axis
            // On macOS, just need to flip texture Y axis

            if (isHLS() && utils.browser.isSafari() && utils.browser.isIOS()) {
                log("Safari + iOS + HLS = flipY and colorspace hack");
                videoTexture.format = THREE.RGBAFormat;
                videoTexture.flipY = false;
            } else if (isHLS() && utils.browser.isSafari()) {
                log("Safari + HLS = flipY hack");
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
                        "varying vec2 vUV;",
                        "void main() {",
                        "	vUV = vec2( uv.x, 1.0 - uv.y );",
                        "	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
                        "}"
                    ].join("\n"),
                    fragmentShader: [
                        "uniform sampler2D texture;",
                        "varying vec2 vUV;",
                        "void main() {",
                        " gl_FragColor = texture2D( texture, vUV  ).bgra;",
                        "}"
                    ].join("\n")
                });
            } else if (videoTexture.format === THREE.RGBFormat && videoTexture.flipY === false) {
                 movieMaterial = new THREE.ShaderMaterial({
                    uniforms: {
                        texture: { value: videoTexture }
                    },
                    vertexShader: [
                        "varying vec2 vUV;",
                        "void main() {",
                        "	vUV = vec2( uv.x, 1.0 - uv.y );",
                        "	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
                        "}"
                    ].join("\n"),
                    fragmentShader: [
                        "uniform sampler2D texture;",
                        "varying vec2 vUV;",
                        "void main() {",
                        " gl_FragColor = texture2D( texture, vUV  );",
                        "}"
                    ].join("\n")
                });
            } else {
                movieMaterial = new THREE.MeshBasicMaterial( { map: videoTexture, overdraw: true, side:THREE.DoubleSide } );
            }

            changeProjection(current_proj);

            if(current_proj === "NONE") {
                log("Projection is NONE, dont init");
                return;
            }

            camera.position.set(0,0,0);

            renderer = new THREE.WebGLRenderer({
                devicePixelRatio: window.devicePixelRatio,
                alpha: false,
                clearColor: 0xffffff,
                antialias: true
            });

            renderer.setSize(window.innerWidth, window.innerHeight);
            effect = new THREE.VREffect(renderer);
            effect.setSize(window.innerWidth, window.innerHeight);

            var vrDisplay = null;
            var frameData = null;

            // Previous timestamps for gamepad updates
            var prevTimestamps = [];

            var manager = new WebVRManager(renderer, effect, {hideButton: true});

            renderedCanvas = renderer.domElement;
            renderedCanvas.style.width = "inherit";
            renderedCanvas.style.height = "inherit";

            container.insertBefore(renderedCanvas, container.firstChild);
            videoEl.style.display = "none";

            // Handle window resizes
            function onWindowResize() {
                //if (window.orientation == undefined) {
                    effect.setSize(window.innerWidth, window.innerHeight);
                    camera.aspect = window.innerWidth / window.innerHeight;
                    camera.updateProjectionMatrix();
                //}
            }

            window.addEventListener('resize', onWindowResize, false);
            window.addEventListener('vrdisplaypresentchange', onWindowResize, true);

            function onVRRequestPresent() {
               manager.enterVRMode_();
               manager.setMode_(3);
            }

            function onVRExitPresent() {
                if (!vrDisplay.isPresenting)
                    return;
                vrDisplay.exitPresent();
            }

            window.addEventListener('vrdisplayactivate', onVRRequestPresent, true);
            window.addEventListener('vrdisplaydeactivate', onVRExitPresent, true);

            if (navigator.getVRDisplays) {
                //frameData = new VRFrameData();
                navigator.getVRDisplays().then(function (displays) {
                    if (displays.length > 0) {
                        log("WebVR supported, VRDisplays found.");
                        vrDisplay = displays[0];
                        log(vrDisplay);
                    } else {
                        player.error({code: 'web-vr-no-devices-found', dismiss: false});
                    }
                });
            } else if (navigator.getVRDevices) {
                player.error({code: 'web-vr-out-of-date', dismiss: false});
            } else {
                player.error({code: 'web-vr-not-supported', dismiss: false});
            }


            function isHLS(videoElement) {
                var result = false;
                var currentType = player.currentType();

                if (currentType == "application/x-mpegURL") {
                    result = true;
                    log("Detected HLS Stream");
                }

                return result;
            }

            // Handle window rotate
            function onWindowRotate() {
                if (window.orientation == -90 || window.orientation == 90) {
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
                if ( videoEl.readyState === videoEl.HAVE_ENOUGH_DATA ) {
                    if (videoTexture) {
                        videoTexture.needsUpdate = true;
                    }
                }

                controls3d.update();
                manager.render( scene, camera );

                if (vrDisplay) {
                    vrDisplay.requestAnimationFrame(animate);

                    // Grab all gamepads
                    if(navigator.getGamepads) {
                        var gamepads = navigator.getGamepads();
                        for (var i = 0; i < gamepads.length; ++i) {
                            var gamepad = gamepads[i];
                            // Make sure gamepad is defined
                            if (gamepad) {
                                // Only take input if state has changed since we checked last
                                if (gamepad.timestamp && !(gamepad.timestamp === prevTimestamps[i])) {
                                    for (var j = 0; j < gamepad.buttons.length; ++j) {
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
                    //vrDisplay.getFrameData(frameData);

                    //if (vrDisplay.isPresenting) {
                    //   vrDisplay.submitFrame();
                    //}
                }  else {
                    window.requestAnimationFrame(animate);
                }

                camera.getWorldDirection( cameraVector );
                x = getCameraAngle( cameraVector, "x");
                y = getCameraAngle( cameraVector, "y");

                // log('X camera angle:' + getCameraAngle( cameraVector, "x") );
                // log('Y camera angle:' + getCameraAngle( cameraVector, "y") );
                // log(cameraVector.x, cameraVector.y, cameraVector.z);
            }());

            function getCameraAngle(cameraVector, axis) {
               if (axis == "x") {
                    return 180-radiansToDegrees(Math.atan2(cameraVector.x, cameraVector.z));
                    //return cameraVector.x * 114.59155902616465;
               } else if (axis == "y") {
                    return 180-radiansToDegrees(Math.atan2(cameraVector.y, cameraVector.z));
                    //return cameraVector.y * 114.59155902616465;
               }
            }

            function radiansToDegrees(radians) {
               return radians * 180 / Math.PI;
            }

            // Expose the Three.js perspective camera and rotation values on the player under the 'vr' namespace:
            player.vr = {
              cameraVector: cameraVector,
              threeJs: {
                  scene: scene,
                  camera: camera,
                  renderer: renderer
              }
            };

        }

        player.on('loadstart', function () {
            initScene();
        });

        player.ready(function () {

            function updateVrControls(cb) {

                //Add Carboard button
                var Button = videojs.getComponent('Button');
                var MyButton = videojs.extend(Button, {
                    constructor: function() {
                        Button.apply(this, arguments);
                        log(this);
                        /* initialize your button */
                    },
                    handleClick: function() {
                        var event = new Event('vrdisplayactivate');
                        window.dispatchEvent(event);
                        /* do something on click */
                    },
                    buildCSSClass: function() {
                        return Button.prototype.buildCSSClass.call(this) + 'vjs-button-vr';
                    }
                });
                videojs.registerComponent('MyButton', MyButton);
                cb.addChild('myButton', {});

                //if ios remove full screen toggle
                if(utils.browser.isIOS())
                {
                    player.controlBar.fullscreenToggle.hide();
                }
            }

            if(utils.browser.isMobile()){
                updateVrControls(player.controlBar);
            }
        });


     return {
         changeProjection: changeProjection
     };
  };

  // register the plugin with video.js
  videojs.registerPlugin('vr', plugin);

}(window.videojs));
