'use client';

/**
 * TimeRangeSelector — shared, theme-aware time-range pill row.
 *
 * Used across home dashboard, watchlist, research/StockPriceChart,
 * SectorHeatmap, and marketing pages. Each call site passes its own
 * `ranges` array because the supported windows differ (e.g. some
 * components offer 1D/1W/1M/3M/6M/1Y/3Y/5Y/ALL, others only 1D/1W/1M/YTD).
 *
 * Props
 * - ranges:             string[]                          — labels to render
 * - value:              string                            — currently selected label
 * - onChange:           (range: string) => void
 * - size:               'xs' | 'sm'                       — defaults to 'sm'
 * - accentColor:        string                            — active pill color (defaults to emerald)
 * - inactiveTextColor:  string                            — text color for non-selected pills
 * - className:          string                            — optional wrapper class
 * - style:              CSSProperties                     — optional wrapper style override
 */
export function TimeRangeSelector({
  ranges,
  value,
  onChange,
  size = 'sm',
  accentColor = '#10b981',
  inactiveTextColor = 'var(--text-muted, #8b949e)',
  className,
  style,
}) {
  const padding = size === 'xs' ? '0.15rem 0.35rem' : '0.2rem 0.4rem';
  const fontSize = size === 'xs' ? '0.55rem' : '0.575rem';

  return (
    <div
      className={className}
      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap', ...style }}
    >
      {ranges.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          style={{
            padding,
            borderRadius: 4,
            border: 'none',
            fontSize,
            fontWeight: 700,
            cursor: 'pointer',
            background: value === r ? accentColor : 'rgba(107, 114, 128, 0.1)',
            color: value === r ? '#fff' : inactiveTextColor,
            transition: 'all 0.15s',
          }}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

export default TimeRangeSelector;
