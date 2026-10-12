import { describe, it, expect } from 'vitest';
import {
  effectiveEntry, effectiveCircuit, DEFAULT_SETTINGS, duplicatePlan, moveSession, swapSessions, swapDays,
  addEntry, removeEntry, reorderEntry, setEntryOverrides, newExerciseEntry, sessionsForDate, sessionKey, setPlanTiming,
} from '../src/lib/plan';

const ex = { id: 'plank', type: 'hold', sets: 3, seconds: 40, rest: 30, countdown: null, perSide: false };
const settings = { ...DEFAULT_SETTINGS, rest: 25, work: 45, countdown: 3 };
const plan = (extra = {}) => ({
  id: 'p1', name: 'P', timing: { countdown: null, work: null, rest: null },
  days: {
    sun: [{ id: 'main', name: { en: 'Upper' }, entries: [{ eid: 'a', kind: 'exercise', exerciseId: 'plank', overrides: {} }, { eid: 'b', kind: 'exercise', exerciseId: 'plank', overrides: {} }] }, { id: 'mob', optional: true, name: { en: 'Mob' }, entries: [] }],
    mon: [{ id: 'main', name: { en: 'Lower' }, entries: [] }],
    tue: [], wed: [], thu: [], fri: [], sat: [],
  },
  ...extra,
});

describe('effective timing precedence: entry > plan > exercise > global', () => {
  it('uses the exercise value when nothing overrides it', () => {
    expect(effectiveEntry({ overrides: {} }, ex, plan(), settings)).toMatchObject({ seconds: 40, rest: 30, countdown: 3, sets: 3 });
  });
  it('falls back to the global setting when the exercise has none', () => {
    const bare = { ...ex, rest: null, seconds: null };
    expect(effectiveEntry({ overrides: {} }, bare, plan(), settings)).toMatchObject({ rest: 25, seconds: 45 });
  });
  it('a plan-level rest overrides the exercise', () => {
    const p = setPlanTiming(plan(), { rest: 60 });
    expect(effectiveEntry({ overrides: {} }, ex, p, settings).rest).toBe(60);
  });
  it('an entry override beats the plan', () => {
    const p = setPlanTiming(plan(), { rest: 60 });
    expect(effectiveEntry({ overrides: { rest: 90, seconds: 55, sets: 4 } }, ex, p, settings)).toMatchObject({ rest: 90, seconds: 55, sets: 4 });
  });
  it('plan "work" only changes cardio intervals, not holds', () => {
    const p = setPlanTiming(plan(), { work: 20 });
    expect(effectiveEntry({ overrides: {} }, ex, p, settings).seconds).toBe(40);
    expect(effectiveEntry({ overrides: {} }, { ...ex, type: 'cardio', seconds: 40 }, p, settings).seconds).toBe(20);
  });
  it('per-exercise countdown, and plan countdown', () => {
    expect(effectiveEntry({ overrides: {} }, { ...ex, countdown: 0 }, plan(), settings).countdown).toBe(0);
    expect(effectiveEntry({ overrides: {} }, ex, setPlanTiming(plan(), { countdown: 10 }), settings).countdown).toBe(10);
  });
  it('per-side holds log 2 sets per set', () => {
    expect(effectiveEntry({ overrides: {} }, { ...ex, type: 'hold_side', sets: 2 }, plan(), settings).loggedSets).toBe(4);
  });
  it('circuit timing falls back plan → circuit → global', () => {
    const c = { rounds: 4, work: 40, rest: 20 };
    expect(effectiveCircuit(c, plan(), settings)).toMatchObject({ rounds: 4, work: 40, rest: 20 });
    expect(effectiveCircuit(c, setPlanTiming(plan(), { rest: 10 }), settings).rest).toBe(10);
  });
});

