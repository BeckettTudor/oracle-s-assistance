// Screenshots every topic of the Grover guide (and its detail pages), runs
// each demo's buttons once, checks Esc layering (guide, then Options), and
// checks that a horizontal moving ledge carries Hercules.
// Usage: node guide.mjs <outdir>
import fs from 'fs';
import puppeteer from 'puppeteer-core';

const OUT = process.argv[2] || 'guide';
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warn') errs.push(m.type() + ' ' + m.text()); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = (fn, ...a) => page.evaluate(fn, ...a);
const click = async (x, y) => { await page.mouse.move(x * 2, y * 2); await page.mouse.down(); await sleep(40); await page.mouse.up(); };
const clickObj = async (path) => {
  const [x, y] = await ev(new Function(`const r = window.__oa.ui.${path}.getBounds(); return [r.centerX, r.centerY];`));
  await click(x, y);
};
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

await page.goto('http://localhost:8123/?debug', { waitUntil: 'load' });
await sleep(2000);
await click(480, 300); await sleep(600);
await click(480, 428); await sleep(3500);

// Every topic, pressing each demo button once (buttons are containers with a bg).
const topics = await ev(() => window.__oa.ui.guide.T.topics.length);
await ev(() => { window.__oa.ui.guide.open(0); });
for (let i = 0; i < topics; i++) {
  await ev((i) => window.__oa.ui.guide.go(i), i);
  await sleep(250);
  await shot(`topic_${i + 1}`);
  const buttons = await ev(() => window.__oa.ui.guide.content.list
    .filter((o) => o.bg && o.visible)
    .map((o) => { const r = o.getBounds(); return [r.centerX, r.centerY]; }));
  for (const [x, y] of buttons) { await click(x, y); await sleep(500); }
  if (buttons.length) await shot(`topic_${i + 1}_used`);
  if (await ev(() => window.__oa.ui.guide.moreBtn.visible)) {
    await clickObj('guide.moreBtn'); await sleep(250);
    await shot(`topic_${i + 1}_more`);
  }
}
await ev(() => window.__oa.ui.guide.close());

// Options, then the guide from inside it, then Esc twice.
await page.keyboard.press('Escape'); await sleep(300);
await shot('options');
await clickObj('options.main.list[1]'); await sleep(300);
const guideFromOptions = await ev(() => window.__oa.ui.guide.isOpen());
await page.keyboard.press('Escape'); await sleep(200);
const afterEsc1 = await ev(() => [window.__oa.ui.guide.isOpen(), window.__oa.ui.options.isOpen()]);
await page.keyboard.press('Escape'); await sleep(200);
const afterEsc2 = await ev(() => [window.__oa.ui.guide.isOpen(), window.__oa.ui.options.isOpen()]);

// Skip the intro and stand Hercules on a horizontal moving ledge.
for (let i = 0; i < 60; i++) {
  if (await ev(() => window.__oa.state.phase === 'ATTEMPT_1' && !window.__oa.cutscene)) break;
  if (await ev(() => window.__oa.ui.dialogue.isOpen())) await click(480, 470);
  await sleep(170);
}
const ride = await ev(async () => {
  const s = window.__oa;
  const m = s.moverGroup.getChildren().find((c) => c.piece.type === 'hmove');
  if (!m) return 'no horizontal ledge in this climb';
  s.player.body.reset(m.body.center.x, m.body.y - 1);
  await new Promise((r) => setTimeout(r, 400));
  const p0 = s.player.x - m.body.center.x;
  await new Promise((r) => setTimeout(r, 1200));
  const p1 = s.player.x - m.body.center.x;
  return { offsetDrift: Math.round(Math.abs(p1 - p0)), onLedge: Math.abs(s.player.body.bottom - m.body.y) < 3 };
});

console.log(JSON.stringify({ topics, guideFromOptions, afterEsc1, afterEsc2, ride, errs }));
await browser.close();
