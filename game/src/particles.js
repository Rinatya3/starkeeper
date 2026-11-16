// Particles, floating score text, and screen shake: the feedback layer
// that makes every hit, pickup and explosion feel answered.

import { rng } from './random.js';

export class Particles {
  constructor() {
    this.list = [];
  }

  burst(x, y, color, count = 18, speed = 260, life = 0.6, size = 3) {
    for (let i = 0; i < count; i++) {
      const a = rng.angle();
      const sp = speed * rng.range(0.25, 1);
      this.list.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: life * rng.range(0.5, 1.1),
        maxLife: life,
        size: size * rng.range(0.6, 1.5),
        color,
        drag: 2.2,
      });
    }
  }

  trail(x, y, color) {
    this.list.push({
      x, y,
      vx: rng.range(-20, 20),
      vy: rng.range(-20, 20),
      life: 0.3,
      maxLife: 0.3,
      size: rng.range(1.5, 3),
      color,
      drag: 0,
    });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.list.splice(i, 1);
        continue;
      }
      const d = 1 - p.drag * dt;
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  draw(ctx) {
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

export class FloatingTexts {
  constructor() {
    this.list = [];
  }

  add(x, y, str, color, size = 18) {
    this.list.push({ x, y, str, color, size, life: 0.9, maxLife: 0.9 });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const t = this.list[i];
      t.life -= dt;
      t.y -= 46 * dt;
      if (t.life <= 0) this.list.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const t of this.list) {
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.font = `bold ${t.size}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}

export class Shake {
  constructor() {
    this.trauma = 0;
  }

  add(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt) {
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
  }

  offset() {
    const mag = this.trauma * this.trauma * 14;
    return { x: rng.range(-mag, mag), y: rng.range(-mag, mag) };
  }
}
