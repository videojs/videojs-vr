
# VR

A video.js plugin that turns a video element into a HTML5 Panoramic 360 video player. Project video onto different shapes. Optionally supports Oculus Rift, HTC Vive and the GearVR.

[View Demo](https://videojs-vr.s3.amazonaws.com/latest/example.html)


### Build
```
npm install
npm run build
```

### Run
```
npm run serve
```

## Examples
To test locally, visit localhost:3000/example.html

## Setting up your own player

Include the following script imports:

    <script src="./dist/videocloud.vr.js"></script>

Host all video content on a HTTP Server that supports byte range requests if you want the seek bar to work (e.g. Apache).

## Oculus Rift and HTC Vive Support
This plugin leverages the [webvr-boilerplate](https://github.com/borismus/webvr-boilerplate) project (which in turn uses [webvr-polyfill](https://github.com/borismus/webvr-polyfill) and [three.js](https://github.com/mrdoob/three.js)) to create a 'responsive VR' experience across multiple devices.

Oculus Rift and HTC Vive playback requires Firefox Nightly with the WebVR addon, or experimental WebVR-enabled builds of Chromium. Go to [WebVR.info](http://www.webvr.info) for more info.

GearVR playback requires the latest Samsung Internet for Gear VR with WebVR support enabled. Go [here](https://webvr.rocks/samsung_internet) for more info.

## Accessing the Camera Position
The Three.js rotation values are exposed under the property `cameraVector` on the `vr` plugin namespace.

For example, assuming the parent element for Video.js is `#video-container` the following code would return the current `cameraVector` values:

    document.getElementById('video-container').player.vr.cameraVector
 
See `example-camera.html` for a working demo that logs camera object and rotation to the console every second.

## Accessing THREE.js objects
The Three.js Scene, renderer, and perspective camera are exposed under the `threeJs` object as the properties `scene`, `renderer`, and `camera` on the `vr` plugin namespace.

For example, assuming the parent element for Video.js is `#video-container` the following code would return the current `camera` object:

    document.getElementById('video-container').player.vr.threeJs.camera

 while:

    document.getElementById('video-container').player.vr.threeJs.scene
 
 would return the THREE.js Scene, and:

    document.getElementById('video-container').player.vr.threeJs.renderer
 
 would return the THREE.js renderer.
 

## Credits ##

This project is a conglomeration of a few amazing open source libraries.

* [VideoJS](http://www.videojs.com)
* [Three.js](http://threejs.org)
* [webvr-boilerplate](https://github.com/borismus/webvr-boilerplate)
* [webvr-polyfill](https://github.com/borismus/webvr-polyfill)

## Support ##
This work is sponsored by [Brightcove](https://www.brightcove.com), [HapYak](http://corp.hapyak.com/) and [StreamShark](https://streamshark.io)


## Release History

* 0.3.4
* 0.3.3
* 0.3.2
* 0.3.1
* 0.3.0
* 0.2.2
* 0.2.0
