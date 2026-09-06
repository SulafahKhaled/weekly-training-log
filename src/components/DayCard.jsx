import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import ProgressRing from './ProgressRing';
import { useDayProgress } from '../hooks/useProgress';

const RING = {
  upper: ['var(--upper)', 'var(--upper-track)'],
  lower: ['var(--lower)', 'var(--lower-track)'],
  core: ['var(--core)', 'var(--core-track)'],
  hiit: ['var(--hiit)', 'var(--hiit-track)'],
};

export default function DayCard({ day, onOpen, index }) {
  const p = useDayProgress(day);
  const [color, track] = RING[day.color];
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
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 12, color }}>
          {day.nameEn.slice(0, 3).toUpperCase()}
        </span>
      </ProgressRing>
      <div className="info">
        <div className="dayname">
          {day.nameEn}
          <span className="ar">{day.nameAr}</span>
        </div>
        <span className="tag" style={{ background: `var(--${day.color}-dim)`, color }}>
          {day.tag}
        </span>
        <div className="progress-pill">
          <strong>
            {p.done}/{p.total}
          </strong>{' '}
          done today
        </div>
      </div>
      <div className="chev">
        <ChevronRight size={18} />
      </div>
    </motion.button>
  );
}
