// Results: the end of the tale. Zeus gives his verdict (with a sun rating),
// and four marble columns compare the offerings needed to find the bolt:
// this run, Grover's average, and searching pot by pot (average and worst
// case). The one button opens the Grover guide, which also holds Play Again
// and Main Menu.

import { GAME_WIDTH, SEARCH } from '../config.js';
import { DIALOGUE, TEXT } from '../dialogue.js';
import { fitCamera } from '../viewport.js';
import {
  frame, shadowed, pixelTitle, divider, meanderBand, makeButton,
} from '../ui/widgets.js';
import { buildBackdrop } from '../ui/backdrop.js';
import { GroverGuide } from '../ui/GroverGuide.js';
import { successProbability } from '../sim/statevector.js';
import { Audio } from '../audio.js';

const VERDICT_PALETTE = { pleased: 'green', neutral: 'amber', angry: 'red' };
const SUNS = { pleased: 3, neutral: 2, angry: 1 };

const CARD_TOP = 96;
const CARD_H = 350;

// Expected offerings with the Oracle's way: six blessings and a toss per
// attempt, repeated in the rare case the toss misses.
const GROVER_AVERAGE = 7 / successProbability(SEARCH.states, 6);

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super('Results');
  }

  create(data) {
    const { stats, verdict } = data;
    this.leaving = false; // the scene instance is reused on every run
    fitCamera(this);
    const R = TEXT.results;
    const cx = GAME_WIDTH / 2;
    this.cameras.main.fadeIn(500, 0, 0, 0);
    Audio.playMusic('music_title');

    buildBackdrop(this, { dim: 0.5, temple: false });

    meanderBand(this, cx, 12, 640);
    pixelTitle(this, cx, 44, R.title, 40, 'gold');
    divider(this, cx, 78);

    this.buildVerdict(verdict);
    this.buildColumns(stats);

    makeButton(this, cx, 484, 320, 42, R.learn, () => this.guide.open(0), { fontSize: '20px' });

    this.guide = new GroverGuide(this, {
      top: 12,
      depth: 1000,
      results: { onPlayAgain: () => this.leave('Game'), onMenu: () => this.leave('Title') },
    });

    const onResize = () => this.scene.restart(data);
    this.game.events.on('view-resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off('view-resize', onResize));
  }

  // Left card: Zeus, his words, and how many suns the run earned.
  buildVerdict(verdict) {
    const R = TEXT.results;
    const x = 170;
    frame(this, x, CARD_TOP + CARD_H / 2, 260, CARD_H);
    frame(this, x, CARD_TOP + 68, 104, 104, 'ui_frame');
    this.add.image(x, CARD_TOP + 68, 'portrait_zeus');
    frame(this, x, CARD_TOP + 134, 110, 30, 'ui_plaque');
    pixelTitle(this, x, CARD_TOP + 135, 'ZEUS', 16, 'marble');

    shadowed(this, x, CARD_TOP + 162, `“${DIALOGUE.zeusVerdict[verdict][0].text}”`, {
      fontSize: '16px', color: '#f1e2bf', align: 'center', wordWrap: { width: 220 }, lineSpacing: 5,
    }).setOrigin(0.5, 0);

    const lit = SUNS[verdict];
    for (let i = 0; i < 3; i++) {
      const sun = this.add.image(x - 44 + i * 44, CARD_TOP + 278, 'ui_sun_coin').setScale(2);
      if (i >= lit) sun.setTint(0x55607a).setAlpha(0.6);
    }
    pixelTitle(this, x, CARD_TOP + 316, R.verdictCaption[verdict], 18, VERDICT_PALETTE[verdict]);
  }

  // Right card: four columns, each as tall as the offerings it stands for.
  buildColumns(s) {
    const R = TEXT.results;
    const left = 312;
    const w = 608;
    const cx = left + w / 2;
    frame(this, cx, CARD_TOP + CARD_H / 2, w, CARD_H);
    pixelTitle(this, cx, CARD_TOP + 26, R.chartTitle, 20, 'gold');

    const baseY = CARD_TOP + 262;
    const maxH = 184;
    const maxVal = Math.max(SEARCH.classicalWorst, s.mainActions);
    const columns = [
      { label: R.bars.you, note: R.notes.you, value: s.mainActions, shown: String(s.mainActions), stone: [0xf2c14e, 0xfff1a8, 0xa8741c] },
      { label: R.bars.grover, note: R.notes.grover, value: GROVER_AVERAGE, shown: GROVER_AVERAGE.toFixed(1), stone: [0x5f78d0, 0xa8b8ff, 0x34479a] },
      { label: R.bars.avg, note: R.notes.avg, value: (SEARCH.states + 1) / 2, shown: String((SEARCH.states + 1) / 2), stone: [0xc0703a, 0xf0a070, 0x7a3e1c] },
      { label: R.bars.worst, note: R.notes.worst, value: SEARCH.classicalWorst, shown: String(SEARCH.classicalWorst), stone: [0xe6dcc4, 0xffffff, 0xa89878] },
    ];

    // Ground line the columns stand on.
    const ground = this.add.graphics();
    ground.fillStyle(0xa89878, 1).fillRect(left + 26, baseY, w - 52, 3);

    const slot = (w - 40) / columns.length;
    columns.forEach((col, i) => {
      const x = Math.round(left + 20 + slot * (i + 0.5));
      const h = Math.max(30, Math.round((col.value / maxVal) * maxH));
      const g = this.add.graphics();
      const value = shadowed(this, x, baseY, col.shown, { fontSize: '22px', fontStyle: 'bold', color: i === 0 ? '#ffe58a' : '#fff3d6' }).setOrigin(0.5, 1);
      // Labels wrap inside their own column so neighbours never touch.
      const label = shadowed(this, x, baseY + 10, col.label, {
        fontSize: '15px', color: i === 0 ? '#ffe58a' : '#fff3d6', align: 'center', wordWrap: { width: slot - 16 }, lineSpacing: 2,
      }).setOrigin(0.5, 0);
      shadowed(this, x, label.y + label.height + 2, col.note, { fontSize: '13px', color: '#c9b48a', align: 'center' }).setOrigin(0.5, 0);

      // The columns rise one after another, with the number riding on top.
      const grow = { t: 0 };
      this.tweens.add({
        targets: grow,
        t: 1,
        duration: 900,
        delay: 250 + i * 220,
        ease: 'Cubic.easeOut',
        onUpdate: () => {
          const hh = Math.max(12, Math.round(h * grow.t));
          drawColumn(g, x, baseY, hh, col.stone);
          value.setY(baseY - hh - 6);
        },
      });
      drawColumn(g, x, baseY, 12, col.stone);
      value.setY(baseY - 18);
    });
  }

  leave(scene) {
    if (this.leaving) return;
    this.leaving = true;
    this.guide.close();
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(scene));
  }
}

