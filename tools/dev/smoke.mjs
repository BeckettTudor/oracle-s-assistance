// Fast flow test: teleports up the climb, exercises every phase, the altar,
// blessings, coin tosses, collapse, ending and restart. Logs console errors.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const OUT = process.argv[2] || 'smoke';
fs.mkdirSync(OUT, { recursive: true });
const log = [];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
page.on('console', (m) => { if (m.type() !== 'log') log.push(`[${m.type()}] ${m.text()}`); });
page.on('framenavigated', (f) => log.push('[nav] ' + f.url() + ' ' + new Date().toISOString()));
page.on('error', (e) => log.push('[crash] ' + e.message));
page.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));
page.on('response', (r) => { if (r.status() >= 400) log.push(`[http ${r.status()}] ${r.url()}`); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = async (fn, ...a) => { try { return await page.evaluate(fn, ...a); } catch (e) { log.push('[ev-error] ' + e.message); await shot('zz_ctx'); await done(1); } };
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const click = async (x, y) => { x *= 2; y *= 2; await page.mouse.move(x, y); await page.mouse.down(); await sleep(30); await page.mouse.up(); };
const done = async (code) => { fs.writeFileSync(OUT + '/log.txt', log.join('\n')); console.log(log.join('\n')); await browser.close(); process.exit(code); };
// Click the centre of a UI object, found by its path under window.__oa.ui.
const clickObj = async (path) => {
  const [x, y] = await ev(new Function(`const r = window.__oa.ui.${path}.getBounds(); return [r.centerX, r.centerY];`));
  await click(x, y);
};
const hoverObj = async (path) => {
  const [x, y] = await ev(new Function(`const r = window.__oa.ui.${path}.getBounds(); return [r.centerX, r.centerY];`));
  await page.mouse.move(x * 2, y * 2);
};
// After a toss, wait for the labelled grid and open the pot the coins named.
let namedShot = false;
const openNamed = async () => {
  for (let i = 0; i < 40 && !(await ev(() => window.__oa.ui.potGrid.isOpen())); i++) await sleep(100);
  await sleep(300);
  if (!namedShot) { namedShot = true; await shot('13b_named_grid'); }
  const named = await ev(() => window.__oa.ui.potGrid.named);
  await clickObj(`potGrid.cells[${named}].bg`);
};
async function clickUntil(cond, max = 200) {
  for (let i = 0; i < max; i++) {
    if (await ev(cond)) return;
    if (await ev(() => window.__oa?.ui?.dialogue?.isOpen())) await click(480, 470);
    await sleep(160);
  }
  log.push('TIMEOUT ' + cond); await shot('zz_fail'); await done(1);
}
const enter = async () => {
  await ev(() => { const s = window.__oa; s.player.body.reset(480, 1580); });
  await sleep(250);
  await page.keyboard.down('KeyE'); await sleep(50); await page.keyboard.up('KeyE'); await sleep(150);
  await ev(() => window.__oa.player.body.reset(700, 530));
};
const seeds = [];
await page.goto('http://localhost:8123/?debug', { waitUntil: 'load' });
await sleep(1500);
await sleep(1200);
await click(480, 300); await sleep(600); await click(480, 444);
await sleep(800);
await clickUntil(() => window.__oa.state.phase === 'ATTEMPT_1' && !window.__oa.cutscene);
seeds.push(await ev(() => window.__oa.climb.seed));
await shot('01_hill_climb');
for (const [v, next] of [[0, 'ATTEMPT_2'], [1, 'ORACLE_INTRO']]) {
  await enter();
  await clickUntil(() => window.__oa.ui.potGrid.isOpen());
  if (v === 0) { await hoverObj('potGrid.cells[37].bg'); await sleep(200); await shot('02_potgrid'); }
  await clickObj(`potGrid.cells[${v}].bg`);
  await clickUntil(new Function(`return !window.__oa.cutscene && window.__oa.state.phase === '${next}'`));
  seeds.push(await ev(() => window.__oa.climb.seed));
}
await shot('03_new_climb');
await enter();
await clickUntil(() => window.__oa.ui.tutorial.isOpen());
await sleep(300); await shot('04_tut1');
await clickObj('tutorial.coins[0]'); await sleep(200);
await clickObj('tutorial.nextBtn'); await sleep(300); await clickObj('tutorial.actionBtn'); await sleep(600); await shot('05_tut2');
await clickObj('tutorial.nextBtn'); await sleep(300); await clickObj('tutorial.actionBtn'); await sleep(600); await shot('06_tut3');
await clickObj('tutorial.nextBtn'); await sleep(300);
for (let i = 0; i < 6; i++) { await clickObj('tutorial.actionBtn'); await sleep(950); }
await shot('07_tut4');
await clickObj('tutorial.nextBtn'); await sleep(300);
await clickUntil(() => window.__oa.ui.oraclePanel.isOpen() && window.__oa.ui.oraclePanel.askBtn.visible);
await sleep(300); await shot('08_altar_first');
const ask = () => click(480 - 140, 520 - 26);
const toss = () => click(480 + 140, 520 - 26);
// Blessing 1
await ask(); await ask();
await sleep(900); await shot('09_blessing_marking');
await clickUntil(() => window.__oa.ui.oraclePanel.descendBtn.visible);
await sleep(200); await shot('10_blessing_done');
await click(480, 520 - 26);
await clickUntil(() => !window.__oa.cutscene && window.__oa.state.carryingOffering === false && window.__oa.player.y > 1500);
log.push('after blessing 1: ' + JSON.stringify(await ev(() => ({ g: window.__oa.state.groverTotal, run: window.__oa.state.groverRun, phase: window.__oa.state.phase }))));
seeds.push(await ev(() => window.__oa.climb.seed));
// Bless to 3, then force a wrong toss to test collapse
for (let i = 0; i < 2; i++) {
  await enter();
  await clickUntil(() => window.__oa.ui.oraclePanel.isOpen() && window.__oa.ui.oraclePanel.askBtn.visible);
  await ask();
  await clickUntil(() => window.__oa.ui.oraclePanel.descendBtn.visible);
  await click(480, 520 - 26);
  await clickUntil(() => !window.__oa.cutscene && window.__oa.player.y > 1500);
}
await enter();
await clickUntil(() => window.__oa.ui.oraclePanel.isOpen() && window.__oa.ui.oraclePanel.askBtn.visible);
await shot('11_altar_k3');
// rig the measurement to a wrong pot just for this test
await ev(async () => {
  const q = await import('/src/quantumAdapter.js');
  window.__wrong = [...Array(64).keys()].find((i) => i !== window.__oa.state.target && !window.__oa.state.brokenPots.has(i));
});
await ev(() => { const s = window.__oa; const orig = s.withRetry.bind(s); s.withRetry = (fn) => (fn.toString().includes('measure') ? Promise.resolve(window.__wrong) : orig(fn)); });
await toss();
await sleep(1500); await shot('12_toss');
await clickUntil(() => window.__oa.ui.coinToss.isOpen() && window.__oa.ui.coinToss.openBtn.visible);
await shot('13_toss_result');
await click(480, 270 + 150 - 40); await openNamed();
await clickUntil(() => !window.__oa.cutscene && window.__oa.player.y > 1500);
log.push('after wrong toss: ' + JSON.stringify(await ev(() => ({ g: window.__oa.state.groverTotal, run: window.__oa.state.groverRun, pots: window.__oa.state.mainPots, explained: window.__oa.state.collapseExplained }))));
await ev(() => { delete window.__oa.withRetry; });
// Six blessings then a real toss until found
let tries = 0;
for (;;) {
  for (let i = 0; i < 6; i++) {
    await enter();
    await clickUntil(() => window.__oa.ui.oraclePanel.isOpen() && window.__oa.ui.oraclePanel.askBtn.visible);
    await ask();
    await clickUntil(() => window.__oa.ui.oraclePanel.descendBtn.visible);
    if (i === 5) await shot('14_k6');
    await click(480, 520 - 26);
    await clickUntil(() => !window.__oa.cutscene && window.__oa.player.y > 1500);
  }
  await enter();
  await clickUntil(() => window.__oa.ui.oraclePanel.isOpen() && window.__oa.ui.oraclePanel.askBtn.visible);
  await toss();
  await clickUntil(() => window.__oa.ui.coinToss.isOpen() && window.__oa.ui.coinToss.openBtn.visible);
  await click(480, 270 + 150 - 40); await openNamed();
  tries++;
  await sleep(2500);
  if (await ev(() => window.__oa.state.phase !== 'MAIN_LOOP')) break;
  await clickUntil(() => !window.__oa.cutscene && window.__oa.player.y > 1500);
  if (tries > 3) break;
}
await shot('15_bolt');
const lines = [];
for (let i = 0; i < 200; i++) {
  if (await ev(() => !window.__oa)) break;
  const t = await ev(() => (window.__oa.ui.dialogue.isOpen() ? window.__oa.ui.dialogue.fullText : null));
  if (t && lines[lines.length - 1] !== t) lines.push(t);
  if (t) await click(480, 470);
  await sleep(160);
}
log.push('ending:\n  ' + lines.join('\n  '));
await sleep(1500); await shot('16_results');
await click(480, 484); await sleep(600); await shot('17_results_guide');
// Play Again lives in the guide's sidebar on the results screen.
await click(134, 422); await sleep(1500);
log.push('restart: ' + await ev(() => window.__oa?.state.phase));
log.push('seeds: ' + seeds.join(','));
await done(0);
