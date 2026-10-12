import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { fetchMeals, deleteMeal } from '../../lib/api';
import { addDays, today } from '../../lib/dates';

/** Individual meals (logged by hand or by Claude). Their numbers are already included in the day totals above. */
export default function MealsList({ refreshKey }) {
  const [meals, setMeals] = useState(null);
  const load = () => fetchMeals(addDays(today(), -14), today()).then((r) => setMeals(r.meals)).catch(() => setMeals([]));
  useEffect(() => {
    load();
  }, [refreshKey]);

  if (!meals || meals.length === 0) return null;
  return (
    <div>
      <div className="section-label"><span>Meals (last 14 days)</span><span className="line" /></div>
      {meals.map((m) => (
        <div className="plan-entry" key={m.id}>
          <div className="grow">
            {m.description}
            {m.source === 'claude' && <span className="pill extra">Claude</span>}
            {m.estimated && <span className="pill">estimated</span>}
            <div className="mini">
              {m.date} · {m.meal_type}
              {m.calories != null ? ` · ${Math.round(m.calories)} kcal` : ''}
              {m.protein_g != null ? ` · P ${Math.round(m.protein_g)}g` : ''}
              {m.fiber_g != null ? ` · F ${Math.round(m.fiber_g)}g` : ''}
            </div>
          </div>
          <button className="icon-btn" aria-label="Delete meal" onClick={() => deleteMeal(m.id).then(load)}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
