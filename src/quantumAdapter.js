// Quantum adapter: the ONLY place the game talks to "quantum" functionality.
//
// This MVP build uses a classical simulation. To use real quantum hardware or
// Qollab's software, replace the bodies of these functions and keep the same
// signatures. Every function is async so network/hardware latency is fine;
// the game shows "The Oracle is consulting..." while a call is pending.
//
//   async generateTarget(excludedIndices: number[]) -> number   // 0-63
//   async runGroverIteration() -> {
//     iteration: number,             // current-run iteration count
//     probabilities: number[64],     // sums to 1
//     mostLikely: number,            // index of highest probability
//     amplitudes?: number[64],       // optional: signed amplitudes after this iteration
//     oracleAmplitudes?: number[64], // optional: amplitudes after the oracle step only
//   }
//   async measure() -> number        // measure all six qubits: a pot index 0-63
//   async resetGrover() -> void      // return to uniform superposition
//
// The optional amplitude fields drive the Oracle's bar-graph animation. A real
// backend that cannot provide them may omit them; the game then draws bars
// from the square roots of the probabilities.
//
// After measure(), the game always calls resetGrover() before any further
// iterations (a measurement destroys the superposition).

import { uniform, applyOracle, applyDiffusion, probabilities, argmax } from './sim/statevector.js';

const N = 64;

// Simulated latency so the "consulting" state is exercised during testing.
const SIMULATED_LATENCY_MS = { min: 350, max: 700 };

const sim = {
  target: null,
  amps: uniform(N),
  iteration: 0,
};

function delay() {
  const { min, max } = SIMULATED_LATENCY_MS;
  const ms = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Uniform random float in [0, 1) from the platform's secure generator
// (stand-in for a quantum random number generator).
function random01() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 4294967296;
}

function randomIndex(allowed) {
  const buf = new Uint32Array(1);
  // Rejection sampling avoids modulo bias.
  const limit = Math.floor(0x100000000 / allowed.length) * allowed.length;
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return allowed[buf[0] % allowed.length];
}

export async function generateTarget(excludedIndices) {
  await delay();
  const excluded = new Set(excludedIndices);
  const allowed = [];
  for (let i = 0; i < N; i++) if (!excluded.has(i)) allowed.push(i);
  if (allowed.length === 0) throw new Error('generateTarget: no allowed indices');
  sim.target = randomIndex(allowed);
  sim.amps = uniform(N);
  sim.iteration = 0;
  return sim.target;
}

export async function runGroverIteration() {
  await delay();
  if (sim.target === null) throw new Error('runGroverIteration: no target generated');
  const marked = applyOracle(sim.amps, sim.target);
  sim.amps = applyDiffusion(marked);
  sim.iteration += 1;
  const probs = probabilities(sim.amps);
  return {
    iteration: sim.iteration,
    probabilities: probs,
    mostLikely: argmax(probs),
    amplitudes: Array.from(sim.amps),
    oracleAmplitudes: Array.from(marked),
  };
}

export async function measure() {
  await delay();
  const probs = probabilities(sim.amps);
  let r = random01();
  for (let i = 0; i < N; i++) {
    r -= probs[i];
    if (r < 0) return i;
  }
  return N - 1; // floating-point remainder
}

export async function resetGrover() {
  await delay();
  sim.amps = uniform(N);
  sim.iteration = 0;
}
