import { useEffect, useState } from 'react';
import { fetchBodyLogs, fetchBodyMeasurements, saveBodyLog, saveBodyMeasurement, todayKey } from '../../lib/api';
import { addMonths, today } from '../../lib/dates';
import { computeDelta, fmtDelta } from '../../lib/bodyStats';
import LineChart from '../shared/LineChart';
import Collapsible from '../shared/Collapsible';

const RANGES = [
  { id: '1m', label: '1 month' },
  { id: '3m', label: '3 months' },
  { id: '1y', label: '1 year' },
  { id: 'all', label: 'All time' },
];

const MEASUREMENT_TYPES = [
  { id: 'neck', label: 'Neck' },
  { id: 'waist', label: 'Waist' },
  { id: 'hips', label: 'Hips' },
  { id: 'arms', label: 'Arms' },
  { id: 'thighs', label: 'Thighs' },
];

const COMPOSITION_METRICS = [
  { field: 'weight', label: 'Weight', unit: 'kg' },
  { field: 'muscle_mass', label: 'Muscle mass', unit: 'kg' },
  { field: 'fat_mass', label: 'Fat mass', unit: 'kg' },
  { field: 'body_fat_percent', label: 'Body fat', unit: '%' },
];

const emptyForm = () => ({ date: todayKey(), weight: '', muscle_mass: '', fat_mass: '', body_fat_percent: '', notes: '', neck: '', waist: '', hips: '', arms: '', thighs: '' });

function rangeCutoff(rangeId) {
  if (rangeId === '1m') return addMonths(today(), -1);
  if (rangeId === '3m') return addMonths(today(), -3);
  if (rangeId === '1y') return addMonths(today(), -12);
  return '0000-01-01';
}

export default function StatsBody() {
  const [range, setRange] = useState('3m');
  const [logs, setLogs] = useState(null);
  const [measurements, setMeasurements] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function reload() {
    fetchBodyLogs()
      .then((r) => setLogs(r.logs))
      .catch(() => setLogs([]));
    fetchBodyMeasurements()
      .then((r) => setMeasurements(r.measurements))
      .catch(() => setMeasurements([]));
  }
  useEffect(reload, []);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { date, notes, weight, muscle_mass, fat_mass, body_fat_percent } = form;
      const hasComposition = [weight, muscle_mass, fat_mass, body_fat_percent].some((v) => v !== '') || notes;
      if (hasComposition) {
        await saveBodyLog({
          date,
          weight: weight === '' ? null : Number(weight),
          muscle_mass: muscle_mass === '' ? null : Number(muscle_mass),
          fat_mass: fat_mass === '' ? null : Number(fat_mass),
          body_fat_percent: body_fat_percent === '' ? null : Number(body_fat_percent),
          notes: notes || null,
        });
      }
      for (const t of MEASUREMENT_TYPES) {
        const v = form[t.id];
        if (v !== '') await saveBodyMeasurement({ date, measurementType: t.id, value: Number(v), unit: 'cm' });
      }
      setForm(emptyForm());
      reload();
    } finally {
      setSaving(false);
    }
  }

  if (!logs || !measurements) return <div className="hint">Loading…</div>;

  const cutoff = rangeCutoff(range);

  return (
    <div>
      <Collapsible id="body-log-form" title="Log today's numbers">
        <div className="body-form-grid">
          <label>
            Date
            <input type="date" value={form.date} max={todayKey()} onChange={(e) => setField('date', e.target.value)} />
          </label>
          {COMPOSITION_METRICS.map((m) => (
            <label key={m.field}>
              {m.label} ({m.unit})
              <input type="number" step="0.1" placeholder="—" value={form[m.field]} onChange={(e) => setField(m.field, e.target.value)} />
            </label>
          ))}
          {MEASUREMENT_TYPES.map((t) => (
            <label key={t.id}>
              {t.label} (cm)
              <input type="number" step="0.1" placeholder="—" value={form[t.id]} onChange={(e) => setField(t.id, e.target.value)} />
            </label>
          ))}
        </div>
        <textarea className="journal-textarea" placeholder="Notes (optional)" value={form.notes} onChange={(e) => setField('notes', e.target.value)} rows={2} />
        <div className="journal-form-actions">
          <button className="journal-btn journal-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Collapsible>

      <div className="segmented compact">
        {RANGES.map((r) => (
          <button key={r.id} className={range === r.id ? 'active' : ''} onClick={() => setRange(r.id)}>
            {r.label}
          </button>
        ))}
      </div>

      {COMPOSITION_METRICS.map((m) => {
        const allPoints = logs.map((l) => ({ date: l.date, value: l[m.field] }));
        if (!allPoints.some((p) => p.value != null)) return null;
        const points = allPoints.filter((p) => p.date >= cutoff);
        const delta = computeDelta(allPoints);
        return (
          <Collapsible key={m.field} id={`body-chart-${m.field}`} title={m.label} summary={delta ? fmtDelta(delta.sinceFirst, m.unit) : undefined}>
            {delta && (
              <div className="body-delta">
                {fmtDelta(delta.sinceFirst, m.unit)} since first log
                {delta.has30 && ` · ${fmtDelta(delta.since30, m.unit)} in the last 30 days`}
              </div>
            )}
            <LineChart data={points} label={m.label} unit={m.unit === '%' ? '%' : ` ${m.unit}`} color="var(--upper)" />
          </Collapsible>
        );
      })}

      {MEASUREMENT_TYPES.map((t) => {
        const allPoints = measurements.filter((mm) => mm.measurement_type === t.id).map((mm) => ({ date: mm.date, value: mm.value }));
        if (!allPoints.length) return null;
        const points = allPoints.filter((p) => p.date >= cutoff);
        const delta = computeDelta(allPoints);
        return (
          <Collapsible key={t.id} id={`body-chart-${t.id}`} title={t.label} summary={delta ? fmtDelta(delta.sinceFirst, ' cm') : undefined}>
            {delta && (
              <div className="body-delta">
                {fmtDelta(delta.sinceFirst, ' cm')} since first log
                {delta.has30 && ` · ${fmtDelta(delta.since30, ' cm')} in the last 30 days`}
              </div>
            )}
            <LineChart data={points} label={t.label} unit=" cm" color="var(--lower)" />
          </Collapsible>
        );
      })}
    </div>
  );
}
