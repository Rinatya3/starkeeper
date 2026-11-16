// The wave director: composes each wave, trickles the swarm in from the
// edges, and calls for the boss every fifth wave.

import { CFG } from './config.js';
import { spawnAtEdge } from './enemies.js';
import { rng } from './random.js';

export class WaveDirector {
  constructor() {
    this.wave = 0;
    this.queue = [];
    this.spawnTimer = 0;
    this.betweenTimer = 0;
    this.active = false;
    this.announced = '';
    this.announceTime = 0;
  }

  get isBossWave() {
    return this.wave > 0 && this.wave % CFG.waves.bossEvery === 0;
  }

  compose(n) {
    const q = [];
    const moths = CFG.waves.baseMoths + CFG.waves.mothsPerWave * (n - 1);
    const count = this.isBossWaveFor(n) ? Math.ceil(moths / 2) : moths;
    for (let i = 0; i < count; i++) q.push('moth');
    if (n >= CFG.waves.dartsFromWave) {
      for (let i = 0; i < CFG.waves.dartsPerWave * (n - 1); i++) q.push('dart');
    }
    if (n >= CFG.waves.bulwarksFromWave) {
      for (let i = 0; i < 1 + Math.floor((n - 3) / 2); i++) q.push('bulwark');
    }
    if (n >= CFG.waves.spittersFromWave) {
      for (let i = 0; i < 1 + Math.floor((n - 4) / 2); i++) q.push('spitter');
    }
    // Shuffle, then put the boss last on boss waves.
    for (let i = q.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [q[i], q[j]] = [q[j], q[i]];
    }
    if (this.isBossWaveFor(n)) q.push('leviathan');
    return q;
  }

  isBossWaveFor(n) {
    return n % CFG.waves.bossEvery === 0;
  }

  startWave(n) {
    this.wave = n;
    this.queue = this.compose(n);
    this.spawnTimer = 0.4;
    this.active = true;
    this.announced = this.isBossWave ? `WAVE ${n} — THE LEVIATHAN STIRS` : `WAVE ${n}`;
    this.announceTime = 2.2;
  }

  startIntermission() {
    this.active = false;
    this.betweenTimer = CFG.waves.betweenWavesTime;
  }

  // Returns 'cleared' when the wave is fully dealt with.
  update(dt, enemies) {
    this.announceTime = Math.max(0, this.announceTime - dt);
    if (!this.active) return null;
    if (this.queue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = CFG.waves.spawnInterval;
        const kind = this.queue.shift();
        enemies.push(spawnAtEdge(kind, this.wave));
      }
      return null;
    }
    if (enemies.length === 0) {
      this.active = false;
      return 'cleared';
    }
    return null;
  }
}
