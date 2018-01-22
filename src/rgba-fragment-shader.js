module.exports = `uniform sampler2D texture;
varying vec2 vUV;
void main() {
  gl_FragColor = texture2D(texture, vUV).bgra;
}`;
