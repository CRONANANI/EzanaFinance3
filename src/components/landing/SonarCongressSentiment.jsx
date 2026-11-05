'use client';

/**
 * Congress sentiment on one stock (Nov 4), inside the CONGRESS row of
 * Sourced matches on a company ping: every disclosed purchase and sale by
 * members of Congress, bucketed by month (or by quarter over long windows),
 * purchases above the axis and sales below.
 *
 * Interactive: the period (6M, 1Y, 3Y, All), the measure (trades, or the
 * estimated dollars from the disclosed ranges' midpoints), and a hover or
 * focus readout per bucket. The lean is a stated rule, not a score: at
 * least 60% purchases among purchases and sales reads as net buying, at
 * most 40% as net selling, else mixed; fewer than three trades is too few.
 *
 * Data: dossier.matches.congressSeries (congressSeries() in
 * landing-pipeline.js): [date, 'b' | 's' | 'x', min, max, memberIndex].
 * Exchanges ('x') are excluded from sentiment. Tokens only.
 */
import { useMemo, useState } from 'react';
import './sonar-congress-sentiment.css';

const PERIODS = [
  { id: '6M', months: 6, label: '6M' },
  { id: '1Y', months: 12, label: '1Y' },
  { id: '3Y', months: 36, label: '3Y' },
  { id: 'ALL', months: null, label: 'All' },
];

const usd = (v) => {
  const n = Number(v) || 0;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
};
const mid = (t) => (t[2] != null && t[3] != null ? (t[2] + t[3]) / 2 : (t[2] ?? t[3] ?? 0));
const ymd = (d) => d.toISOString().slice(0, 10);

