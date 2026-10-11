// The 8x8 wall of pots, as a selection panel. It has two modes:
//
// - Plain (the two early guesses): just 64 identical pots. Hercules has no
//   system yet, so there are no numbers and no coin patterns.
// - Named (after every coin toss): the X/O row and column headers and the
//   pot numbers appear, the pot the coins named is highlighted, and only that
//   pot can be opened. This shows how the six coins pick a row and a column.
//
// open() resolves with the chosen pot index, or null if the player cancels
// (only allowed when `cancellable`).

import { FONTS, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { TEXT } from '../dialogue.js';
import { frame, text, meanderBand, makeButton, blocker, show } from './widgets.js';
import { pixelTextTexture } from './pixelText.js';
import { Audio } from '../audio.js';
import { FACES, patternFor } from '../coins.js';

const CELL = 42;
const LABEL_SHIFT = 18; // the grid moves right to make room for row headers

export class PotGrid {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(600);
    this.resolve = null;
    this.named = null;

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const pw = 520;
    const ph = 500;
    const gridLeft = cx - (CELL * 8) / 2;
    const gridTop = cy - ph / 2 + 84;

    this.container.add(blocker(scene));
    this.container.add(frame(scene, cx, cy, pw, ph));
    this.container.add(meanderBand(scene, cx, cy - ph / 2 + 12, pw - 40));
    this.title = scene.add.image(cx, cy - ph / 2 + 42, pixelTextTexture(scene, TEXT.potGrid.title, 24));
    this.container.add(this.title);

    // The board holds the pots and headers, and shifts sideways so it is
    // centred with or without the row headers.
    this.board = scene.add.container(0, 0);
    this.container.add(this.board);

    // Column (last three coins) and row (first three coins) headers.
    this.headers = [];
    for (let k = 0; k < 8; k++) {
      const b = [4, 2, 1].map((m) => FACES[(k & m) ? 1 : 0]).join('');
      const style = { fontFamily: FONTS.body, fontSize: '15px', fontStyle: 'bold', color: '#d9c38a' };
      this.headers.push(
        text(scene, gridLeft + k * CELL + CELL / 2, gridTop - 14, b, style).setOrigin(0.5),
        text(scene, gridLeft - 26, gridTop + k * CELL + CELL / 2, b, style).setOrigin(0.5),
      );
    }
    this.board.add(this.headers);

    this.cells = [];
    for (let i = 0; i < 64; i++) {
      const col = i % 8;
      const row = Math.floor(i / 8);
      const x = gridLeft + col * CELL + CELL / 2;
      const y = gridTop + row * CELL + CELL / 2;
      const bg = scene.add.rectangle(x, y, CELL - 4, CELL - 4, 0x4a3b2c).setStrokeStyle(1, 0x6b5236);
      const pot = scene.add.image(x, y - 2, 'pot', 0);
      const num = text(scene, x + CELL / 2 - 4, y + CELL / 2 - 3, String(i), {
        fontFamily: FONTS.body, fontSize: '12px', fontStyle: 'bold', color: '#fff6dc', stroke: '#1a120a', strokeThickness: 3,
      }).setOrigin(1, 1);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => this.hover(i));
      bg.on('pointerout', () => this.unhover(i));
      bg.on('pointerup', () => this.choose(i));
      this.board.add([bg, pot, num]);
      this.cells.push({ bg, pot, num });
    }

    this.info = text(scene, cx, gridTop + CELL * 8 + 16, '', {
      fontFamily: FONTS.body, fontSize: '17px', color: '#fff6dc', align: 'center',
      wordWrap: { width: pw - 64 }, lineSpacing: 4,
    }).setOrigin(0.5, 0);
    this.container.add(this.info);

    this.cancelBtn = makeButton(scene, cx, cy + ph / 2 - 30, 160, 32, TEXT.potGrid.cancel, () => this.close(null));
    this.container.add(this.cancelBtn);

    scene.input.keyboard.on('keydown-ESC', (e) => {
      if (!e?.oaHandled && this.isOpen() && this.cancellable) this.close(null);
    });

    show(this.container, false);
  }

  isOpen() {
    return this.container.visible;
  }

  // named: the pot index the coins chose (labelled mode), or null (plain).
  open({ broken, cancellable, named = null }) {
    if (this.isOpen()) return Promise.resolve(null);
    const T = TEXT.potGrid;
    this.broken = broken;
    this.cancellable = cancellable;
    this.named = named;
    const labelled = named !== null;
    this.cancelBtn.setVisible(cancellable);
    this.board.x = labelled ? LABEL_SHIFT : 0;
    this.headers.forEach((h) => h.setVisible(labelled));
    this.title.setTexture(pixelTextTexture(this.scene, labelled ? T.namedTitle : T.title, 24));
    for (let i = 0; i < 64; i++) {
      const c = this.cells[i];
      const isBroken = broken.has(i);
      const isNamed = i === named;
      const dim = isBroken || (labelled && !isNamed);
      c.pot.setFrame(isBroken ? 2 : 0).setAlpha(dim ? 0.45 : 1);
      c.bg.setFillStyle(isNamed ? 0x7a5f2a : isBroken ? 0x2a211a : 0x4a3b2c)
        .setStrokeStyle(isNamed ? 2 : 1, isNamed ? 0xe8b923 : 0x6b5236);
      c.bg.input.cursor = this.canChoose(i) ? 'pointer' : 'default';
      c.num.setVisible(labelled).setAlpha(dim ? 0.45 : 1);
    }
    this.info.setText(labelled ? T.named(named, patternFor(named)) : T.plainHint);
    show(this.container, true);
    return new Promise((resolve) => { this.resolve = resolve; });
  }

  canChoose(i) {
    if (this.named !== null) return i === this.named;
    return !this.broken.has(i);
  }

  hover(i) {
    if (!this.isOpen() || this.named !== null) return;
    if (this.broken.has(i)) {
      this.info.setText(TEXT.potGrid.brokenPlain);
      return;
    }
    this.cells[i].bg.setFillStyle(0x7a5f2a).setStrokeStyle(2, 0xe8b923);
    this.info.setText(TEXT.potGrid.plainHint);
  }

  unhover(i) {
    if (!this.isOpen() || this.named !== null || this.broken.has(i)) return;
    this.cells[i].bg.setFillStyle(0x4a3b2c).setStrokeStyle(1, 0x6b5236);
  }

  choose(i) {
    if (!this.isOpen() || !this.canChoose(i)) return;
    Audio.play('ui_click');
    this.close(i);
  }

  close(result) {
    if (!this.isOpen()) return;
    show(this.container, false);
    const resolve = this.resolve;
    this.resolve = null;
    if (resolve) resolve(result);
  }
}
