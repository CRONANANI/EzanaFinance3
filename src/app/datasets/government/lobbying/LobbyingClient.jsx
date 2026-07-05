'use client';

/**
 * Lobbying Activity — Claude Design "Influence Ledger" (2a). Presentation layer
 * bound to the REAL lda.gov ETL via /api/lobbying/* (Supabase-first cache, live
 * fallback, honest empty/partial). NO mock data.
 *
 * ⚠️ DATA-HONESTY CONSTRAINT: the LDA reports ONE lump amount per filing plus a
 * list of all issues/entities it touched — it does NOT itemize dollars per
 * issue or target. So dollars appear ONLY at filing / client-firm-total level;
 * every "where it's aimed / what they lobbied on" view is ACTIVITY SHARE (share
 * of filings), never dollars-per-target. The ⓘ notices state this — keep them.
 *
 * Family standards: shared CategoryBar (Capitol Watch active), 1440/32 page,
 * page-scoped `lbx-` classes, Plus Jakarta UI + JetBrains Mono numerics, Lucide.
 */
import { useMemo, useState, useEffect, useCallback } from 'react';
import { X, ArrowUpRight, ExternalLink, Info, Download, RefreshCw } from 'lucide-react';
import CategoryBar from '@/components/datasets/CategoryBar';
import { ENTITY_LABEL, ENTITY_ORDER, ISSUE_LABEL } from '@/lib/lobbying/entities';
import './lobbying.css';

/* period selector → API scope. The current year is 2026 (filed in arrears). */
const PERIODS = [
  { key: 'ytd', label: 'YTD', tag: 'now', year: 2026, period: 'ytd' },
  { key: 'q2', label: 'Q2 2026', year: 2026, period: 'q2' },
  { key: 'q1', label: 'Q1 2026', year: 2026, period: 'q1' },
  { key: 'fy25', label: 'FY 2025', year: 2025, period: 'year' },
  { key: '90d', label: '90 days', year: 2026, period: 'range', days: 90 },
];
const ISSUE_FILTERS = [
  ['', 'All'],
  ['defense', 'Defense'],
  ['health', 'Health'],
  ['tax', 'Tax'],
  ['energy', 'Energy'],
  ['tech', 'Tech'],
  ['trade', 'Trade'],
];
const ENTITY_FILTERS = [
  ['', 'All'],
  ['congress', 'Congress'],
  ['agencies', 'Agencies'],
  ['whitehouse', 'White House'],
];
// discrete min-amount stops ($): 0 → $10M+
const MIN_STOPS = [0, 10000, 50000, 100000, 250000, 500000, 1000000, 5000000, 10000000];
const SOURCE_LABEL = 'Source: Senate LDA · lda.gov';

