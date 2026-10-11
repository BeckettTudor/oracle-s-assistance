// Options menu, available at any point in a run (button or Esc): resume,
// read how the quantum side works, switch music and sounds on or off,
// toggle fullscreen, restart the run, or return to the title. Destructive
// choices ask for confirmation first. The game is paused while it is open.

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { TEXT } from '../dialogue.js';
import { toggleFullscreen } from '../viewport.js';
import { Audio } from '../audio.js';
import { frame, shadowed, pixelTitle, meanderBand, divider, makeButton, blocker, show } from './widgets.js';

const PW = 360;
const PH = 404;
const CX = GAME_WIDTH / 2;
const CY = GAME_HEIGHT / 2;
const TOP = CY - PH / 2;

export class OptionsMenu {
  constructor(scene, { onResume, onRestart, onMainMenu, onLearn }) {
    this.scene = scene;
    this.handlers = { onResume, onRestart, onMainMenu, onLearn };
    this.container = scene.add.container(0, 0).setDepth(900);

    this.container.add(blocker(scene, 0.6));
    this.container.add(frame(scene, CX, CY, PW, PH));
    this.container.add(meanderBand(scene, CX, TOP + 12, PW - 40));
    this.container.add(pixelTitle(scene, CX, TOP + 44, TEXT.options.title, 28));
    this.container.add(divider(scene, CX, TOP + 66));

    // Main page.
    this.main = scene.add.container(0, 0);
    const T = TEXT.options;
    const rowY = (i) => TOP + 102 + i * 46;
    const buttons = [
      [T.resume, () => this.close()],
      [T.learn, () => this.handlers.onLearn()],
      null, // music and sounds share a row
      [T.fullscreen, () => toggleFullscreen()],
      [T.restart, () => this.confirm('restart')],
      [T.menu, () => this.confirm('menu')],
    ];
    buttons.forEach((b, i) => {
      if (b) this.main.add(makeButton(scene, CX, rowY(i), 240, 36, b[0], b[1], { fontSize: '18px' }));
    });
    this.musicBtn = makeButton(scene, CX - 61, rowY(2), 118, 36, T.music(Audio.musicOn()), () => {
      Audio.setMusicOn(!Audio.musicOn());
      this.musicBtn.setLabel(T.music(Audio.musicOn()));
    }, { fontSize: '16px' });
    this.soundBtn = makeButton(scene, CX + 61, rowY(2), 118, 36, T.sound(Audio.sfxOn()), () => {
      Audio.setSfxOn(!Audio.sfxOn());
      this.soundBtn.setLabel(T.sound(Audio.sfxOn()));
    }, { fontSize: '16px' });
    this.main.add([this.musicBtn, this.soundBtn]);
    this.main.add(shadowed(scene, CX, TOP + PH - 26, T.hint, { fontSize: '14px', color: '#c9d2f2' }).setOrigin(0.5));

    // Confirmation page.
    this.ask = scene.add.container(0, 0);
    this.question = shadowed(scene, CX, TOP + 120, '', {
      fontSize: '18px', color: '#fff6dc', align: 'center', wordWrap: { width: PW - 60 },
    }).setOrigin(0.5, 0);
    this.yesBtn = makeButton(scene, CX, TOP + 250, 240, 38, '', () => this.accept(), { fontSize: '18px' });
    this.noBtn = makeButton(scene, CX, TOP + 300, 240, 38, T.cancel, () => this.showPage('main'), { fontSize: '18px' });
    this.ask.add([this.question, this.yesBtn, this.noBtn]);

    this.container.add([this.main, this.ask]);
    show(this.container, false);
  }

  isOpen() {
    return this.container.visible;
  }

  open() {
    if (this.isOpen()) return;
    this.pending = null;
    show(this.container, true);
    this.showPage('main');
  }

  showPage(page) {
    this.main.setVisible(page === 'main');
    this.ask.setVisible(page === 'ask');
    show(this.container, true);
  }

  confirm(action) {
    const T = TEXT.options;
    this.pending = action;
    this.question.setText(action === 'restart' ? T.confirmRestart : T.confirmMenu);
    this.yesBtn.setLabel(action === 'restart' ? T.yesRestart : T.yesMenu);
    this.showPage('ask');
  }

  accept() {
    const action = this.pending;
    show(this.container, false);
    if (action === 'restart') this.handlers.onRestart();
    else if (action === 'menu') this.handlers.onMainMenu();
  }

  close() {
    if (!this.isOpen()) return;
    show(this.container, false);
    this.handlers.onResume();
  }
}
