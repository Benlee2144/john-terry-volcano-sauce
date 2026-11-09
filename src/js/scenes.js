import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { SAUCES } from './data.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const lite = () => document.documentElement.classList.contains('lite');

export const STAGE_P0 = 0.03;
export const STAGE_P1 = 0.865;
export const STAGE_P2 = 0.93; // Amy's has finished turning to show her back label
export const stageAt = (p) => STAGE_P0 + (STAGE_P1 - STAGE_P0) * (p / (SAUCES.length - 1));

export function setupHero({ tl }) {
  tl.to('.hero-intro', { autoAlpha: 0, y: -60, scale: 1.06, duration: 0.09 }, 0.01);
  tl.fromTo('.nav-brand', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05 }, 0.14);
  const a = new SplitText('.fire-a', { type: 'lines' }).lines;
  const b = new SplitText('.fire-b', { type: 'lines' }).lines;
  tl.fromTo('.hero-fire', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 0.58);
  tl.fromTo(a, { xPercent: -70, scale: 1.7, autoAlpha: 0 }, { xPercent: 0, scale: 1, autoAlpha: 1, ease: 'expo.out', duration: 0.09, stagger: 0.015 }, 0.585);
  tl.fromTo(b, { xPercent: 70, scale: 1.7, autoAlpha: 0 }, { xPercent: 0, scale: 1, autoAlpha: 1, ease: 'expo.out', duration: 0.09, stagger: 0.015 }, 0.61);
  tl.fromTo('.fire-c span', { scale: 3, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, ease: 'expo.out', duration: 0.07, stagger: 0.02 }, 0.68);
  tl.to('.hero-fire', { autoAlpha: 0, scale: 1.5, duration: 0.09 }, 0.83);
}

export function setupManifesto({ tl }) {
  const words = new SplitText('.manifesto-text', { type: 'words' }).words;
  const n = words.length;
  if (lite()) {
    gsap.set(words, { opacity: 0.12, y: 26 });
    words.forEach((w, i) => tl.to(w, { opacity: 1, y: 0, duration: 0.03 }, 0.05 + (i / n) * 0.66));
    tl.to(words, { y: -50, opacity: 0, stagger: { amount: 0.08 }, duration: 0.07 }, 0.85);
    return;
  }
  gsap.set(words, { opacity: 0.1, y: 46, rotateX: -60, transformPerspective: 700, color: '#ffb22e' });
  words.forEach((w, i) => {
    const inEm = w.closest('em');
    const pos = 0.05 + (i / n) * 0.66;
    tl.to(w, { opacity: 1, y: 0, rotateX: 0, color: '#ffffff', duration: 0.03 }, pos);
    tl.to(w, { color: inEm ? '#ffc23a' : '#ffffff', duration: 0.05 }, pos + 0.03);
  });
  tl.to(words, { y: -110, opacity: 0, rotate: () => gsap.utils.random(-14, 14), color: '#ff4a0c', stagger: { amount: 0.08, from: 'random' }, duration: 0.07 }, 0.85);
}

function seismoPath(w, h) {
  let d = `M0 ${h / 2}`;
  for (let i = 1; i <= 420; i++) {
    const u = i / 420;
    const amp = (h / 2) * Math.pow(u, 2.3) * (0.3 + 0.7 * Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.113)));
    d += `L${((u * w)).toFixed(1)} ${(h / 2 + (i % 2 ? amp : -amp)).toFixed(1)}`;
  }
  return d;
}

