
# VR

A video.js plugin that turns a video element into a HTML5 Panoramic 360 video player. Project video onto different shapes. Optionally supports Oculus Rift.

[View Demo](http://stage.metacdn.com/r/v/vorjbrr/Er866Cp)

## Getting Started
Download [videojs](http://www.videojs.com/)
(*Note*: The plugin requires uncompressed video.js unless you are using version > 4.1.0)

In your web page:

    <link rel="stylesheet" href="video-js.css">
    <video id="video"
           class="video-js vjs-default-skin"
           src="movie.mp4"
           controls>
    </video>
    <script src="video.js"></script>
    <script src="dist/videojs.vr.min.js"></script>
    <script>
    videojs('video', {}, function() {
      var player = this;
      player.vr({projection: 'Sphere'}); // initialize the plugin, 'Plane' projection by default
    });
    </script>

Host on a HTTP Server that supports byte range requests if you want the seek bar to work (e.g. Apache).

## Oculus Rift Support
This plugin leverages the [webvr-boilerplate](https://github.com/borismus/webvr-boilerplate) project (which in turn uses [webvr-polyfill](https://github.com/borismus/webvr-polyfill) and [three.js](https://github.com/mrdoob/three.js)) to create a 'responsive VR' experience across multiple devices.

Oculus Rift playback requires Firefox Nightly with the WebVR addon, or experimental WebVR-enabled builds of Chromium. Go to [WebVR.info](http://www.webvr.info) for more info.

    <link rel="stylesheet" href="dist/videojs.css">
    <script src="dist/video.dev.js"></script>
    <script src="dist/js/three.js"></script>

    <!-- vr stuff is optional, must be after THREE is defined -->
    <script type="text/javascript" src="dist/js/VRControls.js"></script>
    <script type="text/javascript" src="dist/js/VREffect.js"></script>
    <script type="text/javascript" src="dist/js/webvr-polyfill.js"></script>
    <script type="text/javascript" src="dist/js/webvr-manager.js"></script>    

### Build
Build script requires npm, bower and grunt.

If you don't have bower or grunt, run:

```
sudo npm install grunt
sudo npm install grunt-cli
sudo npm install bower
```

Finally, run ./build.sh

## Examples
After you have built the project, check out example.html to see VR in action.

## Credits ##

This project is a conglomeration of a few amazing open source libraries.

* [VideoJS](http://www.videojs.com)
* [Three.js](http://threejs.org)
* [webvr-boilerplate](https://github.com/borismus/webvr-boilerplate)
* [webvr-polyfill](https://github.com/borismus/webvr-polyfill)


## Release History
_(Nothing yet)_

