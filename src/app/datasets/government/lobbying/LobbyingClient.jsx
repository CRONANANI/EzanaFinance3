'use client';

/**
 * Lobbying Activity — redesigned dataset family (gov-contracts / political
 * tracker sibling). Presentation layer only: every figure is read from the
 * /api/lobbying/* routes (Senate LDA via lda.gov, Supabase-first cache, live
 * fallback, honest empty). NO mock data. Neutral: who paid whom, amounts,
 * issues — no editorializing.
 *
 * Reuses the shared CategoryBar (Capitol Watch active). Page-scoped `lbx-`
 * classes; tokens only (see lobbying.css). Rail filters do REAL server-side
 * filtering by re-querying /api/lobbying/filings.
 */
import { useMemo, useState, useEffect, useCallback } from 'react';
import { X, ArrowUpRight, ExternalLink } from 'lucide-react';
import CategoryBar from '@/components/datasets/CategoryBar';
import './lobbying.css';

const YEARS = [2026, 2025, 2024];
const SOURCE_LABEL = 'Source: Senate LDA · lda.gov';

function fmtUSD(v) {
  const n = Number(v) || 0;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── data hook ── */
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
  const [year, setYear] = useState(2026);
  const [issue, setIssue] = useState('');
  const [entity, setEntity] = useState('');
  const [filingType, setFilingType] = useState('');
  const [minAmount, setMinAmount] = useState(0); // in $K
  const [heroView, setHeroView] = useState('issue'); // 'issue' | 'spenders'
  const [spenderBy, setSpenderBy] = useState('client'); // 'client' | 'registrant'
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null); // filing uuid for modal

  // reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [year, issue, entity, filingType, minAmount]);

  const constants = useJson('/api/lobbying/constants', []);
  const summary = useJson(`/api/lobbying/summary?year=${year}`, [year]);
  const byIssue = useJson(`/api/lobbying/by-issue?year=${year}`, [year]);
  const spenders = useJson(`/api/lobbying/top-spenders?year=${year}&by=${spenderBy}`, [
    year,
    spenderBy,
  ]);

  const minAmt = minAmount * 1000;
  const filingsUrl = useMemo(() => {
    const p = new URLSearchParams({ year: String(year), page: String(page), sort: 'amount' });
    if (issue) p.set('issue', issue);
    if (entity) p.set('entity', entity);
    if (filingType) p.set('type', filingType);
    if (minAmt > 0) p.set('minAmount', String(minAmt));
    return `/api/lobbying/filings?${p.toString()}`;
  }, [year, page, issue, entity, filingType, minAmt]);
  const filings = useJson(filingsUrl, [filingsUrl]);

  const results = filings.data?.results || [];
  const totalCount = filings.data?.count || 0;
  const issueVocab = constants.data?.issues || [];
  const entityVocab = constants.data?.entities || [];
  const typeVocab = constants.data?.filingTypes || [];

  // Revolving-door brokers: aggregate lobbyists across the loaded filings.
  const revolvers = useMemo(() => {
    const acc = new Map();
    for (const f of results) {
      for (const l of f.lobbyists || []) {
        if (!l.name) continue;
        if (!acc.has(l.name)) {
          acc.set(l.name, {
            name: l.name,
            filings: 0,
            clients: new Set(),
            spend: 0,
            revolvingDoor: false,
            coveredPosition: null,
          });
        }
        const e = acc.get(l.name);
        e.filings += 1;
        if (f.client) e.clients.add(f.client);
        e.spend += Number(f.amount) || 0;
        if (l.revolvingDoor) {
          e.revolvingDoor = true;
          e.coveredPosition = e.coveredPosition || l.coveredPosition;
        }
      }
    }
    return [...acc.values()]
      .map((e) => ({ ...e, clients: e.clients.size }))
      .sort((a, b) => b.filings - a.filings || b.spend - a.spend)
      .slice(0, 10);
  }, [results]);

  const resetFilters = useCallback(() => {
    setIssue('');
    setEntity('');
    setFilingType('');
    setMinAmount(0);
  }, []);
  const hasFilters = issue || entity || filingType || minAmount > 0;

  const sm = summary.data || {};

  return (
    <div className="lbx-page">
      <CategoryBar active="capitol" activeItem="Lobbying Activity" />

      <header className="lbx-header">
        <p className="lbx-eyebrow">DATASETS · SENATE LDA DISCLOSURES</p>
        <h1 className="lbx-title">Lobbying activity</h1>
        <p className="lbx-sub">
          Who&apos;s paying whom to influence Washington — Lobbying Disclosure Act filings.
        </p>
      </header>

      {/* stat strip */}
      <div className="lbx-stats">
        <StatCard
          label={`Total lobbying spend · ${year}`}
          value={summary.loading ? '—' : fmtUSD(sm.totalSpend)}
          sub="Reported income + expenses"
        />
        <StatCard
          label="Active registrants"
          value={summary.loading ? '—' : Number(sm.registrants || 0).toLocaleString()}
          sub="Lobbying firms"
        />
        <StatCard
          label="Active clients"
          value={summary.loading ? '—' : Number(sm.clients || 0).toLocaleString()}
          sub="Orgs paying to lobby"
        />
        <StatCard
          label="Filings"
          value={summary.loading ? '—' : Number(sm.filings || 0).toLocaleString()}
          sub={`Cached · ${year}`}
        />
      </div>

      <div className="lbx-body">
        {/* filter rail */}
        <aside className="lbx-rail">
          <div className="lbx-rail-head">
            <span>Filters</span>
            {hasFilters ? (
              <button type="button" className="lbx-rail-reset" onClick={resetFilters}>
                Reset
              </button>
            ) : null}
          </div>

          <FilterSelect
            label="Year"
            value={String(year)}
            onChange={(v) => setYear(Number(v))}
            options={YEARS.map((y) => ({ value: String(y), label: String(y) }))}
          />

          <FilterSelect
            label="Issue area"
            value={issue}
            onChange={setIssue}
            placeholder="All issues"
            options={issueVocab}
          />
          <FilterSelect
            label="Government entity"
            value={entity}
            onChange={setEntity}
            placeholder="All entities"
            options={entityVocab.map((e) => ({ value: e.label, label: e.label }))}
          />
          <FilterSelect
            label="Filing type"
            value={filingType}
            onChange={setFilingType}
            placeholder="All types"
            options={typeVocab}
          />

          <div className="lbx-filter">
            <label className="lbx-filter-label" htmlFor="lbx-min">
              Min amount
            </label>
            <input
              id="lbx-min"
              type="range"
              min={0}
              max={1000}
              step={25}
              value={minAmount}
              onChange={(e) => setMinAmount(Number(e.target.value))}
              className="lbx-slider"
            />
            <div className="lbx-slider-val">
              ≥ <span className="lbx-mono">${minAmount}K</span>
            </div>
          </div>

          <p className="lbx-rail-note">
            Filters query the Senate LDA data server-side. {SOURCE_LABEL}.
          </p>
        </aside>

        {/* main column */}
        <main className="lbx-main">
          {/* hero card with toggle */}
          <section className="lbx-card lbx-hero">
            <div className="lbx-hero-head">
              <h2 className="lbx-card-title">
                {heroView === 'issue' ? `Spending by issue · ${year}` : `Top spenders · ${year}`}
              </h2>
              <div className="lbx-seg" role="group" aria-label="Hero view">
                <button
                  type="button"
                  className={`lbx-seg-btn${heroView === 'issue' ? ' is-active' : ''}`}
                  aria-pressed={heroView === 'issue'}
                  onClick={() => setHeroView('issue')}
                >
                  Spending by issue
                </button>
                <button
                  type="button"
                  className={`lbx-seg-btn${heroView === 'spenders' ? ' is-active' : ''}`}
                  aria-pressed={heroView === 'spenders'}
                  onClick={() => setHeroView('spenders')}
                >
                  Top spenders
                </button>
              </div>
            </div>

            {heroView === 'issue' ? (
              <IssueBars loading={byIssue.loading} issues={byIssue.data?.issues || []} />
            ) : (
              <>
                <div className="lbx-seg lbx-seg--sub" role="group" aria-label="Rank spenders by">
                  {[
                    ['client', 'By client'],
                    ['registrant', 'By registrant'],
                  ].map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      className={`lbx-seg-btn${spenderBy === v ? ' is-active' : ''}`}
                      aria-pressed={spenderBy === v}
                      onClick={() => setSpenderBy(v)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <SpenderBars loading={spenders.loading} spenders={spenders.data?.spenders || []} />
              </>
            )}
          </section>

          {/* revolving-door card */}
          <section className="lbx-card">
            <div className="lbx-card-head">
              <h2 className="lbx-card-title">Most active lobbyists</h2>
              <span className="lbx-card-note">Across loaded filings · revolving-door flagged</span>
            </div>
            <div className="lbx-table-wrap">
              <table className="lbx-table">
                <thead>
                  <tr>
                    <th>Lobbyist</th>
                    <th className="r">Filings</th>
                    <th className="r">Clients</th>
                    <th className="r">Represented $</th>
                  </tr>
                </thead>
                <tbody>
                  {revolvers.map((r) => (
                    <tr key={r.name}>
                      <td>
                        <span className="lbx-lob-name">{r.name}</span>
                        {r.revolvingDoor ? (
                          <span
                            className="lbx-revolve"
                            title={
                              r.coveredPosition || 'Formerly held a covered government position'
                            }
                          >
                            ↻ revolving door
                          </span>
                        ) : null}
                      </td>
                      <td className="lbx-mono r">{r.filings}</td>
                      <td className="lbx-mono r">{r.clients}</td>
                      <td className="lbx-mono r">{fmtUSD(r.spend)}</td>
                    </tr>
                  ))}
                  {!filings.loading && revolvers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="lbx-empty">
                        No lobbyist data in the current filing set yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* recent filings — full width */}
      <section className="lbx-card lbx-filings">
        <div className="lbx-card-head">
          <h2 className="lbx-card-title">
            {hasFilters ? 'Filtered filings' : 'Recent filings'} · {year}
          </h2>
          <span className="lbx-card-note">
            {filings.loading ? 'Loading…' : `${totalCount.toLocaleString()} match`}
          </span>
        </div>
        <div className="lbx-table-wrap">
          <table className="lbx-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Client (paying)</th>
                <th>Registrant (firm)</th>
                <th>Issues</th>
                <th className="r">Amount</th>
                <th className="r">Lobbyists</th>
                <th>Period</th>
              </tr>
            </thead>
            <tbody>
              {results.map((f, i) => (
                <tr key={f.uuid || i} className="lbx-row" onClick={() => setSelected(f.uuid)}>
                  <td className="lbx-mono lbx-muted">{(page - 1) * 25 + i + 1}</td>
                  <td className="lbx-strong">{f.client || '—'}</td>
                  <td>{f.registrant || '—'}</td>
                  <td>
                    <span className="lbx-chips">
                      {(f.issues || []).slice(0, 3).map((is) => (
                        <span key={is.display || is.code} className="lbx-chip">
                          {is.display || is.code}
                        </span>
                      ))}
                      {(f.issues || []).length > 3 ? (
                        <span className="lbx-chip lbx-chip--more">+{f.issues.length - 3}</span>
                      ) : null}
                    </span>
                  </td>
                  <td className="lbx-mono r">{f.amount != null ? fmtUSD(f.amount) : '—'}</td>
                  <td className="lbx-mono r">{f.lobbyistCount || 0}</td>
                  <td className="lbx-muted">{f.period || '—'}</td>
                </tr>
              ))}
              {!filings.loading && results.length === 0 && (
                <tr>
                  <td colSpan={7} className="lbx-empty">
                    No lobbying filings match the current filters for {year}.
                  </td>
                </tr>
              )}
              {filings.loading && (
                <tr>
                  <td colSpan={7} className="lbx-empty">
                    Loading filings…
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
        <p className="lbx-note">
          {SOURCE_LABEL} · filing year {year}
        </p>
      </section>

      {selected ? <FilingModal uuid={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

/* ── small building blocks ── */
function StatCard({ label, value, sub }) {
  return (
    <div className="lbx-stat">
      <div className="lbx-stat-label">{label}</div>
      <div className="lbx-stat-value">{value}</div>
      <div className="lbx-stat-sub">{sub}</div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, placeholder }) {
  return (
    <div className="lbx-filter">
      <label className="lbx-filter-label">{label}</label>
      <select className="lbx-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function IssueBars({ loading, issues }) {
  if (loading) return <div className="lbx-empty">Loading issue spending…</div>;
  if (!issues.length)
    return <div className="lbx-empty">No issue-area spending ingested for this year yet.</div>;
  const max = Math.max(...issues.map((i) => i.amount), 1);
  return (
    <div className="lbx-bars">
      {issues.slice(0, 12).map((i) => (
        <div key={i.issue} className="lbx-bar-row">
          <span className="lbx-bar-label" title={i.issue}>
            {i.issue}
          </span>
          <span className="lbx-bar-track">
            <span className="lbx-bar-fill" style={{ width: `${(i.amount / max) * 100}%` }} />
          </span>
          <span className="lbx-mono lbx-bar-val">{fmtUSD(i.amount)}</span>
        </div>
      ))}
    </div>
  );
}

function SpenderBars({ loading, spenders }) {
  if (loading) return <div className="lbx-empty">Loading top spenders…</div>;
  if (!spenders.length)
    return <div className="lbx-empty">No spender data ingested for this year yet.</div>;
  const max = Math.max(...spenders.map((s) => s.total), 1);
  return (
    <div className="lbx-bars">
      {spenders.slice(0, 12).map((s, i) => (
        <div key={s.name} className="lbx-bar-row">
          <span className="lbx-bar-label" title={s.name}>
            {i + 1}. {s.name}
          </span>
          <span className="lbx-bar-track">
            <span className="lbx-bar-fill" style={{ width: `${(s.total / max) * 100}%` }} />
          </span>
          <span className="lbx-mono lbx-bar-val">{fmtUSD(s.total)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── filing drill-down modal (split pattern) ── */
function FilingModal({ uuid, onClose }) {
  const { loading, data } = useJson(`/api/lobbying/filing/${uuid}`, [uuid]);
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);
  const f = data?.filing;

  return (
    <div className="lbx-modal-backdrop" onClick={onClose}>
      <div
        className="lbx-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="lbx-modal-x" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        {loading ? (
          <div className="lbx-empty">Loading filing…</div>
        ) : !f ? (
          <div className="lbx-empty">Filing detail unavailable.</div>
        ) : (
          <div className="lbx-modal-grid">
            <div className="lbx-modal-left">
              <div className="lbx-modal-eyebrow">{f.type || 'Filing'}</div>
              <h3 className="lbx-modal-title">{f.client || '—'}</h3>
              <p className="lbx-modal-sub">
                Registrant: <strong>{f.registrant || '—'}</strong>
              </p>
              <div className="lbx-modal-stats">
                <div>
                  <span className="lbx-modal-stat-label">Amount</span>
                  <span className="lbx-modal-stat-value lbx-mono">
                    {f.amount != null ? fmtUSD(f.amount) : '—'}
                  </span>
                </div>
                <div>
                  <span className="lbx-modal-stat-label">Period</span>
                  <span className="lbx-modal-stat-value">{f.period || '—'}</span>
                </div>
                <div>
                  <span className="lbx-modal-stat-label">Posted</span>
                  <span className="lbx-modal-stat-value">{fmtDate(f.posted)}</span>
                </div>
              </div>
              {f.clientDescription ? <p className="lbx-modal-desc">{f.clientDescription}</p> : null}
              {f.url ? (
                <a
                  className="lbx-modal-link"
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Official filing <ExternalLink size={13} />
                </a>
              ) : null}
            </div>

            <div className="lbx-modal-right">
              <div className="lbx-modal-h">Government entities lobbied</div>
              {f.entities?.length ? (
                <div className="lbx-chips">
                  {f.entities.map((e) => (
                    <span key={e} className="lbx-chip">
                      {e}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="lbx-modal-muted">Not specified.</p>
              )}

              <div className="lbx-modal-h" style={{ marginTop: 14 }}>
                Issues lobbied
              </div>
              {f.activities?.length ? (
                <ul className="lbx-modal-issues">
                  {f.activities.map((a, i) => (
                    <li key={i}>
                      <span className="lbx-chip lbx-chip--solid">
                        {a.issueDisplay || a.issueCode}
                      </span>
                      {a.description ? (
                        <span className="lbx-modal-issue-desc">{a.description}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : f.issues?.length ? (
                <div className="lbx-chips">
                  {f.issues.map((is) => (
                    <span key={is.display || is.code} className="lbx-chip">
                      {is.display || is.code}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="lbx-modal-muted">Not specified.</p>
              )}

              <div className="lbx-modal-h" style={{ marginTop: 14 }}>
                Lobbyists
              </div>
              {f.lobbyists?.length ? (
                <ul className="lbx-modal-lobbyists">
                  {f.lobbyists.map((l, i) => (
                    <li key={l.id || i}>
                      <span>{l.name || '—'}</span>
                      {l.revolvingDoor ? (
                        <span
                          className="lbx-revolve"
                          title={l.coveredPosition || 'Covered gov position'}
                        >
                          ↻ revolving door
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="lbx-modal-muted">No named lobbyists on this filing.</p>
              )}
            </div>
          </div>
        )}
        <div className="lbx-modal-foot">
          Source: Senate LDA · lda.gov
          {f?.url ? (
            <a
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="lbx-modal-foot-link"
            >
              View source <ArrowUpRight size={12} />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
