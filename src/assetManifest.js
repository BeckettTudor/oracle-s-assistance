// Every visual and audio asset the game uses, by fixed key and path.
//
// All artwork is pixel art drawn in code (src/art/) at one shared pixel scale
// (ART_SCALE in placeholders.js), so everything matches. The only exception
// is the three character portraits, which are image files.
//
// Any entry can still be replaced by dropping a PNG of the listed size at the
// listed path; the game loads files that exist and draws the rest.
// Sizes are in logical pixels and must be multiples of ART_SCALE.
//
// Spritesheets are horizontal strips of equal-sized frames. Characters face
// RIGHT; the game mirrors them.

export const PARALLAX = {
  sky: 0,
  clouds: 0.1,
  mountains: 0.2,
  near: 0.4,
};

export const SPRITESHEETS = [
  { key: 'hercules', path: 'assets/characters/hercules.png', art: 'hercules', frameWidth: 48, frameHeight: 60,
    frameLabels: ['IDLE', 'IDLE', 'BLINK', 'RUN', 'RUN', 'RUN', 'RUN', 'JUMP', 'FALL', 'TAKE'] },
  { key: 'oracle', path: 'assets/characters/oracle.png', art: 'oracle', frameWidth: 48, frameHeight: 60,
    frameLabels: ['IDLE', 'IDLE', 'IDLE', 'BLINK', 'IDLE', 'TALK', 'TALK', 'TALK', 'TALK', 'TALK'] },
  { key: 'zeus', path: 'assets/characters/zeus.png', art: 'zeus', frameWidth: 80, frameHeight: 80,
    frameLabels: ['FLOAT', 'FLOAT', 'FLOAT', 'FLOAT', 'FLOAT', 'BLINK', 'FLOAT', 'FLOAT', 'BEAM', 'BEAM', 'BEAM', 'BEAM'] },
  { key: 'pot', path: 'assets/environment/pot.png', art: 'pot', frameWidth: 24, frameHeight: 24,
    frameLabels: ['INTACT', 'CRACKED', 'SHATTERED'] },
  { key: 'checkpoint', path: 'assets/environment/brazier.png', art: 'torch', frameWidth: 24, frameHeight: 40,
    frameLabels: ['UNLIT', 'FLAME', 'FLAME', 'FLAME', 'FLAME'] },
  { key: 'ui_coin', path: 'assets/ui/coin.png', art: 'coin', frameWidth: 48, frameHeight: 48,
    frameLabels: ['O (omicron)', 'X (chi)'] },
  { key: 'menu_cloud', path: 'assets/background/menu_cloud.png', art: 'menuCloud', frameWidth: 140, frameHeight: 50,
    frameLabels: ['A', 'B', 'C'] },
  { key: 'menu_bird', path: 'assets/background/menu_bird.png', art: 'menuBird', frameWidth: 10, frameHeight: 6,
    frameLabels: ['UP', 'DOWN'] },
];

