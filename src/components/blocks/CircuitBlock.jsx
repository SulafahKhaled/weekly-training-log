import { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import ExerciseShell from '../ExerciseShell';
import VideoBlock from '../VideoBlock';
import ProgressRing from '../ProgressRing';
import FullscreenTimer from '../FullscreenTimer';
import { useProgressContext } from '../../context/ProgressContext';
import { fmtTime } from '../../lib/time';
import { beepStart, beepEnd, beepDone } from '../../lib/audio';
import { celebrate } from '../../lib/celebrate';

const COLOR = { upper: ['var(--upper)', 'var(--upper-track)'], lower: ['var(--lower)', 'var(--lower-track)'], core: ['var(--core)', 'var(--core-track)'], hiit: ['var(--hiit)', 'var(--hiit-track)'] };
const WASH = { upper: 'var(--upper-dim)', lower: 'var(--lower-dim)', core: 'var(--core-dim)', hiit: 'var(--hiit-dim)' };

function initialState(block) {
  return { round: 1, exIdx: 0, phase: 'work', remaining: block.work, running: false, complete: false, started: false };
}

/** The state transition that fires when the current phase's clock hits zero — shared by the
 * automatic per-second tick and the manual "Skip" control so both advance the circuit identically. */
function advance(s, block, onComplete) {
  if (s.phase === 'work') {
    beepEnd();
    return { ...s, phase: 'rest', remaining: block.rest };
  }
  let exIdx = s.exIdx + 1;
  let round = s.round;
  if (exIdx >= block.items.length) {
    exIdx = 0;
    round += 1;
  }
  if (round > block.rounds) {
    onComplete();
    return { ...s, running: false, complete: true, round: block.rounds, exIdx: block.items.length - 1 };
  }
  beepStart();
  return { ...s, phase: 'work', remaining: block.work, exIdx, round };
}

export default function CircuitBlock({ day, block, bi }) {
  const { isCircuitDone, toggleCircuit } = useProgressContext();
  const [color, track] = COLOR[day.color] || COLOR.hiit;
  const wash = WASH[day.color] || WASH.hiit;
  const [state, setState] = useState(() => initialState(block));
  const [minimized, setMinimized] = useState(false);
  const isDone = isCircuitDone(day.id, bi);

  function handleComplete() {
    beepDone();
    celebrate(['#ff6b5e', '#f5ac3c', '#49d6ac']);
    if (!isCircuitDone(day.id, bi)) toggleCircuit(day.id, bi, block.rounds);
  }

  useEffect(() => {
    if (!state.running) return;
    const t = setInterval(() => {
      setState((s) => {
        const remaining = s.remaining - 1;
        if (remaining > 0) return { ...s, remaining };
        return advance(s, block, handleComplete);
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.running]);

  function handleStart() {
    setMinimized(false);
    if (state.running) {
      setState((s) => ({ ...s, running: false }));
      return;
    }
    if (state.complete) {
      setState({ ...initialState(block), running: true, started: true });
      beepStart();
      return;
    }
    beepStart();
    setState((s) => ({ ...s, running: true, started: true }));
  }

  function handleReset() {
    setState(initialState(block));
    setMinimized(false);
  }

  function handleSkip() {
    setState((s) => advance(s, block, handleComplete));
  }

  const currentItem = block.items[state.exIdx];
  const nextItem = block.items[(state.exIdx + 1) % block.items.length];
  const isWork = state.phase === 'work';
  const phaseLabel = state.running ? (isWork ? 'Go!' : 'Rest') : state.started ? 'Paused' : 'Ready';
  const progText = `Round ${state.round} of ${block.rounds} · move ${state.exIdx + 1}/${block.items.length}`;
  const ringTotal = isWork ? block.work : block.rest;
  const showFullscreen = (state.started || state.complete) && !minimized;

  return (
    <ExerciseShell done={isDone} en={block.en} ar={block.ar} meta={`${block.rounds} rounds · ${block.items.length} moves · work ${block.work}s / rest ${block.rest}s`}>
      <div className="hint">
        <strong style={{ color: 'var(--text-dim)' }}>Sequence</strong>
        <br />
        {block.items.map((it, i) => (
          <span key={i}>
            {i + 1}. {it.en} <span className="ar">— {it.ar}</span>
            <br />
          </span>
        ))}
      </div>

      {showFullscreen && (
        <FullscreenTimer
          color={isWork ? color : 'var(--text-faint)'}
          track={isWork ? track : 'rgba(20,22,30,0.08)'}
          wash={wash}
          phase={phaseLabel}
          remaining={state.remaining}
          total={ringTotal}
          title={isWork ? currentItem.en : nextItem.en}
          titleAr={isWork ? currentItem.ar : nextItem.ar}
          next={isWork ? `Next: ${nextItem.en}` : 'Get ready'}
          meta={progText}
          paused={!state.running && !state.complete}
          onTogglePause={handleStart}
          onSkip={handleSkip}
          skipLabel={isWork ? 'Skip move' : 'Skip rest'}
          onMinimize={() => setMinimized(true)}
          complete={state.complete}
          completeTitle="Circuit complete! 🎉"
          completeSub={`${block.rounds} of ${block.rounds} rounds done`}
          onDismissComplete={() => setMinimized(true)}
        />
      )}

      <div className="timerbox">
        <div className="phase">{state.complete ? 'Circuit complete! 🎉' : phaseLabel}</div>
        <ProgressRing fraction={state.complete ? 1 : state.remaining / ringTotal} size={140} stroke={8} color={isWork ? color : 'var(--text-faint)'} track={isWork ? track : 'rgba(20,22,30,0.08)'}>
          <span className="big">{fmtTime(state.complete ? 0 : state.remaining)}</span>
        </ProgressRing>
        <div className="cur-ex">{state.complete ? '' : isWork ? currentItem.en : `Next: ${nextItem.en}`}</div>
        <div className="progress-txt">{state.complete ? `${block.rounds} of ${block.rounds} rounds done` : progText}</div>
        <div className="controls">
          <button className="btn-start" onClick={handleStart} style={state.running ? { background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--text)' } : undefined}>
            {state.complete ? (
              <>
                <RotateCcw size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                Restart
              </>
            ) : state.running ? (
              <>
                <Pause size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                Pause
              </>
            ) : (
              <>
                <Play size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                {state.started ? 'Resume' : 'Start Circuit'}
              </>
            )}
          </button>
          <button className="btn-reset" onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>

      <VideoBlock key={state.exIdx} vid={currentItem.vid} />
    </ExerciseShell>
  );
}
