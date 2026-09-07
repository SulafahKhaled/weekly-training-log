import { useEffect, useRef, useState } from 'react';
import FullscreenTimer from '../FullscreenTimer';
import { beepStart, beepEnd } from '../../lib/audio';

export default function RestTimer({ seconds, trigger, exerciseName, color = 'var(--upper)', track = 'var(--upper-track)', wash = 'var(--upper-dim)' }) {
  // { remaining, total, running, complete } while a rest is active/paused/just-finished; null when idle.
  const [state, setState] = useState(null);
  const lastTrigger = useRef(trigger);

  useEffect(() => {
    if (trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;
    setState({ remaining: seconds, total: seconds, running: true, complete: false });
    beepStart();
  }, [trigger, seconds]);

  useEffect(() => {
    if (!state || !state.running || state.complete) return;
    const t = setInterval(() => {
      setState((s) => {
        const remaining = s.remaining - 1;
        if (remaining > 0) return { ...s, remaining };
        beepEnd();
        return { ...s, remaining: 0, running: false, complete: true };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [state && state.running, state && state.complete]);

  if (state === null) return null;

  function handleTogglePause() {
    setState((s) => (s.complete ? s : { ...s, running: !s.running }));
  }

  function handleReset() {
    setState((s) => ({ ...s, remaining: seconds, total: seconds, running: true, complete: false }));
    beepStart();
  }

  function handleRepeat() {
    setState({ remaining: seconds, total: seconds, running: true, complete: false });
    beepStart();
  }

  function handleStop() {
    setState(null);
  }

  return (
    <FullscreenTimer
      color={color}
      track={track}
      wash={wash}
      phase={state.running ? 'Rest' : state.complete ? 'Go!' : 'Paused'}
      remaining={state.remaining}
      total={state.total}
      title={exerciseName}
      next="Get ready for your next set"
      paused={!state.running && !state.complete}
      onTogglePause={handleTogglePause}
      onReset={handleReset}
      onStop={handleStop}
      onRepeat={handleRepeat}
      complete={state.complete}
      completeTitle="Rest done! 🎉"
      completeSub="Ready for your next set"
      onDismissComplete={handleStop}
    />
  );
}
