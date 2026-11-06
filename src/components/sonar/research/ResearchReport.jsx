'use client';

/**
 * ResearchReport: the Sonar research engine's result (engine v3, Section 8).
 *
 * The answer is the centerpiece; the datasets are the evidence behind it.
 * Top to bottom: the question and its scope, live progress (real events
 * only), the executive conclusion, key metrics, key findings (each with its
 * claim classification, verification status, citations and feedback),
 * research-specific charts (only those whose data came back, each with
 * source, period, unit and method), the research team (Nov 2026: who worked
 * on the question, their conclusions, the methodology checks and the red
 * team), the relationship explorer (observed and inferred kept apart), the
 * evidence explorer (grouped, with why each item was selected), methodology
 * and limitations, and follow-on research.
 *
 * Tokens only (EZANA_BRANDING_GUIDE): numbers, tickers and dates in mono,
 * prose in sans, emerald for interaction, --positive/--negative for
 * direction only. No backend vendor names anywhere in copy.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { EVIDENCE_CATEGORIES } from '@/lib/sonar/engine/domains';
import { selectTeam, teamProgress } from '@/lib/sonar/research-state';
import { VisuallyHidden } from '@/components/ds';
import { sendFeedback } from './useResearchStream';
import { Cites, calcAnchor } from './Cites';
import ResearchTeamPanel from './ResearchTeamPanel';
import MethodologySection from './MethodologySection';
import InvestmentMemo from './InvestmentMemo';
import PositioningMemo from './PositioningMemo';
import FundFitMemo from './FundFitMemo';
import ChallengeBanner from './ChallengeBanner';
import ReportContents from './ReportContents';
import './research-report.css';
import { CountryIntelCard } from '@/components/landing/CountryIntelCard';

export const SOURCE_LABELS = {
  lobbying_leaders: 'Lobbying disclosures, leaders',
  lobbying_company: 'Lobbying disclosures, by company',
  congress_sector: 'Congressional trades',
  congress_company: 'Congressional trades',
  politician_dossier: 'Member disclosures and committees',
  contracts_history: 'Federal contract obligations',
  institutional_13f: '13F institutional holdings',
  sec_filings: 'SEC filings',
  market_snapshot: 'Market data',
  analysts: 'Analyst ratings and targets',
  revenue_geo: 'Revenue by region',
  price_performance: 'Share price performance',
  commodity_series: 'Commodity prices',
  sanctions: 'US sanctions (OFAC)',
  macro_country: 'OECD and Empire rankings',
  macro_series: 'Macro and commodity indicators',
  industry_registry: 'Industry registry',
  prediction_markets: 'Prediction markets',
  echo: 'Ezana Echo',
  news: 'News',
  ipo_filings: 'IPO filings',
  company_financials: 'Reported financials (SEC)',
  product_segments: 'Revenue by segment',
  holder_positioning: '13F positioning',
  peer_financials: 'Listed peers (SEC)',
  customer_capex: 'Customer capital spending (SEC)',
  estimates: 'Consensus estimates and multiples',
  disclosures: 'Company filings (10-Q, 10-K)',
  export_controls: 'US export controls (BIS)',
  capex_monetization: 'Capital spending and cash flow (SEC filings)',
  hyperscaler_capex: 'Hyperscaler capital spending and cloud revenue',
  contracts_profile: 'Federal contract obligations, by year and agency',
  lobbying_profile: 'Lobbying disclosures, by year and policy area',
  value_chain: 'AI infrastructure value chain (Ezana framework)',
  lobbying_associations: 'Lobbying disclosures, industry associations',
  competitive_products: 'Competitor announcements',
  fund_mandate: 'Your fund mandate and IPS',
};

const STAGES = [
  ['understanding', 'Understanding the question'],
  ['retrieving', 'Retrieving evidence'],
  ['verifying_evidence', 'Selecting and verifying evidence'],
  ['analyzing', 'Calculating and relating'],
  ['synthesizing', 'Writing validated findings'],
];
const MEMO_STAGES = {
  synthesizing: 'Writing the risk assessment',
};
const FUND_STAGES = {
  synthesizing: 'Writing the assessment for your fund',
};

const CLASS_LABEL = {
  verified_fact: 'Verified',
  calculated_result: 'Calculated',
  analytical_interpretation: 'Interpretation',
  hypothesis: 'Hypothesis',
  unknown: 'Unknown',
};

const WHY = {
  relevance: 'matches the question',
  entityMatch: 'about the subject',
  objectiveMatch: 'states the metric asked for',
  reliability: 'primary or official source',
  temporal: 'inside the time window',
  specificity: 'specific figures',
  completeness: 'dated and complete',
  recency: 'recent',
  relationship: 'links entities',
};

export function fmtValue(v, unit) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 'n/a';
  if (unit === 'ratio' || unit === 'share of revenue') return `${(n * 100).toFixed(1)}%`;
  if (unit === 'percent') return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
  if (unit === 'USD') {
    const a = Math.abs(n);
    if (a >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (a >= 1e3) return `$${Math.round(n / 1e3)}K`;
    return `$${Math.round(n)}`;
  }
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

const STEP_STATE = {
  pending: 'Not started',
  active: 'In progress',
  done: 'Done',
  failed: 'Did not complete',
};
const ANALYST_STATE = {
  pending: 'Waiting',
  active: 'Working',
  done: 'Finished',
  failed: 'Did not report',
};

/**
 * The run screen's steps, from real events only: the engine's stages, then
 * (Nov 2026, research team) the red-team review in deep research and the
 * methodology audit. The director's writing stays active while it drafts
 * and again for its final pass after the red team; it is done while a
 * control step runs.
 */
