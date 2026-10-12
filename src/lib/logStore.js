/* =========================================================
   Session-log store — the single client-side source of truth for what was done.

   It is an external store (not React state), on purpose:
     - state is read and replaced synchronously, so two writes in the same tick
       (set 1 and set 2 of a hold finishing back to back) can never overwrite each
       other — the bug the old `toggleSet` had by reading `sets` from a stale closure;
     - React subscribes through useSyncExternalStore (see context/LogContext.jsx);
     - it is unit-testable with a fake `api`.

   Rows use the server's snake_case shape, so what is stored is what is sent.
   Every write is optimistic, then persisted through a single FIFO queue (so a
   later delete can never overtake an earlier upsert); a failed write rolls the
   optimistic change back and surfaces `error`.
   ========================================================= */
import { itemKey, sessionKey } from './plan';

export { itemKey, sessionKey };

export function createLogStore(api) {
  let state = { items: new Map(), sessions: new Map(), loaded: false, error: null };
  const listeners = new Set();
  let queue = Promise.resolve();

  const emit = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  };
  const enqueue = (fn) => {
    queue = queue.then(fn, fn);
    return queue;
  };
  const fail = (e) => emit({ error: e?.message || 'Could not reach the server' });

  const store = {
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getState: () => state,
    get(key) {
      return state.items.get(key) || null;
    },

    /** Replace the range [start, end] with what the server has (other dates are kept). */
    async load(start, end) {
      try {
        const res = await api.fetchSessionLog(start, end);
        const items = new Map(state.items);
        const sessions = new Map(state.sessions);
        for (const [k, v] of items) if ((!start || v.date >= start) && (!end || v.date <= end)) items.delete(k);
        for (const [k, v] of sessions) if ((!start || v.date >= start) && (!end || v.date <= end)) sessions.delete(k);
        for (const i of res.items) items.set(i.item_key, i);
        for (const s of res.sessions) sessions.set(s.session_key, s);
        emit({ items, sessions, loaded: true, error: null });
      } catch (e) {
        emit({ loaded: true });
        fail(e);
      }
    },

    /**
     * Upserts one item (and the session snapshot it belongs to, if that isn't stored yet).
     * Returns the previous item (or null) so the caller can offer Undo via `restore`.
     */
    setItem(item, sessionSnapshot = null) {
      const prev = state.items.get(item.item_key) || null;
      const items = new Map(state.items);
      items.set(item.item_key, item);
      let sessions = state.sessions;
      let snapshotToSend = null;
      if (sessionSnapshot && !sessions.has(sessionSnapshot.session_key)) {
        sessions = new Map(sessions);
        sessions.set(sessionSnapshot.session_key, sessionSnapshot);
        snapshotToSend = sessionSnapshot;
      }
      emit({ items, sessions });
      enqueue(async () => {
        try {
          await api.saveSessionLog({ sessions: snapshotToSend ? [snapshotToSend] : [], items: [item] });
        } catch (e) {
          // roll back just this item
          const rb = new Map(state.items);
          if (prev) rb.set(item.item_key, prev);
          else rb.delete(item.item_key);
          emit({ items: rb });
          fail(e);
        }
      });
      return prev;
    },

    patchItem(key, patch) {
      const cur = state.items.get(key);
      if (!cur) return null;
      return store.setItem({ ...cur, ...patch });
    },

    removeItem(key) {
      const prev = state.items.get(key);
      if (!prev) return null;
      const items = new Map(state.items);
      items.delete(key);
      emit({ items });
      enqueue(async () => {
        try {
          await api.deleteItems([key]);
        } catch (e) {
          const rb = new Map(state.items);
          rb.set(key, prev);
          emit({ items: rb });
          fail(e);
        }
      });
      return prev;
    },

    /** Undo helper: put an item back to what it was (or remove it if it didn't exist). */
    restore(key, prev) {
      return prev ? store.setItem(prev) : store.removeItem(key);
    },

    /** Explicit "reset this session" — removes its items and snapshot (the one destructive action the app offers). */
    resetSession(sKey) {
      const prevItems = [...state.items.values()].filter((i) => i.session_key === sKey);
      const prevSession = state.sessions.get(sKey);
      const items = new Map(state.items);
      prevItems.forEach((i) => items.delete(i.item_key));
      const sessions = new Map(state.sessions);
      sessions.delete(sKey);
      emit({ items, sessions });
      enqueue(async () => {
        try {
          await api.deleteSession(sKey);
        } catch (e) {
          const rbI = new Map(state.items);
          prevItems.forEach((i) => rbI.set(i.item_key, i));
          const rbS = new Map(state.sessions);
          if (prevSession) rbS.set(sKey, prevSession);
          emit({ items: rbI, sessions: rbS });
          fail(e);
        }
      });
    },

    clearError: () => emit({ error: null }),
    /** Resolves when every queued write has been sent — used by tests and by backup/export. */
    flush: () => queue,
  };
  return store;
}

/* ---------- selectors ---------- */

export const itemsOfSession = (state, sKey) => [...state.items.values()].filter((i) => i.session_key === sKey);
export const itemsOfEntry = (state, sKey, entryKey) => [...state.items.values()].filter((i) => i.session_key === sKey && i.entry_key === entryKey && i.kind === 'work');

/* ---------- builders ---------- */

/** Builds a work item row for set `setIndex` of an entry within a session instance. */
export function buildWorkItem({ inst, entryKey, setIndex, exercise, eff, status = 'completed', repsDone, weight, holdSeconds, rounds, durationSeconds, at }) {
  return {
    item_key: itemKey(inst.key, entryKey, setIndex),
    session_key: inst.key,
    date: inst.date,
    entry_key: entryKey,
    set_index: setIndex,
    exercise_id: exercise?.id ?? null,
    exercise_name: exercise?.name?.en || exercise?.name || null,
    ex_type: eff?.type ?? exercise?.type ?? null,
    kind: 'work',
    status,
    planned_reps: eff?.reps ?? null,
    planned_seconds: eff?.seconds ?? null,
    reps_done: repsDone ?? (status === 'completed' ? eff?.reps ?? null : null),
    weight: weight ?? null,
    hold_seconds: holdSeconds ?? null,
    rounds: rounds ?? null,
    duration_seconds: durationSeconds ?? null,
    completed_at: at || new Date().toISOString(),
    source: 'app',
  };
}

export function buildRestItem({ inst, entryKey, n, status, plannedSeconds, elapsed, exercise, kind = 'rest', at }) {
  return {
    item_key: `${inst.key}|${entryKey}|${kind}${n}`,
    session_key: inst.key,
    date: inst.date,
    entry_key: entryKey,
    set_index: n,
    exercise_id: exercise?.id ?? null,
    exercise_name: exercise?.name?.en || null,
    ex_type: null,
    kind,
    status,
    planned_reps: null,
    planned_seconds: plannedSeconds ?? null,
    reps_done: null,
    weight: null,
    hold_seconds: null,
    rounds: null,
    duration_seconds: elapsed ?? null,
    completed_at: at || new Date().toISOString(),
    source: 'app',
  };
}

/** The immutable snapshot of a session instance stored with its first logged item. */
export function buildSessionSnapshot(inst, plannedEntries) {
  return {
    session_key: inst.key,
    date: inst.date,
    plan_id: inst.planId,
    tpl_day: inst.tplDay,
    session_id: inst.sessionId,
    name_en: inst.session.name?.en || '',
    name_ar: inst.session.name?.ar || '',
    optional: !!inst.session.optional,
    planned: plannedEntries,
    source: 'app',
  };
}
