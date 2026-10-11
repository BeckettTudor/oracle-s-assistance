// Shared 16-bit UI kit: pixel-font text, pixel-art nine-slice frames,
// buttons, Greek-key bands, dividers, keycaps and modal blockers.
//
// Frames and ornaments are pixel art scaled with nearest-neighbour; text uses
// the Pixelify Sans pixel font rasterised at screen resolution so it is both
// chunky and razor sharp.

import { FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { IMAGES } from '../assetManifest.js';
import { Audio } from '../audio.js';
import { textResolution } from '../viewport.js';
import { pixelTitle } from './pixelText.js';

export { pixelTitle };
export { fitCamera } from '../viewport.js';

const SLICES = Object.fromEntries(IMAGES.filter((i) => i.slice).map((i) => [i.key, i.slice]));

export const INK = '#0e1438';
export const CREAM = '#fff3d6';

export function text(scene, x, y, str, style = {}) {
  const merged = {
    fontFamily: FONTS.ui,
    fontSize: '18px',
    color: CREAM,
    letterSpacing: 1,
    resolution: textResolution(),
    ...style,
  };
  // Pixel fonts lose their letter gaps in bold at small sizes ("C" closes
  // into "O"), so small text always uses the regular weight.
  if (parseInt(merged.fontSize, 10) < 17 && merged.fontStyle === 'bold') delete merged.fontStyle;
  if (merged.wordWrap?.width && !merged.wordWrap.callback) {
    merged.wordWrap = { ...merged.wordWrap, callback: spacedWrap };
  }
  return scene.add.text(Math.round(x), Math.round(y), str, merged);
}

// Phaser's built-in word wrap ignores letterSpacing, so spaced text overran
// its wrap width. This greedy wrap measures each line the way it is drawn:
// with spacing, Phaser draws one character at a time (so without kerning).
const charWidths = new Map();
function spacedWrap(str, t) {
  const ctx = t.context;
  const spacing = t.letterSpacing || 0;
  const max = t.style.wordWrapWidth;
  const charWidth = (ch) => {
    const key = `${ctx.font}|${ch}`;
    if (!charWidths.has(key)) charWidths.set(key, ctx.measureText(ch).width);
    return charWidths.get(key);
  };
  const width = (s) => {
    if (!spacing) return ctx.measureText(s).width;
    let w = 0;
    for (const ch of s) w += charWidth(ch) + spacing;
    return w;
  };
  const lines = [];
  for (const para of str.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && width(next) > max) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

// Text with a hard pixel drop shadow (for panels).
export function shadowed(scene, x, y, str, style = {}) {
  return text(scene, x, y, str, style).setShadow(2, 2, '#070a1e', 0, false, true);
}

// Text with a dark outline and hard shadow (for anything over the world).
export function outlined(scene, x, y, str, style = {}) {
  return text(scene, x, y, str, { stroke: INK, strokeThickness: 4, ...style })
    .setShadow(2, 2, '#070a1e', 0, true, true);
}

// Pixel-art nine-slice frame. Sizes are rounded to whole pixels.
export function frame(scene, x, y, w, h, key = 'ui_panel') {
  const s = SLICES[key] ?? 8;
  const f = scene.add.nineslice(Math.round(x), Math.round(y), key, undefined, Math.round(w), Math.round(h), s, s, s, s);
  f.resizeFrame = (nw, nh) => f.setSize(Math.round(nw), Math.round(nh));
  return f;
}

export function makeButton(scene, x, y, w, h, label, onClick, opts = {}) {
  const c = scene.add.container(Math.round(x), Math.round(y));
  const bg = frame(scene, 0, 0, w, h, 'ui_button');
  const t = text(scene, 0, -1, label, {
    fontFamily: FONTS.ui,
    fontSize: opts.fontSize ?? '18px',
    fontStyle: 'bold',
    color: '#1a2050',
    align: 'center',
    lineSpacing: -2,
  }).setOrigin(0.5);
  t.setShadow(0, 1, 'rgba(255,248,214,0.85)', 0, false, true);
  c.add([bg, t]);
  c.setSize(w, h);

  let pressed = false;
  c.enabled = true;
  bg.setInteractive({ useHandCursor: true });
  const setLook = (state) => {
    bg.setTint(state === 'hover' ? 0xfff8e0 : state === 'down' ? 0xd8b070 : 0xffffff);
    t.setY(state === 'down' ? 1 : -1);
  };
  bg.on('pointerover', () => { if (c.enabled) setLook('hover'); });
  bg.on('pointerout', () => { pressed = false; setLook('idle'); });
  bg.on('pointerdown', () => { if (c.enabled) { pressed = true; setLook('down'); } });
  bg.on('pointerup', () => {
    const wasPressed = pressed;
    pressed = false;
    if (!c.enabled || !wasPressed) return;
    setLook('hover');
    Audio.play('ui_click');
    onClick();
  });

  c.setEnabled = (value) => {
    c.enabled = value;
    c.setAlpha(value ? 1 : 0.45);
    setLook('idle');
    if (bg.input) bg.input.cursor = value ? 'pointer' : 'default';
    return c;
  };
  c.setLabel = (str) => { t.setText(str); return c; };
  c.bg = bg;
  c.label = t;
  return c;
}

// Show or hide a container, and enable input only on interactive descendants
// that are actually visible (hidden objects must never catch clicks).
export function show(container, visible) {
  container.setVisible(visible);
  const walk = (obj, parentVisible) => {
    const vis = parentVisible && obj.visible;
    if (obj.input) obj.input.enabled = vis;
    if (obj.list) for (const child of obj.list) walk(child, vis);
  };
  walk(container, true);
  return container;
}

// A dimmer that swallows clicks. Oversized so it covers any window shape.
export function blocker(scene, alpha = 0.6) {
  const r = scene.add.rectangle(-GAME_WIDTH * 2, -GAME_HEIGHT * 2, GAME_WIDTH * 5, GAME_HEIGHT * 5, 0x060918, alpha).setOrigin(0);
  r.setInteractive();
  return r;
}

// Gold divider with a central lozenge and rosettes.
export function divider(scene, x, y) {
  return scene.add.image(Math.round(x), Math.round(y), 'ui_divider');
}

// Gold Greek-key band on lapis, like the borders of the temple banners.
export function meanderBand(scene, x, y, width) {
  return scene.add.tileSprite(Math.round(x), Math.round(y), Math.round(width / 16) * 16, 10, 'ui_meander');
}

// Marble keycap with an optional caption beneath it.
export function keycap(scene, x, y, label, caption) {
  const c = scene.add.container(Math.round(x), Math.round(y));
  const t = text(scene, 0, -2, label, {
    fontFamily: FONTS.key, fontSize: '19px', color: '#1a2050',
  }).setOrigin(0.5);
  const w = Math.max(22, Math.ceil(t.width) + 12);
  const k = frame(scene, 0, 0, w, 22, 'ui_key');
  c.add([k, t]);
  if (caption) c.add(shadowed(scene, 0, 16, caption, { fontSize: '15px' }).setOrigin(0.5, 0));
  c.width = w;
  return c;
}
