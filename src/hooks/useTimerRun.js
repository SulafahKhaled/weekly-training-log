import { useCallback, useEffect, useReducer, useRef } from 'react';
import { reducer, initialState } from '../lib/timer';

/**
 * Drives a timer-machine run (lib/timer.js) with a 1 s clock and forwards each NEW outcome
 * exactly once to `onOutcome(outcome, index)`.
 *
 * Outcomes are forwarded from an effect that reads the reducer's state — never from inside a
 * setState updater and never through a captured closure. That is what keeps set 1, 2 and 3 of a
 * hold from overwriting each other (the old isometric bug).
 *
 * `steps` is captured at mount / `reset`; callers pass `key` to rebuild when the spec changes.
 */
export function useTimerRun(steps, { onOutcome, onRevert }) {
  const [state, dispatch] = useReducer(reducer, steps, initialState);
  const forwarded = useRef(0);
  const cb = useRef({ onOutcome, onRevert });
  cb.current = { onOutcome, onRevert };
  const latest = useRef(state);
  latest.current = state;

  useEffect(() => {
    if (!state.running) return undefined;
    const t = setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => clearInterval(t);
  }, [state.running]);

  useEffect(() => {
    if (state.outcomes.length < forwarded.current) {
      forwarded.current = state.outcomes.length; // reset / restart / undo already handled by the caller
      return;
    }
    while (forwarded.current < state.outcomes.length) {
      const i = forwarded.current;
      forwarded.current += 1;
      cb.current.onOutcome(state.outcomes[i], i);
    }
  }, [state.outcomes]);

  // Reads the LATEST state when called (an Undo toast keeps this function for seconds).
  const undo = useCallback(() => {
    const st = latest.current;
    if (!st.undo) return;
    const kept = st.outcomes.slice(0, st.undo.outcomes.length);
    const dropped = st.outcomes.slice(st.undo.outcomes.length);
    dropped.forEach((o) => cb.current.onRevert?.(o, kept));
    forwarded.current = st.undo.outcomes.length;
    dispatch({ type: 'undo' });
  }, []);

  return { state, dispatch, undo };
}
