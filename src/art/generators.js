// The game's pixel art, drawn in code at one shared pixel scale (see
// ART_SCALE in placeholders.js). Sizes here are in art pixels.
//
// Art direction: Apollo's temple in Mediterranean daylight. Marble, gold and
// lapis blue, terracotta pottery, olive and cypress greens. Characters are
// small and simple (SNES-style), outlined in a dark plum ink.

import { Pix, rng, bayer } from './pixel.js';

export const C = {
  ink: '#2a2236', inkSoft: '#463a52',
  marbleHi: '#fdfaf2', marble: '#efe6d4', marbleMid: '#dccfb4', marbleShade: '#b9a888', marbleDark: '#857559',
  goldHi: '#fff1a8', gold: '#f2c14e', goldMid: '#d99a2b', goldDark: '#a8701c', goldDeep: '#6b4612',
  lapisHi: '#6f86d8', lapis: '#3d52a8', lapisMid: '#2c3c8c', lapisDark: '#1d2860', lapisDeep: '#121a44',
  terraHi: '#f2955c', terra: '#d4683a', terraMid: '#b04e26', terraDark: '#7a3418', black: '#2a1d1a',
  grassHi: '#b2dc62', grass: '#74b442', grassMid: '#528f34', grassDark: '#376a28',
  cypressHi: '#4f9452', cypress: '#336f40', cypressDark: '#204c2e',
  oliveHi: '#b4cf7c', olive: '#88aa5c', oliveDark: '#5f8042', bark: '#7d522c', barkDark: '#523319',
  dirt: '#a0683c', dirtDark: '#7a4c2c', dirtDeep: '#55331e', stone: '#e2d6bc', stoneShade: '#b3a585',
  skin: '#f2b88e', skinShade: '#d08c60', skinDark: '#9c5c3c',
  hair: '#8e5226', hairDark: '#5e3416', hairHi: '#b8742f',
  red: '#cc4430', redDark: '#912c22', redHi: '#ea6a4c', leather: '#6e4524',
  robe: '#f7f0e0', robeShade: '#ddd0b4', robeDark: '#b0a07e',
  white: '#ffffff', cloud: '#fbfdff', cloudShade: '#dde9f6', cloudDeep: '#b7cee6',
  seaHi: '#c4ebff', seaLight: '#5eaef0', sea: '#3388dc', seaMid: '#2668bc', seaDeep: '#1b4c96',
  fire1: '#fff6c2', fire2: '#ffd447', fire3: '#ff8c1e', fire4: '#d8461c',
  plum: '#4a3f5a',
};

// ---------------------------------------------------------------- helpers

// Periodic height field: wraps seamlessly across `w`.
export function ridge(w, seed, terms) {
  const r = rng(seed);
  const waves = terms.map(([k, amp]) => ({ k, amp, ph: r() * Math.PI * 2 }));
  return (x) => waves.reduce((s, { k, amp, ph }) => s + amp * Math.sin((2 * Math.PI * k * x) / w + ph), 0);
}

function wrapped(w, x, fn) {
  fn(x);
  fn(x - w);
  fn(x + w);
}

function sheet(fw, fh, frames, draw, outline = true) {
  const p = new Pix(fw * frames, fh);
  for (let f = 0; f < frames; f++) {
    const one = new Pix(fw, fh);
    draw(one, f);
    if (outline) one.outline(C.ink);
    p.blit(one, f * fw, 0);
  }
  return p;
}

// A daylight cloud: flat-bottomed puffs with blue-grey undersides.
export function cloudShape(cw, ch, seed) {
  const p = new Pix(cw + 4, ch + 4);
  const r = rng(seed);
  const base = Math.round(ch * 0.7) + 2;
  const n = Math.max(2, Math.round(cw / 7));
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const mid = 1 - Math.abs(t - 0.5) * 2;
    const rad = Math.max(2, Math.round(2 + mid * ch * 0.45 + r() * 2));
    p.circle(Math.round(2 + rad + t * (cw - 2 * rad)), base - Math.round(rad * 0.6), rad, C.cloud);
  }
  p.rect(2, base - 2, cw, 3, C.cloud);
  for (let y = base + 1; y < p.h; y++) for (let x = 0; x < p.w; x++) p.clear(x, y);
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      if (!p.alpha(x, y)) continue;
      if (y >= base - 1) p.set(x, y, C.cloudDeep);
      else if (y >= base - 3) p.set(x, y, C.cloudShade);
    }
  }
  return p;
}

export function cypressTree(p, x, groundY, h, half) {
  p.rect(x, groundY - 2, 1, 2, C.barkDark);
  for (let j = 0; j < h; j++) {
    const t = j / h;
    const hw = Math.max(1, Math.round(half * Math.sin(Math.PI * Math.min(1, t * 1.05 + 0.12)) * (0.45 + 0.55 * t)));
    const y = groundY - 2 - h + j;
    for (let i = -hw; i <= hw; i++) {
      const c = i <= -hw + 1 ? C.cypressHi : i >= hw - 1 ? C.cypressDark : C.cypress;
      p.set(x + i, y, ((i + j) % 4 === 0 && i > 0) ? C.cypressDark : c);
    }
  }
}

// Shaded foliage cluster: light from the upper left, leafy speckle.
export function leafBall(p, cx, cy, r, pal = [C.oliveHi, C.olive, C.oliveDark]) {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y * 1.1);
      if (d > r) continue;
      const light = (-x - y) / (r * 1.4);
      let c = light > 0.35 ? pal[0] : light < -0.35 ? pal[2] : pal[1];
      if (bayer(cx + x, cy + y) < 0.18) c = light > 0 ? pal[1] : pal[2];
      if (d > r - 1 && light < 0) c = pal[2];
      p.set(cx + x, cy + y, c);
    }
  }
}

