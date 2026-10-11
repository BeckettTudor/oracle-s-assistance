// Small audio wrapper with named cues. A cue plays its file from
// assets/audio/ if one was found at boot; otherwise the procedural version in
// synth.js plays. Music and sound effects can be switched off separately in
// Options, and the choice is remembered in this browser.

import { AUDIO } from './assetManifest.js';
import { Synth } from './synth.js';

const MUSIC_KEYS = new Set(AUDIO.filter((a) => a.music).map((a) => a.key));
const PREFS_KEY = 'oracles-assistance-audio';

let game = null;
let fileMusic = null;     // a Phaser sound, when the track is a real file
let musicKey = null;      // the track the current scene wants
const prefs = { music: true, sfx: true };

try {
  Object.assign(prefs, JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'));
} catch {
  // Private windows may block storage; the defaults are fine.
}

function savePrefs() {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}

function haltMusic() {
  if (fileMusic) {
    try { fileMusic.stop(); fileMusic.destroy(); } catch { /* ignore */ }
    fileMusic = null;
  }
  Synth.stopMusic();
}

function startMusic(cue) {
  if (!prefs.music || !cue) return;
  if (MUSIC_KEYS.has(cue) && Audio.has(cue)) {
    try {
      fileMusic = game.sound.add(cue, { loop: true, volume: 0.5 });
      fileMusic.play();
    } catch {
      fileMusic = null;
    }
  } else {
    Synth.music(cue);
  }
}

export const Audio = {
  init(phaserGame) {
    game = phaserGame;
    Synth.installUnlock();
  },

  has(cue) {
    return !!game && game.cache.audio.exists(cue);
  },

  play(cue, config = {}) {
    if (!prefs.sfx) return;
    if (this.has(cue)) {
      try { game.sound.play(cue, config); } catch { /* audio must never break gameplay */ }
    } else {
      Synth.sfx(cue);
    }
  },

  playMusic(cue) {
    if (musicKey === cue) return;
    haltMusic();
    musicKey = cue;
    startMusic(cue);
  },

  stopMusic() {
    haltMusic();
    musicKey = null;
  },

  // True once the browser has allowed sound (after the first click or key).
  unlocked: () => Synth.isUnlocked(),

  duck(on) {
    Synth.duck(on);
  },

  musicOn: () => prefs.music,
  sfxOn: () => prefs.sfx,

  setMusicOn(value) {
    prefs.music = value;
    savePrefs();
    haltMusic();
    if (value) startMusic(musicKey);
  },

  setSfxOn(value) {
    prefs.sfx = value;
    savePrefs();
  },
};
