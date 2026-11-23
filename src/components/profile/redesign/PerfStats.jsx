'use client';

import { MetricCard } from '@/components/ds';

/* The profile's six performance KPIs as metric cards (Nov 22, 2026): the
   figure large, the comparison with the platform average top right, the
   trader's percentile in the footer. Total return also draws the return
   series behind its figure, with peak, low and average. */

const fmtPct = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}%`;
const fmtDay = (d) => {
  const t = Date.parse(d);
  return Number.isFinite(t)
    ? new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
    : d;
};
const RETURN_PERIODS = [
  { label: '1W', points: 7 },
  { label: '1M', points: 30 },
  { label: '3M', points: 90 },
  { label: 'YTD' },
];

export function PerfStats({ stats, returnSeries }) {
  if (!stats || stats.length === 0) return null;
  return (
    <div
      className="profile-stripe-perfstats"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
      }}
    >
      {stats.map((s) => {
        const trend =
          s.vsAvgDirection === 'pos' ? 'up' : s.vsAvgDirection === 'neg' ? 'down' : 'flat';
        const series = s.key === 'totalReturn' && returnSeries?.length > 1 ? returnSeries : null;
        return (
          <MetricCard
            key={s.key}
            title={s.title || s.label}
            value={s.value}
            muted={s.muted}
            trend={trend}
            changeText={s.vsAvgLabel ? `${s.vsAvgLabel} vs avg` : null}
            series={series}
            periods={series ? RETURN_PERIODS : undefined}
            format={fmtPct}
            formatDate={fmtDay}
            footer={
              s.muted ? (
                <span>Not enough activity yet</span>
              ) : s.topPercentile != null ? (
                <span>
                  <strong>Top {Math.max(1, 100 - Math.round(s.topPercentile))}%</strong> of traders
                </span>
              ) : null
            }
          />
        );
      })}
    </div>
  );
}
