'use client';

/**
 * SonarAdaptiveReport (Nov 16, 2026): the page for an adaptive research
 * report (src/lib/sonar/adaptive). A report is an ordered list of typed
 * sections chosen for the question; this component draws them in that order
 * with one renderer per type. It decides nothing: which sections exist and
 * which comes first was settled by the layout planner from the evidence.
 *
 * Same shell and visual language as the exemplary brief (the sxb- styles):
 * the question and Ping, an anchor row built from the sections present, flat
 * sections on hairlines, sources, a follow-up field. Different questions get
 * different sections, not a different design.
 *
 * report       the validated report from /api/sonar/landing-query
 * onPing(q)    a new question from the top field
 * onFollowUp(q, extra, thread)  a follow-up, with the thread it is asked in
 * onDeep()     deep research on this question (optional)
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { followUpContext } from '@/lib/sonar/workspace';
import { SonarSkeleton } from '../SonarSkeleton';
import SonarExemplaryChart, { dayLabel } from '../exemplary/SonarExemplaryChart';
import SonarTechnicalChart from './SonarTechnicalChart';
import SonarSeriesChart from './SonarSeriesChart';
import {
  KpiStrip,
  MarketComparison,
  HormuzFlows,
  Transmission,
  UsImpact,
  GoldMarkets,
  GeoPair,
  ScenarioTable,
  EventTimeline,
} from './SonarGeoSections';
import {
  ExDefinitions,
  ExEquations,
  ExMeasures,
  ExDiagram,
  ExMethod,
  ExSources,
} from './SonarExplainerSections';
import {
  FxLeadBrief,
  CountryPressureOverview,
  FxFindings,
  EvidenceCoverageGrid,
  FxCharts,
  PressureTransmissionFlow,
  CountryHistoricalAnchorChart,
  CountryIndicatorTable,
  FxDrivers,
  FxRiskScope,
  FxMonitor,
  FxOutlook,
  FxConclusion,
  FxPair,
} from './SonarFxSections';
import { SonarSaveActions } from '../SonarSaveActions';
import { useSessionThread } from '../session-thread';
import '../exemplary/sonar-exemplary-brief.css';
import './sonar-adaptive.css';

const pad2 = (n) => String(n).padStart(2, '0');

const ANCHOR_LABELS = {
  verified_event_status: 'Status',
  ohlcv_technical: 'Chart',
  key_findings: 'Takeaways',
  metric_table: 'Readings',
  impact_network: 'Exposure',
  valuation: 'Peers',
  ranking: 'Table',
  data_table: 'Detail',
  series_chart: 'Chart',
  sector_exposure: 'Breakdown',
  policy_tracker: 'Policy',
  macro_timeseries: 'Series',
  catalyst_calendar: 'Calendar',
  heatmap: 'Returns',
  portfolio_attribution: 'Fund',
  risk: 'Risks',
  fundamentals: 'Baseline',
  forecast_market: 'Markets',
  candidate_table: 'Candidates',
  news_timeline: 'Reporting',
  scenario_matrix: 'Scenarios',
  price_comparison: 'Market context',
  watchpoints: 'Monitor',
  sources: 'Sources',
  /* Geo-economic impact. */
  market_comparison: 'Oil & shipping',
  economic_transmission: 'U.S. economy',
  us_impact: 'U.S. economy',
  gold_markets: 'Gold & markets',
  hormuz_flows: 'Global trade',
  scenario_table: 'Scenarios',
  event_timeline: 'Timeline',
  /* Currency pressure (fx-pressure-v3). Tabs come from the sections rendered. */
  fx_findings: 'Key findings',
  fx_evidence: 'Evidence',
  fx_charts: 'Charts',
  fx_flow: 'Transmission',
  fx_anchor: 'Long-run view',
  fx_indicators: 'Indicators',
  fx_risk_scope: 'Risk signals',
  fx_monitor: 'Risk signals',
  /* Financial explainer (family 08). */
  ex_definitions: 'Definitions',
  ex_equations: 'Formulas',
  ex_measures: 'Interpretation',
  ex_method: 'Methods',
};

