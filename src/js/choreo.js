import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { SAUCES } from './data.js';
import { Tracks } from './tracks.js';
import { stageState } from './gl/world.js';
import {
  STAGE_P0, STAGE_P1, setupHero, setupManifesto, setupScale, setupStage, setupLineup,
  setupTape, setupWall, setupFaceoff, setupBody, setupFind,
} from './scenes.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

/** One impact: a shock ring from screen centre plus a short flash. */
const boom = (id, f, len, amp, flash = 0.3) => [
  [id, f, { shockR: 0, shockA: 0, flash: 0 }],
  [id, f + 0.004, { shockA: amp, flash }],
  [id, f + len * 0.5, { flash: 0 }],
  [id, f + len, { shockR: 1.8, shockA: 0 }],
];

/** A curtain that has fully passed collapses to zero width and re-arms below the screen. */
const rearm = (id, f) => [
  [id, f, { wHead: 1.6, wTail: 1.6 }],
  [id, f + 0.001, { wHead: -0.6, wTail: -0.6 }],
];

const KEYS = [
  // HERO: dive through the letters, the bottle lands, then flies through the camera
  ['hero', 0, {
    calm: 0.6, heat: 0.72, flood: 0.84, dim: 1, mask: 1, zoomT: 0, outside: 0.085, haze: 0.4, embers: 0.7, palMix: 0,
    by: -14, bz: 0, bs: 1, brot: -4.4, brz: 0, gauge: 0, p: -1, burst: 0,
    wHead: -0.6, wTail: -0.6, wDir: 1, wDrip: 0,
  }],
  ['hero', 0.3, { by: -14 }],
  ['hero', 0.36, { zoomT: 1, flood: 1, heat: 0.92 }],
  ['hero', 0.37, { mask: 1 }],
  ['hero', 0.4, { mask: 0, haze: 1, calm: 1 }],
  ...boom('hero', 0.35, 0.12, 0.9, 0.42),
  ['hero', 0.595, { by: 0, brot: 0, burst: 0 }],
  ['hero', 0.72, { burst: 1 }],
  ...boom('hero', 0.59, 0.16, 1.1, 0.32),
  ['hero', 0.84, { by: 0, bz: 0, brot: 0.22, brz: 0, flood: 1, dim: 1, heat: 0.92, haze: 1, embers: 0.7 }],
  ['hero', 1, { bz: 11, by: 0.5, brot: 2.4, brz: 0.5, flood: 0.03, heat: 0.12, dim: 0.42, haze: 0, embers: 0.3 }],
  ['manifesto', 0, { bz: 27, by: 3, brot: 4 }],

  // MANIFESTO
  ['manifesto', 0.02, { by: -14, bz: 27 }],
  ['manifesto', 0.03, { burst: 1 }],
  ['manifesto', 0.031, { burst: 0 }],
  ['manifesto', 0.04, { bz: 0, brz: 0, brot: 0 }],
  ['manifesto', 1, { heat: 0.2, flood: 0, dim: 0.4, p: -1, by: -14 }],

  // SCALE, then a lava front rises and the bottle arrives behind it
  ['scale', 0.05, { p: 0, heat: 0.18, dim: 0.32 }],
  ['scale', 0.82, { palMix: 0, by: -14, embers: 0.4, gauge: 0, wHead: -0.6, wDir: 1, wDrip: 0 }],
  ['scale', 0.99, { wTail: -0.6 }],
  ['scale', 1, { wHead: 1.6, gauge: 1, palMix: 1 }],
  ['stage', 0, { wTail: 1.6, by: 0, embers: 1, haze: 0.5, palMix: 1 }],
  ...rearm('stage', 0.001),

  // THE INDEX
  ['stage', STAGE_P0, { p: 0 }],
  ['stage', STAGE_P1, { p: 5 }],

  // Amy's turns to show her back label (p runs past 5), then tips over and pours: sauce drips down over everything
  ['stage', 0.93, { by: 0, brz: 0, bs: 1, gauge: 1, p: 5.5 }],
  ['stage', 0.955, { wHead: -0.6, wTail: -0.6, wDir: -1, wDrip: 1 }],
  ['stage', 1, { by: 2.8, brz: 2.5, wHead: 1.6, heat: 0.3, flood: 0, dim: 0.3, haze: 0 }],
  ['lineup', 0, { wTail: 1.6, by: 16, brz: 0, palMix: 0, gauge: 0, embers: 0.35 }],
  ...rearm('lineup', 0.001),
  ['lineup', 0.004, { wDir: -1, wDrip: 1 }],

  // GALLERY, then another front into the face-off
  ['wall', 0, { heat: 0.24, dim: 0.26 }],
  ['wall', 0.9, { wHead: -0.6, wTail: -0.6, wDir: 1, wDrip: 0 }],
  ['wall', 1, { wHead: 1.6, wTail: -0.6 }],
  ['makers', 0, { wTail: 1.6, heat: 0.3, dim: 0.3 }],
  ...rearm('makers', 0.001),
  ...boom('makers', 0.54, 0.24, 1.3, 0.55),

  // ERUPTION
  ['tape2', 0.2, { wHead: -0.6, wTail: -0.6, flood: 0, heat: 0.3, dim: 0.3, calm: 1, haze: 0, embers: 0.4 }],
  ['tape2', 0.9, { wHead: 1.6, wTail: -0.6 }],
  ['tape2', 0.94, { flood: 1, heat: 1, dim: 1, haze: 1.1, embers: 1.5 }],
  ['find', 0.05, { wTail: 1.6 }],
  ...rearm('find', 0.051),
  ...boom('find', 0.12, 0.14, 1.2, 0.34),
  ['find', 0.12, { burst: 0 }],
  ['find', 0.42, { burst: 1 }],
  ...boom('find', 0.47, 0.14, 0.9, 0.2),
];

