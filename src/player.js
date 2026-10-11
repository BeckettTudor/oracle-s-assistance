// Hercules: platformer controller with acceleration, coyote time, jump
// buffering and variable jump height. Tuning lives in config.MOVE.

import { MOVE } from './config.js';
import { Audio } from './audio.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'hercules', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.body.setSize(20, 44);
    this.body.setOffset(14, 16);
    this.body.setMaxVelocityY(MOVE.maxFallSpeed);
    this.setCollideWorldBounds(true);
    this.setDepth(20);

    const kb = scene.input.keyboard;
    this.keys = kb.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      leftArrow: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      rightArrow: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
      jumpW: Phaser.Input.Keyboard.KeyCodes.W,
      jumpUp: Phaser.Input.Keyboard.KeyCodes.UP,
      interact: Phaser.Input.Keyboard.KeyCodes.E,
    });

    this.controlsEnabled = false;
    this.inputBlockedUntil = 0;
    this.lastGroundedAt = -Infinity;
    this.jumpPressedAt = -Infinity;
    this.jumping = false;
    this.jumpStartedAt = -Infinity;
    this.wasJumpDown = false;
    this.autoWalkTarget = null;
    this.autoWalkResolve = null;
    this.interactUntil = 0;
    this.interactQueued = false;

    // Key events (not just per-frame polling) so even a very short tap
    // that starts and ends within one frame is never lost.
    const onJump = () => { if (this.inputActive()) this.jumpPressedAt = scene.time.now; };
    kb.on('keydown-SPACE', onJump);
    kb.on('keydown-W', onJump);
    kb.on('keydown-UP', onJump);
    kb.on('keydown-E', () => { this.interactQueued = true; });

    this.play('herc_idle');
  }

  setControlsEnabled(enabled) {
    if (enabled && !this.controlsEnabled) {
      this.inputBlockedUntil = this.scene.time.now + MOVE.inputGraceMs;
      this.jumpPressedAt = -Infinity;
    }
    this.controlsEnabled = enabled;
  }

  // Walk to an x position without player input. Resolves on arrival.
  walkTo(x) {
    this.autoWalkTarget = x;
    return new Promise((resolve) => {
      this.autoWalkResolve = resolve;
    });
  }

  playInteract() {
    this.interactUntil = this.scene.time.now + 250;
    this.play('herc_interact', true);
  }

  isDown(...names) {
    return names.some((n) => this.keys[n].isDown);
  }

  // True once per press of E while controls are enabled.
  // Always reads (and clears) the key's just-down flag so a stale press
  // can never fire later.
  consumeInteract() {
    const pressed = this.interactQueued;
    this.interactQueued = false;
    return pressed && this.inputActive();
  }

  inputActive() {
    return this.controlsEnabled && this.scene.time.now >= this.inputBlockedUntil;
  }

  update(time, delta) {
    const dt = delta / 1000;
    const body = this.body;
    const onGround = body.blocked.down || body.touching.down;
    if (onGround) {
      this.lastGroundedAt = time;
      // A jump is over once we're grounded again after takeoff. (Checking the
      // time, not the velocity, so it also works on a rising platform.)
      if (time - this.jumpStartedAt > 80) this.jumping = false;
    }

    let dir = 0;
    const active = this.inputActive();
    if (this.autoWalkTarget !== null) {
      const dx = this.autoWalkTarget - this.x;
      if (Math.abs(dx) < 4) {
        this.autoWalkTarget = null;
        body.setVelocityX(0);
        const resolve = this.autoWalkResolve;
        this.autoWalkResolve = null;
        if (resolve) resolve();
      } else {
        dir = Math.sign(dx);
      }
    } else if (active) {
      if (this.isDown('left', 'leftArrow')) dir -= 1;
      if (this.isDown('right', 'rightArrow')) dir += 1;
    }

    // Horizontal acceleration model.
    let vx = body.velocity.x;
    const target = dir * MOVE.maxSpeed;
    let rate;
    if (dir !== 0) {
      const turning = vx !== 0 && Math.sign(vx) !== dir;
      if (onGround) rate = turning ? MOVE.groundDecel + MOVE.groundAccel : MOVE.groundAccel;
      else rate = MOVE.airAccel;
    } else {
      rate = onGround ? MOVE.groundDecel : MOVE.airDecel;
    }
    const step = rate * dt;
    if (vx < target) vx = Math.min(target, vx + step);
    else if (vx > target) vx = Math.max(target, vx - step);
    body.setVelocityX(vx);
    if (dir !== 0) this.setFlipX(dir < 0);

    // Jumping: buffer the press, allow coyote time, cut on early release.
    const jumpDown = active && this.isDown('jump', 'jumpW', 'jumpUp');
    const buffered = time - this.jumpPressedAt <= MOVE.jumpBufferMs;
    const coyote = time - this.lastGroundedAt <= MOVE.coyoteMs;
    if (buffered && coyote && !this.jumping) {
      body.setVelocityY(MOVE.jumpVelocity);
      this.jumping = true;
      this.jumpStartedAt = time;
      this.jumpPressedAt = -Infinity;
      this.lastGroundedAt = -Infinity;
      Audio.play('jump');
    }
    if (this.jumping && !jumpDown && this.wasJumpDown && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * MOVE.jumpCutMultiplier);
    }
    this.wasJumpDown = jumpDown;

    this.updateAnimation(onGround, time);
  }

  updateAnimation(onGround, time) {
    if (time < this.interactUntil) return;
    const vy = this.body.velocity.y;
    let anim;
    if (!onGround) anim = vy < 0 ? 'herc_jump' : 'herc_fall';
    else if (Math.abs(this.body.velocity.x) > 10) anim = 'herc_run';
    else anim = 'herc_idle';
    if (this.anims.currentAnim?.key !== anim) this.play(anim, true);
  }
}
