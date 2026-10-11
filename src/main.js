// Entry point: wait for fonts, discover which asset files exist, start Phaser
// with a canvas that always fills the browser window.

import { MOVE } from './config.js';
import { ASSET_FOLDERS } from './assetManifest.js';
import { discoverAssets } from './assetDiscovery.js';
import { Audio } from './audio.js';
import { deviceSize, updateView, toggleFullscreen } from './viewport.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { ResultsScene } from './scenes/ResultsScene.js';

async function loadFonts() {
  try {
    await Promise.all([
      document.fonts.load('bold 40px Cinzel'),
      document.fonts.load('20px GameUI', 'Aa0123456789%'),
      document.fonts.load('bold 20px GameUI', 'Aa0123456789%'),
      document.fonts.load('20px "Jersey 10"', 'ADEFSaceps'),
    ]);
  } catch {
    // Fall back to system fonts.
  }
}

async function start() {
  const [available] = await Promise.all([discoverAssets(ASSET_FOLDERS), loadFonts()]);

  const size = deviceSize();
  updateView(size.width, size.height, size.dpr);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: size.width,
    height: size.height,
    backgroundColor: '#0d0906',
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    banner: false,
    scale: {
      mode: Phaser.Scale.NONE,
      zoom: 1 / size.dpr,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: MOVE.gravity }, debug: false },
    },
    scene: [BootScene, TitleScene, GameScene, UIScene, ResultsScene],
    callbacks: {
      preBoot: (g) => g.registry.set('availableAssets', available),
    },
  });

  // Follow the window: resize the canvas, recompute the view, tell scenes.
  let pending = null;
  const onResize = () => {
    clearTimeout(pending);
    pending = setTimeout(() => {
      const s = deviceSize();
      game.scale.setZoom(1 / s.dpr);
      game.scale.resize(s.width, s.height);
      updateView(s.width, s.height, s.dpr);
      game.events.emit('view-resize');
    }, 60);
  };
  window.addEventListener('resize', onResize);
  document.addEventListener('fullscreenchange', onResize);

  // F toggles true fullscreen anywhere in the game.
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyF' && !e.repeat) toggleFullscreen();
  });

  Audio.init(game);
  document.getElementById('loading')?.remove();
}

start();
