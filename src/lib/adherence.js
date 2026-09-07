import { dayForDate } from '../data/days';
import { dayProgress } from '../hooks/useProgress';

// Local-calendar-date formatting — NOT d.toISOString().slice(0, 10). toISOString
// converts to UTC, which silently returns the wrong (often unchanged) date in any
// positive UTC-offset timezone and previously sent allDatesBetween()'s while loop
// into an infinite spin (addDays() never actually advanced the date string).
function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

/** Date range for a Week/Month/Year adherence view, anchored on today. */
export function periodRange(period, today = isoDate(new Date())) {
  if (period === 'week') {
    return { start: addDays(today, -6), end: today, unit: 'day' };
  }
  if (period === 'month') {
    const d = new Date(`${today}T00:00:00`);
    const start = isoDate(new Date(d.getFullYear(), d.getMonth(), 1));
    return { start, end: today, unit: 'day' };
  }
  const d = new Date(`${today}T00:00:00`);
  const start = `${d.getFullYear()}-01-01`;
  return { start, end: today, unit: 'month' };
}

function allDatesBetween(start, end) {
  const dates = [];
  let cur = start;
  while (cur <= end) {
    dates.push(cur);
    cur = addDays(cur, 1);
  }
  return dates;
}

/** Turns the bulk /api/stats/logs rows into isSetDone/isCircuitDone lookups
 * keyed by date, so the existing dayProgress() aggregator can be reused
 * unmodified for an arbitrary past date instead of only "today." */
function buildPerDateLookup(sets, circuits) {
  const byDate = new Map();
  function bucket(date) {
    if (!byDate.has(date)) byDate.set(date, { sets: new Set(), circuits: new Set() });
    return byDate.get(date);
  }
  for (const s of sets) bucket(s.date).sets.add(`${s.day_id}:${s.block_index}:${s.set_index}`);
  for (const c of circuits) bucket(c.date).circuits.add(`${c.day_id}:${c.block_index}`);
  return (date) => {
    const b = byDate.get(date) || { sets: new Set(), circuits: new Set() };
    return {
      isSetDone: (dayId, bi, si) => b.sets.has(`${dayId}:${bi}:${si}`),
      isCircuitDone: (dayId, bi) => b.circuits.has(`${dayId}:${bi}`),
    };
  };
}

export function tierFor(done, total) {
  if (total === 0 || done === 0) return 'missed';
  if (done === total) return 'full';
  return 'partial';
}

/** Per-day stats (done/total/tier) for every calendar date in range. */
export function computeDailyStats(range, sets, circuits) {
  const lookupFor = buildPerDateLookup(sets, circuits);
  return allDatesBetween(range.start, range.end).map((date) => {
    const day = dayForDate(date);
    const { done, total } = dayProgress(day, lookupFor(date));
    return { date, day, done, total, tier: tierFor(done, total) };
  });
}

/** Rolls per-day stats up to one entry per calendar month (for the Year view). */
export function computeMonthlyStats(range, sets, circuits) {
  const daily = computeDailyStats(range, sets, circuits);
  const byMonth = new Map();
  for (const d of daily) {
    const month = d.date.slice(0, 7); // YYYY-MM
    if (!byMonth.has(month)) byMonth.set(month, { month, done: 0, total: 0 });
    const m = byMonth.get(month);
    m.done += d.done;
    m.total += d.total;
  }
  return Array.from(byMonth.values()).map((m) => ({ ...m, tier: tierFor(m.done, m.total) }));
}

/** Per day-type ("Upper A", "Lower A", ...) rollup across the range — how many
 * of that day-type's occurrences were fully completed. */
export function computeByDayType(daily) {
  const byTag = new Map();
  for (const d of daily) {
    const key = d.day.tag;
    if (!byTag.has(key)) byTag.set(key, { tag: key, color: d.day.color, completed: 0, occurrences: 0 });
    const t = byTag.get(key);
    t.occurrences++;
    if (d.tier === 'full') t.completed++;
  }
  return Array.from(byTag.values());
}

export const MONTH_LABEL = (ym) => new Date(`${ym}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short' });
export const DAY_LABEL = (date) => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
