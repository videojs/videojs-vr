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
 *
 *
 */
class CanvasPlayerControls extends videojs.EventTarget {
  constructor(player, canvas) {
    super();

    this.player = player;
    this.canvas = canvas;

    this.onMoveEnd = videojs.bind(this, this.onMoveEnd);
    this.onMoveStart = videojs.bind(this, this.onMoveStart);
    this.onMove = videojs.bind(this, this.onMove);
    this.controlBarMove = videojs.bind(this, this.controlBarMove);

    // canvas movements
    this.canvas.addEventListener('mousedown', this.onMoveStart);
    this.canvas.addEventListener('touchstart', this.onMoveStart);
    this.canvas.addEventListener('mousemove', this.onMove);
    this.canvas.addEventListener('touchmove', this.onMove);
    this.canvas.addEventListener('mouseup', this.onMoveEnd);
    this.canvas.addEventListener('touchend', this.onMoveEnd);

    this.player.controlBar.on([
      'mousedown',
      'mousemove',
      'mouseup',
      'touchstart',
      'touchmove',
      'touchend'
    ], this.controlBarMove);

    this.shouldTogglePlay = false;

    this.oldUserActive_ = this.player.userActive;
    this.player.userActive = (v) => {
      if (typeof v === 'undefined') {
        return this.oldUserActive_.call(this.player);
      }

      if (v !== this.userActive_) {
        return;
      }

      return this.oldUserActive_.call(this.player, v);
    };
  }

  userActive(v) {
    this.userActive_ = v;
    this.player.userActive(v);
  }

  togglePlay() {
    if (this.player.paused()) {
      this.player.play();
    } else {
      this.player.pause();
    }
  }

  onMoveStart(e) {
    this.userActive(false);

    // if the player does not have a controlbar do no toggle play
    if (!this.player.controls()) {
      this.shouldTogglePlay = false;
      return;
    }

    // if the move start was a mouse click but not left click
    // do not toggle play
    if (e.type === 'mousedown' && !videojs.dom.isSingleLeftClick(e)) {
      this.shouldTogglePlay = false;
      return;
    }

    this.shouldTogglePlay = true;
  }

  onMoveEnd(e) {
    if (!this.shouldTogglePlay) {
      this.userActive_ = false;
      this.userActive(false);
      return;
    }
    this.userActive(true);
    this.togglePlay();
  }

  onMove(e) {
    this.shouldTogglePlay = false;
    this.userActive(false);
  }

  controlBarMove(e) {
    this.userActive(true);
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
    ], this.controlBarMove);

    this.player.userActive = this.oldUserActive_;
  }
}

export default CanvasPlayerControls;