export function setupScale({ tl }) {
  const line = $('.scale-line');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 1000 120');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.classList.add('scale-seis');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', seismoPath(1000, 120));
  path.setAttribute('pathLength', '1');
  const glow = path.cloneNode();
  glow.classList.add('glow');
  svg.append(glow, path);
  line.append(svg);

  const COLORS = ['#b9e64c', '#ffe14a', '#ff7a2a', '#ff5230', '#ff3b18', '#ff5cae'];
  const NAMES = ['Verde', 'Zaxe', 'Cajun', 'Shine', 'Ichiban', 'Amy'];
  const ticks = [];
  for (let v = 0; v <= 8; v++) {
    const t = document.createElement('div');
    t.className = 'scale-tick';
    t.style.left = `${(v / 8) * 100}%`;
    line.append(t);
    ticks.push(t);
  }
  const marks = SAUCES.map((s, i) => {
    const m = document.createElement('div');
    m.className = 'scale-mark';
    m.style.left = `${(s.vei / 8) * 100}%`;
    m.style.setProperty('--c', COLORS[i]);
    m.style.setProperty('--h', `${(s.vei / 8) * 100}%`);
    m.innerHTML = `<i class="scale-bar"></i><span class="scale-n">${s.vei}</span><span class="scale-name">${NAMES[i]}</span>`;
    line.append(m);
    return m;
  });

  const head = new SplitText('#scale h2', { type: 'lines', mask: 'lines' });
  gsap.set([glow, path], { strokeDasharray: 1, strokeDashoffset: 1 });
  tl.fromTo('#scale .kicker', { autoAlpha: 0, x: -30 }, { autoAlpha: 1, x: 0, duration: 0.05 }, 0.04);
  tl.fromTo(head.lines, { yPercent: 115, rotate: 2 }, { yPercent: 0, rotate: 0, ease: 'expo.out', duration: 0.14, stagger: 0.035 }, 0.05);
  tl.fromTo('.scale-sub', { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.06 }, 0.2);
  tl.fromTo(ticks, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02, stagger: 0.008 }, 0.28);
  tl.to([glow, path], { strokeDashoffset: 0, duration: 0.42 }, 0.3);
  SAUCES.forEach((s, i) => {
    const at = 0.3 + 0.42 * Math.pow(s.vei / 8, 1) - 0.03;
    const bar = $('.scale-bar', marks[i]);
    tl.fromTo(marks[i], { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, ease: 'back.out(3)', duration: 0.04 }, at);
    tl.fromTo(bar, { scaleY: 0 }, { scaleY: 1, ease: 'expo.out', duration: 0.07 }, at);
  });
  const counter = { v: 0 };
  const countEl = $('.scale-count');
  tl.fromTo('.scale-count', { autoAlpha: 0, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.05 }, 0.28);
  tl.to(counter, { v: 8, duration: 0.42, onUpdate: () => { countEl.textContent = Math.round(counter.v); } }, 0.3);
  tl.to('.scale-inner', { y: -60, duration: 0.2 }, 0.8);
}

export function setupStage({ tl }) {
  const chapters = $$('.chapter');
  chapters.forEach((ch, i) => {
    const light = lite();
    const split = new SplitText($('h3', ch), { type: light ? 'lines' : 'lines,chars', linesClass: 'ch-line', charsClass: 'ch-char' });
    if (!light) gsap.set(split.chars, { transformPerspective: 500, transformOrigin: '50% 100%' });
    const parts = light ? split.lines : split.chars;
    const partsFrom = light ? { y: 26, autoAlpha: 0 } : { yPercent: 125, rotateX: -85 };
    const partsIn = light ? { y: 0, autoAlpha: 1 } : { yPercent: 0, rotateX: 0 };
    const partsOut = light ? { y: -26, autoAlpha: 0 } : { yPercent: -125, rotateX: 85 };
    const num = $('.ch-num', ch);
    const rest = $$('.ch-rating, .ch-tag, .ch-desc, .ch-peppers', ch);
    const inStart = i === 0 ? 0 : stageAt(i - 0.3);
    const inDur = 0.034;
    const outStart = stageAt(i + 0.5);
    const outDur = 0.026;

    tl.set(ch, { visibility: 'visible' }, inStart);
    if (i > 0) {
      tl.fromTo(num, { autoAlpha: 0, scale: 2.6, rotate: i % 2 ? 12 : -12 }, { autoAlpha: 1, scale: 1, rotate: 0, ease: 'expo.out', duration: inDur * 1.1 }, inStart);
      tl.fromTo(parts, partsFrom, { ...partsIn, ease: 'expo.out', duration: inDur, stagger: 0.001 }, inStart + 0.004);
      tl.fromTo(rest, { autoAlpha: 0, x: 50 }, { autoAlpha: 1, x: 0, ease: 'power3.out', duration: inDur * 0.9, stagger: 0.003 }, inStart + 0.008);
    }
    if (i < chapters.length - 1) {
      tl.to(parts, { ...partsOut, ease: 'power3.in', duration: outDur, stagger: 0.0007 }, outStart);
      tl.to(rest, { autoAlpha: 0, x: -50, ease: 'power2.in', duration: outDur * 0.7, stagger: 0.002 }, outStart);
      tl.to(num, { autoAlpha: 0, scale: 0.4, rotate: i % 2 ? -14 : 14, ease: 'power2.in', duration: outDur }, outStart);
      tl.set(ch, { visibility: 'hidden' }, outStart + outDur + 0.003);
    }
  });
}

