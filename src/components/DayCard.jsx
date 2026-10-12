import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import ProgressRing from './ProgressRing';
import { useData } from '../context/DataContext';
import { sessionProgress, combineProgress } from '../lib/progress';
import { colorsFor } from './session/shared';

/** One weekday of the active plan, with today's progress against it (required sessions only). */
export default function DayCard({ day, onOpen, index }) {
  const { date, log, resolveEntry, instancesForPlanDay } = useData();
  const insts = instancesForPlanDay(date, day.id);
  const main = insts.filter((i) => !i.session.optional);
  const p = combineProgress(main.map((i) => sessionProgress(i, resolveEntry, log)));
  const addOnDone = insts.filter((i) => i.session.optional).map((i) => sessionProgress(i, resolveEntry, log)).filter((x) => x.status === 'completed').length;
  const addOnTotal = insts.filter((i) => i.session.optional).length;
  const [color, track] = colorsFor(main[0]?.session.color || day.color);
  const fraction = p.total ? p.done / p.total : 0;

  return (
    <motion.button
      className="day-card"
      onClick={onOpen}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      whileTap={{ scale: 0.98 }}
    >
      <ProgressRing fraction={fraction} size={46} stroke={4} color={color} track={track}>
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 12, color }}>{day.nameEn.slice(0, 3).toUpperCase()}</span>
      </ProgressRing>
      <div className="info">
        <div className="dayname">
          {day.nameEn}
          <span className="ar">{day.nameAr}</span>
        </div>
        <span className="tag" style={{ background: `var(--${day.color}-dim)`, color }}>
          {main[0]?.session.name.en || day.tag}
        </span>
        <div className="progress-pill">
          <strong>
            {p.done}/{p.total}
          </strong>{' '}
          done today
          {addOnTotal > 0 && (
            <span style={{ color: 'var(--mob)' }}>
              {' '}
              · add-ons {addOnDone}/{addOnTotal}
            </span>
          )}
        </div>
      </div>
      <div className="chev">
        <ChevronRight size={18} />
      </div>
    </motion.button>
  );
}
