// The Oracle's interactive four-stage lesson on Grover's algorithm. Uses its
// own demo target and local teaching math; it never touches the real target
// or the quantum adapter.

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
const DEMO_TARGET = 42;
const MAX_STEPS = 12;

// The panel starts below the corner buttons so Options never sits on its rim.
const PW = 900;
const TOP = 52;
const PH = GAME_HEIGHT - TOP - 8;
const CX = GAME_WIDTH / 2;
const CY = TOP + PH / 2;
const LEFT = CX - PW / 2;
const RIGHT = LEFT + PW - 28;
const NAV_Y = TOP + PH - 28;
// Stage 4's success plot, right-aligned under the corner of the text column.
const PLOT_W = 240;
const PLOT_H = 56;

export class Tutorial {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(700);
    this.stage = 0;
    this.resolve = null;
    this.firstTime = true;
    this.token = 0;

    this.container.add(blocker(scene, 0.7));
    this.container.add(frame(scene, CX, CY, PW, PH));
    this.band = meanderBand(scene, CX, TOP + 12, PW - 40);
    this.header = shadowed(scene, LEFT + 28, TOP + 22, TEXT.tutorial.header.toUpperCase(), {
      fontSize: '14px', fontStyle: 'bold', color: '#e0a94a',
    });
    this.stageTitle = scene.add.image(LEFT + 24, TOP + 58, pixelTextTexture(scene, ' ', 24)).setOrigin(0, 0.5);
    this.body = text(scene, LEFT + 26, TOP + 84, '', {
      fontSize: '17px', color: '#fff6dc', wordWrap: { width: PW - 52 }, lineSpacing: 6,
    });
    this.note = text(scene, LEFT + 26, TOP + 150, '', {
      fontSize: '15px', color: '#e0c77e', wordWrap: { width: PW - 52 }, lineSpacing: 4,
    });
    this.container.add([this.band, this.header, this.stageTitle, this.body, this.note]);

    this.closeBtn = makeButton(scene, LEFT + PW - 86, TOP + 42, 136, 28, TEXT.tutorial.close, () => this.close(), { fontSize: '14px' });
    this.backBtn = makeButton(scene, LEFT + 88, NAV_Y, 120, 34, TEXT.tutorial.back, () => this.go(this.stage - 1));
    this.nextBtn = makeButton(scene, LEFT + PW - 88, NAV_Y, 120, 34, TEXT.tutorial.next, () => this.next());
    this.dots = [];
    for (let i = 0; i < 4; i++) this.dots.push(scene.add.circle(CX - 36 + i * 24, NAV_Y, 6, 0x6b5236));
    // Opens the Learn More chapter that matches this stage.
    this.learnBtn = makeButton(scene, 0, TOP + 42, 136, 28, TEXT.tutorial.learnMore, () => scene.guide?.open(this.stage + 1), { fontSize: '14px' });
    this.container.add([this.closeBtn, this.learnBtn, this.backBtn, this.nextBtn, ...this.dots]);

    this.buildCoins();
    this.buildBars();

    scene.input.keyboard.on('keydown-ESC', (e) => {
      if (!e?.oaHandled && this.isOpen() && !this.firstTime) this.close();
    });