function pinned(trigger, length) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  tl.to({}, { duration: 0.001 }, 0.999);
  const st = ScrollTrigger.create({ trigger, start: 'top top', end: () => `+=${length()}`, pin: true, anticipatePin: 1, animation: tl, scrub: true });
  st.tl = tl;
  return st;
}

export function initChoreo({ world, lenis }) {
  ScrollTrigger.config({ ignoreMobileResize: true });
  const desktop = window.matchMedia('(min-width: 821px) and (min-aspect-ratio: 1/1)').matches;
  const vh = (n) => () => window.innerHeight * n;

  // Created strictly in page order so each pin's spacing is counted by everything below it.
  const t = {};
  t.hero = pinned('#hero', vh(3.4));
  setupHero(t.hero);
  t.manifesto = pinned('#manifesto', vh(2.4));
  setupManifesto(t.manifesto);
  t.scale = pinned('#scale', vh(3));
  setupScale(t.scale);
  t.stage = pinned('#stage', vh(desktop ? 8.4 : 7.6));
  setupStage(t.stage);
  t.lineup = pinned('#lineup', vh(1.7));
  setupLineup(t.lineup);
  t.tape1 = setupTape(ScrollTrigger, '#tape1');
  const wall = setupWall(ScrollTrigger, desktop);
  t.wall = wall.st;
  t.makers = pinned('.faceoff-pin', vh(2));
  setupFaceoff(t.makers);
  t.body = setupBody(ScrollTrigger);
  t.tape2 = setupTape(ScrollTrigger, '#tape2');
  t.find = pinned('#find', vh(2.6));
  setupFind(t.find);

  const tracks = new Tracks(KEYS, ['zoomT', 'p']);
  const resolve = () => tracks.resolve(t);
  ScrollTrigger.addEventListener('refresh', resolve);
  ScrollTrigger.refresh();
  resolve();

  document.querySelectorAll('[data-goto]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      lenis.scrollTo(t[a.dataset.goto].start + 2, { duration: 1.8 });
    });
  });

  // Crossing the desktop/phone layout needs different pins, so start clean.
  window.matchMedia('(min-width: 821px) and (min-aspect-ratio: 1/1)').addEventListener('change', () => window.location.reload());

  const gaugeEl = document.querySelector('.gauge');
  const fillEl = document.querySelector('.gauge-fill');
  const numEl = document.getElementById('gaugeNum');
  const skewHeads = gsap.quickSetter('.chapter h3', 'skewY', 'deg');
  let shown = -1;
  let lastSkew = 0;
  let lastFill = -1;
  let lastGauge = -1;

  return function update(scrollY) {
    tracks.apply(scrollY, world);
    let vei = 0;
    if (world.p >= 0) {
      const s = stageState(world.p);
      vei = SAUCES[s.i].vei + (SAUCES[s.next].vei - SAUCES[s.i].vei) * s.t;
    }
    if (world.gauge !== lastGauge) gaugeEl.style.opacity = lastGauge = world.gauge;
    if (vei !== lastFill) fillEl.style.transform = `scaleY(${(lastFill = vei) / 8})`;
    const rounded = Math.round(vei);
    if (rounded !== shown) {
      shown = rounded;
      numEl.textContent = rounded;
    }
    const skew = world.velS * -7;
    if (Math.abs(skew - lastSkew) > 0.03) skewHeads((lastSkew = skew));
    wall.frame(scrollY, world);
  };
}
