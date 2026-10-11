// Tiny classical math for Grover search: a list of 64 real numbers and the
// closed-form effect of each step on them. This is not a quantum simulator
// (no qubits, gates, complex amplitudes or noise) and not Qiskit; it only
// reproduces the ideal numbers for a single marked item.
// Used by the classical quantum adapter, and by the teaching screens (the
// lesson, the Grover guide and the results chart), which use their own demo
// target and never touch the real one.

export function basisState(n, index) {
  const a = new Float64Array(n);
  a[index] = 1;
  return a;
}

// Hadamard on every qubit, starting from |00...0>: equal amplitude 1/sqrt(N).
export function uniform(n) {
  return new Float64Array(n).fill(1 / Math.sqrt(n));
}

// Phase oracle: flip the sign of the marked state's amplitude.
export function applyOracle(amps, target) {
  const out = Float64Array.from(amps);
  out[target] = -out[target];
  return out;
}

export function mean(amps) {
  let s = 0;
  for (const a of amps) s += a;
  return s / amps.length;
}

// Diffusion operator 2|s><s| - I: reflect every amplitude about the mean.
export function applyDiffusion(amps) {
  const m = mean(amps);
  return amps.map((a) => 2 * m - a);
}

export function probabilities(amps) {
  return Array.from(amps, (a) => a * a);
}

export function argmax(values) {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i;
  return best;
}

// Closed form P(target) after k iterations, for checking and charts.
export function successProbability(n, k) {
  const theta = Math.asin(1 / Math.sqrt(n));
  return Math.sin((2 * k + 1) * theta) ** 2;
}
