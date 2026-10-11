// The Grover guide: an interactive explainer of Grover's algorithm that ties
// each idea back to the game. A sidebar lists the topics; each topic shows
// the explanation (text from the project write-up, in TEXT.guide), a small
// hands-on demo, an optional "More detail" page, and an "In the game" note.
//
// It is a modal used in two places: in the game (from the lesson, the altar
// and Options) and on the results screen, where it also offers Play Again
// and Main Menu. open(topic) resolves when it is closed.

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { TEXT } from '../dialogue.js';
import { patternFor, indexFor } from '../coins.js';
import { frame, text, shadowed, meanderBand, makeButton, blocker, show } from './widgets.js';
import { pixelTextTexture } from './pixelText.js';
import { BarChart } from './BarChart.js';
import { Audio } from '../audio.js';
import {
  basisState, uniform, applyOracle, applyDiffusion, probabilities, successProbability,
} from '../sim/statevector.js';

const N = 64;
const TARGET = 42; // the demos' marked state (never the real bolt)
const PW = 920;
const LEFT = (GAME_WIDTH - PW) / 2;
const SX = LEFT + 16;           // sidebar
const SW = 196;
const CL = SX + SW + 26;         // content column
const CR = LEFT + PW - 18;
const CW = CR - CL;
const CCX = (CL + CR) / 2;
const TAB_H = 28;
const TAB_STEP = 33;

// The state after k Grover iterations on the demo target.
function groverState(k) {
  let a = uniform(N);
  for (let i = 0; i < k; i++) a = applyDiffusion(applyOracle(a, TARGET));
  return a;
}

// Draw one outcome from a probability list.
function sample(probs) {
  let r = Math.random();
  for (let i = 0; i < probs.length; i++) {
    r -= probs[i];
    if (r <= 0) return i;
  }
  return probs.length - 1;
}

export class GroverGuide {
  constructor(scene, { top = 52, depth = 980, results = null } = {}) {
    this.scene = scene;
    this.T = TEXT.guide;
    this.top = top;
    this.ph = GAME_HEIGHT - top - 8;
    this.topic = 0;
    this.showingMore = false;
    this.resolve = null;
    this.demo = null;
    this.container = scene.add.container(0, 0).setDepth(depth);
    const TOP = top;
    const PH = this.ph;

    this.container.add(blocker(scene, 0.75));
    this.container.add(frame(scene, GAME_WIDTH / 2, TOP + PH / 2, PW, PH));
    this.container.add(meanderBand(scene, GAME_WIDTH / 2, TOP + 12, PW - 40));

    // Sidebar: header, topic tabs, and the way out.
    this.container.add(shadowed(scene, SX + 2, TOP + 28, this.T.header.toUpperCase(), {
      fontSize: '14px', color: '#e0a94a',
    }));
    const rule = scene.add.graphics();
    rule.fillStyle(0xd9a43a, 0.6).fillRect(SX + SW + 12, TOP + 30, 2, PH - 50);
    this.container.add(rule);

    this.tabs = this.T.topics.map((topic, i) => {
      const y = TOP + 52 + i * TAB_STEP;
      const bg = scene.add.rectangle(SX, y, SW, TAB_H, 0x141c4e).setOrigin(0).setStrokeStyle(1, 0x3a4a8a);
      const label = text(scene, SX + 10, y + TAB_H / 2, `${i + 1}  ${topic.tab ?? topic.title}`, {
        fontSize: '13px', color: '#d8d0f0', letterSpacing: 0,
      }).setOrigin(0, 0.5);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => { if (i !== this.topic) bg.setFillStyle(0x1e2866); });
      bg.on('pointerout', () => this.paintTabs());
      bg.on('pointerup', () => { Audio.play('ui_click'); this.go(i); });
      this.container.add([bg, label]);
      return { bg, label };
    });

