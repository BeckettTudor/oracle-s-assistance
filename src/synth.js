// Procedural sound: every effect and all three music tracks are synthesised
// with the Web Audio API, the way the art is drawn in code. Instruments are
// period-flavoured: a plucked lyre (Karplus-Strong string), a reedy aulos,
// a frame drum, and a temple bell. Music is written in Greek-sounding modes
// (Dorian and Phrygian) and scheduled a little ahead of time.
//
// Browsers only allow sound after a user gesture, so the audio context is
// created on the first click or key press. Anything requested before that
// (like title music) starts as soon as sound is unlocked.

let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let reverbIn = null;
let noise = null;
const pluckCache = new Map();
const MUSIC_LEVEL = 0.45;

const midiFreq = (m) => 440 * 2 ** ((m - 69) / 12);

function init() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.55;
  sfxBus.connect(master);
  musicBus = ctx.createGain();
  musicBus.gain.value = MUSIC_LEVEL;
  musicBus.connect(master);

  // A stone-hall reverb: decaying stereo noise as the impulse response.
  const conv = ctx.createConvolver();
  const len = Math.floor(ctx.sampleRate * 2.6);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  conv.buffer = ir;
  reverbIn = ctx.createGain();
  reverbIn.gain.value = 0.35;
  reverbIn.connect(conv);
  conv.connect(master);

  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  return true;
}

// Route a voice to a bus, with an optional reverb send.
function out(node, bus, send = 0) {
  node.connect(bus);
  if (send > 0) {
    const g = ctx.createGain();
    g.gain.value = send;
    node.connect(g);
    g.connect(reverbIn);
  }
}

// ---------- Instruments ----------

// Karplus-Strong plucked string. Buffers are cached per pitch; the loop runs
// at a whole-sample period and playbackRate corrects the tuning.
function pluckBuffer(midi, ring, bright) {
  const key = `${midi}|${ring}|${bright}`;
  if (pluckCache.has(key)) return pluckCache.get(key);
  const sr = ctx.sampleRate;
  const f = midiFreq(midi);
  const period = Math.max(2, Math.floor(sr / f - 0.5));
  const actual = sr / (period + 0.5);
  const n = Math.floor(sr * ring * 1.3);
  const buf = ctx.createBuffer(1, n, sr);
  const d = buf.getChannelData(0);
  const decay = 0.001 ** (1 / (actual * ring));
  let prev = 0;
  for (let i = 0; i < period; i++) {
    prev += bright * ((Math.random() * 2 - 1) - prev);
    d[i] = prev;
  }
  d[period] = decay * d[0];
  for (let i = period + 1; i < n; i++) d[i] = decay * 0.5 * (d[i - period] + d[i - period - 1]);
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
  if (peak > 0) for (let i = 0; i < n; i++) d[i] /= peak;
  const entry = { buf, rate: f / actual };
  pluckCache.set(key, entry);
  return entry;
}

function lyre(midi, t, { vel = 0.5, ring = 1.8, bright = 0.55, pan = 0, bus = musicBus, send = 0.25 } = {}) {
  const { buf, rate } = pluckBuffer(midi, ring, bright);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 4200;
  const g = ctx.createGain();
  g.gain.value = vel;
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  src.connect(lp).connect(g).connect(p);
  out(p, bus, send);
  src.start(t);
}

// Aulos: a double reed, so two slightly detuned buzzy tones through a soft
// filter, with vibrato that blooms after the attack.
function aulos(midi, t, dur, { vel = 0.12, bus = musicBus, send = 0.4, cutoff = 1500 } = {}) {
  const f = midiFreq(midi);
  const o1 = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  o1.type = 'sawtooth';
  o2.type = 'square';
  o1.frequency.value = f;
  o2.frequency.value = f * 1.004;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.2;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(f * 0.007, t + Math.min(0.6, dur * 0.6));
  lfo.connect(depth);
  depth.connect(o1.frequency);
  depth.connect(o2.frequency);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = cutoff;
  lp.Q.value = 0.8;
  const g = ctx.createGain();
  const a = Math.min(0.12, dur * 0.3);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel, t + a);
  g.gain.setValueAtTime(vel, t + dur - 0.12);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o1.connect(lp);
  o2.connect(lp);
  lp.connect(g);
  out(g, bus, send);
  for (const o of [o1, o2, lfo]) { o.start(t); o.stop(t + dur + 0.05); }
}

