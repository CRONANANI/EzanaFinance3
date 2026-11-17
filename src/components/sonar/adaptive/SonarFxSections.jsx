'use client';

/**
 * Sonar adaptive research: the currency-pressure blocks (Nov 17, 2026). View model
 * fx-pressure-v2, built by lib/sonar/adaptive/fx-pressure.js and checked by the report schema.
 *
 * Executive brief
 *   FxLeadBrief               why-it-matters bullets (supported / interpretation / cannot
 *                             conclude) and the driver chips, under the hero verdict
 *   CountryPressureOverview   (fx_overview) country header, four dated KPIs with sparklines,
 *                             and the PressureBreakdownPanel
 *   KeyFindingCard            (fx_findings) the four findings: evidence, what it means, why it
 *                             matters, caution
 * Detailed analysis
 *   EvidenceCoverageGrid      (fx_evidence) coverage by kind, then the matched datasets
 *   ResearchChartPanel        (fx_charts) the four charts, one system: views, ranges, captions
 *   PressureTransmissionFlow  (fx_flow) supported, conceptual and downstream steps
 *   CountryHistoricalAnchorChart (fx_anchor) the long-run Key chart with its norm
 *   CountryIndicatorTable     (fx_indicators) directly under the anchor chart
 *   FxDrivers / FxRiskScope / FxMonitor / FxOutlook / FxConclusion
 *
 * Every chart draws stored observations only: no smoothing, no interpolation, no padding.
 * Branding guide: tokens only, page-scoped under .sfx-, flat on the Sonar canvas; one tinted
 * zone (the overview) and hairline-separated analytical blocks below it.
 */
import { useId, useMemo, useState } from 'react';
import { CHART } from '@/lib/chart-theme';
import { CountryFlag } from '@/components/sonar/CountryFlag';

