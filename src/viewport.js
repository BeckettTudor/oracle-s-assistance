// The game fills the whole browser window at its real pixel density.
//
// Layout works in "logical" pixels. The camera zoom is chosen so the
// 960x540 safe area (GAME_WIDTH x GAME_HEIGHT) always fits; on wider or
// taller windows the extra space shows more of the scene instead of black
// bars. VIEW describes what is currently visible, in logical pixels, with
// the safe area centred in it.

import { GAME_WIDTH, GAME_HEIGHT } from './config.js';

export const VIEW = {
  zoom: 1,
  width: GAME_WIDTH,     // visible logical width (>= GAME_WIDTH)
  height: GAME_HEIGHT,   // visible logical height (>= GAME_HEIGHT)
  left: 0,               // logical x of the visible left edge (<= 0)
  top: 0,                // logical y of the visible top edge (<= 0)
  dpr: 1,
};

export function deviceSize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  return {
    dpr,
    width: Math.max(1, Math.round(window.innerWidth * dpr)),
    height: Math.max(1, Math.round(window.innerHeight * dpr)),
  };
}

// Recompute VIEW for a canvas of the given size in device pixels.
export function updateView(canvasWidth, canvasHeight, dpr = VIEW.dpr) {
  const zoom = Math.min(canvasWidth / GAME_WIDTH, canvasHeight / GAME_HEIGHT);
  VIEW.zoom = zoom;
  VIEW.dpr = dpr;
  VIEW.width = canvasWidth / zoom;
  VIEW.height = canvasHeight / zoom;
  VIEW.left = (GAME_WIDTH - VIEW.width) / 2;
  VIEW.top = (GAME_HEIGHT - VIEW.height) / 2;
  return VIEW;
}

// Point the camera of a screen-space scene (menus, HUD) at the safe area.
export function fitCamera(scene) {
  scene.cameras.main.setZoom(VIEW.zoom).centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
}

// Logical position of an anchor on the visible screen: ax/ay in 0..1.
export function anchorX(ax, offset = 0) {
  return VIEW.left + ax * VIEW.width + offset;
}
export function anchorY(ay, offset = 0) {
  return VIEW.top + ay * VIEW.height + offset;
}

// Text is rasterised at the screen's pixel density so it stays sharp.
export function textResolution() {
  return Math.max(1, Math.min(4, VIEW.zoom));
}

export function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
