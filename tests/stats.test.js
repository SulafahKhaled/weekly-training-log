// Statistics are computed from the session log only. This test uses a small FIXED log
// whose numbers can be checked by hand — the expected values are derived in the comments.
import { describe, it, expect } from 'vitest';
import { totals, streaks, weeklySessionStats, sessionResult, exerciseHistory, dailySummary } from '../src/lib/stats';

const S = (key, date, tplDay, sessionId, optional, planned) => ({ session_key: key, date, plan_id: 'p', tpl_day: tplDay, session_id: sessionId, name_en: sessionId, optional, planned });
const W = (sKey, date, entry, set, ex, type, status, extra = {}) => ({
  item_key: `${sKey}|${entry}|${set}`, session_key: sKey, date, entry_key: entry, set_index: set,
  exercise_id: ex, exercise_name: ex, ex_type: type, kind: 'work', status,
  planned_reps: null, planned_seconds: null, reps_done: null, weight: null, hold_seconds: null, rounds: null, duration_seconds: null, ...extra,
});
const R = (sKey, date, n, status) => ({ item_key: `${sKey}|e|rest${n}`, session_key: sKey, date, entry_key: 'e', set_index: n, kind: 'rest', status });

// Active plan: Sun → A (required) · Mon → B (required), M (optional) · Tue → C (required)
const plan = {
  id: 'p',
  days: {
    sun: [{ id: 'A', optional: false }],
    mon: [{ id: 'B', optional: false }, { id: 'M', optional: true }],
    tue: [{ id: 'C', optional: false }],
    wed: [], thu: [], fri: [], sat: [],
  },
};

const sessions = [
  S('A1', '2025-01-05', 'sun', 'A', false, [{ eid: 'bench', kind: 'exercise', loggedSets: 3 }, { eid: 'plank', kind: 'exercise', loggedSets: 3 }]),
  S('B1', '2025-01-06', 'mon', 'B', false, [{ eid: 'squat', kind: 'exercise', loggedSets: 3 }]),
  // Tuesday's session C done on MONDAY — must still satisfy Tuesday's slot
  S('C1', '2025-01-06', 'tue', 'C', false, [{ eid: 'lunge', kind: 'exercise', loggedSets: 2 }]),
  // Monday's optional mobility done on WEDNESDAY
  S('M1', '2025-01-08', 'mon', 'M', true, [{ eid: 'hip', kind: 'exercise', loggedSets: 1 }]),
  S('Q1', '2025-01-06', null, 'quick', true, []),
];

const items = [
  W('A1', '2025-01-05', 'bench', 0, 'bench', 'reps', 'completed', { reps_done: 12, weight: 20 }),
  W('A1', '2025-01-05', 'bench', 1, 'bench', 'reps', 'completed', { reps_done: 12, weight: 20 }),
  W('A1', '2025-01-05', 'bench', 2, 'bench', 'reps', 'completed', { reps_done: 12, weight: 22.5 }),
  W('A1', '2025-01-05', 'plank', 0, 'plank', 'hold', 'completed', { hold_seconds: 40, planned_seconds: 40 }),
  W('A1', '2025-01-05', 'plank', 1, 'plank', 'hold', 'completed', { hold_seconds: 40, planned_seconds: 40 }),
  W('A1', '2025-01-05', 'plank', 2, 'plank', 'hold', 'incomplete', { hold_seconds: 25, planned_seconds: 40 }),
  R('A1', '2025-01-05', 1, 'completed'),
  R('A1', '2025-01-05', 2, 'incomplete'),
  R('A1', '2025-01-05', 3, 'skipped'), // a skipped REST…
  W('B1', '2025-01-06', 'squat', 0, 'squat', 'reps', 'completed', { reps_done: 15 }),
  W('B1', '2025-01-06', 'squat', 1, 'squat', 'reps', 'completed', { reps_done: 15 }),
  W('B1', '2025-01-06', 'squat', 2, 'squat', 'reps', 'completed', { reps_done: 15 }),
  W('C1', '2025-01-06', 'lunge', 0, 'lunge', 'reps', 'completed', { reps_done: 10 }),
  W('C1', '2025-01-06', 'lunge', 1, 'lunge', 'reps', 'completed', { reps_done: 10 }),
  W('Q1', '2025-01-06', 'pushup', 0, 'pushup', 'reps', 'skipped'), // …must NOT be confused with a skipped EXERCISE
  W('M1', '2025-01-08', 'hip', 0, 'hip', 'reps', 'completed', { reps_done: 3, duration_seconds: 60 }),
];

const today = '2025-01-08'; // a Wednesday

