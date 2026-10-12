import { useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, ChevronLeft, ArrowRightLeft, Repeat } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { DAYS } from '../../data/days';
import {
  DAY_IDS, renamePlan, setPlanTiming, addSession, removeSession, reorderSession, moveSession, swapSessions, swapDays,
  addEntry, removeEntry, reorderEntry, setEntryOverrides, newExerciseEntry, renameSession, setSessionOptional, newId, effectiveEntry,
} from '../../lib/plan';
import ExercisePicker from '../pickers/ExercisePicker';
import SessionPicker from '../pickers/SessionPicker';
import { TYPE_LABEL } from '../../data/library';

const DAY_NAME = Object.fromEntries(DAYS.map((d) => [d.id, d.nameEn]));

function OverrideFields({ entry, exercise, eff, onChange }) {
  const o = entry.overrides || {};
  const timed = eff.type !== 'reps';
  const field = (key, label, placeholder) => (
    <div className="field" key={key}>
      <label>{label}</label>
      <input type="number" min="0" inputMode="numeric" placeholder={String(placeholder ?? '—')} value={o[key] ?? ''} onChange={(e) => onChange({ [key]: e.target.value === '' ? null : Number(e.target.value) })} />
    </div>
  );
  return (
    <div className="field-row" style={{ marginTop: 6 }}>
      {field('sets', eff.type === 'cardio' ? 'Rounds' : 'Sets', exercise?.sets)}
      {!timed && field('reps', 'Reps', exercise?.reps)}
      {timed && field('seconds', 'Seconds', exercise?.seconds)}
      {field('rest', 'Rest (s)', exercise?.rest)}
      {field('countdown', 'Countdown (s)', exercise?.countdown ?? 'default')}
    </div>
  );
}