const BASIS = { observed: 'Observed', derived: 'Derived', conceptual: 'Conceptual' };
const AVAIL = { in_data: 'In data', partial: 'Partial', gap: 'Data gap' };
const FRESH = { lagged: 'Lagged observation', stale: 'Stale observation' };
const BULLET = {
  supported: 'Supported by data',
  interpretation: 'Interpretation',
  cannot_conclude: 'Cannot yet conclude',
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const sentence = (s) => (s ? `${String(s)[0].toUpperCase()}${String(s).slice(1)}` : '');

const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const dateOf = (x) => {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(String(x || ''));
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, m[3] ? +m[3] : 1)) : null;
};
const tickLabel = (x) => {
  const s = String(x);
  const d = dateOf(s);
  if (!d) return s;
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
    ? `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
    : `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const minus = (s) => String(s).replace(/^-/, '−');
const fmt = (v, unit) => {
  if (!finite(v)) return '';
  if (unit === 'usd') {
    const a = Math.abs(v);
    return a >= 1e12
      ? `${(v / 1e12).toFixed(2)}T`
      : a >= 1e9
        ? `${(v / 1e9).toFixed(1)}B`
        : a >= 1e6
          ? `${(v / 1e6).toFixed(1)}M`
          : Math.round(v).toLocaleString('en-US');
  }
  if (unit === '%') return minus(`${v.toFixed(1)}%`);
  if (unit === 'pp') return minus(`${v > 0 ? '+' : ''}${v.toFixed(1)} pp`);
  const a = Math.abs(v);
  return minus(a >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(a >= 100 ? 1 : 2));
};

function Eyebrow({ children }) {
  return children ? <p className="sfx-eyebrow">{children}</p> : null;
}

/**
 * A line chart of real observations.
 *   series  [{ name, tone: 'primary' | 'reference', points: [{ x, y, proj? }] }]
 *   refLine { value, label } a dotted horizontal reference (a median)
 *   zero    draw the zero line when the range crosses it
 * Points flagged proj are drawn dashed; a gap (no point for an x) breaks the line.
 */
function LineChart({
  series,
  unit,
  height = 240,
  area = false,
  label,
  refLine = null,
  zero = false,
  endLabels = true,
}) {
  const id = useId().replace(/:/g, '');
  const W = 760;
  const H = height;
  const pad = { l: 52, r: 68, t: 18, b: 28 };
  const cats = [...new Set(series.flatMap((s) => s.points.map((p) => String(p.x))))];
  const sortable = cats.every((c) => dateOf(c) || /^\d{4}$/.test(c));
  if (sortable) cats.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const idx = new Map(cats.map((c, i) => [c, i]));
  const all = series.flatMap((s) => s.points.map((p) => p.y).filter(finite));
  if (all.length < 2) return null;
  if (refLine && finite(refLine.value)) all.push(refLine.value);
  if (zero) all.push(0);
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  const span = hi - lo || Math.abs(hi) || 1;
  lo -= span * 0.08;
  hi += span * 0.08;
  const n = cats.length;
  const x = (i) => pad.l + (n === 1 ? 0 : (i / (n - 1)) * (W - pad.l - pad.r));
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
  const xTicks = n <= 3 ? cats.map((_, i) => i) : [0, Math.floor((n - 1) / 2), n - 1];
  const paths = series.map((s) => {
    const pts = s.points
      .filter((p) => finite(p.y) && idx.has(String(p.x)))
      .map((p) => ({ ...p, i: idx.get(String(p.x)) }))
      .sort((a, b) => a.i - b.i);
    let solid = '';
    let dashed = '';
    pts.forEach((p, k) => {
      const prev = pts[k - 1];
      const seg = `${x(p.i).toFixed(1)},${y(p.y).toFixed(1)}`;
      if (p.proj && prev) dashed += `M${x(prev.i).toFixed(1)},${y(prev.y).toFixed(1)}L${seg}`;
      else if (p.proj) dashed += `M${seg}`;
      else solid += `${solid ? 'L' : 'M'}${seg}`;
    });
    return { solid, dashed, pts };
  });
  const filled = area && series.length === 1 && paths[0].pts.length === n && !paths[0].dashed;
  return (
    <figure className="sfx-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {filled ? (
          <defs>
            <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0"
                stopColor={CHART.primaryStroke}
                stopOpacity={CHART.gradientFromOpacity}
              />
              <stop
                offset="1"
                stopColor={CHART.primaryStroke}
                stopOpacity={CHART.gradientToOpacity}
              />
            </linearGradient>
          </defs>
        ) : null}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(t)}
              y2={y(t)}
              stroke={CHART.gridStroke}
              strokeDasharray={CHART.gridDash}
            />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="sfx-tick">
              {fmt(t, unit)}
            </text>
          </g>
        ))}
        {zero && lo < 0 && hi > 0 ? (
          <line
            x1={pad.l}
            x2={W - pad.r}
            y1={y(0)}
            y2={y(0)}
            stroke={CHART.benchmarkStroke}
            strokeWidth="1"
          />
        ) : null}
        {xTicks.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 8}
            textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
            className="sfx-tick"
          >
            {tickLabel(cats[i])}
          </text>
        ))}
        {filled ? (
          <path
            d={`${paths[0].solid}L${x(n - 1).toFixed(1)},${H - pad.b}L${x(0).toFixed(1)},${H - pad.b}Z`}
            fill={`url(#g${id})`}
          />
        ) : null}
        {refLine && finite(refLine.value) ? (
          <g>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(refLine.value)}
              y2={y(refLine.value)}
              stroke={CHART.benchmarkStroke}
              strokeDasharray={CHART.benchmarkDash}
            />
            <text
              x={W - pad.r - 4}
              y={y(refLine.value) - 6}
              textAnchor="end"
              className="sfx-reflabel"
            >
              {refLine.label}
            </text>
          </g>
        ) : null}
        {series.map((s, k) => {
          const refTone = s.tone === 'reference';
          const stroke = refTone ? CHART.benchmarkStroke : CHART.primaryStroke;
          const width = refTone ? CHART.secondaryStrokeWidth : CHART.primaryStrokeWidth;
          return (
            <g key={s.name}>
              {paths[k].solid ? (
                <path
                  d={paths[k].solid}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={width}
                  strokeDasharray={refTone ? '5 4' : undefined}
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
              {paths[k].dashed ? (
                <path
                  d={paths[k].dashed}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={width}
                  strokeDasharray="3 4"
                  opacity="0.7"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
            </g>
          );
        })}
        {endLabels
          ? series.map((s, k) => {
              const pts = paths[k].pts;
              const last = pts[pts.length - 1];
              if (!last) return null;
              return (
                <g key={`e-${s.name}`}>
                  <circle
                    cx={x(last.i)}
                    cy={y(last.y)}
                    r="4"
                    className={`sfx-dot${s.tone === 'reference' ? ' sfx-dot--ref' : ''}`}
                  />
                  <text x={x(last.i) + 8} y={y(last.y) + 4} className="sfx-endval">
                    {fmt(last.y, unit)}
                  </text>
                </g>
              );
            })
          : null}
      </svg>
      {series.length > 1 ? (
        <figcaption className="sfx-legend">
          {series.map((s) => (
            <span
              key={s.name}
              className={`sfx-key${s.tone === 'reference' ? ' sfx-key--ref' : ''}`}
            >
              {s.name}
            </span>
          ))}
        </figcaption>
      ) : null}
      <table className="sxb-sr">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {series.map((s) => (
              <th key={s.name} scope="col">
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cats.map((c) => (
            <tr key={c}>
              <th scope="row">{c}</th>
              {series.map((s) => {
                const p = s.points.find((q) => String(q.x) === c);
                return (
                  <td key={s.name}>
                    {p && finite(p.y) ? `${fmt(p.y, unit)}${p.proj ? ' (projection)' : ''}` : 'n/a'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function Spark({ values }) {
  const v = (values || []).filter(finite);
  if (v.length < 2) return null;
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const d = v
    .map(
      (val, i) =>
        `${i ? 'L' : 'M'}${((i / (v.length - 1)) * 70).toFixed(1)},${(22 - ((val - lo) / (hi - lo || 1)) * 20).toFixed(1)}`,
    )
    .join('');
  return (
    <svg className="sfx-spark" viewBox="0 0 72 24" aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke={CHART.primaryStroke}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ executive brief */

/** Under the hero verdict: what matters, each line labelled by how far the data carry it. */
export function FxLeadBrief({ lead }) {
  if (!lead?.bullets?.length && !lead?.chips?.length) return null;
  return (
    <div className="sfx-brief">
      {lead.bullets?.length ? (
        <ul className="sfx-bullets" aria-label="Why this matters">
          {lead.bullets.map((b) => (
            <li key={b.id} className={`sfx-bullet sfx-bullet--${b.basis}`}>
              <span className="sfx-bullet-tag">{BULLET[b.basis] || ''}</span>
              <span>{b.text}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {lead.chips?.length ? (
        <ul className="sfx-chips" aria-label="Core drivers">
          {lead.chips.map((c) => (
            <li key={c.id} className={`sfx-chip sfx-lvl--${c.level}`}>
              {c.label}
              <span className="sfx-chip-level">{sentence(c.level)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PressureBreakdownPanel({ rows, note }) {
  if (!rows?.length) return null;
  return (
    <div className="sfx-breakdown">
      <p className="sfx-subeyebrow">Pressure breakdown</p>
      <table className="sfx-table">
        <caption className="sxb-sr">Each component of the pressure reading and its level</caption>
        <thead>
          <tr>
            <th scope="col">Component</th>
            <th scope="col">Level</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <th scope="row">{r.label}</th>
              <td>
                <span
                  className={`sfx-level sfx-lvl--${r.id === 'crisis' ? 'scope' : r.level}`}
                >
                  {sentence(r.level || 'n/a')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {note ? <p className="sfx-caption">{note}</p> : null}
    </div>
  );
}

export function CountryPressureOverview({ s, Cites, sources }) {
  return (
    <div className="sfx-overview">
      <div className="sfx-ov-head">
        <div className="sfx-ov-id">
          <CountryFlag iso2={s.iso2} label={s.place} width={40} />
          <div>
            <Eyebrow>{s.eyebrow}</Eyebrow>
            <p className="sfx-ov-name">{s.place}</p>
            <p className="sfx-ov-cur">{s.currency}</p>
          </div>
        </div>
        <div className="sfx-ov-status">
          {s.levelLabel ? (
            <span className={`sfx-level sfx-level--lg sfx-lvl--${s.level}`}>{s.levelLabel}</span>
          ) : null}
          <span className="sfx-ov-asof">{s.asOf}</span>
        </div>
      </div>
      <div className="sfx-ov-body">
        <dl className="sfx-metrics" aria-label="Key figures">
          {s.items.map((k) => (
            <div
              key={k.id}
              className={`sfx-metric${k.freshness !== 'fresh' ? ' sfx-metric--aged' : ''}`}
            >
              <dt>{k.label}</dt>
              <dd className="sfx-metric-row">
                <span className="sfx-metric-value">{k.value}</span>
                <Spark values={k.spark} />
              </dd>
              {k.delta ? (
                <dd className={`sfx-metric-delta sfx-tone--${k.tone}`}>{k.delta}</dd>
              ) : null}
              <dd className="sfx-metric-meta">
                {k.period}
                {FRESH[k.freshness] ? (
                  <span className="sfx-aged"> · {FRESH[k.freshness]}</span>
                ) : null}
                <Cites ids={k.cites} sources={sources} />
              </dd>
            </div>
          ))}
        </dl>
        <PressureBreakdownPanel rows={s.breakdown} note={s.breakdownNote} />
      </div>
      {s.footnote ? <p className="sfx-footnote">{s.footnote}</p> : null}
    </div>
  );
}

function KeyFindingCard({ f, n, Cites, sources }) {
  return (
    <li className="sfx-finding">
      <div className="sfx-finding-top">
        <span className="sfx-num">{String(n).padStart(2, '0')}</span>
        <span className="sfx-finding-kicker">{f.title}</span>
        {f.status ? (
          <span className={`sfx-tag sfx-status--${String(f.status).toLowerCase()}`}>
            {f.status}
          </span>
        ) : null}
      </div>
      <h3 className="sfx-finding-head">{f.headline}</h3>
      <ul className="sfx-finding-ev" aria-label="Evidence">
        {f.evidence.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
      <dl className="sfx-finding-dl">
        {f.meaning ? (
          <div>
            <dt>What it means</dt>
            <dd>{f.meaning}</dd>
          </div>
        ) : null}
        {f.why ? (
          <div>
            <dt>Why it matters</dt>
            <dd>{f.why}</dd>
          </div>
        ) : null}
      </dl>
      {f.caution ? (
        <p className="sfx-caution">
          {f.caution}
          <Cites ids={f.cites} sources={sources} />
        </p>
      ) : null}
      {f.chart ? (
        <a className="sfx-jump" href={`#sfx-chart-${f.chart}`}>
          See the chart
        </a>
      ) : null}
    </li>
  );
}

export function FxFindings({ s, Cites, sources }) {
  return (
    <>
      <Eyebrow>{s.eyebrow}</Eyebrow>
      <ol className="sfx-findings">
        {s.items.map((f, i) => (
          <KeyFindingCard key={f.title} f={f} n={i + 1} Cites={Cites} sources={sources} />
        ))}
      </ol>
    </>
  );
}

/* ------------------------------------------------------------------ detailed analysis */

export function EvidenceCoverageGrid({ s }) {
  return (
    <>
      <Eyebrow>{s.eyebrow}</Eyebrow>
      <ul className="sfx-coverage">
        {s.groups.map((g) => (
          <li key={g.id} className={`sfx-cov sfx-cov--${g.id}`}>
            <span className="sfx-cov-label">{g.label}</span>
            <span className="sfx-cov-detail">{g.detail}</span>
            <span className="sfx-cov-items">{g.items.slice(0, 4).join(' · ')}</span>
          </li>
        ))}
      </ul>
      {s.datasets?.length ? (
        <ul className="sfx-datasets">
          {s.datasets.map((d) => (
            <li key={d.id} className="sfx-dataset">
              <span className={`sfx-tag ${d.kind === 'markets' ? 'sfx-tag--partial' : 'sfx-tag--observed'}`}>
                {d.chip}
              </span>
              <div>
                <p className="sfx-dataset-title">
                  {d.href ? <a href={d.href}>{d.title}</a> : d.title}
                </p>
                {d.summary ? <p className="sfx-dataset-sum">{d.summary}</p> : null}
              </div>
              {d.bullets?.length ? (
                <ul className="sfx-dataset-list">
                  {d.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              ) : (
                <span aria-hidden="true" />
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {s.news?.length ? (
        <ul className="sfx-news" aria-label="Open web and news">
          {s.news.map((n) => (
            <li key={n.url}>
              <a href={n.url} target="_blank" rel="noopener noreferrer">
                {n.title}
              </a>
              {n.source ? <span className="sfx-news-src"> · {n.source}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

const RANGE_MONTHS = { '3M': 3, '1Y': 12, '3Y': 36, '5Y': 60 };
function sliceRange(points, range) {
  if (!range || !points.length) return points;
  const last = dateOf(points[points.length - 1].x);
  if (!last) return points;
  const from = new Date(
    Date.UTC(
      last.getUTCFullYear(),
      last.getUTCMonth() - (RANGE_MONTHS[range] || 12),
      last.getUTCDate(),
    ),
  );
  const win = points.filter((p) => {
    const d = dateOf(p.x);
    return d && d >= from;
  });
  return win.length >= 2 ? win : points.slice(-2);
}

function ResearchChartPanel({ p, Cites, sources }) {
  const [view, setView] = useState(p.views[0].id);
  const [range, setRange] = useState(p.defaultRange || null);
  const v = p.views.find((x) => x.id === view) || p.views[0];
  const series = useMemo(
    () =>
      v.series.map((s) => ({ ...s, points: p.ranges ? sliceRange(s.points, range) : s.points })),
    [v, range, p.ranges],
  );
  return (
    <div className="sfx-panel" id={`sfx-chart-${p.id}`} tabIndex={-1}>
      <div className="sfx-panel-top">
        <h3 className="sfx-panel-title">{p.title}</h3>
        {p.latest ? (
          <span className="sfx-panel-latest">
            {p.latest}
            {FRESH[p.freshness] ? <span className="sfx-aged"> · {FRESH[p.freshness]}</span> : null}
          </span>
        ) : null}
      </div>
      {p.views.length > 1 || p.ranges ? (
        <div className="sfx-panel-controls">
          {p.views.length > 1 ? (
            <div className="sfx-ranges" role="group" aria-label="View">
              {p.views.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  className="sfx-range"
                  aria-pressed={view === x.id}
                  onClick={() => setView(x.id)}
                >
                  {x.label}
                </button>
              ))}
            </div>
          ) : (
            <span />
          )}
          {p.ranges ? (
            <div className="sfx-ranges" role="group" aria-label="Range">
              {p.ranges.map((r) => (
                <button
                  key={r}
                  type="button"
                  className="sfx-range"
                  aria-pressed={range === r}
                  onClick={() => setRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <LineChart
        series={series}
        unit={v.unit}
        refLine={v.ref}
        zero={v.zero}
        label={`${p.title}, ${v.label}`}
        height={230}
        area={series.length === 1 && !v.zero}
      />
      <p className="sfx-caption">
        {p.caption}
        <Cites ids={p.cites} sources={sources} />
      </p>
    </div>
  );
}

export function FxCharts({ s, Cites, sources }) {
  return (
    <>
      <Eyebrow>{s.eyebrow}</Eyebrow>
      <div className={`sfx-panels${s.panels.length % 2 ? ' is-odd' : ''}`}>
        {s.panels.map((p) => (
          <ResearchChartPanel key={p.id} p={p} Cites={Cites} sources={sources} />
        ))}
      </div>
    </>
  );
}

const FLOW_KIND = {
  supported: 'Supported by data',
  conceptual: 'Conceptual',
  effect: 'Downstream effect',
};

export function PressureTransmissionFlow({ s }) {
  const layers = [];
  for (const n of s.nodes) (layers[n.layer] ||= []).push(n);
  const cols = layers.filter(Boolean);
  return (
    <>
      <Eyebrow>{s.eyebrow}</Eyebrow>
      <h2 className="sxb-section-title">{s.title}</h2>
      <ul className="sfx-flow-legend" aria-label="Legend">
        {Object.entries(FLOW_KIND).map(([k, l]) => (
          <li key={k} className={`sfx-flow-key sfx-flow--${k}`}>
            {l}
          </li>
        ))}
      </ul>
      <ol className="sfx-flow" style={{ '--sfx-flow-cols': cols.length }}>
        {cols.map((col, i) => (
          <li key={col.map((n) => n.id).join('-')} className="sfx-flow-col">
            <ul>
              {col.map((n) => (
                <li key={n.id} className={`sfx-node sfx-flow--${n.kind}`}>
                  <span className="sfx-node-label">{n.label}</span>
                  <span className="sfx-node-kind">
                    {n.kind === 'effect'
                      ? n.supported
                        ? 'Downstream · supported by data'
                        : 'Downstream · conceptual'
                      : FLOW_KIND[n.kind]}
                  </span>
                  {n.feeds?.length ? (
                    <span className="sxb-sr">Leads to {n.feeds.filter(Boolean).join(' and ')}.</span>
                  ) : null}
                </li>
              ))}
            </ul>
            {i < cols.length - 1 ? <span className="sfx-flow-arrow" aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>
      <p className="sfx-caption">{s.caption}</p>
    </>
  );
}

export function CountryHistoricalAnchorChart({ s, Cites, sources }) {
  const [sel, setSel] = useState(s.defaultIndex || 0);
  const st = s.stories[sel] || s.stories[0];
  return (
    <>
      <div className="sfx-anchor-top">
        <Eyebrow>{s.eyebrow}</Eyebrow>
        <span className="sfx-ov-asof">{s.place}</span>
      </div>
      <div className="sfx-ranges sfx-tabs" role="group" aria-label="Indicator">
        {s.stories.map((x, i) => (
          <button
            key={x.slug}
            type="button"
            className="sfx-range"
            aria-pressed={i === sel}
            onClick={() => setSel(i)}
            title={x.label}
          >
            {x.short}
          </button>
        ))}
      </div>
      <h2 className="sxb-section-title">{st.headline}</h2>
      <LineChart
        series={[{ name: st.label, tone: 'primary', points: st.points }]}
        unit={st.percent ? '%' : 'number'}
        refLine={st.median != null ? { value: st.median, label: `${st.normYears}Y median` } : null}
        label={st.label}
        height={260}
      />
      <dl className="sfx-anchor-stats">
        {st.stats.map((x) => (
          <div key={x.label}>
            <dt>{x.label}</dt>
            <dd className="sfx-anchor-value">{x.value}</dd>
            {x.note ? <dd className="sfx-metric-meta">{x.note}</dd> : null}
          </div>
        ))}
      </dl>
      <p className="sfx-caption">
        {st.note}
        <Cites ids={s.cites} sources={sources} />
      </p>
    </>
  );
}

export function CountryIndicatorTable({ s }) {
  return (
    <>
      <div className="sfx-anchor-top">
        <Eyebrow>{s.eyebrow}</Eyebrow>
        <span className="sfx-ov-asof">{s.place}</span>
      </div>
      <div
        className="sfx-table-scroll"
        role="region"
        aria-label={`Key indicators for ${s.place}`}
        tabIndex={0}
      >
        <table className="sfx-table sfx-table--ind">
          <caption className="sxb-sr">
            Key indicators for {s.place}: latest observed value, period, change on a year earlier
            and source
          </caption>
          <thead>
            <tr>
              <th scope="col">Indicator</th>
              <th scope="col" className="is-num">
                Latest
              </th>
              <th scope="col">Period</th>
              <th scope="col" className="is-num">
                vs year earlier
              </th>
              <th scope="col">Source</th>
            </tr>
          </thead>
          <tbody>
            {s.rows.map((r) => (
              <tr key={r.id}>
                <th scope="row">
                  {r.label}
                  {r.note ? <span className="sfx-ind-note">{r.note}</span> : null}
                </th>
                <td className="is-num">{r.value}</td>
                <td>{r.period}</td>
                <td className="is-num">{r.change || 'n/a'}</td>
                <td title={r.attribution || undefined}>{r.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sfx-caption">{s.note}</p>
    </>
  );
}

export function FxDrivers({ s, Cites, sources }) {
  return (
    <>
      <Eyebrow>{s.eyebrow}</Eyebrow>
      <h2 className="sxb-section-title">{s.title}</h2>
      <ul className="sfx-rows">
        {s.rows.map((r) => (
          <li key={r.driver} className="sfx-row">
            <span className="sfx-row-name">{r.driver}</span>
            <span className="sfx-row-text">
              {r.text}
              <Cites ids={r.cites} sources={sources} />
            </span>
            <span className={`sfx-tag sfx-tag--${r.basis}`}>{BASIS[r.basis]}</span>
          </li>
        ))}
      </ul>
      <p className="sfx-caption">{s.note}</p>
    </>
  );
}

const PRESSURE = {
  established: 'established',
  limited: 'limited',
  not_established: 'not established',
};

export function FxRiskScope({ s }) {
  return (
    <>
      <Eyebrow>{s.eyebrow}</Eyebrow>
      <div className="sfx-scope">
        <p className="sfx-scope-label">Assessment / Scope</p>
        <p className="sfx-scope-state">
          Pressure: {PRESSURE[s.pressure]}
          <br />
          Crisis: not established
        </p>
        <p className="sfx-scope-text">{s.text}</p>
        {s.thresholdsNote ? <p className="sfx-caption">{s.thresholdsNote}</p> : null}
      </div>
      <h3 className="sfx-subhead">Missing from the evidence</h3>
      <p className="sfx-missing">{s.missing.join(' · ')}.</p>
      {s.alsoMissing?.length ? (
        <p className="sfx-caption">Also not available for this country: {s.alsoMissing.join('; ')}.</p>
      ) : null}
    </>
  );
}

export function FxMonitor({ s }) {
  return (
    <>
      <Eyebrow>{s.eyebrow}</Eyebrow>
      <ul className="sfx-rows">
        {s.items.map((i) => (
          <li key={i.signal} className="sfx-row">
            <span className="sfx-row-name">{i.signal}</span>
            <span className="sfx-row-text">
              {i.why}
              {i.reading ? <span className="sfx-reading"> {i.reading}.</span> : null}
            </span>
            <span className={`sfx-tag sfx-tag--${i.availability}`}>{AVAIL[i.availability]}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function FxOutlook({ s }) {
  return (
    <>
      <Eyebrow>{s.eyebrow}</Eyebrow>
      <ul className="sfx-rows">
        {s.rows.map((r) => (
          <li key={r.name} className="sfx-row sfx-row--two">
            <span className={`sfx-row-name sfx-out--${r.tone}`}>{r.name}</span>
            <span className="sfx-row-text">{r.text}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function FxConclusion({ s }) {
  return (
    <p className="sfx-conclusion">
      <strong>Research conclusion:</strong> {s.text}
    </p>
  );
}

/** Two sections side by side, the first wider when `wide` is set. */
export function FxPair({ children, wide = false }) {
  return <div className={`sgeo-pair${wide ? ' sfx-pair--wide' : ''}`}>{children}</div>;
}
