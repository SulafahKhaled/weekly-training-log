import { useMemo, useState } from 'react';
import Sheet from '../pickers/Sheet';
import { useData } from '../../context/DataContext';
import { parseMediaMapping, matchMediaMapping, exerciseIndexCsv } from '../../lib/mediaImport';
import { toOverridePayload } from '../../data/library';

/** Paste a mapping (JSON / CSV / Markdown table / "id: url" lines) → preview matches → apply as exercise media. */
export default function MediaImport({ onClose }) {
  const { library, saveExercise } = useData();
  const [text, setText] = useState('');
  const [applied, setApplied] = useState(null);
  const [busy, setBusy] = useState(false);
  const result = useMemo(() => matchMediaMapping(parseMediaMapping(text), library.list), [text, library]);

  async function apply() {
    setBusy(true);
    for (const m of result.matched) await saveExercise({ ...m.exercise, ...toOverridePayload(m.exercise), media: m.media });
    setApplied(result.matched.length);
    setBusy(false);
  }

  function downloadIndex() {
    const blob = new Blob([exerciseIndexCsv(library.list)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'exercise-index.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Sheet title="Import media mapping" onClose={onClose}>
      <div className="hint">
        Paste a table or list that pairs each exercise (by <strong>id</strong> or exact <strong>name</strong>) with a link. Columns can include <em>url</em>, <em>start</em>, <em>source</em>, <em>verified</em>. Nothing is guessed — rows that don't match are listed, not applied.
      </div>
      <div className="page-actions">
        <button className="btn small" onClick={downloadIndex}>
          Download exercise index (CSV)
        </button>
      </div>
      <div className="field">
        <textarea style={{ minHeight: 160 }} placeholder={'id,url,start,source,verified\nhip_cars,https://www.youtube.com/watch?v=…,12,Channel name,2025-01-05'} value={text} onChange={(e) => { setText(e.target.value); setApplied(null); }} />
      </div>
      {text && (
        <div className="notice">
          {result.matched.length} matched · {result.unmatched.length} not found · {result.invalid.length} invalid link
        </div>
      )}
      {result.matched.slice(0, 40).map((m) => (
        <div key={m.exercise.id} className="list-row" style={{ cursor: 'default' }}>
          <span className="main">
            <span className="t">{m.exercise.name.en}</span>
            <span className="s">{m.media.url}</span>
          </span>
        </div>
      ))}
      {result.unmatched.length > 0 && (
        <div className="hint">
          Not found: {result.unmatched.slice(0, 20).map((r) => r.id || r.name).join(', ')}
          {result.unmatched.length > 20 ? '…' : ''}
        </div>
      )}
      {applied != null && <div className="notice">Saved media for {applied} exercises.</div>}
      <div className="page-actions">
        <button className="btn primary" disabled={busy || result.matched.length === 0} onClick={apply}>
          Apply to {result.matched.length} exercises
        </button>
      </div>
    </Sheet>
  );
}
