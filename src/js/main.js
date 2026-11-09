import '@fontsource/big-shoulders-display/800';
import '@fontsource/big-shoulders-display/900';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource-variable/martian-mono';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { SAUCES } from './data.js';
import { GLWorld, createWorldState } from './gl/world.js';
import { initChoreo } from './choreo.js';
import { createStepper } from './stepper.js';

const html = document.documentElement;

function hasWebGL() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

const forceStatic = import.meta.env.DEV && window.location.search.includes('static');
const canAnimate = !forceStatic && hasWebGL() &&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.getElementById('year').textContent = new Date().getFullYear();

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => (img.decode ? img.decode().then(() => resolve(img), () => resolve(img)) : resolve(img));
    img.onerror = reject;
    img.src = src;
  });
}

function runSeismograph(state) {
  const path = document.getElementById('preSeis');
  const num = document.getElementById('preNum');
  let raf;
  const draw = (ms) => {
    let d = 'M0 40';
    const amp = 2 + state.p * 34;
    for (let x = 6; x <= 600; x += 6) {
      const n = Math.sin(x * 0.11 + ms * 0.013) * Math.sin(x * 0.037 - ms * 0.007) + (Math.random() - 0.5) * 0.9;
      const env = Math.sin((x / 600) * Math.PI);
      d += `L${x} ${(40 + n * amp * env).toFixed(1)}`;
    }
    path.setAttribute('d', d);
    num.textContent = (state.p * 8).toFixed(1);
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(raf);
}

async function boot() {
  html.classList.add('motion');
  window.history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const progress = { p: 0, target: 0 };
  const stopSeis = runSeismograph(progress);
  const stepTween = () => gsap.to(progress, { p: progress.target, duration: 0.5, overwrite: true, ease: 'power2.out' });

  const fontsReady = Promise.all([
    document.fonts.load('900 100px "Big Shoulders Display"', 'VOLCANO'),
    document.fonts.load('800 100px "Big Shoulders Display"', 'A'),
    document.fonts.load('400 40px "Instrument Serif"', 'A'),
    document.fonts.load('italic 400 40px "Instrument Serif"', 'A'),
    document.fonts.load('400 20px "Martian Mono Variable"', 'A'),
  ]);

  let done = 0;
  const total = SAUCES.length + 1;
  const bump = (x) => {
    done++;
    progress.target = done / total;
    stepTween();
    return x;
  };
  const [labelImages] = await Promise.all([
    Promise.all(SAUCES.map((s) => loadImage(`assets/label/${s.id}.webp`).then(bump))),
    fontsReady.then(bump),
  ]);

  const lowPower = window.innerWidth < 821 || window.matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
  html.classList.toggle('lite', lowPower);
  const world = createWorldState();
  const gl = new GLWorld({
    lavaCanvas: document.getElementById('lava'),
    bottleCanvas: document.getElementById('bottle'),
    world,
    lowPower,
    labelImages,
  });

  const lenis = new Lenis({ lerp: 0.13, wheelMultiplier: 1, smoothWheel: true });
  const stepper = createStepper(lenis);
  lenis.options.virtualScroll = stepper.input;
  if (import.meta.env.DEV) window.__volcano = { lenis, world, gsap, gl, stepper };
  const update = initChoreo({ world, stepper });
  lenis.on('scroll', ScrollTrigger.update);

  // Pointer melts the crust and nudges the bottle
  let heatTarget = 0;
  if (window.matchMedia('(hover: hover)').matches) {
    window.addEventListener('pointermove', (e) => {
      world.mouseU = e.clientX / window.innerWidth;
      world.mouseV = 1 - e.clientY / window.innerHeight;
      world.mx = (e.clientX / window.innerWidth - 0.5) * 2;
      world.my = (e.clientY / window.innerHeight - 0.5) * 2;
      heatTarget = 1;
    }, { passive: true });
  }

  gsap.ticker.lagSmoothing(0);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
    const v = gsap.utils.clamp(-1, 1, lenis.velocity / 60);
    world.velS += (v - world.velS) * 0.14;
    world.vel = Math.abs(world.velS);
    update(lenis.scroll);
    heatTarget *= 0.985;
    world.mouseHeat += (heatTarget - world.mouseHeat) * 0.08;
    gl.render(time);
  });

  // Decode every picture off-thread now, so none of them hitches the first time it scrolls into view
  // Phones keep the browser's lazy loading to spare memory.
  if (!lowPower) document.querySelectorAll('img:not(.ch-art)').forEach((img) => { img.loading = 'eager'; img.decode().catch(() => {}); });

  // Let the counter finish, then split the ground open
  await gsap.to(progress, { p: 1, duration: 0.5, ease: 'power2.inOut', overwrite: true }).then();
  await new Promise((r) => gsap.delayedCall(0.2, r));
  stopSeis();
  lenis.stop();
  const intro = gsap.timeline({ defaults: { ease: 'expo.inOut' } });
  intro.to('.pre-core', { autoAlpha: 0, scale: 1.08, duration: 0.5, ease: 'power2.in' }, 0);
  intro.to('.pre-top', { yPercent: -102, duration: 1.5 }, 0.3);
  intro.to('.pre-bottom', { yPercent: 102, duration: 1.5 }, 0.3);
  intro.from('.hero-names', { y: 34, autoAlpha: 0, duration: 1.2, ease: 'expo.out' }, 1.15);
  intro.from('.hero-foot > *', { y: 22, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.09 }, 1.3);
  intro.from('.nav nav', { y: -18, autoAlpha: 0, duration: 1, ease: 'expo.out' }, 1.2);
  intro.set('#preloader', { display: 'none' }, 1.85);
  intro.call(() => lenis.start(), null, 1.5);
}

if (canAnimate) {
  boot().catch((err) => {
    console.error(err);
    html.classList.remove('motion');
  });
}
