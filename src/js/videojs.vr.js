/*! videojs-vr - v0.1.0 - 2014-04-09
* Copyright (c) 2014 Sean Lawrence; Licensed  */
/*
 * vr
 * https://github.com/slawrence/videojs-vr
 *
 * Copyright (c) 2014 Sean Lawrence
 * Licensed under the MIT license.
 */
(function(videojs) {

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

    projections = ["360", "360_LR", "360_TB", "360_CUBE"],

    defaults = {
        projection: "360_LR"
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

        if (videoEl == undefined || videoEl == null) {
            // Player is not using HTML5 tech, so don't init it.
            return ;
        }

        function changeProjection(projection) {
            var position = {x:0, y:0, z:0 };
            if (scene) {
                scene.remove(movieScreen);
            }
            if (projection === "360") {
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
            var time = Date.now(),
                effect,
                videoTexture,
                requestId,
                renderer,
                camera,
                renderedCanvas;

            camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );

            if ((current_proj === "360_LR") || (current_proj === "360_TB")) {
                camera.layers.enable( 1 ); // Render left eye when not in VR mode
            }

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
                if (window.orientation == undefined) {
                    camera.aspect = window.innerWidth / window.innerHeight;
                    camera.updateProjectionMatrix();
                    effect.setSize(window.innerWidth, window.innerHeight);
                }
            }

            window.addEventListener('resize', onWindowResize, false);

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
         var ProjectionSelector = videojs.extend(videojs.getComponent('MenuButton'), {
             constructor : function(player, options) {
                 player.availableProjections = options.availableProjections || [];
                 videojs.getComponent('MenuButton').call(this, player, options);
                 var items = this.el().firstChild
                 var wrapper = videojs.createEl("div", {
                     className : 'vjs-control-content'
                 })
                 this.el().replaceChild(wrapper, items)
                 wrapper.appendChild(items)
             }
         });

         videojs.registerComponent('ProjectionSelector', ProjectionSelector);

         var ProjectionSelection = videojs.extend(videojs.getComponent('Button'), {
             constructor : function(player, options) {
               this.availableProjections = options.availableProjections || [];
             },
             className : 'vjs-res-button vjs-menu-button vjs-control',
             role    : 'button',
             'aria-live' : 'polite', // let the screen reader user know that the text of the button may change
             tabIndex  : 0
         });

         videojs.registerComponent('ProjectionSelection', ProjectionSelection);

         //Top Item - not selectable
         var ProjectionTitleMenuItem = videojs.extend(videojs.getComponent('MenuItem'), {
             constructor : function(player, options) {
                 videojs.getComponent('MenuItem').call(this, player, options);
                 this.off('click'); //no click handler
             }
         });

         videojs.registerComponent('ProjectionTitleMenuItem', ProjectionTitleMenuItem);

         //Menu Item
         var ProjectionMenuItem = videojs.extend(videojs.getComponent('MenuItem'), {
             constructor : function(player, options){
                 options.label = options.res;
                 options.selected = (options.res.toString() === player.getCurrentRes().toString());
                 videojs.getComponent('MenuItem').call(this, player, options);
                 this.resolution = options.res;
                 this.on('click', this.onClick);
                 player.on('changeProjection', videojs.bind(this, function() {
                     if (this.resolution === player.getCurrentRes()) {
                         this.selected(true);
                     } else {
                         this.selected(false);
                     }
                 }));
             }
         });

         // Handle clicks on the menu items
         ProjectionMenuItem.prototype.onClick = function() {
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

         videojs.registerComponent('ProjectionMenuItem', ProjectionMenuItem);

         // Create a menu item for each available projection
         videojs.getComponent('ProjectionSelector').prototype.createItems = function() {
             var player = this.player(),
             items = [];

             // Add the menu title item
             items.push( new videojs.getComponent('ProjectionTitleMenuItem')( player, {
                 el : videojs.createEl( 'li', {
                     className : 'vjs-menu-title vjs-res-menu-title',
                     innerHTML : 'Projections'
                 })
             }));

             // Add an item for each available resolution
             player.availableProjections.forEach(function (proj) {
                 items.push( new videojs.getComponent('ProjectionMenuItem')( player, {
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

         // Add the button to the control bar object and the DOM
         cb.projectionSelection = cb.addChild( 'ProjectionSelection' );
     }
     addMenu(player.controlBar);

     return {
         changeProjection: changeProjection
     };
  };

  // register the plugin with video.js
  videojs.plugin('vr', plugin);

}(window.videojs));
