import { motion } from 'framer-motion';
import { Flame, PersonStanding, Snowflake, Sparkles } from 'lucide-react';
import { DAYS } from '../data/days';
import DayCard from './DayCard';
import ProgressRing from './ProgressRing';
import { useTodayTotals } from '../hooks/useProgress';

export default function Home({ onOpenDay, onNavigate }) {
  const { done, total, streak } = useTodayTotals();
  const pct = total ? done / total : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="hero">
        <div className="kicker">7-DAY SPLIT · UPPER / LOWER / CORE+HIP / HIIT</div>
        <h1>This Week&apos;s Plan</h1>
        <p>Tap a day to open it. Each move has a timer or checklist and a video demo you can preview right here.</p>
      </div>

      <div className="today-card">
        <ProgressRing fraction={pct} size={64} stroke={7} color="var(--upper)" track="var(--upper-track)">
          <Sparkles size={20} color="var(--upper)" />
        </ProgressRing>
        <div className="info">
          <div className="label">Today's progress</div>
          <div className="value">
            {done}/{total} <span>exercises checked off</span>
          </div>
          <div className="hint">{streak > 0 ? `🔥 ${streak}-day streak — keep it going` : 'Check off your first set today to start a streak'}</div>
        </div>
      </div>

      <div className="legend">
        <div className="item">
          <span className="dot" style={{ background: 'var(--upper)' }} />
          Upper
        </div>
        <div className="item">
          <span className="dot" style={{ background: 'var(--lower)' }} />
          Lower
        </div>
        <div className="item">
          <span className="dot" style={{ background: 'var(--core)' }} />
          Core + Hip
        </div>
        <div className="item">
          <span className="dot" style={{ background: 'var(--hiit)' }} />
          HIIT / Cardio
        </div>
      </div>

      <div className="day-grid">
        {DAYS.map((day, i) => (
          <DayCard key={day.id} day={day} index={i} onOpen={() => onOpenDay(day.id)} />
        ))}
      </div>

      <div className="quicklinks">
        <button onClick={() => onNavigate('warmup')}>
          <Flame size={18} />
          Warm-up guide
        </button>
        <button onClick={() => onNavigate('mobility')}>
          <PersonStanding size={18} />
          Mobility
        </button>
        <button onClick={() => onNavigate('cooldown')}>
          <Snowflake size={18} />
          Cool-down guide
        </button>
      </div>

      <footer className="note">
        Weekly cycle repeats every week, Sun → Sat.
        <br />
        Pick a weight where the last 2–3 reps feel hard.
      </footer>
    </motion.div>
  );
}
