import * as THREE from 'three';

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }
`;

// Cooling basalt plates split by molten cracks. uFlood melts it all into open lava.
const LAVA_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime, uHeat, uFlood, uAspect, uMouseHeat, uCalm;
  uniform vec2 uMouse;
  uniform vec3 uC1, uC2, uC3;

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
    float a = hash2(i).x, b = hash2(i + vec2(1, 0)).x;
    float c = hash2(i + vec2(0, 1)).x, d = hash2(i + vec2(1, 1)).x;
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p) {
    float s = 0., a = .5;
    mat2 m = mat2(.8, .6, -.6, .8);
    for (int i = 0; i < 5; i++) { s += a * noise(p); p = m * p * 2.03; a *= .5; }
    return s;
  }
  // Distance to the nearest plate border (Voronoi F2-style border distance)
  float cracks(vec2 x, float t) {
    vec2 n = floor(x), f = fract(x), mg = vec2(0.), mr = vec2(0.);
    float md = 8.;
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = .5 + .5 * sin(t + 6.2831 * hash2(n + g));
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < md) { md = d; mr = r; mg = g; }
    }
    md = 8.;
    for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
      vec2 g = mg + vec2(float(i), float(j));
      vec2 o = .5 + .5 * sin(t + 6.2831 * hash2(n + g));
      vec2 r = g + o - f;
      if (dot(mr - r, mr - r) > 1e-5) md = min(md, dot(.5 * (mr + r), normalize(r - mr)));
    }
    return md;
  }

  void main() {
    vec2 p = vec2(vUv.x * uAspect, vUv.y) * 1.9;
    float t = uTime;
    vec2 q = vec2(fbm(p * .7 + vec2(0., t * .03)), fbm(p * .7 + vec2(5.2, 1.3 - t * .026)));
    vec2 w = p + (q - .5) * .95;
    float n = fbm(w * 1.4 + t * .05);
    float swell = smoothstep(.3, .72, fbm(w * .85 - t * .02));
    float e1 = cracks(w, t * .08);
    float e2 = cracks(w * 2.3 + 9., t * .13);

    // Fissures swell into pools in places and pinch shut in others
    float width = mix(.007, .13, uHeat) * (.25 + swell * 2.1);
    float c1 = 1. - smoothstep(width * .5, width, e1 + (n - .5) * .018);
    c1 += (1. - smoothstep(0., width * .42, e1)) * .55;
    float c2 = (1. - smoothstep(0., width * .34, e2 + (n - .5) * .02)) * smoothstep(.05, .22, e1) * (.2 + .55 * swell);
    float halo = exp(-e1 * mix(46., 15., uHeat)) * (.25 + swell);

    // Plate surface: rough basalt with pores still glowing inside
    float rough = fbm(w * 6.5 + 3.);
    float grit = fbm(w * 19.);
    float pores = smoothstep(.62, .78, grit) * smoothstep(.0, .3, halo + uHeat * .4) * uHeat;

    float m = max(c1 * (.66 + .5 * n), c2 * (.55 + .4 * n)) + halo * (.13 + .2 * n) + pores * .24;

    float d = length((vUv - uMouse) * vec2(uAspect, 1.));
    m += uMouseHeat * exp(-d * d * 26.) * (.12 + .75 * max(c1, halo));

    // Flooded state: open rivers of lava with cooler skin dragged across the top
    vec2 fw = w * 1.5 + vec2(t * .08, -t * .12);
    float flow = fbm(fw + (fbm(fw * 1.6 - t * .07) - .5) * 2.2);
    float ridges = pow(1. - abs(sin((flow + q.x * .3) * 17. + t * .3)), 4.);
    float skin = smoothstep(.56, .74, fbm(fw * 2.4 + 4. + t * .05));
    float open = .62 + (flow - .48) * 1.25 + ridges * .28 - skin * .42 * (1. - uCalm);
    open = mix(open, max(open, .56), uCalm);
    m = mix(m, open, smoothstep(0., 1., uFlood));

    float lit = rough * rough;
    vec3 rock = mix(vec3(.012, .009, .009), vec3(.11, .075, .066), lit * 1.5);
    rock *= .75 + grit * .6;
    vec3 col = rock + uC1 * halo * .9 * (.6 + rough);
    col = mix(col, uC1, smoothstep(.08, .3, m));
    col = mix(col, uC2, smoothstep(.27, .62, m));
    col = mix(col, uC3, smoothstep(.58, .92, m));
    col = mix(col, vec3(1., .93, .74), smoothstep(.96, 1.28, m) * .9 * smoothstep(.34, .8, uHeat));
    gl_FragColor = vec4(col, 1.);
  }
`;

