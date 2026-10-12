/* =========================================================
   Versioned data migration: v1 (set_logs / circuit_logs, addressed by
   day + block index) → v2 (session log, addressed by session + exercise).

   Non-destructive and idempotent:
     - the v1 tables are never altered or deleted (they stay in the database
       and in every backup file);
     - every v2 row is keyed deterministically, so running this twice (or
       importing the same backup twice) upserts onto the same rows.
   ========================================================= */
import { DAYS } from '../data/days';
import { LEGACY_BLOCKS, DEFAULT_PLAN_ID, MAIN_SESSION_ID, legacyEntryId } from '../data/legacyMap';
import { sessionKey, itemKey, snapshotEntries } from './plan';

export const CURRENT_SCHEMA_VERSION = 2;

const TYPE_MAP = { resistance: 'reps', isometric: 'hold', circuit: 'cardio' };

/**
 * @param legacy   { sets:[{day_id,block_index,set_index,date,weight,hold_seconds,completed_at}], circuits:[…] }
 * @param plan     the default plan (its `main` session per weekday is what v1 logged against)
 * @param byId     Map<exerciseId, exercise> for names / effective values
 */
export function migrateLegacyLogs(legacy, plan, byId, settings) {
  const sessions = new Map();
  const items = [];

  const ensureSession = (date, dayId) => {
    const key = sessionKey(date, DEFAULT_PLAN_ID, dayId, MAIN_SESSION_ID);
    if (!sessions.has(key)) {
      const tpl = plan.days[dayId]?.find((s) => s.id === MAIN_SESSION_ID);
      const day = DAYS.find((d) => d.id === dayId);
      sessions.set(key, {
        session_key: key,
        date,
        plan_id: DEFAULT_PLAN_ID,
        tpl_day: dayId,
        session_id: MAIN_SESSION_ID,
        name_en: tpl?.name?.en || day?.tag || dayId,
        name_ar: tpl?.name?.ar || day?.tagAr || '',
        optional: false,
        planned: tpl ? snapshotEntries(tpl, plan, byId, settings) : [],
        source: 'legacy',
      });
    }
    return key;
  };

  for (const r of legacy.sets || []) {
    const block = LEGACY_BLOCKS[r.day_id]?.[r.block_index];
    if (!block) continue; // unknown address: leave it in the v1 table, don't guess
    const sKey = ensureSession(r.date, r.day_id);
    const ex = byId.get(block.id);
    const entryKey = legacyEntryId(r.block_index);
    items.push({
      item_key: itemKey(sKey, entryKey, r.set_index),
      session_key: sKey,
      date: r.date,
      entry_key: entryKey,
      set_index: r.set_index,
      exercise_id: block.id,
      exercise_name: ex?.name?.en || block.id,
      ex_type: TYPE_MAP[block.type],
      kind: 'work',
      status: 'completed',
      planned_reps: block.type === 'resistance' ? ex?.reps ?? null : null,
      planned_seconds: block.type === 'isometric' ? ex?.seconds ?? null : null,
      reps_done: block.type === 'resistance' ? ex?.reps ?? null : null,
      weight: r.weight ?? null,
      hold_seconds: r.hold_seconds ?? null,
      rounds: null,
      duration_seconds: null,
      completed_at: r.completed_at || `${r.date}T12:00:00Z`,
      source: 'legacy',
    });
  }

  for (const r of legacy.circuits || []) {
    const block = LEGACY_BLOCKS[r.day_id]?.[r.block_index];
    if (!block) continue;
    const sKey = ensureSession(r.date, r.day_id);
    const entryKey = legacyEntryId(r.block_index);
    items.push({
      item_key: itemKey(sKey, entryKey, 0),
      session_key: sKey,
      date: r.date,
      entry_key: entryKey,
      set_index: 0,
      exercise_id: block.id,
      exercise_name: 'HIIT Circuit',
      ex_type: 'cardio',
      kind: 'work',
      status: 'completed',
      planned_reps: null,
      planned_seconds: null,
      reps_done: null,
      weight: null,
      hold_seconds: null,
      rounds: r.rounds_completed ?? null,
      duration_seconds: null,
      completed_at: r.completed_at || `${r.date}T12:00:00Z`,
      source: 'legacy',
    });
  }

  return { sessions: [...sessions.values()], items };
}
