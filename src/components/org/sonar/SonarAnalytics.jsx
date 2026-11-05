'use client';

/**
 * SonarAnalytics: Sonar Research > Analytics.
 *
 * The fund's research activity and quality over a window (30, 90, 365 days
 * or all time): totals, one line per member (executives and portfolio
 * managers see everyone, anyone else sees themselves) and the fund's
 * coverage by sector and ticker with the last approval date.
 * Coaching signals for the desk, not grades.
 *
 * Tokens only (EZANA_BRANDING_GUIDE), Bootstrap Icons, prefix osr-.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import './org-sonar.css';

const ROLE = { executive: 'Executive', portfolio_manager: 'Portfolio Manager', analyst: 'Analyst' };
const WINDOWS = [
  { v: '30', l: '30 days' },
  { v: '90', l: '90 days' },
  { v: '365', l: '12 months' },
  { v: 'all', l: 'All time' },
];

const pct = (v) => (Number.isFinite(v) ? `${Math.round(v * 100)}%` : 'n/a');
const num = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : 'n/a');

const COLUMNS = [
  { id: 'name', label: 'Member', sort: (m) => m.name },
  { id: 'deepRuns', label: 'Deep runs', sort: (m) => m.deepRuns },
  { id: 'reports', label: 'Reports', sort: (m) => m.reports },
  { id: 'approved', label: 'Approved', sort: (m) => m.approved },
  { id: 'approvalRate', label: 'Approval rate', sort: (m) => m.approvalRate ?? -1 },
  { id: 'claimSupport', label: 'Claims verified', sort: (m) => m.claimSupport ?? -1 },
  { id: 'heldRate', label: 'Held under challenge', sort: (m) => m.heldRate ?? -1 },
  { id: 'onPitches', label: 'On pitches', sort: (m) => m.onPitches },
  { id: 'coverage', label: 'Tickers', sort: (m) => m.tickers.length },
];

export default function SonarAnalytics() {
  const [days, setDays] = useState('90');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('approved');
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/org/sonar-analytics?days=${days}`, { credentials: 'include' });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error || 'Analytics could not be loaded.');
      setData(body);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [days]);
  useEffect(() => {
    load();
  }, [load]);

  const members = useMemo(() => {
    const col = COLUMNS.find((c) => c.id === sortBy) || COLUMNS[3];
    const list = [...(data?.members || [])];
    list.sort((a, b) => {
      const x = col.sort(a);
      const y = col.sort(b);
      return typeof x === 'string' ? x.localeCompare(y) : y - x;
    });
    return list;
  }, [data, sortBy]);

  if (error && !data)
    return (
      <p className="osr-error" role="alert">
        {error}
      </p>
    );
  if (!data) return <p className="osr-muted">Loading analytics.</p>;
  const t = data.totals;

  return (
    <div className="osr-analytics">
      <div className="osr-filters">
        <div className="osr-modes" role="radiogroup" aria-label="Window">
          {WINDOWS.map((w) => (
            <button
              key={w.v}
              type="button"
              role="radio"
              aria-checked={days === w.v}
              className={`osr-mode${days === w.v ? ' is-active' : ''}`}
              onClick={() => setDays(w.v)}
            >
              {w.l}
            </button>
          ))}
        </div>
      </div>

      <section className="osr-tiles" aria-label="Totals">
        <Tile label="Deep research runs" value={t.deepRuns} />
        <Tile label="Reports saved" value={t.reports} />
        <Tile label="Approved" value={t.approved} />
        <Tile label="Under review" value={t.underReview} />
        <Tile label="Challenges" value={t.challenges} />
        <Tile label="Claims verified" value={pct(t.claimSupport)} />
        <Tile label="Tickers researched" value={t.tickers} />
      </section>

      <section className="osr-panel" aria-labelledby="osr-members-h">
        <p id="osr-members-h" className="osr-h3">
          <i className="bi bi-people" aria-hidden="true" />{' '}
          {data.viewer.seesEveryone ? 'Members' : 'Your research'}
        </p>
        <p className="osr-muted">
          Coaching signals for the desk, from what Sonar and the review process record. Claims
          verified is the share of a report&rsquo;s claims that passed Sonar&rsquo;s validation;
          held under challenge is how often a conclusion survived a challenge.
        </p>
        {members.length ? (
          <div className="osr-table-wrap">
            <table className="osr-table">
              <thead>
                <tr>
                  {COLUMNS.map((c) => (
                    <th key={c.id} scope="col" aria-sort={sortBy === c.id ? 'descending' : 'none'}>
                      <button type="button" className="osr-th" onClick={() => setSortBy(c.id)}>
                        {c.label}
                        {sortBy === c.id ? (
                          <i className="bi bi-caret-down-fill" aria-hidden="true" />
                        ) : null}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <MemberRow
                    key={m.userId}
                    m={m}
                    open={open === m.userId}
                    onToggle={() => setOpen(open === m.userId ? null : m.userId)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="osr-empty">No Sonar research in this window yet.</p>
        )}
      </section>

      <section className="osr-panel" aria-labelledby="osr-cov-h">
        <p id="osr-cov-h" className="osr-h3">
          <i className="bi bi-grid-3x3-gap" aria-hidden="true" /> The fund&rsquo;s coverage
        </p>
        <p className="osr-muted">Approved research by sector and ticker, all time.</p>
        {data.coverage.length ? (
          <div className="osr-table-wrap">
            <table className="osr-table">
              <thead>
                <tr>
                  <th scope="col">Sector</th>
                  <th scope="col">Ticker</th>
                  <th scope="col">Approved reports</th>
                  <th scope="col">Authors</th>
                  <th scope="col">Last approved</th>
                </tr>
              </thead>
              <tbody>
                {data.coverage.map((c) => (
                  <tr key={`${c.sector}|${c.ticker}`}>
                    <td>{c.sector}</td>
                    <td className="osr-mono">{c.ticker || 'n/a'}</td>
                    <td className="osr-mono">{c.approved}</td>
                    <td className="osr-mono">{c.authors}</td>
                    <td className={`osr-mono${c.staleDays > 120 ? ' osr-stale' : ''}`}>
                      {String(c.lastApproved || '').slice(0, 10) || 'n/a'}
                      {c.staleDays > 120 ? ' (stale)' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="osr-empty">No approved research yet.</p>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value }) {
  return (
    <div className="osr-tile">
      <span className="osr-tile-val osr-mono">{value}</span>
      <span className="osr-tile-label">{label}</span>
    </div>
  );
}

function MemberRow({ m, open, onToggle }) {
  return (
    <>
      <tr>
        <td>
          <button type="button" className="osr-th" onClick={onToggle} aria-expanded={open}>
            <i
              className={`bi ${open ? 'bi-chevron-down' : 'bi-chevron-right'}`}
              aria-hidden="true"
            />
            <span className="osr-name">{m.name}</span>
          </button>
          <span className="osr-muted"> {ROLE[m.role] || ''}</span>
        </td>
        <td className="osr-mono">{m.deepRuns}</td>
        <td className="osr-mono">{m.reports}</td>
        <td className="osr-mono">{m.approved}</td>
        <td className="osr-mono">{pct(m.approvalRate)}</td>
        <td className="osr-mono">{pct(m.claimSupport)}</td>
        <td className="osr-mono">
          {m.challengesFaced ? `${pct(m.heldRate)} of ${m.challengesFaced}` : 'n/a'}
        </td>
        <td className="osr-mono">
          {m.onPitches}
          {m.pitchesAdvanced ? ` (${m.pitchesAdvanced} advanced)` : ''}
        </td>
        <td className="osr-mono">{m.tickers.length}</td>
      </tr>
      {open ? (
        <tr className="osr-detail-row">
          <td colSpan={COLUMNS.length}>
            <dl className="osr-detail">
              <div>
                <dt>Standard runs</dt>
                <dd className="osr-mono">{m.standardRuns}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd className="osr-mono">{m.submitted}</dd>
              </div>
              <div>
                <dt>Days to approval</dt>
                <dd className="osr-mono">{num(m.reviewDays)}</dd>
              </div>
              <div>
                <dt>Citation coverage</dt>
                <dd className="osr-mono">{pct(m.citationCoverage)}</dd>
              </div>
              <div>
                <dt>Sources per report</dt>
                <dd className="osr-mono">{num(m.sourcesPerReport)}</dd>
              </div>
              <div>
                <dt>Challenges run</dt>
                <dd className="osr-mono">{m.challengesRun}</dd>
              </div>
              <div>
                <dt>Comments given</dt>
                <dd className="osr-mono">{m.commentsGiven}</dd>
              </div>
              <div>
                <dt>Comments received, resolved</dt>
                <dd className="osr-mono">
                  {m.commentsReceived}, {pct(m.commentsResolved)}
                </dd>
              </div>
              <div>
                <dt>Fund fit views</dt>
                <dd className="osr-mono">
                  {m.fundFit.invest} invest, {m.fundFit.watch} watch, {m.fundFit.pass} pass
                </dd>
              </div>
              <div className="osr-detail-wide">
                <dt>Tickers</dt>
                <dd className="osr-mono">{m.tickers.join(', ') || 'None yet'}</dd>
              </div>
              <div className="osr-detail-wide">
                <dt>Sectors</dt>
                <dd>{m.sectors.join(', ') || 'None yet'}</dd>
              </div>
            </dl>
          </td>
        </tr>
      ) : null}
    </>
  );
}
