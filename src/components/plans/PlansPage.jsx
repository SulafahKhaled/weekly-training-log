import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Copy, Check, Pencil, Trash2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { duplicatePlan, newPlan } from '../../lib/plan';
import { DEFAULT_PLAN_ID } from '../../data/legacyMap';
import PlanEditor from './PlanEditor';

export default function PlansPage() {
  const { plans, activePlan, settings, updateSettings, savePlan, removePlan } = useData();
  const [editingId, setEditingId] = useState(null);
  const editing = plans.find((p) => p.id === editingId);

  if (editing) return <PlanEditor plan={editing} onBack={() => setEditingId(null)} />;

  async function create(copyFrom) {
    const name = window.prompt('Name for the new plan', copyFrom ? `${copyFrom.name} (copy)` : 'New plan');
    if (!name) return;
    const plan = copyFrom ? duplicatePlan(copyFrom, name) : newPlan(name);
    await savePlan(plan, plans.length);
    setEditingId(plan.id);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="info-hero">
        <div className="badge">الخطط</div>
        <h2>Training plans</h2>
        <p>A plan is a week of days; each day holds sessions; each session is an ordered list of exercises. The active plan drives Home and the statistics’ “planned” numbers.</p>
      </div>
      <div className="page-actions">
        <button className="btn primary" onClick={() => create(null)}>
          <Plus size={15} /> New plan
        </button>
        <button className="btn" onClick={() => create(activePlan)}>
          <Copy size={15} /> Duplicate active plan
        </button>
      </div>
      {plans.map((p) => {
        const active = p.id === (activePlan?.id ?? settings.activePlanId);
        const sessionCount = Object.values(p.days || {}).reduce((n, d) => n + d.length, 0);
        return (
          <div key={p.id} className="plan-day">
            <h4>
              {p.name}
              {active && <span className="pill extra">active</span>}
              {p.id === DEFAULT_PLAN_ID && <span className="pill">original</span>}
            </h4>
            <div className="hint" style={{ margin: 0 }}>
              {sessionCount} sessions across the week
            </div>
            <div className="page-actions">
              {!active && (
                <button className="btn small primary" onClick={() => updateSettings({ activePlanId: p.id })}>
                  <Check size={13} /> Make active
                </button>
              )}
              <button className="btn small" onClick={() => setEditingId(p.id)}>
                <Pencil size={13} /> Edit
              </button>
              <button className="btn small" onClick={() => create(p)}>
                <Copy size={13} /> Duplicate
              </button>
              {p.id !== DEFAULT_PLAN_ID && (
                <button
                  className="btn small danger"
                  onClick={() => {
                    if (window.confirm(`Delete “${p.name}”? Your logged history stays.`)) removePlan(p.id);
                  }}
                >
                  <Trash2 size={13} /> Delete
                </button>
              )}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
