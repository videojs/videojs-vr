# VR

A video.js plugin that turns a video element into a HTML5 Panoramic 360 video player. Project video onto different shapes. Optionally supports Oculus Rift.

[View Demo](http://slawrence.io/static/projects/video/)

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
This plugin uses the vr.js project for reading the Rift's sensor data (via a Chrome plugin). See [vr.js](https://github.com/benvanik/vr.js) for installation instructions.

To enable rift support, include the `libs/vr/*.js` files after the three.js script tag. If a user does not have the vr.js plugin installed, the plugin should work as normal.

    <link rel="stylesheet" href="libs/video-js-4.1.0/video-js.css">
    <script src="libs/video-js-4.1.0/video.dev.js"></script>
    <script src="libs/three.min.js"></script>

    <!-- vr stuff is optional, must be after THREE is defined -->
    <script src="libs/vr/vr.js"></script>
    <script src="libs/vr/OculusRiftControls.js"></script>
    <script src="libs/vr/OculusRiftEffect.js"></script>

## Examples
Check out example.html to see VR in action.

## Credits ##

This project is a conglomeration of a few amazing open source libraries.

* [VideoJS](http://www.videojs.com)
* [VR.js](https://github.com/benvanik/vr.js)
* [Three.js](http://threejs.org)

## Release History
_(Nothing yet)_

