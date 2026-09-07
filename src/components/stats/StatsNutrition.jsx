import { useEffect, useState } from 'react';
import { fetchNutritionLogs, saveNutritionLog, fetchNutritionGoals, saveNutritionGoal, todayKey } from '../../lib/api';
import { addMonths, today } from '../../lib/dates';
import LineChart from '../shared/LineChart';
import Collapsible from '../shared/Collapsible';
import ProgressRing from '../ProgressRing';

const RANGES = [
  { id: '1m', label: '1 month' },
  { id: '3m', label: '3 months' },
  { id: '1y', label: '1 year' },
  { id: 'all', label: 'All time' },
];

const HIGHLIGHTED = [
  { field: 'calories', goalField: 'calories_goal', label: 'Calories', unit: '', color: 'var(--upper)' },
  { field: 'protein_g', goalField: 'protein_goal', label: 'Protein', unit: 'g', color: 'var(--lower)' },
  { field: 'fiber_g', goalField: 'fiber_goal', label: 'Fiber', unit: 'g', color: 'var(--core)' },
];
const SECONDARY = [
  { field: 'carbs_g', label: 'Carbs', unit: 'g' },
  { field: 'fat_g', label: 'Fat', unit: 'g' },
];

const emptyLogForm = () => ({ date: todayKey(), calories: '', protein_g: '', fiber_g: '', carbs_g: '', fat_g: '', notes: '' });
const emptyGoalForm = () => ({ effective_from: todayKey(), calories_goal: '', protein_goal: '', fiber_goal: '' });

function rangeCutoff(rangeId) {
  if (rangeId === '1m') return addMonths(today(), -1);
  if (rangeId === '3m') return addMonths(today(), -3);
  if (rangeId === '1y') return addMonths(today(), -12);
  return '0000-01-01';
}