function noiseHit(t, { type = 'bandpass', freq = 2000, q = 1, dur = 0.08, vel = 0.3, bus = sfxBus, send = 0, sweepTo = null } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vel, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  src.connect(f).connect(g);
  out(g, bus, send);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

function tone(t, { type = 'sine', from, to = from, dur = 0.1, vel = 0.2, bus = sfxBus, send = 0, attack = 0.005 } = {}) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  if (to !== from) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vel, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g);
  out(g, bus, send);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// Frame drum: a low "doum" from the centre and a dry "tek" from the rim.
function doum(t, vel = 0.5, bus = musicBus) {
  tone(t, { from: 140, to: 58, dur: 0.32, vel, bus, send: 0.1 });
  noiseHit(t, { type: 'lowpass', freq: 400, dur: 0.08, vel: vel * 0.4, bus });
}
function tek(t, vel = 0.3, bus = musicBus) {
  noiseHit(t, { type: 'bandpass', freq: 2600, q: 1.4, dur: 0.06, vel, bus, send: 0.08 });
}

// Temple bell: inharmonic partials with a long decay.
function bell(midi, t, { vel = 0.12, bus = musicBus, send = 0.5 } = {}) {
  const f = midiFreq(midi);
  [[1, 1, 3.2], [2.76, 0.45, 1.8], [5.4, 0.25, 0.9], [8.9, 0.12, 0.5]].forEach(([mul, amp, dur]) => {
    tone(t, { from: f * mul, dur, vel: vel * amp, bus, send, attack: 0.002 });
  });
}

// ---------- Sound effects ----------

