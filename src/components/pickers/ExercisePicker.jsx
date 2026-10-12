import { useMemo, useState } from 'react';
import Sheet from './Sheet';
import { useData } from '../../context/DataContext';
import { filterExercises, MUSCLES, TYPE_LABEL } from '../../data/library';

/** Pick one exercise from the whole library (search + muscle filter). */
export default function ExercisePicker({ title = 'Pick an exercise', onPick, onClose }) {
  const { library } = useData();
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('');
  const list = useMemo(() => filterExercises(library.list, { q, muscle }).slice(0, 80), [library, q, muscle]);
  return (
    <Sheet title={title} onClose={onClose}>
      <input className="search-input" placeholder="Search by name or muscle…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div className="field" style={{ marginTop: 8 }}>
        <select value={muscle} onChange={(e) => setMuscle(e.target.value)} aria-label="Filter by muscle">
          <option value="">All muscles</option>
          {Object.entries(MUSCLES).map(([k, m]) => (
            <option key={k} value={k}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      {list.map((e) => (
        <button key={e.id} className="list-row" onClick={() => onPick(e)}>
          <span className="main">
            <span className="t">{e.name.en}</span>
            <span className="s ar">{[e.name.ar, TYPE_LABEL[e.type]].filter(Boolean).join(' · ')}</span>
          </span>
        </button>
      ))}
      {list.length === 0 && <div className="hint">Nothing matches.</div>}
    </Sheet>
  );
}