const COMPOSITE_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tLava, tMask;
  uniform float uMaskAmt, uZoom, uOutside, uDim, uHaze, uTime, uAspect, uTwist, uVel, uShockR, uShockA;
  uniform vec2 uFocus;

  float rand(vec2 c) { return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    vec2 uv = vUv;
    vec2 cp = (vUv - .5) * vec2(uAspect, 1.);
    float dist = length(cp);
    if (uShockA > .002) {
      float k = exp(-pow((dist - uShockR) * 8., 2.)) * uShockA;
      uv -= normalize(cp + 1e-4) * k * .075 / vec2(uAspect, 1.);
    }
    uv.x += sin(uv.y * 34. + uTime * 2.6) * .0013 * uHaze;
    uv.y += cos(uv.x * 28. + uTime * 2.1) * .0016 * uHaze;
    // Fast scrolling tears the image into its color channels
    float split = .001 + uVel * .02;
    vec3 col = vec3(
      texture2D(tLava, uv + vec2(0., split)).r,
      texture2D(tLava, uv).g,
      texture2D(tLava, uv - vec2(0., split)).b
    );

    if (uMaskAmt > .001) {
      vec2 rel = (vUv - uFocus) * vec2(uAspect, 1.) / uZoom;
      float sn = sin(uTwist), cs = cos(uTwist);
      rel = mat2(cs, -sn, sn, cs) * rel;
      vec2 muv = uFocus + rel / vec2(uAspect, 1.);
      float inside = texture2D(tMask, muv).r;
      // Letters are windows onto the lava; everything else is cold rock
      vec3 lit = col * mix(uOutside, 1., inside);
      col = mix(col, lit, uMaskAmt);
    }

    // Dim like cooling metal: glow narrows and saturates instead of going grey
    col = pow(max(col, vec3(0.)), vec3(1. + (1. - uDim) * 1.5)) * (.42 + .58 * uDim);
    vec2 v = vUv - .5;
    col *= 1. - dot(v, v) * .85;
    col += (rand(vUv * 931. + fract(uTime)) - .5) * .028;
    gl_FragColor = vec4(col, 1.);
  }
