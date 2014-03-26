# VR

A video.js plugin that turns a video element into a HTML5 Panoramic 360 video player. Project video onto different shapes. Optionally supports Oculus Rift.

## Getting Started
Download [videojs](http://www.videojs.com/)

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


## Examples
Check out example.html to see VR in action.

## Credits ##

Credit goes to @benvanik to his outstanding vr.js plugin and Three.js Oculus Rift affects: https://github.com/benvanik/vr.js/tree/master

## Release History
_(Nothing yet)_

