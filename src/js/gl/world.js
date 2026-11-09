import * as THREE from 'three';
import { SAUCES, DEFAULT_PALETTE, HERO_SAUCE } from '../data.js';
import { LavaLayer, rawColor } from './lava.js';
import { createBottle } from './bottle.js';
import { createEmbers, createBurst } from './embers.js';
import { createOverlay } from './overlay.js';

const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const mix = (a, b, t) => a + (b - a) * t;

/** Live scene state. Scroll tracks write the numbers; the render loop only reads them. */
export function createWorldState() {
  return {
    time: 0,
    // lava
    heat: 0.7, flood: 0.85, dim: 1, mask: 1, zoomT: 0, outside: 0.1, haze: 0.4, embers: 0.8, calm: 0.6,
    palMix: 0,
    c1: new THREE.Vector3(), c2: new THREE.Vector3(), c3: new THREE.Vector3(),
    // pointer
    mouseU: 0.5, mouseV: 0.5, mouseHeat: 0, mx: 0, my: 0,
    // bottle
    bx: 0, by: -14, bz: 0, bs: 1, brot: 0, brz: 0,
    // Index progress: -1 = hero bottle, 0..5 = the six sauces
    p: -1,
    vei: 0,
    shake: 0,
    // curtain, impacts, scroll velocity
    wHead: -1, wTail: -1, wDir: 1, wDrip: 0, shockR: 0, shockA: 0, flash: 0, burst: 1, vel: 0, velS: 0,
  };
}

/** Everything about the Index that follows from p: which sauce, how far through the spin. */
export function stageState(p) {
  const last = SAUCES.length - 1;
  const clamped = Math.max(0, Math.min(last + 0.5, p));
  const i = Math.min(last, Math.floor(clamped));
  const next = Math.min(last, i + 1);
  const frac = clamped - i;
  const t = smoother(clamp01((frac - 0.5) / 0.5));
  // Before the change begins the bottle turns round and holds on its back label
  const back = smoother(clamp01((frac - 0.14) / 0.14));
  return { i, next, t, back };
}

function shrink(img, width) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = Math.round((img.naturalHeight / img.naturalWidth) * width);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}

