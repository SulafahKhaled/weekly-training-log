import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Upload } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { filterExercises, MUSCLES, GROUPS, EXERCISE_TYPES, TYPE_LABEL, blankExercise, muscleLabel } from '../../data/library';
import ExerciseEditor from './ExerciseEditor';
import MediaImport from './MediaImport';

const SOURCES = [
  ['plan', 'My plan'],
  ['atlas', 'Muscle Atlas'],
  ['pdf', 'Flexibility PDF'],
  ['custom', 'My own'],
];

export default function LibraryPage() {
  const { library } = useData();
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('');
  const [type, setType] = useState('');
  const [group, setGroup] = useState('');
  const [source, setSource] = useState('');
  const [archived, setArchived] = useState(false);
  const [editing, setEditing] = useState(null);
  const [importing, setImporting] = useState(false);

  const list = useMemo(() => filterExercises(library.list, { q, muscle, type, group, source, archived }), [library, q, muscle, type, group, source, archived]);
  const missing = library.list.filter((e) => !e.archived && !e.media?.url).length;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="info-hero">
        <div className="badge">المكتبة</div>
        <h2>Exercise library</h2>
        <p>
          {library.list.length} exercises — your plan, the Muscle Atlas and the flexibility PDF in one place. Edit anything, add your own, and filter by muscle, type or session.
        </p>
      </div>

      <div className="page-actions">
        <button className="btn primary" onClick={() => setEditing({ exercise: blankExercise(), isNew: true })}>
          <Plus size={15} /> New exercise
        </button>
        <button className="btn" onClick={() => setImporting(true)}>
          <Upload size={15} /> Import media
        </button>
      </div>
      <div className="hint">{missing} exercises have no media yet.</div>

      <input className="search-input" placeholder="Search name (English / عربي), id or muscle…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="field-row" style={{ marginTop: 8 }}>
        <div className="field">
          <select value={muscle} onChange={(e) => setMuscle(e.target.value)} aria-label="Muscle">
            <option value="">All muscles</option>
            {Object.entries(MUSCLES).map(([k, m]) => (
              <option key={k} value={k}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
            <option value="">All types</option>
            {EXERCISE_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Day or session">
            <option value="">Any day / session</option>
            {GROUPS.map((g) => (
              <option key={g.key} value={g.key}>{g.en}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Source">
            <option value="">Any source</option>
            {SOURCES.map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </div>
      </div>
      <label className="hint" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} /> Show archived only
      </label>

      <div className="hint">{list.length} shown</div>
      {list.slice(0, 200).map((e) => (
        <button key={e.id} className="list-row" onClick={() => setEditing({ exercise: e, isNew: false })}>
          <span className="main">
            <span className="t">
              {e.name.en || e.name.ar}
              {e.edited && <span className="pill">edited</span>}
              {!e.media?.url && <span className="pill">no media yet</span>}
            </span>
            <span className="s">
              {TYPE_LABEL[e.type]} · {e.type === 'reps' ? `${e.sets}×${e.reps ?? '?'}` : `${e.sets}×${e.seconds ?? '?'}s`}
              {e.primary.length ? ` · ${e.primary.slice(0, 3).map(muscleLabel).join(', ')}` : ''}
            </span>
          </span>
        </button>
      ))}
      {list.length > 200 && <div className="hint">Showing the first 200 — narrow the filters to see the rest.</div>}

      {editing && <ExerciseEditor exercise={editing.exercise} isNew={editing.isNew} onClose={() => setEditing(null)} />}
      {importing && <MediaImport onClose={() => setImporting(false)} />}
    </motion.div>
  );
}
