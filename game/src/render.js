// Canvas drawing helpers and the animated backdrop: parallax starfield,
// nebulae, and the glow primitives every entity draws with.

import { rng } from './random.js';

export function glowCircle(ctx, x, y, radius, color, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function polygon(ctx, points, fill, stroke = null, lineWidth = 2) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function bar(ctx, x, y, w, h, frac, fill, back = 'rgba(255,255,255,0.12)') {
  const f = Math.max(0, Math.min(1, frac));
  ctx.fillStyle = back;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (f > 0) {
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, w * f, h, h / 2);
    ctx.fill();
  }
}

export function text(ctx, str, x, y, size, color, align = 'center', weight = 'bold', font = 'system-ui, sans-serif') {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// Three drifting star layers plus soft nebula blobs, drawn behind the game.
export class Backdrop {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.layers = [];
    for (let layer = 0; layer < 3; layer++) {
      const stars = [];
      const count = [90, 60, 35][layer];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: rng.range(0, width),
          y: rng.range(0, height),
          r: rng.range(0.6, 0.6 + layer * 0.9),
          tw: rng.range(0, Math.PI * 2),
          sp: rng.range(2, 6 + layer * 5),
        });
      }
      this.layers.push(stars);
    }
    this.nebulae = [
      { x: 220, y: 170, r: 300, color: 'rgba(80,40,160,0.20)' },
      { x: 1060, y: 620, r: 340, color: 'rgba(20,90,140,0.18)' },
      { x: 980, y: 140, r: 240, color: 'rgba(160,40,110,0.14)' },
      { x: 300, y: 660, r: 260, color: 'rgba(20,120,110,0.14)' },
    ];
  }

  draw(ctx, time, dt) {
    ctx.fillStyle = '#05060f';
    ctx.fillRect(0, 0, this.width, this.height);
    for (const n of this.nebulae) glowCircle(ctx, n.x, n.y, n.r, n.color, 1);
    for (let layer = 0; layer < 3; layer++) {
      for (const s of this.layers[layer]) {
        s.y += s.sp * dt;
        if (s.y > this.height + 4) {
          s.y = -4;
          s.x = rng.range(0, this.width);
        }
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 1.7 + s.tw));
        ctx.globalAlpha = a * (0.45 + layer * 0.25);
        ctx.fillStyle = '#eaf6ff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
