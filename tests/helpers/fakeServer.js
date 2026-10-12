// An in-memory stand-in for the Express API, shaped exactly like src/lib/api.js,
// so integration tests run the real DataContext / log store / blocks against it.
export function createFakeServer() {
  const db = {
    settings: { schemaVersion: 2 },
    exercises: [],
    plans: [],
    extras: new Map(),
    tests: [],
    sessions: new Map(),
    items: new Map(),
    legacy: { sets: [], circuits: [] },
    calls: [],
    failNextSave: false,
  };
  const reset = () => {
    db.settings = { schemaVersion: 2 };
    db.exercises = [];
    db.plans = [];
    db.extras.clear();
    db.tests = [];
    db.sessions.clear();
    db.items.clear();
    db.legacy = { sets: [], circuits: [] };
    db.calls.length = 0;
    db.failNextSave = false;
  };
  const api = {
    todayKey: () => '2025-01-05',
    fetchSettings: async () => ({ settings: db.settings }),
    saveSettings: async (s) => { db.settings = s; return { ok: true }; },
    fetchExercises: async () => ({ exercises: db.exercises }),
    saveExercise: async (id, data, archived) => { db.exercises = [...db.exercises.filter((e) => e.id !== id), { id, data, archived }]; return { ok: true }; },
    deleteExercise: async (id) => { db.exercises = db.exercises.filter((e) => e.id !== id); return { ok: true }; },
    fetchPlans: async () => ({ plans: db.plans }),
    savePlan: async (id, data, so = 0) => { db.plans = [...db.plans.filter((p) => p.id !== id), { id, data, sort_order: so }]; return { ok: true }; },
    deletePlan: async (id) => { db.plans = db.plans.filter((p) => p.id !== id); return { ok: true }; },
    fetchDayExtras: async (start, end) => ({ extras: [...db.extras].filter(([d]) => d >= start && d <= end).map(([date, data]) => ({ date, data })) }),
    saveDayExtras: async (date, data) => { db.extras.set(date, data); return { ok: true }; },
    fetchProgressTests: async () => ({ tests: db.tests }),
    saveProgressTest: async (checkpoint, tested_on, data) => { db.tests = [...db.tests.filter((t) => t.checkpoint !== checkpoint), { checkpoint, tested_on, data }]; return { ok: true }; },
    fetchLegacyLogs: async () => db.legacy,
    fetchSessionLog: async (start, end) => ({
      sessions: [...db.sessions.values()].filter((s) => (!start || s.date >= start) && (!end || s.date <= end)),
      items: [...db.items.values()].filter((i) => (!start || i.date >= start) && (!end || i.date <= end)),
    }),
    saveSessionLog: async ({ sessions = [], items = [] }) => {
      db.calls.push({ sessions, items });
      if (db.failNextSave) {
        db.failNextSave = false;
        throw new Error('network down');
      }
      sessions.forEach((s) => db.sessions.set(s.session_key, s));
      items.forEach((i) => db.items.set(i.item_key, i));
      return { ok: true };
    },
    deleteItems: async (keys) => { keys.forEach((k) => db.items.delete(k)); return { ok: true }; },
    deleteSession: async (key) => {
      for (const [k, v] of db.items) if (v.session_key === key) db.items.delete(k);
      db.sessions.delete(key);
      return { ok: true };
    },
  };
  return { db, api, reset };
}
