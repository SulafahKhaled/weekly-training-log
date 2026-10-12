import { History } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { exerciseHistory } from '../../lib/stats';

function fmtDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Past sessions of one exercise, straight from the session log. */
export default function ExerciseHistory({ exerciseId, today }) {
  const { log } = useData();
  const { sessions, pb } = exerciseHistory([...log.items.values()], exerciseId);
  const past = sessions.filter((s) => s.date !== today).slice(0, 6);
  if (past.length === 0) return null;
  return (
    <div className="history-block">
      <div className="history-title">
        <History size={13} />
        Past sessions{pb.weight ? ` · best ${pb.weight.value} kg` : pb.hold ? ` · best ${pb.hold.value}s` : ''}
      </div>
      {past.map((s) => (
        <div className="history-row" key={s.date}>
          <span className="history-date">{fmtDate(s.date)}</span>
          <span className="history-weights">
            {s.sets} {s.sets === 1 ? 'set' : 'sets'}
            {s.topWeight != null ? ` · ${s.topWeight} kg` : ''}
            {s.bestHold != null ? ` · ${s.bestHold}s hold` : ''}
            {s.rounds != null ? ` · ${s.rounds} rounds` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
