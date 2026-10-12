import { useEffect, useRef, useState } from 'react';
import FullscreenTimer from '../FullscreenTimer';
import { useTimerRun } from '../../hooks/useTimerRun';
import { beepStart, beepEnd } from '../../lib/audio';
import { useUndo } from '../UndoToast';

const ADD_OPTIONS = [-15, -10, 10, 15];

/**
 * The break between two sets. Skip (asks Completed / Incomplete), ±10 / ±15 s, pause,
 * reset, stop. A finished/skipped rest is logged as a *rest* event — never an exercise result.
 */
export default function RestOverlay({ seconds, trigger, title, titleAr, colors, onRest }) {
  const [active, setActive] = useState(false);
  const [run, setRun] = useState(0);
  const last = useRef(trigger);
  useEffect(() => {
    if (trigger === last.current || seconds <= 0) return;
    last.current = trigger;
    setRun((r) => r + 1);
    setActive(true);
    beepStart();
  }, [trigger, seconds]);

  if (!active) return null;
  return <RestRun key={run} seconds={seconds} title={title} titleAr={titleAr} colors={colors} onRest={onRest} onClose={() => setActive(false)} />;
}

function RestRun({ seconds, title, titleAr, colors, onRest, onClose }) {
  const { showUndo } = useUndo();
  const [color, track, wash] = colors;
  const steps = useRef([{ kind: 'rest', seconds, total: seconds, ref: { setIndex: 0 } }]).current;

  // A rest that runs out on its own is logged by the machine's outcome (once, from an effect).
  const { state, dispatch } = useTimerRun(steps, {
    onOutcome: (o) => {
      beepEnd();
      onRest(o);
    },
  });

  useEffect(() => {
    dispatch({ type: 'start' });
  }, [dispatch]);

  const complete = state.complete;
  const phase = state.running ? 'Rest' : complete ? 'Go!' : 'Paused';

  return (
    <FullscreenTimer
      color={color}
      track={track}
      wash={wash}
      phase={phase}
      remaining={state.remaining}
      total={state.steps[state.idx]?.total || seconds}
      title={title}
      titleAr={titleAr}
      next="Get ready for your next set"
      paused={!state.running && !complete}
      onTogglePause={() => dispatch({ type: 'toggle' })}
      onReset={() => {
        dispatch({ type: 'restart' });
        beepStart();
      }}
      onStop={onClose}
      onSkip={(status) => {
        // Skipping ends the break: log the answer directly (the machine is being closed), keep an Undo.
        const st = state.steps[state.idx];
        const undoLog = onRest({ kind: 'rest', ref: st.ref, status, planned: st.total, elapsed: Math.max(0, st.total - state.remaining) });
        showUndo(`Break marked ${status}`, () => undoLog && undoLog());
        onClose();
      }}
      skipLabel="Skip break"
      skipQuestion="This break was…"
      onAddTime={(sec) => dispatch({ type: 'addTime', seconds: sec })}
      addTimeOptions={ADD_OPTIONS}
      onRepeat={() => dispatch({ type: 'restart' })}
      complete={complete}
      completeTitle="Rest done! 🎉"
      completeSub="Ready for your next set"
      onDismissComplete={onClose}
    />
  );
}
