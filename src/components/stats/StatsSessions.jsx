import { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import ProgressRing from '../ProgressRing';
import Heatmap from '../shared/Heatmap';
import Collapsible from '../shared/Collapsible';
import { weeklySessionStats, streaks, totals, dailySummary } from '../../lib/stats';
import { startOfWeek, startOfMonth, addDays } from '../../lib/dates';
import { fmtTime } from '../../lib/time';

const PERIODS = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

const fmtDur = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};
const dayLabel = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/** Sessions completed vs planned, streaks, totals and status counts — all from the session log. */
export default function StatsSessions() {
  const { log, date: today, activePlan, settings } = useData();
  const [period, setPeriod] = useState('week');
  const [selected, setSelected] = useState(null);

  const { sessions, items } = useMemo(() => ({ sessions: [...log.sessions.values()], items: [...log.items.values()] }), [log.sessions, log.items]);
  const weekStart = settings.weekStart;
  const thisWeek = startOfWeek(today, weekStart);
  const from = period === 'week' ? thisWeek : period === 'month' ? startOfMonth(today) : `${today.slice(0, 4)}-01-01`;

  const weeks = useMemo(
    () => weeklySessionStats({ sessions, items, plan: activePlan, today, weekStart, from: addDays(thisWeek, -7 * 7), to: today }),
    [sessions, items, activePlan, today, weekStart, thisWeek]
  );
  const current = weeks[weeks.length - 1];
  const st = useMemo(() => streaks(items, today), [items, today]);
  const inRange = useMemo(() => items.filter((i) => i.date >= from && i.date <= today), [items, from, today]);
  const t = useMemo(() => totals(inRange, { secondsPerRep: settings.secondsPerRep }), [inRange, settings.secondsPerRep]);
  const daily = useMemo(() => dailySummary(sessions, items, from, today), [sessions, items, from, today]);
  const cells = daily.map((d) => ({
    key: d.date,
    tier: d.tier,
    short: new Date(`${d.date}T00:00:00`).getDate(),
    label: `${dayLabel(d.date)}: ${d.completed} completed`,
  }));
  const detail = selected ? daily.find((d) => d.date === selected) : null;
  const pct = current?.completionPct ?? 0;

  return (
    <div>
      <div className="adherence-ring-row">
        <ProgressRing fraction={pct / 100} size={92} stroke={9} color="var(--upper)" track="var(--upper-track)">
          <span className="adherence-ring-pct">{current?.completionPct == null ? '—' : `${pct}%`}</span>
        </ProgressRing>
        <div className="adherence-ring-caption">
          <div className="adherence-ring-big">
            {current?.completed ?? 0}/{current?.planned ?? 0}
          </div>
          <div className="adherence-ring-sub">
            sessions completed this week
            {current && current.plannedDue < current.planned ? ` (${current.plannedDue} due so far)` : ''}
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-tile"><div className="v">{st.current}</div><div className="l">current streak (days)</div></div>
        <div className="stat-tile"><div className="v">{st.best}</div><div className="l">best streak (days)</div></div>
        <div className="stat-tile"><div className="v">{current?.optionalCompleted ?? 0}/{current?.optionalPlanned ?? 0}</div><div className="l">optional add-ons this week</div></div>
        <div className="stat-tile"><div className="v">{current?.extra ?? 0}</div><div className="l">extra sessions this week</div></div>
      </div>

      <div className="segmented">
        {PERIODS.map((p) => (
          <button key={p.id} className={period === p.id ? 'active' : ''} onClick={() => { setPeriod(p.id); setSelected(null); }}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="stat-grid">
        <div className="stat-tile"><div className="v">{t.sets}</div><div className="l">total sets</div></div>
        <div className="stat-tile"><div className="v">{t.reps}</div><div className="l">total reps</div></div>
        <div className="stat-tile"><div className="v">{fmtTime(t.holdSeconds)}</div><div className="l">hold time</div></div>
        <div className="stat-tile"><div className="v">{fmtDur(t.timeSeconds)}</div><div className="l">time trained{t.timeIsEstimate ? ' (est.)' : ''}</div></div>
        <div className="stat-tile"><div className="v">{t.completed}</div><div className="l">completed</div></div>
        <div className="stat-tile"><div className="v">{t.incomplete}</div><div className="l">incomplete</div></div>
        <div className="stat-tile"><div className="v">{t.skipped}</div><div className="l">skipped exercises</div></div>
        <div className="stat-tile"><div className="v">{t.restsSkipped + t.restsIncomplete}</div><div className="l">breaks cut short (not counted as skips)</div></div>
      </div>

      <Heatmap cells={cells} columns={period === 'year' ? 14 : 7} selectedKey={selected} onSelect={(c) => setSelected(c.key === selected ? null : c.key)} />
      {detail && (
        <div className="adherence-detail">
          <strong>{dayLabel(detail.date)}</strong>
          <div>
            {detail.completed} completed · {detail.incomplete} incomplete · {detail.skipped} skipped
          </div>
          {detail.sessions.map((x) => (
            <div key={x.session.session_key} className="hint" style={{ margin: 0 }}>
              {x.session.name_en}: {x.status} ({x.completed}/{x.units})
            </div>
          ))}
        </div>
      )}

      <Collapsible id="stats-weeks" title="Sessions per week">
        <div className="week-bars">
          {weeks.slice().reverse().map((w) => (
            <div className="week-bar-row" key={w.weekStart}>
              <span>{new Date(`${w.weekStart}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              <span className="week-bar"><span style={{ width: `${w.completionPct ?? 0}%` }} /></span>
              <span>
                {w.completed}/{w.planned}
                {w.completionPct != null ? ` · ${w.completionPct}%` : ''}
              </span>
            </div>
          ))}
        </div>
      </Collapsible>

      <Collapsible id="stats-defs" title="How these numbers are counted" defaultCollapsed>
        <div className="hint">
          A <strong>session</strong> is completed when every planned set in it is completed. It counts for its planned slot whichever day you did it on. Weeks start on {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][weekStart]} (Asia/Riyadh dates). Completion % = completed ÷ sessions due so far. Skipping or shortening a <strong>break</strong> is its own record and never counts as a skipped exercise. Time trained uses real timer seconds where they exist and {settings.secondsPerRep}s per rep otherwise (marked “est.”). Optional add-ons are tracked separately and never lower the required completion %.
        </div>
      </Collapsible>
    </div>
  );
}