export function oliveTree(p, x, groundY, scale = 1, seed = 1) {
  const r = rng(seed);
  const s = (v) => Math.round(v * scale) || Math.sign(v);
  // Gnarled trunk leaning one way, then forking.
  for (let j = 0; j < s(12); j++) {
    const dx = Math.round(Math.sin(j / (3 * scale)) * scale);
    p.rect(x - s(1) + dx, groundY - j, s(3), 1, C.bark);
    p.set(x - s(1) + dx, groundY - j, C.barkDark);
  }
  p.line(x, groundY - s(9), x - s(6), groundY - s(15), C.barkDark);
  p.line(x + 1, groundY - s(10), x + s(7), groundY - s(16), C.bark);
  // Canopy: several shaded clusters, back to front.
  const blobs = [[-7, -19, 6], [7, -19, 6], [0, -22, 7], [-9, -14, 5], [9, -14, 5], [-2, -15, 6], [4, -17, 5]];
  for (const [dx, dy, rad] of blobs) leafBall(p, x + s(dx), groundY + s(dy), s(rad));
  // A few olives.
  for (let k = 0; k < 6 * scale; k++) {
    const [dx, dy] = blobs[Math.floor(r() * blobs.length)];
    p.set(x + s(dx) + Math.round((r() - 0.5) * s(6)), groundY + s(dy) + Math.round(r() * s(4)), C.oliveDark);
  }
}

export function brokenColumn(p, x, groundY, h, r) {
  p.rect(x - 1, groundY - 2, 8, 2, C.marbleMid);
  p.rect(x, groundY - h, 6, h - 2, C.marble);
  p.vline(x, groundY - h, h - 2, C.marbleHi);
  p.vline(x + 2, groundY - h + 1, h - 3, C.marbleMid);
  p.vline(x + 4, groundY - h + 1, h - 3, C.marbleMid);
  p.vline(x + 5, groundY - h, h - 2, C.marbleShade);
  for (let i = 0; i < 6; i++) for (let j = 0; j < Math.floor(r() * 3); j++) p.clear(x + i, groundY - h + j);
}

// A sun emblem (Apollo): disc and rays.
export function sunEmblem(p, cx, cy, r, c1 = C.gold, c2 = C.goldDark, hi = C.goldHi) {
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2;
    const len = a % 2 ? r + 2 : r + 4;
    p.line(cx, cy, Math.round(cx + Math.cos(ang) * len), Math.round(cy + Math.sin(ang) * len), a % 2 ? c2 : c1);
  }
  p.circle(cx, cy, r, c1);
  p.circle(cx - 1, cy - 1, Math.max(1, r - 2), hi);
  p.circle(cx, cy, Math.max(1, r - 2), c1);
}

function meanderRow(p, x0, y, w, color) {
  // A 3-row Greek key: repeated every 4 art pixels.
  for (let x = x0; x < x0 + w; x++) {
    const k = (x - x0) % 4;
    p.set(x, y, k < 3 ? color : null);
    if (k === 0 || k === 2) p.set(x, y + 1, color);
    p.set(x, y + 2, k !== 1 ? color : null);
  }
}

// ---------------------------------------------------------------- characters

function drawHercules(p, pose = {}) {
  const b = pose.bob ?? 0;
  const c = pose.crouch ? 3 : 0;
  const o = b + c; // vertical offset of everything above the hips
  const legs = pose.legs ?? [{ dx: 0, lift: 0 }, { dx: 0, lift: 0 }];
  const leg = (x, { dx, lift }, color) => {
    const top = 22 + c;
    const foot = 29 - lift;
    p.rect(x + dx, top, 2, Math.max(1, foot - top - 1), color);
    p.rect(x + dx - (color === C.skin ? 0 : 1), foot - 1, 3, 2, C.leather);
  };
  leg(10, legs[1], C.skinShade);
  // Back arm.
  const swing = pose.swing ?? 0;
  if (pose.armsUp) p.rect(8, 8 + o, 2, 5, C.skinShade);
  else p.rect(8 - swing, 12 + o, 2, 5, C.skinShade);
  // Skirt and torso.
  p.poly([[9, 18 + o], [17, 18 + o], [18, 23 + o], [8, 23 + o]], C.red);
  for (const x of [10, 12, 14, 16]) p.vline(x, 19 + o, 3, C.redDark);
  p.rect(10, 12 + o, 6, 6, C.red);
  p.vline(15, 12 + o, 6, C.redDark);
  p.set(11, 12 + o, C.goldMid); p.set(12, 13 + o, C.goldMid); p.set(13, 14 + o, C.goldMid);
  p.rect(10, 17 + o, 6, 1, C.goldMid);
  p.set(13, 17 + o, C.goldHi);
  leg(13, legs[0], C.skin);
  // Head.
  p.rect(12, 11 + o, 3, 1, C.skinShade);
  p.rect(10, 4 + o, 7, 7, C.skin);
  p.vline(16, 5 + o, 5, C.skinShade);
  if (pose.blink) p.hline(13, 7 + o, 2, C.skinDark);
  else { p.set(14, 7 + o, C.ink); p.set(14, 6 + o, C.hairDark); }
  p.set(15, 9 + o, C.skinDark);
  // Spiky hair with a red headband trailing behind.
  p.rect(9, 1 + o, 8, 4, C.hair);
  p.rect(8, 3 + o, 3, 6, C.hair);
  for (const [x, y] of [[9, 0], [12, 0], [15, 1], [17, 2], [7, 4]]) p.set(x, y + o, C.hair);
  p.hline(10, 1 + o, 5, C.hairHi);
  p.rect(9, 5 + o, 8, 1, C.red);
  p.set(7, 6 + o, C.red); p.set(6, 7 + o, C.redDark); p.set(7, 7 + o, C.red); p.set(5, 8 + o, C.redDark);
  p.rect(10, 4 + o, 5, 1, C.hair);
  // Front arm with a leather bracer.
  if (pose.armsUp) {
    p.rect(16, 7 + o, 2, 6, C.skin);
  } else if (pose.reach) {
    p.rect(16, 13 + o, 2, 4, C.skin);
    p.rect(17, 16 + o, 2, 2, C.skin);
  } else {
    p.rect(16 + swing, 12 + o, 2, 5, C.skin);
    p.rect(16 + swing, 15 + o, 2, 1, C.leather);
  }
}

