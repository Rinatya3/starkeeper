// Starkeeper: the game loop, the state machine, collisions, and the staged
// screenshot states (?shot=start|play|upgrade|end&seed=N).

import { CFG } from './config.js';
import { rng } from './random.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { Backdrop } from './render.js';
import { Particles, FloatingTexts, Shake } from './particles.js';
import { Star } from './star.js';
import { Player } from './player.js';
import { Bullets, Orbs, Shards } from './bullets.js';
import { updateEnemies, drawEnemies, damageEnemy, spawnEnemy } from './enemies.js';
import { WaveDirector } from './waves.js';
import { rollChoices } from './upgrades.js';
import { drawTitle, drawHud, drawWaveAnnounce, drawPause, drawUpgrade, drawGameOver, layoutCards } from './screens.js';

const BEST_KEY = 'starkeeper-best';

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.audio = new AudioEngine();
    this.backdrop = new Backdrop(CFG.width, CFG.height);
    this.particles = new Particles();
    this.texts = new FloatingTexts();
    this.shake = new Shake();
    this.star = new Star();
    this.player = new Player();
    this.bullets = new Bullets();
    this.orbs = new Orbs();
    this.shards = new Shards();
    this.enemies = [];
    this.waves = new WaveDirector();
    this.state = 'title';
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.runTime = 0;
    this.time = 0;
    this.wave = 0;
    this.choices = [];
    this.gameOverReason = 'star';
    this.isNewBest = false;
    this.frozen = false;
    this.muted = false;
    this.best = this.loadBest();
    this.statusEl = document.getElementById('status');
    this.announce('Starkeeper loaded. Press Enter to begin.');
    window.__starkeeper = this;
  }

  loadBest() {
    try {
      return Number(window.localStorage.getItem(BEST_KEY) || 0);
    } catch (err) {
      return 0;
    }
  }

  saveBest() {
    try {
      window.localStorage.setItem(BEST_KEY, String(this.best));
    } catch (err) {
      /* storage unavailable: the best score simply does not persist */
    }
  }

  announce(msg) {
    if (this.statusEl) this.statusEl.textContent = msg;
  }

  startRun() {
    this.star = new Star();
    this.player = new Player();
    this.bullets = new Bullets();
    this.orbs = new Orbs();
    this.shards = new Shards();
    this.enemies = [];
    this.particles = new Particles();
    this.texts = new FloatingTexts();
    this.waves = new WaveDirector();
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.runTime = 0;
    this.isNewBest = false;
    this.wave = 1;
    this.waves.startWave(1);
    this.state = 'playing';
    this.audio.unlock();
    this.audio.waveStart();
    this.announce('Wave 1. Defend the star.');
  }

  endRun(reason) {
    this.gameOverReason = reason;
    this.state = 'gameover';
    this.audio.gameOver();
    if (this.score > this.best) {
      this.best = this.score;
      this.isNewBest = true;
      this.saveBest();
    }
    this.announce(`Game over. Score ${this.score}, wave ${this.wave}. Press R to try again.`);
  }

  pickUpgrade(index) {
    const choice = this.choices[index];
    if (!choice) return;
    choice.apply(this.player, this.star);
    this.audio.upgrade();
    this.wave += 1;
    this.waves.startWave(this.wave);
    if (this.waves.isBossWave) this.audio.bossWarn();
    else this.audio.waveStart();
    this.state = 'playing';
    this.announce(`Wave ${this.wave}.`);
  }

  addScore(base, x, y) {
    const mult = Math.min(this.combo, CFG.combo.cap);
    const gained = base * Math.max(1, mult);
    this.score += gained;
    this.texts.add(x, y, `+${gained}`, mult > 1 ? CFG.colors.shard : '#ffffff', mult > 1 ? 20 : 16);
  }

  update(dt) {
    this.time += dt;
    this.shake.update(dt);
    this.audio.updateMusic(this.state === 'playing');

    if (this.input.wasPressed('KeyM')) {
      this.muted = !this.muted;
      this.audio.setMuted(this.muted);
    }
    if (this.input.wasPressed('Enter') || this.input.mouse.clicked) this.audio.unlock();

    if (this.state === 'title') {
      this.backdrop.draw(this.ctx, this.time, dt);
      if (this.input.wasPressed('Enter') || this.input.mouse.clicked) this.startRun();
      return;
    }
    if (this.state === 'gameover') {
      this.backdrop.draw(this.ctx, this.time, dt);
      this.particles.update(dt);
      this.texts.update(dt);
      if (this.input.wasPressed('KeyR') || this.input.mouse.clicked) this.startRun();
      return;
    }
    if (this.state === 'paused') {
      if (this.input.wasPressed('KeyP') || this.input.wasPressed('Escape')) this.state = 'playing';
      return;
    }
    if (this.state === 'upgrade') {
      this.backdrop.draw(this.ctx, this.time, dt);
      this.particles.update(dt);
      this.texts.update(dt);
      for (let i = 0; i < this.choices.length; i++) {
        if (this.input.wasPressed(`Digit${i + 1}`) || this.input.wasPressed(`Numpad${i + 1}`)) {
          this.pickUpgrade(i);
          return;
        }
      }
      if (this.input.mouse.clicked) {
        const rects = layoutCards(this.choices.length);
        rects.forEach((r, i) => {
          if (this.input.mouse.x >= r.x && this.input.mouse.x <= r.x + r.w &&
              this.input.mouse.y >= r.y && this.input.mouse.y <= r.y + r.h) {
            this.pickUpgrade(i);
          }
        });
      }
      return;
    }

    // Playing.
    if (this.input.wasPressed('KeyP') || this.input.wasPressed('Escape')) {
      this.state = 'paused';
      return;
    }
    this.runTime += dt;
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;

    this.star.update(dt);
    this.player.update(dt, this.input, this.enemies, this.bullets, this.audio, this.particles);
    const waveResult = this.waves.update(dt, this.enemies);
    updateEnemies(this.enemies, dt, this.star, this.player, this.orbs, (kind, x, y) => {
      this.enemies.push(spawnEnemy(kind, x, y, this.wave));
    });
    this.bullets.update(dt);
    this.orbs.update(dt);
    this.shards.update(dt, this.player);
    this.particles.update(dt);
    this.texts.update(dt);
    this.collide();
    if (this.state !== 'playing') return;

    if (waveResult === 'cleared') {
      this.choices = rollChoices(this.player, this.star);
      this.state = 'upgrade';
      this.announce(`Wave ${this.wave} clear. Choose an upgrade.`);
    }
  }

  collide() {
    // Bolts vs enemies.
    for (let i = this.bullets.list.length - 1; i >= 0; i--) {
      const b = this.bullets.list[i];
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        const r = b.radius + e.radius;
        if (dx * dx + dy * dy < r * r) {
          this.bullets.list.splice(i, 1);
          this.particles.burst(b.x, b.y, CFG.colors.bullet, 4, 120, 0.25, 2);
          if (damageEnemy(e, b.damage)) this.killEnemy(j);
          break;
        }
      }
    }
    // Enemies vs the star.
    for (let j = this.enemies.length - 1; j >= 0; j--) {
      const e = this.enemies[j];
      const dx = e.x - this.star.x;
      const dy = e.y - this.star.y;
      const r = this.star.radius + e.radius * 0.55;
      if (dx * dx + dy * dy < r * r) {
        const damage = this.star.breach(e.kind);
        this.texts.add(this.star.x, this.star.y - this.star.radius - 30, `-${damage} STARLIGHT`, CFG.colors.danger, 20);
        this.particles.burst(e.x, e.y, CFG.colors.starGlow, 24, 300, 0.7, 3);
        this.audio.starHit();
        this.shake.add(0.45);
        this.enemies.splice(j, 1);
        if (!this.star.alive) {
          this.endRun('star');
          return;
        }
      }
    }
    // Enemies vs the player.
    if (this.player.alive) {
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        const dx = e.x - this.player.x;
        const dy = e.y - this.player.y;
        const r = e.radius + this.player.radius;
        if (dx * dx + dy * dy < r * r) {
          const hit = this.player.takeHit();
          if (hit === true) {
            this.particles.burst(this.player.x, this.player.y, CFG.colors.player, 20, 300, 0.6, 3);
            this.audio.playerHit();
            this.shake.add(0.5);
            if (damageEnemy(e, 3)) this.killEnemy(j);
            if (!this.player.alive) {
              this.particles.burst(this.player.x, this.player.y, '#ffffff', 40, 380, 1, 4);
              this.endRun('ship');
              return;
            }
          } else if (hit === 'shield') {
            this.particles.burst(this.player.x, this.player.y, CFG.colors.ok, 16, 240, 0.5, 3);
            if (damageEnemy(e, 3)) this.killEnemy(j);
          }
        }
      }
    }
    // Orbs vs the player and the star.
    for (let i = this.orbs.list.length - 1; i >= 0; i--) {
      const o = this.orbs.list[i];
      let consumed = false;
      if (this.player.alive) {
        const dx = o.x - this.player.x;
        const dy = o.y - this.player.y;
        const r = o.radius + this.player.radius;
        if (dx * dx + dy * dy < r * r) {
          const hit = this.player.takeHit();
          if (hit) {
            this.particles.burst(o.x, o.y, CFG.colors.orb, 14, 240, 0.5, 3);
            this.audio.playerHit();
            this.shake.add(0.35);
            if (!this.player.alive) {
              this.endRun('ship');
              return;
            }
          }
          consumed = true;
        }
      }
      if (!consumed) {
        const dx = o.x - this.star.x;
        const dy = o.y - this.star.y;
        const r = o.radius + this.star.radius;
        if (dx * dx + dy * dy < r * r) {
          this.star.orbHit();
          this.particles.burst(o.x, o.y, CFG.colors.orb, 12, 220, 0.5, 3);
          this.audio.starHit();
          consumed = true;
          if (!this.star.alive) {
            this.endRun('star');
            return;
          }
        }
      }
      if (consumed) this.orbs.list.splice(i, 1);
    }
    // Shards vs the player.
    for (let i = this.shards.list.length - 1; i >= 0; i--) {
      const s = this.shards.list[i];
      const dx = s.x - this.player.x;
      const dy = s.y - this.player.y;
      const r = this.player.radius + 12;
      if (dx * dx + dy * dy < r * r) {
        if (s.kind === 'light') {
          this.star.restore(CFG.star.shardLight);
          this.score += 25;
          this.texts.add(s.x, s.y - 14, '+25', CFG.colors.shard, 15);
        } else if (s.kind === 'hull') {
          this.player.heal(1);
          this.texts.add(s.x, s.y - 14, '+HULL', CFG.colors.ok, 17);
        } else if (s.kind === 'rapid') {
          this.player.rapidTime = 6;
          this.texts.add(s.x, s.y - 14, 'RAPID FIRE', '#7db4ff', 17);
        }
        this.audio.pickup();
        this.particles.burst(s.x, s.y, CFG.colors.shard, 8, 140, 0.4, 2);
        this.shards.list.splice(i, 1);
      }
    }
  }

  killEnemy(index) {
    const e = this.enemies[index];
    this.enemies.splice(index, 1);
    this.combo += 1;
    this.comboTimer = CFG.combo.window;
    this.addScore(e.score, e.x, e.y);
    const big = e.kind === 'leviathan' || e.kind === 'bulwark';
    this.particles.burst(e.x, e.y, CFG.colors[e.kind] || '#ffffff', big ? 42 : 20, big ? 380 : 300, big ? 0.9 : 0.6, big ? 4 : 3);
    this.audio.explosion(big);
    if (big) this.shake.add(0.4);
    else this.shake.add(0.12);
    // Drops: shards of light, sometimes a boon.
    const shards = e.kind === 'leviathan' ? 8 : e.kind === 'bulwark' ? 3 : 1;
    for (let i = 0; i < shards; i++) this.shards.drop(e.x, e.y, 'light');
    if (e.kind === 'bulwark' || e.kind === 'leviathan') {
      if (rng.chance(0.5)) this.shards.drop(e.x, e.y, 'hull');
      if (rng.chance(0.4)) this.shards.drop(e.x, e.y, 'rapid');
    } else if (rng.chance(0.06)) {
      this.shards.drop(e.x, e.y, rng.chance(0.5) ? 'hull' : 'rapid');
    }
  }

  render() {
    const ctx = this.ctx;
    const off = this.shake.offset();
    ctx.save();
    ctx.translate(off.x, off.y);
    this.backdrop.draw(ctx, this.time, 0);
    if (this.state === 'title') {
      drawTitle(ctx, this.time, this.best);
      ctx.restore();
      return;
    }
    this.star.draw(ctx);
    drawEnemies(ctx, this.enemies, this.time);
    this.shards.draw(ctx);
    this.player.draw(ctx, this.time);
    this.bullets.draw(ctx);
    this.orbs.draw(ctx, this.time);
    this.particles.draw(ctx);
    this.texts.draw(ctx);
    ctx.restore();

    if (this.state === 'playing' || this.state === 'paused' || this.state === 'upgrade') {
      drawHud(ctx, this);
      drawWaveAnnounce(ctx, this.waves.announced, this.waves.announceTime / 2.2);
    }
    if (this.state === 'paused') drawPause(ctx);
    if (this.state === 'upgrade') drawUpgrade(ctx, this.choices, this.input.mouse, this.wave);
    if (this.state === 'gameover') drawGameOver(ctx, this);
  }

  frame(dt) {
    if (!this.frozen) this.update(dt);
    this.render();
    this.input.endFrame();
  }
}

