'use client';

/**
 * CongressActivityBoard (Nov 7): the research board's cards for "How has disclosed
 * congressional trading activity changed?" (founder mock-up). ResearchBoard swaps these in
 * for its generic executive answer, snapshot, KPI strip and charts whenever the run carries
 * the congress_activity panel; the model's findings, team, methodology and evidence render
 * below as usual.
 *
 *   1. Executive answer (headline, summary, snapshot inset)  | Key takeaways
 *   2. KPI strip: trades, purchases, sales, House share
 *   3. Trades by 12-month window | Trades by chamber | Purchases vs sales, indexed
 *   4. Key findings (numbered)   | Reporting limitations
 *
 * Every number comes from the panel (lib/sonar/congress-activity-board.js). Charts are
 * interactive: chamber and window toggles, keyboard reachable, values in text for screen
 * readers. Sonar card rule: no outlines, tokens only, mono for numbers, Bootstrap Icons.
 */
import { useId, useState } from 'react';
import {
  activityHeadline,
  activitySummary,
  activitySnapshot,
  activityTakeaways,
  activityKpis,
  activityFindings,
  activityLimits,
  windowBars,
  chamberSplit,
  sideIndex,
} from '@/lib/sonar/congress-activity-board';
import { activityFormat } from '@/lib/sonar/landing-congress-activity';
import './congress-activity-board.css';

const { n0, share1 } = activityFormat;

