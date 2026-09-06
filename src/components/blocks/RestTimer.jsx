import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ProgressRing from '../ProgressRing';
import { fmtTime } from '../../lib/time';
import { beepStart, beepEnd } from '../../lib/audio';

export default function RestTimer({ seconds, trigger, color = 'var(--upper)', track = 'var(--upper-track)' }) {
  const [state, setState] = useState(null); // { remaining, total }

  useEffect(() => {
    if (trigger === 0) return;
    setState({ remaining: seconds, total: seconds });
    beepStart();
  }, [trigger, seconds]);

  useEffect(() => {
    if (state === null) return;
    if (state.remaining <= 0) {
      beepEnd();
      const t = setTimeout(() => setState(null), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setState((s) => ({ ...s, remaining: s.remaining - 1 })), 1000);
    return () => clearTimeout(t);
  }, [state]);

  return (
    <AnimatePresence>
      {state !== null && (
        <motion.div
          className="timerbox"
          initial={{ height: 0, opacity: 0, marginBottom: 0 }}
          animate={{ height: 'auto', opacity: 1, marginBottom: 12 }}
          exit={{ height: 0, opacity: 0, marginBottom: 0 }}
          transition={{ duration: 0.22 }}
          style={{ overflow: 'hidden' }}
        >
          <div className="phase">{state.remaining > 0 ? 'Rest' : 'Go'}</div>
          <ProgressRing fraction={state.remaining / state.total} size={120} stroke={7} color={color} track={track}>
            <span className="big">{fmtTime(Math.max(0, state.remaining))}</span>
          </ProgressRing>
          <div className="controls">
            <button className="btn-reset" onClick={() => setState(null)}>
              Skip rest
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
