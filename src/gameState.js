// Run state and the strict progression state machine.
// A fresh object is created for every playthrough (Play Again).

import { VERDICT } from './config.js';

export const PHASE = {
  INTRO: 'INTRO',
  ATTEMPT_1: 'ATTEMPT_1',
  ATTEMPT_2: 'ATTEMPT_2',
  ORACLE_INTRO: 'ORACLE_INTRO',
  MAIN_LOOP: 'MAIN_LOOP',
  ENDING: 'ENDING',
  RESULTS: 'RESULTS',
};

const NEXT = {
  [PHASE.INTRO]: PHASE.ATTEMPT_1,
  [PHASE.ATTEMPT_1]: PHASE.ATTEMPT_2,
  [PHASE.ATTEMPT_2]: PHASE.ORACLE_INTRO,
  [PHASE.ORACLE_INTRO]: PHASE.MAIN_LOOP,
  [PHASE.MAIN_LOOP]: PHASE.ENDING,
  [PHASE.ENDING]: PHASE.RESULTS,
};

// Display order for the Oracle's bars: a secret shuffle per run, so the bars
// show the shape of fate without revealing which pot each bar belongs to.
function shuffledOrder(n) {
  const a = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createRunState() {
  return {
    phase: PHASE.INTRO,
    carryingOffering: false,
    visits: 0,
    forcedPots: [],          // pots broken in the two forced attempts
    brokenPots: new Set(),   // every broken pot, preserved for the whole run
    target: null,            // generated exactly once, at the start of the main loop
    targetGenerated: false,
    groverTotal: 0,          // never resets
    groverRun: 0,            // current-run iterations; resets on measurement
    mainPots: 0,             // coin tosses (each opens one pot) in the main loop
    amplitudes: null,        // latest amplitudes for the Oracle's bars (null = even odds)
    probabilities: null,     // latest probabilities (null = even odds)
    barOrder: shuffledOrder(64),
    tutorialUnlocked: false,
    collapseExplained: false,
    busy: false,             // a quantum adapter call is in flight
  };
}

export function advancePhase(state, expectedFrom) {
  if (state.phase !== expectedFrom) {
    throw new Error(`Invalid phase transition from ${state.phase} (expected ${expectedFrom})`);
  }
  state.phase = NEXT[state.phase];
  return state.phase;
}

export function stats(state) {
  const forced = state.forcedPots.length;
  const mainActions = state.groverTotal + state.mainPots;
  return {
    forcedPots: forced,
    mainPots: state.mainPots,
    potsTotal: forced + state.mainPots,
    groverIterations: state.groverTotal,
    mainActions,
    totalActions: mainActions + forced,
  };
}

export function verdictFor(mainActions) {
  if (mainActions <= VERDICT.pleasedMax) return 'pleased';
  if (mainActions <= VERDICT.neutralMax) return 'neutral';
  return 'angry';
}