describe('totals', () => {
  const t = totals(items, { secondsPerRep: 3 });
  it('counts completed / incomplete / skipped WORK items', () => {
    expect(t.completed).toBe(11); // 3 bench + 2 plank + 3 squat + 2 lunge + 1 hip
    expect(t.incomplete).toBe(1); // plank set 3
    expect(t.skipped).toBe(1); // the pushup
  });
  it('never counts a skipped rest as a skipped exercise', () => {
    expect(t.skipped).toBe(1);
    expect(t.restsSkipped).toBe(1);
    expect(t.restsCompleted).toBe(1);
    expect(t.restsIncomplete).toBe(1);
  });
  it('totals sets, reps and hold time from COMPLETED items only', () => {
    expect(t.sets).toBe(11);
    expect(t.reps).toBe(36 + 45 + 20 + 3); // 104
    expect(t.holdSeconds).toBe(80); // the incomplete 25 s hold is excluded
  });
  it('time trained = real seconds where known, else an estimate', () => {
    // bench 36 reps×3=108 (est) + plank 80 + squat 45×3=135 (est) + lunge 20×3=60 (est) + hip 60 (timed)
    expect(t.timeSeconds).toBe(108 + 80 + 135 + 60 + 60);
    expect(t.timeIsEstimate).toBe(true);
  });
});

describe('sessions', () => {
  const of = (key) => sessionResult(sessions.find((s) => s.session_key === key), items.filter((i) => i.session_key === key));
  it('completed / partial', () => {
    expect(of('A1')).toMatchObject({ status: 'partial', completed: 5, units: 6 });
    expect(of('B1').status).toBe('completed');
    expect(of('C1').status).toBe('completed');
    expect(of('M1').status).toBe('completed');
    expect(of('Q1').status).toBe('partial'); // touched, nothing completed
  });
});

describe('weekly sessions: completed vs planned', () => {
  const weeks = weeklySessionStats({ sessions, items, plan, today, weekStart: 0, from: '2025-01-05', to: '2025-01-18' });
  const w1 = weeks[0];
  it('weeks start on Sunday', () => {
    expect(w1.weekStart).toBe('2025-01-05');
    expect(w1.weekEnd).toBe('2025-01-11');
    expect(weeks[1].weekStart).toBe('2025-01-12');
  });
  it('planned = required sessions; completion % is against what is due so far', () => {
    expect(w1.planned).toBe(3); // A, B, C
    expect(w1.plannedDue).toBe(3); // Sun, Mon, Tue are all ≤ Wed
    expect(w1.completed).toBe(2); // B and C (A only partial)
    expect(w1.completionPct).toBe(67);
  });
  it('a session done on another day satisfies its own slot (C was done on Monday)', () => {
    const c = w1.slots.find((s) => s.sessionId === 'C');
    expect(c.status).toBe('completed');
    expect(c.date).toBe('2025-01-07'); // its planned date is Tuesday
  });
  it('optional sessions are tracked separately and never inflate required counts', () => {
    expect(w1.optionalPlanned).toBe(1);
    expect(w1.optionalCompleted).toBe(1);
  });
  it('a future week has nothing due yet', () => {
    expect(weeks[1].planned).toBe(3);
    expect(weeks[1].plannedDue).toBe(0);
    expect(weeks[1].completionPct).toBeNull();
  });
  it('weekStart is configurable (Monday-start week containing Wed 08)', () => {
    const m = weeklySessionStats({ sessions, items, plan, today, weekStart: 1, from: '2025-01-08', to: '2025-01-08' });
    expect(m[0].weekStart).toBe('2025-01-06');
  });
  it('dates before the first logged date are not counted as missed', () => {
    const early = weeklySessionStats({ sessions, items, plan, today, weekStart: 0, from: '2024-12-29', to: '2025-01-04' });
    expect(early[0].planned).toBe(0);
  });
});

describe('streaks', () => {
  it('current and best, from days with a completed item', () => {
    // training days: Jan 5, 6 and 8
    expect(streaks(items, '2025-01-08')).toEqual({ current: 1, best: 2, trainingDays: 3 });
  });
  it('current streak survives "today not trained yet"', () => {
    expect(streaks(items, '2025-01-07').current).toBe(2); // 6th, 5th
  });
  it('broken streak resets current to 0', () => {
    expect(streaks(items, '2025-01-10').current).toBe(0);
  });
});

describe('per-exercise history and personal bests', () => {
  it('bench: top weight is the PB', () => {
    const h = exerciseHistory(items, 'bench');
    expect(h.sessions).toEqual([{ date: '2025-01-05', sets: 3, reps: 36, topWeight: 22.5, bestHold: null, totalHold: 0, rounds: null }]);
    expect(h.pb.weight).toEqual({ value: 22.5, date: '2025-01-05' });
  });
  it('plank: best hold ignores the incomplete set', () => {
    const h = exerciseHistory(items, 'plank');
    expect(h.sessions[0].sets).toBe(2);
    expect(h.pb.hold).toEqual({ value: 40, date: '2025-01-05' });
  });
});

describe('daily summary tiers', () => {
  it('missed / partial / full', () => {
    const d = dailySummary(sessions, items, '2025-01-05', '2025-01-08');
    expect(d.map((x) => x.tier)).toEqual(['partial', 'full', 'missed', 'full']);
  });
});
