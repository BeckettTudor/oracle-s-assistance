// Tiny pixel-art drawing library over an RGBA buffer. Everything the game
// generates (fallback art, UI frames, title lettering) is drawn with hard
// pixels and ordered dithering, the way 16-bit consoles did it.

const cache = new Map();
export function rgba(color) {
  if (Array.isArray(color)) return color;
  let c = cache.get(color);
  if (!c) {
    const h = color.replace('#', '');
    c = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16),
      h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255];
    cache.set(color, c);
  }
  return c;
}

// 4x4 Bayer matrix for ordered dithering.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

// Deterministic random numbers so generated art is identical every run.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Pix {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  set(x, y, color) {
    if (!color) return; // null/undefined = leave the pixel alone
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const c = rgba(color);
    const i = (y * this.w + x) * 4;
    if (c[3] === 255) {
      this.data[i] = c[0]; this.data[i + 1] = c[1]; this.data[i + 2] = c[2]; this.data[i + 3] = 255;
    } else if (c[3] > 0) {
      const a = c[3] / 255;
      const da = this.data[i + 3] / 255;
      const oa = a + da * (1 - a);
      for (let k = 0; k < 3; k++) {
        this.data[i + k] = (c[k] * a + this.data[i + k] * da * (1 - a)) / (oa || 1);
      }
      this.data[i + 3] = oa * 255;
    }
  }

  alpha(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }

  clear(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[(y * this.w + x) * 4 + 3] = 0;
  }

  rect(x, y, w, h, color) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, color);
  }

  hline(x, y, w, color) { this.rect(x, y, w, 1, color); }
  vline(x, y, h, color) { this.rect(x, y, 1, h, color); }

  // Rectangle filled with a dithered vertical blend between colours.
  vgrad(x, y, w, h, colors) {
    const n = colors.length - 1;
    for (let j = 0; j < h; j++) {
      const t = h <= 1 ? 0 : (j / (h - 1)) * n;
      const i0 = Math.min(n, Math.floor(t));
      const f = t - i0;
      for (let i = 0; i < w; i++) {
        const c = f > bayer(x + i, y + j) && i0 < n ? colors[i0 + 1] : colors[i0];
        this.set(x + i, y + j, c);
      }
    }
  }

  // Dither between two colours at a fixed ratio (0..1 of colour b).
  dither(x, y, w, h, a, b, ratio) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) this.set(x + i, y + j, ratio > bayer(x + i, y + j) ? b : a);
    }
  }

  ellipse(cx, cy, rx, ry, color) {
    for (let j = -ry; j <= ry; j++) {
      const span = Math.round(rx * Math.sqrt(Math.max(0, 1 - (j * j) / (ry * ry || 1))));
      this.hline(Math.round(cx - span), Math.round(cy + j), span * 2 + 1, color);
    }
  }

  circle(cx, cy, r, color) { this.ellipse(cx, cy, r, r, color); }

  line(x0, y0, x1, y1, color) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // Filled polygon (even-odd scanline).
  poly(points, color) {
    const ys = points.map((p) => p[1]);
    const y0 = Math.floor(Math.min(...ys));
    const y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i];
        const [bx, by] = points[(i + 1) % points.length];
        if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) {
          xs.push(ax + ((y + 0.5 - ay) / (by - ay)) * (bx - ax));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        this.hline(Math.round(xs[k]), y, Math.round(xs[k + 1]) - Math.round(xs[k]), color);
      }
    }
  }

  // 1 px outline around every opaque region (within an optional box).
  outline(color, box = [0, 0, this.w, this.h], diagonal = false) {
    const [bx, by, bw, bh] = box;
    const marks = [];
    for (let y = by; y < by + bh; y++) {
      for (let x = bx; x < bx + bw; x++) {
        if (this.alpha(x, y) > 0) continue;
        const n = this.alpha(x - 1, y) || this.alpha(x + 1, y) || this.alpha(x, y - 1) || this.alpha(x, y + 1)
          || (diagonal && (this.alpha(x - 1, y - 1) || this.alpha(x + 1, y - 1) || this.alpha(x - 1, y + 1) || this.alpha(x + 1, y + 1)));
        if (n && x >= bx && x < bx + bw) marks.push([x, y]);
      }
    }
    for (const [x, y] of marks) this.set(x, y, color);
  }

  // Recolour opaque pixels whose neighbour above/left is transparent
  // (rim light) or below/right is transparent (shadow edge).
  rim(light, dark, box = [0, 0, this.w, this.h]) {
    const [bx, by, bw, bh] = box;
    const ops = [];
    for (let y = by; y < by + bh; y++) {
      for (let x = bx; x < bx + bw; x++) {
        if (!this.alpha(x, y)) continue;
        if (light && !this.alpha(x, y - 1)) ops.push([x, y, light]);
        else if (dark && !this.alpha(x, y + 1)) ops.push([x, y, dark]);
      }
    }
    for (const [x, y, c] of ops) this.set(x, y, c);
  }

  // Copy another Pix onto this one (optionally scaled by an integer).
  blit(src, dx, dy, scale = 1, flip = false) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4;
        if (!src.data[i + 3]) continue;
        const c = [src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]];
        const tx = flip ? src.w - 1 - x : x;
        this.rect(dx + tx * scale, dy + y * scale, scale, scale, c);
      }
    }
  }

  toContext(ctx, x = 0, y = 0) {
    ctx.putImageData(new ImageData(this.data, this.w, this.h), x, y);
  }
}
