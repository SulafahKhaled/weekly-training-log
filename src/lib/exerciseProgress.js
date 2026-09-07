import { addMonths, today } from './dates';

/** One point per date the exercise was logged, for the exercise-progress chart.
 * Resistance -> heaviest set that session; isometric -> average hold_seconds
 * (now that IsometricBlock logs a real value instead of always the planned
 * duration); circuit -> rounds_completed (no per-set granularity to average). */
export function buildSessions(exercise, logs) {
  if (exercise.type === 'circuit') {
    return logs.circuits
      .filter((c) => c.day_id === exercise.dayId && c.block_index === exercise.blockIndex)
      .map((c) => ({ date: c.date, value: c.rounds_completed }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  const rows = logs.sets.filter((s) => s.day_id === exercise.dayId && s.block_index === exercise.blockIndex);
  const byDate = new Map();
  for (const r of rows) {
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date).push(r);
  }
  const field = exercise.type === 'isometric' ? 'hold_seconds' : 'weight';
  return Array.from(byDate.entries())
    .map(([date, dateRows]) => {
      const values = dateRows.map((r) => r[field]).filter((v) => v != null);
      if (!values.length) return { date, value: null };
      const value = exercise.type === 'isometric' ? values.reduce((a, b) => a + b, 0) / values.length : Math.max(...values);
      return { date, value };
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function filterRange(sessions, rangeId) {
  if (rangeId === 'last4') return sessions.slice(-4);
  if (rangeId === '3months') {
    const cutoffStr = addMonths(today(), -3);
    return sessions.filter((s) => s.date >= cutoffStr);
  }
  return sessions;
}
