// Level layout: fixed hill and temple, plus a randomly generated climb that
// changes on every trip up. Coordinates are world pixels; y grows downward.
//
// The climb is generated top-down, starting next to the temple porch and
// working toward the hill. Each new piece is placed so that the piece above
// it is reachable from it, which guarantees every climb is solvable.
// Jump apex is ~84 px and same-height range ~170 px; the limits below stay
// well inside the "80% of max range" rule.

import { WORLD } from './config.js';

export const SPAWN = { x: 200, y: WORLD.groundTop };

export const OFFERING_PILE = { x: 480, y: WORLD.groundTop };

// No platform may sit over the shrine (altar, braziers and the prompt above).
export const SHRINE_CLEARANCE = { x0: 340, x1: 620, height: 170 };

function overlapsShrine(p) {
  const top = WORLD.groundTop - SHRINE_CLEARANCE.height;
  const [x0, x1] = p.type === 'hmove' ? [p.xA, p.xB + p.w] : [p.x, p.x + p.w];
  const yLow = p.type === 'vmove' ? p.yBot : p.y;
  return yLow > top && x1 > SHRINE_CLEARANCE.x0 && x0 < SHRINE_CLEARANCE.x1;
}

// The Temple of Apollo floats at the top of the world. The doorway is a gap
// at the bottom of the right wall, opening onto a porch.
export const TEMPLE = {
  floorTop: 530,
  floorLeft: 40,
  floorRight: 760,
  floorThickness: 32,
  wallLeftX: 40,
  wallRightX: 616,
  wallWidth: 32,
  wallTop: 240,
  doorTop: 440,
  ceilingY: 208,
  interiorLeft: 72,
  interiorRight: 616,
  oracle: { x: 140 },
  standX: 560,               // where Hercules stops after entering
  viewY: 300,                // camera centre while inside
  potWall: { cx: 380, top: 268, cell: 30 },
  porchTrigger: { x: 650, y: 450, w: 60, h: 80 },
};

