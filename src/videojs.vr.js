/*! videojs-vr - v0.1.0 - 2014-04-09
* Copyright (c) 2014 Sean Lawrence; Licensed  */
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

    projections = ["Sphere", "Cylinder", "Cube", "Plane"],

    defaults = {
        projection: "Sphere"
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
            scene;

        function changeProjection(projection) {
            var position = {x:0, y:0, z:0 };
            if (scene) {
                scene.remove(movieScreen);
            }
            if (projection === "Sphere") {
                movieGeometry = new THREE.SphereBufferGeometry( 256, 32, 32 );
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
            movieScreen.scale.x = -1;
            scene.add(movieScreen);
        }

        function initScene() {
            var time = Date.now(),
                effect,
                videoTexture,
                requestId,
                renderer,
                camera,
                renderedCanvas;

            camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );
            scene = new THREE.Scene();

            controls3d = new THREE.VRControls(camera);

            videoTexture = new THREE.VideoTexture( videoEl );
            videoTexture.generateMipmaps = false;
            videoTexture.minFilter = THREE.LinearFilter;
            videoTexture.magFilter = THREE.LinearFilter;
            videoTexture.format = THREE.RGBFormat;

            movieMaterial = new THREE.MeshBasicMaterial( { map: videoTexture, overdraw: true, side:THREE.DoubleSide } );
            changeProjection(current_proj);
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

            var manager = new WebVRManager(renderer, effect, {hideButton: false});

            renderedCanvas = renderer.domElement;
            renderedCanvas.style.width = "inherit";
            renderedCanvas.style.height = "inherit";

            container.insertBefore(renderedCanvas, container.firstChild);
            videoEl.style.display = "none";

            // Handle window resizes
            function onWindowResize() {
                  camera.aspect = window.innerWidth / window.innerHeight;
                  camera.updateProjectionMatrix();
                  effect.setSize( window.innerWidth, window.innerHeight );
            }

			window.addEventListener('resize', onWindowResize, false);

            (function animate() {
                if ( videoEl.readyState === videoEl.HAVE_ENOUGH_DATA ) {
                    if (videoTexture) {
                        videoTexture.needsUpdate = true;
                    }
                }

                controls3d.update();
                requestId = window.requestAnimationFrame(animate)
                manager.render( scene, camera );

            }());


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
                    var items = this.el().firstChild
                    var wrapper = vjs.Component.prototype.createEl("div", {
                        className : 'vjs-control-content'
                    })
                    this.el().replaceChild(wrapper, items)
                    wrapper.appendChild(items)
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
                player.current_proj = this.resolution
                changeProjection(this.resolution);
                player.trigger('changeProjection');

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

        return {
            changeProjection: changeProjection
        };
    };

  // register the plugin with video.js
  vjs.plugin('vr', plugin);

}(window.videojs));
