'use client';

import { AmMetricCard } from './AmMetricCard';

const METRIC_ACCENTS = {
  btc: 'gold',
  eth: 'purple',
  mcap: 'cyan',
  fg: 'emerald',
  wti: 'gold',
  gold: 'gold',
  wheat: 'emerald',
  crb: 'cyan',
};

export function AmMetricsGrid({ stats }) {
  return (
    <div className="am2-metrics">
      {stats.map((m) => (
        <AmMetricCard
          key={m.id}
          metric={{ ...m, accent: m.accent || METRIC_ACCENTS[m.id] || 'emerald' }}
        />
      ))}
    </div>
  );
}
