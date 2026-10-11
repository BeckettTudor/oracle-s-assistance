// Builds the game's art. Every manifest entry with an `art` name is drawn by
// the pixel-art generators in src/art/ at ART_SCALE: generators work in "art
// pixels" and each one becomes an ART_SCALE x ART_SCALE block, so all art in
// the game shares one consistent pixel size. Entries without a generator (or
// with `scale: 1`, such as the portraits) are drawn 1:1.

import { GENERATORS } from './art/generators.js';
import { UI_GENERATORS } from './art/uiArt.js';
import { MENU_GENERATORS } from './art/menuArt.js';
import { Pix } from './art/pixel.js';

export const ART_SCALE = 2;

const generatorFor = (name) => UI_GENERATORS[name] ?? MENU_GENERATORS[name] ?? GENERATORS[name];

function labeledBox(w, h) {
  const p = new Pix(w, h);
  p.rect(0, 0, w, h, '#2a2236');
  p.rect(1, 1, w - 2, h - 2, '#8c7a9a');
  return p;
}

// Draw `art` (in art pixels) into a canvas texture `scale` times larger.
function toTexture(scene, key, art, scale, label) {
  const tex = scene.textures.createCanvas(key, art.w * scale, art.h * scale);
  const big = scale === 1 ? art : new Pix(art.w * scale, art.h * scale);
  if (scale !== 1) big.blit(art, 0, 0, scale);
  big.toContext(tex.getContext());
  if (label) {
    const ctx = tex.getContext();
    ctx.font = `bold ${Math.max(6, Math.min(12, big.h - 2))}px monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, big.w / 2, big.h / 2);
  }
  return tex;
}

const scaleOf = (entry) => (entry.scale ?? ART_SCALE);

export function makeImagePlaceholder(scene, entry) {
  const gen = generatorFor(entry.art);
  const s = gen ? scaleOf(entry) : 1;
  const art = gen ? gen(entry.width / s, entry.height / s) : labeledBox(entry.width, entry.height);
  toTexture(scene, entry.key, art, s, gen ? null : entry.key).refresh();
}

export function makeSheetPlaceholder(scene, entry) {
  const { key, frameWidth: fw, frameHeight: fh, frameLabels } = entry;
  const count = frameLabels.length;
  const gen = generatorFor(entry.art);
  const s = gen ? scaleOf(entry) : 1;
  const art = gen ? gen(fw / s, fh / s, count) : labeledBox(fw * count, fh);
  const tex = toTexture(scene, key, art, s, gen ? null : key);
  for (let i = 0; i < count; i++) tex.add(i, 0, i * fw, 0, fw, fh);
  tex.refresh();
}
