/* =========================================================
   Plans: pure data operations (no React, no I/O) — easy to test.

   Plan    { id, name, timing:{countdown,work,rest}, days:{sun..sat: Session[]}, addOns:{day:{minutes,ar,en}} }
   Session { id, name:{en,ar}, color, optional, minutes?, warmup?, cooldown?, entries: Entry[] }
   Entry   { eid, kind:'exercise', exerciseId, overrides:{sets,reps,seconds,rest,countdown}, level? }
         | { eid, kind:'circuit', name:{en,ar}, rounds, work, rest, items:[{exerciseId}] }

   Effective timing precedence (most specific wins):
        entry override  >  plan timing  >  the exercise's own value  >  global setting
   `plan.timing.work` only applies to cardio / circuit work intervals — it would be
   nonsense to force one hold duration onto every plank, wall sit and yoga pose.
   ========================================================= */
import { dayIdOf } from './dates.js';

export const DAY_IDS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const DEFAULT_SETTINGS = {
  weekStart: 0, // 0 = Sunday
  timezone: 'Asia/Riyadh',
  countdown: 3,
  work: 40,
  rest: 30,
  secondsPerRep: 3, // only used to ESTIMATE time trained for rep-based sets that weren't timed
  stickLevel: 1,
  activePlanId: 'default',
};

export const mergeSettings = (stored) => ({ ...DEFAULT_SETTINGS, ...(stored || {}) });

/* ---------- identity / keys ---------- */

export const sessionKey = (date, planId, day, sessionId) => `${date}|${planId || 'free'}|${day || '-'}|${sessionId}`;
export const itemKey = (sKey, entryKey, setIndex) => `${sKey}|${entryKey}|${setIndex}`;
export const restKey = (sKey, entryKey, n) => `${sKey}|${entryKey}|rest${n}`;
export const QUICK_SESSION_ID = 'quick';

