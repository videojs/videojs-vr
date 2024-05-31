import videojs from 'video.js';
import window from 'global/window';

let xrMediaFactory = null;

const BigPlayButton = videojs.getComponent('BigPlayButton');

class BigVrPlayButton extends BigPlayButton {
  buildCSSClass() {
    return `vjs-big-vr-play-button ${super.buildCSSClass()}`;
  }

  async onSessionStarted(session) {
    await window.navigator.xr.setSession(session);

    xrMediaFactory = new global.XRMediaBinding(session);
    session.requestReferenceSpace('local').then((refSpace) => {
      const player = videojs.getAllPlayers()[0];

      if (player) {
        const video = player.tech({IWillNotUseThisInPlugins: true}).el();

        if (player.mediainfo && player.mediainfo.projection) {
          const is360 = player.mediainfo.projection.indexOf('360') !== -1;

          if (player.mediainfo.projection.indexOf('MONO') !== -1) {
            const layer = xrMediaFactory.createEquirectLayer(video, {
              space: refSpace,
              centralHorizontalAngle: (is360) ? Math.PI * 2 : Math.PI,
              layout: 'mono'
            });

            session.updateRenderState({layers: [layer]});
          } else {
            const layer = xrMediaFactory.createEquirectLayer(video, {
              space: refSpace,
              centralHorizontalAngle: (is360) ? Math.PI * 2 : Math.PI,
              layout: 'stereo'
            });

            session.updateRenderState({layers: [layer]});
          }
        }
      }
    });
  }

  handleClick(event) {
    // For iOS we need permission for the device orientation data, this will pop up an 'Allow' if not already set
    // eslint-disable-next-line
    if (typeof window.DeviceMotionEvent === 'function' &&
        typeof window.DeviceMotionEvent.requestPermission === 'function') {
      window.DeviceMotionEvent.requestPermission().then(response => {
        if (response !== 'granted') {
          this.log('DeviceMotionEvent permissions not set');
        }
      });
    }

    if (window.navigator.xr) {
      const sessionInit = {optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']};
      const self = this;

      window.navigator.xr.requestSession('immersive-vr', sessionInit).then(self.onSessionStarted).catch();
    }

    super.handleClick(event);
  }
}

videojs.registerComponent('BigVrPlayButton', BigVrPlayButton);

export default BigVrPlayButton;
