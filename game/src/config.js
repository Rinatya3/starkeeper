// Starkeeper tuning: every number the game balances on, in one place.

export const CFG = {
  width: 1280,
  height: 800,

  // The star the player defends.
  star: {
    x: 640,
    y: 400,
    radius: 46,
    maxLight: 100,
    // Light lost when an enemy reaches the star, by enemy kind.
    breachDamage: { moth: 6, dart: 4, bulwark: 12, spitter: 8, leviathan: 30 },
    // Light restored by each collected shard.
    shardLight: 1.5,
  },

  // The lighthouse ship.
  player: {
    radius: 16,
    speed: 330,
    maxHull: 3,
    fireInterval: 0.16,
    bulletSpeed: 720,
    bulletDamage: 1,
    bulletRadius: 5,
    dashSpeed: 900,
    dashTime: 0.16,
    dashCooldown: 2.2,
    invulnerableTime: 1.4,
    magnetRadius: 90,
  },

  // Enemy kinds: speed, hull, score, size, behaviour knobs.
  enemies: {
    moth: { radius: 15, speed: 62, hull: 1, score: 50, wobble: 1.6 },
    dart: { radius: 11, speed: 138, hull: 1, score: 80, wobble: 3.4 },
    bulwark: { radius: 27, speed: 34, hull: 8, score: 200, wobble: 0.4 },
    spitter: { radius: 16, speed: 52, hull: 3, score: 150, holdRange: 300, shotInterval: 2.4, orbSpeed: 190 },
    leviathan: { radius: 58, speed: 26, hull: 90, score: 2000, shotInterval: 1.1, orbSpeed: 230 },
  },

  // Waves: base counts grow with the wave number; every 5th wave is a boss wave.
  waves: {
    baseMoths: 6,
    mothsPerWave: 2,
    dartsFromWave: 2,
    dartsPerWave: 1,
    bulwarksFromWave: 3,
    spittersFromWave: 4,
    spawnInterval: 0.85,
    betweenWavesTime: 2.0,
    bossEvery: 5,
    speedGrowth: 0.045,
    hullGrowth: 0.12,
  },

  // Scoring.
  combo: { window: 2.5, cap: 8 },

  // Palette: deep space, neon cyan/gold/magenta.
  colors: {
    background: '#05060f',
    starCore: '#fff7cc',
    starGlow: '#ffd76a',
    starRing: '#ff9d2e',
    player: '#7df9ff',
    playerGlow: '#2ec8ff',
    bullet: '#aefcff',
    moth: '#c86bff',
    dart: '#ff5d8f',
    bulwark: '#ff7a3d',
    spitter: '#9dff57',
    leviathan: '#ff3d5e',
    orb: '#ff9dff',
    shard: '#ffe066',
    hud: '#d8f4ff',
    danger: '#ff4d6d',
    ok: '#7dffb2',
  },
};
