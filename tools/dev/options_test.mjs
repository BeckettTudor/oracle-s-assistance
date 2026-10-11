import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warn') errs.push(m.type() + ' ' + m.text()); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const click = async (x, y) => { await page.mouse.move(x * 2, y * 2); await page.mouse.down(); await sleep(40); await page.mouse.up(); };
const ev = (fn) => page.evaluate(fn);
const log = [];
await page.goto('http://localhost:8123/?debug', { waitUntil: 'load' });
await sleep(2200);
await page.screenshot({ path: 'opt_title.png' });
await click(480, 300); await sleep(600); await click(480, 444); await sleep(4000);            // into the intro dialogue
log.push('intro dialogue open: ' + await ev(() => window.__oa.ui.dialogue.isOpen()));
const run0 = await ev(() => window.__oa.runId);
await page.keyboard.press('Escape'); await sleep(400);
log.push('esc -> options open: ' + await ev(() => window.__oa.ui.options.isOpen()) + ', game paused: ' + await ev(() => window.__oa.scene.isPaused()));
await page.screenshot({ path: 'opt_menu.png' });
await click(480, 259); await sleep(300);             // Restart Run -> confirm page
await page.screenshot({ path: 'opt_confirm.png' });
await click(480, 319); await sleep(1500);            // Yes, restart
log.push('restarted: runId ' + run0 + ' -> ' + await ev(() => window.__oa.runId) + ', phase ' + await ev(() => window.__oa.state.phase) + ', paused ' + await ev(() => window.__oa.scene.isPaused()));
// click through intro to the climb
for (let i = 0; i < 60; i++) {
  if (await ev(() => window.__oa.state.phase === 'ATTEMPT_1' && !window.__oa.cutscene)) break;
  if (await ev(() => window.__oa.ui.dialogue.isOpen())) await click(480, 470);
  await sleep(170);
}
log.push('phase after intro: ' + await ev(() => window.__oa.state.phase));
await page.screenshot({ path: 'opt_hill.png' });
await click(960 - 69, 28); await sleep(400);         // Options button
log.push('button -> options open: ' + await ev(() => window.__oa.ui.options.isOpen()));
await click(480, 209); await sleep(300);             // Resume
log.push('resumed: open=' + await ev(() => window.__oa.ui.options.isOpen()) + ' paused=' + await ev(() => window.__oa.scene.isPaused()));
await click(960 - 69, 28); await sleep(300);
await click(480, 309); await sleep(300);             // Main Menu -> confirm
await click(480, 319); await sleep(1500);            // Yes, leave
log.push('title active: ' + await ev(() => window.__oa === null && !!document.querySelector('canvas')));
await click(480, 444); await sleep(1500);
log.push('play again from title: ' + await ev(() => window.__oa?.state.phase));
console.log(log.join('\n'));
console.log('errors:', JSON.stringify(errs));
await browser.close();