function progressSteps(state, tp) {
  const seen = new Set(state.stages || []);
  const last = state.stage;
  const running = state.status === 'running';
  const spec = state.plan?.spec;
  const steps = STAGES.map(([id, label]) => {
    let status = 'pending';
    if (seen.has(id)) {
      const controlRunning =
        tp && (tp.redTeam === 'active' || (tp.audit && tp.audit !== 'pending'));
      status =
        id === last && running && !(id === 'synthesizing' && controlRunning) ? 'active' : 'done';
    }
    return {
      id,
      label:
        (spec?.memoKind === 'fund_fit' && FUND_STAGES[id]) ||
        (spec?.format === 'investment_memo' && MEMO_STAGES[id]) ||
        label,
      status,
    };
  });
  if (tp?.redTeam) steps.push({ id: 'red-team', label: 'Red-team review', status: tp.redTeam });
  if (tp?.audit) steps.push({ id: 'audit', label: 'Auditing', status: tp.audit });
  return steps;
}

/** What a screen reader hears when a step starts or an analyst reports. */
function progressMessages(steps, tp) {
  const out = new Map();
  for (const s of steps) {
    if (s.status === 'active') out.set(`step:${s.id}`, s.label);
    else if (s.id === 'audit' && s.status === 'done' && tp?.auditResult?.total)
      out.set(
        'step:audit',
        `Methodology checks: ${tp.auditResult.passed} of ${tp.auditResult.total} passed`,
      );
    else if (s.id === 'red-team' && s.status === 'done')
      out.set('step:red-team', 'Red-team review finished');
  }
  if (tp?.lead) out.set('team', `Lead analyst: ${tp.lead.title}`);
  for (const a of [tp?.lead, ...(tp?.supporting || [])].filter(Boolean)) {
    if (a.status === 'active') out.set(`a:${a.id}`, `${a.title} started`);
    else if (a.status === 'done') out.set(`a:${a.id}`, `${a.title} finished`);
    else if (a.status === 'failed') out.set(`a:${a.id}`, `${a.title} did not report`);
  }
  return out;
}

/* Announces only what changed since the last render, so a screen reader
   hears each stage change once (never the per-source task counts). */
