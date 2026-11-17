'use client';

/**
 * Sonar adaptive research: the currency-pressure sections (Nov 17, 2026). View model
 * fx-pressure-v1, built by lib/sonar/adaptive/fx-pressure.js and checked by the report schema.
 *
 *   fx_metrics     four figures that frame the question, each with its observation date;
 *                  lagged or stale observations are marked in amber
 *   fx_trend       the stored exchange-rate series at full width, quote convention stated
 *   fx_insights    three numbered conclusions
 *   fx_drivers     drivers, each labelled observed, derived or conceptual
 *   fx_risk_scope  pressure and crisis as states, the measures that are missing; no score
 *   fx_policy      inflation against the policy rate (monthly, aligned)
 *   fx_buffers     the real effective exchange rate and gross reserves
 *   fx_monitor     what to watch and whether Sonar holds it
 *   fx_outlook     conditions, not forecasts; no probabilities
 *   fx_conclusion  the research conclusion
 *
 * Every chart draws stored observations only: no smoothing, no interpolation, no padding.
 * Branding guide: tokens only, page-scoped under .sfx-, flat on the Sonar canvas.
 */
import { useId, useMemo, useState } from 'react';
import { CHART } from '@/lib/chart-theme';

const BASIS = { observed: 'Observed', derived: 'Derived', conceptual: 'Conceptual' };
const AVAIL = { in_data: 'In data', partial: 'Partial', gap: 'Data gap' };
const FRESH = { lagged: 'Lagged observation', stale: 'Stale observation' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const dateOf = (x) => {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(String(x || ''));
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, m[3] ? +m[3] : 1)) : null;
};
const tickLabel = (x, daily) => {
  const d = dateOf(x);
  if (!d) return String(x);
  return daily
    ? `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
    : `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const fmt = (v, unit) => {
  if (!finite(v)) return '';
  const a = Math.abs(v);
  const s = a >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(a >= 100 ? 1 : 2);
  return unit === '%' ? `${v.toFixed(1)}%` : s;
};

function Eyebrow({ children }) {
  return children ? <p className="sfx-eyebrow">{children}</p> : null;
}

/**
 * A line chart of real observations. series: [{ name, values, tone }] over categories.
 * Gaps (null) break the line; nothing is drawn between them.
 */
function LineChart({ categories, series, unit, height = 240, area = false, label, endLabels = true }) {
  const id = useId().replace(/:/g, '');
  const W = 760;
  const H = height;
  const pad = { l: 44, r: 64, t: 18, b: 28 };
  const all = series.flatMap((s) => s.values.filter(finite));
  if (all.length < 2) return null;
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  const span = hi - lo || Math.abs(hi) || 1;
  lo -= span * 0.08;
  hi += span * 0.08;
  const n = categories.length;
  const x = (i) => pad.l + (n === 1 ? 0 : (i / (n - 1)) * (W - pad.l - pad.r));
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
  const daily = /^\d{4}-\d{2}-\d{2}$/.test(categories[n - 1] || '');
  const xTicks = n <= 3 ? categories.map((_, i) => i) : [0, Math.floor((n - 1) / 2), n - 1];
  const paths = series.map((s) => {
    let d = '';
    let pen = false;
    s.values.forEach((v, i) => {
      if (!finite(v)) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  });
  const lastIdx = (vals) => {
    for (let i = vals.length - 1; i >= 0; i -= 1) if (finite(vals[i])) return i;
    return -1;
  };
  const firstIdx = (vals) => vals.findIndex(finite);
  return (
    <figure className="sfx-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {area && series[0] ? (
          <defs>
            <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={CHART.primaryStroke} stopOpacity={CHART.gradientFromOpacity} />
              <stop offset="1" stopColor={CHART.primaryStroke} stopOpacity={CHART.gradientToOpacity} />
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
        {xTicks.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 8}
            textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
            className="sfx-tick"
          >
            {tickLabel(categories[i], daily)}
          </text>
        ))}
        {area && paths[0] && series[0].values.every(finite) ? (
          <path
            d={`${paths[0]}L${x(n - 1).toFixed(1)},${H - pad.b}L${x(0).toFixed(1)},${H - pad.b}Z`}
            fill={`url(#g${id})`}
          />
        ) : null}
        {series.map((s, k) => (
          <path
            key={s.name}
            d={paths[k]}
            fill="none"
            stroke={s.tone === 'reference' ? CHART.benchmarkStroke : CHART.primaryStroke}
            strokeWidth={s.tone === 'reference' ? CHART.secondaryStrokeWidth : CHART.primaryStrokeWidth}
            strokeDasharray={s.tone === 'reference' ? '5 4' : undefined}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {endLabels
          ? series.map((s) => {
              const i = lastIdx(s.values);
              const f = firstIdx(s.values);
              if (i < 0) return null;
              return (
                <g key={`e-${s.name}`}>
                  {series.length === 1 && f >= 0 && f !== i ? (
                    <>
                      <circle cx={x(f)} cy={y(s.values[f])} r="3.5" className="sfx-dot sfx-dot--start" />
                      <text x={x(f) + 8} y={y(s.values[f]) - 8} className="sfx-endval">
                        {fmt(s.values[f], unit)}
                      </text>
                    </>
                  ) : null}
                  <circle
                    cx={x(i)}
                    cy={y(s.values[i])}
                    r="4"
                    className={`sfx-dot${s.tone === 'reference' ? ' sfx-dot--ref' : ''}`}
                  />
                  <text x={x(i) + 8} y={y(s.values[i]) + 4} className="sfx-endval">
                    {fmt(s.values[i], unit)}
                  </text>
                </g>
              );
            })
          : null}
      </svg>
      {series.length > 1 ? (
        <figcaption className="sfx-legend">
          {series.map((s) => (
            <span key={s.name} className={`sfx-key${s.tone === 'reference' ? ' sfx-key--ref' : ''}`}>
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
          {categories.map((c, i) => (
            <tr key={c}>
              <th scope="row">{c}</th>
              {series.map((s) => (
                <td key={s.name}>{finite(s.values[i]) ? fmt(s.values[i], unit) : 'n/a'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function FxMetrics({ s, Cites, sources }) {
  return (
    <>
      <dl className="sfx-metrics" aria-label="Key figures">
        {s.items.map((k) => (
          <div key={k.id} className={`sfx-metric${k.freshness !== 'fresh' ? ' sfx-metric--aged' : ''}`}>
            <dt>{k.label}</dt>
            <dd className="sfx-metric-value">{k.value}</dd>
            {k.delta ? <dd className={`sfx-metric-delta sfx-tone--${k.tone}`}>{k.delta}</dd> : null}
            <dd className="sfx-metric-meta">
              {k.period}
              {FRESH[k.freshness] ? <span className="sfx-aged"> · {FRESH[k.freshness]}</span> : null}
              <Cites ids={k.cites} sources={sources} />
            </dd>
          </div>
        ))}
      </dl>
      {s.footnote ? <p className="sfx-footnote">{s.footnote}</p> : null}
    </>
  );
}

const RANGE_MONTHS = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '5Y': 60 };

export function FxTrend({ s, Cites, sources }) {
  const [range, setRange] = useState(s.defaultRange || '1Y');
  const pts = useMemo(() => {
    const all = s.points;
    const last = dateOf(all[all.length - 1].x);
    if (!last) return all;
    const from =
      range === 'YTD'
        ? new Date(Date.UTC(last.getUTCFullYear(), 0, 1))
        : new Date(
            Date.UTC(last.getUTCFullYear(), last.getUTCMonth() - (RANGE_MONTHS[range] || 12), last.getUTCDate()),
          );
    const win = all.filter((p) => {
      const d = dateOf(p.x);
      return d && d >= from;
    });
    return win.length >= 2 ? win : all.slice(-2);
  }, [s.points, range]);
  return (
    <>
      <div className="sxb-section-top">
        <div>
          <Eyebrow>{s.eyebrow}</Eyebrow>
          <h2 className="sxb-section-title">{s.title}</h2>
          <p className="sxb-section-note">{s.note}</p>
        </div>
        <div className="sfx-ranges" role="group" aria-label="Chart range">
          {s.ranges.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              className="sfx-range"
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <LineChart
        categories={pts.map((p) => p.x)}
        series={[{ name: s.quote, values: pts.map((p) => p.y), tone: 'primary' }]}
        label={`${s.quote}, ${range}`}
        height={260}
        area
      />
      <p className="sfx-caption">
        {s.summary} {s.caption}
        <Cites ids={s.cites} sources={sources} />
      </p>
    </>
  );
}

export function FxInsights({ s, Cites, sources }) {
  return (
    <>
      <h2 className="sxb-mid-title">{s.title}</h2>
      <ol className="sfx-insights">
        {s.items.map((it, i) => (
          <li key={it.title} className="sfx-insight">
            <span className="sfx-num">{String(i + 1).padStart(2, '0')}</span>
            <h3>{it.title}</h3>
            <p>
              {it.text}
              <Cites ids={it.cites} sources={sources} />
            </p>
          </li>
        ))}
      </ol>
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

const PRESSURE = { established: 'established', limited: 'limited', not_established: 'not established' };

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

export function FxPolicy({ s, Cites, sources }) {
  return (
    <>
      <Eyebrow>{s.eyebrow}</Eyebrow>
      <h2 className="sxb-section-title">{s.title}</h2>
      <LineChart
        categories={s.categories}
        series={s.series}
        unit={s.unit}
        label={s.title}
        height={220}
      />
      <p className="sfx-caption">
        {s.caption}
        <Cites ids={s.cites} sources={sources} />
      </p>
    </>
  );
}

export function FxBuffers({ s, Cites, sources }) {
  return (
    <>
      <Eyebrow>{s.eyebrow}</Eyebrow>
      <h2 className="sxb-section-title">{s.title}</h2>
      {s.panels.map((p) => (
        <div key={p.id} className="sfx-panel">
          <p className="sfx-panel-label">{p.label}</p>
          <p className="sfx-panel-figure">
            <span className="sfx-panel-value">{p.latest}</span>
            {p.change ? <span className="sfx-panel-change">{p.change}</span> : null}
            {FRESH[p.freshness] ? <span className="sfx-aged">{FRESH[p.freshness]}</span> : null}
            <Cites ids={p.cites} sources={sources} />
          </p>
          <LineChart
            categories={p.points.map((x) => x.x)}
            series={[{ name: p.label, values: p.points.map((x) => x.y), tone: 'primary' }]}
            label={p.label}
            height={130}
            endLabels={false}
          />
        </div>
      ))}
      <p className="sfx-caption">{s.caption}</p>
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