/* Sections that span the canvas: never squeezed into the top zone beside the controls. */
const WIDE = new Set([
  'kpi_strip',
  'market_comparison',
  'hormuz_flows',
  'economic_transmission',
  'us_impact',
  'gold_markets',
  'scenario_table',
  'event_timeline',
  'fx_overview',
  'fx_findings',
  'fx_evidence',
  'fx_charts',
  'fx_flow',
  'fx_anchor',
  'fx_indicators',
  'fx_drivers',
  'fx_risk_scope',
  'fx_monitor',
  'fx_outlook',
  'fx_conclusion',
  'ex_definitions',
  'ex_equations',
  'ex_measures',
  'ex_diagram',
  'ex_method',
  'ex_sources',
]);
/* Neighbours drawn side by side, whichever comes first; `wide` gives the first more room. */
const PAIR_OF = {
  us_impact: 'gold_markets',
  gold_markets: 'us_impact',
  fx_drivers: 'fx_risk_scope',
  fx_risk_scope: 'fx_drivers',
  fx_monitor: 'fx_outlook',
  fx_outlook: 'fx_monitor',
  ex_definitions: 'ex_equations',
  ex_equations: 'ex_definitions',
  ex_measures: 'ex_diagram',
  ex_diagram: 'ex_measures',
};
const PAIR_WIDE = new Set(['fx_drivers', 'fx_monitor']);

/* Nov 21: which answer section (lib/sonar/answer-sections) each section type belongs to,
   for the skeleton's contents menu. Only the five open sections are mapped. */
const SKELETON_KEY = {
  kpi_strip: 'metrics',
  metric_table: 'metrics',
  fx_overview: 'metrics',
  fx_indicators: 'metrics',
  fundamentals: 'metrics',
  valuation: 'metrics',
  key_findings: 'findings',
  fx_findings: 'findings',
  risk: 'findings',
  fx_drivers: 'findings',
  ex_definitions: 'findings',
  series_chart: 'charts',
  price_comparison: 'charts',
  ohlcv_technical: 'charts',
  fx_charts: 'charts',
  fx_anchor: 'charts',
  market_comparison: 'charts',
  data_table: 'charts',
  ranking: 'charts',
  macro_timeseries: 'charts',
  heatmap: 'charts',
  ex_diagram: 'charts',
  sources: 'sources',
  fx_evidence: 'sources',
  ex_sources: 'sources',
};

const CLASS_LABELS = {
  official: 'Official',
  reported: 'Reported',
  other: 'Other source',
  computed: 'Computed',
  dataset: 'Dataset',
};

function Cites({ ids, sources }) {
  const list = (ids || []).map((id) => sources.find((s) => s.id === id)).filter(Boolean);
  if (!list.length) return null;
  return (
    <span className="sxb-cites">
      {' ['}
      {list.map((src, i) => (
        <span key={src.id}>
          {i ? ', ' : ''}
          {src.url ? (
            <a href={src.url} target="_blank" rel="noopener noreferrer" title={src.title}>
              {src.id}
            </a>
          ) : (
            <a href="#sar-sources" title={src.title}>
              {src.id}
            </a>
          )}
        </span>
      ))}
      {']'}
    </span>
  );
}

/* ── one renderer per section type ── */