    const btnY = (fromBottom) => TOP + PH - 30 - fromBottom * 40;
    if (results) {
      this.container.add(makeButton(scene, SX + SW / 2, btnY(2), SW, 30, this.T.playAgain, () => results.onPlayAgain(), { fontSize: '15px' }));
      this.container.add(makeButton(scene, SX + SW / 2, btnY(1), SW, 30, this.T.menu, () => results.onMenu(), { fontSize: '15px' }));
    }
    this.container.add(makeButton(scene, SX + SW / 2, btnY(0), SW, 30, results ? this.T.backToResults : this.T.close, () => this.close(), { fontSize: '15px' }));

    // Content column.
    this.title = scene.add.image(CL, TOP + 38, pixelTextTexture(scene, ' ', 22)).setOrigin(0, 0.5);
    this.moreBtn = makeButton(scene, CR - 70, TOP + 38, 140, 26, this.T.showMore, () => {
      this.showingMore = !this.showingMore;
      this.render();
    }, { fontSize: '13px' });
    this.content = scene.add.container(0, 0);
    this.container.add([this.title, this.moreBtn, this.content]);

    // Esc closes the guide. Handlers registered earlier mark the event once
    // they have used it, so one press never closes two things.
    scene.input.keyboard.on('keydown-ESC', (e) => {
      if (!e?.oaHandled && this.isOpen()) this.close();
    });
    scene.input.keyboard.on('keydown-UP', () => { if (this.isOpen()) this.go(this.topic - 1); });
    scene.input.keyboard.on('keydown-DOWN', () => { if (this.isOpen()) this.go(this.topic + 1); });
    show(this.container, false);
  }

  isOpen() {
    return this.container.visible;
  }

  open(topic = 0) {
    if (this.isOpen()) return Promise.resolve();
    show(this.container, true);
    this.go(topic, true);
    return new Promise((resolve) => { this.resolve = resolve; });
  }

  close() {
    if (!this.isOpen()) return;
    this.clearDemo();
    show(this.container, false);
    const resolve = this.resolve;
    this.resolve = null;
    if (resolve) resolve();
  }

  go(i, force = false) {
    if (i < 0 || i >= this.T.topics.length || (i === this.topic && !force)) return;
    this.topic = i;
    this.showingMore = false;
    this.render();
  }

  paintTabs() {
    this.tabs.forEach(({ bg, label }, i) => {
      const on = i === this.topic;
      bg.setFillStyle(on ? 0x2b3a8a : 0x141c4e).setStrokeStyle(on ? 2 : 1, on ? 0xe8b923 : 0x3a4a8a);
      label.setColor(on ? '#ffe58a' : '#d8d0f0');
    });
  }

  clearDemo() {
    if (this.demo?.destroy) this.demo.destroy();
    this.demo = null;
    this.content.removeAll(true);
  }

  // Lay out the topic: text from the top, the "In the game" box at the
  // bottom, and the demo (or the detail page) in the space between.
  render() {
    const topic = this.T.topics[this.topic];
    const TOP = this.top;
    this.clearDemo();
    this.paintTabs();
    this.title.setTexture(pixelTextTexture(this.scene, topic.title, 22));
    this.moreBtn.setVisible(!!topic.more);
    this.moreBtn.setLabel(this.showingMore ? this.T.showDemo : this.T.showMore);

    const boxTop = this.buildGameBox(topic.game);
    const wantDemo = topic.demo && !this.showingMore;
    const minDemo = wantDemo ? 170 : 0;
    const blocks = this.showingMore ? topic.more : topic.text;

    let bottom = TOP + 60;
    for (const size of [15, 14, 13]) {
      bottom = this.flowText(blocks, TOP + 60, size);
      if (boxTop - 10 - bottom >= minDemo) break;
    }
    if (wantDemo) {
      const area = { x: CL, y: bottom + 6, w: CW, h: boxTop - 10 - (bottom + 6) };
      this.demo = DEMOS[topic.demo](this, area);
    }
    show(this.container, true);
  }

  // Paragraphs and formula lines, flowing down from y. Returns the bottom.
  flowText(blocks, y, size) {
    this.content.list.filter((o) => o.isGuideText).forEach((o) => o.destroy());
    for (const b of blocks) {
      const isMath = typeof b !== 'string';
      const t = isMath
        ? text(this.scene, CCX, y, b.math, { fontSize: `${size + 1}px`, color: '#ffe58a', align: 'center' }).setOrigin(0.5, 0)
        : text(this.scene, CL, y, b, { fontSize: `${size}px`, color: '#fff6dc', wordWrap: { width: CW }, lineSpacing: 4 });
      t.isGuideText = true;
      this.content.add(t);
      y += t.height + (isMath ? 6 : 8);
    }
    return y;
  }

  buildGameBox(str) {
    const bottom = this.top + this.ph - 16;
    const t = text(this.scene, CL + 14, 0, str, { fontSize: '14px', color: '#f1e2bf', wordWrap: { width: CW - 28 }, lineSpacing: 3 });
    const h = Math.ceil(t.height) + 34;
    const top = bottom - h;
    t.setY(top + 25);
    const box = this.scene.add.graphics();
    box.fillStyle(0x0b1030, 0.9).fillRect(CL, top, CW, h);
    box.lineStyle(1, 0xd9a43a, 0.9).strokeRect(CL + 0.5, top + 0.5, CW - 1, h - 1);
    const sun = this.scene.add.image(CL + 20, top + 13, 'ui_sun_coin');
    const label = text(this.scene, CL + 34, top + 13, this.T.inGame.toUpperCase(), { fontSize: '12px', color: '#e8b923' }).setOrigin(0, 0.5);
    this.content.add([box, sun, label, t]);
    return top;
  }

  // ---------- Demo helpers ----------
  add(...objs) {
    this.content.add(objs);
    return objs[0];
  }

  button(x, y, w, label, fn) {
    return this.add(makeButton(this.scene, x, y, w, 28, label, () => fn(), { fontSize: '14px' }));
  }

  label(x, y, str, style = {}) {
    return this.add(text(this.scene, x, y, str, { fontSize: '15px', color: '#fff6dc', ...style }));
  }

  chart(area, { axisFrac, scale, top = 40 }) {
    const span = area.h - top - 4;
    const axisY = Math.round(area.y + top + span * axisFrac);
    const c = new BarChart(this.scene, { centerX: CCX, axisY, barWidth: 8, gap: 2, scale: scale(span) });
    this.add(c.gfx);
    return c;
  }
}