/* ── money: comma-separated / B-suffixed, never a bare 4-digit $1284M ── */
function fmtSpend(v) {
  const n = Number(v) || 0;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${Math.round(n / 1e6).toLocaleString()}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function relTime(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 90) return 'just now';
  const m = s / 60;
  if (m < 90) return `${Math.round(m)}m ago`;
  const h = m / 60;
  if (h < 36) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
function hasReportedAmount(f) {
  return !f?.isRegistration && f?.amount != null && Number(f.amount) > 0;
}

function useJson(url, deps) {
  const [state, setState] = useState({ loading: true, data: null });
  useEffect(() => {
    let alive = true;
    setState({ loading: true, data: null });
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setState({ loading: false, data: d }))
      .catch(() => alive && setState({ loading: false, data: null }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export default function LobbyingClient() {
  const [periodKey, setPeriodKey] = useState('fy25'); // FY2025 is the populated default
  const [issueFilter, setIssueFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [minIdx, setMinIdx] = useState(0);
  const [rankBy, setRankBy] = useState('client'); // 'client' | 'firm'
  const [heroView, setHeroView] = useState('target'); // 'target' | 'issue'
  const [sort, setSort] = useState('date'); // 'date' | 'amount'
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState(false);

  const p = PERIODS.find((x) => x.key === periodKey) || PERIODS[3];
  const min = MIN_STOPS[minIdx];

  useEffect(() => {
    setPage(1);
  }, [periodKey, issueFilter, entityFilter, minIdx, sort]);

  // shared query string for the filtered set (leaderboard + table + export)
  const scope = useMemo(() => {
    const q = new URLSearchParams({ year: String(p.year), period: p.period });
    if (p.days) q.set('days', String(p.days));
    if (issueFilter) q.set('issue', issueFilter);
    if (entityFilter) q.set('entityGroup', entityFilter);
    if (min > 0) q.set('min', String(min));
    return q;
  }, [p.year, p.period, p.days, issueFilter, entityFilter, min]);
  const scopeStr = scope.toString();

  const constants = useJson('/api/lobbying/constants', []);
  const summary = useJson(
    `/api/lobbying/summary?year=${p.year}&period=${p.period}${p.days ? `&days=${p.days}` : ''}`,
    [p.year, p.period, p.days],
  );
  const byIssue = useJson(
    `/api/lobbying/by-issue?year=${p.year}&period=${p.period}${p.days ? `&days=${p.days}` : ''}`,
    [p.year, p.period, p.days],
  );
  const spenders = useJson(`/api/lobbying/top-spenders?${scopeStr}&by=${rankBy}`, [
    scopeStr,
    rankBy,
  ]);
  const ticker = useJson(`/api/lobbying/filings?year=${p.year}&pageSize=24&sort=date`, [p.year]);
  const filings = useJson(`/api/lobbying/filings?${scopeStr}&sort=${sort}&page=${page}`, [
    scopeStr,
    sort,
    page,
  ]);

  const sm = summary.data || {};
  const spenderRows = spenders.data?.spenders || [];
  const coverage = spenders.data?.coverage || null;
  const results = filings.data?.results || [];
  const totalCount = filings.data?.count || 0;
  const topIssue = byIssue.data?.issues?.[0] || null;

  const resetFilters = useCallback(() => {
    setIssueFilter('');
    setEntityFilter('');
    setMinIdx(0);
  }, []);

  // open the drill-down for a client's largest filing (leaderboard bar click)
  const openClientFiling = useCallback(
    async (clientName) => {
      try {
        const r = await fetch(
          `/api/lobbying/filings?year=${p.year}&client=${encodeURIComponent(clientName)}&sort=amount&pageSize=1`,
        );
        const d = await r.json();
        const uuid = d?.results?.[0]?.uuid;
        if (uuid) setSelected(uuid);
      } catch {
        /* no-op */
      }
    },
    [p.year],
  );

  async function doExport(fmt) {
    setExporting(true);
    try {
      const r = await fetch(`/api/lobbying/filings?${scopeStr}&sort=${sort}&pageSize=500&page=1`);
      const d = await r.json();
      const rows = d?.results || [];
      let blob;
      let ext;
      if (fmt === 'json') {
        blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
        ext = 'json';
      } else {
        const cols = [
          'client',
          'registrant',
          'amount',
          'posted',
          'period',
          'issues',
          'entities',
          'uuid',
          'url',
        ];
        const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const lines = [cols.join(',')];
        for (const f of rows) {
          lines.push(
            [
              esc(f.client),
              esc(f.registrant),
              esc(f.amount ?? ''),
              esc(f.posted ?? ''),
              esc(f.period ?? ''),
              esc((f.issues || []).map((i) => i.display || i.code).join('; ')),
              esc((f.entities || []).join('; ')),
              esc(f.uuid),
              esc(f.url ?? ''),
            ].join(','),
          );
        }
        blob = new Blob([lines.join('\n')], { type: 'text/csv' });
        ext = 'csv';
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lobbying_${p.key}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* no-op */
    } finally {
      setExporting(false);
    }
  }

  const partial = coverage && !coverage.complete;
  const partialText = partial
    ? coverage.pct != null
      ? `${p.label} · ${coverage.pct}% loaded`
      : `${p.label} · ingesting`
    : null;

  return (
    <div className="lbx-page">
      <CategoryBar active="capitol" activeItem="Lobbying Activity" />

      <LobbyingTicker filings={ticker.data?.results || []} />

      <header className="lbx-header">
        <p className="lbx-eyebrow">CAPITOL WATCH · SENATE LDA FILINGS</p>
        <h1 className="lbx-title">Lobbying activity</h1>
        <p className="lbx-sub">
          Who is paying whom to influence Washington — Lobbying Disclosure Act filings, live from
          lda.gov.
        </p>
      </header>

      <div className="lbx-body">
        {/* ── left filter rail ── */}
        <aside className="lbx-rail">
          <div className="lbx-export">
            <button
              type="button"
              className="lbx-export-btn"
              onClick={() => doExport('csv')}
              disabled={exporting}
            >
              <Download size={14} /> {exporting ? 'Exporting…' : 'Export data'}
            </button>
            <div className="lbx-export-fmts">
              <button type="button" onClick={() => doExport('csv')}>
                CSV
              </button>
              <span>·</span>
              <button type="button" onClick={() => doExport('json')}>
                JSON
              </button>
            </div>
          </div>

          <RailGroup title="Period">
            {PERIODS.map((it) => (
              <button
                key={it.key}
                type="button"
                className={`lbx-pill${periodKey === it.key ? ' is-active' : ''}`}
                onClick={() => setPeriodKey(it.key)}
              >
                {it.label}
                {it.tag ? <span className="lbx-pill-tag">{it.tag}</span> : null}
              </button>
            ))}
          </RailGroup>

          <RailGroup title="Issue area">
            {ISSUE_FILTERS.map(([v, l]) => (
              <button
                key={v || 'all'}
                type="button"
                className={`lbx-pill${issueFilter === v ? ' is-active' : ''}`}
                onClick={() => setIssueFilter(v)}
              >
                {v ? <span className={`lbx-dot lbx-iss-${v}`} /> : null}
                {l}
              </button>
            ))}
          </RailGroup>

          <RailGroup title="Gov entity">
            {ENTITY_FILTERS.map(([v, l]) => (
              <button
                key={v || 'all'}
                type="button"
                className={`lbx-pill${entityFilter === v ? ' is-active' : ''}`}
                onClick={() => setEntityFilter(v)}
              >
                {l}
              </button>
            ))}
          </RailGroup>

          <RailGroup title="Min amount">
            <input
              type="range"
              min={0}
              max={MIN_STOPS.length - 1}
              step={1}
              value={minIdx}
              onChange={(e) => setMinIdx(Number(e.target.value))}
              className="lbx-slider"
              aria-label="Minimum amount"
            />
            <div className="lbx-slider-val">
              ≥ <span className="lbx-mono">{min === 0 ? '$0' : fmtSpend(min)}</span>
              {minIdx === MIN_STOPS.length - 1 ? '+' : ''}
            </div>
          </RailGroup>

          <p className="lbx-rail-note">Filters query the LDA data server-side. {SOURCE_LABEL}.</p>
        </aside>

        {/* ── right main column ── */}
        <main className="lbx-main">
          {/* stat cards */}
          <div className="lbx-stats">
            <StatCard
              label={`Disclosed spend · ${p.label}`}
              value={summary.loading ? '—' : fmtSpend(sm.totalSpend)}
              sub="Sum of lump filing amounts"
            />
            <StatCard
              label="Filings"
              value={summary.loading ? '—' : Number(sm.filings || 0).toLocaleString()}
              sub={p.label}
            />
            <StatCard
              label="Top issue by activity"
              value={
                byIssue.loading
                  ? '—'
                  : topIssue
                    ? ISSUE_LABEL[topIssue.bucket] || topIssue.issue
                    : '—'
              }
              sub={
                topIssue
                  ? `${Math.round((topIssue.share || 0) * 100)}% of filings`
                  : 'share of filings'
              }
            />
            <StatCard
              label="Revolving-door lobbyists"
              value={
                summary.loading ? '—' : Number(sm.revolvingDoorLobbyists || 0).toLocaleString()
              }
              sub="Flagged ex-government"
              amber
            />
          </div>

          {/* leaderboard / issue-mix hero */}
          <section className="lbx-card">
            <div className="lbx-card-head">
              <h2 className="lbx-card-title">
                {heroView === 'target' ? 'Top spenders' : 'Issue mix'} · {p.label}
                {partialText ? <span className="lbx-partial-chip">{partialText}</span> : null}
              </h2>
              <div className="lbx-controls">
                <div className="lbx-seg" role="group" aria-label="Rank by">
                  {[
                    ['client', 'By client'],
                    ['firm', 'By firm'],
                  ].map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      className={`lbx-seg-btn${rankBy === v ? ' is-active' : ''}`}
                      onClick={() => setRankBy(v)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div className="lbx-seg" role="group" aria-label="Hero view">
                  {[
                    ['target', 'Targeting share'],
                    ['issue', 'Issue mix'],
                  ].map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      className={`lbx-seg-btn${heroView === v ? ' is-active' : ''}`}
                      onClick={() => setHeroView(v)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {heroView === 'target' ? (
              <Leaderboard
                loading={spenders.loading}
                rows={spenderRows}
                rankBy={rankBy}
                onPick={openClientFiling}
                period={p.label}
                filingsInPeriod={spenders.data?.filingsInPeriod ?? null}
              />
            ) : (
              <IssueMix
                loading={byIssue.loading}
                issues={byIssue.data?.issues || []}
                analyzed={byIssue.data?.filingsAnalyzed || 0}
              />
            )}
          </section>

          {/* recent disclosures table (indented under the main column) */}
          <section className="lbx-card lbx-filings">
            <div className="lbx-card-head">
              <h2 className="lbx-card-title">Recent disclosures · {p.label}</h2>
              <div className="lbx-controls">
                <div className="lbx-seg" role="group" aria-label="Sort by">
                  {[
                    ['date', 'Most recent'],
                    ['amount', 'Largest'],
                  ].map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      className={`lbx-seg-btn${sort === v ? ' is-active' : ''}`}
                      onClick={() => setSort(v)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <span className="lbx-card-note">
                  {filings.loading ? 'Loading…' : `${totalCount.toLocaleString()} match`}
                </span>
              </div>
            </div>
            <div className="lbx-table-wrap">
              <table className="lbx-table">
                <thead>
                  <tr>
                    <th>Client (paying)</th>
                    <th>Firm</th>
                    <th>Issues</th>
                    <th>Targets</th>
                    <th className="r">Filed</th>
                    <th className="r">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((f, i) => (
                    <tr key={f.uuid || i} className="lbx-row" onClick={() => setSelected(f.uuid)}>
                      <td className="lbx-strong">{f.client || '—'}</td>
                      <td>{f.registrant || '—'}</td>
                      <td>
                        <span className="lbx-chips">
                          {(f.issues || []).slice(0, 2).map((is) => (
                            <IssueChip key={is.display || is.code} label={is.display || is.code} />
                          ))}
                          {(f.issues || []).length > 2 ? (
                            <span className="lbx-chip lbx-chip--more">+{f.issues.length - 2}</span>
                          ) : null}
                        </span>
                      </td>
                      <td className="lbx-muted lbx-truncate">
                        {(f.entities || []).slice(0, 2).join(', ') || '—'}
                        {(f.entities || []).length > 2 ? ` +${f.entities.length - 2}` : ''}
                      </td>
                      <td className="lbx-mono r lbx-muted">{fmtDate(f.posted)}</td>
                      <td className="r">
                        {hasReportedAmount(f) ? (
                          <span className="lbx-mono">{fmtSpend(f.amount)}</span>
                        ) : (
                          <span className="lbx-noamount">
                            {f.isRegistration ? 'Registration' : 'No $'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!filings.loading && results.length === 0 && (
                    <tr>
                      <td colSpan={6} className="lbx-empty">
                        No lobbying disclosures match these filters for {p.label}.
                      </td>
                    </tr>
                  )}
                  {filings.loading && (
                    <tr>
                      <td colSpan={6} className="lbx-empty">
                        Loading disclosures…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalCount > 25 ? (
              <div className="lbx-pager">
                <button
                  type="button"
                  className="lbx-pager-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((n) => Math.max(1, n - 1))}
                >
                  Previous
                </button>
                <span className="lbx-pager-info">
                  Page {page} of {Math.max(1, Math.ceil(totalCount / 25))}
                </span>
                <button
                  type="button"
                  className="lbx-pager-btn"
                  disabled={!filings.data?.next}
                  onClick={() => setPage((n) => n + 1)}
                >
                  Next
                </button>
              </div>
            ) : null}
            <p className="lbx-note">
              {SOURCE_LABEL} · {p.label}
            </p>
          </section>
        </main>
      </div>

      {selected ? <FilingModal uuid={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

/* ── ticker ── */
function LobbyingTicker({ filings }) {
  const items = useMemo(
    () => filings.filter((f) => f.client && hasReportedAmount(f)).slice(0, 16),
    [filings],
  );
  if (!items.length) return <div className="lbx-ticker lbx-ticker--empty" aria-hidden />;
  const loop = [...items, ...items];
  return (
    <div className="lbx-ticker" aria-hidden="true">
      <div className="lbx-ticker-track">
        {loop.map((f, i) => (
          <span className="lbx-titem" key={i}>
            <span className="lbx-ttag">LOBBYING</span>
            <span className="lbx-tclient">{f.client}</span>
            <span className="lbx-tamt lbx-mono">{fmtSpend(f.amount)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function RailGroup({ title, children }) {
  return (
    <div className="lbx-rg">
      <div className="lbx-rg-title">{title}</div>
      <div className="lbx-rg-body">{children}</div>
    </div>
  );
}

function StatCard({ label, value, sub, amber }) {
  return (
    <div className={`lbx-stat${amber ? ' lbx-stat--amber' : ''}`}>
      <div className="lbx-stat-label">{label}</div>
      <div className="lbx-stat-value">{value}</div>
      <div className="lbx-stat-sub">{sub}</div>
    </div>
  );
}

function IssueChip({ label }) {
  // color by issue bucket via a data attribute → CSS var
  return <span className="lbx-chip lbx-ichip">{label}</span>;
}

/* ── leaderboard: bar LENGTH = $ total, SEGMENTS = targeting activity share ── */
function Leaderboard({ loading, rows, rankBy, onPick, period, filingsInPeriod }) {
  const top = rows.slice(0, 12);
  const max = top.length ? Math.max(...top.map((s) => s.total), 1) : 1;
  if (loading) return <div className="lbx-empty">Loading leaderboard…</div>;
  if (!top.length) {
    // Distinguish real sparseness (filings loaded, but mostly registrations with
    // no dollar figure yet) from "nothing ingested" so this never reads as a bug.
    if (filingsInPeriod > 0)
      return (
        <div className="lbx-empty">
          No disclosed spend for {period} yet — {filingsInPeriod.toLocaleString()} filing
          {filingsInPeriod === 1 ? '' : 's'} loaded, mostly registrations (no dollar figure). Try FY
          2025.
        </div>
      );
    return <div className="lbx-empty">No spender data for {period} yet.</div>;
  }

  return (
    <div>
      <div className="lbx-lb">
        {top.map((s, i) => {
          const dollarPct = Math.max(2, (s.total / max) * 100);
          const segTotal = (s.targeting || []).reduce((a, b) => a + b.share, 0) || 1;
          return (
            <div
              key={s.name}
              className="lbx-lb-row"
              role="button"
              tabIndex={0}
              onClick={() => onPick(s.name)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onPick(s.name)}
            >
              <span className="lbx-lb-rank lbx-mono">{i + 1}</span>
              <span className="lbx-lb-name" title={s.name}>
                {s.name}
              </span>
              <span className="lbx-lb-track">
                <span className="lbx-lb-bar" style={{ width: `${dollarPct}%` }}>
                  {rankBy === 'client' && s.targeting?.length ? (
                    s.targeting.map((t) => (
                      <span
                        key={t.bucket}
                        className={`lbx-lb-seg lbx-ent-bg-${t.bucket}`}
                        style={{ width: `${(t.share / segTotal) * 100}%` }}
                        title={`${ENTITY_LABEL[t.bucket] || t.bucket}: ${Math.round(t.share * 100)}% of filings`}
                      />
                    ))
                  ) : (
                    <span className="lbx-lb-seg lbx-lb-seg--solid" style={{ width: '100%' }} />
                  )}
                </span>
              </span>
              <span className="lbx-lb-val lbx-mono">{fmtSpend(s.total)}</span>
            </div>
          );
        })}
      </div>

      {rankBy === 'client' ? (
        <>
          <div className="lbx-legend">
            {ENTITY_ORDER.filter((b) => b !== 'other').map((b) => (
              <span key={b} className="lbx-legend-item">
                <span className={`lbx-dot lbx-ent-bg-${b}`} />
                {ENTITY_LABEL[b]}
              </span>
            ))}
          </div>
          <p className="lbx-info">
            <Info size={13} />
            Bar length = total disclosed spend. Colored segments = share of that client&apos;s
            filings citing each government entity —{' '}
            <strong>targeting activity, not dollars per entity</strong> (the LDA does not itemize
            dollars per target).
          </p>
        </>
      ) : (
        <p className="lbx-info">
          <Info size={13} />
          Bar length = the firm&apos;s total disclosed spend. Targeting segments are a client-level
          view, so firm bars are shown solid.
        </p>
      )}
    </div>
  );
}

/* ── issue mix donut: SHARE OF FILINGS by issue (never a dollar split) ── */
function IssueMix({ loading, issues, analyzed }) {
  const top = issues.slice(0, 8);
  if (loading) return <div className="lbx-empty">Loading issue mix…</div>;
  if (!top.length) return <div className="lbx-empty">No issue activity for this period yet.</div>;

  const total = top.reduce((a, b) => a + b.filings, 0) || 1;
  let acc = 0;
  const R = 60;
  const C = 2 * Math.PI * R;
  const segs = top.map((it) => {
    const frac = it.filings / total;
    const seg = { ...it, frac, offset: acc };
    acc += frac;
    return seg;
  });

  return (
    <div className="lbx-mix">
      <svg viewBox="0 0 160 160" className="lbx-donut" role="img" aria-label="Issue mix">
        {segs.map((s) => (
          <circle
            key={s.issue}
            cx="80"
            cy="80"
            r={R}
            fill="none"
            className={`lbx-donut-seg lbx-iss-stroke-${s.bucket}`}
            strokeWidth="20"
            strokeDasharray={`${s.frac * C} ${C}`}
            strokeDashoffset={-s.offset * C}
            transform="rotate(-90 80 80)"
          />
        ))}
        <text x="80" y="74" textAnchor="middle" className="lbx-donut-num">
          {analyzed.toLocaleString()}
        </text>
        <text x="80" y="92" textAnchor="middle" className="lbx-donut-lbl">
          filings
        </text>
      </svg>
      <div className="lbx-mix-list">
        {segs.map((s) => (
          <div className="lbx-mix-item" key={s.issue}>
            <span className={`lbx-dot lbx-iss-${s.bucket}`} />
            <span className="lbx-mix-name" title={s.issue}>
              {s.issue}
            </span>
            <span className="lbx-mono lbx-mix-pct">{Math.round(s.frac * 100)}%</span>
          </div>
        ))}
        <p className="lbx-info">
          <Info size={13} />
          Counts filings that cite each issue — <strong>activity, not a dollar split</strong>.
        </p>
      </div>
    </div>
  );
}

/* ── split-screen filing drill-down modal ── */
function FilingModal({ uuid, onClose }) {
  const { loading, data } = useJson(`/api/lobbying/filing/${uuid}`, [uuid]);
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);
  const f = data?.filing;
  const q = f?.period && /q[1-4]/i.test(String(f.period)) ? f.period : f?.period;

  return (
    <div className="lbx-modal-backdrop" onClick={onClose}>
      <div
        className="lbx-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {loading ? (
          <div className="lbx-empty" style={{ padding: 40 }}>
            Loading filing…
          </div>
        ) : !f ? (
          <div className="lbx-empty" style={{ padding: 40 }}>
            Filing detail unavailable.
          </div>
        ) : (
          <div className="lbx-modal-grid">
            <div className="lbx-modal-left">
              {q ? <span className="lbx-modal-qchip lbx-mono">{q}</span> : null}
              <h3 className="lbx-modal-client">{f.client || '—'}</h3>
              <p className="lbx-modal-via">via {f.registrant || '—'}</p>
              <div className="lbx-modal-2x2">
                <div>
                  <span className="lbx-modal-k">Amount</span>
                  <span className="lbx-modal-v lbx-mono">
                    {hasReportedAmount(f)
                      ? fmtSpend(f.amount)
                      : f.isRegistration
                        ? 'Registration'
                        : '—'}
                  </span>
                </div>
                <div>
                  <span className="lbx-modal-k">Date filed</span>
                  <span className="lbx-modal-v lbx-mono">{fmtDate(f.posted)}</span>
                </div>
                <div>
                  <span className="lbx-modal-k">Filing type</span>
                  <span className="lbx-modal-v">{f.type || '—'}</span>
                </div>
                <div>
                  <span className="lbx-modal-k">Lobbyists</span>
                  <span className="lbx-modal-v lbx-mono">{f.lobbyistCount || 0}</span>
                </div>
              </div>
              {f.lobbyists?.length ? (
                <>
                  <div className="lbx-modal-sec">Named lobbyists</div>
                  <ul className="lbx-modal-lobs">
                    {f.lobbyists.map((l, i) => (
                      <li key={l.id || i}>
                        <span>{l.name || '—'}</span>
                        {l.revolvingDoor ? (
                          <span
                            className="lbx-revolve"
                            title={l.coveredPosition || 'Covered gov position'}
                          >
                            <RefreshCw size={11} /> revolving door
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {f.url ? (
                <a
                  className="lbx-modal-official"
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View official filing <ArrowUpRight size={14} />
                </a>
              ) : null}
            </div>

            <div className="lbx-modal-right">
              <button type="button" className="lbx-modal-x" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
              <div className="lbx-modal-sec">
                Government entities targeted · {f.entities?.length || 0}
              </div>
              {f.entities?.length ? (
                <div className="lbx-chips">
                  {f.entities.map((e) => (
                    <span key={e} className="lbx-chip lbx-echip">
                      {e}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="lbx-modal-muted">Not specified.</p>
              )}
              <p className="lbx-info lbx-info--tight">
                <Info size={13} />
                The disclosed amount covers all entities and issues on this filing; the LDA does not
                itemize dollars per target.
              </p>

              <div className="lbx-modal-sec" style={{ marginTop: 12 }}>
                Issues lobbied · {f.issues?.length || 0}
              </div>
              {f.issues?.length ? (
                <div className="lbx-chips">
                  {f.issues.map((is) => (
                    <IssueChip key={is.display || is.code} label={is.display || is.code} />
                  ))}
                </div>
              ) : (
                <p className="lbx-modal-muted">Not specified.</p>
              )}
              {f.activities?.length ? (
                <div className="lbx-modal-desc">
                  {f.activities
                    .map((a) => a.description)
                    .filter(Boolean)
                    .slice(0, 3)
                    .map((d, i) => (
                      <p key={i}>{d}</p>
                    ))}
                </div>
              ) : null}

              <div className="lbx-modal-actions">
                <button type="button" className="lbx-btn lbx-btn-primary">
                  Track this client
                </button>
                {f.url ? (
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lbx-btn lbx-btn-outline"
                  >
                    Official filing <ArrowUpRight size={13} />
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        )}
        <div className="lbx-modal-foot">
          <span>
            <ExternalLink size={11} /> Source: Senate LDA · lda.gov
          </span>
        </div>
      </div>
    </div>
  );
}
