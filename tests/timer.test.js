import { describe, it, expect } from 'vitest';
import { buildHoldSteps, buildCircuitSteps, buildRestSteps, initialState, reducer, workOutcomes, circuitSummary } from '../src/lib/timer';

const run = (state, actions) => actions.reduce(reducer, state);
const ticks = (n) => Array.from({ length: n }, () => ({ type: 'tick' }));

describe('hold sequence (the isometric counter)', () => {
  const steps = buildHoldSteps({ sets: 3, seconds: 5, rest: 2, countdown: 0 });
  it('records ALL 3 sets of a 3-set hold', () => {
    const s = run(initialState(steps), [{ type: 'start' }, ...ticks(5 + 2 + 5 + 2 + 5)]);
    expect(s.complete).toBe(true);
    const w = workOutcomes(s);
    expect(w.map((o) => o.ref.setIndex)).toEqual([0, 1, 2]);
    expect(w.every((o) => o.status === 'completed')).toBe(true);
  });
  it('builds work, rest, work, rest, work (no rest after the last)', () => {
    expect(steps.map((x) => x.kind)).toEqual(['work', 'rest', 'work', 'rest', 'work']);
  });
  it('a countdown precedes the first hold only', () => {
    expect(buildHoldSteps({ sets: 2, seconds: 5, rest: 2, countdown: 3 }).map((x) => x.kind)).toEqual(['countdown', 'work', 'rest', 'work']);
  });
  it('a natural countdown is not recorded as an outcome', () => {
    const st = buildHoldSteps({ sets: 1, seconds: 2, rest: 0, countdown: 2 });
    const s = run(initialState(st), [{ type: 'start' }, ...ticks(4)]);
    expect(s.complete).toBe(true);
    expect(s.outcomes.map((o) => o.kind)).toEqual(['work']);
  });
  it('per-side holds run 2 holds per set', () => {
    const st = buildHoldSteps({ sets: 2 * 2, seconds: 30, rest: 5 });
    expect(st.filter((x) => x.kind === 'work')).toHaveLength(4);
  });
});

describe('skip → Completed / Incomplete, and Undo', () => {
  const steps = buildHoldSteps({ sets: 2, seconds: 10, rest: 5 });
  it('skipping a hold as Incomplete is recorded as incomplete, with the time actually held', () => {
    let s = run(initialState(steps), [{ type: 'start' }, ...ticks(4), { type: 'skip', status: 'incomplete' }]);
    const o = s.outcomes[0];
    expect(o).toMatchObject({ kind: 'work', status: 'incomplete', planned: 10, elapsed: 4 });
    expect(s.steps[s.idx].kind).toBe('rest'); // moved on
  });
  it('skipping as Completed records completed', () => {
    const s = run(initialState(steps), [{ type: 'start' }, ...ticks(2), { type: 'skip', status: 'completed' }]);
    expect(s.outcomes[0].status).toBe('completed');
  });
  it('Undo puts the timer back and removes that outcome', () => {
    let s = run(initialState(steps), [{ type: 'start' }, ...ticks(3), { type: 'skip', status: 'incomplete' }]);
    expect(s.outcomes).toHaveLength(1);
    s = reducer(s, { type: 'undo' });
    expect(s.outcomes).toHaveLength(0);
    expect(s.idx).toBe(0);
    expect(s.remaining).toBe(7);
  });
  it('skipping a REST is a rest outcome — not a work outcome', () => {
    let s = run(initialState(steps), [{ type: 'start' }, ...ticks(10)]); // finish hold 1 → now resting
    expect(s.steps[s.idx].kind).toBe('rest');
    s = reducer(s, { type: 'skip', status: 'completed' });
    expect(s.outcomes.map((o) => o.kind)).toEqual(['work', 'rest']);
    expect(workOutcomes(s)).toHaveLength(1);
    expect(s.steps[s.idx].kind).toBe('work');
  });
  it('skipping a countdown is saved too', () => {
    const st = buildHoldSteps({ sets: 1, seconds: 5, rest: 0, countdown: 3 });
    const s = run(initialState(st), [{ type: 'start' }, { type: 'skip', status: 'completed' }]);
    expect(s.outcomes[0]).toMatchObject({ kind: 'countdown', status: 'completed' });
    expect(s.steps[s.idx].kind).toBe('work');
  });
});

describe('change break time', () => {
  it('+15 / −10 on a rest', () => {
    const st = buildRestSteps({ rest: 30 });
    let s = run(initialState(st), [{ type: 'start' }, ...ticks(5)]);
    expect(s.remaining).toBe(25);
    s = reducer(s, { type: 'addTime', seconds: 15 });
    expect(s.remaining).toBe(40);
    s = reducer(s, { type: 'addTime', seconds: -10 });
    expect(s.remaining).toBe(30);
  });
  it('removing more than is left ends the rest', () => {
    const st = buildRestSteps({ rest: 8 });
    const s = run(initialState(st), [{ type: 'start' }, { type: 'addTime', seconds: -15 }]);
    expect(s.complete).toBe(true);
  });
  it('pause stops the clock', () => {
    const st = buildRestSteps({ rest: 8 });
    const s = run(initialState(st), [{ type: 'start' }, ...ticks(2), { type: 'pause' }, ...ticks(3)]);
    expect(s.remaining).toBe(6);
  });
});

describe('circuit', () => {
  const steps = buildCircuitSteps({ rounds: 2, items: 3, work: 4, rest: 2 });
  it('walks rounds × moves', () => {
    expect(steps.filter((x) => x.kind === 'work')).toHaveLength(6);
  });
  it('summarises a clean run', () => {
    const s = run(initialState(steps), [{ type: 'start' }, ...ticks(6 * (4 + 2))]);
    expect(circuitSummary(s.outcomes, { rounds: 2, items: 3 })).toMatchObject({ roundsDone: 2, status: 'completed' });
  });
  it('skipping a move as Incomplete makes the circuit incomplete', () => {
    let s = run(initialState(steps), [{ type: 'start' }, { type: 'skip', status: 'incomplete' }]);
    s = run(s, ticks(5 * (4 + 2) + 2));
    const sum = circuitSummary(s.outcomes, { rounds: 2, items: 3 });
    expect(sum.status).toBe('incomplete');
    expect(sum.movesIncomplete).toBe(1);
    expect(sum.roundsDone).toBe(2);
  });
});