export default function StatsNutrition() {
  const [range, setRange] = useState('3m');
  const [logs, setLogs] = useState(null);
  const [goals, setGoals] = useState(null);
  const [logForm, setLogForm] = useState(emptyLogForm);
  const [goalForm, setGoalForm] = useState(emptyGoalForm);
  const [saving, setSaving] = useState(false);

  function reload() {
    fetchNutritionLogs()
      .then((r) => setLogs(r.logs))
      .catch(() => setLogs([]));
    fetchNutritionGoals()
      .then((r) => setGoals(r.goals))
      .catch(() => setGoals([]));
  }
  useEffect(reload, []);

  if (!logs || !goals) return <div className="hint">Loading…</div>;

  const currentGoal = goals.filter((g) => g.effective_from <= todayKey()).sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1))[0];
  const todayLog = logs.find((l) => l.date === todayKey());
  const cutoff = rangeCutoff(range);

  async function handleSaveLog() {
    setSaving(true);
    try {
      const { date, notes, ...macros } = logForm;
      await saveNutritionLog({
        date,
        calories: macros.calories === '' ? null : Number(macros.calories),
        protein_g: macros.protein_g === '' ? null : Number(macros.protein_g),
        fiber_g: macros.fiber_g === '' ? null : Number(macros.fiber_g),
        carbs_g: macros.carbs_g === '' ? null : Number(macros.carbs_g),
        fat_g: macros.fat_g === '' ? null : Number(macros.fat_g),
        notes: notes || null,
      });
      setLogForm(emptyLogForm());
      reload();
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveGoal() {
    setSaving(true);
    try {
      await saveNutritionGoal({
        effective_from: goalForm.effective_from,
        calories_goal: goalForm.calories_goal === '' ? null : Number(goalForm.calories_goal),
        protein_goal: goalForm.protein_goal === '' ? null : Number(goalForm.protein_goal),
        fiber_goal: goalForm.fiber_goal === '' ? null : Number(goalForm.fiber_goal),
      });
      setGoalForm(emptyGoalForm());
      reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {currentGoal && (
        <div className="nutrition-rings-row">
          {HIGHLIGHTED.map((m) => {
            const actual = todayLog?.[m.field] ?? 0;
            const goal = currentGoal[m.goalField];
            const fraction = goal ? actual / goal : 0;
            return (
              <div className="nutrition-ring" key={m.field}>
                <ProgressRing fraction={fraction} size={78} stroke={7} color={m.color} track="var(--line)">
                  <span className="nutrition-ring-frac">
                    {actual}
                    {m.unit}
                  </span>
                </ProgressRing>
                <div className="nutrition-ring-label">
                  {m.label}
                  {goal ? ` / ${goal}${m.unit}` : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!currentGoal && <div className="hint">Set a daily goal below to see today's rings.</div>}
      {todayLog && (SECONDARY.some((m) => todayLog[m.field] != null)) && (
        <div className="nutrition-secondary-row">
          {SECONDARY.map((m) => (todayLog[m.field] != null ? <span key={m.field}>{m.label}: {todayLog[m.field]}{m.unit}</span> : null))}
        </div>
      )}

      <Collapsible id="nutrition-log-form" title="Log today's macros">
        <div className="body-form-grid">
          <label>
            Date
            <input type="date" value={logForm.date} max={todayKey()} onChange={(e) => setLogForm((f) => ({ ...f, date: e.target.value }))} />
          </label>
          {[...HIGHLIGHTED, ...SECONDARY].map((m) => (
            <label key={m.field}>
              {m.label} ({m.unit || 'kcal'})
              <input type="number" step="1" placeholder="—" value={logForm[m.field]} onChange={(e) => setLogForm((f) => ({ ...f, [m.field]: e.target.value }))} />
            </label>
          ))}
        </div>
        <textarea className="journal-textarea" placeholder="Notes (optional)" value={logForm.notes} onChange={(e) => setLogForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
        <div className="journal-form-actions">
          <button className="journal-btn journal-btn-primary" onClick={handleSaveLog} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Collapsible>

      <Collapsible id="nutrition-goal-form" title="Daily goals" defaultCollapsed>
        <div className="body-form-grid">
          <label>
            Effective from
            <input type="date" value={goalForm.effective_from} max={todayKey()} onChange={(e) => setGoalForm((f) => ({ ...f, effective_from: e.target.value }))} />
          </label>
          {HIGHLIGHTED.map((m) => (
            <label key={m.goalField}>
              {m.label} goal ({m.unit || 'kcal'})
              <input type="number" step="1" placeholder="—" value={goalForm[m.goalField]} onChange={(e) => setGoalForm((f) => ({ ...f, [m.goalField]: e.target.value }))} />
            </label>
          ))}
        </div>
        <div className="journal-form-actions">
          <button className="journal-btn journal-btn-primary" onClick={handleSaveGoal} disabled={saving}>
            {saving ? 'Saving…' : 'Set goal'}
          </button>
        </div>
        {currentGoal && (
          <div className="body-delta" style={{ marginTop: 10 }}>
            Active since {currentGoal.effective_from}: {currentGoal.calories_goal ?? '—'} kcal · {currentGoal.protein_goal ?? '—'}g protein · {currentGoal.fiber_goal ?? '—'}g fiber
          </div>
        )}
      </Collapsible>

      <div className="segmented compact">
        {RANGES.map((r) => (
          <button key={r.id} className={range === r.id ? 'active' : ''} onClick={() => setRange(r.id)}>
            {r.label}
          </button>
        ))}
      </div>

      {HIGHLIGHTED.map((m) => {
        const allPoints = logs.map((l) => ({ date: l.date, value: l[m.field] }));
        if (!allPoints.some((p) => p.value != null)) return null;
        const points = allPoints.filter((p) => p.date >= cutoff);
        return (
          <Collapsible key={m.field} id={`nutrition-chart-${m.field}`} title={m.label}>
            <LineChart data={points} label={m.label} unit={m.unit ? ` ${m.unit}` : ' kcal'} color={m.color} goal={currentGoal?.[m.goalField] ?? undefined} />
          </Collapsible>
        );
      })}

      {SECONDARY.map((m) => {
        const allPoints = logs.map((l) => ({ date: l.date, value: l[m.field] }));
        if (!allPoints.some((p) => p.value != null)) return null;
        const points = allPoints.filter((p) => p.date >= cutoff);
        return (
          <Collapsible key={m.field} id={`nutrition-chart-${m.field}`} title={m.label}>
            <LineChart data={points} label={m.label} unit={` ${m.unit}`} color="var(--text-faint)" />
          </Collapsible>
        );
      })}
    </div>
  );
}