    show(this.container, false);
  }

  isOpen() {
    return this.container.visible;
  }

  // ---------- Stage 1: coins name pots ----------
  buildCoins() {
    const s = this.scene;
    this.coinLayer = s.add.container(0, 0);
    this.coinBits = [1, 0, 0, 1, 0, 1];
    this.coins = this.coinBits.map((bit, i) => {
      const coin = s.add.image(LEFT + 112 + i * 74, TOP + 262, 'ui_coin', bit);
      coin.setInteractive({ useHandCursor: true });
      coin.on('pointerup', () => {
        this.coinBits[i] ^= 1;
        this.refreshCoins();
      });
      const lbl = text(s, coin.x, coin.y + 40, `coin ${i + 1}`, {
        fontSize: '14px', color: '#c9b48a',
      }).setOrigin(0.5);
      this.coinLayer.add([coin, lbl]);
      return coin;
    });
    this.readout = text(s, LEFT + 88, TOP + 324, '', {
      fontSize: '26px', fontStyle: 'bold', color: '#fff6dc',
    });
    this.coinLayer.add(this.readout);

    const cell = 18;
    const gx = RIGHT - 60 - cell * 8;
    const gy = TOP + 214;
    this.miniCells = [];
    for (let i = 0; i < N; i++) {
      const r = s.add.rectangle(gx + (i % 8) * cell + cell / 2, gy + Math.floor(i / 8) * cell + cell / 2,
        cell - 2, cell - 2, 0x4a3b2c);
      this.miniCells.push(r);
      this.coinLayer.add(r);
    }
    this.coinLayer.add(text(s, gx + cell * 4, gy + cell * 8 + 10, '64 pots', {
      fontSize: '14px', color: '#c9b48a',
    }).setOrigin(0.5, 0));
    this.container.add(this.coinLayer);
  }

  refreshCoins() {
    this.coins.forEach((c, i) => c.setFrame(this.coinBits[i]));
    const dec = indexFor(this.coinBits);
    this.readout.setText(TEXT.tutorial.readout(patternFor(dec), dec));
    this.miniCells.forEach((c, i) => c.setFillStyle(i === dec ? 0xe8b923 : 0x4a3b2c));
  }

  // ---------- Stages 2-4: weights as bars ----------
  buildBars() {
    const s = this.scene;
    this.barsLayer = s.add.container(0, 0);
    // Vertical positions are set by layoutText(), which flows the controls,
    // readout and chart beneath however many lines the text needs.
    this.chart = new BarChart(s, { centerX: CX, axisY: 0, scale: 84 });
    this.chart.highlight = DEMO_TARGET;
    this.probText = text(s, LEFT + 26, 0, '', { fontSize: '17px', fontStyle: 'bold', color: '#ffe58a' });
    this.actionBtn = makeButton(s, LEFT + 151, 0, 250, 34, '', () => this.stageAction());
    this.resetBtn = makeButton(s, LEFT + 340, 0, 96, 34, TEXT.tutorial.stages[3].reset, () => this.resetAmplification());
    this.plotGfx = s.add.graphics();
    this.plotLabel = text(s, RIGHT, 0, TEXT.tutorial.probLabel, { fontSize: '14px', color: '#c9b48a' }).setOrigin(1, 0);
    this.barsLayer.add([this.chart.gfx, this.probText, this.actionBtn, this.resetBtn, this.plotGfx, this.plotLabel]);
    this.container.add(this.barsLayer);
    this.amps = uniform(N);
    this.history = [1 / N];
  }

  setAmps(next, animate = true) {
    this.amps = next;
    const p = this.chart.setAmps(next, animate, 380);
    return p.then(() => this.refreshProb());
  }

  refreshProb() {
    const a = this.chart.display;
    if (this.stage === 1) {
      this.probText.setText(TEXT.tutorial.probUniform(a[0], a[1]));
    } else {
      const p = a[DEMO_TARGET] ** 2;
      this.probText.setText(TEXT.tutorial.probMarked(a[DEMO_TARGET], p));
    }
  }

  drawPlot() {
    const g = this.plotGfx;
    g.clear();
    if (this.stage !== 3) return;
    const x0 = RIGHT - PLOT_W;
    const y0 = this.plotY;
    const w = PLOT_W;
    const h = PLOT_H;
    g.lineStyle(1, 0x6b5236, 1).strokeRect(x0, y0, w, h);
    for (let k = 0; k < MAX_STEPS; k++) {
      g.lineBetween(
        x0 + (k / MAX_STEPS) * w, y0 + h - successProbability(N, k) * h,
        x0 + ((k + 1) / MAX_STEPS) * w, y0 + h - successProbability(N, k + 1) * h,
      );
    }
    g.fillStyle(0xe8b923, 1);
    this.history.forEach((p, k) => g.fillCircle(x0 + (k / MAX_STEPS) * w, y0 + h - p * h, 3));
  }

  layoutText(after = '') {
    const def = TEXT.tutorial.stages[this.stage];
    this.body.setText(after ? `${def.body}\n\n${after}` : def.body);
    this.note.setText(def.note);
    this.note.setY(this.body.y + this.body.height + 8);
    if (this.stage === 0) return;

    // Controls row, then the readout, then the chart in whatever room is left.
    const rowTop = Math.round(this.note.y + this.note.height + 14);
    this.actionBtn.setY(rowTop + 17);
    this.resetBtn.setY(rowTop + 17);
    this.plotY = rowTop + 18;
    this.plotLabel.setY(rowTop);
    this.probText.setY(rowTop + 44);
    // Bars rise up to `scale` above the axis. Only the gold bar can hang far
    // below it, and it lies clear of the nav buttons, so it may use the
    // space down to the frame's inner edge.
    const chartTop = (this.stage === 3 ? Math.max(this.probText.y + 22, this.plotY + PLOT_H) : this.probText.y + 22) + 12;
    const bottom = TOP + PH - 18;
    this.chart.scale = Math.min(84, Math.floor((bottom - chartTop) / 2));
    this.chart.axisY = chartTop + this.chart.scale;
    this.chart.draw();
    this.drawPlot();
  }

  // ---------- Stage flow ----------
  open({ firstTime }) {
    if (this.isOpen()) return Promise.resolve();
    this.firstTime = firstTime;
    show(this.container, true);
    this.go(0);
    return new Promise((resolve) => { this.resolve = resolve; });
  }

  close() {
    if (!this.isOpen()) return;
    this.chart.stop();
    show(this.container, false);
    const resolve = this.resolve;
    this.resolve = null;
    if (resolve) resolve();
  }

  next() {
    if (this.stage < 3) this.go(this.stage + 1);
    else this.close();
  }

  go(stage) {
    if (stage < 0 || stage > 3) return;
    this.chart.stop();
    this.token += 1;
    this.stage = stage;
    this.busy = false;
    const def = TEXT.tutorial.stages[stage];
    this.stageTitle.setTexture(pixelTextTexture(this.scene, def.title, 24));
    this.layoutText();
    this.dots.forEach((d, i) => d.setFillStyle(i === stage ? 0xe8b923 : 0x6b5236));

    this.coinLayer.setVisible(stage === 0);
    this.barsLayer.setVisible(stage > 0);
    this.closeBtn.setVisible(!this.firstTime);
    this.learnBtn.setX(this.firstTime ? LEFT + PW - 86 : LEFT + PW - 232);
    this.backBtn.setVisible(stage > 0);
    this.nextBtn.setLabel(stage === 3 ? TEXT.tutorial.finish : TEXT.tutorial.next);
    this.resetBtn.setVisible(stage === 3);
    this.plotLabel.setVisible(stage === 3);
    this.chart.highlight = stage >= 2 ? DEMO_TARGET : null;
    this.chart.showMean = stage === 3;

    if (stage === 0) {
      this.refreshCoins();
    } else {
      this.actionBtn.setLabel(def.button).setEnabled(true);
      if (stage === 1) this.setAmps(basisState(N, 0), false);
      if (stage === 2) this.setAmps(uniform(N), false);
      if (stage === 3) this.resetAmplification();
    }
    this.drawPlot();
    if (this.isOpen()) show(this.container, true);
  }

  resetAmplification() {
    this.chart.stop();
    this.token += 1;
    this.busy = false;
    this.k = 0;
    this.history = [1 / N];
    this.setAmps(uniform(N), false);
    this.actionBtn.setEnabled(true);
    this.layoutText();
    this.drawPlot();
  }

  async stageAction() {
    if (this.busy) return;
    const def = TEXT.tutorial.stages[this.stage];
    const token = this.token;
    if (this.stage === 1 || this.stage === 2) {
      this.actionBtn.setEnabled(false);
      Audio.play(this.stage === 1 ? 'coin_toss' : 'fate_mark');
      await this.setAmps(this.stage === 1 ? uniform(N) : applyOracle(this.amps, DEMO_TARGET));
      if (token !== this.token) return;
      this.layoutText(def.after);
    } else if (this.stage === 3) {
      if (this.k >= MAX_STEPS) return;
      this.busy = true;
      Audio.play('fate_mark');
      await this.setAmps(applyOracle(this.amps, DEMO_TARGET));
      if (token !== this.token || !this.isOpen()) return;
      Audio.play('fate_reflect');
      await this.setAmps(applyDiffusion(this.amps));
      if (token !== this.token || !this.isOpen()) return;
      this.k += 1;
      const p = probabilities(this.amps)[DEMO_TARGET];
      this.history.push(p);
      this.layoutText(def.after(this.k, p));
      this.drawPlot();
      this.busy = false;
      if (this.k >= MAX_STEPS) this.actionBtn.setEnabled(false);
    }
  }
}
