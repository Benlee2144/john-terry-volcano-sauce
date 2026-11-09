import * as THREE from 'three';

// Drawn over the whole page: lava curtains between sections, shock rings, impact flashes.
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime, uAspect, uHead, uTail, uDir, uDrip, uFlash, uShockR, uShockA;
  uniform vec3 uC1, uC2, uC3;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float s = 0., a = .5;
    for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.05 + 17.; a *= .5; }
    return s;
  }

  void main() {
    float y = uDir > 0. ? vUv.y : 1. - vUv.y;
    float x = vUv.x * uAspect;
    vec3 col = vec3(0.), add = vec3(0.);
    float a = 0.;
    float span = uHead - uTail;

    if (span > .001) {
      float fade = smoothstep(0., .08, span);
      float wave = (fbm(vec2(x * 2.4, uTime * .4)) - .5) * .22;
      float drip = pow(noise(vec2(x * 7., 3.1)), 3.) * .55 + pow(noise(vec2(x * 21., 8.)), 4.) * .24;
      float head = uHead + wave + drip * uDrip;
      float tail = uTail + (fbm(vec2(x * 2., uTime * .3 + 9.)) - .5) * .28;
      float inside = smoothstep(-.003, .003, head - y) * smoothstep(-.003, .003, y - tail) * fade;

      vec2 p = vec2(x, y) * 3.2;
      float f = fbm(p + fbm(p * 1.6 + uTime * .12) * 2. + vec2(0., -uTime * .3));
      float m = .42 + f * .8;
      col = mix(uC1, uC2, smoothstep(.45, .72, m));
      col = mix(col, uC3, smoothstep(.72, 1., m));

      float hot = exp(-max(head - y, 0.) * 15.);
      col = mix(col, vec3(1., .95, .8), hot);
      float crust = exp(-max(y - tail, 0.) * 9.);
      float grit = smoothstep(.45, .6, fbm(p * 4.));
      col = mix(col, mix(vec3(.02, .012, .01), uC2, grit * .5), crust * .92);

      a = inside;
      add += uC2 * exp(-max(y - head, 0.) * 18.) * (1. - inside) * fade * .85;
    }

    if (uShockA > .002) {
      float d = length((vUv - .5) * vec2(uAspect, 1.));
      float ring = exp(-pow((d - uShockR) * 10., 2.));
      float inner = exp(-pow((d - uShockR * .72) * 26., 2.)) * .4;
      add += mix(uC2, uC3, .65) * (ring + inner) * uShockA;
    }
    add += vec3(1., .88, .66) * uFlash;
    gl_FragColor = vec4(col * a + add, a);
  }
`;

export function createOverlay() {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    uniforms: {
      uTime: { value: 0 }, uAspect: { value: 1 }, uHead: { value: -1 }, uTail: { value: -1 }, uDir: { value: 1 },
      uDrip: { value: 0 }, uFlash: { value: 0 }, uShockR: { value: 0 }, uShockA: { value: 0 },
      uC1: { value: new THREE.Vector3() }, uC2: { value: new THREE.Vector3() }, uC3: { value: new THREE.Vector3() },
    },
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 100;

  return {
    mesh,
    update(world, { time, aspect, shockR, shockA, flash }) {
      const u = mat.uniforms;
      u.uTime.value = time;
      u.uAspect.value = aspect;
      u.uHead.value = world.wHead;
      u.uTail.value = world.wTail;
      u.uDir.value = world.wDir;
      u.uDrip.value = world.wDrip;
      u.uFlash.value = flash;
      u.uShockR.value = shockR;
      u.uShockA.value = shockA;
      u.uC1.value.copy(world.c1);
      u.uC2.value.copy(world.c2);
      u.uC3.value.copy(world.c3);
      mesh.visible = world.wHead - world.wTail > 0.001 || shockA > 0.002 || flash > 0.002;
    },
  };
}
