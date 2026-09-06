import { DAYS } from '../data/days';
import { useProgressContext } from '../context/ProgressContext';

export function dayProgress(day, ctx) {
  let total = 0;
  let done = 0;
  day.blocks.forEach((b, bi) => {
    if (b.type === 'resistance' || b.type === 'isometric') {
      for (let s = 0; s < b.sets; s++) {
        total++;
        if (ctx.isSetDone(day.id, bi, s)) done++;
      }
    } else if (b.type === 'circuit') {
      total += b.items.length;
      if (ctx.isCircuitDone(day.id, bi)) done += b.items.length;
    }
  });
  return { done, total };
}

export function useDayProgress(day) {
  const ctx = useProgressContext();
  return dayProgress(day, ctx);
}

export function useTodayTotals() {
  const ctx = useProgressContext();
  let done = 0;
  let total = 0;
  DAYS.forEach((day) => {
    const p = dayProgress(day, ctx);
    done += p.done;
    total += p.total;
  });
  return { done, total, streak: ctx.streak, loading: ctx.loading, error: ctx.error };
}
