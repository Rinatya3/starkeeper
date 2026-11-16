// Screens: the title, the HUD, pause, the upgrade choice, and game over.
// All of them are drawn on the canvas, so the screenshots show the real game.

import { CFG } from './config.js';
import { bar, glowCircle, roundRect, text } from './render.js';

export function drawTitle(ctx, time, best) {
  // A big calm star behind the title.
  glowCircle(ctx, CFG.width / 2, 300, 260, CFG.colors.starGlow, 0.4);
  glowCircle(ctx, CFG.width / 2, 300, 120, CFG.colors.starCore, 0.7);
  ctx.fillStyle = '#fffbe8';
  ctx.beginPath();
  ctx.arc(CFG.width / 2, 300, 44 + Math.sin(time * 2) * 3, 0, Math.PI * 2);
  ctx.fill();

  text(ctx, 'STARKEEPER', CFG.width / 2, 130, 84, '#f4feff', 'center', 'bold');
  text(ctx, 'Defend the newborn star from the void swarm', CFG.width / 2, 185, 24, CFG.colors.starGlow, 'center', 'normal');

  text(ctx, 'WASD / ARROWS — fly      MOUSE — aim      HOLD CLICK / SPACE — fire', CFG.width / 2, 470, 20, CFG.colors.hud, 'center', 'normal');
  text(ctx, 'SHIFT / RIGHT-CLICK — dash      P — pause      M — sound', CFG.width / 2, 500, 20, CFG.colors.hud, 'center', 'normal');
  text(ctx, 'Enemies that reach the star drain its light. Gather shards to restore it.', CFG.width / 2, 545, 18, '#9fb8cc', 'center', 'normal');

  const pulse = 0.6 + 0.4 * Math.sin(time * 3);
  ctx.globalAlpha = pulse;
  text(ctx, 'CLICK OR PRESS ENTER TO BEGIN', CFG.width / 2, 620, 26, '#ffffff', 'center', 'bold');
  ctx.globalAlpha = 1;
  if (best > 0) text(ctx, `BEST  ${best.toLocaleString()}`, CFG.width / 2, 665, 20, CFG.colors.shard, 'center', 'bold');
}

export function drawHud(ctx, game) {
  const { score, combo, wave, player, star } = game;
  // Score, top left.
  text(ctx, `${score.toLocaleString()}`, 28, 30, 30, '#ffffff', 'left', 'bold');
  text(ctx, `WAVE ${wave}`, 28, 60, 18, CFG.colors.hud, 'left', 'bold');
  const left = game.enemies.length + game.waves.queue.length;
  text(ctx, left > 0 ? `${left} VOIDBORN LEFT` : 'WAVE CLEAR', 28, 84, 14, '#9fb8cc', 'left', 'normal');
  // Combo, under the score.
  if (combo > 1) {
    text(ctx, `COMBO ×${combo}`, 28, 112, 20, CFG.colors.shard, 'left', 'bold');
  }
  // Starlight, top center.
  star.drawHud(ctx);
  // Hull hearts, top right.
  const hx = CFG.width - 28;
  for (let i = 0; i < player.maxHull; i++) {
    const x = hx - i * 34;
    ctx.fillStyle = i < player.hull ? '#ff5d7a' : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(x, 34);
    ctx.bezierCurveTo(x - 12, 22, x - 22, 32, x - 11, 44);
    ctx.bezierCurveTo(x - 6, 49, x, 44, x, 38);
    ctx.bezierCurveTo(x, 44, x + 6, 49, x + 11, 44);
    ctx.bezierCurveTo(x + 22, 32, x + 12, 22, x, 34);
    ctx.fill();
  }
  // Dash cooldown pip under the hearts.
  const dashFrac = 1 - Math.max(0, player.dashCooldown) / (CFG.player.dashCooldown * player.dashCooldownMult);
  bar(ctx, CFG.width - 148, 56, 120, 8, dashFrac, CFG.colors.playerGlow);
  text(ctx, 'DASH', CFG.width - 28, 60, 11, CFG.colors.hud, 'right', 'bold');
  // Active boons.
  let boonY = 92;
  if (player.rapidTime > 0) {
    text(ctx, `RAPID FIRE ${player.rapidTime.toFixed(0)}s`, CFG.width - 28, boonY, 14, '#7db4ff', 'right', 'bold');
    boonY += 22;
  }
  if (player.shieldTime > 0) {
    text(ctx, 'SHIELD UP', CFG.width - 28, boonY, 14, CFG.colors.ok, 'right', 'bold');
  }
  // First-wave hint along the bottom.
  if (wave === 1 && game.runTime < 9) {
    ctx.globalAlpha = Math.max(0, Math.min(1, 9 - game.runTime));
    text(ctx, 'Protect the star — blast the swarm before it reaches the light', CFG.width / 2, CFG.height - 24, 17, CFG.colors.hud, 'center', 'normal');
    ctx.globalAlpha = 1;
  }
}

