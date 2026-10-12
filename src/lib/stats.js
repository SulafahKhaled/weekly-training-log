/* =========================================================
   Statistics — computed ONLY from the session log (session_log + session_items).
   Pure functions: rows in, numbers out. No React, no fetching, no "today" read
   from the clock (callers pass it), so every number here is testable with a
   small fixed log (tests/stats.test.js).

   Definitions (kept deliberately plain, and shown in the UI):
   - work item     : one logged set / hold / circuit (kind 'work'). Rests and
                     countdowns are separate kinds and NEVER count as exercises.
   - status        : completed | incomplete | skipped
   - session       : completed when every planned unit has a completed work item;
                     partial when something was done; otherwise missed.
   - planned slot  : a (weekday, session) in the plan. A session counts for its
                     slot whichever date it was actually done on — doing Monday's
                     workout on Sunday satisfies Monday's slot.
   - training day  : a date with at least one completed work item.
   - weeks         : start on `weekStart` (0 = Sunday, the default).
   ========================================================= */
import { addDays, datesBetween, dayIdOf, startOfWeek, diffDays } from './dates.js';

const isWork = (i) => i.kind === 'work';
const done = (i) => i.status === 'completed';

/** Planned work units of a session snapshot (a circuit is one unit). */
export function plannedUnits(planned = []) {
  return planned.reduce((n, e) => n + (e.kind === 'circuit' ? 1 : Math.max(1, Number(e.loggedSets) || 1)), 0);
}

/** Per-session result from its snapshot + its items. */
export function sessionResult(session, items) {
  const work = items.filter(isWork);
  const completed = new Set(work.filter(done).map((i) => `${i.entry_key}|${i.set_index}`)).size;
  const units = plannedUnits(session.planned);
  const touched = work.length > 0;
  let status = 'missed';
  if (units > 0 ? completed >= units : completed > 0) status = 'completed';
  else if (completed > 0 || touched) status = 'partial';
  return { status, completed, units, touched };
}

/** The first of the `weekStart`-aligned weeks that covers [start, end]. */
export function weekStartsBetween(start, end, weekStart = 0) {
  const out = [];
  for (let w = startOfWeek(start, weekStart); w <= end; w = addDays(w, 7)) out.push(w);
  return out;
}

/** A plan's required / optional slots: [{ tplDay, sessionId, optional }] for one weekday. */
export function slotsForDay(plan, dayId) {
  return (plan?.days?.[dayId] || []).map((s) => ({ tplDay: dayId, sessionId: s.id, optional: !!s.optional, name: s.name }));
}

/**
 * Sessions planned vs completed per week.
 * @param {object} p
 *   sessions, items  — rows from the log
 *   plan             — the active plan (the schedule "planned" is measured against)
 *   today            — 'YYYY-MM-DD' (Asia/Riyadh)
 *   weekStart        — 0..6
 *   from, to         — inclusive date range to report weeks for
 */
export function weeklySessionStats({ sessions, items, plan, today, weekStart = 0, from, to }) {
  const byKey = new Map();
  for (const it of items) {
    if (!byKey.has(it.session_key)) byKey.set(it.session_key, []);
    byKey.get(it.session_key).push(it);
  }
  const results = sessions.map((s) => ({ s, r: sessionResult(s, byKey.get(s.session_key) || []) }));
  const firstDate = [...sessions.map((s) => s.date), ...items.map((i) => i.date)].sort()[0] || today;

  return weekStartsBetween(from, to, weekStart).map((wStart) => {
    const wEnd = addDays(wStart, 6);
    const weekDates = datesBetween(wStart, wEnd);
    const inWeek = results.filter(({ s }) => s.date >= wStart && s.date <= wEnd);
    const completedSlots = new Set(inWeek.filter(({ r }) => r.status === 'completed').map(({ s }) => `${s.tpl_day}|${s.session_id}`));
    const partialSlots = new Set(inWeek.filter(({ r }) => r.status === 'partial').map(({ s }) => `${s.tpl_day}|${s.session_id}`));

    let planned = 0;
    let plannedDue = 0;
    let completed = 0;
    let optPlanned = 0;
    let optCompleted = 0;
    const slots = [];
    for (const date of weekDates) {
      // days before the app had any data aren't "missed"
      const countable = date >= firstDate;
      for (const slot of slotsForDay(plan, dayIdOf(date))) {
        const slotKey = `${slot.tplDay}|${slot.sessionId}`;
        const isDone = completedSlots.has(slotKey);
        const isPartial = !isDone && partialSlots.has(slotKey);
        const due = date <= today && countable;
        if (slot.optional) {
          if (countable) optPlanned++;
          if (isDone) optCompleted++;
        } else if (countable) {
          planned++;
          if (due) plannedDue++;
          if (isDone) completed++;
        }
        slots.push({ date, ...slot, status: isDone ? 'completed' : isPartial ? 'partial' : 'missed', due });
      }
    }
    // Sessions done that don't match any planned slot of the week (quick-add, other plan, moved sessions).
    const plannedSlotKeys = new Set(slots.map((s) => `${s.tplDay}|${s.sessionId}`));
    const extra = inWeek.filter(({ s, r }) => r.status === 'completed' && !plannedSlotKeys.has(`${s.tpl_day}|${s.session_id}`)).length;

    return {
      weekStart: wStart,
      weekEnd: wEnd,
      planned, // required sessions in the whole week
      plannedDue, // …of which are due on or before today
      completed,
      // completed ÷ due-so-far, so a week in progress isn't judged against days that haven't happened;
      // a session done ahead of its day still counts (capped at 100).
      completionPct: plannedDue ? Math.min(100, Math.round((completed / plannedDue) * 100)) : null,
      optionalPlanned: optPlanned,
      optionalCompleted: optCompleted,
      extra,
      slots,
    };
  });
}

