// The coin toss: six coins spin and land on the outcome fate (the quantum
// measurement) has already chosen, naming one pot.

import { FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { TEXT } from '../dialogue.js';
import { coinsFor, patternFor } from '../coins.js';
import { frame, text, shadowed, pixelTitle, divider, meanderBand, makeButton, blocker, show } from './widgets.js';
import { Audio } from '../audio.js';

const PW = 560;
const PH = 300;
const CX = GAME_WIDTH / 2;
const CY = GAME_HEIGHT / 2;
const TOP = CY - PH / 2;

export class CoinToss {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(620);
    this.resolve = null;

    this.container.add(blocker(scene, 0.6));
    this.container.add(frame(scene, CX, CY, PW, PH));
    this.container.add(meanderBand(scene, CX, TOP + 12, PW - 40));
    this.container.add(pixelTitle(scene, CX, TOP + 44, TEXT.toss.title, 28));
    this.container.add(divider(scene, CX, TOP + 72));

    this.coins = [];
    for (let i = 0; i < 6; i++) {
      const c = scene.add.image(CX - 200 + i * 80, TOP + 124, 'ui_coin', 0);
      this.coins.push(c);
      this.container.add(c);
    }
    this.result = shadowed(scene, CX, TOP + 172, '', {
      fontSize: '24px', fontStyle: 'bold', color: '#fff3d6',
    }).setOrigin(0.5, 0);
    this.openBtn = makeButton(scene, CX, TOP + PH - 40, 220, 44, '', () => this.finish(), { fontSize: '19px' });
    this.container.add([this.result, this.openBtn]);
    show(this.container, false);
  }

  isOpen() {
    return this.container.visible;
  }

  // Spin the coins and land them on `outcome`. Resolves when the player
  // clicks to open the named pot.
  play(outcome) {
    const faces = coinsFor(outcome);
    this.result.setText(TEXT.toss.spinning);
    this.openBtn.setVisible(false);
    show(this.container, true);
    Audio.play('coin_toss');

    const landings = this.coins.map((coin, i) => new Promise((resolve) => {
      let face = i % 2;
      const flip = this.scene.time.addEvent({
        delay: 90, loop: true, callback: () => { face ^= 1; coin.setFrame(face); },
      });
      const spin = this.scene.tweens.add({
        targets: coin, scaleX: 0.15, duration: 90, yoyo: true, repeat: -1,
      });
      this.scene.time.delayedCall(900 + i * 260, () => {
        flip.remove();
        spin.stop();
        coin.setFrame(faces[i]).setScale(1);
        this.scene.tweens.add({ targets: coin, y: coin.y - 8, duration: 90, yoyo: true });
        resolve();
      });
    }));

    return Promise.all(landings).then(() => {
      this.result.setText(TEXT.toss.result(patternFor(outcome), outcome));
      this.openBtn.setLabel(TEXT.toss.open(outcome));
      this.openBtn.setVisible(true);
      show(this.container, true);
      return new Promise((resolve) => { this.resolve = resolve; });
    });
  }

  finish() {
    if (!this.resolve) return;
    const resolve = this.resolve;
    this.resolve = null;
    show(this.container, false);
    resolve();
  }
}
