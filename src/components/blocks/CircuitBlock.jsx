import { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import ExerciseShell from '../ExerciseShell';
import VideoBlock from '../VideoBlock';
import ProgressRing from '../ProgressRing';
import { useProgressContext } from '../../context/ProgressContext';
import { fmtTime } from '../../lib/time';
import { beepStart, beepEnd, beepDone } from '../../lib/audio';
import { celebrate } from '../../lib/celebrate';

const COLOR = { upper: ['var(--upper)', 'var(--upper-track)'], lower: ['var(--lower)', 'var(--lower-track)'], core: ['var(--core)', 'var(--core-track)'], hiit: ['var(--hiit)', 'var(--hiit-track)'] };

function initialState(block) {
  return { round: 1, exIdx: 0, phase: 'work', remaining: block.work, running: false, complete: false };
}

export default function CircuitBlock({ day, block, bi }) {
  const { isCircuitDone, toggleCircuit } = useProgressContext();
  const [color, track] = COLOR[day.color] || COLOR.hiit;
  const [state, setState] = useState(() => initialState(block));
  const isDone = isCircuitDone(day.id, bi);

  useEffect(() => {
    if (!state.running) return;
    const t = setInterval(() => {
      setState((s) => {
        const remaining = s.remaining - 1;
        if (remaining > 0) return { ...s, remaining };

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
          beepDone();
          celebrate(['#ff6b5e', '#f5ac3c', '#49d6ac']);
          if (!isCircuitDone(day.id, bi)) toggleCircuit(day.id, bi, block.rounds);
          return { ...s, running: false, complete: true, round: block.rounds, exIdx: block.items.length - 1 };
        }
        beepStart();
        return { ...s, phase: 'work', remaining: block.work, exIdx, round };
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.running]);

  function handleStart() {
    if (state.running) {
      setState((s) => ({ ...s, running: false }));
      return;
    }
    if (state.complete) {
      setState({ ...initialState(block), running: true });
      beepStart();
      return;
    }
    beepStart();
    setState((s) => ({ ...s, running: true }));
  }

  function handleReset() {
    setState(initialState(block));
  }

  const hasStarted = state.round > 1 || state.exIdx > 0 || state.remaining !== block.work || state.phase !== 'work';
  const currentItem = block.items[state.exIdx];
  const nextItem = block.items[(state.exIdx + 1) % block.items.length];
  const phaseLabel = state.complete ? 'Circuit complete! 🎉' : state.running ? (state.phase === 'work' ? 'Go!' : 'Rest') : hasStarted ? 'Paused' : 'Ready';
  const curExText = state.complete ? '' : state.phase === 'work' ? currentItem.en : `Next: ${nextItem.en}`;
  const progText = state.complete ? `${block.rounds} of ${block.rounds} rounds done` : `Round ${state.round} of ${block.rounds} · move ${state.exIdx + 1}/${block.items.length}`;
  const ringTotal = state.phase === 'work' ? block.work : block.rest;

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

      <div className="timerbox">
        <div className="phase">{phaseLabel}</div>
        <ProgressRing fraction={state.complete ? 1 : state.remaining / ringTotal} size={140} stroke={8} color={state.phase === 'work' ? color : 'var(--text-faint)'} track={state.phase === 'work' ? track : 'rgba(20,22,30,0.08)'}>
          <span className="big">{fmtTime(state.complete ? 0 : state.remaining)}</span>
        </ProgressRing>
        <div className="cur-ex">{curExText}</div>
        <div className="progress-txt">{progText}</div>
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
                {hasStarted ? 'Resume' : 'Start Circuit'}
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