const N = (name) => {
  const names = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const m = /^([A-G]#?)(-?\d)$/.exec(name);
  return 12 * (Number(m[2]) + 1) + names[m[1]];
};

const SFX = {
  jump(t) {
    tone(t, { type: 'triangle', from: 260, to: 520, dur: 0.11, vel: 0.12 });
  },
  offering_pickup(t) {
    lyre(N('A4'), t, { vel: 0.5, ring: 1, bus: sfxBus, send: 0.2 });
    lyre(N('E5'), t + 0.08, { vel: 0.45, ring: 1.2, bus: sfxBus, send: 0.2 });
  },
  offering_consume(t) {
    [N('E5'), N('C5'), N('A4'), N('E4')].forEach((m, i) => lyre(m, t + i * 0.09, { vel: 0.4, ring: 1.4, bus: sfxBus, send: 0.45 }));
    noiseHit(t, { type: 'highpass', freq: 3000, dur: 0.6, vel: 0.05, send: 0.3 });
  },
  checkpoint(t) {
    noiseHit(t, { type: 'bandpass', freq: 500, sweepTo: 1800, q: 0.7, dur: 0.45, vel: 0.18, send: 0.15 });
    lyre(N('D5'), t + 0.05, { vel: 0.4, ring: 1.4, bus: sfxBus, send: 0.3 });
    lyre(N('A5'), t + 0.15, { vel: 0.35, ring: 1.6, bus: sfxBus, send: 0.3 });
  },
  ledge_crumble(t) {
    noiseHit(t, { type: 'lowpass', freq: 900, dur: 0.35, vel: 0.25 });
    for (let i = 0; i < 6; i++) {
      noiseHit(t + 0.03 + Math.random() * 0.3, { type: 'bandpass', freq: 1200 + Math.random() * 1800, q: 3, dur: 0.03, vel: 0.15 });
    }
  },
  pot_break(t) {
    tone(t, { from: 180, to: 70, dur: 0.18, vel: 0.35 });
    noiseHit(t, { type: 'bandpass', freq: 2400, q: 0.9, dur: 0.22, vel: 0.45, send: 0.15 });
    for (let i = 0; i < 9; i++) {
      const dt = 0.06 + i * 0.035 + Math.random() * 0.03;
      noiseHit(t + dt, { type: 'bandpass', freq: 2500 + Math.random() * 3500, q: 6, dur: 0.035, vel: 0.22 * (1 - i / 10) });
    }
  },
  // The pot cracks open with a flash of lightning: a crack and a rumble.
  bolt_reveal(t) {
    noiseHit(t, { type: 'highpass', freq: 1500, dur: 0.12, vel: 0.5 });
    noiseHit(t + 0.05, { type: 'lowpass', freq: 260, dur: 2.4, vel: 0.6, send: 0.3 });
  },
  // Found it: a bright D-major fanfare on lyre and drum, crowned by a bell.
  success(t) {
    [N('D4'), N('F#4'), N('A4'), N('D5')].forEach((m, i) => lyre(m, t + i * 0.11, { vel: 0.5, ring: 1.4, bright: 0.7, bus: sfxBus, send: 0.3 }));
    [0, 0.11, 0.22, 0.33].forEach((dt) => tek(t + dt, 0.18, sfxBus));
    doum(t + 0.48, 0.5, sfxBus);
    [N('D4'), N('A4'), N('D5'), N('F#5'), N('A5'), N('D6')].forEach((m, i) => lyre(m, t + 0.48 + i * 0.025, { vel: 0.45, ring: 2.8, bright: 0.6, bus: sfxBus, send: 0.45 }));
    aulos(N('A4'), t + 0.48, 1.6, { vel: 0.07, bus: sfxBus, send: 0.5, cutoff: 1800 });
    aulos(N('D5'), t + 0.48, 1.6, { vel: 0.06, bus: sfxBus, send: 0.5, cutoff: 1800 });
    bell(N('D6'), t + 0.5, { vel: 0.2, bus: sfxBus });
    bell(N('A6'), t + 0.9, { vel: 0.1, bus: sfxBus });
  },
  oracle_query(t) {
    aulos(N('E4'), t, 1.0, { vel: 0.08, bus: sfxBus, send: 0.6, cutoff: 1100 });
    [N('B5'), N('E6'), N('G6')].forEach((m, i) => tone(t + 0.1 + i * 0.15, { from: midiFreq(m), dur: 1.1, vel: 0.05, send: 0.7, attack: 0.2 }));
  },
  // The Oracle marks the bolt's pot: a low, falling pair of notes.
  fate_mark(t) {
    lyre(N('E4'), t, { vel: 0.45, ring: 1.6, bright: 0.35, bus: sfxBus, send: 0.5 });
    lyre(N('B3'), t + 0.14, { vel: 0.4, ring: 1.8, bright: 0.3, bus: sfxBus, send: 0.5 });
  },
  // ...and reflects fate about its average: a rising run that settles.
  fate_reflect(t) {
    [N('E4'), N('G4'), N('B4'), N('E5'), N('G5')].forEach((m, i) => lyre(m, t + i * 0.06, { vel: 0.3, ring: 1.6, bus: sfxBus, send: 0.5 }));
    bell(N('B5'), t + 0.3, { vel: 0.06, bus: sfxBus });
  },
  dialogue_advance(t) {
    lyre(N('A5'), t, { vel: 0.18, ring: 0.4, bright: 0.4, bus: sfxBus, send: 0.1 });
  },
  ui_click(t) {
    tone(t, { from: 900, to: 520, dur: 0.05, vel: 0.18 });
    noiseHit(t, { type: 'bandpass', freq: 1800, q: 2, dur: 0.02, vel: 0.08 });
  },
  coin_toss(t) {
    // Six coins ringing as they spin and land.
    for (let i = 0; i < 6; i++) {
      const dt = i * 0.11 + Math.random() * 0.04;
      const f = 2600 + Math.random() * 900;
      tone(t + dt, { from: f, dur: 0.25, vel: 0.06, attack: 0.002 });
      tone(t + dt, { from: f * 1.52, dur: 0.15, vel: 0.03, attack: 0.002 });
    }
  },
};

// ---------- Music ----------

// Bars are written as "note:beats" pairs separated by spaces, with "-" for a
// rest, so each track reads like a simple score.
function parse(score) {
  const events = [];
  let beat = 0;
  for (const tok of score.trim().split(/\s+/)) {
    if (tok === '|') continue;
    const [note, len] = tok.split(':');
    const beats = Number(len);
    if (note !== '-') events.push({ beat, midi: N(note), beats });
    beat += beats;
  }
  return { events, length: beat };
}

const CHORDS = {
  Am: ['A2', 'E3', 'A3', 'C4'], G: ['G2', 'D3', 'G3', 'B3'], Em: ['E2', 'B2', 'E3', 'G3'],
  D: ['D3', 'A3', 'D4', 'F#4'], C: ['C3', 'G3', 'C4', 'E4'], Dm: ['D3', 'A3', 'D4', 'F4'],
  F: ['F2', 'C3', 'F3', 'A3'], E: ['E2', 'B2', 'E3', 'G#3'],
};

// Each track returns note events (beat-relative) for one pass of its loop.
const TRACKS = {
  // Title: a calm lyre air in A Dorian over rolling arpeggios.
  music_title: (() => {
    const bpm = 72;
    const melody = parse(`
      E5:2 D5:1 C5:1 | B4:2 G4:2 | A4:1 B4:1 C5:1 D5:1 | E5:4
      A5:2 G5:1 E5:1 | D5:2 B4:2 | F#5:1 E5:1 D5:1 F#5:1 | E5:4
      C5:1 D5:1 E5:2 | D5:1 C5:1 B4:2 | C5:1 E5:1 G5:2 | F#5:3 -:1
      E5:2 D5:1 B4:1 | D5:2 G4:2 | B4:1 A4:1 G4:1 B4:1 | A4:4`);
    const chords = 'Am G Am Em Am G D Em Am G C D Am G Em Am'.split(' ');
    const events = [];
    for (const n of melody.events) events.push({ beat: n.beat, play: (t) => lyre(n.midi, t, { vel: 0.42, ring: 2.2, pan: 0.1 }) });
    chords.forEach((c, bar) => {
      const [r, f, o, th] = CHORDS[c].map(N);
      [r, f, o, th + 12, o, f, o, th].forEach((m, i) => {
        events.push({ beat: bar * 4 + i * 0.5, play: (t) => lyre(m, t, { vel: i === 0 ? 0.32 : 0.2, ring: 1.6, bright: 0.4, pan: -0.25 }) });
      });
    });
    events.push({ beat: 0, play: (t, spb) => aulos(N('A2'), t, spb * 32, { vel: 0.035, cutoff: 700 }) });
    events.push({ beat: 32, play: (t, spb) => aulos(N('A2'), t, spb * 32, { vel: 0.035, cutoff: 700 }) });
    return { bpm, length: melody.length, events };
  })(),

  // Hill: a lively D Dorian dance with a frame-drum rhythm.
  music_hill: (() => {
    const bpm = 100;
    const melody = parse(`
      D5:0.5 E5:0.5 F5:0.5 A5:0.5 G5:1 F5:1 | E5:0.5 F5:0.5 G5:1 E5:1 C5:1
      D5:1 F5:0.5 E5:0.5 D5:1 A4:1 | C5:0.5 B4:0.5 A4:1 E5:2
      F5:0.5 G5:0.5 A5:1 A5:0.5 G5:0.5 F5:1 | G5:0.5 F5:0.5 E5:1 C5:1 E5:1
      D5:0.5 E5:0.5 G5:1 B5:1 A5:1 | A5:3 -:1
      C6:1 A5:0.5 G5:0.5 F5:1 A5:1 | G5:1 E5:0.5 F5:0.5 G5:2
      F5:0.5 E5:0.5 D5:1 F5:1 A5:1 | E5:3 -:1
      D5:0.5 F5:0.5 A5:0.5 D6:0.5 C6:1 A5:1 | G5:0.5 A5:0.5 G5:0.5 E5:0.5 C5:2
      E5:1 D5:0.5 C5:0.5 B4:1 C5:1 | D5:3 -:1`);
    const chords = 'Dm C Dm Am Dm C G Am F C Dm Am Dm C Am Dm'.split(' ');
    const events = [];
    for (const n of melody.events) events.push({ beat: n.beat, play: (t) => lyre(n.midi, t, { vel: 0.4, ring: 1.3, bright: 0.65, pan: 0.15 }) });
    chords.forEach((c, bar) => {
      const [r, f, o] = CHORDS[c].map(N);
      const b = bar * 4;
      events.push({ beat: b, play: (t) => lyre(r - 12 < 36 ? r : r - 12, t, { vel: 0.4, ring: 1.2, bright: 0.35, pan: -0.2 }) });
      events.push({ beat: b + 1, play: (t) => lyre(o, t, { vel: 0.18, ring: 0.8, bright: 0.4, pan: -0.3 }) });
      events.push({ beat: b + 2, play: (t) => lyre(f, t, { vel: 0.3, ring: 1, bright: 0.35, pan: -0.2 }) });
      events.push({ beat: b + 3, play: (t) => lyre(o, t, { vel: 0.18, ring: 0.8, bright: 0.4, pan: -0.3 }) });
      // Maqsum-like pattern: doum tek - tek doum - tek -
      events.push({ beat: b, play: (t) => doum(t, 0.4) });
      events.push({ beat: b + 0.5, play: (t) => tek(t, 0.16) });
      events.push({ beat: b + 1.5, play: (t) => tek(t, 0.2) });
      events.push({ beat: b + 2, play: (t) => doum(t, 0.32) });
      events.push({ beat: b + 3, play: (t) => tek(t, 0.2) });
      if (bar % 4 === 3) events.push({ beat: b + 3.5, play: (t) => tek(t, 0.12) });
    });
    return { bpm, length: melody.length, events };
  })(),

  // Temple: slow and hushed in E Phrygian, a reed drone under sparse lyre.
  music_temple: (() => {
    const bpm = 66;
    const melody = parse(`
      E5:2 F5:2 | E5:4 | G5:1 F5:1 E5:2 | D5:2 E5:2
      -:4 | B4:1 C5:1 D5:2 | C5:1 B4:1 A4:2 | B4:4
      E5:1 G5:1 A5:2 | G5:1 F5:1 E5:2 | F5:2 E5:1 D5:1 | E5:4
      -:4 | A4:2 B4:1 C5:1 | B4:1 A4:1 G4:1 F4:1 | E4:4`);
    const roots = 'E3 E3 C3 D3 A2 A2 F2 E2 E3 C3 D3 E3 A2 F2 F2 E2'.split(' ');
    const events = [];
    for (const n of melody.events) events.push({ beat: n.beat, play: (t) => lyre(n.midi, t, { vel: 0.36, ring: 2.6, bright: 0.45, send: 0.55, pan: 0.1 }) });
    roots.forEach((r, bar) => {
      events.push({ beat: bar * 4, play: (t) => lyre(N(r), t, { vel: 0.32, ring: 2.4, bright: 0.3, send: 0.5, pan: -0.2 }) });
      events.push({ beat: bar * 4 + 2, play: (t) => lyre(N(r) + 7, t, { vel: 0.16, ring: 1.8, bright: 0.3, send: 0.5, pan: -0.25 }) });
    });
    [0, 32].forEach((beat) => {
      events.push({ beat, play: (t, spb) => aulos(N('E3'), t, spb * 32, { vel: 0.04, cutoff: 800, send: 0.6 }) });
      events.push({ beat, play: (t, spb) => aulos(N('B3'), t, spb * 32, { vel: 0.025, cutoff: 800, send: 0.6 }) });
      events.push({ beat, play: (t) => bell(N('E6'), t, { vel: 0.07 }) });
    });
    return { bpm, length: melody.length, events };
  })(),
};

// The sequencer looks ahead about a second so background-tab timer
// throttling doesn't cause gaps. Changing tracks fades the old one out
// before the new one fades in, so two keys never sound at once, and each
// track resumes near where it left off instead of restarting its intro.
let current = null;
const resumeAt = new Map(); // track key -> beat to resume from
const FADE_OUT = 0.6;
const FADE_IN = 1.4;

function startTrack(key, delay = 0) {
  const track = TRACKS[key];
  if (!track) return;
  const t0 = ctx.currentTime + delay;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(1, t0 + FADE_IN);
  gain.connect(musicBus);
  // The track's reverb send fades with it, so no tails ring on after a stop.
  const rev = ctx.createGain();
  rev.gain.setValueAtTime(0, ctx.currentTime);
  rev.gain.setValueAtTime(0, t0);
  rev.gain.linearRampToValueAtTime(1, t0 + FADE_IN);
  rev.connect(reverbIn);
  const spb = 60 / track.bpm;
  const events = [...track.events].sort((a, b) => a.beat - b.beat);
  // Starting "in the past" by the resume offset makes the scheduler skip
  // straight to that bar.
  const offset = resumeAt.get(key) ?? 0;
  const state = { key, gain, rev, spb, length: track.length, start: t0 + 0.1 - offset * spb, loop: 0, index: 0, timer: null };
  const prevBus = musicBus;
  const prevRev = reverbIn;
  const schedule = () => {
    const horizon = ctx.currentTime + 1.0;
    for (;;) {
      if (state.index >= events.length) {
        state.index = 0;
        state.loop += 1;
      }
      const ev = events[state.index];
      const t = state.start + (state.loop * track.length + ev.beat) * spb;
      if (t > horizon) break;
      if (t >= Math.max(ctx.currentTime, t0) - 0.05) {
        // Instruments route through this track's own gain and reverb send.
        musicBus = gain;
        reverbIn = rev;
        try { ev.play(t, spb); } finally { musicBus = prevBus; reverbIn = prevRev; }
      }
      state.index += 1;
    }
  };
  schedule();
  state.timer = setInterval(schedule, 200);
  current = state;
}

function stopTrack() {
  if (!current) return;
  const { key, gain, rev, timer, spb, length, start } = current;
  clearInterval(timer);
  const now = ctx.currentTime;
  // Remember the bar we were in, to resume there next time.
  const beat = Math.max(0, (now - start) / spb) % length;
  resumeAt.set(key, Math.floor(beat / 4) * 4);
  for (const node of [gain, rev]) {
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(node.gain.value, now);
    node.gain.linearRampToValueAtTime(0, now + FADE_OUT);
  }
  setTimeout(() => { gain.disconnect(); rev.disconnect(); }, 3000);
  current = null;
}

let wantedMusic = null;
let ducked = false;
let unlocked = false;

export const Synth = {
  isUnlocked: () => unlocked,
  hasSfx: (cue) => cue in SFX,
  hasMusic: (cue) => cue in TRACKS,

  // Call once at boot: sound starts on the first user gesture.
  installUnlock() {
    const unlock = () => {
      if (!init()) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (unlocked) return;
      unlocked = true;
      if (wantedMusic) startTrack(wantedMusic);
    };
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, unlock, { capture: true });
  },

  sfx(cue) {
    if (!unlocked || !SFX[cue]) return;
    try { SFX[cue](ctx.currentTime + 0.01); } catch { /* sound must never break the game */ }
  },

  music(key) {
    if (wantedMusic === key && (current || !unlocked)) return;
    wantedMusic = key;
    if (!unlocked) return;
    const switching = !!current;
    stopTrack();
    if (key) startTrack(key, switching ? FADE_OUT : 0);
  },

  // Lower the music under the Oracle's scenes so her sounds sit clearly on top.
  duck(on) {
    if (!unlocked || ducked === on) return;
    ducked = on;
    const now = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(musicBus.gain.value, now);
    musicBus.gain.linearRampToValueAtTime(on ? MUSIC_LEVEL * 0.35 : MUSIC_LEVEL, now + 0.5);
  },

  stopMusic() {
    wantedMusic = null;
    if (unlocked) stopTrack();
  },
};
