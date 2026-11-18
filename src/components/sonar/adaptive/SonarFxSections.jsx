'use client';

/**
 * Sonar adaptive research: the currency-pressure blocks (Nov 17, 2026). View model
 * fx-pressure-v3, built by lib/sonar/adaptive/fx-pressure.js and checked by the report schema.
 *
 * Executive answer
 *   FxLeadBrief           "See full reading": the longer reading, why-it-matters bullets
 *                         (supported / interpretation / cannot conclude) and driver chips
 *   FxNextSteps           the light Next steps block under Research Controls
 * Opening analytical row (fx_overview, beside the rail)
 *   CountryFxRiskCard     country, currency, pressure status, four dated KPIs with trends
 *   PressureBreakdownCard each component's level and the interpretive note
 *   SourcesBriefCard      the evidence count and the leading datasets, linked to the list
 * Narrative and analysis
 *   KeyFindingCards       (fx_findings) four numbered findings; evidence, meaning and why
 *                         open under each
 *   VisualizationGrid     (fx_charts) the four charts, one SonarResearchChart system
 *   PressureTransmissionDiagram (fx_flow)
 *   CountryKeyChart       (fx_anchor) the signature long-run chart, full width
 *   CountryIndicatorsTable (fx_indicators)
 *   EvidenceCoverageGrid  (fx_evidence) Ezana datasets beside the news around it
 *   FxDrivers / FxRiskScope / FxMonitor / FxOutlook / FxConclusion
 *
 * Every chart is SonarResearchChart: the home page comparison chart's language, stored
 * observations only. Branding guide: tokens only, page-scoped under .sfx-.
 */
import { useMemo, useState } from 'react';
import { CHART } from '@/lib/chart-theme';
import { CountryFlag } from '@/components/sonar/CountryFlag';
import { SonarResearchChart } from './SonarResearchChart';

const BASIS = { observed: 'Observed', derived: 'Derived', conceptual: 'Conceptual' };
const AVAIL = { in_data: 'In data', partial: 'Partial', gap: 'Data gap' };
const FRESH = { lagged: 'Lagged observation', stale: 'Stale observation' };
const BULLET = {
  supported: 'Supported by data',
  interpretation: 'Interpretation',
  cannot_conclude: 'Cannot yet conclude',
};
const sentence = (s) => (s ? `${String(s)[0].toUpperCase()}${String(s).slice(1)}` : '');
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const dateOf = (x) => {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(String(x || ''));
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, m[3] ? +m[3] : 1)) : null;
};

