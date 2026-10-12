import { useState } from 'react';
import { Check, MoreHorizontal } from 'lucide-react';
import ExerciseShell from '../ExerciseShell';
import VideoBlock from '../VideoBlock';
import ExerciseHistory from './ExerciseHistory';
import RestOverlay from './RestOverlay';
import { useData } from '../../context/DataContext';
import { itemKey } from '../../lib/plan';
import { colorsFor, makeLogger } from './shared';
import { EntryNotes } from './EntryNotes';

export default function RepsBlock({ inst, entry, exercise, eff }) {
  const { store, log, library, settings, plansById } = useData();
  const plan = inst.plan || plansById.get(inst.planId);
  const colors = colorsFor(inst.session.color);
  const [restTrigger, setRestTrigger] = useState(0);
  const [drafts, setDrafts] = useState({});
  const [menu, setMenu] = useState(null);
  const logger = makeLogger({ store, inst, plan, library, settings });

  const n = eff.loggedSets;
  const keyOf = (s) => itemKey(inst.key, entry.eid, s);
  const itemOf = (s) => log.items.get(keyOf(s));
  const doneCount = Array.from({ length: n }).filter((_, s) => itemOf(s)?.status === 'completed').length;

  const write = (s, status, extra = {}) =>
    logger.work({ entryKey: entry.eid, setIndex: s, exercise, eff, status, weight: itemOf(s)?.weight ?? (drafts[s] === '' || drafts[s] == null ? null : Number(drafts[s])), ...extra });

  function toggle(s) {
    const cur = itemOf(s);
    if (cur && cur.status === 'completed') {
      logger.remove(keyOf(s));
      return;
    }
    write(s, 'completed');
    if (s < n - 1 && eff.rest > 0) setRestTrigger((t) => t + 1);
  }

  function setStatus(s, status) {
    setMenu(null);
    if (status === 'clear') logger.remove(keyOf(s));
    else write(s, status);
  }

  function changeWeight(s, value) {
    setDrafts((d) => ({ ...d, [s]: value }));
    const cur = itemOf(s);
    if (cur) store.patchItem(keyOf(s), { weight: value === '' ? null : Number(value) });
  }

  function skipRemaining() {
    for (let s = 0; s < n; s++) if (!itemOf(s)) write(s, 'skipped');
  }

  const onRest = (o) => {
    const r = logger.rest({ entryKey: entry.eid, n: o.ref.setIndex, status: o.status, plannedSeconds: o.planned, elapsed: o.elapsed, exercise });
    return () => store.restore(r.item.item_key, r.prev);
  };

  const meta = `${eff.sets} sets × ${eff.reps} reps${exercise.notes ? ' · ' + exercise.notes : ''} · rest ${eff.rest}s`;

  return (
    <ExerciseShell done={doneCount === n} en={exercise.name.en} ar={exercise.name.ar} meta={meta}>
      <VideoBlock media={exercise.media} />
      <EntryNotes exercise={exercise} />
      <div className="hint">Tap a set once you complete it. A {eff.rest}s rest timer starts automatically. Weight is optional.</div>
      <RestOverlay seconds={eff.rest} trigger={restTrigger} title={exercise.name.en} titleAr={exercise.name.ar} colors={colors} onRest={onRest} />
      {Array.from({ length: n }).map((_, s) => {
        const it = itemOf(s);
        const status = it?.status;
        const weightValue = it ? it.weight : drafts[s] ?? '';
        return (
          <div key={s}>
            <div className="set-row">
              <button className={`setbox ${status === 'completed' ? 'done' : status === 'incomplete' ? 'incomplete' : status === 'skipped' ? 'skipped' : ''}`} onClick={() => toggle(s)} aria-label={`Set ${s + 1}`}>
                {status === 'completed' ? <Check size={13} strokeWidth={3} /> : status === 'incomplete' ? '½' : status === 'skipped' ? '–' : s + 1}
              </button>
              <div className="setlabel">
                {it?.source === 'claude' && <span className="pill extra">Claude</span>}
                Set {s + 1} — {eff.reps} reps{exercise.notes && /per/i.test(exercise.notes) ? ` (${exercise.notes})` : ''}
              </div>
              <input className="weight-input" type="number" inputMode="decimal" step="0.5" min="0" placeholder="—" value={weightValue ?? ''} onChange={(e) => changeWeight(s, e.target.value)} />
              <span className="weight-unit">kg</span>
              <button className="setmenu" onClick={() => setMenu(menu === s ? null : s)} aria-label="More options for this set">
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
      <div className="page-actions">
        <button className="btn small" onClick={skipRemaining}>
          Skip remaining sets
        </button>
      </div>
      <ExerciseHistory exerciseId={exercise.id} today={inst.date} />
    </ExerciseShell>
  );
}
