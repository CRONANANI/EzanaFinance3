'use client';

/**
 * Industry Layout (Sonar, Part C). Ten components over one registry:
 * the first six open, the last four collapsed. One cross-filter (stage,
 * state, business model) drives every component; active filters show as
 * chips. A component with no sourced rows shows its empty state naming the
 * source, as-of, scope and measure type it is waiting for. Figures render
 * only from registry rows with source_url and as_of; nothing is estimated.
 * Copy: findings only, never advice.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  BUSINESS_MODELS,
  KPI_METRICS,
  applyFilters,
  byDimension,
  chainLayout,
  elsewhereLine,
  geoScope,
  orderForGeo,
  currentMetrics,
  facilitiesByState,
  feedsOf,
  formatMetric,
  headline,
  incentivesByState,
  investmentPipeline,
  usdCompact,
} from '@/lib/sonar/industry-layout-model';
import { US_TILES } from './us-tiles';
import './industry-layout.css';

const FilterCtx = createContext(null);
const useFilter = () => useContext(FilterCtx);

function Source({ row }) {
  if (!row?.source_url) return null;
  return (
    <a className="ind-src" href={row.source_url} target="_blank" rel="noopener noreferrer">
      {row.source_name || 'Source'}
      {row.as_of ? ` · as of ${row.as_of}` : ''}
      <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
    </a>
  );
}

function Empty({ waitingFor }) {
  return (
    <div className="ind-empty" role="note">
      <p className="ind-empty-title">Not yet sourced for this industry</p>
      <p className="ind-empty-sub">{waitingFor}</p>
    </div>
  );
}

function Section({ id, icon, title, sub, open: openDefault, children }) {
  const [open, setOpen] = useState(openDefault);
  const bodyId = `ind-body-${id}`;
  return (
    <section className={`ind-sec${open ? ' is-open' : ''}`} aria-labelledby={`ind-h-${id}`}>
      <button
        type="button"
        className="ind-sec-head"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((o) => !o)}
      >
        <i className={`bi ${icon}`} aria-hidden="true" />
        <span className="ind-sec-title" id={`ind-h-${id}`}>
          {title}
        </span>
        {sub ? <span className="ind-sec-sub">{sub}</span> : null}
        <i
          className={`bi ${open ? 'bi-chevron-up' : 'bi-chevron-down'} ind-sec-caret`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div className="ind-sec-body" id={bodyId}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

/* 1. Overview KPI tiles */
function Overview({ metrics }) {
  const tiles = KPI_METRICS.map((k) => ({ ...k, row: headline(metrics, k.id) })).filter(
    (t) => t.row,
  );
  if (!tiles.length) {
    return (
      <Empty waitingFor="Headline figures (sales, share of global capacity, employment, R&D) from an industry association or statistical agency report, each with its as-of date, scope and measure type." />
    );
  }
  return (
    <div className="ind-kpis">
      {tiles.map((t) => (
        <div key={t.id} className="ind-kpi">
          <span className="ind-kpi-label">{t.label}</span>
          <span className="ind-kpi-value ind-mono">{formatMetric(t.row)}</span>
          <span className="ind-kpi-meta">
            {t.row.measure_type} · {t.row.scope}
            {t.row.period ? ` · ${t.row.period}` : ''}
          </span>
          <Source row={t.row} />
        </div>
      ))}
    </div>
  );
}