// Staged states for screenshots: real renders of the game's own code, with a
// seeded layout so the same URL always stages the same frame.
function stage(game, shot, seed) {
  rng.reseed(seed);
  if (shot === 'start') {
    game.state = 'title';
    game.best = 2450;
    return;
  }
  game.startRun();
  game.audio.setMuted(true);
  if (shot === 'play') {
    game.wave = 3;
    game.score = 2450;
    game.combo = 3;
    game.comboTimer = CFG.combo.window;
    game.star.light = 78;
    game.player.hull = 2;
    game.player.x = 430;
    game.player.y = 560;
    game.player.angle = -0.6;
    const spots = [
      ['moth', 900, 180], ['moth', 1040, 320], ['moth', 180, 240],
      ['dart', 760, 620], ['dart', 1120, 520],
      ['bulwark', 980, 110], ['spitter', 220, 620], ['moth', 560, 130],
    ];
    for (const [kind, x, y] of spots) game.enemies.push(spawnEnemy(kind, x, y, 3));
    game.bullets.spawn(470, 520, 500, -420, 1);
    game.bullets.spawn(490, 505, 560, -380, 1);
    game.bullets.spawn(452, 535, 430, -460, 1);
    game.orbs.spawn(300, 560, 120, -90);
    game.shards.drop(520, 470, 'light');
    game.shards.drop(700, 300, 'light');
    game.particles.burst(880, 240, CFG.colors.moth, 22, 280, 0.7, 3);
    game.particles.burst(240, 300, CFG.colors.dart, 14, 240, 0.6, 3);
    game.waves.announced = '';
    game.waves.announceTime = 0;
    game.waves.queue = [];
    game.frozen = true;
  } else if (shot === 'upgrade') {
    game.wave = 2;
    game.score = 1800;
    game.star.light = 86;
    game.player.x = 640;
    game.player.y = 620;
    game.enemies = [];
    game.waves.queue = [];
    game.choices = rollChoices(game.player, game.star);
    game.state = 'upgrade';
    game.frozen = true;
  } else if (shot === 'end') {
    game.score = 3250;
    game.wave = 4;
    game.best = 3250;
    game.isNewBest = true;
    game.star.light = 0;
    game.state = 'gameover';
    game.gameOverReason = 'star';
    game.frozen = true;
  }
}

function boot() {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    const seed = Number(params.get('seed') || 1);
    stage(game, shot, seed);
  }
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    game.frame(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

boot();
