import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useUiPrefs } from '../../context/UiPrefsContext';

/**
 * A generic collapsible section — tap the header to minimize to a compact
 * summary line and back. Collapse state is persisted per section `id` via
 * UiPrefsContext, so it survives leaving and reopening the tab.
 */
export default function Collapsible({ id, title, summary, defaultCollapsed = false, children }) {
  const { isCollapsed, toggle } = useUiPrefs();
  const collapsed = isCollapsed(id, defaultCollapsed);

  return (
    <div className="collapsible">
      <button className="collapsible-head" onClick={() => toggle(id, defaultCollapsed)} aria-expanded={!collapsed}>
        <span className="collapsible-title">{title}</span>
        {collapsed && summary && <span className="collapsible-summary">{summary}</span>}
        <motion.span className="collapsible-ic" animate={{ rotate: collapsed ? -90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="collapsible-body">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
