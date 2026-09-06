import { useEffect, useState } from 'react';
import FullscreenTimer from '../FullscreenTimer';
import { beepStart, beepEnd } from '../../lib/audio';

export default function RestTimer({ seconds, trigger, exerciseName, color = 'var(--upper)', track = 'var(--upper-track)', wash = 'var(--upper-dim)' }) {
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
      const t = setTimeout(() => setState(null), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setState((s) => ({ ...s, remaining: s.remaining - 1 })), 1000);
    return () => clearTimeout(t);
  }, [state]);

  if (state === null) return null;

  return (
    <FullscreenTimer
      color={color}
      track={track}
      wash={wash}
      phase={state.remaining > 0 ? 'Rest' : 'Go!'}
      remaining={Math.max(0, state.remaining)}
      total={state.total}
      title={exerciseName}
      next="Get ready for your next set"
      onSkip={() => setState(null)}
      skipLabel="Skip rest"
    />
  );
}
