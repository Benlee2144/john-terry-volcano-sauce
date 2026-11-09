import gsap from 'gsap';

const glide = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const NEAR = 6; // px that still counts as "at this stop"
const QUIET_MS = 160; // a pause this long ends a wheel gesture, including a trackpad's inertia tail
const WHEEL_START = 6;
const SWIPE_START = 24;
const SHOW_FRONT = 1.5; // seconds a bottle holds its front label before turning round
const TURN = 1.3;

/**
 * One gesture moves the page one stop. Stops are scroll positions; a stop with `back`
 * glides on to that position by itself after a short hold, on the way forward only.
 */
export function createStepper(lenis) {
  let stops = [];
  let target = -1;
  let lastDir = 1;
  let queued = 0;
  let movingUntil = 0;
  let turn = null;

  // wheel gesture
  let lastWheel = 0;
  let lastAbs = 0;
  let wheelSum = 0;
  let wheelSpent = false;
  // touch gesture
  let swipeX = 0;
  let swipeY = 0;
  let swipeSpent = false;

  const isMoving = () => performance.now() < movingUntil;

  function indexAt(y) {
    return stops.findIndex((s) => y >= s.y - NEAR && y <= (s.back ?? s.y) + NEAR);
  }

  function settle(i, dir) {
    movingUntil = 0;
    if (queued) {
      const d = queued;
      queued = 0;
      step(d);
      return;
    }
    const { back } = stops[i];
    if (dir > 0 && back != null) {
      turn = gsap.delayedCall(SHOW_FRONT, () => {
        turn = null;
        lenis.scrollTo(back, { duration: TURN, easing: glide, force: true });
      });
    }
  }

  function go(i, dir, seconds) {
    const stop = stops[i];
    if (!stop) return;
    turn?.kill();
    turn = null;
    queued = 0;
    target = i;
    lastDir = dir || lastDir;
    const screens = Math.abs(stop.y - lenis.scroll) / window.innerHeight;
    const duration = seconds ?? gsap.utils.clamp(1, 3.2, 0.8 + screens * 0.6);
    movingUntil = performance.now() + duration * 1000 + 300;
    lenis.scrollTo(stop.y, { duration, easing: glide, force: true, onComplete: () => settle(i, dir) });
  }

  function step(dir) {
    if (lenis.isStopped || !stops.length) return;
    const moving = isMoving();
    if (moving && dir === lastDir) {
      queued = dir;
      return;
    }
    const y = lenis.scroll;
    const from = moving ? target : indexAt(y);
    if (from >= 0) {
      go(from + dir, dir);
      return;
    }
    // Between stops, after dragging the scrollbar or following a focused link
    let to = -1;
    stops.forEach((s, i) => {
      if (dir > 0 ? to < 0 && s.y > y + NEAR : s.y < y - NEAR) to = i;
    });
    if (to >= 0) go(to, dir);
  }

  function onWheel(deltaY, now) {
    const abs = Math.abs(deltaY);
    // A long gap starts a new gesture, and so does a jump in force on top of a dying inertia tail
    if (now - lastWheel > QUIET_MS || (abs > 40 && abs > lastAbs * 2)) {
      wheelSpent = false;
      wheelSum = 0;
    }
    lastWheel = now;
    lastAbs = abs;
    if (wheelSpent) return;
    wheelSum += deltaY;
    if (Math.abs(wheelSum) < WHEEL_START) return;
    wheelSpent = true;
    step(Math.sign(wheelSum));
  }

  function onTouch(deltaX, deltaY, event) {
    if (event.type !== 'touchmove') {
      swipeX = swipeY = 0;
      swipeSpent = false;
      return;
    }
    if (event.touches.length > 1) return; // pinch zoom stays the browser's
    swipeX += deltaX;
    swipeY += deltaY;
    if (Math.abs(swipeX) > Math.abs(swipeY)) return; // sideways swipes belong to the gallery
    if (event.cancelable) event.preventDefault();
    if (swipeSpent || Math.abs(swipeY) < SWIPE_START) return;
    swipeSpent = true;
    step(Math.sign(swipeY));
  }

  /** Lenis hands every wheel and touch event here instead of scrolling with it. */
  function input({ deltaX, deltaY, event }) {
    if (event.ctrlKey) return true;
    if (event.type.startsWith('touch')) {
      onTouch(deltaX, deltaY, event);
      return false;
    }
    if (Math.abs(deltaX) > Math.abs(deltaY)) return false;
    if (event.cancelable) event.preventDefault();
    onWheel(deltaY, performance.now());
    return false;
  }

  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    let action;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) action = () => step(1);
    else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === ' ') action = () => step(-1);
    else if (e.key === 'Home') action = () => go(0, -1);
    else if (e.key === 'End') action = () => go(stops.length - 1, 1);
    if (!action) return;
    e.preventDefault();
    if (!e.repeat && !lenis.isStopped) action();
  });

  return {
    input,
    setStops(list) {
      stops = list;
    },
    /** Fly to the first stop at or past a scroll position (the nav links). */
    goTo(y) {
      const i = stops.findIndex((s) => s.y >= y - NEAR);
      go(i < 0 ? stops.length - 1 : i, 1, 1.8);
    },
  };
}
