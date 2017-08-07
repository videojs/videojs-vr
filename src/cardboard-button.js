import window from 'global/window';
import videojs from 'video.js';
// Add Cardboard button
const Button = videojs.getComponent('Button');

class CardboardButton extends Button {
  buildCSSClass() {
    return `vjs-button-vr ${super.buildCSSClass()}`;
  }
  handleClick() {
    window.dispatchEvent(new window.Event('vrdisplayactivate'));
  }

}

videojs.registerComponent('CardboardButton', CardboardButton);

export default CardboardButton;