function EventStatus({ s, sources }) {
  return (
    <>
      <div className="sxb-section-top">
        <h2 className="sxb-section-title">Where things stand</h2>
        <p className="sxb-section-note">Checked {dayLabel(s.checkedAt)}</p>
      </div>
      <p className={`sar-status sar-status--${s.status}`}>
        <i
          className={`bi ${s.status === 'event_verified' || s.status === 'event_superseded' ? 'bi-check-lg' : 'bi-question-lg'}`}
          aria-hidden="true"
        />
        {s.statusLabel}
      </p>
      <p className="sar-prose">
        {s.summary}
        <Cites ids={s.cites} sources={sources} />
      </p>
      {s.facts?.length ? (
        <dl className="sar-facts">
          {s.facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </>
  );
}

function Markets({ s }) {
  return (
    <>
      <div className="sxb-section-top">
        <h2 className="sxb-section-title">{s.title}</h2>
        <p className="sxb-section-note">Venue-implied prices, not forecasts</p>
      </div>
      <div className="sxb-table-scroll">
        <table className="sxb-table sar-markets">
          <thead>
            <tr>
              <th scope="col">Contract</th>
              <th scope="col">Yes</th>
              <th scope="col">No</th>
              <th scope="col">Volume</th>
              <th scope="col">Closes</th>
              <th scope="col">Indexed</th>
            </tr>
          </thead>
          <tbody>
            {s.markets.map((m) => (
              <tr key={m.id}>
                <th scope="row">
                  <a href={m.url} target="_blank" rel="noopener noreferrer">
                    {m.question}
                  </a>
                  <span className="sxb-table-role">{m.venue}</span>
                  {m.lowLiquidity ? <span className="sar-flag">Thinly traded</span> : null}
                </th>
                <td className="sar-num">{m.yesPrice.toFixed(2)}</td>
                <td className="sar-num">{m.noPrice.toFixed(2)}</td>
                <td className="sar-num">
                  {m.volume == null
                    ? 'N/A'
                    : `${Math.round(m.volume).toLocaleString('en-US')} ${m.volumeUnit}`}
                </td>
                <td className="sar-num">{m.endDate ? dayLabel(m.endDate) : 'N/A'}</td>
                <td className="sar-num">
                  {m.freshness === 'stale' ? 'Stale, ' : 'Latest indexed, '}
                  {dayLabel(m.indexedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sxb-footnote">{s.note}</p>
    </>
  );
}

function Candidates({ s, sources }) {
  return (
    <>
      <div className="sxb-section-top">
        <h2 className="sxb-section-title">{s.title}</h2>
        <p className="sxb-section-note">{s.note}</p>
      </div>
      {s.rows.length ? (
        <div className="sxb-table-scroll">
          <table className="sxb-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Current role</th>
                <th scope="col">Why named</th>
                <th scope="col">Basis</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r) => (
                <tr key={r.name}>
                  <th scope="row">{r.name}</th>
                  <td>{r.role}</td>
                  <td>
                    {r.reason}
                    <Cites ids={r.cites} sources={sources} />
                    {r.caveat ? <span className="sar-caveat"> {r.caveat}</span> : null}
                  </td>
                  <td className={r.basis === 'board_confirmed' ? 'sxb-table-confirmed' : undefined}>
                    {r.basisLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="sar-empty">{s.emptyText}</p>
      )}
    </>
  );
}

function Timeline({ s, sources }) {
  return (
    <>
      <div className="sxb-section-top">
        <h2 className="sxb-section-title">{s.title}</h2>
        {s.note ? <p className="sxb-section-note">{s.note}</p> : null}
      </div>
      <div className="sar-timeline">
        {s.items.map((e) => (
          <div key={`${e.date}-${e.title}`} className="sxb-event">
            <time dateTime={e.date || undefined}>{e.date ? dayLabel(e.date) : 'Undated'}</time>
            <div>
              <h3>
                {e.url ? (
                  <a href={e.url} target="_blank" rel="noopener noreferrer">
                    {e.title}
                  </a>
                ) : (
                  e.title
                )}
              </h3>
              <p>
                {e.text ? `${e.text} ` : ''}
                <span className="sar-src">
                  {CLASS_LABELS[e.sourceClass] || 'Source'} &middot; {e.publisher}
                  {e.corroboration > 1 ? ` and ${e.corroboration - 1} more` : ''}
                </span>
                <Cites ids={e.cites} sources={sources} />
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Scenarios({ s }) {
  return (
    <>
      <div className="sxb-section-top">
        <h2 className="sxb-section-title">{s.title}</h2>
        <p className="sxb-section-note">{s.label}</p>
      </div>
      <div className="sxb-findings sar-scenarios">
        {s.rows.map((r, i) => (
          <article key={r.title} className="sxb-finding">
            <p className="sxb-finding-count">{r.kicker || `Scenario ${pad2(i + 1)}`}</p>
            <h3>{r.title}</h3>
            <p>{r.text}</p>
          </article>
        ))}
      </div>
    </>
  );
}

function Metrics({ s, sources }) {
  return (
    <>
      <div className="sxb-section-top">
        <h2 className="sxb-section-title">{s.title}</h2>
        <p className="sxb-section-note">
          As of {dayLabel(s.asOf)}
          <Cites ids={s.cites} sources={sources} />
        </p>
      </div>
      <div className="sxb-table-scroll">
        <table className="sxb-table sar-metrics">
          <thead>
            <tr>
              <th scope="col">Measure</th>
              <th scope="col">Value</th>
              <th scope="col">Reading</th>
              <th scope="col">How it is computed</th>
            </tr>
          </thead>
          <tbody>
            {s.rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td className="sar-num">{r.value}</td>
                <td>{r.note}</td>
                <td className="sar-method">{r.method || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Findings({ s, sources }) {
  return (
    <>
      <div className="sxb-section-top">
        <h2 className="sxb-section-title">{s.title}</h2>
        {s.label ? <p className="sxb-section-note">{s.label}</p> : null}
      </div>
      <div className={`sxb-findings${s.items.length > 3 ? ' sar-findings--wrap' : ''}`}>
        {s.items.map((f, i) => (
          <article key={`${f.title}-${f.kicker || i}`} className="sxb-finding">
            <p className="sxb-finding-count">{f.kicker || pad2(i + 1)}</p>
            <h3>{f.title}</h3>
            <p>
              {f.text}
              <Cites ids={f.cites} sources={sources} />
              {f.note ? <span className="sxb-finding-note"> {f.note}</span> : null}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}

function Impact({ s, sources }) {
  return (
    <>
      <div className="sxb-section-top">
        <h2 className="sxb-section-title">{s.title}</h2>
        {s.note ? <p className="sxb-section-note">{s.note}</p> : null}
      </div>
      <div className="sxb-table-scroll">
        <table className="sxb-table">
          <thead>
            <tr>
              {(
                s.columns || [
                  'Exposure',
                  'Transmission channel',
                  'Evidence that would matter',
                  'Current assessment',
                ]
              ).map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s.rows.map((r) => (
              <tr key={`${r.name}-${r.tag}`}>
                <th scope="row">
                  {r.name} <span className="sxb-table-role">{r.tag}</span>
                </th>
                <td>{r.channel}</td>
                <td>{r.evidence}</td>
                <td className={r.assessment === 'confirmed' ? 'sxb-table-confirmed' : undefined}>
                  {r.assessmentLabel}
                  <Cites ids={r.cites} sources={sources} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Baseline({ s, sources }) {
  return (
    <>
      <div className="sxb-section-top">
        <h2 className="sxb-section-title">{s.title}</h2>
      </div>
      <dl className="sxb-kpis">
        {s.items.map((c) => (
          <div key={c.label} className="sxb-kpi">
            <dt>{c.label}</dt>
            <dd>
              <strong>{c.value}</strong>
              <span>
                {c.sub}
                <Cites ids={c.cites} sources={sources} />
              </span>
            </dd>
          </div>
        ))}
      </dl>
      {s.note ? <p className="sxb-footnote">{s.note}</p> : null}
    </>
  );
}

function DataTable({ s, sources }) {
  /* A ranking can be re-sorted by the reader; the values sorted on are the typed ones the
     report carries beside each formatted cell. */
  const [sort, setSort] = useState(null);
  const rows = useMemo(() => {
    if (!s.sortable || !sort) return s.rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...s.rows].sort((x, y) => {
      const a = x.sort?.[sort.key];
      const b = y.sort?.[sort.key];
      if (typeof a === 'number' && typeof b === 'number') return (a - b) * dir;
      return String(a ?? '').localeCompare(String(b ?? '')) * dir;
    });
  }, [s.rows, s.sortable, sort]);
  const toggle = (key) =>
    setSort((cur) =>
      cur?.key === key ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' },
    );
  return (
    <>
      <div className="sxb-section-top">
        <h2 className="sxb-section-title">{s.title}</h2>
        <p className="sxb-section-note">
          {s.note}
          <Cites ids={s.cites} sources={sources} />
        </p>
      </div>
      <div className="sxb-table-scroll">
        <table className="sxb-table sar-data">
          <thead>
            <tr>
              {s.columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={c.num ? 'sar-num' : undefined}
                  aria-sort={
                    s.sortable
                      ? sort?.key === c.key
                        ? sort.dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                >
                  {s.sortable ? (
                    <button type="button" onClick={() => toggle(c.key)}>
                      {c.label}
                      {sort?.key === c.key ? (
                        <i
                          className={`bi ${sort.dir === 'asc' ? 'bi-arrow-up-short' : 'bi-arrow-down-short'}`}
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={
                  r.emphasis ? 'sar-row--subject' : r.summary ? 'sar-row--summary' : undefined
                }
              >
                {s.columns.map((c, i) =>
                  i === 0 ? (
                    <th key={c.key} scope="row" className={c.num ? 'sar-num' : undefined}>
                      {r.cells[c.key]}
                    </th>
                  ) : (
                    <td key={c.key} className={c.num ? 'sar-num' : undefined}>
                      {r.cells[c.key]}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SeriesChart({ s, sources }) {
  return (
    <>
      <div className="sxb-section-top">
        <h2 className="sxb-section-title">{s.title}</h2>
        <p className="sxb-section-note">
          {s.note}
          <Cites ids={s.cites} sources={sources} />
        </p>
      </div>
      <SonarSeriesChart section={s} />
    </>
  );
}

function ListBlock({ title, items }) {
  return (
    <>
      <h2 className="sxb-mid-title">{title}</h2>
      <ol className="sxb-watch">
        {items.map((w, i) => (
          <li key={w}>
            <span aria-hidden="true">{pad2(i + 1)}</span>
            {w}
          </li>
        ))}
      </ol>
    </>
  );
}

function Sources({ sources }) {
  return (
    <>
      <h2 className="sxb-mid-title">Evidence and sources</h2>
      <ul className="sxb-sources">
        {sources.map((src) => (
          <li key={src.id}>
            <span className="sxb-source-id">{src.id}</span>
            <div>
              <p className="sxb-source-title">{src.title}</p>
              <p className="sxb-source-detail">
                {[
                  CLASS_LABELS[src.sourceClass],
                  src.publisher,
                  src.detail,
                  src.date ? dayLabel(src.date) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            {src.url ? (
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${src.title} in a new tab`}
              >
                Open
                <i className="bi bi-arrow-up-right" aria-hidden="true" />
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}

const SESSION_MODE = { quick: 'Quick ping', standard: 'Standard research', deep: 'Deep research' };
const clock = (t) =>
  new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(t));

/**
 * report      the validated report
 * onPing      a new question from the answer's own field
 * onFollowUp  a follow-up asked under this answer (carries its thread)
 * streaming   true while the report is drawn from a stream (Save and follow-ups wait)
 * onDeep      run deep research on the question
 * onRestore   show an earlier answer from this session again (no request)
 * sessionId   this answer's entry in the session thread
 * actions     replaces the Save control (a saved copy brings its own)
 */
export default function SonarAdaptiveReport({
  report,
  onPing,
  onFollowUp,
  onDeep = null,
  onRestore = null,
  sessionId = null,
  actions = null,
  /* Nov 21: a question with Build or photo context from the skeleton's composer. */
  onResearch = null,
  /* Nov 17: drawn from a stream's validated sections while the rest arrive. Save and
     follow-ups wait for the final report. */
  streaming = false,
}) {
  const session = useSessionThread();
  const { sections, sources } = report;
  const lead = sections.find((s) => s.type === 'lead');
  const follow = sections.find((s) => s.type === 'followups');
  const body = sections.filter((s) => s.type !== 'lead' && s.type !== 'followups');
  /* The first findings block, for the lead's "View key findings" link. */
  const findingsAnchor =
    body.find((s) => ['fx_findings', 'key_findings'].includes(s.type))?.type || null;
  /* An executor may name the sections that belong in the top zone (fx-pressure: the four
     figures and the currency chart); otherwise the first narrow section sits there. */
  const flagged = body.filter((s) => s.top);
  const topSections = flagged.length
    ? flagged
    : body[0] && !WIDE.has(body[0].type)
      ? [body[0]]
      : [];
  const rest = body.filter((s) => !topSections.includes(s));
  /* Nov 21: the skeleton's contents menu: each section type maps to one answer section, and
     the first block of each carries its anchor (sa-<key>). */
  const firstOf = new Map();
  for (const s of [...topSections, ...rest]) {
    const k = SKELETON_KEY[s.type];
    if (!k || firstOf.has(k)) continue;
    if (s.type === 'sources' && !sources.length) continue;
    firstOf.set(k, s.type);
  }
  const present = ['answer', ...firstOf.keys()];
  const [followUp, setFollowUp] = useState('');
  const rootRef = useRef(null);
  const fId = useId();

  useEffect(() => {
    document.body.classList.add('sonar-exemplary-active');
    return () => document.body.classList.remove('sonar-exemplary-active');
  }, []);

  const ask = (text) => {
    const q = String(text || '')
      .trim()
      .slice(0, 600);
    if (!q) return;
    const t = report.thread || {};
    const context = followUpContext({
      question: t.question || report.resolvedQuestion,
      headline: t.headline || lead?.headline,
      summary: t.summary || lead?.text,
      subject: t.subject || null,
      ticker: t.ticker || null,
    });
    onFollowUp?.(
      q,
      { followUp: { context } },
      { ...context, person: t.person || null, event: t.event || null, fx: t.fx || null },
    );
  };

  /* Save Research: the answer exactly as shown, through the same route and the same Saved
     Research pages as every other Sonar answer. The whole report rides in the snapshot, so a
     saved copy reopens in this layout; the summary fields feed the list and the share page. */
  const getSave = () => {
    const t = report.thread || {};
    return {
      kind: 'ping',
      question: report.resolvedQuestion || report.question,
      subject: t.subject || t.person || null,
      ticker: t.ticker || null,
      depth: 'quick',
      controls: report.controls || undefined,
      snapshot: {
        question: report.resolvedQuestion || report.question,
        headline: lead?.headline || null,
        summary: lead?.text || '',
        subject: t.subject || t.person || null,
        depth: 'quick',
        answeredAt: report.asOf,
        sources: sources.map((x) => ({ name: x.title, url: x.url || null })),
        takeaways: [],
        adaptive: report,
      },
    };
  };

  const render = (s) => {
    switch (s.type) {
      case 'verified_event_status':
        return <EventStatus s={s} sources={sources} />;
      case 'forecast_market':
        return <Markets s={s} />;
      case 'candidate_table':
        return <Candidates s={s} sources={sources} />;
      case 'news_timeline':
        return <Timeline s={s} sources={sources} />;
      case 'scenario_matrix':
        return <Scenarios s={s} />;
      case 'ohlcv_technical':
        return <SonarTechnicalChart section={s} />;
      case 'metric_table':
        return <Metrics s={s} sources={sources} />;
      case 'price_comparison':
        return <SonarExemplaryChart chart={s.chart} />;
      case 'key_findings':
      case 'risk':
        return <Findings s={s} sources={sources} />;
      case 'valuation':
      case 'ranking':
      case 'data_table':
      case 'sector_exposure':
      case 'policy_tracker':
      case 'macro_timeseries':
      case 'catalyst_calendar':
      case 'heatmap':
      case 'portfolio_attribution':
        return <DataTable s={s} sources={sources} />;
      case 'series_chart':
        return <SeriesChart s={s} sources={sources} />;
      case 'impact_network':
        return <Impact s={s} sources={sources} />;
      case 'fundamentals':
        return <Baseline s={s} sources={sources} />;
      case 'watchpoints':
        return <ListBlock title={s.title} items={s.items} />;
      case 'limitations':
        return (
          <>
            <h2 className="sxb-mid-title">Limits of this answer</h2>
            <ul className="sar-limits">
              {s.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </>
        );
      case 'sources':
        return sources.length ? <Sources sources={sources} /> : null;
      case 'kpi_strip':
        return <KpiStrip s={s} sources={sources} Cites={Cites} />;
      case 'market_comparison':
        return <MarketComparison s={s} sources={sources} Cites={Cites} />;
      case 'hormuz_flows':
        return <HormuzFlows s={s} sources={sources} Cites={Cites} />;
      case 'economic_transmission':
        return <Transmission s={s} sources={sources} Cites={Cites} />;
      case 'us_impact':
        return <UsImpact s={s} sources={sources} Cites={Cites} />;
      case 'gold_markets':
        return <GoldMarkets s={s} sources={sources} Cites={Cites} />;
      case 'scenario_table':
        return <ScenarioTable s={s} />;
      case 'event_timeline':
        return <EventTimeline s={s} sources={sources} Cites={Cites} />;
      case 'fx_overview':
        return <CountryPressureOverview s={s} sources={sources} Cites={Cites} />;
      case 'fx_findings':
        return <FxFindings s={s} sources={sources} Cites={Cites} />;
      case 'fx_evidence':
        return <EvidenceCoverageGrid s={s} />;
      case 'fx_charts':
        return <FxCharts s={s} sources={sources} Cites={Cites} />;
      case 'fx_flow':
        return <PressureTransmissionFlow s={s} />;
      case 'fx_anchor':
        return <CountryHistoricalAnchorChart s={s} sources={sources} Cites={Cites} />;
      case 'fx_indicators':
        return <CountryIndicatorTable s={s} />;
      case 'fx_drivers':
        return <FxDrivers s={s} sources={sources} Cites={Cites} />;
      case 'fx_risk_scope':
        return <FxRiskScope s={s} />;
      case 'fx_monitor':
        return <FxMonitor s={s} />;
      case 'fx_outlook':
        return <FxOutlook s={s} />;
      case 'fx_conclusion':
        return <FxConclusion s={s} />;
      case 'ex_definitions':
        return <ExDefinitions s={s} />;
      case 'ex_equations':
        return <ExEquations s={s} />;
      case 'ex_measures':
        return <ExMeasures s={s} />;
      case 'ex_diagram':
        return <ExDiagram s={s} />;
      case 'ex_method':
        return <ExMethod s={s} />;
      case 'ex_sources':
        return <ExSources s={s} />;
      default:
        return null;
    }
  };

  /* The first section sits beside Research Controls, under the lead, so the top zone is
     filled by the answer and not by empty space. */
  const block = (s) => {
    const content = render(s);
    if (!content) return null;
    return (
      <section
        key={s.type}
        className={`sxb-block sar-block sar-block--${s.type}${s.secondary ? ' sar-block--secondary' : ''}`}
        id={`sar-${s.type}`}
        data-anchor={ANCHOR_LABELS[s.type] ? s.type : undefined}
      >
        {firstOf.get(SKELETON_KEY[s.type]) === s.type ? (
          <span id={`sa-${SKELETON_KEY[s.type]}`} className="sar-sa" aria-hidden="true" />
        ) : null}
        {content}
      </section>
    );
  };

  return (
    <SonarSkeleton
      question={report.resolvedQuestion || report.question}
      onPing={onPing}
      onResearch={onResearch}
      followUps={follow && !streaming ? follow.related : []}
      onAsk={ask}
      sources={sources}
      present={present}
      kind={report.thread?.fx ? 'country' : report.thread?.ticker ? 'company' : null}
      subject={report.thread?.subject || report.thread?.person || null}
      onDeep={onDeep}
    >
      <div
        className="sxb sar"
        ref={rootRef}
        data-scenario={report.scenario?.key}
        data-family={report.presentation?.presentationFamily || undefined}
      >
        {/* The answer template's top zone: the lead on the left, Research Controls on the right. */}
        <div className="sxb-top sxb-top--solo">
          <div className="sxb-top-main">
            <span id="sa-answer" className="sar-sa" aria-hidden="true" />
            <header className="sxb-hero" id="sar-overview" data-anchor="overview">
              {lead.kicker || lead.asOf || report.presentation?.familyLabel ? (
                <div className="sar-kicker-row">
                  {lead.kicker || report.presentation?.familyLabel ? (
                    <p className="sxb-kicker">{lead.kicker || report.presentation.familyLabel}</p>
                  ) : (
                    <span />
                  )}
                  {lead.asOf ? <p className="sar-asof">{lead.asOf}</p> : null}
                </div>
              ) : null}
              <h1>{lead.headline}</h1>
              {lead.verdict ? <p className="sar-verdict">{lead.verdict}</p> : null}
              <p className="sxb-deck">
                {lead.text}
                <Cites ids={lead.cites} sources={sources} />
              </p>
              <FxLeadBrief lead={lead} />
              {/* The lead's own links: to the findings and to the sources, when they exist. */}
              {findingsAnchor || sources.length ? (
                <p className="sar-leadlinks">
                  {findingsAnchor ? <a href={`#sar-${findingsAnchor}`}>View key findings</a> : null}
                  {sources.length ? <a href="#sar-sources">View sources</a> : null}
                </p>
              ) : null}
              {lead.core ? (
                <p className="sgeo-core">
                  <span>Core finding</span>
                  {lead.core}
                </p>
              ) : null}
              <p className="sxb-provenance">
                <span>
                  <i className="sxb-dot" aria-hidden="true" />
                  {report.scenario.label}
                </span>
                <span>Research as of {dayLabel(report.asOf)}</span>
                {report.org ? (
                  <span>From your organization’s records, visible to you as a member</span>
                ) : null}
                {streaming ? (
                  <span className="sar-streaming" role="status">
                    Adding verified sections
                  </span>
                ) : null}
                {lead.computed ? <span>Figures computed from the records cited</span> : null}
                {report.degraded?.includes('live_research') ? (
                  <span>Verification did not complete</span>
                ) : null}
                {report.controls?.labels?.length ? (
                  <span>Controls: {report.controls.labels.join(', ')}</span>
                ) : null}
                {sources.length ? (
                  <a href="#sar-sources" className="sxb-provenance-sources">
                    {sources.length} {sources.length === 1 ? 'source' : 'sources'} cited
                  </a>
                ) : null}
              </p>
              <div className="sar-actions">
                {/* Organization research is not offered for saving to personal research. */}
                {report.org || streaming
                  ? null
                  : actions || (
                      <SonarSaveActions
                        getSave={getSave}
                        question={report.resolvedQuestion || report.question}
                      />
                    )}
              </div>
            </header>
            {topSections.map((t) => block(t))}
          </div>
        </div>

        {rest.map((sec, i) => {
          /* The economy and gold side by side when they are neighbours. */
          const next = rest[i + 1];
          const prev = rest[i - 1];
          if (next && PAIR_OF[sec.type] === next.type) {
            const Pair =
              sec.type.startsWith('fx_') || sec.type.startsWith('ex_') ? FxPair : GeoPair;
            return (
              <Pair key={`pair-${sec.type}`} wide={PAIR_WIDE.has(sec.type)}>
                {block(sec)}
                {block(next)}
              </Pair>
            );
          }
          if (prev && PAIR_OF[prev.type] === sec.type) return null;
          return block(sec);
        })}

        <div
          className={`sar-closing${onRestore && session.length >= 2 && follow && !streaming ? ' is-pair' : ''}`}
        >
          {onRestore && session.length >= 2 ? (
            <section className="sxb-block sar-session" aria-labelledby="sar-session-h">
              <h2 className="sxb-mid-title" id="sar-session-h">
                In this session
              </h2>
              <ul className="sar-session-list">
                {session.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className="sar-session-item"
                      aria-current={t.id === sessionId ? 'true' : undefined}
                      onClick={() => onRestore(t)}
                    >
                      <span className="sar-session-q">{t.headline || t.question}</span>
                      <span className="sar-session-meta">
                        {SESSION_MODE[t.mode] || ''} &middot; {clock(t.at)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {follow && !streaming ? (
            <section className="sxb-block" aria-labelledby="sar-continue-h">
              <h2 className="sxb-mid-title" id="sar-continue-h">
                Ask a follow-up
              </h2>
              <form
                className="sxb-followup"
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(followUp);
                }}
              >
                <label htmlFor={fId} className="sxb-sr">
                  Ask a follow-up
                </label>
                <input
                  id={fId}
                  type="text"
                  autoComplete="off"
                  maxLength={600}
                  value={followUp}
                  placeholder={follow.placeholder}
                  onChange={(e) => setFollowUp(e.target.value)}
                />
                <button type="submit" className="sxb-ask" disabled={!followUp.trim()}>
                  Ask
                  <i className="bi bi-arrow-up-right" aria-hidden="true" />
                </button>
              </form>
            </section>
          ) : null}
        </div>

        <footer className="sxb-foot">
          <span>Ezana Sonar &middot; Evidence-led financial research</span>
          <span>
            {onDeep ? (
              <>
                <button type="button" className="sxb-foot-deep" onClick={onDeep}>
                  Run deep research on this question
                </button>{' '}
                &middot;{' '}
              </>
            ) : null}
            Findings only, not investment advice
          </span>
        </footer>
      </div>
    </SonarSkeleton>
  );
}