function drawOracle(p, pose = {}) {
  const b = pose.bob ?? 0;
  // Veil falling down the back.
  p.rect(6, 7 + b, 4, 16, C.robeShade);
  p.ellipse(12, 8 + b, 6, 6, C.robe);
  // Robe with gold belt and hem.
  p.poly([[9, 13 + b], [16, 13 + b], [18, 29], [7, 29]], C.robe);
  for (let y = 14 + b; y < 29; y++) p.set(16 + Math.floor((y - 13 - b) / 8), y, C.robeShade);
  p.rect(10, 18 + b, 6, 1, C.gold);
  p.hline(7, 28, 12, C.gold);
  for (let x = 8; x < 18; x += 2) p.set(x, 27, C.goldDark);
  p.set(10, 29, C.leather); p.set(14, 29, C.leather);
  // Face framed by brown hair, gold circlet.
  p.rect(11, 6 + b, 5, 6, C.skin);
  p.vline(15, 7 + b, 4, C.skinShade);
  p.vline(10, 6 + b, 7, C.hair);
  p.vline(16, 7 + b, 4, C.hair);
  p.rect(11, 5 + b, 5, 1, C.gold);
  p.set(13, 5 + b, C.lapis);
  if (pose.blink) p.hline(13, 8 + b, 2, C.skinDark);
  else p.set(14, 8 + b, C.ink);
  p.set(14, 10 + b, C.skinDark);
  // Hands.
  if (pose.gesture === 1) { p.rect(16, 13 + b, 2, 3, C.robe); p.rect(18, 12 + b, 2, 2, C.skin); }
  else if (pose.gesture === 2) { p.rect(16, 11 + b, 2, 4, C.robe); p.rect(17, 9 + b, 2, 2, C.skin); }
  else if (pose.gesture === 3) { p.rect(15, 15 + b, 3, 2, C.robe); p.rect(18, 15 + b, 2, 2, C.skin); }
  else p.rect(12, 16 + b, 3, 2, C.skin);
}

function drawZeus(p, pose = {}) {
  const b = pose.bob ?? 0;
  if (pose.beam) {
    // A shaft of golden light carries him.
    for (let y = 0; y < p.h; y++) {
      for (let x = 13; x < 27; x++) {
        const edge = Math.min(x - 13, 26 - x);
        const t = edge < 2 ? 0.25 : edge < 4 ? 0.5 : 0.8;
        if (t > bayer(x, y + pose.beam)) p.set(x, y, edge < 2 ? '#ffe9a0' : '#fff6d0');
      }
    }
  }
  // Cloud he rides on.
  if (!pose.beam) p.blit(cloudShape(22, 7, 9 + b), 8 + b, 30);
  // Toga with gold sash.
  p.poly([[14, 17 + b], [26, 17 + b], [28, 33 + b], [12, 33 + b]], C.robe);
  for (let y = 18 + b; y < 33 + b; y++) p.set(25 + Math.floor((y - 17 - b) / 6), y, C.robeShade);
  p.line(14, 18 + b, 25, 31 + b, C.gold);
  p.hline(13, 32 + b, 15, C.goldMid);
  // Arms spread wide (or raised in the beam).
  if (pose.beam) {
    p.rect(10, 13 + b, 4, 3, C.robe); p.rect(26, 13 + b, 4, 3, C.robe);
    p.rect(9, 11 + b, 2, 2, C.skin); p.rect(29, 11 + b, 2, 2, C.skin);
  } else {
    p.rect(8, 18 + b, 6, 3, C.robe); p.rect(26, 18 + b, 6, 3, C.robe);
    p.rect(6, 18 + b, 2, 3, C.skin); p.rect(32, 18 + b, 2, 3, C.skin);
    p.set(8, 20 + b, C.gold); p.set(31, 20 + b, C.gold);
  }
  // Head: white mane and great beard, gold laurel.
  p.ellipse(20, 10 + b, 8, 7, C.cloudShade);
  p.ellipse(20, 9 + b, 7, 6, C.white);
  p.rect(17, 7 + b, 6, 6, C.skin);
  p.vline(22, 8 + b, 4, C.skinShade);
  p.hline(17, 8 + b, 2, C.white); p.hline(21, 8 + b, 2, C.white);
  if (pose.blink) { p.hline(18, 9 + b, 1, C.skinDark); p.hline(21, 9 + b, 1, C.skinDark); }
  else { p.set(18, 9 + b, C.ink); p.set(21, 9 + b, C.ink); }
  p.poly([[15, 12 + b], [25, 12 + b], [24, 19 + b], [20, 22 + b], [16, 19 + b]], C.white);
  p.line(18, 14 + b, 19, 19 + b, C.cloudShade); p.line(22, 14 + b, 21, 19 + b, C.cloudShade);
  p.hline(18, 13 + b, 4, C.skinDark);
  for (let x = 13; x <= 27; x += 2) { p.set(x, 4 + b + (x === 13 || x === 27 ? 1 : 0), C.gold); p.set(x + 1, 5 + b, C.goldDark); }
}

// ---------------------------------------------------------------- generators

