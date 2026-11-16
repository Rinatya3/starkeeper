// The lighthouse ship: movement, aiming, shooting, dashing, hull, and the
// upgrades it collects between waves.

import { CFG } from './config.js';
import { glowCircle, polygon } from './render.js';

export class Player {
  constructor() {
    this.x = CFG.width / 2;
    this.y = CFG.height - 140;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2;
    this.radius = CFG.player.radius;
    this.hull = CFG.player.maxHull;
    this.maxHull = CFG.player.maxHull;
    this.fireTimer = 0;
    this.invulnerable = 0;
    this.dashTime = 0;
    this.dashCooldown = 0;
    this.dashDir = { x: 0, y: -1 };
    this.rapidTime = 0;
    this.shieldTime = 0;
    this.dashCooldownMult = 1;
    this.dead = false;
    // Upgradeable stats.
    this.stats = {
      speed: CFG.player.speed,
      fireInterval: CFG.player.fireInterval,
      damage: CFG.player.bulletDamage,
      bulletCount: 1,
      magnetRadius: CFG.player.magnetRadius,
    };
    this.thrust = 0;
  }

  reset() {
    const fresh = new Player();
    Object.assign(this, fresh);
  }

  get alive() {
    return !this.dead;
  }

  // Aim at the mouse; before the mouse ever moves, aim at the nearest foe.
  aimAt(input, enemies) {
    if (input.mouse.moved) {
      this.angle = Math.atan2(input.mouse.y - this.y, input.mouse.x - this.x);
      return;
    }
    let best = null;
    let bestDist = Infinity;
    for (const e of enemies) {
      const d = (e.x - this.x) ** 2 + (e.y - this.y) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    if (best) this.angle = Math.atan2(best.y - this.y, best.x - this.x);
  }

  update(dt, input, enemies, bullets, audio, particles) {
    if (this.dead) return;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.rapidTime = Math.max(0, this.rapidTime - dt);
    this.shieldTime = Math.max(0, this.shieldTime - dt);
    this.fireTimer -= dt;

    this.aimAt(input, enemies);

    const axis = input.axis();
    if (this.dashTime > 0) {
      this.dashTime -= dt;
      this.vx = this.dashDir.x * CFG.player.dashSpeed;
      this.vy = this.dashDir.y * CFG.player.dashSpeed;
      particles.trail(this.x, this.y, CFG.colors.player);
    } else {
      const wantDash = input.wasPressed('ShiftLeft') || input.wasPressed('ShiftRight') || input.wasPressed('DashMouse');
      if (wantDash && this.dashCooldown <= 0 && (axis.x !== 0 || axis.y !== 0)) {
        this.dashTime = CFG.player.dashTime;
        this.dashCooldown = CFG.player.dashCooldown * this.dashCooldownMult;
        this.dashDir = { x: axis.x, y: axis.y };
        this.invulnerable = Math.max(this.invulnerable, CFG.player.dashTime + 0.05);
        audio.dash();
      }
      const speed = this.stats.speed;
      const k = 1 - Math.exp(-dt * 14);
      this.vx += (axis.x * speed - this.vx) * k;
      this.vy += (axis.y * speed - this.vy) * k;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const m = this.radius + 4;
    this.x = Math.max(m, Math.min(CFG.width - m, this.x));
    this.y = Math.max(m, Math.min(CFG.height - m, this.y));
    this.thrust = Math.min(1, Math.hypot(this.vx, this.vy) / this.stats.speed);

    // Fire: hold mouse or Space. Spread grows with bullet count.
    if (input.firing() && this.fireTimer <= 0) {
      const interval = this.rapidTime > 0 ? this.stats.fireInterval * 0.55 : this.stats.fireInterval;
      this.fireTimer = interval;
      const n = this.stats.bulletCount;
      for (let i = 0; i < n; i++) {
        const spread = (i - (n - 1) / 2) * 0.14;
        const a = this.angle + spread;
        bullets.spawn(
          this.x + Math.cos(a) * (this.radius + 6),
          this.y + Math.sin(a) * (this.radius + 6),
          Math.cos(a) * CFG.player.bulletSpeed,
          Math.sin(a) * CFG.player.bulletSpeed,
          this.stats.damage,
        );
      }
      audio.shoot();
      particles.trail(this.x + Math.cos(this.angle) * (this.radius + 8), this.y + Math.sin(this.angle) * (this.radius + 8), CFG.colors.bullet);
    }
  }

  takeHit() {
    if (this.invulnerable > 0 || this.dead) return false;
    if (this.shieldTime > 0) {
      this.shieldTime = 0;
      this.invulnerable = 0.8;
      return 'shield';
    }
    this.hull -= 1;
    this.invulnerable = CFG.player.invulnerableTime;
    if (this.hull <= 0) this.dead = true;
    return true;
  }

  heal(amount) {
    this.hull = Math.min(this.maxHull, this.hull + amount);
  }

  draw(ctx, time) {
    if (this.dead) return;
    if (this.invulnerable > 0 && Math.floor(time * 14) % 2 === 0 && this.dashTime <= 0) {
      ctx.globalAlpha = 0.45;
    }
    glowCircle(ctx, this.x, this.y, 44, CFG.colors.playerGlow, 0.35);
    // Engine flame.
    const back = this.angle + Math.PI;
    const flame = 10 + this.thrust * 14 + Math.sin(time * 30) * 3;
    polygon(ctx, [
      [this.x + Math.cos(back + 0.35) * 10, this.y + Math.sin(back + 0.35) * 10],
      [this.x + Math.cos(back) * (14 + flame), this.y + Math.sin(back) * (14 + flame)],
      [this.x + Math.cos(back - 0.35) * 10, this.y + Math.sin(back - 0.35) * 10],
    ], '#ffb84d');
    // Hull: a swept arrowhead pointing at the aim.
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    polygon(ctx, [[22, 0], [-12, -13], [-6, 0], [-12, 13]], '#d9fbff', CFG.colors.player, 2);
    polygon(ctx, [[8, 0], [-6, -6], [-6, 6]], CFG.colors.playerGlow);
    ctx.restore();
    // Shield bubble.
    if (this.shieldTime > 0) {
      ctx.strokeStyle = 'rgba(125, 255, 178, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
