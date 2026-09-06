import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';

export default function ExerciseShell({ done, en, ar, meta, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="ex-card">
      <button className="ex-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={`checkmark ${done ? 'done' : ''}`}>
          <Check size={13} strokeWidth={3} />
        </span>
        <span className="names">
          <span className="en">{en}</span>
          <span className="arname ar">{ar}</span>
          {meta && <span className="meta">{meta}</span>}
        </span>
        <motion.span className="expand-ic" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="ex-body-inner">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
