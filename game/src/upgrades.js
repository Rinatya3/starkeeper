// Upgrades: the choice offered between waves. Each one names what it does,
// and applying it mutates the player or the star directly.

import { rng } from './random.js';

export const UPGRADES = [
  {
    id: 'rapid',
    name: 'Rapid Coils',
    glyph: '≋',
    desc: 'Fire 25% faster.',
    can: () => true,
    apply: (player) => { player.stats.fireInterval *= 0.8; },
  },
  {
    id: 'damage',
    name: 'Heavy Bolts',
    glyph: '✦',
    desc: '+1 bolt damage.',
    can: () => true,
    apply: (player) => { player.stats.damage += 1; },
  },
  {
    id: 'spread',
    name: 'Split Cannon',
    glyph: '⋔',
    desc: '+1 bolt per shot.',
    can: (player) => player.stats.bulletCount < 4,
    apply: (player) => { player.stats.bulletCount += 1; },
  },
  {
    id: 'speed',
    name: 'Ion Sails',
    glyph: '➤',
    desc: '+12% ship speed.',
    can: () => true,
    apply: (player) => { player.stats.speed *= 1.12; },
  },
  {
    id: 'hull',
    name: 'Hull Plating',
    glyph: '⬡',
    desc: '+1 max hull, repair 1.',
    can: (player) => player.maxHull < 6,
    apply: (player) => { player.maxHull += 1; player.heal(1); },
  },
  {
    id: 'starlight',
    name: 'Starlight Tithe',
    glyph: '☀',
    desc: 'Restore 30 starlight.',
    can: (player, star) => star.light < star.maxLight,
    apply: (player, star) => { star.restore(30); },
  },
  {
    id: 'magnet',
    name: 'Shard Magnet',
    glyph: '◎',
    desc: '+60% pickup range.',
    can: () => true,
    apply: (player) => { player.stats.magnetRadius *= 1.6; },
  },
  {
    id: 'dash',
    name: 'Blink Drive',
    glyph: '↯',
    desc: 'Dash recharges 30% faster.',
    can: () => true,
    apply: (player) => { player.dashCooldownMult *= 0.7; },
  },
];
export function rollChoices(player, star, count = 3) {
  const pool = UPGRADES.filter((u) => u.can(player, star));
  const choices = [];
  while (choices.length < count && pool.length > 0) {
    const i = rng.int(0, pool.length - 1);
    choices.push(pool.splice(i, 1)[0]);
  }
  return choices;
}
