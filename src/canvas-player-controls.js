import videojs from 'video.js';
/**
 * This class reacts to interactions with the canvas and
 * triggers appropriate functionality on the player. Right now
 * it does two things:
 *
 * 1. A `mousedown`/`touchstart` followed by `touchend`/`mouseup` without any
 *    `touchmove` or `mousemove` toggles play/pause on the player
 * 2. Only moving on/clicking the control bar or toggling play/pause should
 *    show the control bar. Moving around the scene in the canvas should not.
 */
class CanvasPlayerControls extends videojs.EventTarget {
  constructor(player, canvas) {
    super();

    this.player = player;
    this.canvas = canvas;

    this.onMoveEnd = videojs.bind(this, this.onMoveEnd);
    this.onMoveStart = videojs.bind(this, this.onMoveStart);
    this.onMove = videojs.bind(this, this.onMove);
    this.onControlBarMove = videojs.bind(this, this.onControlBarMove);

    this.player.controlBar.on([
      'mousedown',
      'mousemove',
      'mouseup',
      'touchstart',
      'touchmove',
      'touchend'
    ], this.onControlBarMove);

    // we have to override these here because
    // video.js listens for user activity on the video element
    // and makes the user active when the mouse moves.
    // We don't want that for 3d videos
    this.oldReportUserActivity = this.player.reportUserActivity;
    this.player.reportUserActivity = () => {};

    // canvas movements
    this.canvas.addEventListener('mousedown', this.onMoveStart);
    this.canvas.addEventListener('touchstart', this.onMoveStart);
    this.canvas.addEventListener('mousemove', this.onMove);
    this.canvas.addEventListener('touchmove', this.onMove);
    this.canvas.addEventListener('mouseup', this.onMoveEnd);
    this.canvas.addEventListener('touchend', this.onMoveEnd);

    this.shouldTogglePlay = false;
  }

  togglePlay() {
    if (this.player.paused()) {
      this.player.play();
    } else {
      this.player.pause();
    }
  }

  onMoveStart(e) {

    // if the player does not have a controlbar or
    // the move was a mouse click but not left click do not
    // toggle play.
    if (!this.player.controls() || (e.type === 'mousedown' && !videojs.dom.isSingleLeftClick(e))) {
      this.shouldTogglePlay = false;
      return;
    }

    this.shouldTogglePlay = true;
    this.touchMoveCount_ = 0;
  }

  onMoveEnd(e) {
    if (!this.shouldTogglePlay) {
      return;
    }
    this.togglePlay();
  }

  onMove(e) {
    // its hard to tap without a touchmove, if there have been less
    // than one, we should still toggle play
    if (e.type === 'touchmove' && this.touchMoveCount_ < 1) {
      this.touchMoveCount_++;
      return;
    }
    this.shouldTogglePlay = false;
  }

  onControlBarMove(e) {
    this.player.userActive(true);
  }

  dispose() {
    this.canvas.removeEventListener('mousedown', this.onMoveStart);
    this.canvas.removeEventListener('touchstart', this.onMoveStart);
    this.canvas.removeEventListener('mousemove', this.onMove);
    this.canvas.removeEventListener('touchmove', this.onMove);
    this.canvas.removeEventListener('mouseup', this.onMoveEnd);
    this.canvas.removeEventListener('touchend', this.onMoveEnd);

    this.player.controlBar.off([
      'mousedown',
      'mousemove',
      'mouseup',
      'touchstart',
      'touchmove',
      'touchend'
    ], this.onControlBarMove);

    this.player.reportUserActivity = this.oldReportUserActivity;
  }
}

export default CanvasPlayerControls;
