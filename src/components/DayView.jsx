import { motion } from 'framer-motion';
import { Flame, Snowflake, RotateCcw } from 'lucide-react';
import ResistanceBlock from './blocks/ResistanceBlock';
import IsometricBlock from './blocks/IsometricBlock';
import CircuitBlock from './blocks/CircuitBlock';
import { useDayProgress } from '../hooks/useProgress';
import { useProgressContext } from '../context/ProgressContext';
import PrepareRecover from './PrepareRecover';

export default function DayView({ day }) {
  const { resetDay } = useProgressContext();
  const p = useDayProgress(day);
  const pct = p.total ? p.done / p.total : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="day-hero" style={{ background: `var(--${day.color}-dim)`, borderColor: `var(--${day.color})` }}>
        <span className="tag" style={{ background: 'rgba(255,255,255,.6)', color: `var(--${day.color})` }}>
          {day.tag} · {day.tagAr}
        </span>
        <h2>
          {day.nameEn} <span style={{ fontWeight: 400, color: 'var(--text-dim)' }}>{day.nameAr}</span>
        </h2>
        <div className="progress-row">
          <div className="progress-track">
            <motion.div
              className="progress-fill"
              style={{ background: `var(--${day.color})` }}
              initial={false}
              animate={{ width: `${pct * 100}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 22 }}
            />
          </div>
          <span className="progress-txt">
            {p.done}/{p.total}
          </span>
        </div>
        <button className="reset" onClick={() => resetDay(day.id)}>
          <RotateCcw size={12} />
          Reset today&apos;s progress
        </button>
      </div>

      <PrepareRecover dayId={day.id} />

      <div className="section-label">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Flame size={13} /> Warm-up
        </span>
        <span className="line" />
      </div>
      <div className="info-card">
        <div>{day.warmup.en}</div>
        <div className="ar" style={{ marginTop: 6 }}>
          {day.warmup.ar}
        </div>
      </div>

      <div className="section-label">
        <span>💪 Workout</span>
        <span className="line" />
      </div>
      <div>
        {day.blocks.map((b, bi) => {
          if (b.type === 'resistance') return <ResistanceBlock key={bi} day={day} block={b} bi={bi} />;
          if (b.type === 'isometric') return <IsometricBlock key={bi} day={day} block={b} bi={bi} />;
          if (b.type === 'circuit') return <CircuitBlock key={bi} day={day} block={b} bi={bi} />;
          return null;
        })}
      </div>

      <div className="section-label">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Snowflake size={13} /> Cool-down
        </span>
        <span className="line" />
      </div>
      <div className="info-card">
        <div>{day.cooldown.en}</div>
        <div className="ar" style={{ marginTop: 6 }}>
          {day.cooldown.ar}
        </div>
      </div>
    </motion.div>
  );
}
