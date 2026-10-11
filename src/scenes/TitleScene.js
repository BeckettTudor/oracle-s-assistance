// Title screen: the Aegean vista with the floating Temple of Apollo, gold
// title lettering, a Play button and the controls.

import { GAME_WIDTH } from '../config.js';
import { TEXT } from '../dialogue.js';
import { fitCamera, anchorX, anchorY, toggleFullscreen } from '../viewport.js';
import {
  makeButton, outlined, shadowed, pixelTitle, frame, keycap, blocker,
} from '../ui/widgets.js';
import { buildBackdrop } from '../ui/backdrop.js';
import { Audio } from '../audio.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.starting = false; // the scene instance is reused when returning here
    fitCamera(this);
    const cx = GAME_WIDTH / 2;

    buildBackdrop(this, { templeY: 254 });

    // Title block.
    const title = pixelTitle(this, cx, 72, TEXT.title, 56, 'gold');
    this.tweens.add({ targets: title, y: '-=4', duration: 2200, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [2] });

    // Play.
    const play = makeButton(this, cx, 428, 210, 46, TEXT.play, () => this.startGame(), { fontSize: '24px' });
    const glow = this.add.rectangle(cx, 428, 220, 56).setStrokeStyle(2, 0xfff1a8, 0.9);
    this.children.moveBelow(glow, play);
    this.tweens.add({ targets: glow, alpha: 0.1, duration: 700, yoyo: true, repeat: -1 });

    // Controls bar: keycaps and captions laid out by their measured widths.
    const groups = [
      [['A', 'D'], 'Move'], [['Space'], 'Jump'], [['E'], 'Interact'], [['Esc'], 'Options'], [['F'], 'Fullscreen'],
    ];
    const bar = this.add.container(0, 480);
    let x = 0;
    for (const [keys, caption] of groups) {
      for (const k of keys) {
        const cap = keycap(this, 0, 0, k);
        cap.x = x + cap.width / 2;
        bar.add(cap);
        x += cap.width + 4;
      }
      const label = shadowed(this, x + 2, -1, caption, { fontSize: '15px' }).setOrigin(0, 0.5);
      bar.add(label);
      x += label.width + 26;
    }
    const barWidth = x - 26;
    bar.x = Math.round(cx - barWidth / 2);
    const plate = frame(this, cx, 480, barWidth + 44, 40);
    this.children.moveBelow(plate, bar);

    // Footer on its own lapis strip, so it never sits on the busy foreground.
    const stripLeft = anchorX(0, 0);
    const stripW = anchorX(1, 0) - stripLeft;
    this.add.rectangle(stripLeft, anchorY(1, -26), stripW, 26, 0x0e1438, 0.82).setOrigin(0);
    this.add.rectangle(stripLeft, anchorY(1, -26), stripW, 2, 0xd9a43a, 0.9).setOrigin(0);
    outlined(this, cx, anchorY(1, -12), 'Made for Qollab\'s "Quantum Unlocked" hackathon', {
      fontSize: '13px', color: '#fff6dc', strokeThickness: 3,
    }).setOrigin(0.5);

    makeButton(this, anchorX(1, -74), anchorY(0, 26), 132, 28, 'Fullscreen', () => toggleFullscreen(), { fontSize: '15px' });

    this.input.keyboard.on('keydown-ENTER', () => this.startGame());
    this.cameras.main.fadeIn(600, 0, 0, 0);
    Audio.playMusic('music_title');
    if (!Audio.unlocked()) this.buildGate(cx);

    // Re-lay out when the window changes shape.
    const onResize = () => this.scene.restart();
    this.game.events.on('view-resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off('view-resize', onResize));
  }

  // Browsers won't play sound until the player clicks or presses a key, so
  // on first load a gate asks for that click; the title music starts with it.
  buildGate(cx) {
    this.gate = this.add.container(0, 0).setDepth(1000);
    const dim = blocker(this, 0.5);
    const msg = outlined(this, cx, 300, TEXT.clickToBegin, {
      fontSize: '26px', fontStyle: 'bold', color: '#ffe58a',
    }).setOrigin(0.5);
    this.gate.add([dim, msg]);
    this.tweens.add({ targets: msg, alpha: 0.45, duration: 800, yoyo: true, repeat: -1 });
    const open = () => {
      if (!this.gate) return;
      const gate = this.gate;
      this.gate = null;
      this.gateClosedAt = this.time.now;
      dim.disableInteractive();
      this.tweens.add({ targets: gate, alpha: 0, duration: 350, onComplete: () => gate.destroy() });
    };
    dim.on('pointerdown', open);
    this.input.keyboard.once('keydown', open);
  }

  startGame() {
    // Ignore the key press or click that only dismissed the gate.
    if (this.gate || this.time.now - (this.gateClosedAt ?? -1e9) < 250) return;
    if (this.starting) return;
    this.starting = true;
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Game'));
  }
}
