'use client';

/**
 * Sonar v2 block renderer (sonar-templates-spec.md §1, §5): the three-column
 * briefing shell. Left: the research brief with inline [S#] citations and
 * the coverage note. Middle: sourced-match cards in matchesOrder, with
 * collapsed "no matches" chips for empty datasets. Right: KPI grid, chart
 * blocks (ranked bar, donut, timeline; relationship graph and choropleth
 * render an honest stub note until a geo/graph pass) and news. Under the
 * brief: follow-up chips plus the floating "Ask Sonar a follow-up" panel
 * with the thread, breadcrumb and remaining-ping footer.
 *
 * Numbers arrive resolved from the server sweep; this component never
 * computes a figure, only draws what the API returned.
 */
import { useEffect, useRef, useState } from 'react';
import { IndustryLayout } from '@/components/sonar/industry/IndustryLayout';
import './sonar-briefing.css';

const DATASET_LABELS = {
  'gov.contracts': 'Gov contracts',
  'capitol.congress_trades': 'Congress trades',
  'capitol.holdings': 'Congress holdings',
  'capitol.lobbying': 'Lobbying',
  'capitol.committee_seats': 'Committee seats',
  'capitol.campaign_finance': 'Campaign finance',
  'prediction.markets': 'Prediction markets',
  'titans.holdings_13f': '13F holdings',
  'titans.activist_stakes': '13D/13G',
  'titans.whale_moves': 'Whale moves',
  'lighthouse.oecd': 'OECD outlook',
  'eyes.chokepoints': 'Chokepoints',
  'eyes.ports': 'Ports',
  'eyes.patents': 'Patents',
  'house.filings': 'House filings',
  market: 'Market data',
  contracts: 'Gov contracts',
  f13: '13F holdings',
  activist: '13D/13G',
  congress: 'Congress',
  lobbying: 'Lobbying',
  pred_markets: 'Prediction markets',
  echo: 'Ezana Echo',
  news: 'News',
  campaign_finance: 'Campaign finance',
  sec_filings: 'SEC filings',
  macro_series: 'Macro series',
};

const MID = '·';
const fmtUsd = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return MID;
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
};
const fmtVal = (v, format) => {
  if (v == null) return MID;
  if (format === 'currency_compact' || (typeof v === 'number' && Math.abs(v) > 99999))
    return fmtUsd(v);
  if (typeof v === 'number') return v.toLocaleString('en-US');
  return String(v);
};

/** Inline [S#] markers become superscript source references. */
function Cited({ text, sources }) {
  const parts = String(text || '').split(/(\[S\d+\])/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = /^\[S(\d+)\]$/.exec(p);
        if (!m) return <span key={i}>{p}</span>;
        const src = sources?.find((s) => s.id === `S${m[1]}`);
        return (
          <sup
            key={i}
            className="snb-cite snb-mono"
            title={src ? `${DATASET_LABELS[src.dataset] || src.dataset}` : undefined}
          >
            {m[1]}
          </sup>
        );
      })}
    </>
  );
}

function rowLine(row) {
  const label =
    row.ticker ||
    row.recipient ||
    row.client ||
    row.member ||
    row.filer ||
    row.name ||
    row.question ||
    row.title ||
    MID;
  const value =
    row.marketCap ??
    row.totalUsd ??
    row.valueUsd ??
    row.odds ??
    row.percentOfClass ??
    row.price ??
    null;
  const date = row.tradedAt || row.filedAt || row.publishedAt || null;
  return { label: String(label), value, date };
}

