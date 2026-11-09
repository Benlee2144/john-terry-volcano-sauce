import * as THREE from 'three';

const VERT = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime, uPixel, uRange;
  varying float vLife, vSpark;
  void main() {
    float speed = .55 + aSeed.y * 1.5;
    float life = fract(aSeed.x + uTime * speed / uRange);
    vec3 p = position;
    p.y = -uRange * .5 + life * uRange;
    p.x += sin(uTime * (.4 + aSeed.z) + aSeed.w * 6.28) * (.3 + aSeed.y * .7);
    p.x += sin(life * 9. + aSeed.w * 12.) * .25;
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    vLife = life;
    vSpark = aSeed.z;
    gl_PointSize = (2.5 + aSeed.w * aSeed.w * 13.) * uPixel * (24. / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uHot, uMid;
  uniform float uIntensity, uTime;
  varying float vLife, vSpark;
  void main() {
    float d = length(gl_PointCoord - .5);
    float core = smoothstep(.5, .0, d);
    core *= core;
    float fade = smoothstep(0., .08, vLife) * (1. - smoothstep(.55, 1., vLife));
    float flicker = .65 + .35 * sin(uTime * (6. + vSpark * 13.) + vSpark * 40.);
    vec3 col = mix(uHot, uMid, smoothstep(.2, .9, vLife));
    gl_FragColor = vec4(col * core * fade * flicker * uIntensity * 1.7, 0.);
  }
`;

export function createEmbers(count) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 26;
    pos[i * 3 + 2] = (Math.random() - 0.6) * 14;
    for (let k = 0; k < 4; k++) seed[i * 4 + k] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    uniforms: {
      uTime: { value: 0 }, uPixel: { value: 1 }, uRange: { value: 15 }, uIntensity: { value: 1 },
      uHot: { value: new THREE.Vector3(1, 0.86, 0.5) }, uMid: { value: new THREE.Vector3(1, 0.28, 0.05) },
    },
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return points;
}

const BURST_VERT = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uT, uPixel;
  uniform vec3 uOrigin;
  varying float vFade, vHue;
  void main() {
    float ang = aSeed.x * 6.2832;
    float out_ = 1. - pow(1. - uT, 3.);
    float dist = (4. + aSeed.y * aSeed.y * 15.) * out_;
    vec3 p = uOrigin + vec3(cos(ang) * dist, sin(ang) * dist - uT * uT * 5., (aSeed.z - .4) * 8. * out_);
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    vFade = smoothstep(0., .04, uT) * pow(1. - uT, 1.5);
    vHue = aSeed.w;
    gl_PointSize = (3. + aSeed.w * 12.) * uPixel * (24. / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const BURST_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uHot, uMid;
  uniform float uIntensity;
  varying float vFade, vHue;
  void main() {
    float core = smoothstep(.5, 0., length(gl_PointCoord - .5));
    gl_FragColor = vec4(mix(uMid, uHot, vHue) * core * core * vFade * uIntensity * 2.4, 0.);
  }
`;

/** Scroll-scrubbed spark explosion: uT 0 -> 1 is the whole life of the blast. */
export function createBurst(count) {
  const geo = new THREE.BufferGeometry();
  const seed = new Float32Array(count * 4);
  for (let i = 0; i < count * 4; i++) seed[i] = Math.random();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const mat = new THREE.ShaderMaterial({
    vertexShader: BURST_VERT,
    fragmentShader: BURST_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    uniforms: {
      uT: { value: 0 }, uPixel: { value: 1 }, uIntensity: { value: 1 }, uOrigin: { value: new THREE.Vector3() },
      uHot: { value: new THREE.Vector3(1, 1, 1) }, uMid: { value: new THREE.Vector3(1, 0.3, 0) },
    },
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.visible = false;
  return points;
}
