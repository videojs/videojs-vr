function getProjection(v) {
  return v.project(vr.camera);
}

function getPos(p, canvas) {
  // Scale the point's x and y into pixel-coordinates based on the size of the canvas
  let x = p.x * 0.5 * canvas.width + 0.5 * canvas.width;
  let y = -p.y * 0.5 * canvas.height + 0.5 * canvas.height;

  return {x, y};
}

function setupcue(e, pos, c) {
  var timer;
  var c = c || document.querySelector('canvas');
  var e;
  if (!e) {
    e = document.createElement('div');
    document.body.appendChild(e);
  }
  clearInterval(timer);
  function foo(element, canvas) {
    let v = pos && new vr.THREE.Vector3(pos.x, pos.y, pos.z) || new vr.THREE.Vector3(0, 0, -1);

    // if the vector is in front of the camera...
    if (v.dot(vr.cameraVector) > 0) {
      // move the point out to the 256-unit sphere that defines the 'world'
      v.multiplyScalar(256);

      // project the point onto the camera-view
      let p = getProjection(v);

      // to be on screen, the point must be between -1 and 1 of each axis
      if (p.x < -1 || p.x > 1 ||
        p.y < -1 || p.y > 1) {
        element.style.display = 'none';
        return;
      }

      let {x, y} = getPos(p, canvas);

      element.style.left = x - parseFloat(getComputedStyle(element).width)/2 + 'px';
      element.style.top = y - parseFloat(getComputedStyle(element).height) + 'px';
      element.style.display = 'block';
    }
  }
  timer = setInterval(foo, 15, e, c);
  return timer;
}

function setupcues(player) {
  const tt = player.textTracks()[0];
  window.timers = new WeakMap();
  tt.addEventListener('cuechange', () => {
    [].forEach.call(tt.activeCues, (cue) => {
      if (window.timers.has(cue)) {
        clearInterval(window.timers.get(cue));
      }

      let pos = new vr.THREE.Vector3(0, 0, -1);
      if (cue === tt.cues[0]) {
        pos = new vr.THREE.Vector3(0.5, 0.5, -1);
      }
      if (cue === tt.cues[1]) {
        pos = new vr.THREE.Vector3(-0.5, -0.5, -1);
      }
      if (cue === tt.cues[2]) {
        pos = new vr.THREE.Vector3(-0.8, -0.8, -1);
      }
      const timer = setupcue(cue.displayState, pos);

      window.timers.set(cue, timer);
    });
  });
}

function stopcues(player) {
  const tt = player.texTracks()[0];
  [].forEach.call(tt.cues, (cue) => clearInterval(window.timers.get(cue)))
}
