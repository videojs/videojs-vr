
# VR

A video.js plugin that turns a video element into a HTML5 Panoramic 360 video player. Project video onto different shapes. Optionally supports Oculus Rift, HTC Vive and the GearVR.

[View Demo](http://stage.metacdn.com/r/v/vorjbrr/Er866Cp)

## Getting Started
Download [videojs](http://www.videojs.com/)
(*Note*: The plugin requires uncompressed video.js unless you are using version > 4.1.0)

In your web page:
    <script src="./dist/player-skin.js"></script>
    <script src="./dist/player.full.js"></script>
    <video id="video"
           class="video-js vjs-default-skin"
           src="movie.mp4"
           controls>
    </video>
    <script>
    (function(){
        var player = videojs( '#video', {
            techOrder: ['html5']
        });
        player.vr({projection: "360"}); // initialize the plugin, 'Plane' projection by default
    })();
    </script>

Host on a HTTP Server that supports byte range requests if you want the seek bar to work (e.g. Apache).

## Oculus Rift and HTC Vive Support
This plugin leverages the [webvr-boilerplate](https://github.com/borismus/webvr-boilerplate) project (which in turn uses [webvr-polyfill](https://github.com/borismus/webvr-polyfill) and [three.js](https://github.com/mrdoob/three.js)) to create a 'responsive VR' experience across multiple devices.

Oculus Rift playback requires Firefox Nightly with the WebVR addon, or experimental WebVR-enabled builds of Chromium. Go to [WebVR.info](http://www.webvr.info) for more info.

HTC Vive playback requires an experimental WebVR-enabled build of Chromium. Firefox does not support the HTC Vive at this time.

GearVR playback requires the latest Samsung Internet for Gear VR with WebVR support enabled. Go [here](https://mail.mozilla.org/pipermail/web-vr-discuss/2016-April/001054.html) for more info.

    <link rel="stylesheet" href="dist/videojs.css">
    <script src="dist/video.dev.js"></script>
    <script src="dist/js/three.js"></script>

    <script type="text/javascript" src="dist/js/VRControls.js"></script>
    <script type="text/javascript" src="dist/js/VREffect.js"></script>
    <script type="text/javascript" src="dist/js/webvr-polyfill.js"></script>
    <script type="text/javascript" src="dist/js/webvr-manager.js"></script>    

### Build
```
npm install
npm run build
```

### Run
npm run serve

## Examples
To test locally, visit localhost:3000/example.html

## Credits ##

This project is a conglomeration of a few amazing open source libraries.

* [VideoJS](http://www.videojs.com)
* [Three.js](http://threejs.org)
* [webvr-boilerplate](https://github.com/borismus/webvr-boilerplate)
* [webvr-polyfill](https://github.com/borismus/webvr-polyfill)


## Release History
_(Nothing yet)_
