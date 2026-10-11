// Climbing bot: plays freshly generated climbs with the real controls
// (simulated key states) and reports time-to-temple, falls and failures.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const TRIALS = Number(process.argv[2] || 12);
const SEED0 = Number(process.argv[3] || 1000);
const log = [];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 540 });
page.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warn') log.push(`[${m.type()}] ${m.text()}`); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = (fn, ...a) => page.evaluate(fn, ...a);
const click = async (x, y) => { await page.mouse.move(x, y); await page.mouse.down(); await sleep(30); await page.mouse.up(); };

await page.goto('http://localhost:8123/?debug', { waitUntil: 'networkidle0' });
await sleep(1200);
await click(480, 300); await sleep(600); await click(480, 444);
await sleep(800);
for (let i = 0; i < 100; i++) {
  if (await ev(() => window.__oa?.state.phase === 'ATTEMPT_1' && !window.__oa.cutscene)) break;
  await click(480, 470); await sleep(160);
}

// Install the bot.
await ev(() => {
  const s = window.__oa;
  const p = s.player;
  const bot = { active: false };
  window.__bot = bot;
  s.enterTemple = () => { if (bot.active) { bot.active = false; bot.result = { ok: true, t: s.time.now - bot.t0, falls: bot.falls }; } };
  const origRespawn = s.respawnAtCheckpoint.bind(s);
  s.respawnAtCheckpoint = () => { bot.falls++; return origRespawn(); };
  const press = (k, v) => { p.keys[k].isDown = v; };
  const geom = (o) => (o.porch ? { x0: 648, x1: 760, y: 530, porch: true } : { x0: o.body.x, x1: o.body.x + o.body.width, y: o.body.y, obj: o });
  s.events.on('update', (time) => {
    if (!bot.active) return;
    if (time - bot.t0 > 60000) { bot.active = false; bot.result = { ok: false, t: 60000, falls: bot.falls, idx: bot.idx, pos: [p.x, p.y] }; return; }
    const b = p.body;
    const grounded = b.blocked.down || b.touching.down;
    const objs = bot.objs;
    // Which piece are we standing on?
    let standing = -1;
    if (grounded) {
      for (let i = objs.length - 1; i >= 0; i--) {
        const g = geom(objs[i]);
        if (Math.abs(b.bottom - g.y) < 4 && b.right > g.x0 && b.left < g.x1) { standing = i; break; }
      }
      bot.idx = standing + 1;
    }
    const t = geom(objs[Math.min(bot.idx, objs.length - 1)]);
    const own = standing >= 0 ? geom(objs[standing]) : { x0: 0, x1: 960 };
    const tc = (t.x0 + t.x1) / 2;
    const lo = t.x0 + 12;
    const hi = t.x1 - 12;
    const dx = p.x < lo ? lo - p.x : p.x > hi ? p.x - hi : 0;
    const rise = p.y - t.y;
    const dirTo = Math.sign(tc - p.x) || 1;
    press('left', false); press('right', false);
    if (grounded) {
      press('jump', false);
      const type = t.obj?.piece.type;
      const maxDx = standing < 0 ? 40 : type === 'hmove' ? 75 : 95; // on open ground, walk close first
      const riseOk = type === 'vmove' ? rise <= 52 && rise > -12 : rise <= 62 && rise > -40;
      if (riseOk && dx <= maxDx) {
        p.jumpPressedAt = time;
        press('jump', true);
        press(dirTo > 0 ? 'right' : 'left', true);
        bot.airTarget = tc;
      } else {
        // Walk toward the target, but stay on our own platform.
        const edge = dirTo > 0 ? own.x1 - 8 : own.x0 + 8;
        if ((dirTo > 0 && p.x < edge) || (dirTo < 0 && p.x > edge)) press(dirTo > 0 ? 'right' : 'left', true);
      }
    } else {
      press('jump', b.velocity.y < 0);
      const aim = (t.x0 + t.x1) / 2;
      if (Math.abs(p.x - aim) > 8) press(p.x < aim ? 'right' : 'left', true);
    }
  });
});

const results = [];
for (let n = 0; n < TRIALS; n++) {
  await ev((seed) => {
    const s = window.__oa;
    s.buildClimb(seed);
    s.resetCheckpoints();
    s.state.carryingOffering = true;
    s.placePlayer(480, 1580);
    const objs = s.climb.pieces.map((piece) => [...s.ledgeGroup.getChildren(), ...s.moverGroup.getChildren()].find((o) => o.piece === piece));
    objs.push({ porch: true });
    Object.assign(window.__bot, { objs, idx: 0, falls: 0, t0: s.time.now, active: true, result: null });
  }, SEED0 + n * 7717);
  let r = null;
  for (let i = 0; i < 400 && !r; i++) { await sleep(250); r = await ev(() => window.__bot.result); }
  const info = await ev(() => window.__oa.climb.pieces.map((p) => p.type[0]).join(''));
  results.push({ seed: SEED0 + n * 7717, ...r, pieces: info });
  log.push(JSON.stringify(results[results.length - 1])); console.log(log[log.length - 1]);
  if (!r?.ok) await page.screenshot({ path: `bot_fail_${n}.png` });
}
const ok = results.filter((r) => r.ok);
log.push(`success ${ok.length}/${results.length}; mean ${(ok.reduce((s, r) => s + r.t, 0) / ok.length / 1000).toFixed(1)}s; max ${(Math.max(...ok.map((r) => r.t)) / 1000).toFixed(1)}s; falls ${results.reduce((s, r) => s + (r.falls || 0), 0)}`);
console.log(log.join('\n'));
fs.writeFileSync('bot_log.txt', log.join('\n'));
await browser.close();
