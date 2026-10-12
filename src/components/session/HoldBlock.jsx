import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Check, MoreHorizontal } from 'lucide-react';
import ExerciseShell from '../ExerciseShell';
import VideoBlock from '../VideoBlock';
import ProgressRing from '../ProgressRing';
import FullscreenTimer from '../FullscreenTimer';
import ExerciseHistory from './ExerciseHistory';
import SkipPrompt from './SkipPrompt';
import { EntryNotes } from './EntryNotes';
import { useData } from '../../context/DataContext';
import { useUndo } from '../UndoToast';
import { useTimerRun } from '../../hooks/useTimerRun';
import { buildHoldSteps, STEP } from '../../lib/timer';
import { itemKey } from '../../lib/plan';
import { fmtTime } from '../../lib/time';
import { beepStart, beepEnd, beepDone } from '../../lib/audio';
import { celebrate } from '../../lib/celebrate';
import { colorsFor, makeLogger, IDLE_TRACK, SIDE_LABEL } from './shared';

const ADD_OPTIONS = [-15, -10, 10, 15];

/** Timed holds: 'hold' (plank, wall sit, yoga pose…) and 'hold_side' (a hold on each side). */
export default function HoldBlock({ inst, entry, exercise, eff }) {
  const { store, log, library, settings, plansById } = useData();
  const { showUndo } = useUndo();
  const plan = inst.plan || plansById.get(inst.planId);
  const [color, track, wash] = colorsFor(inst.session.color);
  const logger = makeLogger({ store, inst, plan, library, settings });
  const n = eff.loggedSets;
  const perSide = exercise.type === 'hold_side';
  const word = exercise.type === 'cardio' ? 'Round' : 'Hold';

  const steps = useRef(buildHoldSteps({ sets: n, seconds: eff.seconds, rest: eff.rest, countdown: eff.countdown })).current;
  const undoMap = useRef(new Map()); // outcome object → fn that puts the log back
  const [minimized, setMinimized] = useState(false);
  const [menu, setMenu] = useState(null);

  const keyOf = (s) => itemKey(inst.key, entry.eid, s);
  const itemOf = (s) => log.items.get(keyOf(s));
  const doneCount = Array.from({ length: n }).filter((_, s) => itemOf(s)?.status === 'completed').length;

  const { state, dispatch, undo } = useTimerRun(steps, {
    onOutcome: (o) => {
      const secs = Math.round(o.elapsed);
      if (o.kind === STEP.WORK) {
        const r = logger.work({
          entryKey: entry.eid,
          setIndex: o.ref.setIndex,
          exercise,
          eff,
          status: o.status,
          holdSeconds: secs,
          durationSeconds: secs,
        });
        undoMap.current.set(o, () => store.restore(r.item.item_key, r.prev));
        if (o.status === 'completed') beepEnd();
      } else {
        const r = logger.rest({ entryKey: entry.eid, n: o.ref.setIndex ?? 0, status: o.status, plannedSeconds: o.planned, elapsed: secs, exercise, kind: o.kind });
        undoMap.current.set(o, () => store.restore(r.item.item_key, r.prev));
      }
    },
    onRevert: (o) => {
      undoMap.current.get(o)?.();
      undoMap.current.delete(o);
    },
  });

  // celebrate once, when the whole sequence completes
  const celebrated = useRef(false);
  useEffect(() => {
    if (state.complete && state.started && !celebrated.current) {
      celebrated.current = true;
      beepDone();
      celebrate();
    }
    if (!state.complete) celebrated.current = false;
  }, [state.complete, state.started]);

  const step = state.steps[state.idx];
  const kind = step?.kind;
  const workIdx = kind === STEP.WORK ? step.ref.setIndex : kind === STEP.REST ? step.ref.setIndex + 1 : 0;

  function handleStart() {
    setMinimized(false);
    if (!state.running) beepStart();
    dispatch({ type: 'toggle' });
  }
  function handleStop() {
    dispatch({ type: 'reset' });
    setMinimized(false);
  }
  function handleRestart() {
    dispatch({ type: 'restart' });
    beepStart();
  }
  function handleSkip(status) {
    const label = kind === STEP.WORK ? word : kind === STEP.REST ? 'Break' : 'Countdown';
    dispatch({ type: 'skip', status });
    showUndo(`${label} marked ${status}`, undo);
  }

  const phaseLabel = state.running
    ? kind === STEP.COUNTDOWN ? 'Get ready' : kind === STEP.WORK ? 'Hold!' : 'Rest'
    : state.started ? 'Paused' : 'Ready';
  const sideText = perSide ? ` · ${SIDE_LABEL[workIdx % 2]}` : '';
  const progText = `${word} ${Math.min(workIdx + 1, n)} of ${n}${sideText}`;
  const ringTotal = step?.total || eff.seconds;
  const working = kind === STEP.WORK || kind === STEP.COUNTDOWN;
  const showFullscreen = (state.started || state.complete) && !minimized;

  function manualToggle(s) {
    const cur = itemOf(s);
    if (cur && cur.status === 'completed') store.removeItem(keyOf(s));
    else logger.work({ entryKey: entry.eid, setIndex: s, exercise, eff, status: 'completed', holdSeconds: eff.seconds });
  }
  function setStatus(s, status) {
    setMenu(null);
    if (status === 'clear') store.removeItem(keyOf(s));
    else logger.work({ entryKey: entry.eid, setIndex: s, exercise, eff, status, holdSeconds: itemOf(s)?.hold_seconds ?? (status === 'completed' ? eff.seconds : null) });
  }

  const meta = `${eff.sets} ${perSide ? 'sets × 2 sides' : 'holds'} × ${eff.seconds}s${exercise.notes ? ' · ' + exercise.notes : ''}${eff.rest ? ` · rest ${eff.rest}s` : ''}`;

  return (
    <ExerciseShell done={doneCount === n} en={exercise.name.en} ar={exercise.name.ar} meta={meta}>
      <VideoBlock media={exercise.media} />
      <EntryNotes exercise={exercise} />

      {showFullscreen && (
        <FullscreenTimer
          color={working ? color : 'var(--text-faint)'}
          track={working ? track : IDLE_TRACK}
          wash={wash}
          phase={phaseLabel}
          remaining={state.remaining}
          total={ringTotal}
          title={exercise.name.en}
          titleAr={exercise.name.ar}
          meta={progText}
          paused={!state.running && !state.complete}
          onTogglePause={handleStart}
          onSkip={handleSkip}
          skipLabel={kind === STEP.REST ? 'Skip break' : kind === STEP.COUNTDOWN ? 'Skip countdown' : `Skip ${word.toLowerCase()}`}
          skipQuestion={kind === STEP.REST ? 'This break was…' : kind === STEP.COUNTDOWN ? 'Countdown was…' : `This ${word.toLowerCase()} was…`}
          onAddTime={kind === STEP.REST ? (sec) => dispatch({ type: 'addTime', seconds: sec }) : undefined}
          addTimeOptions={kind === STEP.REST ? ADD_OPTIONS : []}
          onReset={handleRestart}
          onStop={handleStop}
          onRepeat={handleRestart}
          onMinimize={() => setMinimized(true)}
          complete={state.complete}
          completeTitle="Done! 🎉"
          completeSub={`${doneCount} of ${n} ${word.toLowerCase()}s complete`}
          onDismissComplete={() => setMinimized(true)}
        />
      )}

      <div className="timerbox">
        <div className="phase">{state.complete ? 'Done! 🎉' : phaseLabel}</div>
        <ProgressRing fraction={state.complete ? 1 : state.remaining / ringTotal} size={140} stroke={8} color={working ? color : 'var(--text-faint)'} track={working ? track : IDLE_TRACK}>
          <span className="big">{fmtTime(state.complete ? 0 : state.remaining)}</span>
        </ProgressRing>
        <div className="progress-txt">{state.complete ? `${doneCount} of ${n} complete` : progText}</div>
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
          <button className="btn-reset" onClick={handleStop}>
            Reset
          </button>
          {state.started && !state.complete && <SkipPrompt label={kind === STEP.REST ? 'Skip break' : 'Skip'} onChoose={handleSkip} />}
        </div>
      </div>
      <div className="hint">
        Runs through all {n} {perSide ? 'holds (both sides)' : 'holds'} automatically. Every completed hold is logged as you go — at the time actually held, editable below. You can also tick a hold manually.
      </div>

      {Array.from({ length: n }).map((_, s) => {
        const it = itemOf(s);
        const status = it?.status;
        return (
          <div key={s}>
            <div className="set-row">
              <button className={`setbox ${status === 'completed' ? 'done' : status === 'incomplete' ? 'incomplete' : status === 'skipped' ? 'skipped' : ''}`} onClick={() => manualToggle(s)} aria-label={`Hold ${s + 1}`}>
                {status === 'completed' ? <Check size={13} strokeWidth={3} /> : status === 'incomplete' ? '½' : status === 'skipped' ? '–' : s + 1}
              </button>
              <div className="setlabel">
                {it?.source === 'claude' && <span className="pill extra">Claude</span>}
                {word} {s + 1}
                {perSide ? ` (${SIDE_LABEL[s % 2]})` : ''} — {eff.seconds}s planned
              </div>
              <input
                className="weight-input"
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                placeholder="—"
                disabled={!it}
                value={it ? it.hold_seconds ?? '' : ''}
                onChange={(e) => store.patchItem(keyOf(s), { hold_seconds: e.target.value === '' ? null : Number(e.target.value) })}
              />
              <span className="weight-unit wide">sec</span>
              <button className="setmenu" onClick={() => setMenu(menu === s ? null : s)} aria-label="More options for this hold">
                <MoreHorizontal size={16} />
              </button>
            </div>
            {menu === s && (
              <div className="set-status-row">
                <button onClick={() => setStatus(s, 'completed')}>Completed</button>
                <button onClick={() => setStatus(s, 'incomplete')}>Incomplete</button>
                <button onClick={() => setStatus(s, 'skipped')}>Skipped</button>
                <button onClick={() => setStatus(s, 'clear')}>Clear</button>
              </div>
            )}
          </div>
        );
      })}
      <ExerciseHistory exerciseId={exercise.id} today={inst.date} />
    </ExerciseShell>
  );
}
