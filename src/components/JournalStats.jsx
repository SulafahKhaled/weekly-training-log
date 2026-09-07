import { useState } from 'react';
import { motion } from 'framer-motion';
import JournalList from './journal/JournalList';
import StatsAdherence from './stats/StatsAdherence';

const SECTIONS = [
  { id: 'journal', label: 'Journal' },
  { id: 'statistics', label: 'Statistics' },
];

const STATS_VIEWS = [
  { id: 'adherence', label: 'Adherence' },
  { id: 'exercise', label: 'Exercises' },
  { id: 'body', label: 'Body' },
  { id: 'nutrition', label: 'Nutrition' },
];

export default function JournalStats() {
  const [section, setSection] = useState('journal');
  const [statsView, setStatsView] = useState('adherence');

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="segmented">
        {SECTIONS.map((s) => (
          <button key={s.id} className={section === s.id ? 'active' : ''} onClick={() => setSection(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'journal' ? (
        <JournalList />
      ) : (
        <>
          <div className="segmented compact">
            {STATS_VIEWS.map((s) => (
              <button key={s.id} className={statsView === s.id ? 'active' : ''} onClick={() => setStatsView(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
          {statsView === 'adherence' && <StatsAdherence />}
          {statsView !== 'adherence' && <div className="hint">Coming soon.</div>}
        </>
      )}
    </motion.div>
  );
}
