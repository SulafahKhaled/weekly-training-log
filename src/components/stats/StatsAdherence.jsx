import { useEffect, useState } from 'react';
import { fetchStatsLogs } from '../../lib/api';
import { periodRange, computeDailyStats, computeMonthlyStats, computeByDayType, DAY_LABEL, MONTH_LABEL } from '../../lib/adherence';
import ProgressRing from '../ProgressRing';
import Heatmap from '../shared/Heatmap';
import Collapsible from '../shared/Collapsible';

const PERIODS = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

export default function StatsAdherence() {
  const [period, setPeriod] = useState('week');
  const [logs, setLogs] = useState(null);
  const [selected, setSelected] = useState(null);

  const range = periodRange(period);

  useEffect(() => {
    setSelected(null);
    setLogs(null);
    fetchStatsLogs(range.start, range.end)
      .then((r) => setLogs(r))
      .catch(() => setLogs({ sets: [], circuits: [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  if (!logs) return <div className="hint">Loading…</div>;

  const daily = computeDailyStats(range, logs.sets, logs.circuits);
  const totalDone = daily.reduce((a, d) => a + d.done, 0);
  const totalPlanned = daily.reduce((a, d) => a + d.total, 0);
  const pct = totalPlanned ? totalDone / totalPlanned : 0;

  let cells;
  if (period === 'year') {
    const monthly = computeMonthlyStats(range, logs.sets, logs.circuits);
    cells = monthly.map((m) => ({
      key: m.month,
      tier: m.tier,
      short: MONTH_LABEL(m.month),
      label: `${MONTH_LABEL(m.month)}: ${m.total ? Math.round((m.done / m.total) * 100) : 0}% (${m.done}/${m.total})`,
    }));
  } else {
    cells = daily.map((d) => ({
      key: d.date,
      tier: d.tier,
      short: new Date(`${d.date}T00:00:00`).getDate(),
      label: `${DAY_LABEL(d.date)} — ${d.day.tag}: ${d.done}/${d.total}`,
    }));
  }

  const byDayType = computeByDayType(daily);
  const selectedDetail = period !== 'year' && selected ? daily.find((d) => d.date === selected) : null;

  return (
    <div>
      <div className="segmented">
        {PERIODS.map((p) => (
          <button key={p.id} className={period === p.id ? 'active' : ''} onClick={() => setPeriod(p.id)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="adherence-ring-row">
        <ProgressRing fraction={pct} size={92} stroke={9} color="var(--upper)" track="var(--upper-track)">
          <span className="adherence-ring-pct">{Math.round(pct * 100)}%</span>
        </ProgressRing>
        <div className="adherence-ring-caption">
          <div className="adherence-ring-big">
            {totalDone}/{totalPlanned}
          </div>
          <div className="adherence-ring-sub">exercises completed this {period}</div>
        </div>
      </div>

      <Heatmap cells={cells} columns={period === 'year' ? 4 : 7} selectedKey={selected} onSelect={(c) => setSelected(c.key === selected ? null : c.key)} />

      {selectedDetail && (
        <div className="adherence-detail">
          <strong>
            {DAY_LABEL(selectedDetail.date)} — {selectedDetail.day.tag}
          </strong>
          <div>
            {selectedDetail.done}/{selectedDetail.total} exercises completed
          </div>
        </div>
      )}

      <Collapsible id="adherence-breakdown" title="Breakdown by day-type">
        {byDayType.map((t) => (
          <div className="adherence-breakdown-row" key={t.tag}>
            <span className="adherence-breakdown-dot" style={{ background: `var(--${t.color})` }} />
            <span className="adherence-breakdown-label">{t.tag}</span>
            <span className="adherence-breakdown-value">
              {t.completed}/{t.occurrences} completed
            </span>
          </div>
        ))}
      </Collapsible>
    </div>
  );
}