export const GENERATORS = {
  // Characters (frame orders match the manifest).
  hercules(fw, fh, n) {
    const poses = [
      {}, { bob: 1 }, { blink: true },
      { legs: [{ dx: 3, lift: 0 }, { dx: -2, lift: 2 }], swing: -1 },
      { legs: [{ dx: 1, lift: 0 }, { dx: 0, lift: 1 }], bob: 1 },
      { legs: [{ dx: -2, lift: 2 }, { dx: 2, lift: 0 }], swing: 1 },
      { legs: [{ dx: 1, lift: 1 }, { dx: 0, lift: 0 }], bob: 1 },
      { legs: [{ dx: 2, lift: 3 }, { dx: -1, lift: 4 }], armsUp: true },
      { legs: [{ dx: 1, lift: 0 }, { dx: -1, lift: 1 }], armsUp: true },
      { crouch: true, reach: true, legs: [{ dx: 1, lift: 0 }, { dx: -1, lift: 0 }] },
    ];
    return sheet(fw, fh, n, (p, f) => drawHercules(p, poses[f] ?? {}));
  },

  oracle(fw, fh, n) {
    const poses = [{}, { bob: 1 }, {}, { blink: true }, { bob: 1 },
      { gesture: 1 }, { gesture: 2 }, { gesture: 1, bob: 1 }, { gesture: 3 }, { gesture: 2, bob: 1 }];
    return sheet(fw, fh, n, (p, f) => drawOracle(p, poses[f] ?? {}));
  },

  zeus(fw, fh, n) {
    return sheet(fw, fh, n, (p, f) => {
      if (f < 8) drawZeus(p, { bob: [0, 0, 1, 1, 1, 0, 0, 0][f], blink: f === 5 });
      else drawZeus(p, { beam: f - 7, bob: f % 2 });
    });
  },

  // Props.
  pot(fw, fh, n) {
    return sheet(fw, fh, n, (p, f) => {
      amphora(p, 6, 11, 11);
      if (f === 1) { p.line(4, 4, 6, 7, C.black); p.line(6, 7, 5, 10, C.black); p.set(8, 6, C.black); }
      if (f === 2) {
        for (let x = 0; x < fw; x++) {
          const cut = 6 + ((x * 3) % 4) - (x % 2);
          for (let y = 0; y < cut; y++) p.clear(x, y);
        }
        p.set(0, 11, C.terra); p.set(11, 11, C.terraMid); p.set(10, 10, C.terra);
      }
    });
  },

  coin(fw, fh, n) {
    const glyph = {
      O: ['.XXX.', 'X...X', 'X...X', 'X...X', '.XXX.'],
      X: ['X...X', '.X.X.', '..X..', '.X.X.', 'X...X'],
    };
    return sheet(fw, fh, n, (p, f) => {
      const cx = fw / 2 - 0.5;
      const r = fw / 2 - 1;
      p.circle(Math.round(cx), Math.round(cx) + 1, r, C.goldDeep);
      p.circle(Math.round(cx), Math.round(cx), r, C.goldDark);
      p.circle(Math.round(cx), Math.round(cx), r - 1, f === 0 ? C.goldMid : C.gold);
      p.circle(Math.round(cx) - 1, Math.round(cx) - 1, r - 4, f === 0 ? C.gold : C.goldHi);
      p.circle(Math.round(cx), Math.round(cx), r - 3, f === 0 ? C.goldMid : C.gold);
      const g = glyph[f === 0 ? 'O' : 'X'];
      const s = Math.max(1, Math.floor((fw - 8) / 7));
      const gx = Math.round(cx - (5 * s) / 2) + 1;
      g.forEach((row, j) => [...row].forEach((ch, i) => {
        if (ch === 'X') {
          p.rect(gx + i * s, Math.round(cx - (5 * s) / 2) + 1 + j * s + 1, s, s, C.goldHi);
          p.rect(gx + i * s, Math.round(cx - (5 * s) / 2) + 1 + j * s, s, s, C.goldDeep);
        }
      }));
    });
  },

  // Checkpoint brazier: frame 0 unlit, frames 1-4 burning.
  torch(fw, fh, n) {
    return sheet(fw, fh, n, (p, f) => {
      const cx = Math.floor(fw / 2);
      p.line(cx - 1, fh - 1, cx - 3, fh - 1, C.goldDark);
      p.line(cx - 1, fh - 2, cx - 1, fh - 9, C.goldDark);
      p.line(cx, fh - 2, cx, fh - 9, C.goldMid);
      p.line(cx, fh - 1, cx + 2, fh - 1, C.goldDark);
      p.rect(cx - 2, fh - 10, 5, 1, C.goldMid);
      p.rect(cx - 4, fh - 13, 9, 3, C.gold);
      p.hline(cx - 4, fh - 13, 9, C.goldHi);
      p.hline(cx - 3, fh - 11, 7, C.goldDark);
      p.set(cx - 2, fh - 12, C.lapis); p.set(cx + 2, fh - 12, C.lapis);
      if (f === 0) {
        p.rect(cx - 3, fh - 14, 7, 1, C.black);
        p.set(cx - 1, fh - 14, C.inkSoft); p.set(cx + 1, fh - 14, C.inkSoft);
        return;
      }
      const flames = [
        [[0, 6], [-2, 4], [2, 4], [-1, 2], [1, 3]],
        [[0, 7], [-2, 3], [2, 5], [1, 2], [-1, 4]],
        [[0, 6], [-2, 5], [2, 3], [-1, 3], [1, 2]],
        [[1, 7], [-2, 4], [2, 4], [0, 3], [-1, 2]],
      ][(f - 1) % 4];
      const base = fh - 14;
      for (const [dx, h] of flames) p.rect(cx + dx, base - h + 1, 1, h, C.fire3);
      for (const [dx, h] of flames) if (h > 2) p.rect(cx + dx, base - h + 3, 1, h - 2, C.fire2);
      p.rect(cx - 1, base - 1, 3, 2, C.fire1);
      p.set(cx + (f % 2 ? 1 : -1), base - 8, C.fire2);
    });
  },

  offering(w, h) {
    const p = new Pix(w, h);
    p.rect(1, 4, 6, 3, C.leather);
    p.hline(0, 4, 8, C.hairHi);
    p.set(2, 5, C.hairDark); p.set(4, 6, C.hairDark); p.set(6, 5, C.hairDark);
    p.rect(1, 2, 2, 2, C.red); p.rect(3, 1, 2, 3, '#7a3f9a'); p.rect(5, 2, 2, 2, C.grassHi);
    p.set(1, 2, C.redHi); p.set(3, 1, '#a46ac0');
    p.outline(C.ink);
    return p;
  },

  offeringPile(w, h) {
    const p = new Pix(w, h);
    amphora(p, 5, h - 1, 12);
    amphora(p, w - 5, h - 1, 9);
    // Basket of fruit.
    p.rect(10, h - 6, 12, 5, C.leather);
    for (let x = 10; x < 22; x += 2) p.vline(x, h - 6, 5, C.hairDark);
    p.hline(9, h - 7, 14, C.hairHi);
    const fruit = [[12, h - 9, C.red], [15, h - 10, '#7a3f9a'], [18, h - 9, C.fire3], [14, h - 12, C.grassHi], [17, h - 12, C.red]];
    for (const [x, y, c] of fruit) { p.circle(x, y, 2, c); p.set(x - 1, y - 1, C.white); }
    // Grapes.
    for (const [x, y] of [[22, h - 8], [24, h - 8], [23, h - 6], [25, h - 6], [24, h - 4]]) p.circle(x, y, 1, '#6a3a8e');
    p.set(23, h - 10, C.grassMid);
    p.outline(C.ink);
    return p;
  },

  altar(w, h) {
    const p = new Pix(w, h);
    // Top slab, gold-trimmed body with a Greek key, plinth.
    p.rect(0, 0, w, 3, C.marble);
    p.hline(0, 0, w, C.marbleHi);
    p.hline(0, 3, w, C.goldMid);
    p.rect(3, 4, w - 6, h - 7, C.marble);
    p.vline(3, 4, h - 7, C.marbleHi);
    p.vline(w - 4, 4, h - 7, C.marbleShade);
    p.rect(5, 7, w - 10, 6, C.lapis);
    p.hline(5, 7, w - 10, C.goldMid); p.hline(5, 12, w - 10, C.goldMid);
    meanderRow(p, 6, 8, w - 12, C.gold);
    sunEmblem(p, Math.floor(w / 2), 10, 2);
    p.rect(1, h - 3, w - 2, 3, C.marbleMid);
    p.hline(1, h - 3, w - 2, C.marbleHi);
    p.hline(1, h - 1, w - 2, C.marbleShade);
    p.outline(C.ink);
    return p;
  },

  bolt(w, h) {
    const p = new Pix(w, h);
    const X = (v) => Math.round((v / 14) * (w - 2)) + 1;
    const Y = (v) => Math.round((v / 28) * (h - 2)) + 1;
    p.poly([[X(9), Y(0)], [X(1), Y(15)], [X(6), Y(15)], [X(3), Y(28)], [X(14), Y(10)], [X(8), Y(10)], [X(13), Y(0)]], C.fire2);
    p.line(X(9), Y(1), X(4), Y(13), C.white);
    p.line(X(9), Y(11), X(5), Y(23), C.white);
    p.outline(C.goldDark);
    p.outline(C.ink);
    return p;
  },

  glow(w, h) {
    const p = new Pix(w, h);
    const cx = w / 2;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cx) / cx;
        if (d < 0.45 && bayer(x, y) < 0.7) p.set(x, y, '#ffd44788');
        else if (d < 0.75 && bayer(x, y) < 0.4) p.set(x, y, '#ffb43a55');
        else if (d < 1 && bayer(x, y) < 0.15) p.set(x, y, '#ff8c1e44');
      }
    }
    return p;
  },

  treeOlive(w, h) {
    const p = new Pix(w, h);
    oliveTree(p, Math.floor(w / 2), h - 1, 1.6, 7);
    p.outline(C.ink);
    return p;
  },

  treeCypress(w, h) {
    const p = new Pix(w, h);
    cypressTree(p, Math.floor(w / 2), h, h - 4, Math.floor(w / 2) - 2);
    p.outline(C.ink);
    return p;
  },

  // Tiles.
  ground(w, h) {
    const p = new Pix(w, h);
    const r = rng(5);
    p.vgrad(0, 6, w, h - 6, [C.dirt, C.dirt, C.dirtDark, C.dirtDeep]);
    p.rect(0, 3, w, 3, C.grass);
    p.hline(0, 3, w, C.grassHi);
    for (let x = 0; x < w; x++) {
      if (x % 3 === 0) p.set(x, 2, C.grass);
      if (x % 6 === 1) { p.set(x, 1, C.grassHi); p.set(x, 2, C.grass); }
      if ((x * 7) % 5 < 2) p.set(x, 6, C.grassMid);
      if ((x * 5) % 7 === 0) p.set(x, 7, C.grassDark);
    }
    for (const x of [5, 19]) { p.set(x, 1, C.goldHi); p.set(x, 2, C.grassMid); }
    for (let i = 0; i < 7; i++) {
      const x = 1 + Math.floor(r() * (w - 5));
      const y = 12 + Math.floor(r() * (h - 18));
      const sw = 2 + Math.floor(r() * 3);
      p.rect(x, y, sw, 2, C.stone);
      p.hline(x, y + 2, sw, C.dirtDeep);
      p.set(x, y, C.white);
    }
    for (let i = 0; i < 10; i++) p.set(Math.floor(r() * w), 9 + Math.floor(r() * (h - 10)), C.dirtDark);
    return p;
  },

  plaza(w, h) {
    const p = new Pix(w, h);
    p.rect(0, 0, w, h, C.marble);
    p.hline(0, 0, w, C.marbleHi);
    for (let x = 0; x < w; x += 8) {
      p.vline(x, 1, h - 3, C.marbleShade);
      p.vline(x + 1, 1, h - 3, C.marbleHi);
    }
    p.hline(0, h - 2, w, C.marbleShade);
    p.hline(0, h - 1, w, C.marbleDark);
    return p;
  },

  ledge(w, h) { return slab(w, h, 'marble'); },
  ledgeL(w, h) { return slabCap(w, h, 'marble', false); },
  ledgeR(w, h) { return slabCap(w, h, 'marble', true); },
  ledgeCrumble(w, h) { return slab(w, h, 'sand'); },
  ledgeCrumbleL(w, h) { return slabCap(w, h, 'sand', false); },
  ledgeCrumbleR(w, h) { return slabCap(w, h, 'sand', true); },

  ledgeMoving(w, h) {
    const p = new Pix(w, h);
    p.hline(0, 0, w, C.goldHi);
    p.hline(0, 1, w, C.gold);
    p.rect(0, 2, w, 3, C.lapis);
    meanderRow(p, 0, 2, w, C.gold);
    p.hline(0, 5, w, C.gold);
    p.hline(0, 6, w, C.goldDark);
    p.hline(0, 7, w, C.ink);
    return p;
  },

  // Temple.
  templeFloor(w, h) {
    const p = new Pix(w, h);
    p.hline(0, 0, w, C.marbleHi);
    p.rect(0, 1, w, 2, C.marble);
    p.hline(0, 3, w, C.goldMid);
    p.rect(0, 4, w, 3, C.lapis);
    meanderRow(p, 0, 4, w, C.gold);
    p.hline(0, 7, w, C.goldMid);
    for (let y = 8; y < h; y += 4) {
      p.rect(0, y, w, 4, C.marbleMid);
      p.hline(0, y, w, C.marble);
      for (let x = ((y / 4) % 2) * 8; x < w; x += 16) p.vline(x, y, 4, C.marbleShade);
    }
    p.hline(0, h - 1, w, C.marbleDark);
    return p;
  },

  templeFrieze(w, h) {
    const p = new Pix(w, h);
    p.hline(0, 0, w, C.marbleHi);
    p.rect(0, 1, w, 3, C.marble);
    p.hline(0, 4, w, C.goldMid);
    p.rect(0, 5, w, 5, C.lapis);
    meanderRow(p, 0, 6, w, C.gold);
    p.hline(0, 10, w, C.goldMid);
    p.rect(0, 11, w, 4, C.marbleMid);
    for (let x = 0; x < w; x += 4) p.rect(x, 12, 2, 2, C.marble);
    p.hline(0, h - 1, w, C.marbleShade);
    return p;
  },

  columnShaft(w, h) {
    const p = new Pix(w, h);
    p.rect(0, 0, w, h, C.marble);
    for (let x = 2; x < w - 2; x += 3) p.vline(x, 0, h, C.marbleMid);
    p.vline(0, 0, h, C.marbleHi);
    p.vline(1, 0, h, C.marbleHi);
    p.vline(w - 2, 0, h, C.marbleShade);
    p.vline(w - 1, 0, h, C.marbleDark);
    return p;
  },

  columnCap(w, h) {
    const p = new Pix(w, h);
    p.rect(0, 0, w, 2, C.marble);
    p.hline(0, 0, w, C.marbleHi);
    p.rect(2, 2, w - 4, 3, C.marbleMid);
    for (const x of [3, w - 4]) { p.circle(x, 4, 2, C.gold); p.set(x, 4, C.goldDark); }
    p.hline(4, h - 3, w - 8, C.gold);
    p.rect(4, h - 2, w - 8, 2, C.marble);
    p.outline(C.ink);
    return p;
  },

  columnBase(w, h) {
    const p = new Pix(w, h);
    p.rect(4, 0, w - 8, 2, C.marble);
    p.hline(3, 2, w - 6, C.gold);
    p.rect(2, 3, w - 4, 2, C.marbleMid);
    p.rect(0, h - 3, w, 3, C.marble);
    p.hline(0, h - 3, w, C.marbleHi);
    p.outline(C.ink);
    return p;
  },

  templeBg(w, h) {
    const p = new Pix(w, h);
    // Interior wall: shaded marble blocks.
    for (let row = 0; row * 8 < h; row++) {
      const off = (row % 2) * 12;
      for (let col = -1; col * 24 < w + 24; col++) {
        const x = col * 24 + off;
        const y = row * 8;
        p.rect(x, y, 24, 8, C.marbleMid);
        p.hline(x, y, 23, C.marble);
        p.hline(x, y + 7, 24, C.marbleShade);
        p.vline(x + 23, y, 8, C.marbleShade);
      }
    }
    // Shadow under the ceiling.
    for (let y = 0; y < 6; y++) for (let x = 0; x < w; x++) if (bayer(x, y) < (6 - y) / 7) p.set(x, y, C.marbleShade);
    // Pilasters and banners.
    const pilaster = (x) => {
      p.rect(x, 6, 8, h - 6, C.marble);
      for (let k = 1; k < 7; k += 2) p.vline(x + k, 9, h - 12, C.marbleMid);
      p.vline(x, 6, h - 6, C.marbleHi);
      p.vline(x + 7, 6, h - 6, C.marbleShade);
      p.rect(x - 1, 6, 10, 3, C.marbleHi);
      p.hline(x - 1, 9, 10, C.gold);
    };
    const banner = (x) => {
      p.rect(x, 12, 18, 52, C.lapis);
      p.vline(x, 12, 52, C.lapisHi);
      p.vline(x + 17, 12, 52, C.lapisDark);
      p.hline(x - 1, 11, 20, C.goldDark);
      p.rect(x, 12, 18, 2, C.gold);
      for (let i = 0; i < 9; i++) { p.set(x + i, 64 + i, C.lapis); p.set(x + 17 - i, 64 + i, C.lapis); }
      for (let i = 0; i < 9; i++) p.hline(x + i, 64 + i, 18 - i * 2, C.lapis);
      for (let i = 0; i < 9; i++) { p.set(x + i, 64 + i, C.gold); p.set(x + 17 - i, 64 + i, C.gold); }
      sunEmblem(p, x + 9, 34, 4);
      p.hline(x + 3, 50, 12, C.gold);
      p.hline(x + 5, 52, 8, C.goldDark);
    };
    pilaster(4); banner(18); pilaster(44); pilaster(w - 52); banner(w - 38); pilaster(w - 12);
    // A soft shadow where the wall meets the floor.
    for (let y = h - 8; y < h; y++) for (let x = 0; x < w; x++) if (bayer(x, y) < (y - (h - 8)) / 10) p.set(x, y, C.marbleShade);
    return p;
  },

  shelves(w, h) {
    const p = new Pix(w, h);
    // Dark lapis niche with marble posts and gold-edged shelves.
    p.rect(4, 3, w - 8, h - 3, C.lapisDark);
    for (let y = 3; y < h; y += 2) p.hline(4, y, w - 8, C.lapisDeep);
    for (const x of [0, w - 4]) {
      p.rect(x, 0, 4, h, C.marble);
      p.vline(x, 0, h, C.marbleHi);
      p.vline(x + 3, 0, h, C.marbleShade);
    }
    p.rect(0, 0, w, 3, C.marble);
    p.hline(0, 0, w, C.marbleHi);
    p.hline(0, 3, w, C.gold);
    for (let r = 0; r < 8; r++) {
      const y = r * 15 + 16;
      p.rect(2, y, w - 4, 2, C.marbleMid);
      p.hline(2, y, w - 4, C.marbleHi);
      p.hline(2, y + 2, w - 4, C.goldDark);
    }
    p.rect(0, h - 3, w, 3, C.marbleMid);
    p.outline(C.ink);
    return p;
  },

  pediment(w, h) {
    const p = new Pix(w, h);
    const mid = Math.floor(w / 2);
    const base = h - 9;
    p.poly([[0, base + 1], [mid, 1], [w, base + 1]], C.marbleShade);
    p.poly([[4, base], [mid, 4], [w - 4, base]], C.marble);
    p.poly([[18, base - 1], [mid, 11], [w - 18, base - 1]], C.marbleMid);
    p.line(1, base, mid, 1, C.marbleHi);
    p.line(mid, 1, w - 1, base, C.marbleHi);
    p.line(16, base - 1, mid, 10, C.gold);
    p.line(mid, 10, w - 16, base - 1, C.gold);
    // Apollo's sun with laurel sprays.
    sunEmblem(p, mid, base - 14, 6);
    // Cornice with frieze.
    p.rect(0, base + 1, w, 8, C.marble);
    p.hline(0, base + 1, w, C.marbleHi);
    for (let x = 0; x < w; x += 4) p.rect(x, base + 4, 2, 2, C.marbleShade);
    p.hline(0, base + 7, w, C.goldMid);
    p.hline(0, h - 1, w, C.marbleShade);
    // Gold akroteria.
    p.circle(mid, 2, 2, C.gold); p.set(mid, 1, C.goldHi);
    p.circle(2, base - 1, 2, C.gold); p.circle(w - 3, base - 1, 2, C.gold);
    p.outline(C.ink);
    return p;
  },

  templeBase(w, h) {
    const p = new Pix(w, h);
    const edge = ridge(w * 2, 61, [[5, 3], [9, 2], [17, 1]]);
    const bottom = (x) => {
      const u = (2 * x) / w - 1;
      return Math.round(4 + Math.pow(Math.max(0, 1 - u * u), 0.7) * (h - 10) + edge(x));
    };
    for (let x = 0; x < w; x++) {
      const b = Math.min(h - 1, bottom(x));
      for (let y = 0; y <= b; y++) {
        const t = y / (h - 6);
        const c = t < 0.25 ? C.stone : t < 0.55 ? (bayer(x, y) < (t - 0.25) * 3 ? C.stoneShade : C.stone)
          : t < 0.8 ? C.stoneShade : (bayer(x, y) < 0.5 ? C.marbleDark : C.stoneShade);
        p.set(x, y, c);
      }
      if (b > 2) p.set(x, b, C.ink);
    }
    const r = rng(9);
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(r() * (w - 20));
      const y = 6 + Math.floor(r() * 24);
      if (y < bottom(x) - 3) p.hline(x, y, 3 + Math.floor(r() * 8), C.marbleDark);
    }
    p.rect(0, 0, w, 2, C.grass);
    p.hline(0, 0, w, C.grassHi);
    for (let x = 0; x < w; x += 2) {
      const len = Math.floor(r() * 4);
      p.vline(x, 2, len, C.grassMid);
    }
    for (let i = 0; i < 16; i++) {
      const x = 10 + Math.floor(r() * (w - 20));
      const b = bottom(x);
      const len = 3 + Math.floor(r() * 9);
      for (let j = 0; j < len; j++) p.set(x + (j % 4 === 3 ? 1 : 0), b - 2 + j, j % 3 ? C.grassMid : C.grassDark);
    }
    return p;
  },

  doorSeal(w, h) {
    const p = new Pix(w, h);
    p.rect(0, 0, w, h, C.goldDeep);
    p.vgrad(1, 1, w - 2, h - 2, [C.gold, C.goldMid, C.goldDark]);
    p.vline(Math.floor(w / 2), 1, h - 2, C.goldDeep);
    for (const y of [4, h - 8]) { p.rect(1, y, w - 2, 3, C.lapis); meanderRow(p, 1, y, w - 2, C.gold); }
    sunEmblem(p, Math.floor(w / 2), Math.floor(h / 2), 2);
    p.vline(1, 1, h - 2, C.goldHi);
    return p;
  },

  // In-game backdrop.
  sky(w, h) {
    const p = new Pix(w, h);
    p.vgrad(0, 0, w, h, ['#2a6fd8', '#3a82e2', '#4f97ea', '#68adf0', '#86c3f4', '#a6d6f6', '#c8e6f4', '#ecf3e6']);
    return p;
  },

  clouds(w, h) {
    const p = new Pix(w, h);
    const r = rng(17);
    for (let i = 0; i < 16; i++) {
      const cloud = cloudShape(16 + Math.floor(r() * 30), 6 + Math.floor(r() * 6), 100 + i);
      const x = Math.floor(r() * w);
      const y = Math.floor(8 + r() * (h - 80));
      wrapped(w, x, (xx) => p.blit(cloud, xx, y));
    }
    return p;
  },

  mountains(w, h) {
    const p = new Pix(w, h);
    const sea = h - 22;
    const far = ridge(w, 3, [[2, 10], [3, 7], [5, 4], [9, 2]]);
    const near = ridge(w, 7, [[3, 6], [4, 5], [7, 3], [13, 1]]);
    for (let x = 0; x < w; x++) {
      const top = Math.round(h * 0.42 + far(x));
      for (let y = top; y < sea; y++) p.set(x, y, y === top ? '#c4d4ec' : bayer(x, y) < (y - top) / 60 ? '#8fa8d2' : '#a5badc');
      const top2 = Math.round(h * 0.62 + near(x));
      for (let y = top2; y < sea; y++) p.set(x, y, y === top2 ? '#9fc49a' : bayer(x, y) < 0.3 ? '#5f8f68' : '#6e9f72');
    }
    // A white village with terracotta roofs on the nearer hills.
    const r = rng(12);
    for (let i = 0; i < 12; i++) {
      const x = 120 + i * 6 + Math.floor(r() * 3);
      const y = Math.round(h * 0.62 + near(x)) + 1 + Math.floor(r() * 4);
      p.rect(x, y - 2, 4, 3, C.white);
      p.hline(x, y - 3, 4, i % 5 === 0 ? C.lapis : C.terra);
      p.set(x + 1, y - 1, C.inkSoft);
    }
    p.vgrad(0, sea, w, h - sea, [C.seaLight, C.sea, C.seaMid]);
    p.hline(0, sea, w, C.seaHi);
    for (let i = 0; i < 70; i++) p.hline(Math.floor(r() * w), sea + 2 + Math.floor(r() * (h - sea - 3)), 1 + Math.floor(r() * 4), C.seaHi);
    return p;
  },

  near(w, h) {
    const p = new Pix(w, h);
    const hill = ridge(w, 11, [[2, 8], [3, 5], [6, 3], [11, 1]]);
    const top = (x) => Math.round(h * 0.55 + hill(((x % w) + w) % w));
    for (let x = 0; x < w; x++) {
      const t = top(x);
      for (let y = t; y < h; y++) {
        const d = y - t;
        const c = d === 0 ? C.grassHi : d < 8 ? C.grass : d < 30 ? (bayer(x, y) < (d - 8) / 22 ? C.grassMid : C.grass)
          : (bayer(x, y) < (d - 30) / 40 ? C.grassDark : C.grassMid);
        p.set(x, y, c);
      }
    }
    const r = rng(41);
    for (let i = 0; i < 4; i++) {
      const x = Math.floor(r() * w);
      wrapped(w, x, (xx) => brokenColumn(p, xx, top(xx) + 2, 8 + Math.floor(r() * 8), rng(i + 5)));
    }
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(r() * w);
      wrapped(w, x, (xx) => oliveTree(p, xx, top(xx) + 1, 0.8, i + 50));
    }
    for (let i = 0; i < 12; i++) {
      const x = Math.floor(r() * w);
      const hh = 14 + Math.floor(r() * 14);
      wrapped(w, x, (xx) => cypressTree(p, xx, top(xx) + 2, hh, 3 + Math.floor(r() * 2)));
    }
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(r() * w);
      p.set(x, top(x) + 2 + Math.floor(r() * 16), r() < 0.5 ? C.goldHi : C.white);
    }
    return p;
  },
};

