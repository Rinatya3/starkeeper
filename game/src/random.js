// Seeded randomness: the game plays on a random stream, and the screenshot
// staging reseeds it so a staged frame is reproducible.

export class RNG {
  constructor(seed = 1) {
    this.state = seed >>> 0 || 1;
  }

  reseed(seed) {
    this.state = seed >>> 0 || 1;
  }

  // mulberry32: small, fast, deterministic.
  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) {
    return min + this.next() * (max - min);
  }

  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }

  chance(p) {
    return this.next() < p;
  }

  angle() {
    return this.next() * Math.PI * 2;
  }
}

// The game's shared stream. Real play seeds it from the clock; staging
// reseeds it from the URL so screenshots are stable.
export const rng = new RNG((Date.now() ^ 0x9e3779b9) >>> 0);