export default function PlanEditor({ plan, onBack }) {
  const { savePlan, library, settings, plansById } = useData();
  const [open, setOpen] = useState(null); // `${day}:${sessionId}:${eid}` of an entry whose overrides are showing
  const [picker, setPicker] = useState(null); // {day, sessionId} to add an exercise to
  const [sessionPick, setSessionPick] = useState(null); // {mode:'copy'|'swap', day, sessionId?}
  const [daySwap, setDaySwap] = useState('');

  const apply = (next) => savePlan(next);

  function newSession(day) {
    const name = window.prompt('Session name', 'New session');
    if (!name) return;
    apply(addSession(plan, day, { id: newId('s'), name: { en: name, ar: '' }, color: 'upper', optional: false, entries: [] }));
  }

  return (
    <div>
      <button className="exercise-back" onClick={onBack}>
        <ChevronLeft size={15} /> All plans
      </button>

      <div className="field">
        <label>Plan name</label>
        <input value={plan.name} onChange={(e) => apply(renamePlan(plan, e.target.value))} />
      </div>

      <div className="plan-day">
        <h4>Timing for this plan</h4>
        <div className="hint" style={{ margin: 0 }}>
          Leave blank to use each exercise’s own value, then your global defaults (Settings). An exercise’s own override inside a session always wins over this.
        </div>
        <div className="field-row" style={{ marginTop: 8 }}>
          {[['countdown', 'Countdown (s)', settings.countdown], ['work', 'Work (s) — intervals', settings.work], ['rest', 'Rest (s)', settings.rest]].map(([k, label, ph]) => (
            <div className="field" key={k}>
              <label>{label}</label>
              <input type="number" min="0" inputMode="numeric" placeholder={`global ${ph}`} value={plan.timing?.[k] ?? ''} onChange={(e) => apply(setPlanTiming(plan, { [k]: e.target.value === '' ? null : Number(e.target.value) }))} />
            </div>
          ))}
        </div>
      </div>

      <div className="plan-day">
        <h4>Swap two whole days</h4>
        <div className="field-row">
          <div className="field">
            <select value={daySwap} onChange={(e) => setDaySwap(e.target.value)} aria-label="Swap day A">
              <option value="">Day A…</option>
              {DAY_IDS.map((d) => <option key={d} value={d}>{DAY_NAME[d]}</option>)}
            </select>
          </div>
          <div className="field">
            <select value="" onChange={(e) => { if (daySwap && e.target.value) { apply(swapDays(plan, daySwap, e.target.value)); setDaySwap(''); } }} aria-label="Swap day B">
              <option value="">with Day B…</option>
              {DAY_IDS.filter((d) => d !== daySwap).map((d) => <option key={d} value={d}>{DAY_NAME[d]}</option>)}
            </select>
          </div>
        </div>
      </div>

      {DAY_IDS.map((day) => (
        <div className="plan-day" key={day}>
          <h4>{DAY_NAME[day]}</h4>
          {(plan.days[day] || []).map((session, si) => (
            <div key={session.id} style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8, marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  className="search-input"
                  style={{ flex: 1, minWidth: 140 }}
                  value={session.name.en}
                  onChange={(e) => apply(renameSession(plan, day, session.id, { en: e.target.value }))}
                  aria-label="Session name"
                />
                <label className="hint" style={{ margin: 0, display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input type="checkbox" checked={!!session.optional} onChange={(e) => apply(setSessionOptional(plan, day, session.id, e.target.checked))} /> optional
                </label>
              </div>
              <div className="page-actions" style={{ margin: '6px 0' }}>
                <button className="icon-btn" disabled={si === 0} onClick={() => apply(reorderSession(plan, day, si, si - 1))} aria-label="Move session up"><ArrowUp size={14} /></button>
                <button className="icon-btn" disabled={si === plan.days[day].length - 1} onClick={() => apply(reorderSession(plan, day, si, si + 1))} aria-label="Move session down"><ArrowDown size={14} /></button>
                <select
                  aria-label="Move session to another day"
                  value=""
                  onChange={(e) => e.target.value && apply(moveSession(plan, day, session.id, e.target.value))}
                  className="btn small"
                >
                  <option value="">Move to…</option>
                  {DAY_IDS.filter((d) => d !== day).map((d) => <option key={d} value={d}>{DAY_NAME[d]}</option>)}
                </select>
                <button className="btn small" onClick={() => setSessionPick({ mode: 'swap', day, sessionId: session.id })}>
                  <Repeat size={13} /> Swap with…
                </button>
                <button className="btn small" onClick={() => setPicker({ day, sessionId: session.id })}>
                  <Plus size={13} /> Exercise
                </button>
                <button className="icon-btn" onClick={() => { if (window.confirm(`Remove “${session.name.en}” from ${DAY_NAME[day]}?`)) apply(removeSession(plan, day, session.id)); }} aria-label="Remove session">
                  <Trash2 size={14} />
                </button>
              </div>

              {session.entries.map((entry, ei) => {
                const ex = entry.kind === 'circuit' ? null : library.byId.get(entry.exerciseId);
                const eff = ex ? effectiveEntry(entry, ex, plan, settings) : null;
                const k = `${day}:${session.id}:${entry.eid}`;
                return (
                  <div key={entry.eid}>
                    <div className="plan-entry">
                      <div className="grow">
                        <div>{entry.kind === 'circuit' ? `${entry.name.en} (circuit)` : ex?.name.en || entry.exerciseId}{entry.level ? <span className="pill">L{entry.level}</span> : null}</div>
                        <div className="mini">
                          {entry.kind === 'circuit'
                            ? `${entry.rounds} rounds · ${entry.items.length} moves · ${entry.work}s/${entry.rest}s`
                            : `${TYPE_LABEL[eff.type]} · ${eff.type === 'reps' ? `${eff.sets}×${eff.reps}` : `${eff.sets}×${eff.seconds}s`} · rest ${eff.rest}s`}
                        </div>
                      </div>
                      {entry.kind !== 'circuit' && (
                        <button className="btn small" onClick={() => setOpen(open === k ? null : k)}>Override</button>
                      )}
                      <button className="icon-btn" disabled={ei === 0} onClick={() => apply(reorderEntry(plan, day, session.id, ei, ei - 1))} aria-label="Move up"><ArrowUp size={14} /></button>
                      <button className="icon-btn" disabled={ei === session.entries.length - 1} onClick={() => apply(reorderEntry(plan, day, session.id, ei, ei + 1))} aria-label="Move down"><ArrowDown size={14} /></button>
                      <button className="icon-btn" onClick={() => apply(removeEntry(plan, day, session.id, entry.eid))} aria-label="Remove exercise"><Trash2 size={14} /></button>
                    </div>
                    {open === k && ex && (
                      <OverrideFields entry={entry} exercise={ex} eff={eff} onChange={(patch) => apply(setEntryOverrides(plan, day, session.id, entry.eid, patch))} />
                    )}
                  </div>
                );
              })}
              {session.entries.length === 0 && <div className="hint">No exercises yet.</div>}
            </div>
          ))}
          <div className="page-actions">
            <button className="btn small" onClick={() => newSession(day)}>
              <Plus size={13} /> New session
            </button>
            <button className="btn small" onClick={() => setSessionPick({ mode: 'copy', day })}>
              <ArrowRightLeft size={13} /> Copy a session here
            </button>
          </div>
        </div>
      ))}

      {picker && (
        <ExercisePicker
          title="Add an exercise to the session"
          onClose={() => setPicker(null)}
          onPick={(ex) => {
            apply(addEntry(plan, picker.day, picker.sessionId, newExerciseEntry(ex.id)));
            setPicker(null);
          }}
        />
      )}
      {sessionPick && (
        <SessionPicker
          title={sessionPick.mode === 'swap' ? 'Swap with which session?' : `Copy a session to ${DAY_NAME[sessionPick.day]}`}
          onClose={() => setSessionPick(null)}
          skip={sessionPick.mode === 'swap' ? [{ planId: plan.id, day: sessionPick.day, sessionId: sessionPick.sessionId }] : []}
          onPick={(ref) => {
            if (sessionPick.mode === 'swap') {
              if (ref.planId === plan.id) apply(swapSessions(plan, sessionPick.day, sessionPick.sessionId, ref.day, ref.sessionId));
            } else {
              const source = plansById.get(ref.planId)?.days?.[ref.day]?.find((s) => s.id === ref.sessionId);
              if (source) apply(addSession(plan, sessionPick.day, { ...source, id: newId('s') }));
            }
            setSessionPick(null);
          }}
        />
      )}
    </div>
  );
}
