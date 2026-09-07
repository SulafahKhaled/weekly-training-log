import { addDays, today } from './dates';

/** "Am I trending the right way" signal: change since the first logged
 * value and since ~30 days ago. Always computed from the full history,
 * independent of whatever range is currently charted. */
export function computeDelta(points) {
  const vals = points.filter((p) => p.value != null).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (vals.length < 2) return null;
  const first = vals[0].value;
  const last = vals[vals.length - 1].value;
  const cutoff = addDays(today(), -30);
  const before30 = vals.filter((p) => p.date <= cutoff);
  const baseline30 = before30.length ? before30[before30.length - 1].value : first;
  return {
    sinceFirst: last - first,
    since30: last - baseline30,
    has30: before30.length > 0,
  };
}

export function fmtDelta(value, unit) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${Math.round(value * 10) / 10}${unit}`;
}
