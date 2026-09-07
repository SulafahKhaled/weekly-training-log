import { useState } from 'react';
import { motion } from 'framer-motion';

const SECTIONS = [
  { id: 'journal', label: 'Journal' },
  { id: 'statistics', label: 'Statistics' },
];

export default function JournalStats() {
  const [section, setSection] = useState('journal');

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="segmented">
        {SECTIONS.map((s) => (
          <button key={s.id} className={section === s.id ? 'active' : ''} onClick={() => setSection(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'journal' ? <div className="hint">Journal coming soon.</div> : <div className="hint">Statistics coming soon.</div>}
    </motion.div>
  );
}
