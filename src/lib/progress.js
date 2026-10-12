// How far along a session instance is, from the log store state. Pure.
import { itemKey } from './plan';

/**
 * @param inst        a session instance (see plan.sessionsForDate)
 * @param resolve     (entry, plan) => { exercise, eff }
 * @param logState    store.getState()
 * @returns { done, total, incomplete, skipped, status }
 */
export function sessionProgress(inst, resolve, logState) {
  let total = 0;
  let done = 0;
  let incomplete = 0;
  let skipped = 0;
  for (const entry of inst.session.entries) {
    const units = entry.kind === 'circuit' ? 1 : resolve(entry, inst.plan).eff?.loggedSets || 1;
    total += units;
    for (let s = 0; s < units; s++) {
      const it = logState.items.get(itemKey(inst.key, entry.eid, s));
      if (!it || it.kind !== 'work') continue;
      if (it.status === 'completed') done++;
      else if (it.status === 'incomplete') incomplete++;
      else if (it.status === 'skipped') skipped++;
    }
  }
  const status = total > 0 && done >= total ? 'completed' : done + incomplete + skipped > 0 ? 'partial' : 'idle';
  return { done, total, incomplete, skipped, status };
}

export function combineProgress(list) {
  return list.reduce((a, p) => ({ done: a.done + p.done, total: a.total + p.total }), { done: 0, total: 0 });
}