// ---------------------------------------------------------------- shared parts

export function amphora(p, cx, base, height) {
  const s = height / 11;
  const r = Math.max(2, Math.round(4 * s));
  const cy = Math.round(base - height * 0.42);
  p.rect(Math.round(cx - 1.5 * s), base - Math.max(1, Math.round(s)), Math.max(2, Math.round(3 * s)), Math.max(1, Math.round(s)), C.terraMid);
  p.ellipse(cx, cy, r, Math.round(r * 1.05), C.terra);
  p.rect(Math.round(cx - s), Math.round(base - height + 1), Math.max(2, Math.round(2 * s)), Math.max(1, Math.round(3 * s)), C.terra);
  p.rect(Math.round(cx - 2 * s), Math.round(base - height), Math.max(3, Math.round(4 * s)) + 1, 1, C.terraMid);
  p.set(Math.round(cx - 2 * s) - 1, Math.round(base - height + 2), C.terraDark);
  p.set(Math.round(cx + 2 * s) + 1, Math.round(base - height + 2), C.terraDark);
  for (let x = cx - r; x <= cx + r; x++) {
    for (let y = cy - 1; y <= cy; y++) if (p.alpha(x, y)) p.set(x, y, C.black);
  }
  for (let x = cx - r + 1; x < cx + r; x += 2) p.set(x, cy - 1, C.terraMid);
  for (let y = cy - r + 1; y < cy - 1; y++) p.set(cx - r + 1, y, C.terraHi);
}

