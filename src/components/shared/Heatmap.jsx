/**
 * A GitHub-contribution-style grid: one hue, three lightness/opacity steps
 * (missed = outline only, partial = medium fill, full = darkest fill) —
 * never a traffic-light hue swap. Tapping a cell surfaces its detail via
 * onSelect rather than relying on color alone.
 */
export default function Heatmap({ cells, columns = 7, selectedKey, onSelect }) {
  return (
    <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {cells.map((c) => (
        <button
          key={c.key}
          className={`heatmap-cell tier-${c.tier}${selectedKey === c.key ? ' selected' : ''}`}
          onClick={() => onSelect?.(c)}
          title={c.label}
          aria-label={c.label}
        >
          {c.short}
        </button>
      ))}
    </div>
  );
}
