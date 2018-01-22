module.exports = `varying vec2 vUV;
void main() {
  vUV = vec2( uv.x, 1.0 - uv.y );
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;