export const IMAGES = [
  // Portraits: the only image files (drawn 1:1).
  { key: 'portrait_hercules', path: 'assets/portraits/hercules.png', width: 96, height: 96, scale: 1 },
  { key: 'portrait_zeus', path: 'assets/portraits/zeus.png', width: 96, height: 96, scale: 1 },
  { key: 'portrait_oracle', path: 'assets/portraits/oracle.png', width: 96, height: 96, scale: 1 },

  // Props and decor
  { key: 'offering', path: 'assets/environment/offering.png', width: 16, height: 16, art: 'offering' },
  { key: 'offering_pile', path: 'assets/environment/offering_pile.png', width: 64, height: 32, art: 'offeringPile' },
  { key: 'altar', path: 'assets/environment/altar.png', width: 112, height: 40, art: 'altar' },
  { key: 'bolt', path: 'assets/environment/bolt.png', width: 32, height: 56, art: 'bolt' },
  { key: 'fx_glow', path: 'assets/environment/glow.png', width: 64, height: 64, art: 'glow' },
  { key: 'tree_olive', path: 'assets/environment/tree_olive.png', width: 88, height: 120, art: 'treeOlive' },
  { key: 'tree_cypress', path: 'assets/environment/tree_cypress.png', width: 36, height: 128, art: 'treeCypress' },

  // Tiles and ledge end caps
  { key: 'env_ground', path: 'assets/environment/ground.png', width: 160, height: 80, art: 'ground' },
  { key: 'env_plaza', path: 'assets/environment/plaza.png', width: 64, height: 16, art: 'plaza' },
  { key: 'env_ledge', path: 'assets/environment/ledge.png', width: 32, height: 16, art: 'ledge' },
  { key: 'env_ledge_l', path: 'assets/environment/ledge_l.png', width: 16, height: 16, art: 'ledgeL' },
  { key: 'env_ledge_r', path: 'assets/environment/ledge_r.png', width: 16, height: 16, art: 'ledgeR' },
  { key: 'env_ledge_crumble', path: 'assets/environment/ledge_crumble.png', width: 32, height: 16, art: 'ledgeCrumble' },
  { key: 'env_ledge_crumble_l', path: 'assets/environment/ledge_crumble_l.png', width: 16, height: 16, art: 'ledgeCrumbleL' },
  { key: 'env_ledge_crumble_r', path: 'assets/environment/ledge_crumble_r.png', width: 16, height: 16, art: 'ledgeCrumbleR' },
  { key: 'env_ledge_moving', path: 'assets/environment/ledge_moving.png', width: 32, height: 16, art: 'ledgeMoving' },

  // Temple
  { key: 'env_temple_floor', path: 'assets/environment/temple_floor.png', width: 64, height: 32, art: 'templeFloor' },
  { key: 'env_temple_wall', path: 'assets/environment/temple_frieze.png', width: 64, height: 32, art: 'templeFrieze' },
  { key: 'env_column_shaft', path: 'assets/environment/column_shaft.png', width: 32, height: 32, art: 'columnShaft' },
  { key: 'env_column_cap', path: 'assets/environment/column_cap.png', width: 40, height: 20, art: 'columnCap' },
  { key: 'env_column_base', path: 'assets/environment/column_base.png', width: 40, height: 16, art: 'columnBase' },
  { key: 'env_temple_bg', path: 'assets/environment/temple_bg.png', width: 544, height: 290, art: 'templeBg' },
  { key: 'env_shelves', path: 'assets/environment/shelves.png', width: 264, height: 268, art: 'shelves' },
  { key: 'env_pediment', path: 'assets/environment/pediment.png', width: 640, height: 120, art: 'pediment' },
  { key: 'env_temple_base', path: 'assets/environment/temple_base.png', width: 760, height: 120, art: 'templeBase' },
  { key: 'env_door_seal', path: 'assets/environment/door_seal.png', width: 32, height: 90, art: 'doorSeal' },

  // In-game parallax layers (tile horizontally; the sky is a vertical strip)
  { key: 'bg_sky', path: 'assets/background/sky.png', width: 64, height: 540, art: 'sky' },
  { key: 'bg_clouds', path: 'assets/background/clouds.png', width: 960, height: 1000, art: 'clouds' },
  { key: 'bg_mountains', path: 'assets/background/mountains.png', width: 960, height: 400, art: 'mountains' },
  { key: 'bg_near', path: 'assets/background/near.png', width: 960, height: 360, art: 'near' },

  // Title / results scene
  { key: 'menu_sky', path: 'assets/background/menu_sky.png', width: 960, height: 540, art: 'menuSky' },
  { key: 'menu_coast', path: 'assets/background/menu_coast.png', width: 960, height: 540, art: 'menuCoast' },
  { key: 'menu_ruins', path: 'assets/background/menu_ruins.png', width: 960, height: 540, art: 'menuRuins' },
  { key: 'menu_temple', path: 'assets/background/menu_temple.png', width: 280, height: 300, art: 'menuTemple' },

  // UI (nine-slices: `slice` is the corner size in logical pixels)
  { key: 'ui_panel', path: 'assets/ui/panel.png', width: 48, height: 48, art: 'panel', slice: 12 },
  { key: 'ui_dialog', path: 'assets/ui/dialog.png', width: 64, height: 64, art: 'dialog', slice: 16 },
  { key: 'ui_button', path: 'assets/ui/button.png', width: 48, height: 24, art: 'button', slice: 6 },
  { key: 'ui_key', path: 'assets/ui/key.png', width: 16, height: 16, art: 'key', slice: 6 },
  { key: 'ui_frame', path: 'assets/ui/frame.png', width: 32, height: 32, art: 'frame', slice: 8 },
  { key: 'ui_plaque', path: 'assets/ui/plaque.png', width: 32, height: 16, art: 'plaque', slice: 6 },
  { key: 'ui_meander', path: 'assets/ui/meander.png', width: 16, height: 10, art: 'meander' },
  { key: 'ui_divider', path: 'assets/ui/divider.png', width: 160, height: 12, art: 'divider' },
  { key: 'ui_arrow', path: 'assets/ui/arrow.png', width: 10, height: 6, art: 'arrow' },
  { key: 'ui_sun_coin', path: 'assets/ui/sun_coin.png', width: 16, height: 16, art: 'sunCoin' },
];

