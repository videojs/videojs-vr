module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
      
    bowercopy: {
       options: {
         srcPrefix: 'bower_components'
       },
       'video.js': {
         options: {
            destPrefix: 'dist'
         },
         files: {
           'video.dev.js': 'video.js/dist/video-js/video.dev.js',
           'videojs.css': 'video.js/dist/video-js/video-js.css',
           'font/vjs.eot': 'video.js/dist/video-js/font/vjs.eot',
           'font/vjs.svg': 'video.js/dist/video-js/font/vjs.svg',
           'font/vjs.ttf': 'video.js/dist/video-js/font/vjs.ttf',
           'font/vjs.woff': 'video.js/dist/video-js/font/vjs.woff',
           'swf/video-js.swf': 'video.js/dist/video-js/video-js.swf'
         }
       },
       'threejs': {
         options: {
            destPrefix: 'dist'
         },
         files: {
           'js/three.js': 'threejs/build/three.js',
           'js/VRControls.js': 'threejs/examples/js/controls/VRControls.js',
           'js/VREffect.js': 'threejs/examples/js/effects/VREffect.js'
         }
       },
       'webvr-polyfill': {
         options: {
            destPrefix: 'dist'
         },
         files: {
           'js/webvr-polyfill.js': 'webvr-polyfill/build/webvr-polyfill.js'
         }
       },
       'webvr-boilerplate': {
         options: {
            destPrefix: 'dist'
         },
         files: {
           'js/webvr-manager.js': 'webvr-boilerplate/build/webvr-manager.js'
         }
       }
   }
  });

  grunt.loadNpmTasks('grunt-bowercopy');
  
  // Default task(s).
  grunt.registerTask('default', ['bowercopy']);

};