function slab(w, h, kind) {
  const p = new Pix(w, h);
  const sand = kind === 'sand';
  const [hi, base, mid, shade] = sand
    ? ['#f6e2b4', '#e4c690', '#c9a46a', '#94703f']
    : [C.marbleHi, C.marble, C.marbleMid, C.marbleShade];
  p.hline(0, 0, w, hi);
  p.rect(0, 1, w, 3, base);
  p.hline(0, 4, w, sand ? mid : C.goldMid);
  p.rect(0, 5, w, 1, mid);
  p.hline(0, 6, w, shade);
  p.hline(0, 7, w, C.ink);
  if (sand) {
    p.line(3, 1, 5, 4, C.dirtDeep); p.line(5, 4, 4, 6, C.dirtDeep); p.line(11, 1, 12, 3, C.dirtDeep);
  } else {
    p.set(4, 2, C.marbleMid); p.set(5, 3, C.marbleMid); p.set(11, 1, C.marbleMid);
  }
  return p;
}

function slabCap(w, h, kind, right) {
  const p = slab(w, h, kind);
  // Rounded, outlined end.
  const xs = right ? [w - 1, w - 2] : [0, 1];
  p.vline(xs[0], 1, h - 2, C.ink);
  p.clear(xs[0], 0); p.clear(xs[0], h - 1);
  p.set(xs[1], 0, C.ink);
  p.vline(right ? w - 3 : 2, 1, 3, kind === 'sand' ? '#f6e2b4' : C.marbleHi);
  return p;
}