// ---------- Demos ----------
// Each takes (guide, area) and returns an object with an optional destroy().

const DEMOS = {
  // Search the pots one by one, like Hercules's first climbs.
  classical(g, area) {
    const L = TEXT.guide.classical;
    const cell = 20;
    const step = 22;
    const size = step * 8 - 2;
    const gx = area.x + 8;
    const gy = Math.round(area.y + (area.h - size) / 2);
    let target = Math.floor(Math.random() * N);
    let opened = 0;
    let found = false;
    const tx = gx + size + 30;
    const count = g.label(tx, gy + 6, L.opened(0), { fontSize: '18px', fontStyle: 'bold' });
    const msg = g.label(tx, gy + 40, L.hint, { fontSize: '15px', color: '#e0c77e', wordWrap: { width: CR - tx } });
    const cells = [];
    for (let i = 0; i < N; i++) {
      const r = g.add(g.scene.add.rectangle(gx + (i % 8) * step, gy + Math.floor(i / 8) * step, cell, cell, 0x4a3b2c).setOrigin(0).setStrokeStyle(1, 0x6b5236));
      r.setInteractive({ useHandCursor: true });
      r.on('pointerup', () => {
        if (found || r.opened) return;
        r.opened = true;
        opened += 1;
        count.setText(L.opened(opened));
        if (i === target) {
          found = true;
          r.setFillStyle(0xe8b923);
          msg.setText(L.found(opened));
          Audio.play('success');
        } else {
          r.setFillStyle(0x1a1410).setStrokeStyle(1, 0x3a2e22);
          Audio.play('pot_break');
        }
      });
      cells.push(r);
    }
    g.button(tx + 80, gy + size - 14, 160, L.reset, () => {
      target = Math.floor(Math.random() * N);
      opened = 0;
      found = false;
      count.setText(L.opened(0));
      msg.setText(L.hint);
      cells.forEach((r) => { r.opened = false; r.setFillStyle(0x4a3b2c).setStrokeStyle(1, 0x6b5236); });
    });
    return {};
  },

  // Six coins name one pot.
  coins(g, area) {
    const bits = [1, 0, 1, 0, 1, 0];
    const cy = area.y + Math.min(46, area.h / 3);
    const coins = bits.map((bit, i) => {
      const c = g.add(g.scene.add.image(area.x + 36 + i * 56, cy, 'ui_coin', bit).setScale(0.85));
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', () => { bits[i] ^= 1; Audio.play('ui_click'); refresh(); });
      g.label(c.x, cy + 30, `coin ${i + 1}`, { fontSize: '13px', color: '#c9b48a' }).setOrigin(0.5, 0);
      return c;
    });
    const readout = g.label(area.x + 14, cy + 58, '', { fontSize: '22px', fontStyle: 'bold' });
    const cell = 16;
    const gx = CR - 8 - cell * 8;
    const gy = Math.round(area.y + (area.h - cell * 8) / 2);
    const mini = [];
    for (let i = 0; i < N; i++) {
      mini.push(g.add(g.scene.add.rectangle(gx + (i % 8) * cell, gy + Math.floor(i / 8) * cell, cell - 2, cell - 2, 0x4a3b2c).setOrigin(0)));
    }
    const refresh = () => {
      coins.forEach((c, i) => c.setFrame(bits[i]));
      const pot = indexFor(bits);
      readout.setText(TEXT.guide.coins.readout(patternFor(pot), pot));
      mini.forEach((r, i) => r.setFillStyle(i === pot ? 0xe8b923 : 0x4a3b2c));
    };
    refresh();
    return {};
  },

  // |000000>, then a Hadamard on every qubit.
  hadamard(g, area) {
    const L = TEXT.guide.hadamard;
    const chart = g.chart(area, { axisFrac: 1, top: 58, scale: (span) => span - 4 });
    const note = g.label(area.x, area.y + 40, '', { fontSize: '14px', color: '#e0c77e' }).setOrigin(0, 0.5);
    const set = (spread) => {
      chart.setAmps(spread ? uniform(N) : basisState(N, 0), true, 450);
      note.setText(spread ? L.after : L.before);
      Audio.play(spread ? 'coin_toss' : 'ui_click');
    };
    g.button(area.x + 100, area.y + 14, 196, L.apply, () => set(true));
    g.button(area.x + 314, area.y + 14, 196, L.reset, () => set(false));
    chart.setAmps(basisState(N, 0), false);
    note.setText(L.before);
    return { destroy: () => chart.stop() };
  },

  // The phase flip: the marked bar turns upside down, its probability doesn't.
  oracle(g, area) {
    const L = TEXT.guide.oracle;
    const chart = g.chart(area, { axisFrac: 0.5, top: 58, scale: (span) => (span / 2 - 4) / 0.125 });
    chart.highlight = TARGET;
    let amps = uniform(N);
    chart.setAmps(amps, false);
    const readout = g.label(area.x, area.y + 40, L.readout(amps[TARGET]), { fontSize: '14px', color: '#ffe58a' }).setOrigin(0, 0.5);
    g.button(area.x + 96, area.y + 14, 188, L.mark, () => {
      amps = applyOracle(amps, TARGET);
      Audio.play('fate_mark');
      chart.setAmps(amps, true, 450);
      readout.setText(L.readout(amps[TARGET]));
    });
    return { destroy: () => chart.stop() };
  },

  // Mark, then reflect about the mean: one Grover iteration at a time.
  diffusion(g, area) {
    const L = TEXT.guide.diffusion;
    const chart = g.chart(area, { axisFrac: 0.55, top: 58, scale: (span) => span * 0.45 - 4 });
    chart.highlight = TARGET;
    chart.showMean = true;
    let amps = uniform(N);
    let k = 0;
    let marked = false;
    chart.setAmps(amps, false);
    const readout = g.label(area.x, area.y + 40, '', { fontSize: '14px', color: '#ffe58a' }).setOrigin(0, 0.5);
    const markBtn = g.button(area.x + 80, area.y + 14, 160, L.mark, () => {
      if (marked) return;
      marked = true;
      amps = applyOracle(amps, TARGET);
      Audio.play('fate_mark');
      chart.setAmps(amps, true, 400);
      refresh();
    });
    const reflectBtn = g.button(area.x + 272, area.y + 14, 200, L.reflect, () => {
      if (!marked) return;
      marked = false;
      k += 1;
      amps = applyDiffusion(amps);
      Audio.play('fate_reflect');
      chart.setAmps(amps, true, 600);
      refresh();
    });
    g.button(CR - 44, area.y + 14, 80, L.reset, () => {
      amps = uniform(N);
      k = 0;
      marked = false;
      chart.setAmps(amps, true, 400);
      refresh();
    });
    const refresh = () => {
      markBtn.setEnabled(!marked);
      reflectBtn.setEnabled(marked);
      readout.setText(L.readout(k, amps[TARGET] ** 2));
    };
    refresh();
    return { destroy: () => chart.stop() };
  },

  // Step k up and down and watch P(k) rise, peak at 6, and fall.
  iterations(g, area) {
    const L = TEXT.guide.iterations;
    const chart = g.chart(area, { axisFrac: 0.82, top: 66, scale: (span) => span * 0.82 - 4 });
    chart.highlight = TARGET;
    let k = 0;
    const readout = g.label(area.x + 80, area.y + 18, '', { fontSize: '17px', fontStyle: 'bold', color: '#ffe58a' }).setOrigin(0, 0.5);
    const plot = g.add(g.scene.add.graphics());
    const pw = 220;
    const ph = 42;
    const px = CR - pw - 4;
    const py = area.y + 16;
    g.label(px + pw, py - 14, L.plot, { fontSize: '12px', color: '#c9b48a' }).setOrigin(1, 0.5);
    const set = (next) => {
      k = Math.max(0, Math.min(12, next));
      chart.setAmps(groverState(k), true, 350);
      const p = successProbability(N, k);
      readout.setText(L.readout(k, p));
      plot.clear();
      plot.lineStyle(1, 0x6b5236, 1).strokeRect(px, py, pw, ph);
      plot.lineStyle(1, 0xc9b48a, 1);
      for (let j = 0; j < 12; j++) {
        plot.lineBetween(px + (j / 12) * pw, py + ph - successProbability(N, j) * ph, px + ((j + 1) / 12) * pw, py + ph - successProbability(N, j + 1) * ph);
      }
      plot.fillStyle(0xe8b923, 1).fillCircle(px + (k / 12) * pw, py + ph - p * ph, 4);
    };
    g.button(area.x + 16, area.y + 18, 30, '−', () => set(k - 1));
    g.button(area.x + 52, area.y + 18, 30, '+', () => set(k + 1));
    set(0);
    return { destroy: () => chart.stop() };
  },

  // Measure after k iterations, once or 100 times, and count the hits.
  measure(g, area) {
    const L = TEXT.guide.measure;
    const chart = g.chart(area, { axisFrac: 1, top: 62, scale: (span) => span - 4 });
    chart.highlight = TARGET;
    let k = 6;
    let counts = new Array(N).fill(0);
    let shots = 0;
    const kLabel = g.label(area.x + 80, area.y + 14, '', { fontSize: '15px', fontStyle: 'bold' }).setOrigin(0, 0.5);
    const result = g.label(area.x, area.y + 40, L.hint, { fontSize: '14px', color: '#ffe58a' }).setOrigin(0, 0.5);
    const shoot = (n) => {
      const probs = probabilities(groverState(k));
      let last = 0;
      for (let i = 0; i < n; i++) {
        last = sample(probs);
        counts[last] += 1;
      }
      shots += n;
      const max = Math.max(...counts);
      chart.setAmps(counts.map((c) => c / max), true, 300);
      Audio.play(n === 1 && last === TARGET ? 'success' : 'coin_toss');
      result.setText(n === 1
        ? `${L.result(patternFor(last), last, last === TARGET)}   ${L.tally(counts[TARGET], shots)}`
        : L.tally(counts[TARGET], shots));
    };
    const setK = (next) => {
      k = Math.max(0, Math.min(12, next));
      counts = new Array(N).fill(0);
      shots = 0;
      kLabel.setText(L.k(k));
      chart.setAmps(new Array(N).fill(0), false);
      result.setText(L.hint);
    };
    g.button(area.x + 16, area.y + 14, 30, '−', () => setK(k - 1));
    g.button(area.x + 52, area.y + 14, 30, '+', () => setK(k + 1));
    g.button(area.x + 290, area.y + 14, 140, L.once, () => shoot(1));
    g.button(area.x + 460, area.y + 14, 176, L.many, () => shoot(100));
    setK(6);
    return { destroy: () => chart.stop() };
  },

  // Classical average and worst case against Grover iterations, for any size.
  advantage(g, area) {
    const L = TEXT.guide.advantage;
    let n = 6;
    const readout = g.label(area.x + 80, area.y + 14, '', { fontSize: '16px', fontStyle: 'bold' }).setOrigin(0, 0.5);
    const bars = g.add(g.scene.add.graphics());
    const rowsTop = area.y + 44;
    const rowH = Math.min(34, (area.h - 64) / 3);
    const labelW = 170;
    const barX = area.x + labelW;
    const barMax = CW - labelW - 110;
    const rows = [L.avg, L.worst, L.grover].map((name, i) => ({
      name: g.label(area.x, rowsTop + i * rowH + rowH / 2, name, { fontSize: '14px' }).setOrigin(0, 0.5),
      value: g.label(0, rowsTop + i * rowH + rowH / 2, '', { fontSize: '15px', fontStyle: 'bold' }).setOrigin(0, 0.5),
    }));
    g.label(area.x, rowsTop + rowH * 3 + 4, L.scale, { fontSize: '12px', color: '#c9b48a' });
    const colors = [0xc0703a, 0xe6dcc4, 0xe8b923];
    const logMax = Math.log10(2 ** 20);
    const set = (next) => {
      n = Math.max(2, Math.min(20, next));
      const size = 2 ** n;
      const theta = Math.asin(1 / Math.sqrt(size));
      const values = [(size + 1) / 2, size - 1, Math.max(1, Math.round(Math.PI / (4 * theta) - 0.5))];
      readout.setText(L.qubits(n, size));
      bars.clear();
      values.forEach((v, i) => {
        const y = rowsTop + i * rowH + rowH / 2;
        const w = Math.max(4, Math.round((Math.log10(v + 1) / logMax) * barMax));
        bars.fillStyle(0x0d0805, 0.55).fillRect(barX, y - 7, barMax, 14);
        bars.fillStyle(colors[i], 1).fillRect(barX, y - 7, w, 14);
        rows[i].value.setText(v.toLocaleString('en-US')).setX(barX + w + 8);
      });
    };
    g.button(area.x + 16, area.y + 14, 30, '−', () => set(n - 1));
    g.button(area.x + 52, area.y + 14, 30, '+', () => set(n + 1));
    set(6);
    return {};
  },
};