/** Training days (≥ 1 completed work item) → current & best streak. */
export function streaks(items, today) {
  const days = [...new Set(items.filter((i) => isWork(i) && done(i)).map((i) => i.date))].sort();
  if (!days.length) return { current: 0, best: 0, trainingDays: 0 };
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = diffDays(days[i - 1], days[i]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  // current: ends today, or yesterday (today isn't over yet)
  const set = new Set(days);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, best, trainingDays: days.length };
}

/** Volume / time / status counts for a set of items. */
export function totals(items, { secondsPerRep = 3 } = {}) {
  const t = {
    sets: 0, reps: 0, holdSeconds: 0, timeSeconds: 0, timeIsEstimate: false,
    completed: 0, incomplete: 0, skipped: 0,
    restsCompleted: 0, restsIncomplete: 0, restsSkipped: 0,
  };
  for (const i of items) {
    if (i.kind === 'rest') {
      if (i.status === 'completed') t.restsCompleted++;
      else if (i.status === 'incomplete') t.restsIncomplete++;
      else t.restsSkipped++;
      continue;
    }
    if (!isWork(i)) continue; // countdown events are not exercise results
    if (i.status === 'completed') t.completed++;
    else if (i.status === 'incomplete') t.incomplete++;
    else if (i.status === 'skipped') t.skipped++;
    if (!done(i)) continue;
    t.sets++;
    const reps = i.reps_done ?? i.planned_reps ?? 0;
    if (i.ex_type === 'reps' || i.ex_type === 'resistance') t.reps += reps;
    const hold = i.hold_seconds ?? 0;
    t.holdSeconds += hold;
    if (i.duration_seconds != null) t.timeSeconds += i.duration_seconds;
    else if (hold) t.timeSeconds += hold;
    else if (i.planned_seconds) t.timeSeconds += i.planned_seconds;
    else if (reps) {
      t.timeSeconds += reps * secondsPerRep;
      t.timeIsEstimate = true;
    }
  }
  return t;
}

/** Per-exercise history (newest first) + personal bests. */
export function exerciseHistory(items, exerciseId) {
  const rows = items.filter((i) => isWork(i) && i.exercise_id === exerciseId && done(i));
  const byDate = new Map();
  for (const r of rows) {
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date).push(r);
  }
  const sessions = [...byDate.entries()]
    .map(([date, list]) => {
      const weights = list.map((r) => r.weight).filter((w) => w != null);
      const holds = list.map((r) => r.hold_seconds).filter((h) => h != null);
      return {
        date,
        sets: list.length,
        reps: list.reduce((n, r) => n + (r.reps_done ?? r.planned_reps ?? 0), 0),
        topWeight: weights.length ? Math.max(...weights) : null,
        bestHold: holds.length ? Math.max(...holds) : null,
        totalHold: holds.reduce((a, b) => a + b, 0),
        rounds: Math.max(0, ...list.map((r) => r.rounds ?? 0)) || null,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const best = (field) => {
    const vals = sessions.filter((s) => s[field] != null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => (b[field] > a[field] ? b : a));
  };
  return {
    sessions,
    pb: {
      weight: best('topWeight') && { value: best('topWeight').topWeight, date: best('topWeight').date },
      hold: best('bestHold') && { value: best('bestHold').bestHold, date: best('bestHold').date },
      rounds: best('rounds') && { value: best('rounds').rounds, date: best('rounds').date },
      reps: sessions.length ? { value: Math.max(...sessions.map((s) => s.reps)), date: sessions.reduce((a, b) => (b.reps > a.reps ? b : a)).date } : null,
    },
  };
}

/** Exercises that appear in the log, with how often — for the picker. */
export function loggedExercises(items) {
  const m = new Map();
  for (const i of items) {
    if (!isWork(i) || !i.exercise_id || !done(i)) continue;
    const e = m.get(i.exercise_id) || { id: i.exercise_id, name: i.exercise_name, count: 0, last: '' };
    e.count++;
    if (i.date > e.last) e.last = i.date;
    m.set(i.exercise_id, e);
  }
  return [...m.values()].sort((a, b) => (a.last < b.last ? 1 : -1));
}

/** Per-date training summary for heatmaps. */
export function dailySummary(sessions, items, from, to) {
  const byDate = new Map();
  for (const i of items) {
    if (!isWork(i)) continue;
    const d = byDate.get(i.date) || { date: i.date, completed: 0, incomplete: 0, skipped: 0 };
    if (i.status === 'completed') d.completed++;
    else if (i.status === 'incomplete') d.incomplete++;
    else d.skipped++;
    byDate.set(i.date, d);
  }
  const sessByDate = new Map();
  for (const s of sessions) {
    const its = items.filter((i) => i.session_key === s.session_key);
    const r = sessionResult(s, its);
    const arr = sessByDate.get(s.date) || [];
    arr.push({ session: s, ...r });
    sessByDate.set(s.date, arr);
  }
  return datesBetween(from, to).map((date) => {
    const d = byDate.get(date) || { date, completed: 0, incomplete: 0, skipped: 0 };
    const list = sessByDate.get(date) || [];
    // missed: nothing completed · full: a required session was completed (or every session
    // that day, if only optional ones were scheduled) · partial: something done, nothing finished
    let tier = 'missed';
    if (d.completed > 0) {
      const requiredDone = list.some((x) => !x.session.optional && x.status === 'completed');
      const allDone = list.length > 0 && list.every((x) => x.status === 'completed');
      tier = requiredDone || allDone ? 'full' : 'partial';
    }
    return { ...d, date, sessions: list, tier };
  });
}
