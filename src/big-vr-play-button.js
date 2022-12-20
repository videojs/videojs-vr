import videojs from 'video.js';

const BigPlayButton = videojs.getComponent('BigPlayButton');

class BigVrPlayButton extends BigPlayButton {
  buildCSSClass() {
    return `vjs-big-vr-play-button ${super.buildCSSClass()}`;
  }

  handleClick() {
    // For iOS we need permission for the device orientation data, this will pop up an 'Allow' if not already set
    if (window.typeof(DeviceMotionEvent) === 'function' && typeof(window.DeviceMotionEvent.requestPermission) === "function") {
      window.DeviceMotionEvent.requestPermission().then(response => {
        if (response !== 'granted') {
          this.log("DeviceMotionEvent permissions not set");
        }
      });
    }

    super.handleClick();
  }


}

videojs.registerComponent('BigVrPlayButton', BigVrPlayButton);

export default BigVrPlayButton;