export function setupLineup({ tl }) {
  const cap = new SplitText('.lineup-cap', { type: 'lines,words', mask: 'lines' });
  tl.fromTo('.lineup-frame img', { scale: 3 }, { scale: 1, ease: 'power2.inOut', duration: 0.74 }, 0);
  tl.fromTo('.lineup-frame img', { yPercent: -3 }, { yPercent: 0, duration: 0.74 }, 0);
  tl.fromTo(cap.words, { yPercent: 120 }, { yPercent: 0, ease: 'expo.out', duration: 0.13, stagger: 0.012 }, 0.6);
}

export function setupTape(ScrollTrigger, id) {
  const sec = $(id);
  $$('.tape-run', sec).forEach((run, i) => {
    run.textContent = 'Veteran owned ✶ We might burn you with a few ✶ '.repeat(8);
    gsap.fromTo(run, { xPercent: i ? -24 : 0 }, { xPercent: i ? 0 : -24, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 0.3 } });
  });
  return ScrollTrigger.create({ trigger: sec, start: 'top bottom', end: 'bottom top' });
}

/** Horizontal label gallery that bends around the viewer like the inside of a cylinder. */
export function setupWall(ScrollTrigger, desktop) {
  if (!desktop) {
    return { st: ScrollTrigger.create({ trigger: '#wall', start: 'top bottom', end: 'bottom top' }), frame: () => {} };
  }
  const track = $('.wall-track');
  const cards = $$('.card');
  const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
  const st = ScrollTrigger.create({
    trigger: '#wall', start: 'top top', end: () => `+=${dist() * 1.15}`, pin: true, anticipatePin: 1,
    invalidateOnRefresh: true, animation: gsap.to(track, { x: () => -dist(), ease: 'none', paused: true }), scrub: true,
  });
  const setters = cards.map((c) => ({
    rotY: gsap.quickSetter(c, 'rotateY', 'deg'),
    z: gsap.quickSetter(c, 'z', 'px'),
    y: gsap.quickSetter(c, 'y', 'px'),
    rotZ: gsap.quickSetter(c, 'rotate', 'deg'),
  }));
  gsap.set(cards, { transformPerspective: 1500 });
  // Layout is read once per refresh, never inside the frame loop
  let centres = [];
  const measure = () => { centres = cards.map((c) => c.offsetLeft + c.offsetWidth / 2); };
  ScrollTrigger.addEventListener('refresh', measure);
  measure();
  const frame = (scrollY, world) => {
    if (scrollY < st.start - window.innerHeight || scrollY > st.end + window.innerHeight) return;
    const x = gsap.getProperty(track, 'x');
    const half = window.innerWidth / 2;
    setters.forEach((s, i) => {
      const u = (centres[i] + x - half) / half;
      const c = gsap.utils.clamp(-1.6, 1.6, u);
      s.rotY(-c * 46 + world.velS * 22);
      s.z(-Math.pow(Math.abs(c), 1.5) * 300);
      s.y(c * c * 34 * (i % 2 ? 1 : -1));
      s.rotZ(c * (i % 2 ? 4 : -4));
    });
  };
  return { st, frame };
}

