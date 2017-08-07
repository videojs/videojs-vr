import window from 'global/window';
// this is used to configure webvr-polyfill
// see https://github.com/googlevr/webvr-polyfill#configuration
const WebVRConfig = {
  // TODO:
  // implement controls so that thy only work when the player is in focus.
  // This will require MOUSE_KEYBOARD_CONTROLS_DISABLED, and TOUCH_PANNER_DISABLED to be set to true
  // and various points in the code will have to be changed. As a lot of the code
  // expects some sort of controls to be set up, and when no controls are set up
  // it throws an error about no vr displays being found. VrDisplays is actually referring to controls.

  // Flag to disable touch panner. In case you have your own touch controls.
  // Default: true.
  TOUCH_PANNER_DISABLED: false
  // To disable keyboard and mouse controls, if you want to use your own
  // implementation.
  // Default: false.
  // MOUSE_KEYBOARD_CONTROLS_DISABLED: true,
};

window.WebVRConfig = WebVRConfig;
