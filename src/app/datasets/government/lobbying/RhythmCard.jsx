'use client';

/**
 * Card 5, Quarterly Rhythm: disclosed spend per quarter (bars) and filing
 * count (line, right axis) from 2024 Q1 to the end of this year. Quarters
 * that have not ended are dashed ghosts labelled "Not yet filed": no value is
 * drawn for them. A quarter inside its filing window is faded and flagged
 * with the received percent from the ingest status.
 */
import { niceCeiling, quarterSeries } from '@/lib/lobbying/page-model';
import { fmtAxisMoney, fmtCount, fmtQuarter, fmtSpend } from '@/lib/lobbying/page-format';
import { Card, Skel } from './ui';

const W = 600;
const H = 260;
const L = 44;
const R = 40;
const T = 22;
const B = 30;
const PW = W - L - R;
const PH = H - T - B;

function summary(series) {
  const real = series.filter((q) => q.spend != null && q.spend > 0);
  if (!real.length) return null;
  const peak = real.reduce((a, b) => (b.spend > a.spend ? b : a));
  const lo = Math.min(...real.map((q) => q.filings));
  const hi = Math.max(...real.map((q) => q.filings));
  return `Disclosed spend peaked in ${fmtQuarter(peak.year, peak.quarter)} at ${fmtSpend(peak.spend)}. Filings ranged from ${fmtCount(lo)} to ${fmtCount(hi)} per quarter.`;
}

export default function RhythmCard({ view, coverageRows, nowMs, sub, empty }) {
  const series = quarterSeries(view.data, coverageRows, nowMs);
  const real = series.filter((q) => q.spend != null);
  const isEmpty = view.status === 'ready' && !real.some((q) => q.filings > 0);
  const yMax = niceCeiling(Math.max(...real.map((q) => q.spend || 0), 1));
  const fMax = niceCeiling(Math.max(...real.map((q) => q.filings || 0), 1));
  const slot = PW / series.length;
  const bw = slot - 8;
  const x = (i) => L + i * slot + 4;
  const y = (v) => T + PH * (1 - v / yMax);
  const fy = (v) => T + PH * (1 - v / fMax);
  const line = real
    .map((q) => {
      const i = series.indexOf(q);
      return `${x(i) + bw / 2},${Math.round(fy(q.filings) * 10) / 10}`;
    })
    .join(' ');
  const incomplete = series.filter((q) => q.status === 'incomplete' && q.pct != null);
  const pcts = incomplete.map((q) => q.pct);
  const caption = summary(series);

  return (
    <Card
      id="lbx-rhythm"
      className="lbx-card--fill"
      title="Quarterly rhythm"
      sub={sub}
      status={view.status}
      refreshing={view.refreshing}
      onRetry={view.retry}
      empty={isEmpty ? empty : null}
      skeleton={<Skel h={H} />}
      footer={
        <div className="lbx-notes">
          {caption ? <p>{caption}</p> : null}
          {pcts.length ? (
            <p>
              Past quarters are {Math.min(...pcts)}% to {Math.max(...pcts)}% loaded so far; bars
              show the filings loaded.
            </p>
          ) : null}
        </div>
      }
    >
      <div className="lbx-rhythm-legend" aria-hidden="true">
        <span>
          <span className="lbx-key lbx-key--bar" /> Disclosed spend
        </span>
        <span>
          <span className="lbx-key lbx-key--line" /> Filings
        </span>
      </div>
      <svg
        className="lbx-svg lbx-rhythm"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={caption || 'Quarterly disclosed spend and filings'}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line className="lbx-grid-line" x1={L} x2={W - R} y1={y(yMax * f)} y2={y(yMax * f)} />
            <text className="lbx-axis lbx-axis--l" x={L - 6} y={y(yMax * f) + 3}>
              {fmtAxisMoney(yMax * f)}
            </text>
            <text className="lbx-axis lbx-axis--r" x={W - R + 6} y={fy(fMax * f) + 3}>
              {fmtCount(fMax * f)}
            </text>
          </g>
        ))}
        {series.map((q, i) => {
          const label = `${q.quarter.toUpperCase()} ${String(q.year).slice(2)}`;
          if (q.status === 'not_yet_filed') {
            const gh = PH * 0.3;
            return (
              <g key={q.key}>
                <rect
                  className="lbx-ghost"
                  x={x(i)}
                  y={T + PH - gh}
                  width={bw}
                  height={gh}
                  rx="3"
                />
                <text className="lbx-ghost-label" x={x(i) + bw / 2} y={T + PH - gh - 14}>
                  Not yet
                </text>
                <text className="lbx-ghost-label" x={x(i) + bw / 2} y={T + PH - gh - 4}>
                  filed
                </text>
                <text className="lbx-axis lbx-axis--q is-ghost" x={x(i) + bw / 2} y={H - 10}>
                  {label}
                </text>
              </g>
            );
          }
          const top = y(q.spend || 0);
          return (
            <g key={q.key}>
              <path
                className={`lbx-bar${q.status === 'filing' ? ' is-partial' : ''}`}
                d={`M${x(i)} ${T + PH}V${top + 3}Q${x(i)} ${top} ${x(i) + 3} ${top}H${x(i) + bw - 3}Q${x(i) + bw} ${top} ${x(i) + bw} ${top + 3}V${T + PH}Z`}
              >
                <title>{`${fmtQuarter(q.year, q.quarter)}: ${fmtSpend(q.spend)}, ${fmtCount(q.filings)} filings`}</title>
              </path>
              {q.status === 'filing' && q.pct != null ? (
                <text
                  className="lbx-flag"
                  x={x(i) + bw / 2}
                  y={Math.max(T - 8, Math.min(top, fy(q.filings || 0)) - 8)}
                >
                  {q.pct}% filed
                </text>
              ) : null}
              <text className="lbx-axis lbx-axis--q" x={x(i) + bw / 2} y={H - 10}>
                {label}
              </text>
            </g>
          );
        })}
        {line ? <polyline className="lbx-line" points={line} /> : null}
        {real.map((q) => {
          const i = series.indexOf(q);
          return (
            <circle
              key={q.key}
              className="lbx-line-dot"
              cx={x(i) + bw / 2}
              cy={fy(q.filings)}
              r="2.5"
            />
          );
        })}
      </svg>
    </Card>
  );
}
