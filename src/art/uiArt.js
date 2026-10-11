// Pixel-art UI in the style of Apollo's temple: lapis-blue panels with gold
// borders and sun rosettes, a gold Greek-key band, marble keycaps, gold
// frames. Drawn in art pixels at the shared ART_SCALE, like all other art.

import { Pix } from './pixel.js';
import { C } from './generators.js';

export const LAPIS = {
  deep: '#0e1438', navy: '#18225a', mid: '#22307a', light: '#3d52a8', glint: '#6f86d8',
};

// 1 px dark outline, 1 px gold with a light top-left, 1 px dark inner line.
function goldBorder(p, w, h) {
  p.rect(0, 0, w, h, LAPIS.deep);
  p.rect(1, 1, w - 2, h - 2, C.gold);
  p.hline(1, 1, w - 2, C.goldHi); p.vline(1, 1, h - 2, C.goldHi);
  p.hline(1, h - 2, w - 2, C.goldDark); p.vline(w - 2, 1, h - 2, C.goldDark);
  p.rect(2, 2, w - 4, h - 4, LAPIS.deep);
}

function corners(p, w, h, inset) {
  for (const [x, y] of [[inset, inset], [w - 1 - inset, inset], [inset, h - 1 - inset], [w - 1 - inset, h - 1 - inset]]) {
    p.set(x, y, C.gold);
    p.set(x - 1, y, C.goldDark); p.set(x + 1, y, C.goldDark);
    p.set(x, y - 1, C.goldDark); p.set(x, y + 1, C.goldDark);
  }
}

export const UI_GENERATORS = {
  panel(w, h) {
    const p = new Pix(w, h);
    goldBorder(p, w, h);
    p.rect(3, 3, w - 6, h - 6, LAPIS.navy);
    corners(p, w, h, 4);
    return p;
  },

  dialog(w, h) {
    const p = new Pix(w, h);
    // Marble rim with gold studs, then gold, then a lapis field.
    p.rect(0, 0, w, h, LAPIS.deep);
    p.rect(1, 1, w - 2, h - 2, C.marble);
    p.hline(1, 1, w - 2, C.marbleHi); p.vline(1, 1, h - 2, C.marbleHi);
    p.hline(1, h - 2, w - 2, C.marbleShade); p.vline(w - 2, 1, h - 2, C.marbleShade);
    p.rect(3, 3, w - 6, h - 6, LAPIS.deep);
    p.rect(4, 4, w - 8, h - 8, C.gold);
    p.hline(4, 4, w - 8, C.goldHi);
    p.rect(5, 5, w - 10, h - 10, LAPIS.navy);
    corners(p, w, h, 6);
    return p;
  },

  button(w, h) {
    const p = new Pix(w, h);
    p.rect(1, 0, w - 2, h, LAPIS.deep); p.rect(0, 1, w, h - 2, LAPIS.deep);
    p.vgrad(1, 1, w - 2, h - 2, [C.goldHi, C.gold, C.goldMid]);
    p.hline(2, 1, w - 4, '#fff8d8');
    p.hline(1, h - 2, w - 2, C.goldDark);
    return p;
  },

  meander(w, h) {
    const p = new Pix(w, h);
    p.rect(0, 0, w, h, LAPIS.mid);
    p.hline(0, 0, w, C.goldDark); p.hline(0, h - 1, w, C.goldDark);
    for (let x = 0; x < w; x++) {
      const k = x % 4;
      if (k < 3) p.set(x, 1, C.gold);
      if (k === 0 || k === 2) p.set(x, 2, C.gold);
      if (k !== 1) p.set(x, 3, C.gold);
    }
    return p;
  },

  key(w, h) {
    const p = new Pix(w, h);
    p.rect(1, 0, w - 2, h, LAPIS.deep); p.rect(0, 1, w, h - 2, LAPIS.deep);
    p.rect(1, 1, w - 2, h - 2, C.marble);
    p.hline(1, 1, w - 2, C.marbleHi);
    p.hline(1, h - 2, w - 2, C.marbleShade);
    return p;
  },

  frame(w, h) {
    const p = new Pix(w, h);
    goldBorder(p, w, h);
    return p;
  },

  plaque(w, h) {
    const p = new Pix(w, h);
    p.rect(1, 0, w - 2, h, LAPIS.deep); p.rect(0, 1, w, h - 2, LAPIS.deep);
    p.rect(1, 1, w - 2, h - 2, C.gold);
    p.hline(1, 1, w - 2, C.goldHi);
    p.rect(2, 2, w - 4, h - 4, LAPIS.mid);
    return p;
  },

  divider(w, h) {
    const p = new Pix(w, h);
    const cy = Math.floor(h / 2);
    p.hline(3, cy, w - 6, C.gold);
    p.hline(3, cy + 1, w - 6, C.goldDark);
    p.rect(1, cy - 1, 2, 3, C.gold); p.rect(w - 3, cy - 1, 2, 3, C.gold);
    const mx = Math.floor(w / 2);
    p.rect(mx - 4, 0, 9, h, LAPIS.navy);
    p.rect(mx - 1, cy - 1, 3, 3, C.gold); p.set(mx, cy, C.goldHi);
    p.set(mx, 0, C.gold); p.set(mx, h - 1, C.gold); p.set(mx - 3, cy, C.gold); p.set(mx + 3, cy, C.gold);
    p.outline(LAPIS.deep);
    return p;
  },

  arrow(w, h) {
    const p = new Pix(w, h);
    for (let j = 0; j < h; j++) p.hline(j, j, w - j * 2, j === 0 ? C.goldHi : C.gold);
    return p;
  },

  sunCoin(w, h) {
    const p = new Pix(w, h);
    const c = Math.floor(w / 2);
    p.circle(c, c, c - 1, C.goldDark);
    p.circle(c, c, c - 2, C.gold);
    p.rect(c - 1, c - 1, 2, 2, C.goldHi);
    for (const [dx, dy] of [[0, -3], [0, 2], [-3, 0], [2, 0]]) p.set(c + dx, c + dy, C.goldMid);
    p.outline(C.ink);
    return p;
  },
};
