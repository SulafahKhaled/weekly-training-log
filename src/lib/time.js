export function fmtTime(s) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function fmtClock() {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