`;

const raw = (hex) => new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
export const rawColor = raw;

// Rasterize VOLCANO / SAUCE and find a letter stem to dive into.
function drawMask(width, height) {
  const scale = Math.min(4096 / width, 2);
  const W = Math.round(width * scale);
  const H = Math.round(height * scale);
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';

  const family = '"Big Shoulders Display"';
  const portrait = H / W > 1.05;
  ctx.font = `900 1000px ${family}`;
  const ref = ctx.measureText('VOLCANO');
  const cap = ref.actualBoundingBoxAscent / 1000;
  const gap = portrait ? 0.1 : 0.13; // of font size
  const maxByW = (W * (portrait ? 0.92 : 0.955)) / (ref.width / 1000);
  const maxByH = (H * 0.635) / (cap * 2 + gap);
  const size = Math.min(maxByW, maxByH);
  ctx.font = `900 ${size}px ${family}`;

  const blockH = size * (cap * 2 + gap);
  const firstBase = (H - blockH) / 2 + size * cap + H * (portrait ? -0.02 : 0.05);
  const secondBase = firstBase + size * (cap + gap);
  const wV = ctx.measureText('VOLCANO').width;
  const wS = ctx.measureText('SAUCE').width;
  const pad = (W - wV) / 2;
  ctx.fillText('VOLCANO', pad, firstBase);
  ctx.fillText('SAUCE', portrait ? pad : W - pad - wS, secondBase);

  // Scan across the L's stem so the camera can fly into solid lava
  const lx = pad + ctx.measureText('VO').width;
  const row = Math.round(firstBase - size * cap * 0.55);
  const px = ctx.getImageData(0, row, W, 1).data;
  let a = Math.round(lx);
  while (a < W && px[a * 4] < 128) a++;
  let b = a;
  while (b < W && px[b * 4] >= 128) b++;
  const fx = (a + b) / 2 / W;
  const fy = 1 - row / H;
  const halfU = (b - a) / 2 / W;
  const aspect = W / H;
  const zoomEnd = (Math.hypot(Math.max(fx, 1 - fx) * aspect, Math.max(fy, 1 - fy)) / (halfU * aspect)) * 1.14;
  return { canvas: cv, focus: new THREE.Vector2(fx, fy), zoomEnd };
}

export class LavaLayer {
  constructor(canvas, { lowPower }) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.scaleLava = lowPower ? 0.38 : 0.66;
    this.maxDpr = lowPower ? 1.25 : 1.5;
    this.maxPixels = lowPower ? 1e6 : 2.4e6;
    this.maxLavaPixels = lowPower ? 0.32e6 : 0.9e6;
    this.quality = 1;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const quad = new THREE.PlaneGeometry(2, 2);
    this.lavaMat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: LAVA_FRAG,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 }, uHeat: { value: 0.7 }, uFlood: { value: 0.9 }, uAspect: { value: 1 }, uCalm: { value: 0.6 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) }, uMouseHeat: { value: 0 },
        uC1: { value: new THREE.Vector3() }, uC2: { value: new THREE.Vector3() }, uC3: { value: new THREE.Vector3() },
      },
    });
    this.compMat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: COMPOSITE_FRAG,
      depthTest: false,
      uniforms: {
        tLava: { value: null }, tMask: { value: null },
        uMaskAmt: { value: 1 }, uZoom: { value: 1 }, uOutside: { value: 0.1 },
        uDim: { value: 1 }, uHaze: { value: 0 }, uTime: { value: 0 },
        uAspect: { value: 1 }, uTwist: { value: 0 }, uVel: { value: 0 }, uShockR: { value: 0 }, uShockA: { value: 0 },
        uFocus: { value: new THREE.Vector2(0.3, 0.6) },
      },
    });
    this.lavaScene = new THREE.Scene();
    this.lavaScene.add(this.fsMesh(quad, this.lavaMat));
    this.compScene = new THREE.Scene();
    this.compScene.add(this.fsMesh(quad, this.compMat));
    this.target = new THREE.WebGLRenderTarget(4, 4, { depthBuffer: false });
    this.zoomEnd = 30;
  }

  fsMesh(geo, mat) {
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false;
    return m;
  }

  resize(w, h) {
    const area = w * h;
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr, Math.sqrt((this.maxPixels * this.quality) / area));
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    const lavaScale = Math.min(dpr * this.scaleLava, Math.sqrt((this.maxLavaPixels * this.quality) / area));
    this.target.setSize(Math.ceil(w * lavaScale), Math.ceil(h * lavaScale));
    this.lavaMat.uniforms.uAspect.value = w / h;
    this.compMat.uniforms.uAspect.value = w / h;

    const { canvas, focus, zoomEnd } = drawMask(w, h);
    this.compMat.uniforms.tMask.value?.dispose();
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    this.compMat.uniforms.tMask.value = tex;
    this.compMat.uniforms.uFocus.value.copy(focus);
    this.zoomEnd = zoomEnd;
  }

  /** Drop lava resolution when the device can't hold frame rate. */
  degrade() {
    this.quality *= 0.7;
    this.resize(window.innerWidth, window.innerHeight);
  }

  render(world) {
    const l = this.lavaMat.uniforms;
    const c = this.compMat.uniforms;
    l.uTime.value = world.time;
    l.uHeat.value = world.heat;
    l.uFlood.value = world.flood;
    l.uCalm.value = world.calm;
    l.uC1.value.copy(world.c1);
    l.uC2.value.copy(world.c2);
    l.uC3.value.copy(world.c3);
    l.uMouse.value.set(world.mouseU, world.mouseV);
    l.uMouseHeat.value = world.mouseHeat;
    c.uTime.value = world.time;
    c.uDim.value = world.dim;
    c.uMaskAmt.value = world.mask;
    c.uOutside.value = world.outside;
    c.uHaze.value = world.haze;
    c.uZoom.value = Math.exp(world.zoomT * Math.log(this.zoomEnd));
    c.uTwist.value = world.zoomT * world.zoomT * 1.5;
    c.uVel.value = world.vel;
    c.uShockR.value = world.shockR;
    c.uShockA.value = world.shockA;

    this.renderer.setRenderTarget(this.target);
    this.renderer.render(this.lavaScene, this.camera);
    this.renderer.setRenderTarget(null);
    c.tLava.value = this.target.texture;
    this.renderer.render(this.compScene, this.camera);
  }
}