function useAnnouncement(messages) {
  const prev = useRef(new Map());
  const [text, setText] = useState('');
  const key = [...messages].map(([k, v]) => `${k}=${v}`).join('|');
  useEffect(() => {
    const changed = [];
    for (const [k, v] of messages) if (prev.current.get(k) !== v) changed.push(v);
    prev.current = messages;
    if (changed.length) setText(`${changed.join('. ')}.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return text;
}

function Progress({ state }) {
  const tasks = Object.entries(state.tasks || {});
  const tp = teamProgress(state);
  const steps = progressSteps(state, tp);
  const announce = useAnnouncement(progressMessages(steps, tp));
  const people = tp ? [tp.lead, ...tp.supporting].filter(Boolean) : [];
  return (
    <section className="srr-progress" aria-label="Research progress">
      <VisuallyHidden role="status" aria-live="polite" aria-atomic="true">
        {announce}
      </VisuallyHidden>
      <ol className="srr-stages">
        {steps.map((s) => (
          <li key={s.id} className={`srr-stage${s.status === 'pending' ? '' : ` is-${s.status}`}`}>
            <span className="srr-stage-dot" aria-hidden="true" />
            {s.label}
            <VisuallyHidden>, {STEP_STATE[s.status]}</VisuallyHidden>
          </li>
        ))}
      </ol>
      {people.length ? (
        <ul className="srr-tasks srr-team-progress" aria-label="Research team">
          {people.map((a) => (
            <li key={a.id} className={`srr-task is-${a.status}`}>
              <span>
                {a.role === 'lead' ? 'Lead analyst' : 'Supporting'}: {a.title}
              </span>
              <span className="srr-team-progress-state">{ANALYST_STATE[a.status]}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {tasks.length ? (
        <ul className="srr-tasks">
          {tasks.map(([id, t]) => (
            <li key={id} className={`srr-task is-${t.status}`}>
              <span>{SOURCE_LABELS[t.source] || t.source}</span>
              <span className="srr-mono">
                {t.status === 'done' ? `${t.items ?? 0} found` : t.status}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function Caption({ vis }) {
  return (
    <p className="srr-chart-cap">
      Source: {vis.source}. Period:{' '}
      {vis.period?.label ||
        [vis.period?.from, vis.period?.to].filter(Boolean).join(' to ') ||
        'as reported'}
      . Unit: {vis.unit}. Method: {vis.method}.
    </p>
  );
}

export function ResearchChart({ vis }) {
  if (vis.type === 'leaderboard' || vis.type === 'bars') {
    const rows = vis.rows || [];
    const max = Math.max(...rows.map((r) => Math.abs(Number(r.value) || 0)), 1e-9);
    return (
      <figure className="srr-chart">
        <figcaption className="srr-chart-title">{vis.title}</figcaption>
        <ol className="srr-board">
          {rows.map((r, i) => (
            <li key={`${r.label}-${i}`} className="srr-board-row">
              <span className="srr-board-label" title={r.sub || r.label}>
                {r.label}
                {r.sub && r.sub !== r.label ? <span className="srr-board-sub">{r.sub}</span> : null}
              </span>
              <span className="srr-board-bar" aria-hidden="true">
                <span
                  className={`srr-board-fill${vis.unit === 'percent' && r.value < 0 ? ' is-neg' : ''}`}
                  style={{ width: `${Math.max(2, (Math.abs(Number(r.value) || 0) / max) * 100)}%` }}
                />
              </span>
              <span className="srr-board-val">{fmtValue(r.value, vis.unit)}</span>
            </li>
          ))}
        </ol>
        <Caption vis={vis} />
      </figure>
    );
  }
  if (vis.type === 'timeline') {
    const s = vis.series || [];
    const max = Math.max(1, ...s.map((p) => Math.max(p.buys || 0, p.sells || 0)));
    const W = 300;
    const H = 90;
    const step = W / Math.max(1, s.length);
    const bw = Math.max(3, step - 5);
    const mid = H / 2;
    const h = (n) => (n / max) * (mid - 4);
    return (
      <figure className="srr-chart">
        <figcaption className="srr-chart-title">{vis.title}</figcaption>
        <svg
          className="srr-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={vis.title}
        >
          <line x1="0" x2={W} y1={mid} y2={mid} className="srr-axis" />
          {s.map((p, i) => (
            <g key={p.x}>
              {p.buys ? (
                <rect
                  className="srr-bar-up"
                  x={i * step + (step - bw) / 2}
                  y={mid - h(p.buys)}
                  width={bw}
                  height={h(p.buys)}
                />
              ) : null}
              {p.sells ? (
                <rect
                  className="srr-bar-down"
                  x={i * step + (step - bw) / 2}
                  y={mid}
                  width={bw}
                  height={h(p.sells)}
                />
              ) : null}
            </g>
          ))}
        </svg>
        <div className="srr-axis-labels srr-mono">
          <span>{s[0]?.x}</span>
          <span>{s[s.length - 1]?.x}</span>
        </div>
        <div className="srr-legend">
          <span className="srr-key is-up">Purchases</span>
          <span className="srr-key is-down">Sales</span>
        </div>
        <Caption vis={vis} />
      </figure>
    );
  }
  if (vis.type === 'line') {
    const s = vis.series || [];
    if (s.length < 2) return null;
    const ys = s.map((p) => p.y);
    const lo = Math.min(...ys);
    const hi = Math.max(...ys);
    const W = 300;
    const H = 100;
    const pts = s
      .map(
        (p, i) =>
          `${((i / (s.length - 1)) * W).toFixed(1)},${(H - 4 - ((p.y - lo) / (hi - lo || 1)) * (H - 8)).toFixed(1)}`,
      )
      .join(' ');
    return (
      <figure className="srr-chart">
        <figcaption className="srr-chart-title">{vis.title}</figcaption>
        <svg
          className="srr-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={vis.title}
        >
          <polyline points={pts} className="srr-line" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="srr-axis-labels srr-mono">
          <span>{s[0].x}</span>
          <span>
            low {lo.toFixed(2)} · high {hi.toFixed(2)}
          </span>
          <span>{s[s.length - 1].x}</span>
        </div>
        <Caption vis={vis} />
      </figure>
    );
  }
  return null;
}

function Finding({ f, runId, onCite, entitiesFallback = [] }) {
  const [sent, setSent] = useState(null);
  const flag = async (kind) => {
    const ok = await sendFeedback({ runId, findingId: f.id, kind });
    setSent(ok ? kind : 'failed');
  };
  return (
    <article className="srr-finding">
      <header className="srr-finding-head">
        <h3 className="srr-finding-title">{f.title}</h3>
        <span className={`srr-badge is-${f.classification}`}>
          {CLASS_LABEL[f.classification] || f.classification}
        </span>
        {f.validation?.action === 'downgraded' ? (
          <span className="srr-badge is-qualified">Qualified</span>
        ) : null}
      </header>
      <p className="srr-finding-text">
        {f.explanation} <Cites markers={f.markers} onCite={onCite} />
      </p>
      <div className="srr-finding-meta">
        {(f.entities?.length ? f.entities : entitiesFallback).slice(0, 5).map((e) => (
          <span key={e} className="srr-chip">
            {e}
          </span>
        ))}
        {f.period ? <span className="srr-chip srr-mono">{f.period}</span> : null}
        {f.metrics?.length ? (
          <span className="srr-chip srr-mono">{f.metrics.length} calculated</span>
        ) : null}
      </div>
      <div className="srr-finding-actions">
        {sent ? (
          <span className="srr-thanks">
            {sent === 'failed' ? 'Not sent. Try again.' : 'Thanks. We review every report.'}
          </span>
        ) : (
          <>
            <button type="button" className="srr-link" onClick={() => flag('incorrect_finding')}>
              Incorrect
            </button>
            <button
              type="button"
              className="srr-link"
              onClick={() => flag('incorrect_calculation')}
            >
              Calculation wrong
            </button>
            <button type="button" className="srr-link" onClick={() => flag('outdated_evidence')}>
              Outdated
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function Relationships({ data }) {
  const [showAll, setShowAll] = useState(false);
  if (!data?.relationships?.length) return null;
  const rels = data.relationships;
  const observed = rels.filter((r) => r.status === 'observed');
  const inferred = rels.filter((r) => r.status === 'inferred');
  const list = (xs) => (showAll ? xs : xs.slice(0, 8));
  const Row = ({ r }) => (
    <li className="srr-rel">
      <span className="srr-rel-node">{r.source.label}</span>
      <span className="srr-rel-edge">{r.type.replace(/_/g, ' ')}</span>
      <span className="srr-rel-node">{r.target.label}</span>
      {r.note ? <span className="srr-rel-note">{r.note}</span> : null}
    </li>
  );
  return (
    <section className="srr-section" aria-labelledby="srr-rel-h">
      <h2 id="srr-rel-h" className="srr-h2">
        Relationships
      </h2>
      {data.paths?.length ? (
        <div className="srr-paths">
          {data.paths.slice(0, 4).map((p, i) => (
            <p key={i} className="srr-path">
              {p.map((r, k) => (
                <span key={r.id}>
                  {k === 0 ? <span className="srr-rel-node">{r.source.label}</span> : null}
                  <span className="srr-rel-edge"> {r.type.replace(/_/g, ' ')} </span>
                  <span className="srr-rel-node">{r.target.label}</span>
                </span>
              ))}
            </p>
          ))}
        </div>
      ) : null}
      <h3 className="srr-h3">Directly observed in the records</h3>
      <ul className="srr-rels">
        {list(observed).map((r) => (
          <Row key={r.id} r={r} />
        ))}
      </ul>
      {inferred.length ? (
        <>
          <h3 className="srr-h3">Inferred associations (co-occurrence, not causation)</h3>
          <ul className="srr-rels is-inferred">
            {list(inferred).map((r) => (
              <Row key={r.id} r={r} />
            ))}
          </ul>
        </>
      ) : null}
      {rels.length > 8 ? (
        <button type="button" className="srr-link" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Show fewer' : `Show all ${rels.length}`}
        </button>
      ) : null}
    </section>
  );
}

function EvidenceExplorer({ evidence, focus, runId }) {
  const [cat, setCat] = useState('all');
  const [flagged, setFlagged] = useState({});
  const groups = useMemo(() => {
    const by = new Map();
    for (const e of evidence) {
      if (!by.has(e.category)) by.set(e.category, []);
      by.get(e.category).push(e);
    }
    return EVIDENCE_CATEGORIES.filter(([id]) => by.has(id)).map(([id, label]) => [
      id,
      label,
      by.get(id),
    ]);
  }, [evidence]);
  if (!evidence?.length) return null;
  const shown = cat === 'all' ? groups : groups.filter(([id]) => id === cat);
  const flag = async (e) => {
    const ok = await sendFeedback({ runId, evidenceId: e.id, kind: 'irrelevant_source' });
    setFlagged((f) => ({ ...f, [e.id]: ok }));
  };
  return (
    <section className="srr-section" aria-labelledby="srr-ev-h">
      <h2 id="srr-ev-h" className="srr-h2">
        Evidence
      </h2>
      <div className="srr-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={cat === 'all'}
          className="srr-tab"
          onClick={() => setCat('all')}
        >
          All {evidence.length}
        </button>
        {groups.map(([id, label, xs]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={cat === id}
            className="srr-tab"
            onClick={() => setCat(id)}
          >
            {label} {xs.length}
          </button>
        ))}
      </div>
      {shown.map(([id, label, xs]) => (
        <div key={id} className="srr-ev-group">
          <h3 className="srr-h3">{label}</h3>
          {xs.map((e) => (
            <article
              key={e.id}
              id={`ev-${e.marker}`}
              tabIndex={-1}
              className={`srr-ev${focus === e.marker ? ' is-focus' : ''}`}
            >
              <header className="srr-ev-head">
                <span className="srr-cite is-static">{e.marker}</span>
                <span className="srr-ev-title">{e.title}</span>
                {e.historical ? (
                  <span className="srr-badge is-historical">Prior research</span>
                ) : null}
              </header>
              <p className="srr-ev-text">{e.text}</p>
              <p className="srr-ev-meta srr-mono">
                {SOURCE_LABELS[e.source] || e.source}
                {e.period?.label ? ` · ${e.period.label}` : e.date ? ` · ${e.date}` : ''}
                {` · retrieved ${String(e.retrievedAt).slice(0, 10)}`}
              </p>
              <p className="srr-ev-why">
                Why it matters:{' '}
                {(e.why || []).map((w) => WHY[w] || w).join(', ') || 'relevant to the question'}.
              </p>
              <div className="srr-ev-actions">
                {e.url ? (
                  <a className="srr-link" href={e.url} target="_blank" rel="noopener noreferrer">
                    Open the record
                  </a>
                ) : null}
                {flagged[e.id] == null ? (
                  <button type="button" className="srr-link" onClick={() => flag(e)}>
                    Not relevant
                  </button>
                ) : (
                  <span className="srr-thanks">{flagged[e.id] ? 'Thanks' : 'Not sent'}</span>
                )}
              </div>
            </article>
          ))}
        </div>
      ))}
    </section>
  );
}

function RunFeedback({ runId }) {
  const [sent, setSent] = useState(null);
  const send = async (kind) => setSent((await sendFeedback({ runId, kind })) ? kind : 'failed');
  if (sent)
    return (
      <p className="srr-thanks">
        {sent === 'failed' ? 'Feedback was not sent.' : 'Thanks for the feedback.'}
      </p>
    );
  return (
    <div className="srr-feedback" role="group" aria-label="Rate this research">
      <span className="srr-feedback-label">Was this research useful?</span>
      {[
        ['helpful', 'Helpful'],
        ['incomplete', 'Incomplete'],
        ['insufficient_depth', 'Not deep enough'],
        ['missing_relationship', 'Missed a connection'],
      ].map(([k, l]) => (
        <button key={k} type="button" className="srr-pill" onClick={() => send(k)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export default function ResearchReport({ state, onFollowUp = null }) {
  const rootRef = useRef(null);
  const [focus, setFocus] = useState(null);
  const plan = state.plan;
  const report = state.report;
  const run = state.run;
  const runId = run?.runId || plan?.runId;
  const evidence = run?.evidence || [];
  const metrics = state.analysis?.metrics || [];
  const vis = state.analysis?.visualizations || [];
  const team = selectTeam(state);
  /* A finding's metric refs resolve to their calculation's label; a ref the
     Methodology section lists jumps to its row. */
  const calcs = useMemo(() => {
    const m = new Map();
    for (const x of state.analysis?.metrics || [])
      if (x?.id && x.label) m.set(x.id, { label: x.label, linked: false });
    for (const x of team?.methodology?.calculations || [])
      if (x?.id && x.label) m.set(x.id, { label: x.label, linked: true });
    return m;
  }, [state.analysis, team?.methodology]);
  const gaps = team?.methodology?.gaps || [];
  const limitations = [
    ...new Map(
      [...(run?.limitations || []), ...gaps]
        .filter(Boolean)
        .map((l) => [String(l).trim().toLowerCase(), l]),
    ).values(),
  ];
  const cite = (m) => {
    setFocus(m);
    const el = document.getElementById(m.startsWith('M:') ? calcAnchor(m.slice(2)) : `ev-${m}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    /* Keyboard users land on the cited record, not just a scrolled page. */
    el.focus({ preventScroll: true });
  };

  return (
    /* Nov 2026: the contents legend on the left (ReportContents), the report
       beside it. On a narrow container the legend is a chip row above. */
    <div className="srr-frame">
      <div className="srr-frame-grid">
        <ReportContents rootRef={rootRef} />
        <div className="srr" ref={rootRef}>
          {plan ? (
            <header className="srr-head">
              <p className="srr-eyebrow">Research question</p>
              <h1 className="srr-q">{plan.spec.question}</h1>
              <div className="srr-scope">
                {plan.spec.domains.slice(0, 4).map((d) => (
                  <span key={d.id} className="srr-chip">
                    {d.id.replace(/_/g, ' ')}
                  </span>
                ))}
                {plan.universe ? (
                  <span className="srr-chip">
                    {plan.universe.label} ({plan.universe.count})
                  </span>
                ) : null}
                {plan.spec.timeHorizon?.kind !== 'unspecified' ? (
                  <span className="srr-chip srr-mono">
                    {plan.spec.timeHorizon.kind}{' '}
                    {plan.spec.timeHorizon.months ? `${plan.spec.timeHorizon.months}m` : ''}
                  </span>
                ) : null}
                <span className="srr-chip">{plan.spec.depth} research</span>
                {run?.confidence ? (
                  <span className={`srr-badge is-conf-${run.confidence}`}>
                    Confidence {run.confidence}
                  </span>
                ) : null}
              </div>
              {plan.universe?.basis ? (
                <p className="srr-basis">Companies screened: {plan.universe.basis}.</p>
              ) : null}
            </header>
          ) : null}

          {state.status === 'running' ? <Progress state={state} /> : null}
          {state.memory ? (
            <p className="srr-note">
              Sonar researched this subject before (last retrieved{' '}
              {String(state.memory.lastRetrievedAt || '').slice(0, 10)}).{' '}
              {state.memory.newSinceLast} records are new since then; earlier records are marked and
              dated.
            </p>
          ) : null}

          {report?.challenge ? (
            <ChallengeBanner challenge={report.challenge} onCite={cite} />
          ) : null}

          {report?.format === 'investment_memo' && report.memoKind === 'positioning' ? (
            <PositioningMemo report={report} panels={state.panels || {}} onCite={cite} />
          ) : null}
          {report?.format === 'investment_memo' && report.memoKind === 'fund_fit' ? (
            <>
              <FundFitMemo report={report} panels={state.panels || {}} onCite={cite} />
              <InvestmentMemo report={report} panels={state.panels || {}} onCite={cite} hideView />
            </>
          ) : null}
          {report?.format === 'investment_memo' &&
          report.memoKind !== 'positioning' &&
          report.memoKind !== 'fund_fit' ? (
            <InvestmentMemo report={report} panels={state.panels || {}} onCite={cite} />
          ) : null}

          {report?.format !== 'investment_memo' && report?.executiveConclusion ? (
            <section className="srr-conclusion" aria-labelledby="srr-concl-h">
              <h2 id="srr-concl-h" className="srr-h2">
                Conclusion
              </h2>
              <p className="srr-conclusion-text">
                {report.executiveConclusion.text}{' '}
                <Cites markers={report.executiveConclusion.markers} onCite={cite} />
              </p>
              {run?.methodology?.deterministic ? (
                <p className="srr-note">
                  This report quotes the records directly; the analysis step did not complete.
                </p>
              ) : null}
            </section>
          ) : null}

          {/* Nov 6: a currency question's deep report carries the same Country & Currency
          Intelligence panel as the ping: KPIs, the assessment table, the charts and the
          transmission map, built from the computed measures (the prose is above). */}
          {state.panels?.macro?.countryIntel ? (
            <div id="srr-country-h" className="srr-anchor">
              <CountryIntelCard
                dossier={{
                  iso3: state.panels.macro.countryIntel.iso3,
                  name: state.panels.macro.countryIntel.place,
                  intel: { ...state.panels.macro.countryIntel, brief: null, fallbackText: null },
                }}
              />
            </div>
          ) : null}

          {metrics.length ? (
            <section id="srr-metrics-h" className="srr-metrics" aria-label="Key metrics">
              {metrics.slice(0, 6).map((m) => (
                <div key={m.id} className="srr-metric" title={`Method: ${m.method}`}>
                  <span className="srr-metric-val">{fmtValue(m.value, m.unit)}</span>
                  <span className="srr-metric-label">{m.label}</span>
                </div>
              ))}
            </section>
          ) : null}

          {report?.format !== 'investment_memo' && report?.keyFindings?.length ? (
            <section className="srr-section" aria-labelledby="srr-find-h">
              <h2 id="srr-find-h" className="srr-h2">
                Key findings
              </h2>
              {report.keyFindings.map((f) => (
                <Finding key={f.id} f={f} runId={runId} onCite={cite} />
              ))}
              {report.analysis?.length ? (
                <div className="srr-analysis">
                  {report.analysis.map((a) => (
                    <p key={a.id} className="srr-analysis-text">
                      <span className={`srr-badge is-${a.classification}`}>
                        {CLASS_LABEL[a.classification]}
                      </span>{' '}
                      {a.text} <Cites markers={a.markers} onCite={cite} />
                    </p>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {vis.length ? (
            <section id="srr-charts-h" className="srr-charts" aria-label="Charts">
              {vis.map((v) => (
                <ResearchChart key={v.id} vis={v} />
              ))}
            </section>
          ) : null}

          <ResearchTeamPanel team={team} onCite={cite} calcs={calcs} />

          <Relationships data={state.relationships} />
          <EvidenceExplorer evidence={evidence} focus={focus} runId={runId} />

          {run ? (
            <section className="srr-section" aria-labelledby="srr-lim-h">
              <h2 id="srr-lim-h" className="srr-h2">
                Methodology and limitations
              </h2>
              {team ? (
                <MethodologySection
                  methodology={team.methodology}
                  audit={team.live ? null : team.audit}
                  focus={focus}
                />
              ) : null}
              {limitations.length ? (
                <>
                  {team?.methodology ? <h3 className="srr-h3">Limitations and data gaps</h3> : null}
                  <ul className="srr-list">
                    {limitations.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              {team?.methodology ? <h3 className="srr-h3">Sources searched</h3> : null}
              <p className="srr-method">
                Searched:{' '}
                {run.methodology.plan.tasks
                  .map((t) => SOURCE_LABELS[t.source] || t.source)
                  .join(', ')}
                .
                {run.methodology.plan.excluded.filter((x) => x.reason !== 'below_threshold').length
                  ? ` Not searched: ${run.methodology.plan.excluded
                      .filter((x) => x.reason !== 'below_threshold')
                      .map(
                        (x) =>
                          `${SOURCE_LABELS[x.source] || x.source} (${x.reason === 'not_entitled' ? 'not in your plan' : x.reason.startsWith('unmet') ? 'no subject to search' : 'depth limit'})`,
                      )
                      .join(', ')}.`
                  : ''}{' '}
                {run.methodology.evidence.retrieved} records retrieved,{' '}
                {run.methodology.evidence.selected} selected.
                {run.researchMetadata?.validation
                  ? ` ${run.researchMetadata.validation.kept} of ${run.researchMetadata.validation.claims} claims passed validation.`
                  : ''}
              </p>
              {run.followOnResearch?.length && onFollowUp ? (
                <div className="srr-follow">
                  {run.followOnResearch.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className="srr-pill"
                      onClick={() => onFollowUp(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              ) : null}
              <RunFeedback runId={runId} />
              <p className="srr-disclaimer">
                Findings only, never financial advice. Every claim carries its source.
              </p>
            </section>
          ) : null}

          {state.status === 'error' ? <p className="srr-error">{state.error}</p> : null}
        </div>
      </div>
    </div>
  );
}
