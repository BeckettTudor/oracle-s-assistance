import puppeteer from 'puppeteer-core';
const OUT = process.argv[2] || 'g';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warn') errs.push(m.type() + ' ' + m.text()); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = async (x, y) => { await page.mouse.move(x * 2, y * 2); await page.mouse.down(); await sleep(40); await page.mouse.up(); };
const ev = (fn, ...a) => page.evaluate(fn, ...a);
const shot = (n) => page.screenshot({ path: `${OUT}_${n}.png` });
await page.goto('http://localhost:8123/?debug', { waitUntil: 'load' });
await sleep(2500); await shot('1title');
await click(480, 300); await sleep(600); await click(480, 444); await sleep(4200); await shot('2intro');
for (let i = 0; i < 60; i++) {
  if (await ev(() => window.__oa.state.phase === 'ATTEMPT_1' && !window.__oa.cutscene)) break;
  if (await ev(() => window.__oa.ui.dialogue.isOpen())) await click(480, 470);
  await sleep(170);
}
await sleep(600); await shot('3hill_far');
await ev(() => window.__oa.player.body.reset(470, 1580)); await sleep(700); await shot('4hill_near');
await page.keyboard.down('KeyE'); await sleep(60); await page.keyboard.up('KeyE'); await sleep(400);
// Reach the first checkpoint ledge
await ev(() => { const s = window.__oa; const p = s.climb.pieces.find((q) => q.checkpoint); s.player.body.reset(p.x + p.w / 2, p.y); });
await sleep(900); await shot('5checkpoint');
// Temple
await ev(() => { window.__oa.player.body.reset(700, 530); });
await sleep(2400); await shot('6temple');
for (let i = 0; i < 40; i++) { if (await ev(() => window.__oa.ui.potGrid.isOpen())) break; await click(480, 470); await sleep(170); }
await sleep(300); await shot('7potgrid');
await click(330 + 21, 104 + 21); await sleep(1500); await shot('8broken');
console.log(JSON.stringify(errs));
await browser.close();
