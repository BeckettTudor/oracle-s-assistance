// The world (hill, random marble ascent, floating temple) and the progression
// flow: Intro -> two forced attempts -> Oracle's lesson -> search (every
// blessing or coin toss costs an offering, and every offering costs a climb)
// -> ending. All quantum work goes through quantumAdapter.js.

import { GAME_WIDTH, GAME_HEIGHT, WORLD, FALL_RESPAWN_DISTANCE, DEBUG } from '../config.js';
import { VIEW } from '../viewport.js';
import { outlined, shadowed, frame, keycap } from '../ui/widgets.js';
import { PARALLAX } from '../assetManifest.js';
import { SPAWN, OFFERING_PILE, TEMPLE, CLIMB, generateClimb } from '../level.js';
import { DIALOGUE, TEXT } from '../dialogue.js';
import { PHASE, createRunState, advancePhase, stats, verdictFor } from '../gameState.js';
import * as quantum from '../quantumAdapter.js';
import { Player } from '../player.js';
import { Audio } from '../audio.js';

const CLIMB_PHASES = new Set([PHASE.ATTEMPT_1, PHASE.ATTEMPT_2, PHASE.ORACLE_INTRO, PHASE.MAIN_LOOP]);
const EVEN_AMPLITUDES = () => new Array(64).fill(1 / 8);
const newSeed = () => Math.floor(Math.random() * 0x7fffffff);
const GROUND_TURF = 6; // px from the ground tile's top to its walking surface

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.runId = (this.runId ?? 0) + 1;
    this.state = createRunState();
    this.cutscene = true;
    this.lastSealToastAt = -Infinity;

    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);

    this.buildBackground();
    this.buildHill();
    this.buildTemple();

    this.ledgeGroup = this.physics.add.staticGroup();
    this.moverGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    this.climbDecor = [];
    this.checkpointMarkers = [];

    this.player = new Player(this, SPAWN.x, SPAWN.y);
    this.carried = this.add.image(0, 0, 'offering').setDepth(21).setVisible(false);

    this.physics.add.collider(this.player, this.solids);
    this.physics.add.collider(this.player, this.ledgeGroup, (_p, ledge) => this.onLedge(ledge));
    // Remember which moving ledge Hercules is standing on, so update() can
    // carry him along with it like a passenger.
    this.physics.add.collider(this.player, this.moverGroup, (_p, mover) => {
      if (this.riding === mover) return;
      if (this.player.body.touching.down || this.player.body.blocked.down) {
        this.riding = mover;
        this.ridingLastX = mover.body.x;
      }
    });
    this.physics.add.collider(this.player, this.seal);

    this.buildClimb(newSeed());
    this.checkpoint = { x: SPAWN.x, y: SPAWN.y };

    const cam = this.cameras.main;
    this.layoutView();
    cam.startFollow(this.player, true, 1, 0.12);
    cam.setFollowOffset(0, 50);
    cam.centerOn(SPAWN.x, SPAWN.y - 50);

    // Follow the browser window: new zoom, new bounds, refit the backdrop.
    const onResize = () => this.layoutView();
    this.game.events.on('view-resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off('view-resize', onResize));

    this.zeus = this.add.sprite(SPAWN.x + 110, -200, 'zeus', 0).setDepth(15).setVisible(false);

    // The UI scene runs on top; start the story once it exists.
    this.scene.launch('UI');
    this.ui = this.scene.get('UI');
    this.ui.events.once(Phaser.Scenes.Events.CREATE, () => this.onUiReady());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());

    Audio.playMusic('music_hill');
    if (DEBUG) window.__oa = this;
  }

  onUiReady() {
    this.onDialogueLine = (l) => this.oracle.play(l.speaker === 'oracle' ? 'oracle_talk' : 'oracle_idle', true);
    this.onDialogueEnd = () => this.oracle.play('oracle_idle', true);
    this.ui.events.on('dialogue-line', this.onDialogueLine);
    this.ui.events.on('dialogue-end', this.onDialogueEnd);
    this.refreshHud();
    this.runIntro();
  }

  cleanup() {
    if (this.onDialogueLine) this.ui.events.off('dialogue-line', this.onDialogueLine);
    if (this.onDialogueEnd) this.ui.events.off('dialogue-end', this.onDialogueEnd);
    if (window.__oa === this) window.__oa = null;
  }

  // ---------------------------------------------------------------- world

  // Parallax layers. They tile horizontally so any window width is covered.
  buildBackground() {
    this.bg = {
      sky: this.add.tileSprite(0, 0, 64, 540, 'bg_sky').setOrigin(0).setDepth(-100),
      layers: [
        ['bg_clouds', PARALLAX.clouds, -90],
        ['bg_mountains', PARALLAX.mountains, -80],
        ['bg_near', PARALLAX.near, -70],
      ].map(([key, factor, depth]) => {
        const h = this.textures.get(key).source[0].height;
        const ts = this.add.tileSprite(0, 0, 64, h, key).setOrigin(0).setDepth(depth);
        ts.factor = factor;
        return ts;
      }),
    };
    // Clouds drift slowly.
    this.time.addEvent({ delay: 100, loop: true, callback: () => { this.bg.layers[0].tilePositionX += 0.5; } });
  }

  // Apply the current window shape: camera zoom and bounds, and backdrop size.
  layoutView() {
    const cam = this.cameras.main;
    cam.setZoom(VIEW.zoom);
    // If the window is wider than the world, widen the bounds equally on both
    // sides so the world stays centred and the backdrop fills the edges.
    const extra = Math.max(0, VIEW.width - WORLD.width);
    cam.setBounds(-extra / 2, 0, WORLD.width + extra, WORLD.height);

    const z = VIEW.zoom;
    const vw = Math.ceil(VIEW.width) + 2;
    const vh = Math.ceil(VIEW.height) + 2;
    const maxScroll = WORLD.height - VIEW.height;
    // A zoomed camera scales around its centre, which shifts anything with a
    // scroll factor below 1. Offset by (half view) x (zoom - 1) x (1 - factor).
    const place = (obj, sx, sy, x, y) => obj.setScrollFactor(sx, sy).setPosition(
      Math.round(x + (VIEW.width / 2) * (z - 1) * (1 - sx) - 1),
      Math.round(y + (VIEW.height / 2) * (z - 1) * (1 - sy)),
    );
    this.bg.sky.setSize(vw, vh).setTileScale(1, vh / 540);
    place(this.bg.sky, 0, 0, 0, 0);
    for (const layer of this.bg.layers) {
      layer.setSize(vw, layer.height);
      // Bottom-align each layer with the screen when the camera is on the hill.
      place(layer, 0, layer.factor, 0, VIEW.height - layer.height + maxScroll * layer.factor);
    }
  }

  buildHill() {
    this.solids = this.physics.add.staticGroup();
    // The ground art runs far past the world edges so wide windows never show
    // its end, and sits so its turf line is the walking surface. Collision is
    // a separate invisible box; the world bounds keep Hercules in play.
    this.add.tileSprite(-1600, WORLD.groundTop - GROUND_TURF, WORLD.width + 3200, 80, 'env_ground')
      .setOrigin(0).setDepth(0);
    const ground = this.add.rectangle(-1600, WORLD.groundTop, WORLD.width + 3200, WORLD.height - WORLD.groundTop)
      .setOrigin(0).setVisible(false);
    this.solids.add(ground);

    // Olive and cypress trees on the hill, behind the action.
    for (const [key, x] of [['tree_cypress', 30], ['tree_olive', 120], ['tree_cypress', 300], ['tree_olive', 680],
      ['tree_cypress', 780], ['tree_olive', 880]]) {
      this.add.image(x, WORLD.groundTop + 2, key).setOrigin(0.5, 1).setDepth(-5);
    }

    this.buildShrine();
  }

  // The offering shrine: a paved plaza, a marble altar heaped with offerings,
  // and a burning brazier on each side. A prompt shows what to do.
  buildShrine() {
    const { x, y } = OFFERING_PILE;
    this.add.tileSprite(x - 112, y - 4, 224, 16, 'env_plaza').setOrigin(0, 0).setDepth(1);
    const altar = this.add.image(x, y - 2, 'altar').setOrigin(0.5, 1).setDepth(2);
    this.pile = this.add.image(x, altar.y - altar.height + 2, 'offering_pile').setOrigin(0.5, 1).setDepth(3);
    for (const bx of [x - 92, x + 92]) {
      this.add.image(bx, y - 2, 'fx_glow').setDepth(1).setOrigin(0.5, 0.85).setAlpha(0.8).setBlendMode(Phaser.BlendModes.ADD);
      this.add.sprite(bx, y - 2, 'checkpoint', 1).setOrigin(0.5, 1).setDepth(2).play('torch_lit');
    }

    // "[E] Take an offering": shown when Hercules is at the altar.
    const promptY = this.pile.y - this.pile.height - 22;
    this.pilePrompt = this.add.container(x, promptY).setDepth(40).setVisible(false);
    const label = shadowed(this, 0, 0, TEXT.prompt.takeOffering, { fontSize: '17px', fontStyle: 'bold' }).setOrigin(0, 0.5);
    const key = keycap(this, 0, 0, 'E');
    const width = key.width + 8 + label.width + 28;
    const plate = frame(this, 0, 0, width, 32);
    key.x = -width / 2 + 14 + key.width / 2;
    label.x = key.x + key.width / 2 + 8;
    this.pilePrompt.add([plate, key, label]);
    this.pilePromptLabel = label;
    this.tweens.add({ targets: this.pilePrompt, y: promptY - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // A bouncing marker over the altar while Hercules has no offering.
    this.pileBeacon = this.add.image(x, promptY + 4, 'ui_arrow').setScale(2).setDepth(40).setVisible(false);
    this.tweens.add({ targets: this.pileBeacon, y: promptY + 12, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // Build a fresh random climb (called on every trip back to the hill).
  buildClimb(seed) {
    this.ledgeGroup.clear(true, true);
    this.moverGroup.clear(true, true);
    for (const o of this.climbDecor) o.destroy();
    this.climbDecor = [];
    this.checkpointMarkers = [];

    const pieces = generateClimb(seed);
    this.climb = { seed, pieces };
    const oneWay = (body) => {
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
    };

    for (const p of pieces) {
      if (p.type === 'hmove' || p.type === 'vmove') {
        const horizontal = p.type === 'hmove';
        const x = horizontal ? Phaser.Math.Between(p.xA, p.xB) : p.x;
        const y = horizontal ? p.y : Phaser.Math.Between(p.yTop, p.yBot);
        const ts = this.add.tileSprite(x, y, p.w, 16, 'env_ledge_moving').setOrigin(0).setDepth(0);
        this.moverGroup.add(ts);
        ts.body.setAllowGravity(false).setImmovable(true);
        ts.body.setFriction(0, 0); // carrying is done explicitly in carryRider()
        oneWay(ts.body);
        ts.piece = p;
        const dir = Math.random() < 0.5 ? 1 : -1;
        if (horizontal) ts.body.setVelocityX(dir * p.speed);
        else ts.body.setVelocityY(dir * p.speed);
        continue;
      }

      const key = p.type === 'crumble' ? 'env_ledge_crumble' : 'env_ledge';
      const ledge = this.add.tileSprite(p.x, p.y, p.w, 16, key).setOrigin(0).setDepth(0);
      this.ledgeGroup.add(ledge);
      oneWay(ledge.body);
      ledge.piece = p;
      ledge.homeX = p.x;
      // Bevelled end caps. Narrow blocks are made of two half caps only.
      ledge.caps = [];
      const l = this.add.image(p.x, p.y, `${key}_l`).setOrigin(0).setDepth(1);
      const r = this.add.image(p.x + p.w, p.y, `${key}_r`).setOrigin(1, 0).setDepth(1);
      if (p.w < l.width + r.width) {
        const half = Math.floor(p.w / 2);
        l.setCrop(0, 0, half, l.height);
        r.setCrop(r.width - (p.w - half), 0, p.w - half, r.height);
        ledge.setAlpha(0); // the caps cover it; the ledge still carries the body
        ledge.hiddenMiddle = true;
      }
      for (const c of [l, r]) { c.homeX = c.x; ledge.caps.push(c); this.climbDecor.push(c); }
      if (p.checkpoint) {
        // An unlit brazier; it bursts into flame when Hercules reaches it.
        const bx = p.x + p.w - 14;
        const glow = this.add.image(bx, p.y, 'fx_glow').setOrigin(0.5, 0.85).setDepth(4)
          .setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
        const m = this.add.sprite(bx, p.y, 'checkpoint', 0).setOrigin(0.5, 1).setDepth(5);
        m.glow = glow;
        ledge.marker = m;
        this.climbDecor.push(m, glow);
        this.checkpointMarkers.push(m);
      }
    }
  }

  buildTemple() {
    const T = TEMPLE;
    const wallH = T.floorTop - T.wallTop;

    // Interior wall (banners, torches, Apollo's sun), pediment, floating rock.
    this.add.image(T.interiorLeft, T.wallTop, 'env_temple_bg').setOrigin(0).setDepth(-20)
      .setDisplaySize(T.interiorRight - T.interiorLeft, wallH);
    this.add.image((T.floorLeft + T.wallRightX + T.wallWidth) / 2, T.ceilingY + 2, 'env_pediment').setOrigin(0.5, 1).setDepth(-15);
    this.add.image((T.floorLeft + T.floorRight) / 2, T.floorTop + T.floorThickness, 'env_temple_base').setOrigin(0.5, 0).setDepth(-15);

    // Solids: floor, ceiling (gold frieze) and two fluted columns as walls.
    const solid = (x, y, w, h, key) => {
      const t = this.add.tileSprite(x, y, w, h, key).setOrigin(0).setDepth(25);
      this.solids.add(t);
      return t;
    };
    solid(T.floorLeft, T.floorTop, T.floorRight - T.floorLeft, T.floorThickness, 'env_temple_floor');
    solid(T.floorLeft, T.ceilingY, T.wallRightX + T.wallWidth - T.floorLeft, T.wallTop - T.ceilingY, 'env_temple_wall');
    const column = (x, top, bottom, withBase) => {
      solid(x, top, T.wallWidth, bottom - top, 'env_column_shaft');
      this.add.image(x + T.wallWidth / 2, top, 'env_column_cap').setOrigin(0.5, 0).setDepth(26);
      if (withBase) this.add.image(x + T.wallWidth / 2, bottom, 'env_column_base').setOrigin(0.5, 1).setDepth(26);
    };
    column(T.wallLeftX, T.wallTop, T.floorTop, true);
    column(T.wallRightX, T.wallTop, T.doorTop, false);

    // Door seal: solid unless an offering is being presented.
    this.seal = this.add.image(T.wallRightX, T.doorTop, 'env_door_seal').setOrigin(0).setDepth(25)
      .setDisplaySize(T.wallWidth, T.floorTop - T.doorTop);
    this.physics.add.existing(this.seal, true);

    // The 64 pots stand on an eight-shelf rack against the back wall.
    const pw = T.potWall;
    const left = pw.cx - (pw.cell * 8) / 2;
    this.add.image(left - 12, pw.top - 6, 'env_shelves').setOrigin(0).setDepth(-10);
    this.pots = [];
    for (let i = 0; i < 64; i++) {
      const x = left + (i % 8) * pw.cell + pw.cell / 2;
      const shelfTop = pw.top + Math.floor(i / 8) * pw.cell + 26;
      const pot = this.add.sprite(x, shelfTop, 'pot', 0).setOrigin(0.5, 1).setDepth(5);
      this.pots.push(pot);
    }
    // Burning braziers flank the shelves.
    for (const bx of [left - 34, left + pw.cell * 8 + 34]) {
      this.add.image(bx, T.floorTop, 'fx_glow').setOrigin(0.5, 0.85).setDepth(6).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8);
      this.add.sprite(bx, T.floorTop, 'checkpoint', 1).setOrigin(0.5, 1).setDepth(7).play('torch_lit');
    }

    this.oracle = this.add.sprite(T.oracle.x, T.floorTop, 'oracle', 0).setOrigin(0.5, 1).setDepth(10);
    this.oracle.play('oracle_idle');

    this.bolt = this.add.image(0, 0, 'bolt').setDepth(30).setVisible(false);
  }

  // ---------------------------------------------------------------- loop

  update(time, delta) {
    this.updateMovers();
    this.carryRider();

    const uiBusy = this.ui?.sys?.isActive() ? this.ui.isModalOpen() : true;
    this.player.setControlsEnabled(!this.cutscene && !uiBusy);
    this.player.update(time, delta);

    this.carried.setVisible(this.state.carryingOffering);
    if (this.state.carryingOffering) this.carried.setPosition(this.player.x, this.player.y - 66);

    const interact = this.player.consumeInteract();
    const climbing = CLIMB_PHASES.has(this.state.phase) && !this.cutscene;
    this.updatePile(climbing, interact);
    if (!climbing) return;

    // Falling back down while carrying an offering returns you to the checkpoint.
    if (this.state.carryingOffering && this.player.y > this.checkpoint.y + FALL_RESPAWN_DISTANCE) {
      this.respawnAtCheckpoint();
      return;
    }

    if (this.inPorch()) {
      if (this.state.carryingOffering) {
        this.enterTemple();
      } else if (time - this.lastSealToastAt > 3000) {
        this.lastSealToastAt = time;
        this.ui.toast(TEXT.toast.needOffering);
      }
    }
  }

  // A horizontal ledge carries whoever stands on it, like a train car:
  // Hercules moves by however far the ledge moved, and his own running adds
  // on top. Physics steps at a fixed rate while update() runs every display
  // frame, so this follows the ledge's real displacement, not a time slice.
  carryRider() {
    const m = this.riding;
    if (!m) return;
    const body = this.player.body;
    const onTop = m.active
      && Math.abs(body.bottom - m.body.top) <= 3
      && body.right > m.body.left && body.left < m.body.right
      && body.velocity.y >= 0;
    if (!onTop) {
      this.riding = null;
      return;
    }
    const dx = m.body.x - this.ridingLastX;
    this.ridingLastX = m.body.x;
    if (m.piece.type === 'hmove' && dx) this.player.x += dx;
  }

  // Moving platforms patrol between their end points.
  updateMovers() {
    for (const m of this.moverGroup.getChildren()) {
      const p = m.piece;
      const b = m.body;
      if (p.type === 'hmove') {
        if (b.x <= p.xA && b.velocity.x <= 0) b.setVelocityX(p.speed);
        else if (b.x >= p.xB && b.velocity.x >= 0) b.setVelocityX(-p.speed);
      } else {
        if (b.y <= p.yTop && b.velocity.y <= 0) b.setVelocityY(p.speed);
        else if (b.y >= p.yBot && b.velocity.y >= 0) b.setVelocityY(-p.speed);
      }
    }
  }

  updatePile(climbing, interact) {
    const near = climbing
      && Math.abs(this.player.x - OFFERING_PILE.x) < 60
      && Math.abs(this.player.y - OFFERING_PILE.y) < 8;
    const carrying = this.state.carryingOffering;
    this.pilePrompt.setVisible(near && !carrying);
    this.pileBeacon.setVisible(climbing && !near && !carrying);
    if (near && interact) {
      if (this.state.carryingOffering) {
        this.ui.toast(TEXT.toast.alreadyCarrying);
        return;
      }
      this.state.carryingOffering = true;
      this.player.playInteract();
      Audio.play('offering_pickup');
      this.ui.toast(TEXT.toast.pickedUp);
      this.ui.setObjective(TEXT.objective.climb);
      this.refreshHud();
    }
  }

  inPorch() {
    const r = TEMPLE.porchTrigger;
    const { x, y, body } = this.player;
    const grounded = body.blocked.down || body.touching.down;
    return grounded && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  onLedge(ledge) {
    const p = ledge.piece;
    if (p.type === 'crumble') this.crumble(ledge);
    if (!p.checkpoint || !this.state.carryingOffering || this.cutscene) return;
    if (p.y >= this.checkpoint.y) return;
    this.checkpoint = { x: p.x + p.w / 2, y: p.y };
    this.lightBrazier(ledge.marker);
    Audio.play('checkpoint');
    this.ui.toast(TEXT.toast.checkpoint);
  }

  // A crumbling ledge shakes, gives way, then reforms a little later.
  crumble(ledge) {
    if (ledge.crumbling) return;
    ledge.crumbling = true;
    const parts = [ledge, ...ledge.caps];
    const shake = this.tweens.add({ targets: parts, x: '+=1.5', duration: 45, yoyo: true, repeat: -1 });
    this.time.delayedCall(CLIMB.crumbleDelayMs, () => {
      shake.stop();
      if (!ledge.scene) return; // the climb was rebuilt meanwhile
      for (const part of parts) part.x = part.homeX;
      ledge.body.enable = false;
      for (const part of parts) part.setAlpha(0.15);
      Audio.play('ledge_crumble');
      this.time.delayedCall(CLIMB.crumbleRespawnMs, () => {
        if (!ledge.scene) return;
        ledge.body.enable = true;
        for (const part of parts) part.setAlpha(part === ledge && ledge.hiddenMiddle ? 0 : 1);
        ledge.crumbling = false;
      });
    });
  }

  lightBrazier(m) {
    m.play('torch_lit');
    m.glow.setVisible(true).setAlpha(0).setScale(0.6);
    this.tweens.add({ targets: m.glow, alpha: 0.9, scale: 1, duration: 300, ease: 'Back.easeOut' });
    m.glowTween = this.tweens.add({ targets: m.glow, alpha: 0.6, duration: 260, yoyo: true, repeat: -1, delay: 300 });
    // A burst of sparks.
    for (let i = 0; i < 8; i++) {
      const s = this.add.rectangle(m.x, m.y - 26, 2, 2, i % 2 ? 0xffd447 : 0xff8c1e).setDepth(6);
      this.tweens.add({
        targets: s, x: m.x + (Math.random() - 0.5) * 40, y: m.y - 40 - Math.random() * 30, alpha: 0,
        duration: 500 + Math.random() * 300, onComplete: () => s.destroy(),
      });
    }
  }

  resetCheckpoints() {
    this.checkpoint = { x: SPAWN.x, y: SPAWN.y };
    for (const m of this.checkpointMarkers) {
      m.stop();
      m.setFrame(0);
      m.glowTween?.stop();
      m.glow.setVisible(false);
    }
  }

  async respawnAtCheckpoint() {
    this.cutscene = true;
    await this.fade(false, 200);
    this.placePlayer(this.checkpoint.x, this.checkpoint.y);
    await this.fade(true, 200);
    this.ui.toast(TEXT.toast.respawn);
    this.cutscene = false;
  }

  placePlayer(x, y) {
    this.player.setPosition(x, y);
    this.player.body.reset(x, y);
    this.player.setVelocity(0, 0);
    const cam = this.cameras.main;
    cam.startFollow(this.player, true, 1, 0.12);
    cam.setFollowOffset(0, 50);
    cam.centerOn(x, y - 50);
  }

  refreshHud() {
    if (!this.ui?.updateHud) return;
    this.ui.updateHud(this.state, { showOffering: this.state.phase !== PHASE.ENDING });
  }

  // ---------------------------------------------------------------- helpers

  wait(ms) {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  tween(config) {
    return new Promise((resolve) => this.tweens.add({ ...config, onComplete: resolve }));
  }

  fade(inward, ms = 400) {
    const cam = this.cameras.main;
    return new Promise((resolve) => {
      if (inward) cam.fadeIn(ms, 0, 0, 0);
      else cam.fadeOut(ms, 0, 0, 0);
      cam.once(inward ? Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE : Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => resolve());
    });
  }

  // Keep retrying an adapter call that must eventually succeed (no softlock).
  async withRetry(fn) {
    const run = this.runId;
    for (;;) {
      if (run !== this.runId) return undefined;
      try {
        return await fn();
      } catch (err) {
        console.warn('Quantum adapter call failed, retrying:', err);
        this.ui.toast(TEXT.toast.adapterError);
        await this.wait(1500);
      }
    }
  }

  // ---------------------------------------------------------------- story

  async runIntro() {
    this.cutscene = true;
    this.ui.setObjective('');
    await this.wait(500);

    const z = this.zeus;
    z.setVisible(true).setPosition(SPAWN.x + 120, SPAWN.y - 420).play('zeus_descend');
    await this.tween({ targets: z, y: SPAWN.y - 46, duration: 1800, ease: 'Sine.easeOut' });
    z.play('zeus_idle');
    const bob = this.tweens.add({ targets: z, y: z.y - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    await this.ui.say(DIALOGUE.intro);

    bob.stop();
    z.play('zeus_ascend');
    await this.tween({ targets: z, y: SPAWN.y - 600, alpha: 0, duration: 1400, ease: 'Sine.easeIn' });
    z.setVisible(false).setAlpha(1);

    advancePhase(this.state, PHASE.INTRO);
    this.beginClimb();
  }

  beginClimb() {
    this.ui.setObjective(TEXT.objective.getOffering);
    this.refreshHud();
    this.cutscene = false;
  }

  async enterTemple() {
    this.cutscene = true;
    this.state.carryingOffering = false;
    this.state.visits += 1;
    Audio.play('offering_consume');
    this.ui.toast(TEXT.toast.consumed);
    this.ui.setObjective('');
    this.refreshHud();

    // Open the door, walk in, close it behind.
    this.seal.body.enable = false;
    this.seal.setAlpha(0.25);
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.pan(GAME_WIDTH / 2, TEMPLE.viewY, 700, 'Sine.easeInOut');
    await this.player.walkTo(TEMPLE.standX);
    this.player.setFlipX(true);
    this.seal.body.enable = true;
    this.seal.setAlpha(1);
    Audio.playMusic('music_temple');

    const phase = this.state.phase;
    if (phase === PHASE.ATTEMPT_1) {
      await this.forcedAttempt(DIALOGUE.firstVisitEnter, DIALOGUE.firstVisitEmpty);
      advancePhase(this.state, PHASE.ATTEMPT_1);
      await this.returnToHill();
    } else if (phase === PHASE.ATTEMPT_2) {
      await this.forcedAttempt(DIALOGUE.secondVisitEnter, DIALOGUE.secondVisitEmpty);
      advancePhase(this.state, PHASE.ATTEMPT_2);
      await this.returnToHill();
    } else if (phase === PHASE.ORACLE_INTRO) {
      const run = this.runId;
      await this.oracleIntroduction();
      if (run !== this.runId) return;
      await this.searchVisit(true);
    } else if (phase === PHASE.MAIN_LOOP) {
      await this.searchVisit(false);
    }
  }

  async forcedAttempt(enterLines, emptyLines) {
    await this.ui.say(enterLines);
    this.ui.setObjective(TEXT.objective.choosePot);
    // No target exists yet, so whichever pot is chosen is guaranteed empty.
    const index = await this.ui.pickPot(this.state.brokenPots, false);
    this.ui.setObjective('');
    this.state.forcedPots.push(index);
    this.state.brokenPots.add(index);
    this.refreshHud();
    await this.breakPot(index, false);
    await this.ui.say(emptyLines);
  }

  async returnToHill() {
    await this.fade(false, 450);
    this.buildClimb(newSeed()); // a new path every trip
    this.resetCheckpoints();
    this.player.setFlipX(false);
    this.placePlayer(SPAWN.x, SPAWN.y);
    Audio.playMusic('music_hill');
    await this.fade(true, 450);
    this.beginClimb();
  }

  async oracleIntroduction() {
    await this.ui.say(DIALOGUE.oracleIntro);
    await this.ui.openTutorial(true);
    this.state.tutorialUnlocked = true;
    this.ui.unlockExplain();
    await this.ui.say(DIALOGUE.oracleAfterTutorial);

    // Deferred target generation: exactly once, excluding the two forced pots.
    this.state.busy = true;
    this.ui.setConsulting(true);
    const run = this.runId;
    if (!this.state.targetGenerated) {
      const target = await this.withRetry(() => quantum.generateTarget(this.state.forcedPots.slice()));
      if (run !== this.runId) return;
      this.state.target = target;
      this.state.targetGenerated = true;
    }
    await this.withRetry(() => quantum.resetGrover());
    if (run !== this.runId) return;
    this.ui.setConsulting(false);
    this.state.busy = false;

    advancePhase(this.state, PHASE.ORACLE_INTRO);
    this.refreshHud();
  }

  // What the Oracle's altar shows: the shape of fate, never which pot is which.
  oracleView() {
    const s = this.state;
    return {
      amplitudes: s.amplitudes ?? EVEN_AMPLITUDES(),
      run: s.groverRun,
      odds: s.probabilities ? s.probabilities[s.target] : 1 / 64,
      order: s.barOrder,
    };
  }

  // One offering = one choice at the altar, then back down the hill.
  async searchVisit(firstVisit) {
    if (!firstVisit) {
      const greetings = DIALOGUE.oracleGreetings;
      await this.ui.say(greetings[Math.floor(Math.random() * greetings.length)]);
    }
    const run = this.runId;
    const choice = await this.ui.oraclePanel.choose(this.oracleView());
    if (choice === 'ask') {
      await this.bless();
    } else if (await this.tossCoins()) {
      return; // the bolt was found
    }
    if (run !== this.runId) return; // the run was restarted meanwhile
    await this.returnToHill();
  }

  async bless() {
    const s = this.state;
    s.busy = true;
    this.oracle.play('oracle_talk', true);
    this.ui.oraclePanel.setConsulting(true);
    Audio.play('oracle_query');
    const run = this.runId;
    const r = await this.withRetry(() => quantum.runGroverIteration());
    if (run !== this.runId) return;
    const amplitudes = r.amplitudes ?? r.probabilities.map(Math.sqrt);
    s.groverTotal += 1;
    s.groverRun = r.iteration;
    s.amplitudes = amplitudes;
    s.probabilities = r.probabilities;
    s.busy = false;
    this.refreshHud();
    await this.ui.oraclePanel.showBlessing({
      oracleAmplitudes: r.oracleAmplitudes,
      amplitudes,
      run: r.iteration,
      odds: r.probabilities[s.target],
    });
    this.oracle.play('oracle_idle', true);
  }

  // Toss the coins (a measurement) and open the pot they name.
  // Returns true if the bolt was found.
  async tossCoins() {
    const s = this.state;
    s.busy = true;
    this.ui.setConsulting(true);
    const run = this.runId;
    const outcome = await this.withRetry(() => quantum.measure());
    if (run !== this.runId) return true;
    this.ui.setConsulting(false);
    await this.ui.coinToss.play(outcome);
    // The labelled wall shows which row and column the coins picked.
    await this.ui.pickPot(s.brokenPots, false, outcome);

    s.mainPots += 1;
    const alreadyBroken = s.brokenPots.has(outcome);
    s.brokenPots.add(outcome);
    this.refreshHud();

    if (outcome === s.target) {
      await this.runEnding(outcome);
      return true;
    }

    const hadRun = s.groverRun > 0;
    if (alreadyBroken) {
      const pot = this.pots[outcome];
      await this.tween({ targets: pot, y: pot.y - 4, duration: 80, yoyo: true, repeat: 1 });
      await this.ui.say(DIALOGUE.tossFoundBrokenPot(outcome));
    } else {
      await this.breakPot(outcome, false);
    }

    // The coins have fallen: the superposition is gone.
    this.ui.setConsulting(true);
    await this.withRetry(() => quantum.resetGrover());
    if (run !== this.runId) return true;
    this.ui.setConsulting(false);
    s.groverRun = 0;
    s.amplitudes = null;
    s.probabilities = null;
    if (hadRun && !s.collapseExplained) {
      s.collapseExplained = true;
      await this.ui.say(DIALOGUE.collapseExplained);
    } else if (!alreadyBroken) {
      await this.ui.say(DIALOGUE.collapseShort);
    }
    s.busy = false;
    return false;
  }

  async breakPot(index, hasBolt) {
    const pot = this.pots[index];
    const x0 = pot.x;
    await this.tween({ targets: pot, x: x0 + 2, duration: 40, yoyo: true, repeat: 3 });
    pot.x = x0;
    pot.setFrame(1);
    Audio.play('pot_break');
    await this.wait(140);
    pot.setFrame(2);
    if (hasBolt) return;
    const label = outlined(this, pot.x, pot.y - 32, TEXT.toast.empty, {
      fontSize: '18px', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(40);
    await this.tween({ targets: label, y: label.y - 22, alpha: 0, duration: 1100, ease: 'Sine.easeOut' });
    label.destroy();
  }

  async runEnding(index) {
    advancePhase(this.state, PHASE.MAIN_LOOP);
    this.cutscene = true;
    this.ui.setObjective('');
    this.refreshHud();

    // Reveal the bolt. The temple music fades so the fanfare stands alone.
    Audio.stopMusic();
    await this.breakPot(index, true);
    const pot = this.pots[index];
    Audio.play('bolt_reveal');
    const glow = this.add.image(pot.x, pot.y - 12, 'fx_glow').setDepth(29).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5).setAlpha(0);
    this.bolt.setPosition(pot.x, pot.y - 12).setScale(0.5).setAlpha(0).setVisible(true);
    this.cameras.main.flash(300, 255, 240, 160);
    const riseTo = TEMPLE.wallTop + 36; // above the shelves, clear of the dialogue
    this.tweens.add({ targets: glow, y: riseTo, alpha: 1, scale: 2, duration: 900, ease: 'Back.easeOut' });
    this.time.delayedCall(450, () => Audio.play('success'));
    await this.tween({ targets: this.bolt, y: riseTo, scale: 1, alpha: 1, duration: 900, ease: 'Back.easeOut' });
    this.tweens.add({ targets: glow, alpha: 0.6, duration: 300, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.bolt, angle: { from: -6, to: 6 }, duration: 260, yoyo: true, repeat: -1 });
    this.ui.toast(TEXT.toast.found, '#ffe14d');
    await this.ui.say(DIALOGUE.boltFound);

    // Zeus descends into the temple.
    const z = this.zeus;
    z.setVisible(true).setAlpha(1).setPosition(560, TEMPLE.wallTop - 120).play('zeus_descend');
    this.cameras.main.shake(250, 0.004);
    await this.tween({ targets: z, y: TEMPLE.floorTop - 60, duration: 1500, ease: 'Sine.easeOut' });
    z.play('zeus_idle');
    Audio.playMusic('music_title');
    await this.ui.say(DIALOGUE.zeusArrives);

    const s = stats(this.state);
    const verdict = verdictFor(s.mainActions);
    await this.ui.say(DIALOGUE.oracleSummary(s));
    await this.ui.say(DIALOGUE.zeusVerdict[verdict]);

    advancePhase(this.state, PHASE.ENDING);
    await this.fade(false, 600);
    this.scene.stop('UI');
    this.scene.start('Results', { stats: s, verdict });
  }
}
