/*! videojs-vr - v0.1.0 - 2014-04-09
* Copyright (c) 2014 Sean Lawrence; Licensed  */
THREE.PointerLockControls = THREE.PointerLockControls || function ( camera ) {

    var scope = this;

    var pitchObject = new THREE.Object3D();
    pitchObject.add( camera );

    var yawObject = new THREE.Object3D();
    yawObject.position.y = 10;
    yawObject.add( pitchObject );

    var moveForward = false;
    var moveBackward = false;
    var moveLeft = false;
    var moveRight = false;

    var isOnObject = false;
    var canJump = false;

    var velocity = new THREE.Vector3();

    var PI_2 = Math.PI / 2;

    var onMouseMove = function ( event ) {

        if ( scope.enabled === false ) { return; }

        var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        yawObject.rotation.y -= movementX * 0.002;
        pitchObject.rotation.x -= movementY * 0.002;

        pitchObject.rotation.x = Math.max( - PI_2, Math.min( PI_2, pitchObject.rotation.x ) );

    };

    var onKeyDown = function ( event ) {

        switch ( event.keyCode ) {

            case 38: // up
            case 87: // w
                moveForward = true;
                break;

            case 37: // left
            case 65: // a
                moveLeft = true; break;

            case 40: // down
            case 83: // s
                moveBackward = true;
                break;

            case 39: // right
            case 68: // d
                moveRight = true;
                break;

            case 32: // space
                if ( canJump === true ) { velocity.y += 10; }
                canJump = false;
                break;

        }

    };

    var onKeyUp = function ( event ) {

        switch( event.keyCode ) {

            case 38: // up
            case 87: // w
                moveForward = false;
                break;

            case 37: // left
            case 65: // a
                moveLeft = false;
                break;

            case 40: // down
            case 83: // a
                moveBackward = false;
                break;

            case 39: // right
            case 68: // d
                moveRight = false;
                break;

        }

    };

    document.addEventListener( 'mousemove', onMouseMove, false );
    document.addEventListener( 'keydown', onKeyDown, false );
    document.addEventListener( 'keyup', onKeyUp, false );

    this.enabled = false;

    this.getObject = function () {
        return yawObject;
    };

    this.isOnObject = function ( boolean ) {
        isOnObject = boolean;
        canJump = boolean;
    };

    this.update = function ( delta ) {

        if ( scope.enabled === false ) {
            return;
        }

        delta *= 0.1;

        velocity.x += ( - velocity.x ) * 0.08 * delta;
        velocity.z += ( - velocity.z ) * 0.08 * delta;

        velocity.y -= 0.25 * delta;

        if ( moveForward ) { velocity.z -= 0.12 * delta; }
        if ( moveBackward ) { velocity.z += 0.12 * delta; }

        if ( moveLeft ) { velocity.x -= 0.12 * delta; }
        if ( moveRight ) { velocity.x += 0.12 * delta; }

        if ( isOnObject === true ) {
            velocity.y = Math.max( 0, velocity.y );
        }

        yawObject.translateX( velocity.x );
        yawObject.translateY( velocity.y );
        yawObject.translateZ( velocity.z );

        if ( yawObject.position.y < 10 ) {
            velocity.y = 0;
            yawObject.position.y = 10;
            canJump = true;
        }

    };
};
/*
 * vr
 * https://github.com/slawrence/videojs-vr
 *
 * Copyright (c) 2014 Sean Lawrence
 * Licensed under the MIT license.
 */
