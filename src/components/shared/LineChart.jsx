import { useState } from 'react';
import { LineChart as RLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

/** Thin recharts wrapper styled to the app's tokens — animated draw-in, a
 * dashed neutral goal line when provided, and a "see raw numbers" table
 * toggle underneath (a chart is never the only way to read the data). */
export default function LineChart({ data, label, unit = '', color = 'var(--upper)', goal }) {
  const [showTable, setShowTable] = useState(false);
  const hasData = data.some((d) => d.value != null);

  if (!hasData) {
    return <div className="chart-empty">No data yet for this range.</div>;
  }

  const chartData = goal != null ? data.map((d) => ({ ...d, goal })) : data;

  return (
    <div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={200}>
          <RLineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} tickFormatter={(d) => d.slice(5)} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} width={36} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 10, fontSize: 12 }}
              formatter={(v, name) => [`${Math.round(v * 10) / 10}${unit}`, name === 'goal' ? 'Goal' : label]}
            />
            {goal != null && <Line type="monotone" dataKey="goal" stroke="var(--text-faint)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />}
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} connectNulls animationDuration={350} />
          </RLineChart>
        </ResponsiveContainer>
      </div>
      <button className="chart-table-toggle" onClick={() => setShowTable((s) => !s)}>
        {showTable ? 'Hide' : 'See'} raw numbers
      </button>
      {showTable && (
        <div className="chart-table">
          {data
            .filter((d) => d.value != null)
            .slice()
            .reverse()
            .map((d) => (
              <div className="chart-table-row" key={d.date}>
                <span>{d.date}</span>
                <span>
                  {Math.round(d.value * 10) / 10}
                  {unit}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
