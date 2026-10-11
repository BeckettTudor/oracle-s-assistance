// Scenery for the title and results screens, in art pixels: an Aegean
// morning with sea and distant islands, a coast with a white village, a
// foreground of ruins, olive and cypress trees framing the view, and the
// floating Temple of Apollo.

import { Pix, rng, bayer } from './pixel.js';
import {
  C, ridge, cloudShape, cypressTree, oliveTree, brokenColumn, sunEmblem, leafBall,
} from './generators.js';

const HORIZON = 188; // art px (376 logical)

// Limestone boulder lit from the upper left.
function stoneBlock(p, x, y, w, h) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const nx = (i - w / 2) / (w / 2);
      const ny = (j - h / 2) / (h / 2);
      if (nx * nx * 0.8 + ny * ny * 0.6 > 1 && j < h * 0.6) continue;
      const light = -nx - ny;
      const c = light > 0.6 ? C.marbleHi : light > -0.3 ? C.stone : light > -0.9 ? C.stoneShade : C.marbleDark;
      p.set(Math.round(cx - w / 2 + i), Math.round(cy - h / 2 + j), bayer(i, j) < 0.1 ? C.stoneShade : c);
    }
  }
}

function bush(p, x, y, r) {
  leafBall(p, x, y, r, [C.grassHi, C.grass, C.grassMid]);
}