export function drawWaveAnnounce(ctx, label, alpha) {
  if (alpha <= 0) return;
  ctx.globalAlpha = Math.min(1, alpha);
  text(ctx, label, CFG.width / 2, 150, 40, '#ffffff', 'center', 'bold');
  ctx.globalAlpha = 1;
}

export function drawPause(ctx) {
  ctx.fillStyle = 'rgba(3, 4, 12, 0.72)';
  ctx.fillRect(0, 0, CFG.width, CFG.height);
  text(ctx, 'PAUSED', CFG.width / 2, CFG.height / 2 - 20, 56, '#ffffff', 'center', 'bold');
  text(ctx, 'Press P or Esc to keep flying', CFG.width / 2, CFG.height / 2 + 30, 22, CFG.colors.hud, 'center', 'normal');
}

export function layoutCards(count) {
  const w = 250;
  const h = 280;
  const gap = 36;
  const total = count * w + (count - 1) * gap;
  const startX = (CFG.width - total) / 2;
  const y = 250;
  const rects = [];
  for (let i = 0; i < count; i++) {
    rects.push({ x: startX + i * (w + gap), y, w, h });
  }
  return rects;
}

export function drawUpgrade(ctx, choices, mouse, wave) {
  ctx.fillStyle = 'rgba(3, 4, 12, 0.72)';
  ctx.fillRect(0, 0, CFG.width, CFG.height);
  text(ctx, `WAVE ${wave} CLEAR`, CFG.width / 2, 150, 30, CFG.colors.starGlow, 'center', 'bold');
  text(ctx, 'CHOOSE AN UPGRADE', CFG.width / 2, 200, 44, '#ffffff', 'center', 'bold');
  const rects = layoutCards(choices.length);
  choices.forEach((choice, i) => {
    const r = rects[i];
    const hover = mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h;
    ctx.fillStyle = hover ? 'rgba(46, 120, 160, 0.55)' : 'rgba(20, 34, 58, 0.85)';
    roundRect(ctx, r.x, r.y, r.w, r.h, 16);
    ctx.fill();
    ctx.strokeStyle = hover ? CFG.colors.player : 'rgba(125, 249, 255, 0.35)';
    ctx.lineWidth = hover ? 3 : 2;
    roundRect(ctx, r.x, r.y, r.w, r.h, 16);
    ctx.stroke();
    text(ctx, choice.glyph, r.x + r.w / 2, r.y + 70, 58, CFG.colors.starGlow, 'center', 'normal');
    text(ctx, choice.name, r.x + r.w / 2, r.y + 140, 22, '#ffffff', 'center', 'bold');
    wrapText(ctx, choice.desc, r.x + r.w / 2, r.y + 180, 18, CFG.colors.hud, r.w - 40);
    text(ctx, `PRESS ${i + 1}`, r.x + r.w / 2, r.y + r.h - 28, 15, '#9fb8cc', 'center', 'bold');
  });
}

function wrapText(ctx, str, x, y, size, color, maxWidth) {
  ctx.font = `normal ${size}px system-ui, sans-serif`;
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => {
    text(ctx, l, x, y + i * (size + 6), size, color, 'center', 'normal');
  });
}

export function drawGameOver(ctx, game) {
  ctx.fillStyle = 'rgba(3, 4, 12, 0.78)';
  ctx.fillRect(0, 0, CFG.width, CFG.height);
  const title = game.gameOverReason === 'star' ? 'THE STAR HAS FALLEN' : 'SHIP LOST';
  text(ctx, title, CFG.width / 2, 240, 52, game.gameOverReason === 'star' ? CFG.colors.danger : '#ffffff', 'center', 'bold');
  text(ctx, game.gameOverReason === 'star'
    ? 'The void swallowed the last light.'
    : 'The lighthouse ship is gone — but the star remembers.', CFG.width / 2, 295, 22, CFG.colors.hud, 'center', 'normal');
  text(ctx, `SCORE  ${game.score.toLocaleString()}`, CFG.width / 2, 370, 34, '#ffffff', 'center', 'bold');
  text(ctx, `WAVES SURVIVED  ${game.wave}`, CFG.width / 2, 410, 22, CFG.colors.hud, 'center', 'bold');
  if (game.isNewBest) {
    text(ctx, '★ NEW BEST ★', CFG.width / 2, 455, 24, CFG.colors.shard, 'center', 'bold');
  } else if (game.best > 0) {
    text(ctx, `BEST  ${game.best.toLocaleString()}`, CFG.width / 2, 455, 20, CFG.colors.shard, 'center', 'bold');
  }
  const pulse = 0.6 + 0.4 * Math.sin(game.time * 3);
  ctx.globalAlpha = pulse;
  text(ctx, 'PRESS R OR CLICK TO FLY AGAIN', CFG.width / 2, 540, 24, '#ffffff', 'center', 'bold');
  ctx.globalAlpha = 1;
}
