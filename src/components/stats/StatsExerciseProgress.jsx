import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { exerciseHistory, loggedExercises } from '../../lib/stats';
import { addMonths } from '../../lib/dates';
import LineChart from '../shared/LineChart';

const RANGES = [
  { id: 'last4', label: 'Last 4' },
  { id: '3months', label: '3 months' },
  { id: 'all', label: 'All time' },
];

/** Per-exercise history and personal bests, from the session log. */
export default function StatsExerciseProgress() {
  const { log, date: today, library } = useData();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [range, setRange] = useState('3months');
  const items = useMemo(() => [...log.items.values()], [log.items]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return loggedExercises(items)
      .map((e) => ({ ...e, name: library.byId.get(e.id)?.name?.en || e.name || e.id }))
      .filter((e) => !q || e.name.toLowerCase().includes(q));
  }, [items, query, library]);

  const hist = useMemo(() => (selectedId ? exerciseHistory(items, selectedId) : null), [items, selectedId]);

  if (!selectedId) {
    return (
      <div>
        <input className="exercise-search" placeholder="Search an exercise you've logged…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="exercise-picker-list">
          {list.map((e) => (
            <button key={e.id} className="exercise-picker-row" onClick={() => setSelectedId(e.id)}>
              <span className="exercise-picker-name">{e.name}</span>
              <span className="exercise-picker-tag">{e.count} sets</span>
            </button>
          ))}
          {list.length === 0 && <div className="hint">Complete a set and it will show up here.</div>}
        </div>
      </div>
    );
  }

  const ex = library.byId.get(selectedId);
  const metric = hist.pb.weight ? 'topWeight' : hist.pb.hold ? 'bestHold' : hist.pb.rounds ? 'rounds' : 'reps';
  const unit = { topWeight: ' kg', bestHold: 's', rounds: ' rounds', reps: ' reps' }[metric];
  const label = { topWeight: 'Heaviest set', bestHold: 'Longest hold', rounds: 'Rounds completed', reps: 'Reps' }[metric];
  let points = hist.sessions.map((s) => ({ date: s.date, value: s[metric] })).reverse();
  if (range === 'last4') points = points.slice(-4);
  else if (range === '3months') points = points.filter((p) => p.date >= addMonths(today, -3));

  return (
    <div>
      <button className="exercise-back" onClick={() => setSelectedId(null)}>
        <ChevronLeft size={15} /> Back to exercises
      </button>
      <div className="exercise-progress-title">{ex?.name?.en || selectedId}</div>
      <div className="stat-grid">
        {hist.pb.weight && <div className="stat-tile"><div className="v">{hist.pb.weight.value} kg</div><div className="l">heaviest · {hist.pb.weight.date}</div></div>}
        {hist.pb.hold && <div className="stat-tile"><div className="v">{hist.pb.hold.value}s</div><div className="l">longest hold · {hist.pb.hold.date}</div></div>}
        {hist.pb.rounds && <div className="stat-tile"><div className="v">{hist.pb.rounds.value}</div><div className="l">most rounds · {hist.pb.rounds.date}</div></div>}
        {hist.pb.reps && <div className="stat-tile"><div className="v">{hist.pb.reps.value}</div><div className="l">most reps in a session · {hist.pb.reps.date}</div></div>}
      </div>
      <div className="segmented compact">
        {RANGES.map((r) => (
          <button key={r.id} className={range === r.id ? 'active' : ''} onClick={() => setRange(r.id)}>
            {r.label}
          </button>
        ))}
      </div>
      <LineChart data={points} label={label} unit={unit} color="var(--upper)" />
    </div>
  );
}
