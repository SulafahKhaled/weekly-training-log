/* =========================================================
   Timer state machine — pure (no React, no timers, no I/O).

   One machine drives every timer in the app: a hold sequence (3 sets of a plank),
   a HIIT circuit, a lone rest between sets. It is a list of STEPS the clock walks
   through; a UI hook ticks it once a second and persists its OUTCOMES.

   Why this exists: the old per-component timers mutated progress from inside a
   setState updater using a stale closure, so completing set 1, 2 and 3 each
   overwrote the previous one and only the last survived (see tests/isometric.test.jsx).
   Here the machine only ever appends to `outcomes`; the caller persists each
   outcome exactly once, from an effect, through the log store.

   Step     { kind:'countdown'|'work'|'rest', seconds, total, ref }
   Outcome  { kind:'work'|'rest'|'countdown', ref, status:'completed'|'incomplete', planned, elapsed }
   ========================================================= */

export const STEP = { COUNTDOWN: 'countdown', WORK: 'work', REST: 'rest' };

const step = (kind, seconds, ref = {}) => ({ kind, seconds, total: seconds, ref });

/** A run of `sets` holds / interval works with a rest between (none after the last). */
export function buildHoldSteps({ sets, seconds, rest, countdown = 0 }) {
  const steps = [];
  if (countdown > 0) steps.push(step(STEP.COUNTDOWN, countdown, { setIndex: 0 }));
  for (let i = 0; i < sets; i++) {
    steps.push(step(STEP.WORK, seconds, { setIndex: i }));
    if (i < sets - 1 && rest > 0) steps.push(step(STEP.REST, rest, { setIndex: i }));
  }
  return steps;
}

/** `rounds` × `items` of work + rest. Matches the legacy circuit: a rest follows EVERY move, including the last. */
export function buildCircuitSteps({ rounds, items, work, rest, countdown = 0 }) {
  const steps = [];
  if (countdown > 0) steps.push(step(STEP.COUNTDOWN, countdown, { round: 0, item: 0 }));
  for (let r = 0; r < rounds; r++) {
    for (let j = 0; j < items; j++) {
      steps.push(step(STEP.WORK, work, { round: r, item: j }));
      if (rest > 0) steps.push(step(STEP.REST, rest, { round: r, item: j }));
    }
  }
  return steps;
}

/** A single rest between two sets of a rep-based exercise. */
export function buildRestSteps({ rest, setIndex = 0 }) {
  return [step(STEP.REST, rest, { setIndex })];
}

export function initialState(steps) {
  return {
    steps,
    idx: 0,
    remaining: steps[0] ? steps[0].seconds : 0,
    running: false,
    started: false,
    complete: steps.length === 0,
    outcomes: [],
    undo: null, // snapshot taken just before the last skip, for Undo
  };
}

const withoutUndo = (s) => ({ ...s, undo: null });

function outcomeFor(s, status) {
  const st = s.steps[s.idx];
  const elapsed = Math.max(0, st.total - s.remaining);
  return { kind: st.kind, ref: st.ref, status, planned: st.total, elapsed };
}

/** Closes the current step with an outcome (or none) and moves to the next one. */
function finishStep(s, status, { natural = false } = {}) {
  const st = s.steps[s.idx];
  // A countdown is "get ready", not work: when it simply runs out nothing is recorded.
  // Only an explicit Skip (the user answered Completed/Incomplete) is saved.
  const outcomes = natural && st.kind === STEP.COUNTDOWN ? s.outcomes : [...s.outcomes, outcomeFor(s, status)];
  const nextIdx = s.idx + 1;
  if (nextIdx >= s.steps.length) {
    return { ...s, outcomes, idx: s.steps.length - 1, remaining: 0, running: false, complete: true };
  }
  return { ...s, outcomes, idx: nextIdx, remaining: s.steps[nextIdx].seconds };
}

export function reducer(state, action) {
  switch (action.type) {
    case 'start': {
      if (state.complete) return { ...initialState(state.steps), running: true, started: true };
      return { ...state, running: true, started: true };
    }
    case 'pause':
      return { ...state, running: false };
    case 'toggle':
      return reducer(state, { type: state.running ? 'pause' : 'start' });
    case 'tick': {
      if (!state.running || state.complete) return state;
      const remaining = state.remaining - 1;
      if (remaining > 0) return { ...state, remaining };
      return withoutUndo(finishStep({ ...state, remaining: 0 }, 'completed', { natural: true }));
    }
    case 'addTime': {
      // ±10 / ±15 s on whatever step is running; taking it to 0 or below ends the step normally
      if (state.complete) return state;
      const st = state.steps[state.idx];
      const remaining = state.remaining + action.seconds;
      if (remaining <= 0) return withoutUndo(finishStep({ ...state, remaining: 0 }, 'completed', { natural: true }));
      const steps = state.steps.map((x, i) => (i === state.idx ? { ...x, total: Math.max(x.total, st.total + action.seconds, remaining) } : x));
      return { ...state, steps, remaining };
    }
    case 'skip': {
      // The caller asks "Completed or Incomplete?" first; this carries the answer.
      if (state.complete) return state;
      const status = action.status === 'incomplete' ? 'incomplete' : 'completed';
      const snapshot = withoutUndo(state);
      return { ...finishStep(state, status), undo: snapshot };
    }
    case 'undo':
      return state.undo ? { ...state.undo, running: false } : state;
    case 'reset':
      return initialState(state.steps);
    case 'restart':
      return { ...initialState(state.steps), running: true, started: true };
    default:
      return state;
  }
}

export const currentStep = (s) => s.steps[s.idx] || null;

/* ---------- derived views ---------- */

/** Work outcomes only — rests and countdowns never count as exercise results. */
export const workOutcomes = (s) => s.outcomes.filter((o) => o.kind === STEP.WORK);

/** Summary of a circuit run from its outcomes. */
export function circuitSummary(outcomes, { rounds, items }) {
  const work = outcomes.filter((o) => o.kind === STEP.WORK);
  const incomplete = work.filter((o) => o.status === 'incomplete').length;
  const perRound = new Map();
  for (const o of work) perRound.set(o.ref.round, (perRound.get(o.ref.round) || 0) + 1);
  let roundsDone = 0;
  for (let r = 0; r < rounds; r++) if ((perRound.get(r) || 0) >= items) roundsDone++;
  return { roundsDone, movesDone: work.length - incomplete, movesIncomplete: incomplete, status: incomplete === 0 && roundsDone === rounds ? 'completed' : 'incomplete' };
}
