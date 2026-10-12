// Regression + integration test for the "isometric counter only counts the last set" bug,
// run against the REAL DataProvider, log store and HoldBlock timer (only the network is faked).
//
// Root cause (found by this test failing against the old IsometricBlock): the timer's
// setInterval effect was keyed on [state.running], so its callback kept the `toggleSet` /
// `isSetDone` closures from the render in which the timer started. `toggleSet` built the next
// state from that stale `sets` Map, so set 2 replaced set 1 and set 3 replaced set 2 — only the
// last survived in the UI (the server received all three, which is why a reload "fixed" it).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';

vi.mock('../src/lib/api', async () => {
  const { createFakeServer } = await import('./helpers/fakeServer');
  const fake = createFakeServer();
  globalThis.__fake = fake;
  return fake.api;
});

import { DataProvider, useData } from '../src/context/DataContext';
import { UndoProvider } from '../src/components/UndoToast';
import HoldBlock from '../src/components/session/HoldBlock';

let ctx = null;
function Harness({ overrides, exerciseId = 'plank' }) {
  const d = useData();
  ctx = d;
  if (d.booting) return null;
  const inst = d.instancesForPlanDay(d.date, 'sun').find((i) => i.sessionId === 'main');
  const entry = { eid: 'b5', kind: 'exercise', exerciseId, overrides };
  const { exercise, eff } = d.resolveEntry(entry, inst.plan);
  return <HoldBlock inst={inst} entry={entry} exercise={exercise} eff={eff} />;
}

const flush = async (ms = 0) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};
const button = (container, re) => [...container.querySelectorAll('button')].find((b) => re.test(b.textContent));
const click = async (el) => {
  await act(async () => {
    el.click();
  });
};

async function mount(overrides) {
  const view = render(
    <UndoProvider>
      <DataProvider>
        <Harness overrides={overrides} />
      </DataProvider>
    </UndoProvider>
  );
  await flush(50);
  await click(view.container.querySelector('.ex-head'));
  return view;
}

const workItems = () => [...globalThis.__fake.db.items.values()].filter((i) => i.kind === 'work');
const restItems = () => [...globalThis.__fake.db.items.values()].filter((i) => i.kind === 'rest');

describe('timed holds (isometric)', () => {
  beforeEach(() => {
    globalThis.__fake.reset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-05T09:00:00Z')); // a Sunday in Riyadh
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('runs 3 sets of a hold and records ALL 3', async () => {
    const { container } = await mount({ seconds: 5, rest: 2, countdown: 0 });
    await click(button(container, /^\s*Start/));
    // 3 holds × 5 s + 2 rests × 2 s = 19 s
    for (let i = 0; i < 21; i++) await flush(1000);

    const sets = workItems().sort((a, b) => a.set_index - b.set_index);
    expect(sets.map((s) => s.set_index)).toEqual([0, 1, 2]);
    expect(sets.every((s) => s.status === 'completed' && s.hold_seconds === 5 && s.ex_type === 'hold')).toBe(true);
    // the live UI state agrees with what was saved
    const keys = sets.map((s) => s.item_key);
    keys.forEach((k) => expect(ctx.log.items.get(k)?.status).toBe('completed'));
    // …and the two breaks were recorded as BREAKS, not exercise results
    expect(restItems()).toHaveLength(2);
    expect(workItems()).toHaveLength(3);
  });

  it('skip → Incomplete is saved, and Undo takes it back', async () => {
    const { container } = await mount({ seconds: 10, rest: 3, countdown: 0, sets: 2 });
    await click(button(container, /^\s*Start/));
    await flush(3000);
    // fullscreen timer is up: Skip asks one question
    await click(button(document.body, /Skip hold/));
    expect(document.body.textContent).toMatch(/This hold was/);
    await click(button(document.body, /Incomplete/));
    await flush(10);

    let sets = workItems();
    expect(sets).toHaveLength(1);
    expect(sets[0]).toMatchObject({ set_index: 0, status: 'incomplete', hold_seconds: 3 });

    await click(button(document.body, /^Undo$/));
    await flush(10);
    expect(workItems()).toHaveLength(0);

    // timer is back at hold 1 with the remaining time
    sets = [...ctx.log.items.values()];
    expect(sets.filter((i) => i.kind === 'work')).toHaveLength(0);
  });

  it('skipping a BREAK saves a rest record and never a skipped exercise', async () => {
    const { container } = await mount({ seconds: 3, rest: 20, countdown: 0, sets: 2 });
    await click(button(container, /^\s*Start/));
    await flush(3000 + 500); // hold 1 done → resting
    await click(button(document.body, /Skip break/));
    await click(button(document.body, /Completed/));
    await flush(10);
    expect(restItems()).toHaveLength(1);
    expect(restItems()[0].kind).toBe('rest');
    expect(workItems().filter((i) => i.status === 'skipped')).toHaveLength(0);
    expect(workItems()).toHaveLength(1);
  });

  it('adds and removes break time', async () => {
    const { container } = await mount({ seconds: 3, rest: 30, countdown: 0, sets: 2 });
    await click(button(container, /^\s*Start/));
    await flush(4500); // 3 s hold, then ~1.5 s into the 30 s break
    expect(document.body.textContent).toMatch(/0:2[5-9]/);
    await click(button(document.body, /\+15s/));
    expect(document.body.textContent).toMatch(/0:4[0-4]/);
    await click(button(document.body, /−10s/));
    expect(document.body.textContent).toMatch(/0:3[0-4]/);
  });
});