export const CLIMB = {
  topY: 590,                 // highest ledge, beside the porch
  rightColumnX: 772,         // anything above underTempleY must be right of the temple
  underTempleY: 702,         // below this, Hercules' jump apex clears the temple floor
  moversBelowY: 790,         // moving platforms only appear lower than this
  minX: 16,
  maxX: 944,
  rise: [48, 62],            // vertical step between static pieces
  gap: [18, 72],             // horizontal edge-to-edge gap
  gapNearMover: [18, 50],    // gentler gap when jumping onto a moving platform
  riseNearMover: [34, 48],   // gentler rise when jumping onto a moving platform
  width: [56, 104],
  pillarWidth: 40,           // narrow marble block
  crumbleWidth: [64, 88],
  crumbleDelayMs: 600,       // time standing before a crumbling ledge gives way
  crumbleRespawnMs: 2200,
  hmove: { width: 64, travel: [110, 160], rise: [44, 56], gap: [10, 40], speed: [55, 75] },
  vmove: { width: 72, travel: [70, 110], rise: [40, 52], gap: [8, 40], speed: [50, 65] },
  pieces: [12, 20],          // accepted total piece count
  minMovers: 2,
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tryGenerate(rnd) {
  const R = (a, b) => a + rnd() * (b - a);
  const RI = (a, b) => Math.floor(R(a, b + 1));
  const C = CLIMB;
  const groundTop = WORLD.groundTop;
  const lowestY = groundTop - 24;

  // Place a piece of width w beside `up` (left or right) with the given gap.
  const beside = (up, w, gap) => {
    const sides = rnd() < 0.5 ? [1, -1] : [-1, 1];
    for (const s of sides) {
      const x0 = s > 0 ? up.x1 + gap : up.x0 - gap - w;
      if (x0 >= C.minX && x0 + w <= C.maxX) return x0;
    }
    return Math.min(Math.max(up.x0, C.minX), C.maxX - w);
  };

  const pieces = [];
  const topW = RI(64, 88);
  const topX = RI(C.rightColumnX, 800);
  pieces.push({ type: 'static', x: topX, y: C.topY, w: topW });
  // `up` is the region the next (lower) piece must be able to reach.
  let up = { x0: topX, x1: topX + topW, y: C.topY };
  let prev = 'static';

  while (groundTop - up.y > C.rise[1]) {
    const underTemple = up.y + C.rise[1] < C.underTempleY;
    const moversOk = up.y >= C.moversBelowY && prev !== 'hmove' && prev !== 'vmove';

    let type;
    if (underTemple) {
      type = 'static';
    } else {
      const options = [['static', 50], ['pillar', 10]];
      // Never crumble right under a crumble or a moving platform (you may
      // have to wait there for the platform).
      if (prev !== 'crumble' && prev !== 'hmove' && prev !== 'vmove') options.push(['crumble', 14]);
      if (moversOk) options.push(['hmove', 13], ['vmove', 13]);
      const total = options.reduce((s, [, w]) => s + w, 0);
      let roll = rnd() * total;
      type = options.find(([, w]) => (roll -= w) < 0)[0];
    }

    if (type === 'hmove') {
      const m = C.hmove;
      const y = up.y + RI(...m.rise);
      const travel = RI(...m.travel);
      const g = RI(...m.gap);
      const right = up.x1 + g;                  // near end when going right
      const left = up.x0 - g - m.width;         // near end when going left
      const canRight = right + travel + m.width <= C.maxX;
      const canLeft = left - travel >= C.minX;
      if (y > lowestY - 20 || (!canRight && !canLeft)) {
        type = 'static';
      } else {
        const goRight = canRight && (!canLeft || rnd() < 0.5);
        const near = goRight ? right : left;
        const far = goRight ? near + travel : near - travel;
        pieces.push({
          type, y, w: m.width,
          xA: Math.min(near, far), xB: Math.max(near, far),
          speed: R(...m.speed),
        });
        up = { x0: far, x1: far + m.width, y };
        prev = type;
        continue;
      }
    }

    if (type === 'vmove') {
      const m = C.vmove;
      const yTop = up.y + RI(...m.rise);
      const yBot = yTop + RI(...m.travel);
      if (yBot > lowestY - 20) {
        type = 'static';
      } else {
        const x = beside(up, m.width, RI(...m.gap));
        pieces.push({ type, x, w: m.width, yTop, yBot, speed: R(...m.speed) });
        up = { x0: x, x1: x + m.width, y: yBot };
        prev = type;
        continue;
      }
    }

    // Static-like pieces: plain ledge, narrow pillar, crumbling ledge.
    const w = type === 'pillar' ? C.pillarWidth
      : type === 'crumble' ? RI(...C.crumbleWidth)
        : RI(...C.width);
    const moverAbove = prev === 'hmove' || prev === 'vmove';
    const y = Math.min(lowestY, up.y + RI(...(moverAbove ? C.riseNearMover : C.rise)));
    let x;
    if (y < C.underTempleY) {
      // Stay in the narrow column right of the temple (overlap is fine:
      // ledges are one-way, so Hercules can jump up through them).
      x = RI(C.rightColumnX, C.maxX - w);
    } else {
      x = beside(up, w, RI(...(moverAbove ? C.gapNearMover : C.gap)));
    }
    pieces.push({ type, x, y, w });
    up = { x0: x, x1: x + w, y };
    prev = type;
  }

  return pieces.reverse(); // bottom-to-top order
}

function markCheckpoints(pieces) {
  for (const targetY of [1220, 920]) {
    let best = null;
    for (const p of pieces) {
      if (p.type !== 'static' || p.y === CLIMB.topY) continue;
      if (!best || Math.abs(p.y - targetY) < Math.abs(best.y - targetY)) best = p;
    }
    if (best) best.checkpoint = true;
  }
}

// Returns the climb as an array of pieces, bottom to top:
//   static / pillar / crumble: { type, x, y, w }
//   hmove: { type, y, w, xA, xB, speed }   (platform left edge travels xA..xB)
//   vmove: { type, x, w, yTop, yBot, speed }
export function generateClimb(seed) {
  const rnd = mulberry32(seed);
  for (let attempt = 0; attempt < 400; attempt++) {
    const pieces = tryGenerate(rnd);
    const movers = pieces.filter((p) => p.type === 'hmove' || p.type === 'vmove').length;
    if (pieces.length >= CLIMB.pieces[0] && pieces.length <= CLIMB.pieces[1] && movers >= CLIMB.minMovers
      && !pieces.some(overlapsShrine)) {
      markCheckpoints(pieces);
      return pieces;
    }
  }
  const pieces = tryGenerate(rnd);
  markCheckpoints(pieces);
  return pieces;
}
