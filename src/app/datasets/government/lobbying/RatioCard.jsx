'use client';

/**
 * Card 8, Lobbying vs Contracts: lobbying spend against federal contract
 * awards per public company, log-log, from the Capitol hub's ratio endpoint.
 * Page filters do not apply (the endpoint is a per-ticker aggregate); only
 * the 1y / 2y window does. Name-matched companies are hollow dots.
 */
import { useMemo, useState } from 'react';
import { logDomain, logScale, ratioPoints } from '@/lib/lobbying/page-model';
import { fmtAxisMoney, fmtSpend } from '@/lib/lobbying/page-format';
import { Card, Segmented, Skel, Tick, useJson } from './ui';

const W = 420;
const H = 280;
const L = 46;
const B = 28;
const T = 10;
const R = 12;
const WINDOWS = [
  { value: '1', label: '1y' },
  { value: '2', label: '2y' },
];

export default function RatioCard() {
  const [years, setYears] = useState('1');
  const view = useJson(`/api/datasets/capitol/lobbying-ratio?years=${years}`);
  const pts = useMemo(() => ratioPoints(view.data?.rows), [view.data]);
  const [hover, setHover] = useState(null);
  const xd = logDomain(pts.map((p) => p.lobbying));
  const yd = logDomain(pts.map((p) => p.awards));
  const sx = logScale(xd.lo, xd.hi, L, W - R);
  const sy = logScale(yd.lo, yd.hi, H - B, T);
  const maxL = Math.max(...pts.map((p) => p.lobbying), 1);
  const size = (p) => 4 + 5.5 * Math.sqrt(p.lobbying / maxL);
  const top5 = [...pts].sort((a, b) => (b.ratio || 0) - (a.ratio || 0)).slice(0, 5);
  /* Label the top five, skipping any label that would collide with one
     already placed (the list beside the chart names all five anyway). */
  const labelled = new Set();
  const placed = [];
  for (const p of top5) {
    const x = sx(p.lobbying);
    const y = sy(p.awards);
    if (placed.every((q) => Math.abs(q.x - x) > 44 || Math.abs(q.y - y) > 12)) {
      labelled.add(p.ticker);
      placed.push({ x, y });
    }
  }
  const isEmpty = view.status === 'ready' && !pts.length;

  return (
    <Card
      id="lbx-ratio"
      className="lbx-card--fill"
      title="Lobbying vs contracts"
      sub={`Public companies · lobbying ${years === '2' ? '2 years' : '1 year'} · awards over the same window`}
      right={<Segmented label="Window" value={years} options={WINDOWS} onChange={setYears} mono />}
      status={view.status}
      onRetry={view.retry}
      empty={
        isEmpty ? 'No company has both lobbying spend and contract awards in this window.' : null
      }
      skeleton={<Skel h={H} />}
      footer={
        <p className="lbx-notes-line">
          Correlation is not causation. Both figures are public disclosures.
        </p>
      }
    >
      <div className="lbx-ratio">
        <div className="lbx-ratio-plot">
          <svg
            className="lbx-svg"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Scatter of ${pts.length} public companies: lobbying spend against federal contract awards, both on log scales.`}
            onMouseLeave={() => setHover(null)}
          >
            {xd.ticks.map((t) => (
              <g key={`x${t}`}>
                <line className="lbx-grid-line" x1={sx(t)} x2={sx(t)} y1={T} y2={H - B} />
                <text className="lbx-axis lbx-axis--x" x={sx(t)} y={H - 10}>
                  {fmtAxisMoney(t)}
                </text>
              </g>
            ))}
            {yd.ticks.map((t) => (
              <g key={`y${t}`}>
                <line className="lbx-grid-line" x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} />
                <text className="lbx-axis lbx-axis--l" x={L - 6} y={sy(t) + 3}>
                  {fmtAxisMoney(t)}
                </text>
              </g>
            ))}
            {pts.map((p) => (
              <g key={p.ticker} onMouseEnter={() => setHover(p)}>
                <circle
                  className={`lbx-dot${p.matched ? ' is-name' : ''}`}
                  cx={sx(p.lobbying)}
                  cy={sy(p.awards)}
                  r={size(p)}
                />
                {labelled.has(p.ticker) ? (
                  <text
                    className="lbx-dot-label"
                    x={sx(p.lobbying) + size(p) + 3}
                    y={sy(p.awards) + 3}
                  >
                    {p.ticker}
                  </text>
                ) : null}
              </g>
            ))}
          </svg>
          <p className="lbx-axis-caption lbx-mono" aria-hidden="true">
            x lobbying spend · y contract awards (log)
          </p>
          {hover ? (
            <div className="lbx-ratio-hover lbx-tile" aria-hidden="true">
              <strong>{hover.company}</strong>
              <span className="lbx-mono">Lobbying {fmtSpend(hover.lobbying)}</span>
              <span className="lbx-mono">Awards {fmtSpend(hover.awards)}</span>
            </div>
          ) : null}
        </div>
        <div className="lbx-ratio-side">
          <p className="lbx-kicker lbx-kicker--sm">Awards per lobbying dollar</p>
          <ol className="lbx-ratio-list">
            {top5.map((p, i) => (
              <li key={p.ticker}>
                <span className="lbx-mono lbx-faint">{i + 1}</span>
                <Tick ticker={p.ticker} verified={!p.matched} showBadge={false} />
                <span className="lbx-ellipsis" title={p.company}>
                  {p.company}
                </span>
                <span className="lbx-mono lbx-ratio-val">
                  {p.ratio != null ? `$${p.ratio.toLocaleString('en-US')}` : '·'}
                </span>
              </li>
            ))}
          </ol>
          <p className="lbx-faint lbx-ratio-key">
            <span className="lbx-key lbx-key--dot" /> verified mapping
            <span className="lbx-key lbx-key--hollow" /> name match
          </p>
        </div>
      </div>
    </Card>
  );
}
