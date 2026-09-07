// Local-calendar-date helpers. NEVER format a locally-built Date with
// .toISOString() — it converts to UTC first, which in any positive
// UTC-offset timezone can silently return the wrong (sometimes unchanged)
// calendar-date string. This bit adherence.js as a real infinite loop
// (see CLAUDE.md) before these helpers were centralized here.

export function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today() {
  return isoDate(new Date());
}

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export function addMonths(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setMonth(d.getMonth() + n);
  return isoDate(d);
}