export const MENU_GENERATORS = {
  menuSky(w, h) {
    const p = new Pix(w, h);
    p.vgrad(0, 0, w, HORIZON, ['#2a6fd8', '#3a82e2', '#4f97ea', '#68adf0', '#8cc6f4', '#b4dcf6', '#e2f0ee', '#f6f0d6']);
    // Distant islands on the horizon.
    const isl = ridge(w, 4, [[3, 3], [5, 2], [9, 1]]);
    for (let x = 0; x < w; x++) {
      const t = Math.round(HORIZON - 3 - Math.max(0, isl(x) + Math.sin(x / 40) * 4));
      for (let y = t; y < HORIZON; y++) p.set(x, y, '#a9bfe0');
    }
    p.vgrad(0, HORIZON, w, h - HORIZON, [C.seaHi, C.seaLight, C.sea, C.seaMid, C.seaDeep]);
    const r = rng(77);
    for (let i = 0; i < 160; i++) {
      const y = HORIZON + 2 + Math.floor(Math.pow(r(), 1.4) * (h - HORIZON - 3));
      p.hline(Math.floor(r() * w), y, 1 + Math.floor(r() * 5), y < HORIZON + 20 ? C.white : C.seaHi);
    }
    return p;
  },

  menuCoast(w, h) {
    const p = new Pix(w, h);
    // Blue mountains behind the bay.
    const far = ridge(w, 3, [[2, 10], [3, 6], [7, 3]]);
    for (let x = 0; x < w; x++) {
      const top = Math.round(HORIZON - 26 - Math.max(0, far(x) + 10 * Math.sin((x / w) * Math.PI)));
      for (let y = top; y < HORIZON; y++) p.set(x, y, y === top ? '#c4d4ec' : bayer(x, y) < (y - top) / 50 ? '#8fa8d2' : '#a5badc');
    }
    // Left headland with the village, right headland with cliffs.
    const left = (x) => Math.round(HORIZON - 40 + (x / 170) ** 1.6 * 70 + Math.sin(x / 9) * 2);
    for (let x = 0; x < 170; x++) {
      const t = left(x);
      for (let y = t; y < HORIZON + 26; y++) {
        const d = y - t;
        p.set(x, y, d < 2 ? C.grassHi : d < 9 ? C.grass : bayer(x, y) < 0.4 ? C.stoneShade : C.stone);
      }
    }
    const right = (x) => Math.round(HORIZON - 44 + ((w - x) / 140) ** 1.5 * 70 + Math.sin(x / 7) * 2);
    for (let x = w - 140; x < w; x++) {
      const t = right(x);
      for (let y = t; y < HORIZON + 30; y++) {
        const d = y - t;
        p.set(x, y, d < 2 ? C.grassHi : d < 7 ? C.grass : bayer(x, y) < 0.35 ? C.stoneShade : C.stone);
      }
    }
    // Village: white houses with terracotta roofs, a blue dome.
    const r = rng(12);
    for (let i = 0; i < 22; i++) {
      const x = 30 + Math.floor(r() * 110);
      const y = left(x) + 2 + Math.floor(r() * 10);
      p.rect(x, y, 4, 3, C.white);
      p.hline(x, y + 2, 4, C.cloudShade);
      p.hline(x, y - 1, 4, i % 7 === 0 ? C.lapis : C.terra);
      p.set(x + 1, y + 1, C.inkSoft);
    }
    for (let i = 0; i < 9; i++) cypressTree(p, 10 + i * 17, left(10 + i * 17) + 2, 12 + (i % 3) * 3, 2);
    for (let i = 0; i < 5; i++) cypressTree(p, w - 120 + i * 22, right(w - 120 + i * 22) + 2, 10 + (i % 2) * 5, 2);
    return p;
  },

  menuRuins(w, h) {
    const p = new Pix(w, h);
    const r = rng(31);
    // Terrain profile: rocky banks rising at both edges, a low ledge across
    // the bottom. Everything below is placed exactly on this surface.
    const bump = ridge(w, 8, [[9, 2], [17, 1]]);
    const bank = (t) => t * t * (3 - 2 * t); // smoothstep
    const ground = (x) => {
      const left = x < 120 ? bank(1 - x / 120) : 0;
      const right = x > w - 120 ? bank((x - (w - 120)) / 120) : 0;
      return Math.round(h - 12 - 88 * Math.max(left, right) + bump(x));
    };
    for (let x = 0; x < w; x++) {
      const g = ground(x);
      for (let y = g; y < h; y++) {
        const d = y - g;
        let c;
        if (d < 2) c = d === 0 ? C.grassHi : C.grass;
        else if (d < 4) c = bayer(x, y) < 0.5 ? C.grassMid : C.stone;
        else c = bayer(x, y) < Math.min(0.8, d / 60) ? C.stoneShade : C.stone;
        p.set(x, y, c);
      }
    }
    // Block seams in the rock.
    for (let i = 0; i < 60; i++) {
      const x = Math.floor(r() * w);
      const y = ground(x) + 6 + Math.floor(r() * 40);
      if (y < h - 1) { p.hline(x, y, 4 + Math.floor(r() * 10), C.stoneShade); p.hline(x, y + 1, 3, C.marbleHi); }
    }
    const onGround = (x) => ground(Math.max(0, Math.min(w - 1, x)));
    // Boulders resting half-sunk on the surface.
    for (let i = 0; i < 14; i++) {
      const x = i < 7 ? Math.floor(r() * 110) : w - 110 + Math.floor(r() * 110);
      const bw = 12 + Math.floor(r() * 12);
      const bh = 8 + Math.floor(r() * 6);
      stoneBlock(p, x - bw / 2, onGround(x) - bh + 3, bw, bh);
    }
    // Fallen column drum on the left bank; broken columns standing on the right.
    const fx = 70;
    const fy = onGround(fx + 16) - 10;
    p.rect(fx, fy, 30, 10, C.marble);
    for (let x = fx + 2; x < fx + 28; x += 4) p.vline(x, fy + 1, 8, C.marbleMid);
    p.hline(fx, fy, 30, C.marbleHi); p.hline(fx, fy + 9, 30, C.marbleShade);
    p.ellipse(fx + 30, fy + 5, 2, 5, C.marbleMid);
    brokenColumn(p, w - 34, onGround(w - 31) + 1, 48, rng(4));
    brokenColumn(p, w - 64, onGround(w - 61) + 1, 18, rng(5));
    // Olive tree on the left, cypresses on the right, all rooted.
    oliveTree(p, 26, onGround(26) + 1, 2.6, 3);
    for (const [x, hh] of [[w - 20, 92], [w - 46, 76], [w - 76, 58], [w - 98, 40]]) cypressTree(p, x, onGround(x) + 2, hh, 6);
    // Bushes and flowers along the surface.
    for (let i = 0; i < 22; i++) {
      const x = Math.floor(r() * w);
      const rad = 3 + Math.floor(r() * 3);
      bush(p, x, onGround(x) - rad + 2, rad);
    }
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(r() * w);
      p.set(x, onGround(x) - 1, r() < 0.6 ? C.goldHi : C.white);
    }
    p.outline(C.ink);
    return p;
  },

  menuTemple(w, h) {
    const p = new Pix(w, h);
    const cx = Math.floor(w / 2);
    // Floating island with vines.
    const top = 110;
    const edge = ridge(w * 2, 44, [[7, 2], [13, 1]]);
    for (let x = 6; x < w - 6; x++) {
      const u = (2 * x) / w - 1;
      const b = Math.round(top + 4 + Math.pow(Math.max(0, 1 - u * u), 0.8) * (h - top - 8) + edge(x));
      for (let y = top; y < Math.min(h, b); y++) {
        const t = (y - top) / (h - top);
        p.set(x, y, t < 0.3 ? C.stone : bayer(x, y) < t ? C.stoneShade : C.stone);
      }
      if (b < h) p.set(x, b, C.ink);
    }
    p.rect(6, top, w - 12, 2, C.grass);
    p.hline(6, top, w - 12, C.grassHi);
    const r = rng(5);
    for (let i = 0; i < 14; i++) {
      const x = 10 + Math.floor(r() * (w - 20));
      for (let j = 0; j < 4 + Math.floor(r() * 10); j++) p.set(x, top + 2 + j, j % 3 ? C.grassMid : C.grassDark);
    }
    // Stylobate.
    for (let s = 0; s < 3; s++) {
      const sw = 116 - s * 8;
      const y = top - 3 - s * 3;
      p.rect(cx - sw / 2, y, sw, 3, C.marble);
      p.hline(cx - sw / 2, y, sw, C.marbleHi);
      p.hline(cx - sw / 2, y + 2, sw, C.marbleShade);
    }
    // Columns with a lapis interior and a glimpse of the sun medallion.
    const colTop = 46;
    const colBottom = top - 9;
    p.rect(cx - 46, colTop, 92, colBottom - colTop, C.lapisDark);
    sunEmblem(p, cx, Math.floor((colTop + colBottom) / 2), 5, C.goldMid, C.goldDark, C.gold);
    for (let i = 0; i < 6; i++) {
      const x = cx - 50 + i * 19;
      p.rect(x, colTop, 7, colBottom - colTop, C.marble);
      p.vline(x, colTop, colBottom - colTop, C.marbleHi);
      p.vline(x + 3, colTop + 2, colBottom - colTop - 3, C.marbleMid);
      p.vline(x + 6, colTop, colBottom - colTop, C.marbleShade);
      p.rect(x - 1, colTop - 2, 9, 2, C.marble);
      p.hline(x - 1, colTop - 1, 9, C.gold);
      p.rect(x - 1, colBottom - 1, 9, 1, C.marbleMid);
    }
    // Entablature with gold key, pediment with the sun.
    p.rect(cx - 56, colTop - 9, 112, 7, C.marble);
    p.hline(cx - 56, colTop - 9, 112, C.marbleHi);
    p.rect(cx - 56, colTop - 7, 112, 3, C.lapis);
    for (let x = cx - 56; x < cx + 56; x++) {
      const k = (x - cx + 56) % 4;
      if (k < 3) p.set(x, colTop - 7, C.gold);
      if (k === 0 || k === 2) p.set(x, colTop - 6, C.gold);
      if (k !== 1) p.set(x, colTop - 5, C.gold);
    }
    const pb = colTop - 9;
    p.poly([[cx - 60, pb], [cx, pb - 26], [cx + 60, pb]], C.marbleShade);
    p.poly([[cx - 56, pb - 1], [cx, pb - 24], [cx + 56, pb - 1]], C.marble);
    p.line(cx - 60, pb, cx, pb - 26, C.marbleHi);
    p.line(cx, pb - 26, cx + 60, pb, C.marbleHi);
    sunEmblem(p, cx, pb - 9, 3);
    p.circle(cx, pb - 27, 2, C.gold);
    p.outline(C.ink, [0, 0, w, top + 2]);
    return p;
  },

  menuCloud(fw, fh, frames) {
    const p = new Pix(fw * frames, fh);
    for (let f = 0; f < frames; f++) p.blit(cloudShape(fw - 10 - f * 8, fh - 12 + f, 300 + f), f * fw + 2, 2);
    return p;
  },

  menuBird(fw, fh, frames) {
    const p = new Pix(fw * frames, fh);
    const shapes = [['X...X', '.X.X.', '..X..'], ['.....', 'XX.XX', '..X..']];
    shapes.forEach((rows, f) => rows.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch === 'X') p.set(f * fw + i, j, C.inkSoft);
    })));
    return p;
  },
};
