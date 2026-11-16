// The void swarm: five enemy kinds, each with its own shape, movement and
// threat, all converging on the star.

import { CFG } from './config.js';
import { glowCircle, polygon } from './render.js';
import { rng } from './random.js';

function base(kind, x, y, speedMult, hullMult) {
  const s = CFG.enemies[kind];
  const hull = Math.max(1, Math.round(s.hull * hullMult));
  return {
    kind, x, y,
    vx: 0, vy: 0,
    radius: s.radius,
    speed: s.speed * speedMult,
    hull, maxHull: hull,
    score: s.score,
    wobble: rng.range(0, Math.PI * 2),
    shotTimer: rng.range(0.5, s.shotInterval ?? 2),
    spawnTimer: 3,
    angle: 0,
    hitFlash: 0,
  };
}

export function spawnEnemy(kind, x, y, wave) {
  const speedMult = 1 + CFG.waves.speedGrowth * (wave - 1);
  const hullMult = 1 + CFG.waves.hullGrowth * (wave - 1);
  return base(kind, x, y, speedMult, hullMult);
}

export function spawnAtEdge(kind, wave) {
  const side = rng.int(0, 3);
  const m = 30;
  let x;
  let y;
  if (side === 0) { x = rng.range(m, CFG.width - m); y = m; } else if (side === 1) { x = rng.range(m, CFG.width - m); y = CFG.height - m; } else if (side === 2) { x = m; y = rng.range(m, CFG.height - m); } else { x = CFG.width - m; y = rng.range(m, CFG.height - m); }
  return spawnEnemy(kind, x, y, wave);
}

export function updateEnemies(enemies, dt, star, player, orbs, onSpawn) {
  for (const e of enemies) {
    e.hitFlash = Math.max(0, e.hitFlash - dt * 6);
    e.wobble += dt * (CFG.enemies[e.kind].wobble ?? 1);
    const dx = star.x - e.x;
    const dy = star.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    const px = -ny;
    const py = nx;

    if (e.kind === 'spitter') {
      const hold = CFG.enemies.spitter.holdRange;
      const toward = dist > hold ? 1 : dist < hold - 60 ? -0.6 : 0;
      e.vx = (nx * toward + px * 0.5 * Math.sin(e.wobble)) * e.speed;
      e.vy = (ny * toward + py * 0.5 * Math.sin(e.wobble)) * e.speed;
      e.shotTimer -= dt;
      if (e.shotTimer <= 0 && dist < hold + 120) {
        e.shotTimer = CFG.enemies.spitter.shotInterval;
        const sp = CFG.enemies.spitter.orbSpeed;
        orbs.spawn(e.x, e.y, nx * sp, ny * sp);
      }
    } else if (e.kind === 'leviathan') {
      const hold = 280;
      const toward = dist > hold ? 1 : 0;
      e.vx = (nx * toward + px * 0.45) * e.speed;
      e.vy = (ny * toward + py * 0.45) * e.speed;
      e.shotTimer -= dt;
      if (e.shotTimer <= 0) {
        e.shotTimer = CFG.enemies.leviathan.shotInterval;
        const sp = CFG.enemies.leviathan.orbSpeed;
        const baseAngle = Math.atan2(player.y - e.y, player.x - e.x);
        for (let i = -1; i <= 1; i++) {
          const a = baseAngle + i * 0.28;
          orbs.spawn(e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp);
        }
      }
      e.spawnTimer -= dt;
      if (e.spawnTimer <= 0) {
        e.spawnTimer = 4;
        onSpawn('moth', e.x, e.y);
        onSpawn('moth', e.x, e.y);
      }
    } else {
      const weave = e.kind === 'dart' ? 0.7 : e.kind === 'moth' ? 0.45 : 0.1;
      const wob = Math.sin(e.wobble) * weave;
      e.vx = (nx + px * wob) * e.speed;
      e.vy = (ny + py * wob) * e.speed;
    }
    e.angle = Math.atan2(e.vy, e.vx);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }

  // Gentle separation so the swarm does not stack into one blob.
  for (let i = 0; i < enemies.length; i++) {
    for (let j = i + 1; j < enemies.length; j++) {
      const a = enemies[i];
      const b = enemies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = a.radius + b.radius;
      if (d > 0 && d < min) {
        const push = ((min - d) / d) * 0.5;
        a.x -= dx * push * 0.5;
        a.y -= dy * push * 0.5;
        b.x += dx * push * 0.5;
        b.y += dy * push * 0.5;
      }
    }
  }
}

export function damageEnemy(e, damage) {
  e.hull -= damage;
  e.hitFlash = 1;
  return e.hull <= 0;
}

function drawMoth(ctx, e, time) {
  const flap = Math.sin(time * 10 + e.wobble) * 0.5;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  glowCircle(ctx, 0, 0, 34, CFG.colors.moth, 0.3);
  ctx.fillStyle = CFG.colors.moth;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.rotate(side * (0.5 + flap * 0.4));
    ctx.beginPath();
    ctx.ellipse(side * 10, 0, 12, 7, side * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#f3e4ff';
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDart(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  glowCircle(ctx, 0, 0, 26, CFG.colors.dart, 0.3);
  polygon(ctx, [[16, 0], [-10, -8], [-5, 0], [-10, 8]], CFG.colors.dart, '#ffd7e4', 1.5);
  ctx.restore();
}

function drawBulwark(ctx, e, time) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(time * 0.4 + e.wobble);
  glowCircle(ctx, 0, 0, 52, CFG.colors.bulwark, 0.3);
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    pts.push([Math.cos(a) * e.radius, Math.sin(a) * e.radius]);
  }
  polygon(ctx, pts, '#5a2b12', CFG.colors.bulwark, 3);
  ctx.fillStyle = CFG.colors.bulwark;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSpitter(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.angle);
  glowCircle(ctx, 0, 0, 36, CFG.colors.spitter, 0.3);
  polygon(ctx, [[18, 0], [0, -13], [-18, 0], [0, 13]], '#20331a', CFG.colors.spitter, 2);
  ctx.fillStyle = CFG.colors.spitter;
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLeviathan(ctx, e, time) {
  ctx.save();
  ctx.translate(e.x, e.y);
  glowCircle(ctx, 0, 0, 130, CFG.colors.leviathan, 0.35);
  ctx.rotate(time * 0.3);
  ctx.fillStyle = '#4a0f1e';
  ctx.strokeStyle = CFG.colors.leviathan;
  ctx.lineWidth = 3;
  ctx.beginPath();
  const spikes = 9;
  for (let i = 0; i <= spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? e.radius : e.radius * 0.72;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.rotate(-time * 0.6);
  ctx.fillStyle = '#ff8ba0';
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Boss health bar.
  const w = 220;
  const x = e.x - w / 2;
  const y = e.y - e.radius - 26;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x - 2, y - 2, w + 4, 12);
  ctx.fillStyle = CFG.colors.leviathan;
  ctx.fillRect(x, y, w * Math.max(0, e.hull / e.maxHull), 8);
}

export function drawEnemies(ctx, enemies, time) {
  for (const e of enemies) {
    if (e.kind === 'moth') drawMoth(ctx, e, time);
    else if (e.kind === 'dart') drawDart(ctx, e);
    else if (e.kind === 'bulwark') drawBulwark(ctx, e, time);
    else if (e.kind === 'spitter') drawSpitter(ctx, e);
    else if (e.kind === 'leviathan') drawLeviathan(ctx, e, time);
    if (e.hitFlash > 0) {
      ctx.globalAlpha = e.hitFlash * 0.7;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}