export class GLWorld {
  constructor({ lavaCanvas, bottleCanvas, world, lowPower, labelImages }) {
    this.world = world;
    this.lowPower = lowPower;
    this.lastLava = -1;
    this.lastField = -1;
    this.bottleOn = true;
    this.lava = new LavaLayer(lavaCanvas, { lowPower });

    this.renderer = new THREE.WebGLRenderer({ canvas: bottleCanvas, alpha: true, antialias: !lowPower, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.maxDpr = lowPower ? 1.5 : 2;
    // A pixel budget, not just a DPR cap: a big external monitor must not cost more than a laptop screen
    this.maxPixels = lowPower ? 0.8e6 : 3.4e6;
    this.quality = 1;
    this.dtAvg = 1 / 60;
    this.tick = 0;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(22, 1, 0.1, 100);
    this.camera.position.z = 26;

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const labels = labelImages.map((img) => {
      const t = new THREE.Texture(lowPower ? shrink(img, 640) : img);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = Math.min(8, maxAniso);
      t.needsUpdate = true;
      return t;
    });
    this.bottle = createBottle(this.renderer, labels, lowPower);
    this.scene.add(this.bottle.group);

    this.key = new THREE.DirectionalLight(0xfff4ea, 2.1);
    this.key.position.set(-5, 6, 12);
    this.under = new THREE.PointLight(0xff5a14, 34, 40, 1.6);
    this.under.position.set(0, -8, 6);
    this.scene.add(this.key, this.under);

    this.embers = createEmbers(lowPower ? 50 : 280);
    this.burst = createBurst(lowPower ? 110 : 560);
    this.overlay = createOverlay();
    this.scene.add(this.embers, this.burst, this.overlay.mesh);
    this.emberT = 0;

    this.chapterColors = SAUCES.map((s) => [rawColor(s.c1), rawColor(s.c2), rawColor(s.c3)]);
    this.defaultColors = [rawColor(DEFAULT_PALETTE.c1), rawColor(DEFAULT_PALETTE.c2), rawColor(DEFAULT_PALETTE.c3)];
    this.tmp = new THREE.Vector3();
    this.smoothMx = 0;
    this.smoothMy = 0;
    this.shakeEls = [...document.querySelectorAll('.ch-num, .ch-left, .ch-right, .hero-fire, .find-inner, .faceoff')];

    this.frames = 0;
    this.slowFrames = 0;
    this.lastT = 0;
    this.visible = !document.hidden;
    document.addEventListener('visibilitychange', () => { this.visible = !document.hidden; });

    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
    this.onResize();
    this.renderer.compile(this.scene, this.camera); // no shader compiles mid-scroll
  }

  onResize(force) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (force !== true && this.lastW === w && this.lastH && Math.abs(this.lastH - h) < 120) return; // mobile URL bar
    this.lastW = w;
    this.lastH = h;
    this.lava.resize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxDpr, Math.sqrt((this.maxPixels * this.quality) / (w * h))));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.embers.material.uniforms.uPixel.value = this.renderer.getPixelRatio() * (h / 900);
    this.burst.material.uniforms.uPixel.value = this.renderer.getPixelRatio() * (h / 900);
    this.aspect = w / h;
    this.portrait = h / w > 1.05;
  }

  updateDerived() {
    const w = this.world;
    const inStage = w.p > -0.5;
    const st = stageState(w.p);
    const from = inStage ? st.i : HERO_SAUCE;
    const to = inStage ? st.next : HERO_SAUCE;
    const t = inStage ? st.t : 0;
    this.bottle.setSauce(from, to, t);

    const a = this.chapterColors[from];
    const b = this.chapterColors[to];
    [w.c1, w.c2, w.c3].forEach((c, k) => {
      this.tmp.copy(a[k]).lerp(b[k], t);
      c.copy(this.defaultColors[k]).lerp(this.tmp, w.palMix);
    });

    const sa = SAUCES[from];
    const sb = SAUCES[to];
    this.heat = mix(w.heat, mix(sa.heat, sb.heat, t), w.palMix);
    this.dim = mix(w.dim, mix(sa.dim, sb.dim, t), w.palMix);
    this.flood = mix(w.flood, mix(sa.flood, sb.flood, t), w.palMix);
    this.shake = mix(0, mix(sa.shake, sb.shake, t), w.palMix);
    // Half a turn to read the back, then 2.5 turns into the next sauce. Three full turns per change.
    this.spin = inStage ? (st.i + st.back * 0.5 + st.t * 2.5) * Math.PI * 2 : 0;
    this.readBack = inStage ? st.back * (1 - st.t) : 0;
    this.lunge = Math.sin(t * Math.PI);
    this.lungeDir = st.i % 2 ? 1 : -1;

    const m = w.palMix * (inStage ? 1 : 0);
    const amp = (0.3 + 0.7 * sb.shake) * this.lunge * this.lunge * m;
    const useStage = amp > w.shockA;
    this.shockA = useStage ? amp : w.shockA;
    this.shockR = useStage ? t * 1.8 : w.shockR;
    const swapFlash = Math.exp(-Math.pow((t - 0.5) * 8, 2)) * (0.1 + 0.42 * sb.shake) * m * (t > 0 && t < 1 ? 1 : 0);
    this.flash = Math.max(w.flash, swapFlash);
    this.burstT = inStage && t > 0.45 && t < 1 && m > 0.5 ? (t - 0.45) / 0.55 : w.burst;
    this.burstPower = 0.6 + sb.shake;
    return { sa, sb, t };
  }

  render(timeSec) {
    if (!this.visible) return;
    const dt = timeSec - this.lastT;
    this.lastT = timeSec;
    this.trackPerformance(dt);

    const w = this.world;
    w.time = timeSec;
    this.updateDerived();

    // The lava is slow-moving, so it never needs the display's full rate. The field is the costly pass and runs least.
    this.dtAvg += (Math.min(dt, 0.05) - this.dtAvg) * 0.06;
    this.tick++;
    const lavaEvery = this.lowPower ? 1 / 31 : 1 / 61;
    const fieldEvery = this.lowPower ? 1 / 21 : 1 / 31;
    if (!w.lavaCovered && timeSec - this.lastLava >= lavaEvery) {
      const drawField = timeSec - this.lastField >= fieldEvery;
      this.lastLava = timeSec;
      if (drawField) this.lastField = timeSec;
      this.lava.render({ ...w, heat: this.heat, dim: this.dim, flood: this.flood, shockR: this.shockR, shockA: this.shockA }, drawField);
    }

    this.smoothMx += (w.mx - this.smoothMx) * 0.06;
    this.smoothMy += (w.my - this.smoothMy) * 0.06;
    const g = this.bottle.group;
    g.visible = Math.abs(w.by) < 10.5 && w.bz < 26;
    const staged = this.portrait && w.p > -0.5;
    const swing = (this.portrait ? 0.45 : 2.9) * this.lunge * this.lungeDir;
    g.position.set(
      w.bx + swing,
      w.by + Math.sin(timeSec * 0.9) * 0.08 + (staged ? 1.6 : 0) + this.lunge * 0.7,
      w.bz + this.lunge * 3,
    );
    g.scale.setScalar(w.bs * (staged ? 0.64 : this.portrait ? 0.8 : 1) * (1 + this.readBack * (this.portrait ? 0.18 : 0.12)));
    g.rotation.set(
      this.smoothMy * 0.07 + w.velS * 0.42,
      w.brot + this.spin + this.smoothMx * 0.3 + Math.sin(timeSec * 0.45) * 0.08,
      w.brz + this.lunge * 0.62 * this.lungeDir + w.velS * 0.16,
    );

    const quake = this.shake * 0.55 + this.shockA * 1.1 + w.vel * 0.25;
    this.camera.position.x = Math.sin(timeSec * 47) * 0.075 * quake;
    this.camera.position.y = Math.cos(timeSec * 53) * 0.075 * quake;
    this.setDomShake(timeSec, this.lowPower ? 0 : this.shockA * 0.9);
    this.under.color.setRGB(w.c2.x, w.c2.y, w.c2.z, THREE.SRGBColorSpace);

    this.emberT += Math.max(0, Math.min(dt, 0.1)) * (1 + w.vel * 7);
    const e = this.embers.material.uniforms;
    e.uTime.value = this.emberT;
    e.uIntensity.value = w.embers * clamp01((w.embers - 0.4) / 0.2) * (0.65 + this.heat * 0.7) * (1 + w.vel * 1.4);
    e.uHot.value.copy(w.c3);
    e.uMid.value.copy(w.c2);

    const b = this.burst.material.uniforms;
    this.burst.visible = this.burstT > 0.001 && this.burstT < 0.999;
    b.uT.value = this.burstT;
    b.uIntensity.value = this.burstPower;
    b.uOrigin.value.set(g.position.x, g.position.y, g.position.z);
    b.uHot.value.copy(w.c3);
    b.uMid.value.copy(w.c2);

    this.overlay.update(w, { time: timeSec, aspect: this.aspect, shockR: this.shockR, shockA: this.shockA, flash: this.flash });

    // With no bottle, curtain or sparks in play the whole layer leaves the compositor
    const active = g.visible || this.overlay.mesh.visible || this.burst.visible || w.embers > 0.4;
    if (active !== this.bottleOn) {
      this.bottleOn = active;
      this.renderer.domElement.style.visibility = active ? '' : 'hidden';
    }
    if (!active) return;
    if (this.lowPower && this.degraded && this.dtAvg < 0.025 && this.tick % 2) return;
    this.renderer.render(this.scene, this.camera);
  }

  /** Shake page text on impacts. Written straight to the few elements involved, so the page never restyles. */
  setDomShake(t, amount) {
    if (amount < 0.02) {
      if (this.domShaking) {
        this.shakeEls.forEach((el) => { el.style.translate = ''; });
        this.domShaking = false;
      }
      return;
    }
    this.domShaking = true;
    const value = `${(Math.sin(t * 61) * 7 * amount).toFixed(1)}px ${(Math.cos(t * 67) * 7 * amount).toFixed(1)}px`;
    this.shakeEls.forEach((el) => { el.style.translate = value; });
  }

  trackPerformance(dt) {
    if (dt <= 0 || dt > 0.5 || this.degraded >= 3) return;
    this.frames++;
    if (dt > 1 / 48) this.slowFrames++;
    if (this.frames >= 60) {
      if (this.slowFrames > 24) {
        this.degraded = (this.degraded || 0) + 1;
        this.quality *= 0.7;
        this.lava.degrade();
        this.onResize(true);
      }
      this.frames = 0;
      this.slowFrames = 0;
    }
  }
}
