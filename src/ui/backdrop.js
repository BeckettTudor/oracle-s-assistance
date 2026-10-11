// The Aegean view behind the title and results screens: sky and sea, a coast
// with a white village, the floating Temple of Apollo, and a foreground of
// ruins, olive and cypress trees framing it. Clouds drift and the sea glints.

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { VIEW } from '../viewport.js';

const CX = GAME_WIDTH / 2;
const CY = GAME_HEIGHT / 2;
const HORIZON = 376; // sea horizon in the 960x540 composition

export function buildBackdrop(scene, { dim = 0, temple = true, templeY = 268 } = {}) {
  // Scale the 960x540 composition to cover the whole visible window.
  const s = Math.max(VIEW.width / GAME_WIDTH, VIEW.height / GAME_HEIGHT);
  const at = (x, y) => ({ x: CX + (x - CX) * s, y: CY + (y - CY) * s });
  const layer = (key) => scene.add.image(CX, CY, key).setScale(s);

  layer('menu_sky');

  // Clouds drifting slowly across.
  const L = VIEW.left;
  const R = VIEW.left + VIEW.width;
  const clouds = [];
  for (let i = 0; i < 5; i++) {
    const p = at(Math.random() * GAME_WIDTH, 30 + Math.random() * 180);
    const c = scene.add.image(p.x, p.y, 'menu_cloud', i % 3).setScale(s);
    c.speed = 3 + Math.random() * 5;
    clouds.push(c);
  }
  scene.time.addEvent({
    delay: 50,
    loop: true,
    callback: () => {
      for (const c of clouds) {
        c.fx = (c.fx ?? c.x) + c.speed * 0.05;
        if (c.fx > R + 90) c.fx = L - 90;
        c.x = Math.round(c.fx);
      }
    },
  });

  layer('menu_coast');

  // Sunlight glinting on the sea.
  for (let i = 0; i < 20; i++) {
    const p = at(CX + (Math.random() - 0.5) * 460, HORIZON + 8 + Math.random() * 100);
    const g = scene.add.rectangle(p.x, p.y, Math.round((4 + Math.random() * 8) * s), Math.round(2 * s), 0xffffff).setAlpha(0);
    scene.tweens.add({ targets: g, alpha: 0.9, duration: 500 + Math.random() * 700, yoyo: true, repeat: -1, delay: Math.random() * 2000 });
  }

  // Gulls.
  for (let i = 0; i < 3; i++) {
    const b = scene.add.sprite(L - 20, 0, 'menu_bird').play('bird_flap').setScale(s);
    const fly = () => {
      const start = at(0, 40 + Math.random() * 180);
      b.setPosition(L - 20 - Math.random() * 200, start.y);
      scene.tweens.add({
        targets: b, x: R + 20, y: start.y + (Math.random() - 0.5) * 60 * s,
        duration: 14000 + Math.random() * 8000, delay: Math.random() * 6000, onComplete: fly,
      });
    };
    fly();
  }

  let templeImg = null;
  if (temple) {
    const p = at(CX, templeY);
    templeImg = scene.add.image(p.x, p.y, 'menu_temple').setScale(s);
    scene.tweens.add({ targets: templeImg, y: p.y - 4 * s, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  layer('menu_ruins');

  if (dim > 0) {
    scene.add.rectangle(VIEW.left - 2, VIEW.top - 2, VIEW.width + 4, VIEW.height + 4, 0x0a1030, dim).setOrigin(0);
  }
  return { temple: templeImg };
}
