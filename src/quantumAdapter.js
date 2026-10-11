// Quantum adapter: the ONLY place the game talks to "quantum" functionality.
//
// WHAT THIS IS NOT: this file does not run Qiskit, does not call Qollab or
// any quantum computer, and is not a real quantum simulation. There are no
// qubits, gates or circuits here.
//
// WHAT IT IS: a classical stand-in written in plain JavaScript. It keeps 64
// ordinary numbers (one "amplitude" per pot) and changes them with the
// closed-form results of each Grover step (see sim/statevector.js):
//   - start / reset: every amplitude set to 1/8, the result a Hadamard on all
//     six qubits would give, written down directly rather than computed by gates
//   - oracle: the target's number is multiplied by -1 (this code simply knows
//     the target; a real oracle would be a circuit that recognises it)
//   - diffusion: every number a becomes 2m - a, where m is their average
//   - measurement: one pot is drawn at random, weighted by the squares
// For one marked item and no noise, these formulas give the same numbers as
// the ideal mathematics of Grover's algorithm. That is all this models.
// The project's real Qiskit implementation lives separately on Qollab and
// is not used by the game.
//
// To connect a real backend, replace the bodies of these functions and keep
// the same signatures. Every function is async so network/hardware latency is
// fine; the game shows "The Oracle is consulting..." while a call is pending.
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

// An artificial delay, so the "consulting" state behaves as it would with a
// real backend. Nothing is being computed during it.
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

// Uniform random float in [0, 1) from the browser's ordinary secure random
// generator. It stands in for a quantum random number generator; it is not one.
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