/* 2. Interactive value chain */
function ValueChain({ registry, companies }) {
  const { f, set } = useFilter();
  const { upstream, flow } = chainLayout(registry.stages, companies);
  const label = (id) => registry.stages.find((s) => s.id === id)?.label || id;
  const Node = ({ s }) => {
    const active = f.stage === s.id;
    const feeds = feedsOf(registry.links, s.id);
    return (
      <button
        type="button"
        className={`ind-node${active ? ' is-active' : ''}${s.is_upstream_input ? ' is-upstream' : ''}`}
        aria-pressed={active}
        onClick={() => set({ stage: active ? null : s.id })}
      >
        <span className="ind-node-label">{s.label}</span>
        <span className="ind-node-n ind-mono">
          {s.n} {s.n === 1 ? 'company' : 'companies'}
        </span>
        {feeds.length ? (
          <span className="ind-node-feeds">Feeds {feeds.map(label).join(', ')}</span>
        ) : null}
      </button>
    );
  };
  return (
    <div className="ind-chain">
      {upstream.length ? (
        <div className="ind-chain-row ind-chain-row--up" aria-label="Upstream inputs">
          <span className="ind-chain-tag">Upstream inputs</span>
          {upstream.map((s) => (
            <Node key={s.id} s={s} />
          ))}
        </div>
      ) : null}
      <ol className="ind-chain-row ind-chain-flow" aria-label="Value chain">
        {flow.map((s, i) => (
          <li key={s.id} className="ind-chain-step">
            <Node s={s} />
            {i < flow.length - 1 ? (
              <i className="bi bi-arrow-right ind-chain-arrow" aria-hidden="true" />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* 3. Company landscape */
function Companies({ registry, companies, scope }) {
  const { f, set } = useFilter();
  const home = scope?.code || null;
  const isHome = (c) => home && String(c.hq_country || '').toUpperCase() === home;
  const rows = orderForGeo(companies, home);
  const models = [
    ...new Set((registry.companies || []).map((c) => c.business_model).filter(Boolean)),
  ];
  const stageLabel = (id) => registry.stages.find((s) => s.id === id)?.label || '';
  return (
    <div>
      <div className="ind-chips" role="group" aria-label="Filter companies">
        {scope?.here?.length ? (
          <button
            type="button"
            className={`ind-chip${f.hq === home ? ' is-active' : ''}`}
            aria-pressed={f.hq === home}
            onClick={() => set({ hq: f.hq === home ? null : home })}
          >
            Headquartered in {scope.label}
          </button>
        ) : null}
        {models.map((m) => (
          <button
            key={m}
            type="button"
            className={`ind-chip${f.model === m ? ' is-active' : ''}`}
            aria-pressed={f.model === m}
            onClick={() => set({ model: f.model === m ? null : m })}
          >
            {BUSINESS_MODELS[m] || m}
          </button>
        ))}
      </div>
      {rows.length ? (
        <div className="ind-table-wrap">
          <table className="ind-table">
            <thead>
              <tr>
                <th scope="col">Company</th>
                <th scope="col">Stage</th>
                <th scope="col">Model</th>
                <th scope="col">HQ</th>
                <th scope="col">Filing</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={`${c.stage_id}:${c.ticker || c.company_name}`}
                  className={isHome(c) ? 'is-home' : undefined}
                >
                  <td>
                    {c.company_name}{' '}
                    {c.ticker ? <span className="ind-mono ind-dim">{c.ticker}</span> : null}
                  </td>
                  <td>{stageLabel(c.stage_id)}</td>
                  <td>{BUSINESS_MODELS[c.business_model] || c.business_model}</td>
                  <td className="ind-mono">{c.hq_country || ''}</td>
                  <td>
                    {c.source_url ? (
                      <a
                        href={c.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ind-src"
                      >
                        Filings
                        <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty waitingFor="No registry companies match these filters." />
      )}
    </div>
  );
}

/* 4. Facility map: a US state tile grid, counts per state. */
function FacilityMap({ facilities }) {
  const { f, set } = useFilter();
  const counts = facilitiesByState(facilities);
  const incentives = incentivesByState(facilities);
  if (!facilities.length) {
    return (
      <Empty waitingFor="Facility locations, status and activity from company 10-K and 8-K filings and CHIPS award records, each with a source link and as-of date." />
    );
  }
  const max = Math.max(1, ...Object.values(counts));
  return (
    <div className="ind-map-wrap">
      <svg className="ind-map" viewBox="0 0 12 8" role="group" aria-label="Facilities by state">
        {US_TILES.map(([code, x, y]) => {
          const n = counts[code] || 0;
          const active = f.state === code;
          return (
            <g
              key={code}
              role="button"
              tabIndex={n ? 0 : -1}
              aria-label={`${code}: ${n} ${n === 1 ? 'facility' : 'facilities'}`}
              aria-pressed={active}
              onClick={() => n && set({ state: active ? null : code })}
              onKeyDown={(e) => {
                if (n && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  set({ state: active ? null : code });
                }
              }}
              className={`ind-tile${n ? ' has-n' : ''}${active ? ' is-active' : ''}`}
            >
              <rect
                x={x + 0.05}
                y={y + 0.05}
                width={0.9}
                height={0.9}
                rx={0.12}
                style={{ fillOpacity: n ? 0.25 + 0.75 * (n / max) : 1 }}
              />
              <text x={x + 0.5} y={y + 0.58} textAnchor="middle">
                {code}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="ind-fac-list">
        {facilities.slice(0, 12).map((x) => (
          <li key={x.id || `${x.company_name}:${x.city}`} className="ind-fac">
            <span className="ind-fac-name">
              {x.company_name}
              <span className="ind-dim">
                {' '}
                · {[x.city, x.state_code].filter(Boolean).join(', ')}
              </span>
            </span>
            <span className="ind-fac-meta">
              {[x.activity, x.status].filter(Boolean).join(' · ')}
              {x.announced_investment_usd ? (
                <span className="ind-mono">
                  {' '}
                  · {usdCompact(x.announced_investment_usd)} announced
                </span>
              ) : null}
            </span>
            {(x.awards || []).map((a) => (
              <span key={`${a.source}:${a.id}`} className="ind-fac-award">
                {a.source === 'usaspending'
                  ? 'Obligated (USAspending)'
                  : `Announced (NIST, ${a.status === 'final' ? 'final' : 'proposed'})`}
                : <span className="ind-mono">{usdCompact(a.amount_usd) || 'n/a'}</span>
                {a.is_split_award && a.n_sites > 1 ? ` · Split across ${a.n_sites} sites` : ''}{' '}
                <Source row={{ source_url: a.source_url, as_of: a.action_date || a.as_of }} />
              </span>
            ))}
            <Source row={x} />
          </li>
        ))}
      </ul>
      {Object.keys(incentives).length ? (
        <p className="ind-note">
          State incentive totals count each award once, however many sites in the state it is split
          across.
        </p>
      ) : null}
    </div>
  );
}

/* 5. Competitive positioning */
function Positioning({ metrics, companies }) {
  const names = new Set(companies.map((c) => c.company_name));
  const tickers = new Set(companies.map((c) => c.ticker));
  const rows = byDimension(metrics, 'market_share', 'company').filter(
    (r) => names.has(r.key) || tickers.has(r.key) || !companies.length,
  );
  if (!rows.length) {
    return (
      <Empty waitingFor="Market share by company from a named market research or company-reported source, with the market definition as its scope." />
    );
  }
  const max = Math.max(...rows.map((r) => Number(r.value) || 0), 1);
  return (
    <ul className="ind-bars">
      {rows.slice(0, 10).map((r) => (
        <li key={r.id || r.key} className="ind-bar">
          <span className="ind-bar-label">{r.key}</span>
          <span className="ind-bar-track" aria-hidden="true">
            <span
              className="ind-bar-fill"
              style={{ width: `${(100 * (Number(r.value) || 0)) / max}%` }}
            />
          </span>
          <span className="ind-mono">{formatMetric(r)}</span>
          <Source row={r} />
        </li>
      ))}
    </ul>
  );
}

/* 6. Investment pipeline: private investment and incentives, never summed. */
function Pipeline({ facilities }) {
  const p = investmentPipeline(facilities);
  if (!p.projects && !p.awards) {
    return (
      <Empty waitingFor="Announced private investment per project (company filings and press releases) and CHIPS incentive awards (NIST final or proposed, USAspending obligated)." />
    );
  }
  return (
    <div className="ind-pipe">
      <div className="ind-kpi">
        <span className="ind-kpi-label">Private investment announced</span>
        <span className="ind-kpi-value ind-mono">{usdCompact(p.privateUsd) || 'n/a'}</span>
        <span className="ind-kpi-meta">
          {p.projects} {p.projects === 1 ? 'project' : 'projects'} · largest figure per project
        </span>
      </div>
      <div className="ind-kpi">
        <span className="ind-kpi-label">CHIPS incentives</span>
        <span className="ind-kpi-value ind-mono">{usdCompact(p.incentives.final) || '$0'}</span>
        <span className="ind-kpi-meta">
          final · <span className="ind-mono">{usdCompact(p.incentives.proposed) || '$0'}</span>{' '}
          proposed · <span className="ind-mono">{usdCompact(p.incentives.obligated) || '$0'}</span>{' '}
          obligated
        </span>
      </div>
      <p className="ind-note">
        Incentives are a separate series and are not added to private investment.
      </p>
    </div>
  );
}

/* 7. Financial performance */
function Financials({ metrics }) {
  const rows = currentMetrics(metrics).filter((m) =>
    ['revenue', 'operating_margin', 'gross_margin'].includes(m.metric),
  );
  return rows.length ? (
    <MetricList rows={rows} />
  ) : (
    <Empty waitingFor="Revenue and margins by stage from company filings (10-K, 20-F), with fiscal period and scope." />
  );
}

/* 8. Supply-chain risk */
function Risks({ risks, registry }) {
  if (!risks.length) {
    return (
      <Empty waitingFor="Documented dependencies (single sources, concentrated inputs) from GAO, CRS or company risk factors, each marked documented or inferred." />
    );
  }
  const stageLabel = (id) => registry.stages.find((s) => s.id === id)?.label || '';
  return (
    <ul className="ind-risks">
      {risks.map((r) => (
        <li key={r.id || r.title} className="ind-risk">
          <span className="ind-risk-title">
            {r.title}
            <span
              className={`ind-badge ind-badge--${r.confidence === 'documented' ? 'doc' : 'inf'}`}
            >
              {r.confidence}
            </span>
          </span>
          <span className="ind-dim">
            {[stageLabel(r.stage_id), r.risk_type].filter(Boolean).join(' · ')}
          </span>
          <span>{r.evidence}</span>
          <Source row={r} />
        </li>
      ))}
    </ul>
  );
}

/* 9. End-market demand */
function EndMarkets({ metrics }) {
  const rows = byDimension(metrics, 'end_market_share', 'end_market');
  return rows.length ? (
    <MetricList rows={rows} labelKey="key" />
  ) : (
    <Empty waitingFor="Sales by end market (data center, communications, auto, industrial, consumer, government) from an industry association report." />
  );
}

/* 10. Workforce & research */
function Workforce({ metrics }) {
  const rows = currentMetrics(metrics).filter((m) =>
    ['employment', 'rd_spend', 'workforce_gap', 'graduates'].includes(m.metric),
  );
  return rows.length ? (
    <MetricList rows={rows} />
  ) : (
    <Empty waitingFor="Employment, R&D spend and workforce figures from BLS, NSF or industry association reports." />
  );
}

function MetricList({ rows, labelKey = 'metric' }) {
  return (
    <ul className="ind-metrics">
      {rows.map((m) => (
        <li key={m.id || `${m.metric}:${m.key}`} className="ind-metric">
          <span>{labelKey === 'key' ? m.key : String(m.metric).replace(/_/g, ' ')}</span>
          <span className="ind-mono">{formatMetric(m)}</span>
          <span className="ind-dim">
            {m.measure_type} · {m.scope}
            {m.period ? ` · ${m.period}` : ''}
          </span>
          <Source row={m} />
        </li>
      ))}
    </ul>
  );
}

/* The sections after the chain and the landscape, with what makes each one
   worth showing. A section with nothing sourced is not drawn as an empty
   card (six of them used to fill a screen with "Not yet sourced"); it is
   listed once in the "Still being sourced" note at the end. */
function sectionsFor(registry, metrics) {
  const facilities = registry.facilities || [];
  const current = currentMetrics(metrics);
  const any = (ids) => current.some((m) => ids.includes(m.metric));
  return [
    {
      id: 'overview',
      icon: 'bi-speedometer2',
      title: 'Overview',
      has: KPI_METRICS.some((k) => headline(metrics, k.id)),
      waiting: 'industry association or statistical agency headline figures',
    },
    {
      id: 'map',
      icon: 'bi-geo-alt',
      title: 'Where it operates',
      has: facilities.length > 0,
      waiting: 'facility locations from company filings and CHIPS award records',
    },
    {
      id: 'position',
      icon: 'bi-bar-chart',
      title: 'Competitive positioning',
      has: byDimension(metrics, 'market_share', 'company').length > 0,
      waiting: 'market share by company from a named source',
    },
    {
      id: 'pipeline',
      icon: 'bi-cash-stack',
      title: 'Investment pipeline',
      has: facilities.some((x) => x.announced_investment_usd || (x.awards || []).length),
      waiting: 'announced investment per project and CHIPS incentive awards',
    },
    {
      id: 'financials',
      icon: 'bi-graph-up',
      title: 'Financial performance',
      has: any(['revenue', 'operating_margin', 'gross_margin']),
      waiting: 'revenue and margins by stage from company filings',
    },
    {
      id: 'risk',
      icon: 'bi-exclamation-triangle',
      title: 'Supply-chain risk',
      has: (registry.risks || []).length > 0,
      waiting: 'documented dependencies from GAO, CRS or company risk factors',
    },
    {
      id: 'demand',
      icon: 'bi-pie-chart',
      title: 'End-market demand',
      has: byDimension(metrics, 'end_market_share', 'end_market').length > 0,
      waiting: 'sales by end market from an industry association report',
    },
    {
      id: 'workforce',
      icon: 'bi-people',
      title: 'Workforce & research',
      has: any(['employment', 'rd_spend', 'workforce_gap', 'graduates']),
      waiting: 'employment, R&D and workforce figures from BLS, NSF or associations',
    },
  ];
}

function StillSourcing({ sections }) {
  const [open, setOpen] = useState(false);
  if (!sections.length) return null;
  return (
    <section className="ind-pending" aria-label="Still being sourced">
      <button
        type="button"
        className="ind-pending-head"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <i className="bi bi-hourglass-split" aria-hidden="true" />
        <span className="ind-pending-title">Still being sourced</span>
        <span className="ind-pending-list">{sections.map((x) => x.title).join(' · ')}</span>
        <i
          className={`bi ${open ? 'bi-chevron-up' : 'bi-chevron-down'} ind-sec-caret`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <ul className="ind-pending-items">
          {sections.map((x) => (
            <li key={x.id}>
              <span className="ind-pending-name">{x.title}</span>
              <span className="ind-dim">Waiting for {x.waiting}.</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function IndustryLayout({ dossier, tone = 'band' }) {
  const registry = dossier?.registry;
  const rootRef = useRef(null);
  const [f, setF] = useState({ stage: null, state: null, model: null, hq: null });
  const set = (patch) => setF((prev) => ({ ...prev, ...patch }));
  const filtered = useMemo(() => (registry ? applyFilters(registry, f) : null), [registry, f]);
  const scope = useMemo(
    () => (registry ? geoScope(registry, dossier?.geo) : null),
    [registry, dossier],
  );

  /* The band's "industry at a glance" card opens this layout, optionally on
     one stage or on the pinged country's companies. */
  useEffect(() => {
    function onOpen(e) {
      const d = e?.detail || {};
      setF({ stage: d.stage || null, state: null, model: null, hq: d.hq || null });
      const el = rootRef.current;
      if (!el) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' });
    }
    window.addEventListener('ezana:industry-filter', onOpen);
    return () => window.removeEventListener('ezana:industry-filter', onOpen);
  }, []);

  if (!registry?.stages?.length) return null;
  const metrics = registry.metrics || [];
  const stageLabel = (id) => registry.stages.find((s) => s.id === id)?.label || id;
  const active = [
    f.stage ? { k: 'stage', label: stageLabel(f.stage) } : null,
    f.state ? { k: 'state', label: f.state } : null,
    f.model ? { k: 'model', label: BUSINESS_MODELS[f.model] || f.model } : null,
    f.hq && scope ? { k: 'hq', label: `Headquartered in ${scope.label}` } : null,
  ].filter(Boolean);
  const sections = sectionsFor(registry, metrics);
  const shown = sections.filter((x) => x.has);
  const pending = sections.filter((x) => !x.has);
  const total = registry.companies.length;
  const rest = scope ? elsewhereLine(scope.elsewhere) : '';

  const body = {
    overview: <Overview metrics={metrics} />,
    map: <FacilityMap facilities={filtered.facilities} />,
    position: <Positioning metrics={metrics} companies={filtered.companies} />,
    pipeline: <Pipeline facilities={filtered.facilities} />,
    financials: <Financials metrics={metrics} />,
    risk: <Risks risks={filtered.risks} registry={registry} />,
    demand: <EndMarkets metrics={metrics} />,
    workforce: <Workforce metrics={metrics} />,
  };

  return (
    <FilterCtx.Provider value={{ f, set }}>
      <div ref={rootRef} className={`ind ind--${tone}`} id="industry-layout">
        <div className="ind-inner">
          <header className="ind-head">
            <p className="ind-eyebrow">Industry layout</p>
            <h2 className="ind-title">{dossier.name}</h2>
            <p className="ind-lede">
              {scope
                ? scope.here.length
                  ? `${scope.here.length} of the ${total} listed companies in Ezana\u2019s registry ${scope.here.length === 1 ? 'is' : 'are'} headquartered in ${scope.label}${
                      rest ? `; the rest: ${rest}` : ''
                    }. The chain below is the global one, with ${scope.label} marked.`
                  : `None of the ${total} listed companies in Ezana\u2019s registry is headquartered in ${scope.label} yet. The chain below is the global one.`
                : `${total} listed companies from Ezana\u2019s industry registry, placed by the business model in their own annual reports.`}{' '}
              Figures appear only once sourced.
            </p>
            {active.length ? (
              <div className="ind-chips" aria-label="Active filters">
                {active.map((a) => (
                  <button
                    key={a.k}
                    type="button"
                    className="ind-chip is-active"
                    onClick={() => set({ [a.k]: null })}
                  >
                    {a.label}
                    <i className="bi bi-x" aria-hidden="true" />
                    <span className="ind-sr"> (clear filter)</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="ind-chip"
                  onClick={() => setF({ stage: null, state: null, model: null, hq: null })}
                >
                  Clear all
                </button>
              </div>
            ) : null}
          </header>

          <Section
            id="chain"
            icon="bi-diagram-3"
            title="Value chain"
            sub="Select a stage to filter"
            open
          >
            <ValueChain
              registry={registry}
              companies={registry.companies.filter(
                (c) =>
                  (!f.model || c.business_model === f.model) &&
                  (!f.hq || String(c.hq_country || '').toUpperCase() === f.hq),
              )}
            />
          </Section>
          <Section
            id="companies"
            icon="bi-building"
            title="Company landscape"
            sub={`${filtered.companies.length}`}
            open
          >
            <Companies registry={registry} companies={filtered.companies} scope={scope} />
          </Section>
          {shown.map((x, i) => (
            <Section key={x.id} id={x.id} icon={x.icon} title={x.title} open={i < 3}>
              {body[x.id]}
            </Section>
          ))}
          <StillSourcing sections={pending} />
        </div>
      </div>
    </FilterCtx.Provider>
  );
}

export default IndustryLayout;
