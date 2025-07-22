uniform sampler2D map;
uniform vec3 lightPosition;
uniform float opacity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec4 texColor = texture2D(map, vUv);
  
  // Simple lighting
  vec3 lightDir = normalize(lightPosition - vPosition);
  float diff = max(dot(vNormal, lightDir), 0.0);
  vec3 diffuse = diff * texColor.rgb;
  
  vec3 ambient = 0.3 * texColor.rgb;
  vec3 finalColor = ambient + diffuse;
  
  gl_FragColor = vec4(finalColor, texColor.a * opacity);
}