export function setupFaceoff({ tl }) {
  const h = new SplitText('.faceoff h2', { type: 'lines,chars', mask: 'lines' });
  // Both faces are on screen from the first frame, creeping in before the slam, so the pin is never empty.
  tl.fromTo('.portrait-l', { xPercent: -58, scale: 1.5, rotate: -8 }, { xPercent: 7, scale: 1, rotate: 0, ease: 'power2.in', duration: 0.54 }, 0);
  tl.fromTo('.portrait-r', { xPercent: 58, scale: 1.5, rotate: 8 }, { xPercent: -7, scale: 1, rotate: 0, ease: 'power2.in', duration: 0.54 }, 0);
  tl.to('.portrait-l', { xPercent: -3, ease: 'expo.out', duration: 0.14 }, 0.54);
  tl.to('.portrait-r', { xPercent: 3, ease: 'expo.out', duration: 0.14 }, 0.54);
  tl.fromTo('.portrait', { backgroundPosition: '0% 100%' }, { backgroundPosition: '0% 0%', duration: 0.1 }, 0.5);
  tl.fromTo(h.chars, { yPercent: 130, scale: 1.6 }, { yPercent: 0, scale: 1, ease: 'expo.out', duration: 0.14, stagger: 0.006 }, 0.55);
}

/** Each beat of the story rests at storyAt(i), one screen of the pin apart. */
export const storyAt = (i) => 0.1 + i * 0.2;

export function setupStory({ tl }) {
  const beats = $$('.beat');
  beats.forEach((beat, i) => {
    const head = new SplitText($$('h2', beat), { type: 'lines', mask: 'lines' }).lines;
    const rest = $$('.kicker, .beat-text, .vet-badge, blockquote, .founders', beat);
    const at = storyAt(i);
    if (i > 0) {
      gsap.set(beat, { visibility: 'hidden' });
      tl.set(beat, { visibility: 'visible' }, at - 0.09);
      tl.fromTo(head, { yPercent: 115 }, { yPercent: 0, ease: 'expo.out', duration: 0.07, stagger: 0.008 }, at - 0.085);
      tl.fromTo(rest, { autoAlpha: 0, y: 34 }, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: 0.06, stagger: 0.006 }, at - 0.075);
    }
    if (i < beats.length - 1) {
      tl.to(head, { yPercent: -115, ease: 'power3.in', duration: 0.05, stagger: 0.005 }, at + 0.02);
      tl.to(rest, { autoAlpha: 0, y: -34, ease: 'power2.in', duration: 0.04 }, at + 0.02);
      tl.set(beat, { visibility: 'hidden' }, at + 0.085);
    }
  });
}

export function setupFind({ tl }) {
  const h = new SplitText('#find h2', { type: 'lines,chars', mask: false });
  tl.fromTo('.find-emblem', { scale: 0.15, y: 460, autoAlpha: 0, rotate: -24 }, { scale: 1, y: 0, autoAlpha: 1, rotate: 0, ease: 'expo.out', duration: 0.26 }, 0.08);
  tl.fromTo(h.chars, { scale: 3.4, autoAlpha: 0, rotate: () => gsap.utils.random(-22, 22) }, { scale: 1, autoAlpha: 1, rotate: 0, ease: 'expo.out', duration: 0.1, stagger: 0.018 }, 0.24);
  tl.fromTo('#find .kicker, .find-sub, .find-links li, .foot', { autoAlpha: 0, x: 70 }, { autoAlpha: 1, x: 0, ease: 'expo.out', duration: 0.12, stagger: 0.022 }, 0.62);
}
