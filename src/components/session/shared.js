import { buildWorkItem, buildRestItem, buildSessionSnapshot } from '../../lib/logStore';
import { snapshotEntries } from '../../lib/plan';

export const COLOR = {
  upper: ['var(--upper)', 'var(--upper-track)', 'var(--upper-dim)'],
  lower: ['var(--lower)', 'var(--lower-track)', 'var(--lower-dim)'],
  core: ['var(--core)', 'var(--core-track)', 'var(--core-dim)'],
  hiit: ['var(--hiit)', 'var(--hiit-track)', 'var(--hiit-dim)'],
  mobility: ['var(--mob)', 'var(--mob-track)', 'var(--mob-dim)'],
};
export const colorsFor = (c) => COLOR[c] || COLOR.upper;
export const IDLE_TRACK = 'rgba(20,22,30,0.08)';

/**
 * Everything a block needs to write to the log: it creates the session snapshot on the first
 * write (so history keeps what the session looked like), then upserts items.
 */
export function makeLogger({ store, inst, plan, library, settings }) {
  const snapshot = () => buildSessionSnapshot(inst, snapshotEntries(inst.session, plan, library.byId, settings));
  return {
    work(args) {
      const item = buildWorkItem({ inst, ...args });
      return { item, prev: store.setItem(item, snapshot()) };
    },
    rest(args) {
      const item = buildRestItem({ inst, ...args });
      return { item, prev: store.setItem(item, snapshot()) };
    },
    remove: (key) => store.removeItem(key),
  };
}

export const SIDE_LABEL = ['Side 1', 'Side 2'];
