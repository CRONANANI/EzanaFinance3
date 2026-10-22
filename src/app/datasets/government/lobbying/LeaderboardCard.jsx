'use client';

/** Card 2, Spend Leaderboard: top 15 clients or firms by disclosed spend. */
import { leaderboardRows } from '@/lib/lobbying/page-model';
import { fmtPct, fmtPeriod, fmtSpend } from '@/lib/lobbying/page-format';
import { Card, Segmented, SkelRows, Tick } from './ui';

const BY = [
  { value: 'client', label: 'Clients' },
  { value: 'firm', label: 'Firms' },
];

export default function LeaderboardCard({
  view,
  by,
  setBy,
  filters,
  nowMs,
  sub,
  partial,
  empty,
  onOpen,
}) {
  const rows = leaderboardRows(view.data?.rows, view.data?.totalSpend);
  const isEmpty = view.status === 'ready' && !rows.length;
  return (
    <Card
      id="lbx-leaders"
      className="lbx-card--fill"
      title="Spend leaderboard"
      sub={sub}
      right={<Segmented label="Rank by" value={by} options={BY} onChange={setBy} />}
      status={view.status}
      refreshing={view.refreshing}
      onRetry={view.retry}
      empty={isEmpty ? empty : null}
      partial={partial}
      skeleton={<SkelRows n={15} h={37} />}
      footer={
        <>
          <span>
            Select a row for filings, issues and {by === 'firm' ? 'clients' : 'firms hired'}.
          </span>
          <span className="lbx-mono">
            {fmtPeriod(filters.period, nowMs)} total {fmtSpend(view.data?.totalSpend)}
          </span>
        </>
      }
    >
      <ol
        className="lbx-lb"
        aria-label={`Top ${by === 'firm' ? 'firms' : 'clients'} by disclosed spend`}
      >
        {rows.map((r) => (
          <li key={r.key}>
            <button
              type="button"
              className="lbx-lb-row lbx-row"
              onClick={() => onOpen({ kind: by, value: r.key, name: r.name })}
              aria-label={`${r.name}, ${fmtSpend(r.spend)}, ${fmtPct(r.share)} of the period total. Open details.`}
            >
              <span className="lbx-lb-rank lbx-mono">{r.rank}</span>
              <span className="lbx-lb-name">
                <span className="lbx-ellipsis" title={r.name}>
                  {r.name}
                </span>
                <Tick ticker={r.ticker} verified={r.verified} />
              </span>
              <span className="lbx-lb-bar" aria-hidden="true">
                <span style={{ width: `${Math.max(2, r.bar)}%` }} />
              </span>
              <span className="lbx-lb-val lbx-mono">{fmtSpend(r.spend)}</span>
              <span className="lbx-lb-share lbx-mono">{fmtPct(r.share)}</span>
            </button>
          </li>
        ))}
      </ol>
    </Card>
  );
}
