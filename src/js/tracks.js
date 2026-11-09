const smooth = (t) => t * t * (3 - 2 * t);

/**
 * World parameters as a pure function of scroll position, so a section can never
 * inherit a stale value no matter how fast or far someone jumps.
 * keys: [[triggerId, fractionWithinTrigger, { param: value }], ...]
 */
export class Tracks {
  constructor(keys, linearParams = []) {
    this.keys = keys;
    this.linear = new Set(linearParams);
    this.tracks = new Map();
  }

  /** Re-resolve keys into pixel positions; call after every ScrollTrigger refresh. */
  resolve(triggers) {
    this.tracks.clear();
    for (const [id, frac, values] of this.keys) {
      const st = triggers[id];
      const y = st.start + (st.end - st.start) * frac;
      for (const [param, value] of Object.entries(values)) {
        if (!this.tracks.has(param)) this.tracks.set(param, []);
        this.tracks.get(param).push({ y, value });
      }
    }
    for (const list of this.tracks.values()) list.sort((a, b) => a.y - b.y);
  }

  apply(scrollY, target) {
    for (const [param, list] of this.tracks) {
      target[param] = this.sample(list, scrollY, this.linear.has(param));
    }
  }

  sample(list, y, linear) {
    if (y <= list[0].y) return list[0].value;
    const last = list[list.length - 1];
    if (y >= last.y) return last.value;
    for (let i = 1; i < list.length; i++) {
      const b = list[i];
      if (y > b.y) continue;
      const a = list[i - 1];
      const span = b.y - a.y;
      const t = span <= 0 ? 1 : (y - a.y) / span;
      return a.value + (b.value - a.value) * (linear ? t : smooth(t));
    }
    return last.value;
  }
}