(function(vjs) {

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

    /**
     * Lock the Pointer logic
     * http://www.html5rocks.com/en/tutorials/pointerlock/intro/
     */
    pointerLock = function (success, error, el) {
        var d = document,
            havePointerLock = 'pointerLockElement' in d || 'mozPointerLockElement' in d || 'webkitPointerLockElement' in d,
            e = d.body;

        if (havePointerLock) {
            var pointerlockchange = function () {
                if ( d.pointerLockElement === e || d.mozPointerLockElement === e || d.webkitPointerLockElement === e ) {
                    success();
                } else {
                    error();
                }
            };

            var pointerlockerror = function () {
                error();
            };

            // Hook pointer lock state change events
            d.addEventListener('pointerlockchange', pointerlockchange, false);
            d.addEventListener('mozpointerlockchange', pointerlockchange, false);
            d.addEventListener('webkitpointerlockchange', pointerlockchange, false);

            d.addEventListener('pointerlockerror', pointerlockerror, false);
            d.addEventListener('mozpointerlockerror', pointerlockerror, false);
            d.addEventListener('webkitpointerlockerror', pointerlockerror, false);

            (el).addEventListener( 'click', function () {
                // Ask the browser to lock the pointer
                e.requestPointerLock = e.requestPointerLock || e.mozRequestPointerLock || e.webkitRequestPointerLock;

                if ( /Firefox/i.test( navigator.userAgent ) ) {
                    var fullscreenchange = function () {
                        if ( d.fullscreenElement === e || d.mozFullscreenElement === e || d.mozFullScreenElement === e ) {
                            d.removeEventListener( 'fullscreenchange', fullscreenchange );
                            d.removeEventListener( 'mozfullscreenchange', fullscreenchange );
                            e.requestPointerLock();
                        }
                    };

                    d.addEventListener( 'fullscreenchange', fullscreenchange, false );
                    d.addEventListener( 'mozfullscreenchange', fullscreenchange, false );

                    e.requestFullscreen = e.requestFullscreen || e.mozRequestFullscreen || e.mozRequestFullScreen || e.webkitRequestFullscreen;
                    e.requestFullscreen();
                } else {
                    e.requestPointerLock();
                }
            }, false);

        } else {
            error('Your browser doesn\'t seem to support Pointer Lock API');
        }
    },

    /**
     * Initialize VR is vr.js if provided
     */
    initVR = function() {
        var vrEnabled = false;
        if (typeof vr !== "undefined") {
            vrEnabled = true;
            if (!vr.isInstalled()) {
                console.error('NPVR plugin not installed!');
                vrEnabled = false;
            }
            vr.load(function(error) {
                if (error) {
                    console.error('Plugin load failed: ' + error.toString());
                    vrEnabled = false;
                }
            });
        }
        return vrEnabled;
    },

    projections = ["Sphere", "Cylinder", "Cube", "Plane"],

    defaults = {
        projection: "Plane"
    },

    /**
     * Initializes the plugin
     */
    plugin = function(options) {
        //vars global (via closure) to the plugin
        var player = this,
            settings = extend({}, defaults, options || {}),
            vrEnabled = initVR(),
            videoEl = this.el().getElementsByTagName('video')[0],
            container = this.el(),
            current_proj = settings.projection,
            movieMaterial,
            movieGeometry,
            movieScreen,
            controls3d,
            scene;

        function resetControls() {
            controls3d.getObject().position.set(0, 0, 0);
            controls3d.getObject().rotation.y = 0;
            controls3d.getObject().children[0].rotation.x = 0;
        }

        function changeProjection(projection) {
            var position = {x:0, y:0, z:0 };
            if (scene) {
                scene.remove(movieScreen);
            }
            if (projection === "Sphere") {
                movieGeometry = new THREE.SphereGeometry( 256, 32, 32 );
            } else if (projection === "Cylinder") {
                movieGeometry = new THREE.CylinderGeometry( 256, 256, 256, 50, 50, true );
            } else if (projection === "Cube") {
                movieGeometry = new THREE.CubeGeometry( 256, 256, 256 );
            } else if (projection === "Plane") {
                movieGeometry = new THREE.PlaneGeometry( 480, 204, 4, 4 );
                position.z = -256;
            }
            movieScreen = new THREE.Mesh( movieGeometry, movieMaterial );
            movieScreen.position.set(position.x, position.y, position.z);
            resetControls();
            scene.add(movieScreen);
        }

        function initScene() {
            var time = Date.now(),
                effect,
                videoTexture,
                vrstate = vrEnabled ? new vr.State() : null,
                requestId,
                renderer,
                camera,
                renderedCanvas;

            camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );
            scene = new THREE.Scene();

            controls3d = vrEnabled ? new THREE.OculusRiftControls(camera) : new THREE.PointerLockControls(camera);
            scene.add(controls3d.getObject());

            videoTexture = new THREE.Texture( videoEl );
            videoTexture.minFilter = THREE.LinearFilter;
            videoTexture.magFilter = THREE.LinearFilter;

            movieMaterial = new THREE.MeshBasicMaterial( { map: videoTexture, overdraw: true, side:THREE.DoubleSide } );
            changeProjection(current_proj);
            camera.position.set(0,0,0);

            renderer = new THREE.WebGLRenderer({
                devicePixelRatio: 1,
                alpha: false,
                clearColor: 0xffffff,
                antialias: true
            });
            //TODO: what should these values be?
            renderer.setSize(1024, 768);

            if (vrEnabled) {
                effect = new THREE.OculusRiftEffect(renderer);
            }
            renderedCanvas = renderer.domElement;
            renderedCanvas.style.width = "inherit";
            renderedCanvas.style.height = "inherit";

            container.insertBefore(renderedCanvas, container.firstChild);
            videoEl.style.display = "none";

            (function animate() {
                if ( videoEl.readyState === videoEl.HAVE_ENOUGH_DATA ) {
                    if (videoTexture) {
                        videoTexture.needsUpdate = true;
                    }
                }

                if (vrEnabled) {
                    //TODO: requestId in dispose
                    requestId = vr.requestAnimationFrame(animate);
                    var polled = vr.pollState(vrstate);
                    controls3d.update( Date.now() - time, polled ? vrstate : null );
                    effect.render( scene, camera, polled ? vrstate : null );
                } else {
                    requestId = window.requestAnimationFrame(animate);
                    controls3d.update( Date.now() - time );
                    renderer.render( scene, camera );
                }

                time = Date.now();
            }());

            if (!vrEnabled) {
                pointerLock(function () {
                    controls3d.enabled = true;
                }, function () {
                    controls3d.enabled = false;
                }, container.getElementsByTagName('canvas')[0]);
            }
        }
        initScene();

        /**
         * Add the menu options
         */
        function initMenu() {
            vjs.ProjectionSelector = vjs.MenuButton.extend({
                init : function(player, options) {
                    player.availableProjections = options.availableProjections || [];
                    vjs.MenuButton.call(this, player, options);
                }
            });

            //Top Item - not selectable
            vjs.ProjectionTitleMenuItem = vjs.MenuItem.extend({
                init : function(player, options) {
                    vjs.MenuItem.call(this, player, options);
                    this.off('click'); //no click handler
                }
            });

            //Menu Item
            vjs.ProjectionMenuItem = vjs.MenuItem.extend({
                init : function(player, options){
                    options.label = options.res;
                    options.selected = (options.res.toString() === player.getCurrentRes().toString());
                    vjs.MenuItem.call(this, player, options);
                    this.resolution = options.res;
                    this.on('click', this.onClick);
                    player.on('changeProjection', vjs.bind(this, function() {
                        if (this.resolution === player.getCurrentRes()) {
                            this.selected(true);
                        } else {
                            this.selected(false);
                        }
                    }));
                }
            });

            // Handle clicks on the menu items
            vjs.ProjectionMenuItem.prototype.onClick = function() {
                var player = this.player(),
                button_nodes = player.controlBar.projectionSelection.el().firstChild.children,
                button_node_count = button_nodes.length;

                // Save the newly selected resolution in our player options property
                changeProjection(this.resolution);

                // Update the button text
                while ( button_node_count > 0 ) {
                    button_node_count--;
                    if ( 'vjs-current-res' === button_nodes[button_node_count].className ) {
                        button_nodes[button_node_count].innerHTML = this.resolution;
                        break;
                    }
                }
            };

            // Create a menu item for each available projection
            vjs.ProjectionSelector.prototype.createItems = function() {
                var player = this.player(),
                items = [];

                // Add the menu title item
                items.push( new vjs.ProjectionTitleMenuItem( player, {
                    el : vjs.Component.prototype.createEl( 'li', {
                        className : 'vjs-menu-title vjs-res-menu-title',
                        innerHTML : 'Projections'
                    })
                }));

                // Add an item for each available resolution
                player.availableProjections.forEach(function (proj) {
                    items.push( new vjs.ProjectionMenuItem( player, {
                        res : proj
                    }));
                });

                return items;
            };


        }
        initMenu();

        function addMenu(cb) {
            player.getCurrentRes = function() {
                return player.current_proj || '';
            };

            // Add the resolution selector button
            var projectionSelection = new vjs.ProjectionSelector( player, {
                el : vjs.Component.prototype.createEl( null, {
                    className : 'vjs-res-button vjs-menu-button vjs-control',
                    innerHTML : '<div class="vjs-control-content"><span class="vjs-current-res">' + ( current_proj || 'Projections' ) + '</span></div>',
                    role    : 'button',
                    'aria-live' : 'polite', // let the screen reader user know that the text of the button may change
                    tabIndex  : 0
                }),
                availableProjections : projections
            });

            // Add the button to the control bar object and the DOM
            cb.projectionSelection = cb.addChild( projectionSelection );
        }
        addMenu(player.controlBar);

        function initVRControls () {
            var controlEl = container.getElementsByClassName('vjs-control-bar')[0];
            var left = vjs.Component.prototype.createEl( null, {
                className : 'videojs-vr-controls',
                innerHTML : '<div></div>',
                tabIndex  : 0
            });
            var right = vjs.Component.prototype.createEl( null, {
                className : 'videojs-vr-controls',
                innerHTML : '<div></div>',
                tabIndex  : 0
            });

            function addStyle(theEl) {
                theEl.style.position = "absolute";
                theEl.style.top = "50%";
                theEl.style.height = "50px";
                theEl.style.width = "30%";
                theEl.style.margin = "-25px 0 0 -20%";
                return theEl;
            }
            left = addStyle(left);
            left.style.left = "35%";
            right = addStyle(right);
            right.style.left = "75%";

            //copy controlEl
            var controlElRight = new vjs.ControlBar(player, {name: 'controlBar'});
            addMenu(controlElRight);

            //insert nodes into left and right
            left.insertBefore(controlEl, left.firstChild);
            right.insertBefore(controlElRight.el(), right.firstChild);

            //insert left and right nodes into DOM
            container.insertBefore(left, container.firstChild);
            container.insertBefore(right, container.firstChild);
        }
        if (vrEnabled) {
            initVRControls();
        }
        return {
            changeProjection: changeProjection
        };
    };

  // register the plugin with video.js
  vjs.plugin('vr', plugin);

}(window.videojs));
