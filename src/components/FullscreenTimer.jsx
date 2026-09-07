import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Pause, Play, SkipForward, PartyPopper, RotateCcw, Square } from 'lucide-react';
import ProgressRing from './ProgressRing';
import { fmtTime } from '../lib/time';
import { beepTick, vibrate } from '../lib/audio';

/**
 * Full-viewport "dramatic mode" for a running timer — rest, isometric hold,
 * or HIIT circuit all share this. Renders via a portal so it always covers
 * the whole screen regardless of where it's mounted in the tree.
 */
export default function FullscreenTimer({
  color = 'var(--upper)',
  track = 'var(--upper-track)',
  wash = 'var(--upper-dim)',
  phase,
  remaining = 0,
  total = 1,
  title,
  titleAr,
  next,
  meta,
  paused = false,
  onTogglePause,
  onSkip,
  skipLabel = 'Skip',
  onReset,
  onStop,
  onRepeat,
  onMinimize,
  complete = false,
  completeTitle = 'Done! 🎉',
  completeSub,
  onDismissComplete,
}) {
  const urgent = !complete && remaining > 0 && remaining <= 3;
  const lastTick = useRef(null);

  // A sharp tick + haptic buzz on the final 3-2-1 for a bit of drama.
  useEffect(() => {
    if (urgent && lastTick.current !== remaining) {
      lastTick.current = remaining;
      beepTick();
      vibrate(20);
    }
  }, [urgent, remaining]);

  const body = (
    <div className="fs-timer" style={{ '--fs-wash': wash, '--fs-color': color }}>
      <div className="fs-glow" />
      {onMinimize && (
        <button className="fs-minimize" onClick={onMinimize} aria-label="Minimize">
          <ChevronDown size={22} />
        </button>
      )}

      <AnimatePresence mode="wait">
        {complete ? (
          <motion.div key="complete" className="fs-complete" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
            <div className="fs-complete-icon" style={{ color }}>
              <PartyPopper size={48} />
            </div>
            <div className="fs-complete-title">{completeTitle}</div>
            {completeSub && <div className="fs-complete-sub">{completeSub}</div>}
            <div className="fs-controls">
              {onRepeat && (
                <button className="fs-btn fs-btn-ghost" onClick={onRepeat}>
                  <RotateCcw size={16} />
                  Repeat
                </button>
              )}
              {onDismissComplete && (
                <button className="fs-btn fs-btn-solid" style={{ background: color }} onClick={onDismissComplete}>
                  Continue
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="running" className="fs-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {meta && <div className="fs-meta">{meta}</div>}

            <div className={`fs-phase${urgent ? ' urgent' : ''}`} style={{ color }}>
              {phase}
            </div>

            <div className="fs-ring-wrap">
              <ProgressRing fraction={total ? remaining / total : 0} size={272} stroke={14} color={color} track={track}>
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={remaining}
                    className={`fs-time${urgent ? ' urgent' : ''}`}
                    initial={{ scale: 1.22, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    {fmtTime(remaining)}
                  </motion.span>
                </AnimatePresence>
              </ProgressRing>
            </div>

            <AnimatePresence mode="wait">
              {title && (
                <motion.div key={title} className="fs-title" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  {title}
                </motion.div>
              )}
            </AnimatePresence>
            {titleAr && <div className="fs-title-ar ar">{titleAr}</div>}
            {next && <div className="fs-next">{next}</div>}

            <div className="fs-controls">
              {onReset && (
                <button className="fs-btn fs-btn-ghost" onClick={onReset}>
                  <RotateCcw size={16} />
                  Reset
                </button>
              )}
              {onStop && (
                <button className="fs-btn fs-btn-ghost" onClick={onStop}>
                  <Square size={16} />
                  Stop
                </button>
              )}
              {onSkip && (
                <button className="fs-btn fs-btn-ghost" onClick={onSkip}>
                  <SkipForward size={16} />
                  {skipLabel}
                </button>
              )}
              {onTogglePause && (
                <button className="fs-btn fs-btn-solid" style={{ background: color }} onClick={onTogglePause}>
                  {paused ? <Play size={18} /> : <Pause size={18} />}
                  {paused ? 'Resume' : 'Pause'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return createPortal(body, document.body);
}
