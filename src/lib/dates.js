// Calendar-date helpers. A "date key" is a plain 'YYYY-MM-DD' string.
//
// Two rules (both learned the hard way — see CLAUDE.md):
//  1. NEVER format a Date with .toISOString().slice(0, 10) for a calendar date: it converts
//     to UTC first, so in Riyadh (UTC+3) anything between 00:00 and 03:00 lands on the
//     PREVIOUS day.
//  2. "Today" is the date in the app's timezone (Asia/Riyadh by default, configurable in
//     Settings), not the device's or the server's.
//
// All date arithmetic on keys is done in UTC on the (y, m, d) triple, so it is immune to
// DST and to whatever timezone the browser/test-runner happens to be in.

export const DEFAULT_TZ = 'Asia/Riyadh';
let appTz = DEFAULT_TZ;
let fmt = makeFormatter(appTz);

function makeFormatter(tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function setAppTimezone(tz) {
  try {
    const next = makeFormatter(tz || DEFAULT_TZ);
    appTz = tz || DEFAULT_TZ;
    fmt = next;
  } catch {
    appTz = DEFAULT_TZ;
    fmt = makeFormatter(DEFAULT_TZ);
  }
}
export const getAppTimezone = () => appTz;

/** The date key an instant falls on in the app timezone. */
export function isoDate(d = new Date()) {
  return fmt.format(d);
}

export function today() {
  return isoDate(new Date());
}

function parts(key) {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}
const fromUtc = (ms) => new Date(ms).toISOString().slice(0, 10); // ms is already a UTC midnight → safe

export function addDays(key, n) {
  const { y, m, d } = parts(key);
  return fromUtc(Date.UTC(y, m - 1, d + n));
}

export function addMonths(key, n) {
  const { y, m, d } = parts(key);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return fromUtc(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(d, lastDay)));
}

/** 0 = Sunday … 6 = Saturday — of the calendar date itself, independent of any timezone. */
export function weekdayOf(key) {
  const { y, m, d } = parts(key);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** First day of the week containing `key`. weekStart: 0 = Sunday (default), 1 = Monday, 6 = Saturday. */
export function startOfWeek(key, weekStart = 0) {
  const back = (weekdayOf(key) - weekStart + 7) % 7;
  return addDays(key, -back);
}

export function startOfMonth(key) {
  return `${key.slice(0, 7)}-01`;
}

export function diffDays(a, b) {
  const pa = parts(a);
  const pb = parts(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86400000);
}

export function datesBetween(start, end) {
  const out = [];
  for (let cur = start, guard = 0; cur <= end && guard < 4000; cur = addDays(cur, 1), guard++) out.push(cur);
  return out;
}

export const WEEKDAY_IDS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const dayIdOf = (key) => WEEKDAY_IDS[weekdayOf(key)];
