'use client';

/** Card 1, Congress at a Glance: four KPI tiles plus the seat-split tile. */
import { seatSplit } from '@/lib/congress/committees-page-model';
import { Card, Skel, SplitBar, fmtCount } from './ui';

export default function GlanceCard({ status, retry, sub, empty, stats }) {
  const split = seatSplit(stats?.majority, stats?.minority);
  const tiles = [
    { label: 'Committees', value: stats ? fmtCount(stats.committees) : null },
    { label: 'Subcommittees', value: stats ? fmtCount(stats.subcommittees) : null },
    { label: 'Seats', value: stats ? fmtCount(stats.seats) : null },
    {
      label: 'Members holding a seat',
      value: stats ? (stats.members == null ? '–' : fmtCount(stats.members)) : null,
    },
  ];
  return (
    <Card
      id="cmx-glance"
      className="cmx-card--glance"
      title="Congress at a glance"
      sub={sub}
      status={status}
      onRetry={retry}
      empty={empty}
      skeleton={
        <div className="cmx-glance-grid">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="cmx-tile cmx-tile--kpi">
              <Skel w="55%" h={10} />
              <Skel w="60%" h={24} style={{ marginTop: 12 }} />
            </div>
          ))}
        </div>
      }
    >
      <div className="cmx-glance-grid">
        {tiles.map((t) => (
          <div key={t.label} className="cmx-tile cmx-tile--kpi">
            <p className="cmx-kicker cmx-kicker--sm">{t.label}</p>
            <p className="cmx-kpi cmx-mono">{t.value}</p>
          </div>
        ))}
        <div className="cmx-tile cmx-tile--kpi cmx-tile--split">
          <p className="cmx-kicker cmx-kicker--sm">Seat split</p>
          <SplitBar split={split} tall />
          <p className="cmx-split-legend">
            <span>
              <i className="cmx-dot cmx-dot--maj" aria-hidden="true" /> Majority{' '}
              <span className="cmx-mono">{fmtCount(split.majority)}</span>
            </span>
            <span>
              <i className="cmx-dot cmx-dot--min" aria-hidden="true" /> Minority{' '}
              <span className="cmx-mono">{fmtCount(split.minority)}</span>
            </span>
          </p>
        </div>
      </div>
    </Card>
  );
}