function bucketKey(date, quarterly) {
  const y = date.slice(0, 4);
  const m = Number(date.slice(5, 7));
  return quarterly ? `${y}-Q${Math.ceil(m / 3)}` : `${y}-${String(m).padStart(2, '0')}`;
}
function bucketLabel(key, quarterly) {
  if (quarterly) return key.replace('-', ' ');
  const d = new Date(`${key}-01T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Pure: the buckets and summary for a period. Exported for the tests. */
export function sentimentView(series, periodId, now = new Date()) {
  const period = PERIODS.find((p) => p.id === periodId) || PERIODS[1];
  const from = period.months
    ? /* The same window as the brief's sentence (congressWindow in
         landing-pipeline.js): this day, N months back. */
      ymd(
        new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - period.months, now.getUTCDate()),
        ),
      )
    : series.first;
  const rows = series.trades.filter((t) => t[0] >= from && t[1] !== 'x');
  const spanMonths =
    period.months ?? Math.max(1, (now - new Date(`${series.first}T00:00:00Z`)) / 2.63e9);
  const quarterly = spanMonths > 24;

  /* Continuous buckets from the window start to today, so empty months show
     as gaps rather than collapsing the axis. */
  const keys = [];
  const start = new Date(`${from.slice(0, 7)}-01T00:00:00Z`);
  for (
    let d = start;
    d <= now;
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
  ) {
    const k = bucketKey(ymd(d), quarterly);
    if (keys[keys.length - 1] !== k) keys.push(k);
  }
  const map = new Map(keys.map((k) => [k, { key: k, b: 0, s: 0, bv: 0, sv: 0 }]));
  for (const t of rows) {
    const b = map.get(bucketKey(t[0], quarterly));
    if (!b) continue;
    if (t[1] === 'b') {
      b.b += 1;
      b.bv += mid(t);
    } else {
      b.s += 1;
      b.sv += mid(t);
    }
  }
  const buckets = [...map.values()];
  const buys = rows.filter((t) => t[1] === 'b');
  const sells = rows.filter((t) => t[1] === 's');
  const total = buys.length + sells.length;
  const lean =
    total < 3
      ? 'Too few trades'
      : buys.length / total >= 0.6
        ? 'Net buying'
        : buys.length / total <= 0.4
          ? 'Net selling'
          : 'Mixed';
  const byMember = new Map();
  for (const t of rows) {
    const m = byMember.get(t[4]) || { idx: t[4], b: 0, s: 0, last: t[0] };
    if (t[1] === 'b') m.b += 1;
    else m.s += 1;
    if (t[0] > m.last) m.last = t[0];
    byMember.set(t[4], m);
  }
  const members = [...byMember.values()]
    .sort((a, b) => b.b + b.s - (a.b + a.s) || b.last.localeCompare(a.last))
    .map((m) => ({ ...m, ...series.members[m.idx] }));
  return {
    period,
    quarterly,
    buckets,
    buys: buys.length,
    sells: sells.length,
    buyValue: buys.reduce((s, t) => s + mid(t), 0),
    sellValue: sells.reduce((s, t) => s + mid(t), 0),
    members,
    lean,
  };
}

export function SonarCongressSentiment({ series, ticker, onGate }) {
  const hasRecent = series.trades.some(
    (t) => t[1] !== 'x' && t[0] >= ymd(new Date(Date.now() - 365 * 864e5)),
  );
  const [periodId, setPeriodId] = useState(hasRecent ? '1Y' : 'ALL');
  const [measure, setMeasure] = useState('trades');
  const [hover, setHover] = useState(null);
  const view = useMemo(() => sentimentView(series, periodId), [series, periodId]);

  const W = 300;
  const H = 96;
  const midY = H / 2;
  const val = (b, side) => (measure === 'trades' ? b[side] : b[`${side}v`]);
  const max = Math.max(1, ...view.buckets.map((b) => Math.max(val(b, 'b'), val(b, 's'))));
  const step = W / Math.max(1, view.buckets.length);
  const bw = Math.max(2, Math.min(14, step - 2));
  const h = (v) => (v / max) * (midY - 6);
  const active = hover != null ? view.buckets[hover] : null;
  const fmt = (v) => (measure === 'trades' ? String(v) : usd(v));
  const leanTone =
    view.lean === 'Net buying' ? 'is-up' : view.lean === 'Net selling' ? 'is-down' : '';

  return (
    <div className="snr-cs" aria-label={`Congress trading in ${ticker}`}>
      <div className="snr-cs-controls">
        <div className="snr-cs-chips" role="group" aria-label="Period">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`snr-cs-chip${p.id === periodId ? ' is-on' : ''}`}
              aria-pressed={p.id === periodId}
              onClick={() => {
                setPeriodId(p.id);
                setHover(null);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="snr-cs-chips" role="group" aria-label="Measure">
          {[
            ['trades', 'Trades'],
            ['value', 'Est. $'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`snr-cs-chip${id === measure ? ' is-on' : ''}`}
              aria-pressed={id === measure}
              onClick={() => setMeasure(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="snr-cs-stats">
        <span>
          <span className="snr-cs-k">Buys</span>
          <span className="snr-cs-v is-up">
            {measure === 'trades' ? view.buys : usd(view.buyValue)}
          </span>
        </span>
        <span>
          <span className="snr-cs-k">Sells</span>
          <span className="snr-cs-v is-down">
            {measure === 'trades' ? view.sells : usd(view.sellValue)}
          </span>
        </span>
        <span>
          <span className="snr-cs-k">Members</span>
          <span className="snr-cs-v">{view.members.length}</span>
        </span>
        <span>
          <span className="snr-cs-k">Lean</span>
          <span className={`snr-cs-v ${leanTone}`}>{view.lean}</span>
        </span>
      </div>

      <svg
        className="snr-cs-chart"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${view.buys} purchases and ${view.sells} sales of ${ticker} by members of Congress, ${view.period.label}`}
        onMouseLeave={() => setHover(null)}
      >
        <line x1="0" x2={W} y1={midY} y2={midY} className="snr-cs-axis" />
        {view.buckets.map((b, i) => {
          const x = i * step + (step - bw) / 2;
          return (
            <g key={b.key}>
              <rect
                className="snr-cs-hit"
                x={i * step}
                y="0"
                width={step}
                height={H}
                onMouseEnter={() => setHover(i)}
              />
              {val(b, 'b') ? (
                <rect
                  className={`snr-cs-bar is-buy${hover === i ? ' is-hot' : ''}`}
                  x={x}
                  y={midY - h(val(b, 'b'))}
                  width={bw}
                  height={h(val(b, 'b'))}
                  rx="1"
                />
              ) : null}
              {val(b, 's') ? (
                <rect
                  className={`snr-cs-bar is-sell${hover === i ? ' is-hot' : ''}`}
                  x={x}
                  y={midY}
                  width={bw}
                  height={h(val(b, 's'))}
                  rx="1"
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="snr-cs-axis-labels" aria-hidden="true">
        <span>{bucketLabel(view.buckets[0]?.key || '', view.quarterly)}</span>
        <span>{view.quarterly ? 'by quarter' : 'by month'}</span>
        <span>Today</span>
      </div>
      <p className="snr-cs-readout" aria-live="polite">
        {active
          ? `${bucketLabel(active.key, view.quarterly)}: ${fmt(val(active, 'b'))} ${measure === 'trades' ? 'purchases' : 'bought'}, ${fmt(val(active, 's'))} ${measure === 'trades' ? 'sales' : 'sold'}`
          : 'Hover a bar for the period'}
      </p>

      {view.members.length ? (
        <div className="snr-cs-members">
          {view.members.slice(0, 4).map((m) => (
            <button key={m.idx} type="button" className="snr-cs-member" onClick={onGate}>
              <span className="snr-cs-name">{m.name}</span>
              <span className="snr-cs-meta">
                {[m.party, m.state].filter(Boolean).join('-')}
                {' · '}
                <span className="is-up">{m.b}B</span> <span className="is-down">{m.s}S</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="snr-cs-note">No purchases or sales disclosed in this period.</p>
      )}
      <p className="snr-cs-note">
        STOCK Act disclosures by transaction date. Est. $ uses the midpoint of each disclosed range.
        Lean: 60% or more purchases is net buying, 40% or less is net selling.
      </p>
    </div>
  );
}

export default SonarCongressSentiment;