function Eyebrow({ children, icon = null }) {
  return children ? (
    <p className="sfx-eyebrow">
      {icon ? <i className={`bi ${icon}`} aria-hidden="true" /> : null}
      {children}
    </p>
  ) : null;
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

/* ------------------------------------------------------------------ executive answer */

/** "See full reading": the longer reading, the labelled lines and the driver chips. */
export function FxLeadBrief({ lead }) {
  if (!lead?.bullets?.length && !lead?.chips?.length && !lead?.reading) return null;
  return (
    <details className="sfx-reading-more">
      <summary>
        <i className="bi bi-caret-right-fill" aria-hidden="true" />
        See full reading
      </summary>
      <div className="sfx-brief">
        {lead.reading ? <p className="sfx-reading-text">{lead.reading}</p> : null}
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
          <div className="sfx-drivers-row">
            <span className="sfx-subeyebrow">What is driving this</span>
            <ul className="sfx-chips" aria-label="Core drivers">
              {lead.chips.map((c) => (
                <li key={c.id} className={`sfx-chip sfx-lvl--${c.level}`}>
                  {c.label}
                  <span className="sfx-chip-level">{sentence(c.level)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  );
}

/** Next steps under Research Controls: a follow-up, or deep research when offered. */
export function FxNextSteps({ steps, onAsk, onDeep }) {
  const usable = (steps || []).filter((st) => (st.action === 'deep' ? Boolean(onDeep) : st.q));
  if (!usable.length) return null;
  return (
    <section className="sfx-next" aria-labelledby="sfx-next-h">
      <p className="sfx-eyebrow" id="sfx-next-h">
        <i className="bi bi-signpost-split" aria-hidden="true" />
        Next steps
      </p>
      <ul>
        {usable.map((st) => (
          <li key={st.label}>
            <button
              type="button"
              className="sfx-next-item"
              onClick={() => (st.action === 'deep' ? onDeep() : onAsk(st.q))}
            >
              <i className={`bi ${st.icon || 'bi-arrow-right'}`} aria-hidden="true" />
              <span className="sfx-next-text">
                <span className="sfx-next-label">{st.label}</span>
                <span className="sfx-next-sub">{st.sub}</span>
              </span>
              <i className="bi bi-chevron-right sfx-next-go" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ opening analytical row */

function CountryFxRiskCard({ s, Cites, sources }) {
  return (
    <div className="sfx-card sfx-card--country">
      <Eyebrow icon="bi-layers">{s.eyebrow}</Eyebrow>
      <div className="sfx-ov-head">
        <div className="sfx-ov-id">
          <CountryFlag iso2={s.iso2} label={s.place} width={40} />
          <div>
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
              {FRESH[k.freshness] ? <span className="sfx-aged"> · {FRESH[k.freshness]}</span> : null}
              <Cites ids={k.cites} sources={sources} />
            </dd>
          </div>
        ))}
      </dl>
      {s.footnote ? <p className="sfx-footnote">{s.footnote}</p> : null}
    </div>
  );
}

function PressureBreakdownCard({ rows, note }) {
  if (!rows?.length) return null;
  return (
    <div className="sfx-card sfx-card--breakdown">
      <Eyebrow icon="bi-layers">Pressure breakdown</Eyebrow>
      <table className="sfx-table sfx-table--compact">
        <caption className="sxb-sr">Each component of the pressure reading and its level</caption>
        <thead>
          <tr>
            <th scope="col">Component</th>
            <th scope="col" className="is-end">
              Level
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <th scope="row">{r.label}</th>
              <td className="is-end">
                <span className={`sfx-level sfx-lvl--${r.id === 'crisis' ? 'scope' : r.level}`}>
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

function SourcesBriefCard({ brief }) {
  if (!brief?.items?.length) return null;
  return (
    <div className="sfx-card sfx-card--sources">
      <Eyebrow icon="bi-database">
        Evidence &amp; sources{brief.count ? ` (${brief.count})` : ''}
      </Eyebrow>
      <ul className="sfx-src-list">
        {brief.items.map((it) => (
          <li key={it.id} className="sfx-src">
            <span className="sfx-src-badge" aria-hidden="true">
              {it.badge}
            </span>
            <span className="sfx-src-text">
              <span className="sfx-src-title">{it.title}</span>
              <span className="sfx-src-sub">{it.sub}</span>
            </span>
          </li>
        ))}
      </ul>
      <a className="sfx-jump" href="#sar-fx_evidence">
        View all sources
        <i className="bi bi-arrow-right" aria-hidden="true" />
      </a>
    </div>
  );
}

export function CountryPressureOverview({ s, Cites, sources }) {
  return (
    <div className="sfx-topgrid">
      <CountryFxRiskCard s={s} Cites={Cites} sources={sources} />
      <PressureBreakdownCard rows={s.breakdown} note={s.breakdownNote} />
      <SourcesBriefCard brief={s.sourcesBrief} />
    </div>
  );
}

/* ------------------------------------------------------------------ key findings */

function KeyFindingCard({ f, n, Cites, sources }) {
  return (
    <li className="sfx-finding">
      <span className="sfx-finding-n" aria-hidden="true">
        {n}
      </span>
      <div className="sfx-finding-body">
        <div className="sfx-finding-top">
          <h3 className="sfx-finding-kicker">{f.title}</h3>
          {f.status ? (
            <span className={`sfx-tag sfx-status--${String(f.status).toLowerCase()}`}>
              {f.status}
            </span>
          ) : null}
        </div>
        <p className="sfx-finding-head">{f.headline}</p>
        <details className="sfx-finding-more">
          <summary>Evidence and reading</summary>
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
        </details>
        {f.chart ? (
          <a className="sfx-jump" href={`#sfx-chart-${f.chart}`}>
            <i className="bi bi-graph-up-arrow" aria-hidden="true" />
            See detailed chart
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </li>
  );
}

export function FxFindings({ s, Cites, sources }) {
  return (
    <>
      <Eyebrow icon="bi-bar-chart-line">{s.eyebrow}</Eyebrow>
      <ol className="sfx-findings">
        {s.items.map((f, i) => (
          <KeyFindingCard key={f.title} f={f} n={i + 1} Cites={Cites} sources={sources} />
        ))}
      </ol>
    </>
  );
}

/* ------------------------------------------------------------------ evidence */

export function EvidenceCoverageGrid({ s }) {
  return (
    <div className={`sfx-evidence${s.news?.length ? '' : ' is-single'}`}>
      <div className="sfx-card">
        <Eyebrow icon="bi-database">Evidence from Ezana datasets</Eyebrow>
        {s.datasets?.length ? (
          <ul className="sfx-datasets">
            {s.datasets.map((d) => (
              <li key={d.id} className="sfx-dataset">
                <span
                  className={`sfx-tag ${d.kind === 'markets' ? 'sfx-tag--partial' : 'sfx-tag--observed'}`}
                >
                  {d.chip}
                </span>
                <div>
                  <p className="sfx-dataset-title">{d.title}</p>
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
                {d.href ? (
                  <a className="sfx-open" href={d.href}>
                    Open
                    <i className="bi bi-arrow-up-right" aria-hidden="true" />
                    <span className="sxb-sr"> {d.title}</span>
                  </a>
                ) : (
                  <span aria-hidden="true" />
                )}
              </li>
            ))}
          </ul>
        ) : null}
        {s.macroSources?.length ? (
          <p className="sfx-caption">Official series: {s.macroSources.join(' · ')}.</p>
        ) : null}
      </div>
      {s.news?.length ? (
        <div className="sfx-card">
          <Eyebrow icon="bi-newspaper">The news around it</Eyebrow>
          <ul className="sfx-news">
            {s.news.map((n) => (
              <li key={n.url}>
                <a href={n.url} target="_blank" rel="noopener noreferrer">
                  <span className="sfx-news-title">{n.title}</span>
                  <span className="sfx-news-src">{n.source || new URL(n.url).hostname}</span>
                  <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                  <span className="sxb-sr"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ the four charts */

const RANGE_MONTHS = { '3M': 3, '1Y': 12, '3Y': 36, '5Y': 60 };
function sliceRange(points, range) {
  if (!range || !points.length) return points;
  const last = dateOf(points[points.length - 1].x);
  if (!last) return points;
  const from = new Date(
    Date.UTC(last.getUTCFullYear(), last.getUTCMonth() - (RANGE_MONTHS[range] || 12), last.getUTCDate()),
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
      v.series.map((s, i) => ({
        key: `${p.id}-${v.id}-${i}`,
        name: s.name,
        tone: s.tone === 'reference' ? 'reference' : 'lead',
        points: p.ranges ? sliceRange(s.points, range) : s.points,
      })),
    [p.id, p.ranges, v, range],
  );
  return (
    <div className="sfx-card sfx-panel" id={`sfx-chart-${p.id}`} tabIndex={-1}>
      <div className="sfx-panel-top">
        <h3 className="sfx-panel-title">{p.title}</h3>
        {p.latest ? (
          <span className="sfx-panel-latest">
            {p.latest}
            {FRESH[p.freshness] ? <span className="sfx-aged"> · {FRESH[p.freshness]}</span> : null}
          </span>
        ) : null}
      </div>
      <SonarResearchChart
        series={series}
        unit={v.unit}
        refLine={v.ref || null}
        zero={Boolean(v.zero)}
        ranges={p.ranges || null}
        range={range}
        onRange={setRange}
        views={p.views.length > 1 ? p.views.map((x) => ({ id: x.id, label: x.label })) : null}
        view={view}
        onView={(id) => id && setView(id)}
        height={210}
        label={`${p.title}, ${v.label}`}
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
      <Eyebrow icon="bi-bar-chart-line">{s.eyebrow}</Eyebrow>
      <div className={`sfx-panels sfx-panels--${s.panels.length}`}>
        {s.panels.map((p) => (
          <ResearchChartPanel key={p.id} p={p} Cites={Cites} sources={sources} />
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ how pressure can travel */

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
    <div className="sfx-card">
      <div className="sfx-card-top">
        <Eyebrow icon="bi-diagram-3">{s.eyebrow}</Eyebrow>
        <ul className="sfx-flow-legend" aria-label="Legend">
          {Object.entries(FLOW_KIND).map(([k, l]) => (
            <li key={k} className={`sfx-flow-key sfx-flow--${k}`}>
              {l}
            </li>
          ))}
        </ul>
      </div>
      <h2 className="sfx-card-title">{s.title}</h2>
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
    </div>
  );
}

/* ------------------------------------------------------------------ long-run chart and indicators */

export function CountryHistoricalAnchorChart({ s, Cites, sources }) {
  const [sel, setSel] = useState(s.defaultIndex || 0);
  const st = s.stories[sel] || s.stories[0];
  const series = useMemo(
    () => [{ key: `anchor-${st.slug}`, name: 'Actual', tone: 'lead', points: st.points }],
    [st],
  );
  return (
    <div className="sfx-card">
      <div className="sfx-card-top">
        <Eyebrow icon="bi-graph-up">{s.eyebrow}</Eyebrow>
        <span className="sfx-ov-asof">{s.place}</span>
      </div>
      <div className="sfx-tabs" role="group" aria-label="Indicator">
        {s.stories.map((x, i) => (
          <button
            key={x.slug}
            type="button"
            className="sfx-tab"
            aria-pressed={i === sel}
            onClick={() => setSel(i)}
            title={x.label}
          >
            {x.short}
          </button>
        ))}
      </div>
      <h2 className="sfx-card-title">{st.headline}</h2>
      <SonarResearchChart
        series={series}
        unit={st.percent ? '%' : 'number'}
        refLine={st.median != null ? { value: st.median, label: `${st.normYears}Y median` } : null}
        height={280}
        label={st.label}
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
    </div>
  );
}

export function CountryIndicatorTable({ s }) {
  return (
    <div className="sfx-card">
      <div className="sfx-card-top">
        <Eyebrow icon="bi-table">{s.eyebrow}</Eyebrow>
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
    </div>
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
