<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [VR](#vr)
  - [Installation](#installation)
  - [Usage](#usage)
    - [`<script>` Tag](#script-tag)
    - [Browserify/CommonJS](#browserifycommonjs)
    - [RequireJS/AMD](#requirejsamd)
    - [Optional integration with videojs-errors](#optional-integration-with-videojs-errors)
  - [Setting a global projection](#setting-a-global-projection)
    - [Passing a projection on a source by source basis](#passing-a-projection-on-a-source-by-source-basis)
  - [Oculus Rift and HTC Vive Support](#oculus-rift-and-htc-vive-support)
  - [Accessing the Camera Position](#accessing-the-camera-position)
  - [Accessing THREE.js objects](#accessing-threejs-objects)
  - [Options](#options)
    - [`forceCardboard`](#forcecardboard)
    - [`projection`](#projection)
      - [`'360'` or `'Sphere'`](#360-or-sphere)
      - [`'Cube'`, `'360_CUBE'`, or `'equirectangular'`](#cube-360_cube-or-equirectangular)
      - [`'NONE'`](#none)
      - [`'AUTO'`](#auto)
      - [`'360_LR'`](#360_lr)
      - [`'360_TB'`](#360_tb)
    - [`player.mediainfo.projection`](#playermediainfoprojection)
    - [`debug`](#debug)
  - [Credits](#credits)
  - [Support](#support)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


# VR

A video.js plugin that turns a video element into a HTML5 Panoramic 360 video player. Project video onto different shapes. Optionally supports Oculus Rift, HTC Vive and the GearVR.

## Installation

```sh
npm install --save videojs-vr
```

## Usage

To include videojs-vr on your website or web application, use any of the following methods.

### `<script>` Tag

This is the simplest case. Get the script in whatever way you prefer and include the plugin _after_ you include [video.js][videojs], so that the `videojs` global is available.

```html
<script src="//path/to/video.min.js"></script>
<script src="//path/to/videojs-vr.min.js"></script>
<script>
  var player = videojs('my-video');

  player.vr();
</script>
```

### Browserify/CommonJS

When using with Browserify, install videojs-vr via npm and `require` the plugin as you would any other module.

```js
var videojs = require('video.js');

// The actual plugin function is exported by this module, but it is also
// attached to the `Player.prototype`; so, there is no need to assign it
// to a variable.
require('videojs-vr');

var player = videojs('my-video');

player.vr({projection: '360'});
```

### RequireJS/AMD

When using with RequireJS (or another AMD library), get the script in whatever way you prefer and `require` the plugin as you normally would:

```js
require(['video.js', 'videojs-vr'], function(videojs) {
  var player = videojs('my-video');

  player.vr({projection: '360'});
});
```

### Optional integration with videojs-errors
If the [videojs-errors](https://github.com/brightcove/videojs-errors) plugin is intialized before `videojs-vr`, then it will be used to display errors to users.

## Setting a global projection
If you are only going to be playing 360 videos you can set the global plugin projection like so:

```js

var player = videojs('my-video');

player.vr({projection: '360'});

// or change player.vr.defaultProjection
// and call player.vr.initScene again

```

### Passing a projection on a source by source basis
Set `player.mediainfo` and `player.mediainfo.projection` to a valid projection value and pass in 'AUTO' or nothing for the `projection` key when initializing this plugin.
EX:
```js
var player = videojs('my-video');

if (!player.mediainfo) {
  player.mediainfo = {};
}

if (!player.mediainfo.projection) {
  player.mediainfo.projection = '360';
}

player.vr({projection: 'AUTO'});

// or player.vr(); since 'AUTO' is the default
```

## Oculus Rift and HTC Vive Support
This plugin leverages the [webvr-boilerplate](https://github.com/borismus/webvr-boilerplate) project (which in turn uses [webvr-polyfill](https://github.com/borismus/webvr-polyfill) and [three.js](https://github.com/mrdoob/three.js)) to create a 'responsive VR' experience across multiple devices.

Oculus Rift and HTC Vive playback requires Firefox >= 55, experimental WebVR-enabled builds of Chromium, or via Chrome by enabling webvr in `chrome://flags`. Go to [WebVR.info](http://www.webvr.info) for more info.

GearVR playback requires the latest Samsung Internet for Gear VR with WebVR support enabled. Go [here](https://webvr.rocks/samsung_internet) for more info.

## Accessing the Camera Position
The Three.js rotation values are exposed under the property `cameraVector` on the `vr` plugin namespace.

```js
var player = videojs('my-video');

player.vr().cameraVector;
```

## Accessing THREE.js objects
The Three.js Scene, renderer, and perspective camera are exposed under the `threeJs` object as the properties `scene`, `renderer`, and `camera` on the `vr` plugin namespace.

```
var player = videojs('my-video');

player.vr().camera;
player.vr().scene;
player.vr().rendeer;
```

## Options
### `forceCardboard`
> Type: `boolean`, default: `false`

Force the cardboard button to display on all devices even if we don't think they support it.

### `projection`

> Type `string`, default: `'auto'`
Can be any of the following:

#### `'360'` or `'Sphere'`
The video is a sphere

#### `'Cube'`, `'360_CUBE'`, or `'equirectangular'`
The video is a cube

#### `'NONE'`
This video is not a 360 video

#### `'AUTO'`
Check `player.mediainfo.projection` to see if the current video is a 360 video.

#### `'360_LR'`
Used for side-by-side 360 videos

#### `'360_TB'`
Used for top-to-bottom 360 videos

### `player.mediainfo.projection`

> type: `string`

This should be set on a source-by-source basis to turn 360 videos on an off depending upon the video.

See [`projection`](#projection) above for information of values. Note that `AUTO` is the same as `NONE` for `player.mediainfo.projection`.

### `debug`

> type: `boolean`, default: `false`

Enable debug logging for this plugin

## Credits ##

This project is a conglomeration of a few amazing open source libraries.

* [VideoJS](http://www.videojs.com)
* [Three.js](http://threejs.org)
* [webvr-boilerplate](https://github.com/borismus/webvr-boilerplate)
* [webvr-polyfill](https://github.com/borismus/webvr-polyfill)

## Support ##
This work is sponsored by [Brightcove](https://www.brightcove.com), [HapYak](http://corp.hapyak.com/) and [StreamShark](https://streamshark.io)
