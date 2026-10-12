import { useState } from 'react';
import { motion } from 'framer-motion';
import { useData } from '../../context/DataContext';
import { CHECKPOINTS, PROGRESS_TESTS, PROGRESS_TEST_NOTE } from '../../data/pdfProgram';
import { today } from '../../lib/dates';

/** The PDF's self-test table, filled in at the start, week 4, week 8 and week 12. */
export default function ProgressTests() {
  const { tests, saveTest } = useData();
  const [cp, setCp] = useState('start');
  const stored = tests.find((t) => t.checkpoint === cp);
  const [draft, setDraft] = useState(() => stored?.data || {});
  const [testedOn, setTestedOn] = useState(stored?.tested_on || today());
  const [savedNote, setSavedNote] = useState('');

  function pick(id) {
    const s = tests.find((t) => t.checkpoint === id);
    setCp(id);
    setDraft(s?.data || {});
    setTestedOn(s?.tested_on || today());
    setSavedNote('');
  }

  const set = (testId, key, value) => setDraft((d) => ({ ...d, [testId]: { ...(d[testId] || {}), [key]: value } }));

  async function save() {
    await saveTest(cp, testedOn, draft);
    setSavedNote('Saved.');
  }

  const cell = (checkpoint, test) => {
    const d = tests.find((t) => t.checkpoint === checkpoint)?.data?.[test.id];
    if (!d) return '—';
    return test.fields.map((f) => (d[f.key] === true ? 'yes' : d[f.key] === false ? 'no' : d[f.key] ?? '')).filter((v) => v !== '').join(' / ') || '—';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="info-hero">
        <div className="badge ar">جدول الاختبارات</div>
        <h2>Progress tests</h2>
        <p>Fill this in at the start, week 4, week 8 and week 12 — same angle, same time of day.</p>
      </div>

      <div className="chip-row">
        {CHECKPOINTS.map((c) => (
          <button key={c.id} className={`chip ${cp === c.id ? 'active' : ''}`} onClick={() => pick(c.id)}>
            {c.en}
          </button>
        ))}
      </div>
      <div className="field" style={{ maxWidth: 220 }}>
        <label>Date tested</label>
        <input type="date" value={testedOn} onChange={(e) => setTestedOn(e.target.value)} />
      </div>

      {PROGRESS_TESTS.map((t) => (
        <div className="plan-day" key={t.id}>
          <h4>{t.en}</h4>
          <div className="ar hint" dir="rtl" style={{ margin: 0 }}>{t.ar} — {t.how}</div>
          <div className="field-row" style={{ marginTop: 8 }}>
            {t.fields.map((f) => (
              <div className="field" key={f.key}>
                <label>{f.label}</label>
                {f.kind === 'yesno' ? (
                  <select value={draft[t.id]?.[f.key] == null ? '' : String(draft[t.id][f.key])} onChange={(e) => set(t.id, f.key, e.target.value === '' ? null : e.target.value === 'true')}>
                    <option value="">—</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input type="number" inputMode="decimal" step="any" value={draft[t.id]?.[f.key] ?? ''} onChange={(e) => set(t.id, f.key, e.target.value === '' ? null : Number(e.target.value))} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="page-actions">
        <button className="btn primary" onClick={save}>Save {CHECKPOINTS.find((c) => c.id === cp).en}</button>
      </div>
      {savedNote && <div className="notice">{savedNote}</div>}
      <div className="hint ar" dir="rtl">{PROGRESS_TEST_NOTE}</div>

      <div className="section-label"><span>All checkpoints</span><span className="line" /></div>
      <div style={{ overflowX: 'auto' }}>
        <table className="test-table">
          <thead>
            <tr>
              <th>Test</th>
              {CHECKPOINTS.map((c) => <th key={c.id}>{c.en}</th>)}
            </tr>
          </thead>
          <tbody>
            {PROGRESS_TESTS.map((t) => (
              <tr key={t.id}>
                <td>{t.en}</td>
                {CHECKPOINTS.map((c) => <td key={c.id}>{cell(c.id, t)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
