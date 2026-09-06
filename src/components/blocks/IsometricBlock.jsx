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
  return { holdIdx: 0, phase: 'hold', remaining: block.hold, running: false, complete: false, started: false };
}

export default function IsometricBlock({ day, block, bi }) {
  const { isSetDone, toggleSet } = useProgressContext();
  const [color, track] = COLOR[day.color] || COLOR.upper;
  const wash = WASH[day.color] || WASH.upper;
  const [state, setState] = useState(() => initialState(block));
  const [minimized, setMinimized] = useState(false);

  let done = 0;
  for (let s = 0; s < block.sets; s++) if (isSetDone(day.id, bi, s)) done++;

  useEffect(() => {
    if (!state.running) return;
    const t = setInterval(() => {
      setState((s) => {
        const remaining = s.remaining - 1;
        if (remaining > 0) return { ...s, remaining };

        if (s.phase === 'hold') {
          beepEnd();
          if (!isSetDone(day.id, bi, s.holdIdx)) toggleSet(day.id, bi, s.holdIdx, null);
          const nextIdx = s.holdIdx + 1;
          if (nextIdx >= block.sets) {
            beepDone();
            celebrate();
            return { ...s, holdIdx: nextIdx, running: false, complete: true, remaining: 0 };
          }
          return { ...s, holdIdx: nextIdx, phase: 'rest', remaining: block.rest };
        }
        beepStart();
        return { ...s, phase: 'hold', remaining: block.hold };
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

  const phaseLabel = state.running ? (state.phase === 'hold' ? 'Hold!' : 'Rest') : state.started ? 'Paused' : 'Ready';
  const progText = `Hold ${Math.min(state.holdIdx + 1, block.sets)} of ${block.sets}`;
  const ringTotal = state.phase === 'hold' ? block.hold : block.rest;
  const showFullscreen = (state.started || state.complete) && !minimized;

  return (
    <ExerciseShell done={done === block.sets} en={block.en} ar={block.ar} meta={`${block.sets} holds × ${block.hold}s${block.note ? ' · ' + block.note : ''} · rest ${block.rest}s`}>
      <VideoBlock vid={block.vid} />

      {showFullscreen && (
        <FullscreenTimer
          color={state.phase === 'hold' ? color : 'var(--text-faint)'}
          track={state.phase === 'hold' ? track : 'rgba(20,22,30,0.08)'}
          wash={wash}
          phase={phaseLabel}
          remaining={state.remaining}
          total={ringTotal}
          title={block.en}
          titleAr={block.ar}
          meta={progText}
          paused={!state.running && !state.complete}
          onTogglePause={handleStart}
          onMinimize={() => setMinimized(true)}
          complete={state.complete}
          completeTitle="Done! 🎉"
          completeSub={`${block.sets} of ${block.sets} holds complete`}
          onDismissComplete={() => setMinimized(true)}
        />
      )}

      <div className="timerbox">
        <div className="phase">{state.complete ? 'Done! 🎉' : phaseLabel}</div>
        <ProgressRing fraction={state.complete ? 1 : state.remaining / ringTotal} size={140} stroke={8} color={state.phase === 'hold' ? color : 'var(--text-faint)'} track={state.phase === 'hold' ? track : 'rgba(20,22,30,0.08)'}>
          <span className="big">{fmtTime(state.complete ? 0 : state.remaining)}</span>
        </ProgressRing>
        <div className="progress-txt">{state.complete ? `${block.sets} of ${block.sets} complete` : progText}</div>
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
                {state.started ? 'Resume' : 'Start'}
              </>
            )}
          </button>
          <button className="btn-reset" onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>
      <div className="hint">Runs through all {block.sets} holds automatically with rest between. Sets are marked complete as you go.</div>
    </ExerciseShell>
  );
}
