// Plan switching, doing another day's workout, quick-add, and the boot-time v1 → v2 migration,
// all through the real DataProvider (only the network is faked).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';

vi.mock('../src/lib/api', async () => {
  const { createFakeServer } = await import('./helpers/fakeServer');
  const fake = createFakeServer();
  globalThis.__fake = fake;
  return fake.api;
});

import { DataProvider, useData } from '../src/context/DataContext';
import { duplicatePlan, setEntryOverrides, sessionKey, itemKey } from '../src/lib/plan';
import { totals, weeklySessionStats, streaks } from '../src/lib/stats';
import { buildWorkItem, buildSessionSnapshot } from '../src/lib/logStore';

let ctx;
function Probe() {
  ctx = useData();
  return null;
}
async function boot() {
  render(
    <DataProvider>
      <Probe />
    </DataProvider>
  );
  for (let i = 0; i < 20 && (!ctx || ctx.booting); i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20);
    });
  }
  expect(ctx.booting).toBe(false);
}
const run = (fn) => act(async () => { await fn(); await vi.advanceTimersByTimeAsync(5); });

describe('data context', () => {
  beforeEach(() => {
    globalThis.__fake.reset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-05T09:00:00Z')); // Sunday in Riyadh
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('seeds the default plan once, keeping the existing workouts and adding the optional PDF add-ons', async () => {
    await boot();
    expect(ctx.plans.map((p) => p.id)).toEqual(['default']);
    const sunday = ctx.activePlan.days.sun;
    expect(sunday.map((s) => s.id)).toEqual(['breath_am', 'main', 'mob_b', 'stick_rot', 'breath_pm']);
    expect(sunday.find((s) => s.id === 'main').entries).toHaveLength(6);
    expect(globalThis.__fake.db.plans).toHaveLength(1);
  });

  it('plan switching: a duplicated, edited plan can be made active and drives what is shown', async () => {
    await boot();
    const copy = setEntryOverrides(duplicatePlan(ctx.activePlan, 'Heavy'), 'sun', 'main', 'b0', { sets: 5 });
    await run(() => ctx.savePlan(copy, 1));
    expect(ctx.plans).toHaveLength(2);
    expect(ctx.activePlan.id).toBe('default'); // saving a plan doesn't switch to it

    await run(() => ctx.updateSettings({ activePlanId: copy.id }));
    expect(ctx.activePlan.name).toBe('Heavy');
    const main = ctx.instancesForDate(ctx.date).find((i) => i.sessionId === 'main');
    expect(ctx.resolveEntry(main.session.entries[0], main.plan).eff.sets).toBe(5);

    // switching back leaves the original untouched
    await run(() => ctx.updateSettings({ activePlanId: 'default' }));
    const orig = ctx.instancesForDate(ctx.date).find((i) => i.sessionId === 'main');
    expect(ctx.resolveEntry(orig.session.entries[0], orig.plan).eff.sets).toBe(3);
  });

  it('does another day’s workout today, linked to its template, and statistics count it for that slot', async () => {
    await boot();
    // today is Sunday; add MONDAY's main session on top
    await run(() => ctx.addSessionToDay(ctx.date, { planId: 'default', day: 'mon', sessionId: 'main' }));
    const list = ctx.instancesForDate(ctx.date);
    expect(list.map((i) => `${i.tplDay}:${i.sessionId}`)).toContain('mon:main');

    const mon = list.find((i) => i.tplDay === 'mon' && i.sessionId === 'main');
    const { snapshotEntries } = await import('../src/lib/plan');
    const snap = buildSessionSnapshot(mon, snapshotEntries(mon.session, mon.plan, ctx.library.byId, ctx.settings));
    for (const [entryIdx, entry] of mon.session.entries.entries()) {
      const { exercise, eff } = ctx.resolveEntry(entry, mon.plan);
      for (let s = 0; s < eff.loggedSets; s++) {
        ctx.store.setItem(buildWorkItem({ inst: mon, entryKey: entry.eid, setIndex: s, exercise, eff }), snap);
      }
      void entryIdx;
    }
    await ctx.store.flush();

    const db = globalThis.__fake.db;
    const saved = [...db.items.values()];
    expect(saved.every((i) => i.date === '2025-01-05' && i.session_key === '2025-01-05|default|mon|main')).toBe(true);
    expect([...db.sessions.values()][0]).toMatchObject({ tpl_day: 'mon', session_id: 'main', date: '2025-01-05' });

    const sessions = [...ctx.log.sessions.values()];
    const items = [...ctx.log.items.values()];
    const [week] = weeklySessionStats({ sessions, items, plan: ctx.activePlan, today: '2025-01-05', weekStart: 0, from: '2025-01-05', to: '2025-01-05' });
    const slot = week.slots.find((x) => x.tplDay === 'mon' && x.sessionId === 'main');
    expect(slot.status).toBe('completed'); // Monday's slot satisfied on Sunday
    expect(week.slots.find((x) => x.tplDay === 'sun' && x.sessionId === 'main').status).toBe('missed');
    expect(streaks(items, '2025-01-05').current).toBe(1);
  });

  it('quick-add: a free exercise is logged and counted in the statistics', async () => {
    await boot();
    await run(() => ctx.addQuickExercise(ctx.date, 'pushup'));
    const quick = ctx.instancesForDate(ctx.date).find((i) => i.source === 'quick');
    expect(quick.key).toBe(sessionKey('2025-01-05', null, null, 'quick'));
    const entry = quick.session.entries[0];
    const { exercise, eff } = ctx.resolveEntry(entry, null);
    const snap = buildSessionSnapshot(quick, []);
    ctx.store.setItem(buildWorkItem({ inst: quick, entryKey: entry.eid, setIndex: 0, exercise, eff, weight: null }), snap);
    await ctx.store.flush();

    const t = totals([...ctx.log.items.values()], { secondsPerRep: 3 });
    expect(t.sets).toBe(1);
    expect(t.completed).toBe(1);
    expect(globalThis.__fake.db.items.has(itemKey(quick.key, entry.eid, 0))).toBe(true);
  });

  it('migrates v1 history into the session log on boot, once, without touching the originals', async () => {
    const db = globalThis.__fake.db;
    db.settings = {}; // a v1 account
    db.legacy = {
      sets: [
        { day_id: 'sun', block_index: 0, set_index: 0, date: '2025-01-01', weight: 20, hold_seconds: null, completed_at: '2025-01-01T08:00:00Z' },
        { day_id: 'sun', block_index: 5, set_index: 0, date: '2025-01-01', weight: null, hold_seconds: 40, completed_at: '2025-01-01T08:10:00Z' },
      ],
      circuits: [],
    };
    await boot();
    expect(db.items.size).toBe(2);
    expect(db.settings.schemaVersion).toBe(2);
    expect(db.settings.migratedCounts).toEqual({ sessions: 1, items: 2 });
    expect(db.legacy.sets).toHaveLength(2); // v1 records untouched
    expect(ctx.migration).toEqual({ sessions: 1, items: 2 });
    const bench = [...ctx.log.items.values()].find((i) => i.exercise_id === 'bench_press');
    expect(bench).toMatchObject({ weight: 20, status: 'completed', date: '2025-01-01' });
  });

  it('does not migrate again once schemaVersion is 2', async () => {
    const db = globalThis.__fake.db;
    db.legacy = { sets: [{ day_id: 'sun', block_index: 0, set_index: 0, date: '2025-01-01', weight: 20 }], circuits: [] };
    await boot(); // schemaVersion already 2 in the fake server's default
    expect(db.items.size).toBe(0);
  });

  it('editing an exercise changes future sessions only — a logged snapshot keeps the old values', async () => {
    await boot();
    const sun = ctx.instancesForDate(ctx.date).find((i) => i.sessionId === 'main');
    const { snapshotEntries } = await import('../src/lib/plan');
    const before = snapshotEntries(sun.session, sun.plan, ctx.library.byId, ctx.settings);
    expect(before[0]).toMatchObject({ exerciseId: 'bench_press', sets: 3, reps: 12 });

    await run(() => ctx.saveExercise({ ...ctx.library.byId.get('bench_press'), sets: 5, reps: 8, name: { en: 'Bench (heavy)', ar: '' } }));
    const afterEx = ctx.library.byId.get('bench_press');
    expect(afterEx).toMatchObject({ sets: 5, reps: 8, edited: true });
    const sun2 = ctx.instancesForDate(ctx.date).find((i) => i.sessionId === 'main');
    expect(ctx.resolveEntry(sun2.session.entries[0], sun2.plan).eff.sets).toBe(5);
    // the snapshot taken earlier is a plain object — it is unchanged
    expect(before[0]).toMatchObject({ sets: 3, reps: 12, name: { en: 'Dumbbell Bench Press' } });
  });
});
