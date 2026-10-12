import { describe, it, expect } from 'vitest';
import { migrateLegacyLogs, CURRENT_SCHEMA_VERSION } from '../src/lib/migrate';
import { buildDefaultPlan } from '../src/data/defaultPlan';
import { builtinLibrary } from '../src/data/library';
import { DEFAULT_SETTINGS } from '../src/lib/plan';

const plan = buildDefaultPlan();
const byId = new Map(builtinLibrary().map((e) => [e.id, e]));
const legacy = {
  sets: [
    { day_id: 'sun', block_index: 0, set_index: 0, date: '2025-01-05', weight: 20, hold_seconds: null, completed_at: '2025-01-05T08:00:00Z' },
    { day_id: 'sun', block_index: 0, set_index: 1, date: '2025-01-05', weight: 22.5, hold_seconds: null, completed_at: '2025-01-05T08:02:00Z' },
    { day_id: 'sun', block_index: 5, set_index: 0, date: '2025-01-05', weight: null, hold_seconds: 40, completed_at: '2025-01-05T08:10:00Z' },
    { day_id: 'mon', block_index: 4, set_index: 2, date: '2025-01-06', weight: null, hold_seconds: null, completed_at: '2025-01-06T08:00:00Z' },
    { day_id: 'nope', block_index: 0, set_index: 0, date: '2025-01-06', weight: null, hold_seconds: null },
  ],
  circuits: [{ day_id: 'tue', block_index: 0, date: '2025-01-07', rounds_completed: 4, completed_at: '2025-01-07T08:00:00Z' }],
};

describe('v1 → v2 migration', () => {
  const out = migrateLegacyLogs(legacy, plan, byId, DEFAULT_SETTINGS);
  it('is a versioned migration', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(2);
  });
  it('attaches every v1 set to the right exercise, with weight and hold seconds intact', () => {
    const bench = out.items.filter((i) => i.exercise_id === 'bench_press');
    expect(bench.map((i) => [i.set_index, i.weight])).toEqual([[0, 20], [1, 22.5]]);
    const plank = out.items.find((i) => i.exercise_id === 'plank');
    expect(plank).toMatchObject({ hold_seconds: 40, ex_type: 'hold', status: 'completed', source: 'legacy' });
    expect(out.items.find((i) => i.exercise_id === 'jump_squats').date).toBe('2025-01-06');
  });
  it('maps a circuit log to one item with its rounds', () => {
    const c = out.items.find((i) => i.exercise_id === 'circuit_tue');
    expect(c).toMatchObject({ rounds: 4, ex_type: 'cardio', set_index: 0 });
  });
  it('creates one session snapshot per (date, day), linked to the default plan template', () => {
    expect(out.sessions.map((s) => s.session_key).sort()).toEqual([
      '2025-01-05|default|sun|main', '2025-01-06|default|mon|main', '2025-01-07|default|tue|main',
    ]);
    const sun = out.sessions.find((s) => s.tpl_day === 'sun');
    expect(sun).toMatchObject({ plan_id: 'default', session_id: 'main', optional: false });
    expect(sun.planned.length).toBe(6);
    expect(sun.planned.reduce((n, e) => n + e.loggedSets, 0)).toBe(3 * 4 + 2 + 3); // 3×12 + 2×10 + 3 holds — sets per block
  });
  it('skips rows it cannot place instead of guessing (they stay in the v1 table)', () => {
    expect(out.items.some((i) => i.item_key.includes('nope'))).toBe(false);
    expect(out.items).toHaveLength(5);
  });
  it('is idempotent: running it twice yields identical keys', () => {
    const again = migrateLegacyLogs(legacy, plan, byId, DEFAULT_SETTINGS);
    expect(again.items.map((i) => i.item_key)).toEqual(out.items.map((i) => i.item_key));
  });
});
