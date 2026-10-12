/* =========================================================
   DataContext — everything the signed-in user's training data needs:
   settings, the exercise library (built-ins + their overrides/customs), plans,
   the day's extra sessions, progress tests, and the session-log store.

   Boot order (all non-destructive):
     1. load settings / exercise overrides / plans / today's extras / tests
     2. seed the default plan row if the user has no plans yet
     3. run the one-time v1 → v2 log migration if settings.schemaVersion < 2
     4. load the whole session log into the store
   ========================================================= */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import * as api from '../lib/api';
import { createLogStore } from '../lib/logStore';
import { builtinLibrary, applyOverrides, toOverridePayload, normaliseExercise, newExerciseId } from '../data/library';
import { buildDefaultPlan } from '../data/defaultPlan';
import { DEFAULT_PLAN_ID } from '../data/legacyMap';
import { mergeSettings, sessionsForDate, effectiveEntry, sessionKey, newId } from '../lib/plan';
import { migrateLegacyLogs, CURRENT_SCHEMA_VERSION } from '../lib/migrate';
import { setAppTimezone, today as todayInTz, dayIdOf } from '../lib/dates';

const DataContext = createContext(null);

const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

export function DataProvider({ children }) {
  const store = useMemo(
    () => createLogStore({ fetchSessionLog: api.fetchSessionLog, saveSessionLog: api.saveSessionLog, deleteItems: api.deleteItems, deleteSession: api.deleteSession }),
    []
  );
  const log = useSyncExternalStore(store.subscribe, store.getState);

  const [settingsRaw, setSettingsRaw] = useState(null);
  const [exerciseRows, setExerciseRows] = useState([]);
  const [plans, setPlans] = useState([]);
  const [extrasByDate, setExtrasByDate] = useState({});
  const [tests, setTests] = useState([]);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState(null);
  const [migration, setMigration] = useState(null); // { migrated, sessions, items } after a run
  const [date, setDate] = useState(() => todayInTz());
  const settings = useMemo(() => mergeSettings(settingsRaw), [settingsRaw]);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => setAppTimezone(settings.timezone), [settings.timezone]);

  // roll "today" over at midnight (app timezone) without a reload
  useEffect(() => {
    const tick = () => setDate((d) => {
      const n = todayInTz();
      return n === d ? d : n;
    });
    const id = setInterval(tick, 30000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  /* ---------- boot ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, ex, pl, tt] = await Promise.all([api.fetchSettings(), api.fetchExercises(), api.fetchPlans(), api.fetchProgressTests()]);
        if (cancelled) return;
        let storedSettings = s.settings || {};
        setAppTimezone(mergeSettings(storedSettings).timezone);
        const day = todayInTz();
        const extras = await api.fetchDayExtras(day, day);
        let planRows = pl.plans;

        // 2. seed the default plan (never overwrites an existing one)
        if (!planRows.some((p) => p.id === DEFAULT_PLAN_ID)) {
          const seeded = buildDefaultPlan();
          await api.savePlan(seeded.id, seeded, 0);
          planRows = [...planRows, { id: seeded.id, data: seeded, sort_order: 0 }];
        }

        // 3. one-time v1 → v2 log migration
        let migrated = null;
        if ((storedSettings.schemaVersion || 1) < CURRENT_SCHEMA_VERSION) {
          const legacy = await api.fetchLegacyLogs();
          const lib = applyOverrides(builtinLibrary(), ex.exercises);
          const defaultPlan = planRows.find((p) => p.id === DEFAULT_PLAN_ID).data;
          const out = migrateLegacyLogs(legacy, defaultPlan, lib.byId, mergeSettings(storedSettings));
          // sessions first, then their items — each call is an idempotent upsert
          for (const part of chunk(out.sessions, 200)) await api.saveSessionLog({ sessions: part, items: [] });
          for (const part of chunk(out.items, 400)) await api.saveSessionLog({ sessions: [], items: part });
          storedSettings = { ...storedSettings, schemaVersion: CURRENT_SCHEMA_VERSION, migratedAt: new Date().toISOString(), migratedCounts: { sessions: out.sessions.length, items: out.items.length } };
          await api.saveSettings(storedSettings);
          migrated = { sessions: out.sessions.length, items: out.items.length };
        }
        if (cancelled) return;

        setSettingsRaw(storedSettings);
        setExerciseRows(ex.exercises);
        setPlans(planRows.sort((a, b) => a.sort_order - b.sort_order));
        setTests(tt.tests);
        setExtrasByDate(Object.fromEntries(extras.extras.map((r) => [r.date, r.data])));
        setMigration(migrated);
        setBootError(null);
        // 4. the session log
        await store.load();
      } catch (e) {
        if (!cancelled) setBootError(e.message || 'Could not reach the server');
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store]);

  // today's extras after a midnight rollover
  useEffect(() => {
    if (booting || extrasByDate[date] !== undefined) return;
    api.fetchDayExtras(date, date).then((r) => {
      const row = r.extras.find((x) => x.date === date);
      setExtrasByDate((m) => ({ ...m, [date]: row ? row.data : {} }));
    }).catch(() => {});
    store.load(date, date);
  }, [date, booting, extrasByDate, store]);

  /* ---------- derived ---------- */
  const library = useMemo(() => applyOverrides(builtinLibrary(), exerciseRows), [exerciseRows]);
  const plansList = useMemo(() => plans.map((p) => ({ ...p.data, id: p.id })), [plans]);
  const plansById = useMemo(() => new Map(plansList.map((p) => [p.id, p])), [plansList]);
  const activePlan = plansById.get(settings.activePlanId) || plansList[0] || null;

  /* ---------- settings ---------- */
  const updateSettings = useCallback(async (patch) => {
    const next = { ...settingsRef.current, ...patch };
    setSettingsRaw(next);
    try {
      await api.saveSettings(next);
    } catch (e) {
      setBootError(e.message);
    }
  }, []);

  /* ---------- library ---------- */
  const saveExercise = useCallback(async (exercise) => {
    const clean = normaliseExercise(exercise);
    const row = { id: clean.id, data: toOverridePayload(clean), archived: !!clean.archived };
    setExerciseRows((rows) => [...rows.filter((r) => r.id !== row.id), row]);
    await api.saveExercise(row.id, row.data, row.archived);
    return clean;
  }, []);

  const setExerciseArchived = useCallback(async (exercise, archived) => {
    const row = { id: exercise.id, data: toOverridePayload(exercise), archived };
    setExerciseRows((rows) => [...rows.filter((r) => r.id !== row.id), row]);
    await api.saveExercise(row.id, row.data, archived);
  }, []);

  /** Custom exercise → removed from the library (history keeps its own name snapshot). Built-in → reset to the shipped version. */
  const removeExerciseOverride = useCallback(async (id) => {
    setExerciseRows((rows) => rows.filter((r) => r.id !== id));
    await api.deleteExercise(id);
  }, []);

  const duplicateExercise = useCallback(async (exercise) => {
    const copy = { ...exercise, id: newExerciseId(), name: { en: `${exercise.name.en} (copy)`, ar: exercise.name.ar }, builtin: false, source: 'custom', archived: false };
    return saveExercise(copy);
  }, [saveExercise]);

  /* ---------- plans ---------- */
  const savePlanData = useCallback(async (plan, sortOrder) => {
    const { id, ...data } = plan;
    const so = sortOrder ?? plans.find((p) => p.id === id)?.sort_order ?? plans.length;
    setPlans((rows) => {
      const without = rows.filter((r) => r.id !== id);
      return [...without, { id, data: { ...data, id }, sort_order: so }].sort((a, b) => a.sort_order - b.sort_order);
    });
    await api.savePlan(id, { ...data, id }, so);
  }, [plans]);

  const removePlan = useCallback(async (id) => {
    if (id === DEFAULT_PLAN_ID) return; // the default plan is what v1 history links to — keep it
    setPlans((rows) => rows.filter((r) => r.id !== id));
    await api.deletePlan(id);
    if (settingsRef.current.activePlanId === id) await updateSettings({ activePlanId: DEFAULT_PLAN_ID });
  }, [updateSettings]);

  /* ---------- extras for a date ---------- */
  const extrasFor = useCallback((d) => extrasByDate[d] || {}, [extrasByDate]);

  const updateExtras = useCallback(async (d, fn) => {
    const next = fn(extrasByDate[d] || {});
    setExtrasByDate((m) => ({ ...m, [d]: next }));
    await api.saveDayExtras(d, next);
  }, [extrasByDate]);

  const addSessionToDay = useCallback((d, ref) => updateExtras(d, (x) => {
    const sessions = x.sessions || [];
    if (sessions.some((s) => s.planId === ref.planId && s.day === ref.day && s.sessionId === ref.sessionId)) return x;
    return { ...x, sessions: [...sessions, ref] };
  }), [updateExtras]);

  const removeSessionFromDay = useCallback((d, ref) => updateExtras(d, (x) => ({
    ...x,
    sessions: (x.sessions || []).filter((s) => !(s.planId === ref.planId && s.day === ref.day && s.sessionId === ref.sessionId)),
  })), [updateExtras]);

  const addQuickExercise = useCallback((d, exerciseId, overrides = {}) => updateExtras(d, (x) => ({
    ...x,
    quick: [...(x.quick || []), { eid: newId('q'), exerciseId, overrides }],
  })), [updateExtras]);

  const removeQuickExercise = useCallback((d, eid) => updateExtras(d, (x) => ({ ...x, quick: (x.quick || []).filter((q) => q.eid !== eid) })), [updateExtras]);

  /* ---------- progress tests ---------- */
  const saveTest = useCallback(async (checkpoint, testedOn, data) => {
    setTests((t) => [...t.filter((x) => x.checkpoint !== checkpoint), { checkpoint, tested_on: testedOn, data }]);
    await api.saveProgressTest(checkpoint, testedOn, data);
  }, []);

  /* ---------- helpers used by the session UI ---------- */
  const resolveEntry = useCallback((entry, plan) => {
    const p = plan || activePlan;
    if (entry.kind === 'circuit') return { exercise: null, eff: null };
    const exercise = library.byId.get(entry.exerciseId) || null;
    return { exercise, eff: effectiveEntry(entry, exercise, p, settings) };
  }, [library, activePlan, settings]);

  /** Session instances for a date: the weekday's plan sessions + that date's extras. */
  const instancesForDate = useCallback(
    (d) => sessionsForDate(d, activePlan, plansById, extrasFor(d), { stickLevel: settings.stickLevel }),
    [activePlan, plansById, extrasFor, settings.stickLevel]
  );

  /** All sessions of a plan weekday, logged against `d` (doing another day's workout today). */
  const instancesForPlanDay = useCallback((d, dayId) => {
    const plan = activePlan;
    if (!plan) return [];
    const own = dayIdOf(d) === dayId ? instancesForDate(d) : null;
    if (own) return own;
    return (plan.days[dayId] || []).map((session) => ({
      key: sessionKey(d, plan.id, dayId, session.id), date: d, planId: plan.id, tplDay: dayId, sessionId: session.id, session, source: 'plan', plan,
    }));
  }, [activePlan, instancesForDate]);

  const value = {
    store, log, date, booting, bootError, migration,
    settings, updateSettings,
    library, saveExercise, setExerciseArchived, removeExerciseOverride, duplicateExercise,
    plans: plansList, plansById, activePlan, savePlan: savePlanData, removePlan,
    extrasFor, addSessionToDay, removeSessionFromDay, addQuickExercise, removeQuickExercise,
    tests, saveTest,
    resolveEntry, instancesForDate, instancesForPlanDay,
    reloadAll: () => store.load(),
  };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