describe('plan editing', () => {
  it('duplicate gives a new id and an independent copy', () => {
    const p = plan();
    const d = duplicatePlan(p, 'Copy');
    expect(d.id).not.toBe(p.id);
    expect(d.name).toBe('Copy');
    const edited = addEntry(d, 'sun', 'main', newExerciseEntry('x'));
    expect(p.days.sun[0].entries).toHaveLength(2);
    expect(edited.days.sun[0].entries).toHaveLength(3);
  });
  it('add / remove / reorder / override entries', () => {
    let p = addEntry(plan(), 'sun', 'main', { eid: 'c', kind: 'exercise', exerciseId: 'y', overrides: {} }, 0);
    expect(p.days.sun[0].entries.map((e) => e.eid)).toEqual(['c', 'a', 'b']);
    p = reorderEntry(p, 'sun', 'main', 0, 2);
    expect(p.days.sun[0].entries.map((e) => e.eid)).toEqual(['a', 'b', 'c']);
    p = removeEntry(p, 'sun', 'main', 'b');
    expect(p.days.sun[0].entries.map((e) => e.eid)).toEqual(['a', 'c']);
    p = setEntryOverrides(p, 'sun', 'main', 'a', { sets: 5, rest: 45 });
    expect(p.days.sun[0].entries[0].overrides).toEqual({ sets: 5, rest: 45 });
    p = setEntryOverrides(p, 'sun', 'main', 'a', { rest: '' });
    expect(p.days.sun[0].entries[0].overrides).toEqual({ sets: 5 });
  });
  it('move a session to another day', () => {
    const p = moveSession(plan(), 'sun', 'main', 'tue');
    expect(p.days.sun.map((s) => s.id)).toEqual(['mob']);
    expect(p.days.tue.map((s) => s.id)).toEqual(['main']);
  });
  it('moving onto a day that has the same session id keeps ids unique', () => {
    const p = moveSession(plan(), 'sun', 'main', 'mon');
    const ids = p.days.mon.map((s) => s.id);
    expect(new Set(ids).size).toBe(2);
  });
  it('swap sessions between days, and swap whole days', () => {
    let p = swapSessions(plan(), 'sun', 'main', 'mon', 'main');
    expect(p.days.sun[0].name.en).toBe('Lower');
    expect(p.days.mon[0].name.en).toBe('Upper');
    p = swapDays(plan(), 'sun', 'mon');
    expect(p.days.sun.map((s) => s.id)).toEqual(['main']);
    expect(p.days.mon.map((s) => s.id)).toEqual(['main', 'mob']);
  });
});

describe('doing any workout on any day', () => {
  const p = plan();
  const plans = new Map([[p.id, p]]);
  it('shows the weekday’s own sessions', () => {
    const list = sessionsForDate('2025-01-05', p, plans, {}); // Sunday
    expect(list.map((i) => i.sessionId)).toEqual(['main', 'mob']);
    expect(list[0].key).toBe(sessionKey('2025-01-05', 'p1', 'sun', 'main'));
  });
  it('adds another day’s session on top, linked to its template', () => {
    const extras = { sessions: [{ planId: 'p1', day: 'mon', sessionId: 'main' }] };
    const list = sessionsForDate('2025-01-05', p, plans, extras);
    const extra = list.find((i) => i.source === 'extra');
    expect(extra).toMatchObject({ tplDay: 'mon', sessionId: 'main', date: '2025-01-05' });
    expect(extra.key).toBe('2025-01-05|p1|mon|main');
    expect(list.map((i) => i.key)).toHaveLength(3);
  });
  it('quick-add exercises appear as a free session that belongs to no plan', () => {
    const extras = { quick: [{ eid: 'q1', exerciseId: 'pushup' }] };
    const q = sessionsForDate('2025-01-05', p, plans, extras).find((i) => i.source === 'quick');
    expect(q.planId).toBeNull();
    expect(q.session.entries[0].exerciseId).toBe('pushup');
  });
  it('a reference to a deleted plan is ignored, not a crash', () => {
    const list = sessionsForDate('2025-01-05', p, plans, { sessions: [{ planId: 'gone', day: 'mon', sessionId: 'x' }] });
    expect(list).toHaveLength(2);
  });
  it('stick drills show only the chosen level', () => {
    const stick = { ...p, days: { ...p.days, sun: [{ id: 'st', name: { en: 'Stick' }, entries: [{ eid: 'a@L1', kind: 'exercise', exerciseId: 'a', level: 1 }, { eid: 'b@L2', kind: 'exercise', exerciseId: 'b', level: 2 }] }] } };
    const l2 = sessionsForDate('2025-01-05', stick, new Map(), {}, { stickLevel: 2 })[0];
    expect(l2.session.entries.map((e) => e.eid)).toEqual(['b@L2']);
  });
});
