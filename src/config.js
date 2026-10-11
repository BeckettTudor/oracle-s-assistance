// Central tuning values and constants. Gameplay code reads from here so
// numbers can be adjusted without hunting through scenes.

// The safe area, in logical pixels. All gameplay and layout code works in
// these units; the canvas itself always fills the browser window and the
// camera zoom adapts (see viewport.js). On wider or taller windows more of
// the scene is visible around this area.
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const WORLD = {
  width: 960,
  height: 1640,
  groundTop: 1580,
};

// Movement tuning (spec: "Movement Tuning").
export const MOVE = {
  maxSpeed: 220,          // px/s
  groundAccel: 1600,      // px/s^2
  groundDecel: 1900,      // px/s^2
  airAccel: 1100,         // px/s^2
  airDecel: 700,          // px/s^2 (gentle drift when no input in the air)
  gravity: 1100,          // px/s^2
  jumpVelocity: -430,     // px/s
  jumpCutMultiplier: 0.45, // upward velocity kept when jump is released early
  maxFallSpeed: 720,      // px/s
  coyoteMs: 100,
  jumpBufferMs: 120,
  inputGraceMs: 150,      // ignore input briefly after control is handed back
};

// A fall is "a fall" (respawn at checkpoint) once Hercules drops this far
// below the active checkpoint while carrying an offering.
export const FALL_RESPAWN_DISTANCE = 220;

export const FONTS = {
  // Cinzel is only used to build pixel-art titles (see ui/pixelText.js).
  title: 'Cinzel, Georgia, "Times New Roman", serif',
  // Pixel font for all other text, rasterised at screen resolution.
  ui: 'GameUI, "Pixelify Sans", "Courier New", monospace',
  body: 'GameUI, "Pixelify Sans", "Courier New", monospace',
  mono: 'GameUI, "Pixelify Sans", "Courier New", monospace',
  // Keycap labels (Pixelify's curly capital E reads poorly on a key).
  key: '"Jersey 10", GameUI, "Courier New", monospace',
};

export const COLORS = {
  ink: '#3b2a1a',
  inkSoft: '#6b5236',
  parchment: '#f1e2bf',
  gold: '#e8b923',
  goldDark: '#9c7612',
  marble: '#e9e4d8',
  aegean: '#2c6e9b',
  white: '#ffffff',
  hudText: '#fff6dc',
  danger: '#b5412e',
};

// Zeus's verdict thresholds, counted over main-loop actions only.
export const VERDICT = {
  pleasedMax: 10,
  neutralMax: 20,
};

export const SEARCH = {
  states: 64,
  qubits: 6,
  classicalExpected: 32,
  classicalWorst: 63,
  optimalIterations: 6,
};

// Speaker id -> display name and portrait texture key.
export const SPEAKERS = {
  zeus: { name: 'Zeus', portrait: 'portrait_zeus' },
  hercules: { name: 'Hercules', portrait: 'portrait_hercules' },
  oracle: { name: 'Oracle', portrait: 'portrait_oracle' },
};

export const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');
