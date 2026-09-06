import { useState } from 'react';
import { Check } from 'lucide-react';
import ExerciseShell from '../ExerciseShell';
import VideoBlock from '../VideoBlock';
import RestTimer from './RestTimer';
import ExerciseHistory from './ExerciseHistory';
import { useProgressContext } from '../../context/ProgressContext';

const COLOR = {
  upper: ['var(--upper)', 'var(--upper-track)'],
  lower: ['var(--lower)', 'var(--lower-track)'],
  core: ['var(--core)', 'var(--core-track)'],
  hiit: ['var(--hiit)', 'var(--hiit-track)'],
};

export default function ResistanceBlock({ day, block, bi }) {
  const { isSetDone, getSetWeight, toggleSet, setWeightFor, date } = useProgressContext();
  const [restTrigger, setRestTrigger] = useState(0);
  const [drafts, setDrafts] = useState({}); // weight typed before a set is marked done
  const [color, track] = COLOR[day.color] || COLOR.upper;

  let done = 0;
  for (let s = 0; s < block.sets; s++) if (isSetDone(day.id, bi, s)) done++;

  function handleToggle(s) {
    const nowDone = !isSetDone(day.id, bi, s);
    const weight = drafts[s] != null && drafts[s] !== '' ? Number(drafts[s]) : null;
    toggleSet(day.id, bi, s, nowDone ? weight : null);
    if (nowDone && s < block.sets - 1) setRestTrigger((t) => t + 1);
  }

  function handleWeightChange(s, value) {
    setDrafts((d) => ({ ...d, [s]: value }));
    if (isSetDone(day.id, bi, s)) {
      const weight = value === '' ? null : Number(value);
      setWeightFor(day.id, bi, s, weight);
    }
  }

  return (
    <ExerciseShell
      done={done === block.sets}
      en={block.en}
      ar={block.ar}
      meta={`${block.sets} sets × ${block.reps} reps${block.note ? ' · ' + block.note : ''} · rest ${block.rest}s`}
    >
      <VideoBlock vid={block.vid} />
      <div className="hint">Tap a set once you complete it. A {block.rest}s rest timer starts automatically. Weight is optional.</div>
      <RestTimer seconds={block.rest} trigger={restTrigger} exerciseName={block.en} color={color} track={track} wash={`var(--${day.color}-dim)`} />
      {Array.from({ length: block.sets }).map((_, s) => {
        const isDone = isSetDone(day.id, bi, s);
        const weightValue = isDone ? getSetWeight(day.id, bi, s) : (drafts[s] ?? '');
        return (
          <div className="set-row" key={s}>
            <button className={`setbox ${isDone ? 'done' : ''}`} onClick={() => handleToggle(s)}>
              {isDone ? <Check size={13} strokeWidth={3} /> : s + 1}
            </button>
            <div className="setlabel">
              Set {s + 1} — {block.reps} reps{block.note ? ` (${block.note})` : ''}
            </div>
            <input
              className="weight-input"
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              placeholder="—"
              value={weightValue ?? ''}
              onChange={(e) => handleWeightChange(s, e.target.value)}
            />
            <span className="weight-unit">kg</span>
          </div>
        );
      })}
      <ExerciseHistory dayId={day.id} blockIndex={bi} today={date} />
    </ExerciseShell>
  );
}
