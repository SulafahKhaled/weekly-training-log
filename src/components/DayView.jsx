import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Clock } from 'lucide-react';
import SessionCard from './session/SessionCard';
import PrepareRecover from './PrepareRecover';
import ExercisePicker from './pickers/ExercisePicker';
import { useData } from '../context/DataContext';
import { sessionProgress, combineProgress } from '../lib/progress';
import { minimumVersion } from '../data/defaultPlan';
import { dayIdOf } from '../lib/dates';

const minKey = (date) => `wtl:min:${date}`;
function readMin(date) {
  try {
    return localStorage.getItem(minKey(date)) === '1';
  } catch {
    return false;
  }
}

/**
 * One weekday of the active plan, logged against TODAY's date — so any day's workout can be done on any day.
 * When the weekday is today, the extra sessions / quick-add exercises added to today appear too.
 */
export default function DayView({ day }) {
  const { date, instancesForPlanDay, activePlan, log, resolveEntry, addQuickExercise, settings } = useData();
  const [minimal, setMinimal] = useState(() => readMin(date));
  const [picking, setPicking] = useState(false);
  const isToday = dayIdOf(date) === day.id;

  const all = instancesForPlanDay(date, day.id);
  const mv = useMemo(() => (activePlan ? minimumVersion(activePlan, day.id, settings.stickLevel) : { breathing: [], movements: [] }), [activePlan, day.id, settings.stickLevel]);

  let shown = all;
  if (minimal) {
    const pick = new Map();
    mv.movements.forEach((m) => pick.set(m.sessionId, [...(pick.get(m.sessionId) || []), m.eid]));
    shown = all
      .map((inst) => {
        if (!inst.session.optional) return inst;
        if (mv.breathing.includes(inst.sessionId)) return inst;
        if (pick.has(inst.sessionId)) {
          const keep = new Set(pick.get(inst.sessionId));
          return { ...inst, session: { ...inst.session, entries: inst.session.entries.filter((e) => keep.has(e.eid)) } };
        }
        return null;
      })
      .filter(Boolean);
  }

  const required = shown.filter((i) => !i.session.optional || i.source !== 'plan');
  const p = combineProgress(required.map((i) => sessionProgress(i, resolveEntry, log)));
  const pct = p.total ? p.done / p.total : 0;
  const mainColor = (all.find((i) => i.sessionId === 'main')?.session.color) || day.color;

  function toggleMin() {
    const next = !minimal;
    setMinimal(next);
    try {
      localStorage.setItem(minKey(date), next ? '1' : '0');
    } catch {
      /* private mode — the toggle simply won't persist */
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="day-hero" style={{ background: `var(--${mainColor}-dim)`, borderColor: `var(--${mainColor})` }}>
        <span className="tag" style={{ background: 'rgba(255,255,255,.6)', color: `var(--${mainColor})` }}>
          {day.tag} · {day.tagAr}
        </span>
        <h2>
          {day.nameEn} <span style={{ fontWeight: 400, color: 'var(--text-dim)' }}>{day.nameAr}</span>
        </h2>
        <div className="progress-row">
          <div className="progress-track">
            <motion.div className="progress-fill" style={{ background: `var(--${mainColor})` }} initial={false} animate={{ width: `${pct * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 22 }} />
          </div>
          <span className="progress-txt">
            {p.done}/{p.total}
          </span>
        </div>
        {activePlan?.addOns?.[day.id] && (
          <div className="hint" style={{ margin: '8px 0 0' }}>
            <Clock size={12} style={{ verticalAlign: -2 }} /> PDF add-on: {activePlan.addOns[day.id].en} · {activePlan.addOns[day.id].minutes} min
          </div>
        )}
      </div>

      {!isToday && (
        <div className="notice">
          This is {day.nameEn}'s plan — anything you tick is logged under <strong>today's date</strong>, linked to this session.
        </div>
      )}

      <PrepareRecover dayId={day.id} />

      <div className="section-label">
        <span>💪 Sessions</span>
        <span className="line" />
      </div>
      <div className="page-actions">
        <button className={`btn small ${minimal ? 'primary' : ''}`} onClick={toggleMin} aria-pressed={minimal}>
          12-hour work day: minimum version
        </button>
        {isToday && (
          <button className="btn small" onClick={() => setPicking(true)}>
            <Plus size={13} /> Quick-add exercise
          </button>
        )}
      </div>
      {minimal && <div className="hint">Minimum version: morning breathing + 3 movements from today's add-ons. Consistency matters more than completeness.</div>}

      {shown.map((inst) => (
        <SessionCard key={`${inst.key}${minimal ? ':min' : ''}`} inst={inst} />
      ))}
      {shown.length === 0 && <div className="hint">No sessions on this day yet — add some in Plans.</div>}

      {picking && (
        <ExercisePicker
          title="Quick-add an exercise for today"
          onClose={() => setPicking(false)}
          onPick={(ex) => {
            addQuickExercise(date, ex.id);
            setPicking(false);
          }}
        />
      )}
    </motion.div>
  );
}
