// Dialogue window in the style of Apollo's temple: a marble rim around a
// lapis field, a gold Greek-key band, gold-framed portrait and nameplate.
// play(lines) returns a Promise that resolves after the last line.
// Advance with mouse click (or Enter). A click while text is still typing
// reveals the whole line first.

import { SPEAKERS, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { Audio } from '../audio.js';
import { VIEW } from '../viewport.js';
import { frame, text, shadowed, meanderBand, show, blocker } from './widgets.js';
import { pixelTextTexture } from './pixelText.js';

const W = 900;
const H = 176;
const CHARS_PER_SECOND = 70;

export class DialogueBox {
  constructor(scene) {
    this.scene = scene;
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT - H / 2 - 8;
    const left = x - W / 2;
    const top = y - H / 2;

    this.container = scene.add.container(0, 0).setDepth(500);

    // Invisible click-catcher covering the whole window so any click advances.
    this.catcher = blocker(scene, 0.001);
    this.catcher.input.cursor = 'pointer';
    this.catcher.on('pointerdown', () => this.advance());

    const bg = frame(scene, x, y, W, H, 'ui_dialog');
    const band = meanderBand(scene, x, top + 16, W - 48);

    // Portrait on the left, text in a generous column beside it.
    this.portraitFrame = frame(scene, left + 82, y + 10, 108, 108, 'ui_frame');
    this.portrait = scene.add.image(left + 82, y + 10, 'portrait_hercules');

    this.namePlate = frame(scene, left + 214, top + 2, 130, 34, 'ui_plaque');
    // Speaker name in pixel-art Cinzel lettering.
    this.name = scene.add.image(left + 214, top + 6, pixelTextTexture(scene, ' ', 16, 'marble'));

    const textLeft = left + 164;
    this.body = shadowed(scene, textLeft, top + 44, '', {
      fontSize: '20px', color: '#fff3dc',
      wordWrap: { width: left + W - 64 - textLeft, useAdvancedWrap: true }, lineSpacing: 10,
    });
    this.hint = scene.add.image(left + W - 40, top + H - 26, 'ui_arrow');
    scene.tweens.add({ targets: this.hint, y: this.hint.y + 3, duration: 400, yoyo: true, repeat: -1, ease: 'Stepped', easeParams: [3] });

    this.container.add([this.catcher, bg, band, this.portraitFrame, this.portrait, this.namePlate, this.name, this.body, this.hint]);
    this.layout();

    this.lines = [];
    this.index = 0;
    this.fullText = '';
    this.shown = 0;
    this.typing = false;
    this.resolve = null;
    this.lastAdvanceAt = 0;

    scene.input.keyboard.on('keydown-ENTER', () => { if (this.isOpen()) this.advance(); });
    show(this.container, false);
  }

  // Keep the window pinned to the bottom of the screen at any aspect ratio.
  layout() {
    this.container.y = Math.round(VIEW.top + VIEW.height - GAME_HEIGHT);
    this.catcher.y = -GAME_HEIGHT * 2 - this.container.y;
  }

  isOpen() {
    return this.container.visible;
  }

  play(lines) {
    // If something is already playing, chain after it rather than clobbering.
    const run = () => new Promise((resolve) => {
      this.lines = lines;
      this.index = 0;
      this.resolve = resolve;
      show(this.container, true);
      this.showLine();
    });
    this.queue = (this.queue ?? Promise.resolve()).then(run);
    return this.queue;
  }

  showLine() {
    const l = this.lines[this.index];
    const speaker = SPEAKERS[l.speaker] ?? { name: l.speaker, portrait: null };
    this.name.setTexture(pixelTextTexture(this.scene, speaker.name.toUpperCase(), 16, 'marble'));
    this.namePlate.resizeFrame(Math.max(120, this.name.width + 40), 34);
    const hasPortrait = !!speaker.portrait;
    if (hasPortrait) this.portrait.setTexture(speaker.portrait);
    this.portrait.setVisible(hasPortrait);
    this.portraitFrame.setVisible(hasPortrait);
    // Wrap the whole line up front so words don't jump lines while typing.
    this.fullText = this.body.getWrappedText(l.text).join('\n');
    this.shown = 0;
    this.typing = true;
    this.body.setText('');
    this.hint.setVisible(false);
    this.scene.events.emit('dialogue-line', l);
  }

  update(time, delta) {
    if (!this.typing) return;
    this.shown = Math.min(this.fullText.length, this.shown + (CHARS_PER_SECOND * delta) / 1000);
    this.body.setText(this.fullText.slice(0, Math.floor(this.shown)));
    if (this.shown >= this.fullText.length) this.finishTyping();
  }

  finishTyping() {
    this.typing = false;
    this.body.setText(this.fullText);
    this.hint.setVisible(true);
  }

  advance() {
    if (!this.isOpen()) return;
    // Debounce so one physical click can't skip two lines.
    const now = this.scene.time.now;
    if (now - this.lastAdvanceAt < 120) return;
    this.lastAdvanceAt = now;

    if (this.typing) {
      this.finishTyping();
      return;
    }
    Audio.play('dialogue_advance');
    this.index += 1;
    if (this.index < this.lines.length) {
      this.showLine();
      return;
    }
    show(this.container, false);
    const resolve = this.resolve;
    this.resolve = null;
    this.scene.events.emit('dialogue-end');
    if (resolve) resolve();
  }
}
