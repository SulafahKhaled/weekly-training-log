import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  fetchProgress,
  toggleSet as apiToggleSet,
  updateSetWeight as apiUpdateSetWeight,
  updateSetHold as apiUpdateSetHold,
  toggleCircuit as apiToggleCircuit,
  resetDay as apiResetDay,
  fetchStreak,
  todayKey,
} from '../lib/api';

const ProgressContext = createContext(null);

const setKey = (dayId, bi, si) => `${dayId}:${bi}:${si}`;
const circuitKey = (dayId, bi) => `${dayId}:${bi}`;

export function ProgressProvider({ children }) {
  const [date] = useState(todayKey());
  const [sets, setSets] = useState(new Map());
  const [circuits, setCircuits] = useState(new Map());
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshStreak = useCallback(() => {
    fetchStreak()
      .then((r) => setStreak(r.streak))
      .catch(() => {});
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [progress] = await Promise.all([fetchProgress(date), refreshStreak()]);
      const setsMap = new Map();
      progress.sets.forEach((s) => setsMap.set(setKey(s.day_id, s.block_index, s.set_index), { weight: s.weight, holdSeconds: s.hold_seconds }));
      const circuitsMap = new Map();
      progress.circuits.forEach((c) => circuitsMap.set(circuitKey(c.day_id, c.block_index), c.rounds_completed));
      setSets(setsMap);
      setCircuits(circuitsMap);
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not reach the server');
    } finally {
      setLoading(false);
    }
  }, [date, refreshStreak]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function toggleSet(dayId, blockIndex, setIndex, weight = null, holdSeconds = null) {
    const key = setKey(dayId, blockIndex, setIndex);
    const wasDone = sets.has(key);
    const prev = sets;
    const next = new Map(sets);
    if (wasDone) next.delete(key);
    else next.set(key, { weight, holdSeconds });
    setSets(next);
    try {
      await apiToggleSet({ dayId, blockIndex, setIndex, date, done: !wasDone, weight, holdSeconds });
      refreshStreak();
    } catch (e) {
      setSets(prev);
      setError(e.message);
    }
  }

  async function setWeightFor(dayId, blockIndex, setIndex, weight) {
    const key = setKey(dayId, blockIndex, setIndex);
    if (!sets.has(key)) return;
    setSets((s) => new Map(s).set(key, { ...s.get(key), weight }));
    try {
      await apiUpdateSetWeight({ dayId, blockIndex, setIndex, date, weight });
    } catch (e) {
      setError(e.message);
    }
  }

  async function setHoldSecondsFor(dayId, blockIndex, setIndex, holdSeconds) {
    const key = setKey(dayId, blockIndex, setIndex);
    if (!sets.has(key)) return;
    setSets((s) => new Map(s).set(key, { ...s.get(key), holdSeconds }));
    try {
      await apiUpdateSetHold({ dayId, blockIndex, setIndex, date, holdSeconds });
    } catch (e) {
      setError(e.message);
    }
  }

  async function toggleCircuit(dayId, blockIndex, roundsCompleted) {
    const key = circuitKey(dayId, blockIndex);
    const wasDone = circuits.has(key);
    const prev = circuits;
    const next = new Map(circuits);
    if (wasDone) next.delete(key);
    else next.set(key, roundsCompleted);
    setCircuits(next);
    try {
      await apiToggleCircuit({ dayId, blockIndex, date, done: !wasDone, roundsCompleted });
      refreshStreak();
    } catch (e) {
      setCircuits(prev);
      setError(e.message);
    }
  }

  async function resetDay(dayId) {
    const prevSets = sets;
    const prevCircuits = circuits;
    setSets(new Map(Array.from(sets).filter(([k]) => !k.startsWith(`${dayId}:`))));
    setCircuits(new Map(Array.from(circuits).filter(([k]) => !k.startsWith(`${dayId}:`))));
    try {
      await apiResetDay({ dayId, date });
      refreshStreak();
    } catch (e) {
      setSets(prevSets);
      setCircuits(prevCircuits);
      setError(e.message);
    }
  }

  const value = {
    date,
    loading,
    error,
    streak,
    isSetDone: (dayId, bi, si) => sets.has(setKey(dayId, bi, si)),
    getSetWeight: (dayId, bi, si) => sets.get(setKey(dayId, bi, si))?.weight ?? null,
    getSetHoldSeconds: (dayId, bi, si) => sets.get(setKey(dayId, bi, si))?.holdSeconds ?? null,
    isCircuitDone: (dayId, bi) => circuits.has(circuitKey(dayId, bi)),
    toggleSet,
    setWeightFor,
    setHoldSecondsFor,
    toggleCircuit,
    resetDay,
  };

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgressContext() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgressContext must be used within a ProgressProvider');
  return ctx;
}