// A small fluted Greek column: plinth, shaft and capital, h pixels tall.
function drawColumn(g, x, baseY, h, [fill, light, dark]) {
  const shaftW = 40;
  const capW = 56;
  g.clear();
  const top = baseY - h;
  // Plinth.
  g.fillStyle(dark, 1).fillRect(x - capW / 2, baseY - 6, capW, 6);
  g.fillStyle(fill, 1).fillRect(x - capW / 2 + 2, baseY - 6, capW - 4, 4);
  // Shaft with flutes.
  const shaftTop = top + 8;
  const shaftH = Math.max(0, baseY - 6 - shaftTop);
  g.fillStyle(fill, 1).fillRect(x - shaftW / 2, shaftTop, shaftW, shaftH);
  g.fillStyle(light, 1).fillRect(x - shaftW / 2 + 2, shaftTop, 3, shaftH);
  g.fillStyle(dark, 1).fillRect(x + shaftW / 2 - 3, shaftTop, 3, shaftH);
  for (let fx = x - shaftW / 2 + 9; fx < x + shaftW / 2 - 4; fx += 7) g.fillRect(fx, shaftTop, 1, shaftH);
  // Capital.
  g.fillStyle(dark, 1).fillRect(x - capW / 2, top, capW, 8);
  g.fillStyle(light, 1).fillRect(x - capW / 2 + 2, top + 1, capW - 4, 3);
}
