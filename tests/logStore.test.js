import { describe, it, expect } from 'vitest';
import { createLogStore } from '../src/lib/logStore';
import { createFakeServer } from './helpers/fakeServer';

const item = (set, extra = {}) => ({
  item_key: `d|p|sun|main|e|${set}`, session_key: 'd|p|sun|main', date: '2025-01-05', entry_key: 'e', set_index: set,
  exercise_id: 'plank', kind: 'work', status: 'completed', ...extra,
});
const snap = { session_key: 'd|p|sun|main', date: '2025-01-05', plan_id: 'p', tpl_day: 'sun', session_id: 'main', planned: [] };

describe('log store', () => {
  it('three writes in the same tick are all kept (no stale-closure overwrite)', async () => {
    const { db, api } = createFakeServer();
    const store = createLogStore(api);
    store.setItem(item(0), snap);
    store.setItem(item(1), snap);
    store.setItem(item(2), snap);
    expect([...store.getState().items.keys()]).toHaveLength(3);
    await store.flush();
    expect(db.items.size).toBe(3);
    expect(db.sessions.size).toBe(1); // snapshot is stored once, with the first write
  });
  it('a failed save rolls the optimistic change back and surfaces the error', async () => {
    const { db, api } = createFakeServer();
    const store = createLogStore(api);
    db.failNextSave = true;
    store.setItem(item(0), snap);
    expect(store.get(item(0).item_key)).toBeTruthy();
    await store.flush();
    expect(store.get(item(0).item_key)).toBeNull();
    expect(store.getState().error).toBe('network down');
  });
  it('restore() puts back the previous value, or removes a brand-new item', async () => {
    const { api } = createFakeServer();
    const store = createLogStore(api);
    const prev1 = store.setItem(item(0, { status: 'completed' }), snap);
    expect(prev1).toBeNull();
    const prev2 = store.setItem(item(0, { status: 'incomplete' }));
    expect(store.get(item(0).item_key).status).toBe('incomplete');
    store.restore(item(0).item_key, prev2);
    expect(store.get(item(0).item_key).status).toBe('completed');
    store.restore(item(0).item_key, prev1);
    expect(store.get(item(0).item_key)).toBeNull();
    await store.flush();
  });
  it('resetSession removes the session and its items, and nothing else', async () => {
    const { db, api } = createFakeServer();
    const store = createLogStore(api);
    store.setItem(item(0), snap);
    store.setItem({ ...item(0), item_key: 'other|e|0', session_key: 'other' }, { ...snap, session_key: 'other' });
    await store.flush();
    store.resetSession('d|p|sun|main');
    await store.flush();
    expect([...db.items.keys()]).toEqual(['other|e|0']);
    expect([...db.sessions.keys()]).toEqual(['other']);
  });
  it('load() keeps what the server has for the requested range', async () => {
    const { db, api } = createFakeServer();
    db.items.set('x', { ...item(0), item_key: 'x', date: '2025-01-01' });
    const store = createLogStore(api);
    await store.load();
    expect(store.get('x')).toBeTruthy();
    expect(store.getState().loaded).toBe(true);
  });
});
