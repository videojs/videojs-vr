import videojs from 'video.js';
import window from 'global/window';

const BigPlayButton = videojs.getComponent('BigPlayButton');

class BigVrPlayButton extends BigPlayButton {
  buildCSSClass() {
    return `vjs-big-vr-play-button ${super.buildCSSClass()}`;
  }

  handleClick() {
    // For iOS we need permission for the device orientation data, this will pop up an 'Allow' if not already set
    // eslint-disable-next-line
    if (typeof window.DeviceMotionEvent === 'function' &&
        typeof window.DeviceMotionEvent.requestPermission === "function") {
      window.DeviceMotionEvent.requestPermission().then(response => {
        if (response !== 'granted') {
          this.log('DeviceMotionEvent permissions not set');
        }
      });
    }
    super.handleClick();
  }
}

videojs.registerComponent('BigVrPlayButton', BigVrPlayButton);

export default BigVrPlayButton;
