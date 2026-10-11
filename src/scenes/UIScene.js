// Screen-space UI that runs on top of the GameScene: HUD, objective line,
// toasts, dialogue, pot grid, the Oracle's altar, coin toss and the lesson.
// GameScene drives it through the methods below; the UI holds no game rules.
// Corner elements are anchored to the window edges; modals stay centred.

import { GAME_WIDTH } from '../config.js';
import { TEXT } from '../dialogue.js';
import { stats } from '../gameState.js';
import { fitCamera, anchorX, anchorY } from '../viewport.js';
import { frame, text, outlined, shadowed, makeButton, show } from '../ui/widgets.js';
import { DialogueBox } from '../ui/DialogueBox.js';
import { PotGrid } from '../ui/PotGrid.js';
import { OraclePanel } from '../ui/OraclePanel.js';
import { CoinToss } from '../ui/CoinToss.js';
import { Tutorial } from '../ui/Tutorial.js';
import { GroverGuide } from '../ui/GroverGuide.js';
import { Audio } from '../audio.js';
import { OptionsMenu } from '../ui/OptionsMenu.js';

const HUD_W = 212;
const ROW = 22;

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    fitCamera(this);

    // Esc opens Options at any time, except when it is about to close a menu
    // that Esc already closes (registered first, so it sees that menu open).
    // This handler is registered first, so it sees every press before the
    // menus' own handlers; it marks the event when it has used it.
    this.input.keyboard.on('keydown-ESC', (e) => {
      if (this.guide.isOpen()) {
        this.guide.close();
        e.oaHandled = true;
      } else if (this.options.isOpen()) {
        this.options.close();
        e.oaHandled = true;
      } else if (!this.escClosesSomething()) {
        this.openOptions();
      }
    });

    this.buildHud();

    this.objective = outlined(this, GAME_WIDTH / 2, 0, '', {
      fontSize: '19px', fontStyle: 'bold', align: 'center', wordWrap: { width: 480 },
    }).setOrigin(0.5, 0).setDepth(100);

    this.explainBtn = makeButton(this, 0, 0, 196, 30, TEXT.hud.explain, () => this.openTutorial(false), { fontSize: '15px' });
    this.explainBtn.setDepth(150);
    show(this.explainBtn, false);
    this.optionsBtn = makeButton(this, 0, 0, 110, 30, TEXT.options.button, () => this.openOptions(), { fontSize: '15px' });
    this.optionsBtn.setDepth(950); // above dialogue and panels: always reachable

    this.consulting = outlined(this, GAME_WIDTH / 2, 210, '', {
      fontSize: '24px', fontStyle: 'bold', color: '#ffd56a',
    }).setOrigin(0.5).setDepth(450).setVisible(false);

    this.toasts = [];

    this.dialogue = new DialogueBox(this);
    this.potGrid = new PotGrid(this);
    this.oraclePanel = new OraclePanel(this);
    this.coinToss = new CoinToss(this);
    this.tutorial = new Tutorial(this);
    this.options = new OptionsMenu(this, {
      onResume: () => this.scene.resume('Game'),
      onRestart: () => this.restartRun(),
      onMainMenu: () => this.toMainMenu(),
      onLearn: () => this.guide.open(0),
    });
    this.guide = new GroverGuide(this);

    this.layout();
    // Every scene has now started cleanly, so later errors are left to the
    // console rather than the startup error screen (see index.html).
    window.__gameRunning = true;
    const onResize = () => { fitCamera(this); this.layout(); };
    this.game.events.on('view-resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off('view-resize', onResize));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => Audio.duck(false));
  }

  // Pin corner elements to the window edges.
  layout() {
    this.hud.setPosition(Math.round(anchorX(0, 14)), Math.round(anchorY(0, 13)));
    this.optionsBtn.setPosition(Math.round(anchorX(1, -69)), Math.round(anchorY(0, 28)));
    this.explainBtn.setPosition(Math.round(anchorX(1, -240)), Math.round(anchorY(0, 28)));
    this.objective.setY(Math.round(anchorY(0, 14)));
    this.dialogue.layout();
    this.layoutToasts();
  }

  update(time, delta) {
    this.dialogue.update(time, delta);
    Audio.duck(this.oraclePanel.isOpen() || this.coinToss.isOpen() || this.tutorial.isOpen() || this.guide.isOpen());
    if (this.consulting.visible) {
      const dots = '.'.repeat(1 + (Math.floor(time / 350) % 3));
      this.consulting.setText(TEXT.oracle.consulting + dots);
    }
  }

  // ---------- HUD ----------
  buildHud() {
    this.hud = this.add.container(0, 0).setDepth(100);
    this.hudBg = frame(this, 0, 0, HUD_W, 108).setOrigin(0);
    this.hud.add(this.hudBg);
    const row = (iconKey, frameIndex) => {
      const icon = this.add.image(26, 0, iconKey, frameIndex);
      const label = shadowed(this, 44, 0, '', { fontSize: '16px' }).setOrigin(0, 0.5);
      this.hud.add([icon, label]);
      return { icon, label };
    };
    this.hudRows = {
      offering: row('offering'),
      actions: row('offering'),
      pots: row('pot', 0),
      grover: row('ui_sun_coin'),
    };
    this.hudRows.pots.icon.setOrigin(0.5, 0.6);
  }

  updateHud(state, { showOffering }) {
    const s = stats(state);
    const r = this.hudRows;
    r.offering.label.setText(state.carryingOffering ? TEXT.hud.offeringYes : TEXT.hud.offeringNo);
    r.offering.label.setColor(state.carryingOffering ? '#c6ee8a' : '#fff3d6');
    r.offering.icon.setAlpha(state.carryingOffering ? 1 : 0.35);
    r.actions.label.setText(`${TEXT.hud.actions}: ${s.totalActions}`);
    r.pots.label.setText(`${TEXT.hud.pots}: ${s.potsTotal}`);
    r.grover.label.setText(`${TEXT.hud.grover}: ${s.groverIterations}`);
    const order = showOffering ? ['offering', 'actions', 'pots', 'grover'] : ['actions', 'pots', 'grover'];
    for (const key of Object.keys(r)) {
      const visible = order.includes(key);
      r[key].icon.setVisible(visible);
      r[key].label.setVisible(visible);
    }
    order.forEach((key, i) => {
      const y = 22 + i * ROW;
      r[key].icon.setY(y);
      r[key].label.setY(y);
    });
    // Grow the panel to fit the longest visible line, in steps of 8 so it
    // doesn't twitch every time a counter changes.
    const widest = Math.max(...order.map((key) => r[key].label.width));
    const w = Math.max(HUD_W, Math.ceil((44 + widest + 18) / 8) * 8);
    this.hudBg.resizeFrame(w, 22 + order.length * ROW);
  }

  setObjective(str) {
    this.objective.setText(str ?? '');
  }

  unlockExplain() {
    show(this.explainBtn, true);
  }

  setConsulting(on) {
    this.consulting.setVisible(on);
  }

  toast(message, color = '#fff3d6') {
    const c = this.add.container(GAME_WIDTH / 2, 0).setDepth(450);
    // Toasts sit beside the HUD, so wrap them narrow enough to stay clear of it.
    const hudRight = this.hud.x + this.hudBg.width + 12;
    const wrap = Math.min(540, 2 * (GAME_WIDTH / 2 - hudRight) - 40);
    const t = shadowed(this, 0, 0, message, {
      fontSize: '17px', color, align: 'center', wordWrap: { width: wrap }, lineSpacing: 4,
    }).setOrigin(0.5);
    const bg = frame(this, 0, 0, Math.ceil(t.width) + 40, Math.ceil(t.height) + 22);
    c.add([bg, t]);
    c.h = Math.ceil(t.height) + 22;
    this.toasts.push(c);
    this.layoutToasts();
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 120 });
    this.tweens.add({
      targets: c,
      alpha: 0,
      delay: 2400,
      duration: 400,
      onComplete: () => {
        this.toasts = this.toasts.filter((x) => x !== c);
        c.destroy();
        this.layoutToasts();
      },
    });
  }

  layoutToasts() {
    let y = anchorY(0, 62);
    for (const c of this.toasts) {
      c.setY(Math.round(y + c.h / 2));
      y += c.h + 6;
    }
  }

  // ---------- Options ----------
  escClosesSomething() {
    return (this.potGrid.isOpen() && this.potGrid.cancellable)
      || (this.tutorial.isOpen() && !this.tutorial.firstTime);
  }

  openOptions() {
    if (this.options.isOpen()) return;
    this.scene.pause('Game');
    this.options.open();
  }

  // Start the whole run again: the Game scene restarts and relaunches this UI.
  restartRun() {
    this.scene.resume('Game');
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.get('Game').scene.restart();
    });
  }

  toMainMenu() {
    this.scene.resume('Game');
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.stop('Game');
      this.scene.start('Title');
    });
  }

  // ---------- Modal helpers ----------
  say(lines) {
    return this.dialogue.play(lines);
  }

  // The HUD is hidden while the grid is open: the panel is wider than the
  // gap the HUD leaves at the 960x540 layout.
  // named: the pot the coins chose (shows the labelled grid), or null.
  pickPot(broken, cancellable, named = null) {
    if (this.potGrid.isOpen()) return Promise.resolve(null);
    this.hud.setVisible(false);
    return this.potGrid.open({ broken, cancellable, named }).then((result) => {
      this.hud.setVisible(true);
      return result;
    });
  }

  openTutorial(firstTime) {
    if (this.isModalOpen()) return Promise.resolve();
    return this.tutorial.open({ firstTime });
  }

  isModalOpen() {
    return this.dialogue.isOpen() || this.potGrid.isOpen() || this.tutorial.isOpen()
      || this.oraclePanel.isOpen() || this.coinToss.isOpen() || this.options?.isOpen() || this.guide?.isOpen();
  }
}
