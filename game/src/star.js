// The newborn star: the thing the player defends. Its light is the run's
// real health bar; enemies that reach it drain it, shards restore it.

import { CFG } from './config.js';
import { bar, glowCircle, text } from './render.js';

export class Star {
  constructor() {
    this.x = CFG.star.x;
    this.y = CFG.star.y;
    this.radius = CFG.star.radius;
    this.maxLight = CFG.star.maxLight;
    this.light = CFG.star.maxLight;
    this.pulse = 0;
    this.hitFlash = 0;
  }

  get alive() {
    return this.light > 0;
  }

  get fraction() {
    return Math.max(0, this.light / this.maxLight);
  }

  breach(kind) {
    const damage = CFG.star.breachDamage[kind] ?? 6;
    this.light = Math.max(0, this.light - damage);
    this.hitFlash = 1;
    return damage;
  }

  orbHit() {
    this.light = Math.max(0, this.light - 3);
    this.hitFlash = 1;
  }

  restore(amount) {
    this.light = Math.min(this.maxLight, this.light + amount);
  }

  update(dt) {
    this.pulse += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt * 2.5);
  }

  draw(ctx) {
    const breathe = 1 + 0.06 * Math.sin(this.pulse * 2.2);
    const r = this.radius * breathe;
    glowCircle(ctx, this.x, this.y, r * 3.4, CFG.colors.starGlow, 0.35);
    glowCircle(ctx, this.x, this.y, r * 2.0, CFG.colors.starRing, 0.5);
    // Corona spikes.
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.pulse * 0.25);
    ctx.strokeStyle = 'rgba(255, 215, 106, 0.55)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const len = r * (1.25 + 0.18 * Math.sin(this.pulse * 3 + i));
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.restore();
    // Core.
    const core = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.55, CFG.colors.starCore);
    core.addColorStop(1, CFG.colors.starRing);
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
    // Hit flash ring.
    if (this.hitFlash > 0) {
      ctx.globalAlpha = this.hitFlash;
      ctx.strokeStyle = '#ff5d5d';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Light ring around the star: the fraction left, at a glance.
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r + 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = this.fraction > 0.3 ? CFG.colors.starGlow : CFG.colors.danger;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r + 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.fraction);
    ctx.stroke();
  }

  // The star's light bar in the HUD, top center.
  drawHud(ctx) {
    const w = 320;
    const x = CFG.width / 2 - w / 2;
    const y = 18;
    text(ctx, 'STARLIGHT', CFG.width / 2, y - 8, 12, CFG.colors.hud, 'center', 'bold');
    bar(ctx, x, y, w, 14, this.fraction, this.fraction > 0.3 ? CFG.colors.starGlow : CFG.colors.danger);
  }
}
