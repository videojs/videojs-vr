/* eslint-disable */
const videoSourceParam = window.location.search.substring(1);
if (videoSourceParam) {
  if (videoSourceParam.indexOf(".mpd") !== -1) {
    player.src({
      type: 'application/dash+xml',
      src: videoSourceParam
    });
  } else if (videoSourceParam.indexOf(".m3u8") !== -1) {
    player.src({
      type: 'application/vnd.apple.mpegurl',
      src: videoSourceParam
    });
  } else {
    player.src({
      type: 'video/mp4',
      src: videoSourceParam
    });
  }
}
