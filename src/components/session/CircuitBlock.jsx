import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import ExerciseShell from '../ExerciseShell';
import VideoBlock from '../VideoBlock';
import ProgressRing from '../ProgressRing';
import FullscreenTimer from '../FullscreenTimer';
import SkipPrompt from './SkipPrompt';
import { useData } from '../../context/DataContext';
import { useUndo } from '../UndoToast';
import { useTimerRun } from '../../hooks/useTimerRun';
import { buildCircuitSteps, circuitSummary, STEP } from '../../lib/timer';
import { effectiveCircuit, itemKey } from '../../lib/plan';
import { fmtTime } from '../../lib/time';
import { beepStart, beepEnd, beepDone } from '../../lib/audio';
import { celebrate } from '../../lib/celebrate';
import { colorsFor, makeLogger, IDLE_TRACK } from './shared';

const ADD_OPTIONS = [-15, -10, 10, 15];

/** A HIIT circuit: `rounds` × the entry's moves, work / rest intervals. Logged as one item (rounds done). */
export default function CircuitBlock({ inst, entry }) {
  const { store, log, library, settings, plansById } = useData();
  const { showUndo } = useUndo();
  const plan = inst.plan || plansById.get(inst.planId);
  const [color, track, wash] = colorsFor(inst.session.color === 'upper' ? 'hiit' : inst.session.color);
  const cfg = effectiveCircuit(entry, plan, settings);
  const moves = entry.items.map((it) => library.byId.get(it.exerciseId)?.name || { en: it.exerciseId, ar: '' });
  const medias = entry.items.map((it) => library.byId.get(it.exerciseId)?.media || null);
  const logger = makeLogger({ store, inst, plan, library, settings });
  const circuitEx = { id: entry.eid, name: { en: entry.name.en }, type: 'cardio' };
  const eff = { type: 'cardio', sets: cfg.rounds, reps: null, seconds: cfg.work };

  const steps = useRef(buildCircuitSteps({ rounds: cfg.rounds, items: moves.length, work: cfg.work, rest: cfg.rest, countdown: cfg.countdown })).current;
  const [minimized, setMinimized] = useState(false);
  const undoMap = useRef(new Map());
  const key = itemKey(inst.key, entry.eid, 0);
  const isDone = log.items.get(key)?.status === 'completed';

  const writeSummary = (outcomes) => {
    const work = outcomes.filter((o) => o.kind === STEP.WORK);
    if (!work.length) return null;
    const sum = circuitSummary(outcomes, { rounds: cfg.rounds, items: moves.length });
    return logger.work({
      entryKey: entry.eid, setIndex: 0, exercise: circuitEx, eff,
      status: sum.status, rounds: sum.roundsDone,
      durationSeconds: Math.round(work.reduce((a, o) => a + o.elapsed, 0)),
    });
  };

  const stateRef = useRef(null);
  const { state, dispatch, undo } = useTimerRun(steps, {
    onOutcome: (o, index) => {
      const outcomes = stateRef.current.outcomes.slice(0, index + 1);
      if (o.kind === STEP.WORK) {
        const r = writeSummary(outcomes);
        if (r) undoMap.current.set(o, () => store.restore(r.item.item_key, r.prev));
        if (o.status === 'completed') beepEnd();
      } else {
        const r = logger.rest({ entryKey: entry.eid, n: index, status: o.status, plannedSeconds: o.planned, elapsed: Math.round(o.elapsed), exercise: circuitEx, kind: o.kind });
        undoMap.current.set(o, () => store.restore(r.item.item_key, r.prev));
      }
    },
    onRevert: (o) => {
      undoMap.current.get(o)?.();
      undoMap.current.delete(o);
    },
  });
  stateRef.current = state;

  const celebrated = useRef(false);
  useEffect(() => {
    if (state.complete && state.started && !celebrated.current) {
      celebrated.current = true;
      beepDone();
      celebrate(['#ff6b5e', '#f5ac3c', '#49d6ac']);
    }
    if (!state.complete) celebrated.current = false;
  }, [state.complete, state.started]);

  const step = state.steps[state.idx];
  const kind = step?.kind;
  const ref = step?.ref || {};
  const moveIdx = ref.item ?? 0;
  const roundIdx = ref.round ?? 0;
  const isWork = kind === STEP.WORK;
  const current = moves[moveIdx] || moves[0];
  const next = moves[(moveIdx + 1) % moves.length];

  const handleStart = () => {
    setMinimized(false);
    if (!state.running) beepStart();
    dispatch({ type: 'toggle' });
  };
  const handleStop = () => {
    dispatch({ type: 'reset' });
    setMinimized(false);
  };
  const handleRestart = () => {
    dispatch({ type: 'restart' });
    beepStart();
  };
  const handleSkip = (status) => {
    const label = kind === STEP.REST ? 'Break' : kind === STEP.COUNTDOWN ? 'Countdown' : 'Move';
    dispatch({ type: 'skip', status });
    showUndo(`${label} marked ${status}`, undo);
  };

  const phaseLabel = state.running ? (kind === STEP.COUNTDOWN ? 'Get ready' : isWork ? 'Go!' : 'Rest') : state.started ? 'Paused' : 'Ready';
  const progText = `Round ${Math.min(roundIdx + 1, cfg.rounds)} of ${cfg.rounds} · move ${moveIdx + 1}/${moves.length}`;
  const ringTotal = step?.total || cfg.work;
  const showFullscreen = (state.started || state.complete) && !minimized;
  const working = isWork || kind === STEP.COUNTDOWN;
  const sum = circuitSummary(state.outcomes, { rounds: cfg.rounds, items: moves.length });

  function manualToggle() {
    if (isDone) store.removeItem(key);
    else logger.work({ entryKey: entry.eid, setIndex: 0, exercise: circuitEx, eff, status: 'completed', rounds: cfg.rounds });
  }

  return (
    <ExerciseShell done={isDone} en={entry.name.en} ar={entry.name.ar} meta={`${cfg.rounds} rounds · ${moves.length} moves · work ${cfg.work}s / rest ${cfg.rest}s`}>
      <div className="hint">
        <strong style={{ color: 'var(--text-dim)' }}>Sequence</strong>
        <br />
        {moves.map((m, i) => (
          <span key={i}>
            {i + 1}. {m.en} <span className="ar">— {m.ar}</span>
            <br />
          </span>
        ))}
      </div>

      {showFullscreen && (
        <FullscreenTimer
          color={working ? color : 'var(--text-faint)'}
          track={working ? track : IDLE_TRACK}
          wash={wash}
          phase={phaseLabel}
          remaining={state.remaining}
          total={ringTotal}
          title={isWork || kind === STEP.COUNTDOWN ? current.en : next.en}
          titleAr={isWork || kind === STEP.COUNTDOWN ? current.ar : next.ar}
          next={isWork ? `Next: ${next.en}` : 'Get ready'}
          meta={progText}
          paused={!state.running && !state.complete}
          onTogglePause={handleStart}
          onSkip={handleSkip}
          skipLabel={kind === STEP.REST ? 'Skip break' : kind === STEP.COUNTDOWN ? 'Skip countdown' : 'Skip move'}
          skipQuestion={kind === STEP.REST ? 'This break was…' : kind === STEP.COUNTDOWN ? 'Countdown was…' : 'This move was…'}
          onAddTime={kind === STEP.REST ? (sec) => dispatch({ type: 'addTime', seconds: sec }) : undefined}
          addTimeOptions={kind === STEP.REST ? ADD_OPTIONS : []}
          onReset={handleRestart}
          onStop={handleStop}
          onRepeat={handleRestart}
          onMinimize={() => setMinimized(true)}
          complete={state.complete}
          completeTitle={sum.status === 'completed' ? 'Circuit complete! 🎉' : 'Circuit finished'}
          completeSub={`${sum.roundsDone} of ${cfg.rounds} rounds done`}
          onDismissComplete={() => setMinimized(true)}
        />
      )}

      <div className="timerbox">
        <div className="phase">{state.complete ? 'Circuit complete! 🎉' : phaseLabel}</div>
        <ProgressRing fraction={state.complete ? 1 : state.remaining / ringTotal} size={140} stroke={8} color={working ? color : 'var(--text-faint)'} track={working ? track : IDLE_TRACK}>
          <span className="big">{fmtTime(state.complete ? 0 : state.remaining)}</span>
        </ProgressRing>
        <div className="cur-ex">{state.complete ? '' : isWork ? current.en : `Next: ${next.en}`}</div>
        <div className="progress-txt">{state.complete ? `${sum.roundsDone} of ${cfg.rounds} rounds done` : progText}</div>
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
          <button className="btn-reset" onClick={handleStop}>
            Reset
          </button>
          {state.started && !state.complete && <SkipPrompt label={kind === STEP.REST ? 'Skip break' : 'Skip'} onChoose={handleSkip} />}
        </div>
      </div>
      <div className="page-actions">
        <button className="btn small" onClick={manualToggle}>
          {isDone ? 'Mark not done' : 'Mark circuit done'}
        </button>
      </div>

      <VideoBlock key={moveIdx} media={medias[moveIdx]} />
    </ExerciseShell>
  );
}