function Seg({ label, options, value, onChange }) {
  return (
    <div className="srb-cab-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`srb-cab-seg-btn${value === o.id ? ' is-on' : ''}`}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const CHAMBERS = [
  { id: 'house', label: 'House' },
  { id: 'senate', label: 'Senate' },
  { id: 'both', label: 'Both' },
];

/* ── 1. executive answer and takeaways ───────────────────────────────── */

function Executive({ d, deepAction }) {
  const id = useId();
  const snap = activitySnapshot(d);
  return (
    <section className="srb-card srb-exec srb-cab-exec" aria-labelledby={id}>
      <div className="srb-exec-top">
        <div>
          <span className="srb-eyebrow">Research answer</span>
          <h2 id={id} className="srb-exec-title">
            Desk summary
          </h2>
        </div>
        {deepAction ? <div className="srb-exec-deep">{deepAction}</div> : null}
      </div>
      <div className="srb-cab-exec-body">
        <div className="srb-cab-exec-text">
          <p className="srb-headline srb-cab-headline">{activityHeadline(d)}</p>
          <p className="srb-lede">{activitySummary(d)}</p>
        </div>
        {snap ? (
          <div className="srb-cab-snap" aria-label={snap.title}>
            <p className="srb-cab-snap-title">{snap.title}</p>
            <p className="srb-cab-snap-sub">{snap.sub}</p>
            <dl className="srb-cab-snap-list">
              {snap.rows.map((r) => (
                <div key={r.label} className="srb-cab-snap-row">
                  <dt>{r.label}</dt>
                  <dd>
                    <span className="srb-cab-mono">{r.display}</span>
                    {r.change != null ? (
                      <span className={`srb-cab-chip ${r.change >= 0 ? 'is-up' : 'is-down'}`}>
                        {r.change >= 0 ? '+' : '−'}
                        {Math.abs(r.change).toFixed(1)}%
                      </span>
                    ) : null}
                  </dd>
                </div>
              ))}
              {snap.shares.map((r) => (
                <div key={r.label} className="srb-cab-snap-row">
                  <dt>{r.label}</dt>
                  <dd className="srb-cab-mono">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Takeaways({ d }) {
  const id = useId();
  const items = activityTakeaways(d);
  return (
    <section className="srb-card srb-cab-take" aria-labelledby={id}>
      <h2 id={id} className="srb-cab-h">
        <i className="bi bi-bullseye" aria-hidden="true" /> Key takeaways
      </h2>
      <ul className="srb-cab-take-list">
        {items.map((t) => (
          <li key={t.label}>
            <strong>{t.label}:</strong> {t.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── 2. KPI strip ─────────────────────────────────────────────────────── */

function Kpis({ d }) {
  const tiles = activityKpis(d);
  return (
    <ul
      className="srb-kpis srb-cab-kpis"
      aria-label="Key measures"
      style={{ '--srb-kpis': tiles.length }}
    >
      {tiles.map((t) => (
        <li key={t.id} className="srb-card srb-kpi">
          <i className={`bi ${t.icon} srb-kpi-ico`} aria-hidden="true" />
          <span className="srb-kpi-text">
            <span className="srb-kpi-label">{t.label}</span>
            <span className="srb-kpi-value">{t.value}</span>
            {t.delta ? (
              <span className={`srb-cab-delta is-${t.delta.tone}`}>{t.delta.text}</span>
            ) : null}
            {t.sub ? <span className="srb-kpi-sub">{t.sub}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ── 3. charts ────────────────────────────────────────────────────────── */

function BarsCard({ d }) {
  const id = useId();
  const [chamber, setChamber] = useState('house');
  const bars = windowBars(d, chamber);
  const max = Math.max(1, ...bars.map((b) => b.total));
  const W = 320;
  const H = 200;
  const pad = { l: 8, r: 8, t: 22, b: 30 };
  const bw = (W - pad.l - pad.r) / bars.length;
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  return (
    <section className="srb-card srb-cab-chart" aria-labelledby={id}>
      <div className="srb-cab-chart-head">
        <h2 id={id} className="srb-cab-h">
          Purchases and sales by 12-month window
        </h2>
        <Seg label="Chamber" options={CHAMBERS} value={chamber} onChange={setChamber} />
      </div>
      <div className="srb-cab-legend" aria-hidden="true">
        <span className="srb-cab-key is-buy">Purchases</span>
        <span className="srb-cab-key is-sell">Sales</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="srb-cab-svg"
        role="img"
        aria-label={bars
          .map((b) => `${b.label}: ${n0(b.purchases)} purchases, ${n0(b.sales)} sales`)
          .join('; ')}
      >
        {bars.map((b, i) => {
          const x = pad.l + i * bw + bw * 0.2;
          const w = bw * 0.6;
          const yb = y(b.purchases);
          const ys = y(b.total);
          return (
            <g key={b.key} className={b.gap ? 'is-gap' : ''}>
              <rect className="srb-cab-bar is-buy" x={x} y={yb} width={w} height={H - pad.b - yb} />
              <rect className="srb-cab-bar is-sell" x={x} y={ys} width={w} height={yb - ys} />
              <text className="srb-cab-val" x={x + w / 2} y={ys - 6} textAnchor="middle">
                {n0(b.total)}
              </text>
              <text className="srb-cab-axis" x={x + w / 2} y={H - 12} textAnchor="middle">
                {b.label.replace(/^To /, '')}
              </text>
            </g>
          );
        })}
      </svg>
      {bars.some((b) => b.gap) ? (
        <p className="srb-cab-note">
          Faded bars include Senate years with too few senators on file to compare.
        </p>
      ) : null}
    </section>
  );
}

function DonutCard({ d }) {
  const id = useId();
  const [i, setI] = useState(d.windows.length - 1);
  const s = chamberSplit(d, i);
  const r = 52;
  const c = 2 * Math.PI * r;
  const house = s.houseShare * c;
  return (
    <section className="srb-card srb-cab-chart" aria-labelledby={id}>
      <div className="srb-cab-chart-head">
        <h2 id={id} className="srb-cab-h">
          Trades by chamber
        </h2>
        <Seg
          label="Window"
          options={d.windows.map((w, k) => ({ id: k, label: w.short.replace(/^To /, '') }))}
          value={i}
          onChange={setI}
        />
      </div>
      <div className="srb-cab-donut-wrap">
        <svg
          viewBox="0 0 140 140"
          className="srb-cab-donut"
          role="img"
          aria-label={`${s.window.label}: House ${n0(s.house)}, Senate ${n0(s.senate)}`}
        >
          <circle className="srb-cab-ring is-senate" cx="70" cy="70" r={r} />
          <circle
            className="srb-cab-ring is-house"
            cx="70"
            cy="70"
            r={r}
            strokeDasharray={`${house} ${c - house}`}
            transform="rotate(-90 70 70)"
          />
          <text x="70" y="68" textAnchor="middle" className="srb-cab-donut-total">
            {n0(s.total)}
          </text>
          <text x="70" y="86" textAnchor="middle" className="srb-cab-donut-sub">
            trades
          </text>
        </svg>
        <ul className="srb-cab-donut-legend">
          <li>
            <span className="srb-cab-key is-house">House</span>
            <span className="srb-cab-mono">
              {share1(s.houseShare)} ({n0(s.house)})
            </span>
          </li>
          <li>
            <span className="srb-cab-key is-senate">Senate</span>
            <span className="srb-cab-mono">
              {share1(1 - s.houseShare)} ({n0(s.senate)})
            </span>
          </li>
        </ul>
      </div>
      {s.senateGap ? (
        <p className="srb-cab-note">
          Senate coverage is thin for this window, so its share is understated.
        </p>
      ) : null}
    </section>
  );
}

function IndexCard({ d }) {
  const id = useId();
  const [chamber, setChamber] = useState('house');
  const pts = sideIndex(d, chamber);
  const W = 320;
  const H = 200;
  const pad = { l: 34, r: 40, t: 14, b: 30 };
  const vals = pts ? pts.flatMap((p) => [p.purchases, p.sales]) : [100];
  const lo = Math.min(80, Math.floor(Math.min(...vals) / 20) * 20);
  const hi = Math.max(120, Math.ceil(Math.max(...vals) / 20) * 20);
  const x = (k) =>
    pad.l + (pts && pts.length > 1 ? (k / (pts.length - 1)) * (W - pad.l - pad.r) : 0);
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - (v - lo) / (hi - lo));
  const line = (key) => (pts || []).map((p, k) => `${k ? 'L' : 'M'}${x(k)} ${y(p[key])}`).join(' ');
  const ticks = [lo, (lo + hi) / 2, hi];
  return (
    <section className="srb-card srb-cab-chart" aria-labelledby={id}>
      <div className="srb-cab-chart-head">
        <h2 id={id} className="srb-cab-h">
          Purchases vs sales, indexed
        </h2>
        <Seg
          label="Chamber"
          options={CHAMBERS.filter((o) => o.id !== 'both')}
          value={chamber}
          onChange={setChamber}
        />
      </div>
      {pts ? (
        <>
          <p className="srb-cab-note">First comparable window = 100</p>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="srb-cab-svg"
            role="img"
            aria-label={pts
              .map(
                (p) =>
                  `${p.label}: purchases ${p.purchases.toFixed(0)}, sales ${p.sales.toFixed(0)}`,
              )
              .join('; ')}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line className="srb-cab-grid" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
                <text className="srb-cab-axis" x={pad.l - 6} y={y(t) + 3} textAnchor="end">
                  {t.toFixed(0)}
                </text>
              </g>
            ))}
            {['purchases', 'sales'].map((k) => (
              <g key={k}>
                <path
                  className={`srb-cab-line is-${k === 'purchases' ? 'buy' : 'sell'}`}
                  d={line(k)}
                />
                {pts.map((p, j) => (
                  <circle
                    key={j}
                    className={`srb-cab-dot is-${k === 'purchases' ? 'buy' : 'sell'}`}
                    cx={x(j)}
                    cy={y(p[k])}
                    r="3.5"
                  />
                ))}
                <text
                  className={`srb-cab-end is-${k === 'purchases' ? 'buy' : 'sell'}`}
                  x={x(pts.length - 1) + 8}
                  y={y(pts[pts.length - 1][k]) + 4}
                >
                  {pts[pts.length - 1][k].toFixed(0)}
                </text>
              </g>
            ))}
            {pts.map((p, j) => (
              <text key={p.label} className="srb-cab-axis" x={x(j)} y={H - 12} textAnchor="middle">
                {p.label.replace(/^To /, '')}
              </text>
            ))}
          </svg>
          <div className="srb-cab-legend" aria-hidden="true">
            <span className="srb-cab-key is-buy">Purchases</span>
            <span className="srb-cab-key is-sell">Sales</span>
          </div>
        </>
      ) : (
        <p className="srb-cab-empty">
          The Senate has one comparable window in Ezana&apos;s records, so there is no index to
          draw.
        </p>
      )}
    </section>
  );
}

/* ── 4. findings and limits ───────────────────────────────────────────── */

function KeyFindings({ d }) {
  const id = useId();
  return (
    <section className="srb-card" aria-labelledby={id}>
      <h2 id={id} className="srb-cab-h srb-cab-h--lg">
        Key findings
      </h2>
      <ol className="srb-cab-findings">
        {activityFindings(d).map((t, k) => (
          <li key={k}>
            <span className="srb-cab-num" aria-hidden="true">
              {k + 1}
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Limits({ d }) {
  const id = useId();
  return (
    <section className="srb-card" aria-labelledby={id}>
      <h2 id={id} className="srb-cab-h srb-cab-h--lg">
        <i className="bi bi-info-circle" aria-hidden="true" /> Reporting limitations
      </h2>
      <ul className="srb-cab-limits">
        {activityLimits(d).map((l) => (
          <li key={l.id}>
            <i className={`bi ${l.icon}`} aria-hidden="true" />
            <span>
              <strong>{l.label}:</strong> {l.text}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The board cells for a congress_activity panel, in ResearchBoard's cell shape
 * ({ id, section, span, min, mid?, node }).
 */
export function congressActivityCells(d, { deepAction = null } = {}) {
  return [
    {
      id: 'cab-exec',
      section: 'answer',
      span: 8,
      min: 6,
      node: <Executive d={d} deepAction={deepAction} />,
    },
    { id: 'cab-take', section: 'answer', span: 4, min: 4, node: <Takeaways d={d} /> },
    { id: 'cab-kpis', section: 'metrics', span: 12, min: 12, node: <Kpis d={d} /> },
    { id: 'cab-bars', section: 'charts', span: 4, min: 4, mid: 3, node: <BarsCard d={d} /> },
    { id: 'cab-donut', section: 'charts', span: 4, min: 4, mid: 3, node: <DonutCard d={d} /> },
    { id: 'cab-index', section: 'charts', span: 4, min: 4, mid: 6, node: <IndexCard d={d} /> },
    { id: 'cab-findings', section: 'findings', span: 7, min: 6, node: <KeyFindings d={d} /> },
    { id: 'cab-limits', section: 'sources', span: 5, min: 4, node: <Limits d={d} /> },
  ];
}
