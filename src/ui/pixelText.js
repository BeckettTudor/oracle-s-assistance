// Pixel-art lettering for titles: Cinzel is rasterised at 1x, hard-thresholded
// (no anti-aliasing), filled with banded colour, outlined and given a hard
// drop shadow. The result is a texture scaled up with nearest-neighbour, so
// it reads like hand-pixelled 16-bit title lettering.

import { Pix } from '../art/pixel.js';
import { FONTS } from '../config.js';

export const PALETTES = {
  gold: ['#fffbe0', '#fff1a8', '#f2c14e', '#e8a93a', '#c4842a', '#a8741c'],
  marble: ['#ffffff', '#fbf8f1', '#ece5d6', '#d9cfbb', '#b3a68e'],
  green: ['#f0ffd0', '#c6ee8a', '#8fd05a', '#5fa43a'],
  amber: ['#fff4c0', '#ffd870', '#f2a83a', '#c47a1c'],
  red: ['#ffe0d0', '#ffa080', '#ec6a4e', '#b0381f'],
  cream: ['#fff6dc', '#fff6dc', '#f1e2bf'],
};

const OUTLINE = '#0e1438';
const SHADOW = '#070a1e';

function textureKey(str, size, palette) {
  return `ptxt_${palette}_${size}_${str}`;
}

// Large lettering is drawn at half size and doubled, so it shares the art's
// pixel grid (ART_SCALE); small labels stay at full resolution to stay legible.
export function pixelTextTexture(scene, str, displaySize, palette = 'gold') {
  const key = textureKey(str, displaySize, palette);
  if (scene.textures.exists(key)) return key;
  const scale = displaySize >= 26 ? 2 : 1;
  const size = Math.round(displaySize / scale);

  const font = `bold ${size}px ${FONTS.title}`;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font;
  const pad = 4;
  const w = Math.ceil(probe.measureText(str).width) + pad * 2 + 2;
  const h = Math.ceil(size * 1.3) + pad * 2 + 2;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#fff';
  ctx.fillText(str, pad, pad + Math.round(size * 0.08));
  const src = ctx.getImageData(0, 0, w, h).data;
  const mask = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 110;

  let minY = h;
  let maxY = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask(x, y)) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }

  const bands = PALETTES[palette] ?? PALETTES.gold;
  const p = new Pix(w, h);
  // Hard drop shadow, then outline, then banded fill with a top rim light.
  const drop = scale === 2 ? 1 : 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask(x - 1, y - drop) || mask(x, y - drop)) p.set(x, y, SHADOW);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask(x, y)) continue;
      if (mask(x - 1, y) || mask(x + 1, y) || mask(x, y - 1) || mask(x, y + 1)
        || mask(x - 1, y - 1) || mask(x + 1, y - 1) || mask(x - 1, y + 1) || mask(x + 1, y + 1)) p.set(x, y, OUTLINE);
    }
  }
  const span = Math.max(1, maxY - minY);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask(x, y)) continue;
      const t = (y - minY) / span;
      const idx = Math.min(bands.length - 1, 1 + Math.floor(t * (bands.length - 1)));
      p.set(x, y, mask(x, y - 1) ? bands[idx] : bands[0]);
    }
  }

  const out = scale === 1 ? p : new Pix(w * scale, h * scale);
  if (scale !== 1) out.blit(p, 0, 0, scale);
  const tex = scene.textures.createCanvas(key, out.w, out.h);
  out.toContext(tex.getContext());
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

export function pixelTitle(scene, x, y, str, size = 32, palette = 'gold') {
  return scene.add.image(Math.round(x), Math.round(y), pixelTextTexture(scene, str, size, palette));
}
