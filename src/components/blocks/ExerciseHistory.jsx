import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { fetchHistory } from '../../lib/api';

function fmtDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ExerciseHistory({ dayId, blockIndex, today }) {
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchHistory(dayId, blockIndex)
      .then((r) => {
        if (!cancelled) setSessions(r.sessions.filter((s) => s.date !== today));
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [dayId, blockIndex, today]);

  if (error) return null;
  if (sessions === null) return <div className="hint">Loading history…</div>;
  if (sessions.length === 0) return null;

  return (
    <div className="history-block">
      <div className="history-title">
        <History size={13} />
        Past sessions
      </div>
      {sessions.slice(0, 6).map((s) => (
        <div className="history-row" key={s.date}>
          <span className="history-date">{fmtDate(s.date)}</span>
          <span className="history-weights">
            {s.sets
              .sort((a, b) => a.set_index - b.set_index)
              .map((set) => (set.weight != null ? `${set.weight}` : '—'))
              .join(' · ')}
            {s.sets.some((set) => set.weight != null) ? ' kg' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