// Animation definitions, built from spritesheet frame indices.
export const ANIMATIONS = [
  { key: 'herc_idle', sheet: 'hercules', frames: [0, 1, 0, 1, 0, 2], frameRate: 4, repeat: -1 },
  { key: 'herc_run', sheet: 'hercules', frames: [3, 4, 5, 6], frameRate: 10, repeat: -1 },
  { key: 'herc_jump', sheet: 'hercules', frames: [7], frameRate: 1, repeat: 0 },
  { key: 'herc_fall', sheet: 'hercules', frames: [8], frameRate: 1, repeat: 0 },
  { key: 'herc_interact', sheet: 'hercules', frames: [9], frameRate: 1, repeat: 0 },
  { key: 'zeus_idle', sheet: 'zeus', frames: [0, 1, 2, 3, 4, 5, 6, 7], frameRate: 6, repeat: -1 },
  { key: 'zeus_descend', sheet: 'zeus', frames: [8, 9, 10, 11], frameRate: 10, repeat: -1 },
  { key: 'zeus_ascend', sheet: 'zeus', frames: [11, 10, 9, 8], frameRate: 10, repeat: -1 },
  { key: 'oracle_idle', sheet: 'oracle', frames: [0, 1, 2, 1, 4, 3], frameRate: 3, repeat: -1 },
  { key: 'oracle_talk', sheet: 'oracle', frames: [5, 6, 7, 8, 9, 6], frameRate: 5, repeat: -1 },
  { key: 'torch_lit', sheet: 'checkpoint', frames: [1, 2, 3, 4], frameRate: 9, repeat: -1 },
  { key: 'bird_flap', sheet: 'menu_bird', frames: [0, 1], frameRate: 5, repeat: -1 },
];

// Audio cues. Each one has a procedural version in synth.js; drop e.g.
// assets/audio/jump.mp3 (or .ogg / .wav) in place and the file plays instead.
export const AUDIO_EXTENSIONS = ['ogg', 'mp3', 'wav'];
export const AUDIO = [
  { key: 'jump', path: 'assets/audio/jump' },
  { key: 'offering_pickup', path: 'assets/audio/offering_pickup' },
  { key: 'offering_consume', path: 'assets/audio/offering_consume' },
  { key: 'pot_break', path: 'assets/audio/pot_break' },
  { key: 'bolt_reveal', path: 'assets/audio/bolt_reveal' },
  { key: 'oracle_query', path: 'assets/audio/oracle_query' },
  { key: 'dialogue_advance', path: 'assets/audio/dialogue_advance' },
  { key: 'ui_click', path: 'assets/audio/ui_click' },
  { key: 'checkpoint', path: 'assets/audio/checkpoint' },
  { key: 'coin_toss', path: 'assets/audio/coin_toss' },
  { key: 'ledge_crumble', path: 'assets/audio/ledge_crumble' },
  { key: 'fate_mark', path: 'assets/audio/fate_mark' },
  { key: 'fate_reflect', path: 'assets/audio/fate_reflect' },
  { key: 'success', path: 'assets/audio/success' },
  { key: 'music_title', path: 'assets/audio/music_title', music: true },
  { key: 'music_hill', path: 'assets/audio/music_hill', music: true },
  { key: 'music_temple', path: 'assets/audio/music_temple', music: true },
];

export const ASSET_FOLDERS = [
  'assets/characters/',
  'assets/portraits/',
  'assets/environment/',
  'assets/background/',
  'assets/ui/',
  'assets/audio/',
];
