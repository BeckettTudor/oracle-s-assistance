// The Oracle's altar: shows the current "shape of fate" as unlabeled,
// shuffled amplitude bars, lets Hercules choose to ask for a blessing or toss
// the coins, and animates each blessing (mark, then reflect).

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { TEXT } from '../dialogue.js';
import { frame, text, shadowed, pixelTitle, divider, meanderBand, makeButton, blocker, show } from './widgets.js';
import { BarChart } from './BarChart.js';
import { Audio } from '../audio.js';

// The panel starts below the corner buttons so Options never sits on its rim.
const PW = 900;
const TOP = 52;
const PH = GAME_HEIGHT - TOP - 8;
const CX = GAME_WIDTH / 2;
const CY = TOP + PH / 2;
const LEFT = CX - PW / 2;
const BTN_Y = TOP + PH - 30;

export class OraclePanel {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(600);
    this.resolve = null;

    this.container.add(blocker(scene, 0.6));
    this.container.add(frame(scene, CX, CY, PW, PH));
    this.container.add(meanderBand(scene, CX, TOP + 12, PW - 40));
    this.container.add(pixelTitle(scene, CX, TOP + 40, TEXT.oracle.title, 28));
    this.container.add(divider(scene, CX, TOP + 60));
    this.container.add(text(scene, LEFT + 30, TOP + 74, TEXT.oracle.explain, {
      fontSize: '16px', color: '#eadcc0', wordWrap: { width: PW - 60 }, lineSpacing: 5,
    }));

    this.runText = text(scene, LEFT + 30, TOP + 128, '', { fontSize: '18px' });
    this.oddsText = text(scene, LEFT + 30, TOP + 154, '', { fontSize: '18px', fontStyle: 'bold', color: '#ffe58a' });
    this.status = text(scene, LEFT + PW - 32, TOP + 152, '', {
      fontSize: '19px', fontStyle: 'bold', color: '#ffd56a',
    }).setOrigin(1, 0.5); // right-aligned, clear of the readouts

    // The footer stacks up from the buttons: cost line, then the note.
    this.cost = text(scene, CX, BTN_Y - 29, TEXT.oracle.cost, {
      fontSize: '16px', color: '#d9c38a',
    }).setOrigin(0.5, 1);
    this.note = text(scene, LEFT + 30, 0, TEXT.oracle.note, {
      fontSize: '15px', color: '#b9a88a', wordWrap: { width: PW - 60 }, lineSpacing: 4,
    });
    this.note.setY(Math.round(this.cost.y - this.cost.height - 12 - this.note.height));

    // The chart fills the space between the readouts and the note. A marked
    // bar can hang as far below the axis as a tall one rises above it.
    const chartTop = this.oddsText.y + 34;
    const chartBottom = this.note.y - 14;
    const scale = Math.floor((chartBottom - chartTop) / 2);
    this.chart = new BarChart(scene, { centerX: CX, axisY: chartTop + scale, scale });
    this.chart.showMean = false;

    this.askBtn = makeButton(scene, CX - 140, BTN_Y, 240, 38, TEXT.oracle.ask, () => this.pick('ask'), { fontSize: '18px' });
    this.tossBtn = makeButton(scene, CX + 140, BTN_Y, 240, 38, TEXT.oracle.toss, () => this.pick('toss'), { fontSize: '18px' });
    this.descendBtn = makeButton(scene, CX, BTN_Y, 260, 38, TEXT.oracle.descend, () => this.finishBlessing(), { fontSize: '18px' });

    // Opens the Grover guide at the topic on why about six blessings is best.
    this.learnBtn = makeButton(scene, LEFT + PW - 116, TOP + 40, 196, 28, TEXT.tutorial.quantum, () => scene.guide?.open(5), { fontSize: '14px' });

    this.container.add([this.runText, this.oddsText, this.status, this.chart.gfx, this.note, this.cost,
      this.askBtn, this.tossBtn, this.descendBtn, this.learnBtn]);

    this.dots = 0;
    this.consultingTimer = null;
    show(this.container, false);
  }

  isOpen() {
    return this.container.visible;
  }

  // view: { amplitudes, run, odds, order }. Resolves 'ask' or 'toss'.
  choose(view) {
    this.chart.setOrder(view.order);
    this.chart.setAmps(view.amplitudes, false);
    this.setInfo(view.run, view.odds);
    this.status.setText('');
    this.askBtn.setVisible(true);
    this.tossBtn.setVisible(true);
    this.descendBtn.setVisible(false);
    this.cost.setVisible(true);
    show(this.container, true);
    return new Promise((resolve) => { this.resolve = resolve; });
  }

  pick(choice) {
    if (!this.resolve) return;
    const resolve = this.resolve;
    this.resolve = null;
    this.askBtn.setVisible(false);
    this.tossBtn.setVisible(false);
    this.cost.setVisible(false);
    show(this.container, choice === 'ask'); // stay open to show the blessing
    resolve(choice);
  }

  setInfo(run, odds) {
    this.runText.setText(TEXT.oracle.run(run));
    this.oddsText.setText(TEXT.oracle.odds(odds));
  }

  setConsulting(on) {
    if (this.consultingTimer) {
      this.consultingTimer.remove();
      this.consultingTimer = null;
    }
    if (!on) return;
    const tick = () => {
      this.dots = (this.dots % 3) + 1;
      this.status.setText(TEXT.oracle.consulting + '.'.repeat(this.dots));
    };
    tick();
    this.consultingTimer = this.scene.time.addEvent({ delay: 350, loop: true, callback: tick });
  }

  // Animate one blessing, then wait for "Return down the hill".
  async showBlessing({ oracleAmplitudes, amplitudes, run, odds }) {
    this.setConsulting(false);
    if (oracleAmplitudes) {
      this.status.setText(TEXT.oracle.marking);
      Audio.play('fate_mark');
      await this.chart.setAmps(oracleAmplitudes, true, 600);
      await this.wait(450);
    }
    this.status.setText(TEXT.oracle.reflecting);
    this.chart.showMean = true;
    this.chart.draw();
    await this.wait(350);
    Audio.play('fate_reflect');
    await this.chart.setAmps(amplitudes, true, 900);
    this.chart.showMean = false;
    this.chart.draw();
    this.status.setText(TEXT.oracle.blessed(run));
    this.setInfo(run, odds);
    this.descendBtn.setVisible(true);
    show(this.container, true);
    return new Promise((resolve) => { this.resolve = resolve; });
  }

  finishBlessing() {
    if (!this.resolve) return;
    const resolve = this.resolve;
    this.resolve = null;
    show(this.container, false);
    resolve();
  }

  wait(ms) {
    return new Promise((resolve) => this.scene.time.delayedCall(ms, resolve));
  }
}
