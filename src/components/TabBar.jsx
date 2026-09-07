import { motion } from 'framer-motion';
import { Home, Flame, PersonStanding, Snowflake, NotebookPen } from 'lucide-react';

const TABS = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'warmup', label: 'Warm-up', Icon: Flame },
  { id: 'mobility', label: 'Mobility', Icon: PersonStanding },
  { id: 'cooldown', label: 'Cool-down', Icon: Snowflake },
  { id: 'journalstats', label: 'Journal', Icon: NotebookPen },
];

export default function TabBar({ active, onSelect }) {
  return (
    <div className="tabbar">
      {TABS.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button key={id} className={isActive ? 'active' : ''} onClick={() => onSelect(id)}>
            <span className="ic">
              <Icon size={18} strokeWidth={isActive ? 2.4 : 2} />
            </span>
            {label}
            {isActive && <motion.span className="tab-dot" layoutId="tab-dot" transition={{ type: 'spring', stiffness: 500, damping: 30 }} />}
          </button>
        );
      })}
    </div>
  );
}
