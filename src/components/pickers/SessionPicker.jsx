import { useState } from 'react';
import Sheet from './Sheet';
import { useData } from '../../context/DataContext';
import { DAYS } from '../../data/days';
import { dayIdOf } from '../../lib/dates';

/** Pick any session from any day of any plan (to do it on a different day, or to move it in the plan editor). */
export default function SessionPicker({ title = "Add a session", onPick, onClose, skip = [] }) {
  const { plans, activePlan, date } = useData();
  const [planId, setPlanId] = useState(activePlan?.id);
  const [day, setDay] = useState(dayIdOf(date));
  const plan = plans.find((p) => p.id === planId) || activePlan;
  const sessions = (plan?.days?.[day] || []).filter((s) => !skip.some((k) => k.planId === plan.id && k.day === day && k.sessionId === s.id));
  return (
    <Sheet title={title} onClose={onClose}>
      {plans.length > 1 && (
        <div className="field">
          <label>Plan</label>
          <select value={plan?.id} onChange={(e) => setPlanId(e.target.value)}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="chip-row">
        {DAYS.map((d) => (
          <button key={d.id} className={`chip ${day === d.id ? 'active' : ''}`} onClick={() => setDay(d.id)}>
            {d.nameEn.slice(0, 3)}
          </button>
        ))}
      </div>
      {sessions.length === 0 && <div className="hint">No sessions on this day.</div>}
      {sessions.map((s) => (
        <button key={s.id} className="list-row" onClick={() => onPick({ planId: plan.id, day, sessionId: s.id, session: s })}>
          <span className="main">
            <span className="t">{s.name.en}</span>
            <span className="s ar">
              {s.name.ar}
              {s.optional ? ' · optional' : ''} · {s.entries.length} items
            </span>
          </span>
        </button>
      ))}
    </Sheet>
  );
}