let uid = 0;
export function newId(prefix = 'id') {
  uid += 1;
  return `${prefix}_${Date.now().toString(36)}${uid.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/* ---------- effective values ---------- */

const pick = (...vals) => vals.find((v) => v !== null && v !== undefined && v !== '');

/**
 * Resolves what actually runs for one plan entry.
 * @returns { type, sets, reps, seconds, rest, countdown, perSide, loggedSets }
 */
export function effectiveEntry(entry, exercise, plan, settings) {
  const o = entry.overrides || {};
  const t = plan?.timing || {};
  const s = settings || DEFAULT_SETTINGS;
  const type = exercise?.type || 'reps';
  const isInterval = type === 'cardio';
  const sets = pick(o.sets, exercise?.sets, 1);
  const reps = type === 'reps' ? pick(o.reps, exercise?.reps, 10) : null;
  const seconds = type === 'reps' ? null : pick(o.seconds, isInterval ? t.work : null, exercise?.seconds, s.work);
  const rest = pick(o.rest, t.rest, exercise?.rest, s.rest);
  const countdown = pick(o.countdown, exercise?.countdown, t.countdown, s.countdown);
  return {
    type,
    sets: Number(sets),
    reps: reps == null ? null : Number(reps),
    seconds: seconds == null ? null : Number(seconds),
    rest: Number(rest),
    countdown: Number(countdown),
    perSide: !!exercise?.perSide,
    loggedSets: type === 'hold_side' ? Number(sets) * 2 : Number(sets),
  };
}

/** Same idea for a circuit entry: rounds / work / rest, with plan + global fallbacks. */
export function effectiveCircuit(entry, plan, settings) {
  const t = plan?.timing || {};
  const s = settings || DEFAULT_SETTINGS;
  return {
    rounds: Number(pick(entry.rounds, 1)),
    work: Number(pick(entry.workOverride, t.work, entry.work, s.work)),
    rest: Number(pick(entry.restOverride, t.rest, entry.rest, s.rest)),
    countdown: Number(pick(entry.countdown, t.countdown, s.countdown)),
  };
}

/* ---------- immutable plan operations ---------- */

const clone = (x) => JSON.parse(JSON.stringify(x));
const emptyDays = () => Object.fromEntries(DAY_IDS.map((d) => [d, []]));

export function newPlan(name) {
  return { id: newId('plan'), name, timing: { countdown: null, work: null, rest: null }, days: emptyDays(), addOns: {}, seedVersion: 0 };
}

export function duplicatePlan(plan, name) {
  const copy = clone(plan);
  copy.id = newId('plan');
  copy.name = name || `${plan.name} (copy)`;
  return copy;
}

export const renamePlan = (plan, name) => ({ ...plan, name });
export const setPlanTiming = (plan, patch) => ({ ...plan, timing: { ...plan.timing, ...patch } });

function updateSessions(plan, day, fn) {
  return { ...plan, days: { ...plan.days, [day]: fn(plan.days[day] || []) } };
}

export function addSession(plan, day, session) {
  const sessions = plan.days[day] || [];
  const id = sessions.some((s) => s.id === session.id) ? newId('s') : session.id;
  return updateSessions(plan, day, (list) => [...list, { ...clone(session), id }]);
}

export const removeSession = (plan, day, sessionId) => updateSessions(plan, day, (list) => list.filter((s) => s.id !== sessionId));

export function reorderSession(plan, day, from, to) {
  return updateSessions(plan, day, (list) => moveItem(list, from, to));
}

/** Moves a session to another day (appended, or inserted at `index`). Keeps ids unique within the target day. */
export function moveSession(plan, fromDay, sessionId, toDay, index) {
  if (fromDay === toDay) return plan;
  const session = (plan.days[fromDay] || []).find((s) => s.id === sessionId);
  if (!session) return plan;
  let next = removeSession(plan, fromDay, sessionId);
  const clash = (next.days[toDay] || []).some((s) => s.id === session.id);
  const moved = clash ? { ...session, id: newId('s') } : session;
  return updateSessions(next, toDay, (list) => {
    const out = [...list];
    out.splice(index == null ? out.length : index, 0, moved);
    return out;
  });
}

/** Swaps two sessions between two days (each lands where the other was). */
export function swapSessions(plan, dayA, idA, dayB, idB) {
  const listA = plan.days[dayA] || [];
  const listB = plan.days[dayB] || [];
  const ia = listA.findIndex((s) => s.id === idA);
  const ib = listB.findIndex((s) => s.id === idB);
  if (ia < 0 || ib < 0) return plan;
  const a = listA[ia];
  const b = listB[ib];
  if (dayA === dayB) {
    return updateSessions(plan, dayA, (list) => {
      const out = [...list];
      out[ia] = b;
      out[ib] = a;
      return out;
    });
  }
  const aFixed = listB.some((s, i) => i !== ib && s.id === a.id) ? { ...a, id: newId('s') } : a;
  const bFixed = listA.some((s, i) => i !== ia && s.id === b.id) ? { ...b, id: newId('s') } : b;
  const days = { ...plan.days };
  days[dayA] = listA.map((s, i) => (i === ia ? bFixed : s));
  days[dayB] = listB.map((s, i) => (i === ib ? aFixed : s));
  return { ...plan, days };
}

/** Swaps the entire list of sessions between two weekdays. */
export function swapDays(plan, dayA, dayB) {
  if (dayA === dayB) return plan;
  return { ...plan, days: { ...plan.days, [dayA]: plan.days[dayB] || [], [dayB]: plan.days[dayA] || [] } };
}

function updateSession(plan, day, sessionId, fn) {
  return updateSessions(plan, day, (list) => list.map((s) => (s.id === sessionId ? fn(s) : s)));
}

export const renameSession = (plan, day, sessionId, name) => updateSession(plan, day, sessionId, (s) => ({ ...s, name: { ...s.name, ...name } }));
export const setSessionOptional = (plan, day, sessionId, optional) => updateSession(plan, day, sessionId, (s) => ({ ...s, optional }));

export function newExerciseEntry(exerciseId, overrides = {}) {
  return { eid: newId('e'), kind: 'exercise', exerciseId, overrides };
}

export function addEntry(plan, day, sessionId, entry, index) {
  return updateSession(plan, day, sessionId, (s) => {
    const entries = [...s.entries];
    entries.splice(index == null ? entries.length : index, 0, entry);
    return { ...s, entries };
  });
}

export const removeEntry = (plan, day, sessionId, eid) => updateSession(plan, day, sessionId, (s) => ({ ...s, entries: s.entries.filter((e) => e.eid !== eid) }));

export function reorderEntry(plan, day, sessionId, from, to) {
  return updateSession(plan, day, sessionId, (s) => ({ ...s, entries: moveItem(s.entries, from, to) }));
}

export function setEntryOverrides(plan, day, sessionId, eid, patch) {
  return updateSession(plan, day, sessionId, (s) => ({
    ...s,
    entries: s.entries.map((e) => {
      if (e.eid !== eid) return e;
      const overrides = { ...(e.overrides || {}), ...patch };
      for (const k of Object.keys(overrides)) if (overrides[k] === '' || overrides[k] == null) delete overrides[k];
      return { ...e, overrides };
    }),
  }));
}

function moveItem(list, from, to) {
  if (from === to || from < 0 || from >= list.length) return list;
  const out = [...list];
  const [item] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(to, out.length)), 0, item);
  return out;
}

/* ---------- what's on for a date ---------- */

/**
 * The session instances shown for `date`:
 *  - the active plan's sessions for that weekday ('plan')
 *  - sessions the user added from another day / plan ('extra')
 *  - the free "quick add" bucket, if any exercise was added ('quick')
 * `extras` is the day_extras row: { sessions:[{planId, day, sessionId}], quick:[{eid, exerciseId, overrides}] }.
 */
export function sessionsForDate(date, plan, plansById, extras = {}, opts = {}) {
  const { stickLevel = 1 } = opts;
  const out = [];
  const day = dayIdOf(date);
  const seen = new Set();

  const push = (inst) => {
    if (seen.has(inst.key)) return;
    seen.add(inst.key);
    out.push(inst);
  };

  if (plan) {
    for (const session of plan.days[day] || []) {
      push({ key: sessionKey(date, plan.id, day, session.id), date, planId: plan.id, tplDay: day, sessionId: session.id, session: visibleSession(session, stickLevel), source: 'plan', plan });
    }
  }
  for (const ref of extras.sessions || []) {
    const p = plansById.get(ref.planId);
    const session = p?.days?.[ref.day]?.find((s) => s.id === ref.sessionId);
    if (!session) continue;
    push({ key: sessionKey(date, p.id, ref.day, session.id), date, planId: p.id, tplDay: ref.day, sessionId: session.id, session: visibleSession(session, stickLevel), source: 'extra', plan: p });
  }
  if ((extras.quick || []).length) {
    const session = {
      id: QUICK_SESSION_ID,
      name: { en: 'Extra exercises', ar: 'تمارين إضافية' },
      color: 'upper',
      optional: true,
      entries: extras.quick.map((q) => ({ kind: 'exercise', eid: q.eid, exerciseId: q.exerciseId, overrides: q.overrides || {} })),
    };
    push({ key: sessionKey(date, null, null, QUICK_SESSION_ID), date, planId: null, tplDay: null, sessionId: QUICK_SESSION_ID, session, source: 'quick', plan: null });
  }
  return out;
}

/** Stick drills are stored for all 3 levels; only the chosen level's entries show. */
export function visibleSession(session, stickLevel = 1) {
  if (!session.entries.some((e) => e.level != null)) return session;
  return { ...session, entries: session.entries.filter((e) => e.level == null || e.level === Number(stickLevel)) };
}

/* ---------- snapshots (what a session looked like when it was done) ---------- */

/**
 * The planned[] array stored with a session-log row: one object per entry with the
 * EFFECTIVE values at that moment. Later edits to the plan or the exercise never touch it.
 */
export function snapshotEntries(session, plan, exercisesById, settings) {
  return session.entries.map((entry) => {
    if (entry.kind === 'circuit') {
      const c = effectiveCircuit(entry, plan, settings);
      return {
        eid: entry.eid,
        kind: 'circuit',
        name: entry.name,
        type: 'cardio',
        rounds: c.rounds,
        work: c.work,
        rest: c.rest,
        loggedSets: 1,
        items: entry.items.map((it) => ({ exerciseId: it.exerciseId, name: exercisesById.get(it.exerciseId)?.name || { en: it.exerciseId, ar: '' } })),
      };
    }
    const ex = exercisesById.get(entry.exerciseId);
    const eff = effectiveEntry(entry, ex, plan, settings);
    return {
      eid: entry.eid,
      kind: 'exercise',
      exerciseId: entry.exerciseId,
      name: ex?.name || { en: entry.exerciseId, ar: '' },
      type: eff.type,
      sets: eff.sets,
      reps: eff.reps,
      seconds: eff.seconds,
      rest: eff.rest,
      loggedSets: eff.loggedSets,
    };
  });
}
