// Projectiles and pickups: the player's bolts, the swarm's orbs, and the
// light shards (and rare boons) enemies drop. Collisions live in main.js,
// which sees every entity at once.

import { CFG } from './config.js';
import { glowCircle } from './render.js';
import { rng } from './random.js';

export class Bullets {
  constructor() {
    this.list = [];
  }

  spawn(x, y, vx, vy, damage) {
    this.list.push({ x, y, vx, vy, damage, radius: CFG.player.bulletRadius, life: 1.4 });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > CFG.width + 20 || b.y < -20 || b.y > CFG.height + 20) {
        this.list.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const b of this.list) {
      glowCircle(ctx, b.x, b.y, 14, CFG.colors.bullet, 0.7);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export class Orbs {
  constructor() {
    this.list = [];
  }

  spawn(x, y, vx, vy) {
    this.list.push({ x, y, vx, vy, radius: 9, life: 6 });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const o = this.list[i];
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.life -= dt;
      if (o.life <= 0 || o.x < -30 || o.x > CFG.width + 30 || o.y < -30 || o.y > CFG.height + 30) {
        this.list.splice(i, 1);
      }
    }
  }

  draw(ctx, time) {
    for (const o of this.list) {
      const pulse = 1 + 0.15 * Math.sin(time * 8 + o.x);
      glowCircle(ctx, o.x, o.y, 22 * pulse, CFG.colors.orb, 0.6);
      ctx.fillStyle = '#ffd7ff';
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Drops: light shards (score + starlight), hull cells and rapid cores.
export class Shards {
  constructor() {
    this.list = [];
  }

  drop(x, y, kind = 'light') {
    const a = rng.angle();
    const sp = rng.range(30, 90);
    this.list.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      kind,
      life: 8,
      spin: rng.range(0, Math.PI * 2),
    });
  }

  update(dt, player) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const s = this.list[i];
      s.life -= dt;
      s.spin += dt * 3;
      if (s.life <= 0) {
        this.list.splice(i, 1);
        continue;
      }
      const dx = player.x - s.x;
      const dy = player.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d < player.stats.magnetRadius && d > 1) {
        const pull = 520 * (1 - d / player.stats.magnetRadius) + 120;
        s.vx += (dx / d) * pull * dt;
        s.vy += (dy / d) * pull * dt;
      }
      s.vx *= 1 - 2.4 * dt;
      s.vy *= 1 - 2.4 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
  }

  draw(ctx) {
    for (const s of this.list) {
      if (s.life < 2 && Math.floor(s.life * 6) % 2 === 0) continue;
      const color = s.kind === 'light' ? CFG.colors.shard : s.kind === 'hull' ? CFG.colors.ok : '#7db4ff';
      glowCircle(ctx, s.x, s.y, 16, color, 0.5);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.spin);
      const r = s.kind === 'light' ? 7 : 9;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.7, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}
