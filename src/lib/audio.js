let ctx = null;

function beep(freq = 880, dur = 0.15, delay = 0) {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    /* audio not available */
  }
}

export function beepStart() {
  beep(660, 0.12);
}
export function beepEnd() {
  beep(880, 0.12);
  beep(880, 0.12, 0.16);
}
export function beepDone() {
  beep(520, 0.12);
  beep(660, 0.12, 0.14);
  beep(880, 0.18, 0.28);
}
export function beepTick() {
  beep(440, 0.06);
}

export function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* vibration not available */
  }
}
