import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { ALL_EXERCISES } from '../../data/days';
import { fetchStatsLogs } from '../../lib/api';
import { buildSessions, filterRange } from '../../lib/exerciseProgress';
import LineChart from '../shared/LineChart';

const RANGES = [
  { id: 'last4', label: 'Last 4' },
  { id: '3months', label: '3 months' },
  { id: 'all', label: 'All time' },
];

const COLOR = { upper: 'var(--upper)', lower: 'var(--lower)', core: 'var(--core)', hiit: 'var(--hiit)' };

export default function StatsExerciseProgress() {
  const [query, setQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState(null);
  const [range, setRange] = useState('3months');
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    fetchStatsLogs()
      .then(setLogs)
      .catch(() => setLogs({ sets: [], circuits: [] }));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_EXERCISES;
    return ALL_EXERCISES.filter((e) => e.en.toLowerCase().includes(q) || e.dayTag.toLowerCase().includes(q));
  }, [query]);

  const selected = ALL_EXERCISES.find((e) => `${e.dayId}:${e.blockIndex}` === selectedKey);

  const sessions = useMemo(() => {
    if (!selected || !logs) return [];
    return filterRange(buildSessions(selected, logs), range);
  }, [selected, logs, range]);

  if (!selected) {
    return (
      <div>
        <input className="exercise-search" placeholder="Search an exercise…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="exercise-picker-list">
          {filtered.map((e) => (
            <button key={`${e.dayId}:${e.blockIndex}`} className="exercise-picker-row" onClick={() => setSelectedKey(`${e.dayId}:${e.blockIndex}`)}>
              <span className="exercise-picker-dot" style={{ background: COLOR[e.color] }} />
              <span className="exercise-picker-name">{e.en}</span>
              <span className="exercise-picker-tag">{e.dayTag}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const unit = selected.type === 'isometric' ? 's' : selected.type === 'circuit' ? ' rounds' : ' kg';
  const label = selected.type === 'isometric' ? 'Hold time' : selected.type === 'circuit' ? 'Rounds completed' : 'Weight';

  return (
    <div>
      <button className="exercise-back" onClick={() => setSelectedKey(null)}>
        <ChevronLeft size={15} /> Back to exercises
      </button>
      <div className="exercise-progress-title">{selected.en}</div>
      <div className="segmented compact">
        {RANGES.map((r) => (
          <button key={r.id} className={range === r.id ? 'active' : ''} onClick={() => setRange(r.id)}>
            {r.label}
          </button>
        ))}
      </div>
      {!logs ? <div className="hint">Loading…</div> : <LineChart data={sessions} label={label} unit={unit} color={COLOR[selected.color]} />}
    </div>
  );
}
