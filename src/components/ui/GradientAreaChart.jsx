'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * GradientAreaChart — thin wrapper around Recharts that encodes the shared
 * visual style used by StockPriceChart, watchlist/Chart, MiniEquityChart,
 * ThisWeekOnEzana, and the Echo article charts.
 *
 * Visual contract
 * - Linear gradient area fill (lineColor at top → transparent at bottom)
 * - Dashed grid (strokeDasharray='3 3') in --chart-axis
 * - Dark tooltip with monospace value
 * - lineColor used for stroke + active dot
 *
 * Props
 * - data:            object[]                       — chart rows
 * - dataKey:         string                         — y-axis field
 * - xKey:            string                         — x-axis field (defaults to 'date')
 * - lineColor:       string                         — stroke + gradient color (defaults to emerald)
 * - height:          number                         — px height of the responsive container
 * - showGrid:        boolean                        — render dashed grid (default true)
 * - showAxis:        boolean                        — render X/Y axes (default true)
 * - showTooltip:     boolean                        — render tooltip (default true)
 * - tooltipFormatter: (value, name, payload) => string  — optional value formatter
 * - margin:          object                         — recharts margin override
 * - gradientId:      string                         — override the linearGradient id
 */
export function GradientAreaChart({
  data,
  dataKey,
  xKey = 'date',
  lineColor = '#10b981',
  height = 280,
  showGrid = true,
  showAxis = true,
  showTooltip = true,
  tooltipFormatter,
  margin = { top: 8, right: 12, left: 0, bottom: 0 },
  gradientId,
}) {
  const gradId = gradientId || `gac-${dataKey}-${lineColor.replace('#', '')}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={margin}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.32} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--chart-axis, #4b5563)"
            opacity={0.4}
          />
        )}

        {showAxis && (
          <>
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 10, fill: 'var(--text-muted, #8b949e)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--chart-axis, #4b5563)' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-muted, #8b949e)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--chart-axis, #4b5563)' }}
              width={48}
            />
          </>
        )}

        {showTooltip && (
          <Tooltip
            contentStyle={{
              background: 'var(--bg-tertiary, #161b22)',
              border: '1px solid var(--border-primary, rgba(16,185,129,0.08))',
              borderRadius: 6,
              fontSize: 11,
              fontFamily: 'var(--font-mono, monospace)',
              color: 'var(--text-primary, #f0f6fc)',
            }}
            cursor={{ stroke: lineColor, strokeOpacity: 0.4, strokeDasharray: '2 2' }}
            formatter={tooltipFormatter}
          />
        )}

        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={lineColor}
          strokeWidth={2}
          fill={`url(#${gradId})`}
          activeDot={{ r: 4, fill: lineColor, stroke: 'var(--bg-secondary, #0d1117)', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default GradientAreaChart;
