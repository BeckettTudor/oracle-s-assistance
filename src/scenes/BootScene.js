// Loads every asset that exists, then generates labeled placeholders for any
// manifest entry that is still missing, and builds the animations.

import { SPRITESHEETS, IMAGES, ANIMATIONS, AUDIO, AUDIO_EXTENSIONS } from '../assetManifest.js';
import { makeImagePlaceholder, makeSheetPlaceholder } from '../placeholders.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Set of existing file paths, or null when the server gives no listings.
    const available = this.registry.get('availableAssets');
    const exists = (path) => available === null || available.has(path);

    this.load.on('loaderror', (file) => {
      console.warn(`Asset missing, using placeholder: ${file.key} (${file.url})`);
    });

    for (const s of SPRITESHEETS) {
      if (exists(s.path)) {
        this.load.spritesheet(s.key, s.path, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
      }
    }
    for (const img of IMAGES) {
      if (exists(img.path)) this.load.image(img.key, img.path);
    }
    // Audio is only loaded when a matching file was actually found.
    if (available !== null) {
      for (const a of AUDIO) {
        const urls = AUDIO_EXTENSIONS.map((ext) => `${a.path}.${ext}`).filter((p) => available.has(p));
        if (urls.length) this.load.audio(a.key, urls);
      }
    }
  }

  create() {
    for (const s of SPRITESHEETS) {
      if (!this.textures.exists(s.key)) makeSheetPlaceholder(this, s);
    }
    for (const img of IMAGES) {
      if (!this.textures.exists(img.key)) makeImagePlaceholder(this, img);
    }
    for (const a of ANIMATIONS) {
      if (this.anims.exists(a.key)) continue;
      const frameTotal = this.textures.get(a.sheet).frameTotal - 1; // minus __BASE
      const frames = a.frames.filter((f) => f < frameTotal);
      this.anims.create({
        key: a.key,
        frames: this.anims.generateFrameNumbers(a.sheet, { frames: frames.length ? frames : [0] }),
        frameRate: a.frameRate,
        repeat: a.repeat,
      });
    }
    // Everything is pixel art: always scale with nearest-neighbour.
    for (const key of this.textures.getTextureKeys()) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.scene.start('Title');
  }
}
