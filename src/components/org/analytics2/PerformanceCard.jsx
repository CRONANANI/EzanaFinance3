'use client';

import { FundVsBenchmarkChart } from './FundVsBenchmarkChart';
import { money, pct, signClass } from './format';

/** 4 headline stats (from the latest snapshot) + the fund-vs-benchmark chart. */
export function PerformanceCard({ latest, series }) {
  const stats = [
    { l: 'Fund value', v: money(latest?.total_value), cls: '' },
    { l: 'Return', v: pct(latest?.return_pct), cls: signClass(latest?.return_pct) },
    { l: 'Benchmark', v: pct(latest?.benchmark_return_pct), cls: '' },
    { l: 'Alpha', v: pct(latest?.alpha_pct), cls: signClass(latest?.alpha_pct) },
  ];

  return (
    <div className="fa-card fa-card-pad">
      <div className="fa-perf-stats">
        {stats.map((s) => (
          <div className="fa-stat" key={s.l}>
            <div className="l">{s.l}</div>
            <div className={`v ${s.cls}`}>{s.v}</div>
          </div>
        ))}
      </div>
      <FundVsBenchmarkChart series={series} />
      <div className="fa-legend">
        <span>
          <i style={{ background: 'var(--emerald, #10b981)' }} /> Ezana fund
        </span>
        <span>
          <i style={{ background: 'var(--text-muted, #94a3b8)' }} /> S&amp;P 500
        </span>
      </div>
    </div>
  );
}
