import { useState } from 'react';
import { ChevronDown, Flame, Snowflake, RotateCcw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import EntryCard from './EntryCard';
import ProgressRing from '../ProgressRing';
import { useData } from '../../context/DataContext';
import { sessionProgress } from '../../lib/progress';
import { colorsFor } from './shared';

/** One session (a template instance) for a date: header with progress + its exercises. */
export default function SessionCard({ inst, defaultOpen }) {
  const { log, resolveEntry, store, removeSessionFromDay, removeQuickExercise } = useData();
  const { session } = inst;
  const open0 = defaultOpen ?? !session.optional;
  const [open, setOpen] = useState(open0);
  const [color, track] = colorsFor(session.color);
  const p = sessionProgress(inst, resolveEntry, log);
  const fraction = p.total ? p.done / p.total : 0;

  return (
    <div className="sess-card" data-session={session.id}>
      <button className="sess-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <ProgressRing fraction={fraction} size={44} stroke={4} color={color} track={track}>
          <span style={{ fontSize: 11, fontWeight: 700, color }}>{p.done}/{p.total}</span>
        </ProgressRing>
        <span className="names">
          <span className="en">
            {session.name.en}
            {session.optional && inst.source !== 'quick' && <span className="pill opt">optional</span>}
            {inst.source === 'extra' && <span className="pill extra">added today</span>}
            {session.minutes ? <span className="pill">{session.minutes} min</span> : null}
          </span>
          <span className="sub ar">{session.name.ar}</span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div className="sess-body">
              {session.warmup && (
                <>
                  <div className="section-label">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Flame size={13} /> Warm-up
                    </span>
                    <span className="line" />
                  </div>
                  <div className="info-card">
                    <div>{session.warmup.en}</div>
                    <div className="ar" style={{ marginTop: 6 }}>{session.warmup.ar}</div>
                  </div>
                </>
              )}
              {session.entries.map((entry) => (
                <div key={entry.eid}>
                  <EntryCard inst={inst} entry={entry} />
                  {inst.source === 'quick' && (
                    <div className="page-actions" style={{ marginTop: -4 }}>
                      <button className="btn small" onClick={() => removeQuickExercise(inst.date, entry.eid)}>
                        <X size={13} /> Remove from today
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {session.cooldown && (
                <>
                  <div className="section-label">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Snowflake size={13} /> Cool-down
                    </span>
                    <span className="line" />
                  </div>
                  <div className="info-card">
                    <div>{session.cooldown.en}</div>
                    <div className="ar" style={{ marginTop: 6 }}>{session.cooldown.ar}</div>
                  </div>
                </>
              )}
              <div className="page-actions">
                {p.done + p.incomplete + p.skipped > 0 && (
                  <button className="btn small" onClick={() => store.resetSession(inst.key)}>
                    <RotateCcw size={13} /> Reset this session
                  </button>
                )}
                {inst.source === 'extra' && (
                  <button className="btn small" onClick={() => removeSessionFromDay(inst.date, { planId: inst.planId, day: inst.tplDay, sessionId: inst.sessionId })}>
                    <X size={13} /> Remove from today
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