function MatchCard({ match }) {
  const label = DATASET_LABELS[match.id] || match.id;
  if (match.status === 'unwired') {
    return (
      <div className="snb-match snb-match--empty">
        <span className="snb-chip snb-mono">{label}</span>
        <span className="snb-muted">not wired yet</span>
      </div>
    );
  }
  if (match.status !== 'ok' || !match.rows.length) {
    return (
      <div className="snb-match snb-match--empty">
        <span className="snb-chip snb-mono">{label}</span>
        <span className="snb-muted">{match.status === 'timeout' ? 'timed out' : 'no matches'}</span>
      </div>
    );
  }
  return (
    <div className="snb-match">
      <p className="snb-match-head">
        <span className="snb-chip snb-chip--hit snb-mono">{label}</span>
        <span className="snb-mono snb-muted">{match.count}</span>
      </p>
      <ul className="snb-match-rows">
        {match.rows.slice(0, 3).map((row, i) => {
          const { label: l, value, date } = rowLine(row);
          return (
            <li key={i}>
              <span className="snb-ellipsis">{l}</span>
              <span className="snb-mono">
                {value != null ? fmtVal(value) : date ? String(date).slice(0, 10) : MID}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const DONUT_VARS = [
  '--chart-cat-1',
  '--chart-cat-2',
  '--chart-cat-3',
  '--chart-cat-4',
  '--chart-cat-5',
  '--chart-cat-6',
  '--chart-cat-7',
  '--chart-cat-8',
];

function ChartBlock({ chart }) {
  if (chart.stub) {
    return (
      <div className="snb-card">
        <p className="snb-label">{chart.title}</p>
        <p className="snb-muted snb-note">
          This view ({chart.type.replace(/_/g, ' ')}) is not drawn yet; the matched rows are in the
          middle column.
        </p>
      </div>
    );
  }
  if (chart.type === 'ranked_bar') {
    const max = Math.max(...chart.rows.map((r) => Math.abs(r.value) || 0), 1);
    return (
      <div className="snb-card">
        <p className="snb-label">{chart.title}</p>
        <div className="snb-bars">
          {chart.rows.map((r) => (
            <div key={r.label} className="snb-bar-row">
              <span className="snb-ellipsis">{r.label}</span>
              <span className="snb-bar-track" aria-hidden="true">
                <i style={{ width: `${(Math.abs(r.value) / max) * 100}%` }} />
              </span>
              <span className="snb-mono">{fmtVal(r.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (chart.type === 'donut') {
    const total = chart.rows.reduce((t, r) => t + (Number(r.value) || 0), 0) || 1;
    let acc = 0;
    const stops = chart.rows.map((r, i) => {
      const from = (acc / total) * 100;
      acc += Number(r.value) || 0;
      return `var(${DONUT_VARS[i % 8]}) ${from}% ${(acc / total) * 100}%`;
    });
    return (
      <div className="snb-card">
        <p className="snb-label">{chart.title}</p>
        <div className="snb-donut-row">
          <span
            className="snb-donut"
            style={{ background: `conic-gradient(${stops.join(',')})` }}
            aria-hidden="true"
          />
          <ul className="snb-donut-legend">
            {chart.rows.slice(0, 6).map((r, i) => (
              <li key={r.label}>
                <i
                  className="snb-dot"
                  style={{ background: `var(${DONUT_VARS[i % 8]})` }}
                  aria-hidden="true"
                />
                <span className="snb-ellipsis">{r.label}</span>
                <span className="snb-mono">{fmtVal(r.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  /* timeline */
  return (
    <div className="snb-card">
      <p className="snb-label">{chart.title}</p>
      <ol className="snb-timeline">
        {chart.rows.map((r, i) => (
          <li key={i}>
            <span className="snb-mono snb-muted">{String(r.date).slice(0, 10)}</span>
            <span className="snb-ellipsis">{r.label}</span>
            {r.value != null ? <span className="snb-mono">{fmtVal(r.value)}</span> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function SonarBriefing({ result, onFollowup, busy = false }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const panelRef = useRef(null);

  useEffect(() => {
    if (!panelOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setPanelOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen]);

  if (!result) return null;
  const news = result.matches?.find((m) => m.id === 'news');
  const orderedMatches = (result.matchesOrder || [])
    .map((id) => result.matches?.find((m) => m.id === id))
    .filter(Boolean)
    .filter((m) => m.id !== 'news');

  const ask = (q, kind = 'text') => {
    if (!q || busy) return;
    setDraft('');
    onFollowup(q, result.pingId, kind);
  };

  return (
    <div className="snb">
      {result.breadcrumb?.length > 1 ? (
        <p className="snb-breadcrumb snb-mono">
          {result.breadcrumb.map((b, i) => (
            <span key={i}>
              {i ? ' › ' : ''}
              {b}
            </span>
          ))}
        </p>
      ) : null}

      <div className="snb-grid">
        {/* ── left: the research brief ── */}
        <section className="snb-col snb-brief" aria-label="Research brief">
          <p className="snb-label">
            Research brief <span className="snb-chip snb-mono">{result.templateLabel}</span>
          </p>
          {result.headline ? (
            <p className="snb-lede">
              <Cited text={result.headline} sources={result.sources} />
            </p>
          ) : (
            <p className="snb-muted">
              {result.empty
                ? 'The datasets returned nothing for this ping. Try a more specific entity.'
                : 'The briefing could not be composed this time. The matched rows are still shown.'}
            </p>
          )}
          {(result.brief || []).map((sec) => (
            <div key={sec.section} className="snb-section">
              <h3 className="snb-h3">{sec.section}</h3>
              <p>
                <Cited text={sec.text} sources={result.sources} />
              </p>
            </div>
          ))}
          {result.coverageGaps?.length ? (
            <p className="snb-coverage">{result.coverageGaps.join(' ')}</p>
          ) : null}
          <p className="snb-disclaimer">{result.disclaimer}</p>
          {result.followups?.length ? (
            <div className="snb-chips" aria-label="Follow-up questions">
              {result.followups.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  className="snb-followup"
                  onClick={() => ask(f.query || f.label, f.kind)}
                >
                  {f.label}
                </button>
              ))}
              <button
                type="button"
                className="snb-followup snb-followup--own"
                onClick={() => setPanelOpen(true)}
              >
                Ask your own…
              </button>
            </div>
          ) : null}
        </section>

        {/* ── middle: sourced matches ── */}
        <section className="snb-col" aria-label="Sourced matches">
          <p className="snb-label">Sourced matches</p>
          {orderedMatches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </section>

        {/* ── right: KPIs, charts, news ── */}
        <section className="snb-col" aria-label="Charts and news">
          {result.kpis?.length ? (
            <div className="snb-kpis">
              {result.kpis.map((k) => (
                <div key={k.label} className="snb-kpi">
                  <span className="snb-label">{k.label}</span>
                  <span className="snb-mono snb-kpi-v">{fmtVal(k.value, k.format)}</span>
                </div>
              ))}
            </div>
          ) : null}
          {(result.charts || []).map((c) => (
            <ChartBlock key={c.id} chart={c} />
          ))}
          {news?.rows?.length ? (
            <div className="snb-card">
              <p className="snb-label">News</p>
              <ul className="snb-news">
                {news.rows.map((n, i) => (
                  <li key={i}>
                    {n.url ? (
                      <a href={n.url} target="_blank" rel="noopener noreferrer">
                        {n.title}
                      </a>
                    ) : (
                      n.title
                    )}
                    <span className="snb-mono snb-muted">
                      {n.publisher || ''} {n.publishedAt ? String(n.publishedAt).slice(0, 10) : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      {result.industryLayout ? <IndustryLayout dossier={result.industryLayout} tone="app" /> : null}

      {/* ── floating follow-up launcher + slide-up panel ── */}
      <button
        type="button"
        className="snb-launcher"
        onClick={() => setPanelOpen((v) => !v)}
        aria-expanded={panelOpen}
      >
        <i className="bi bi-chat-dots" aria-hidden="true" /> Ask Sonar a follow-up
      </button>
      {panelOpen ? (
        <div className="snb-panel" ref={panelRef} role="dialog" aria-label="Sonar follow-up">
          <div className="snb-panel-head">
            <span className="snb-label">Follow-up</span>
            <button
              type="button"
              className="snb-panel-x"
              aria-label="Close"
              onClick={() => setPanelOpen(false)}
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
          <p className="snb-muted snb-note">
            Asking about: <strong>{result.breadcrumb?.[result.breadcrumb.length - 1]}</strong>
          </p>
          <div className="snb-chips">
            {(result.followups || []).map((f) => (
              <button
                key={f.label}
                type="button"
                className="snb-followup"
                onClick={() => ask(f.query || f.label, f.kind)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <form
            className="snb-panel-ask"
            onSubmit={(e) => {
              e.preventDefault();
              ask(draft.trim());
            }}
          >
            <input
              type="text"
              value={draft}
              maxLength={300}
              placeholder="Ask your own follow-up"
              aria-label="Ask your own follow-up"
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="submit" disabled={busy || !draft.trim()}>
              {busy ? 'Pinging…' : 'Ping'}
            </button>
          </form>
          {result.quota ? (
            <p className="snb-panel-foot snb-mono">
              {result.quota.remaining} of {result.quota.limit} pings left today
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
