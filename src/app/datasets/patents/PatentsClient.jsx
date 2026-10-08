'use client';

/**
 * Patent Activity: granted U.S. patents by first assignee, matched to tickers.
 * A momentum table (last 12 months against the 12 before), a company view
 * with 36 months of grants and its latest patents, the latest grants to
 * public companies, and grants by CPC section.
 */
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import HubQueryLink from '@/components/datasets/HubQueryLink';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import { CHART } from '@/lib/chart-theme';
import {
  DASH,
  fmtDate,
  fmtMonth,
  fmtNum,
  fmtSigned,
  tone,
  useEyesDetail,
} from '@/components/datasets/eyes/eyes-bits';
import './patents.css';

const CPC = {
  A: 'Human necessities',
  B: 'Operations and transport',
  C: 'Chemistry and metallurgy',
  D: 'Textiles and paper',
  E: 'Fixed constructions',
  F: 'Mechanical engineering',
  G: 'Physics',
  H: 'Electricity',
  Y: 'Emerging cross-sectional',
};
const cpcName = (s) => (s && CPC[s] ? `${s} ${CPC[s]}` : DASH);

const googleUrl = (id) => `https://patents.google.com/patent/US${String(id).replace(/[^\w]/g, '')}`;

function PatentLink({ id }) {
  return (
    <a className="pat-mono" href={googleUrl(id)} target="_blank" rel="noopener noreferrer">
      {id}
      <span className="pat-sr"> (opens Google Patents in a new tab)</span>
    </a>
  );
}

const COLS = [
  { key: 'ticker', label: 'Ticker' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'grants12', label: 'Grants, last 12 mo', num: true },
  { key: 'prior12', label: '12 mo before', num: true },
  { key: 'change', label: 'Change', num: true },
  { key: 'topCpc', label: 'Top CPC section' },
  { key: 'lastGrant', label: 'Last grant' },
];

function Company({ row, onClose }) {
  const state = useEyesDetail('company', row.ticker);
  const monthly = state.data?.monthly || [];
  const latest = state.data?.latest || [];
  return (
    <section className="pat-section pat-card" aria-labelledby="pat-co-h" aria-live="polite">
      <div className="pat-controls" style={{ marginTop: 0, justifyContent: 'space-between' }}>
        <h2 id="pat-co-h" className="pat-section-title">
          <span className="pat-ticker">{row.ticker}</span> {row.assignee}
        </h2>
        <button type="button" className="pat-btn" onClick={onClose}>
          <i className="bi bi-x-lg" aria-hidden="true" /> Close
        </button>
      </div>
      {state.status === 'loading' ? (
        <div aria-busy="true">
          <div className="pat-skel" />
          <div className="pat-skel" />
          <div className="pat-skel" />
        </div>
      ) : state.status === 'error' ? (
        <p className="pat-empty">
          This company&apos;s grants could not be loaded. Try again shortly.
        </p>
      ) : (
        <div className="pat-grid">
          <figure className="pat-card" style={{ margin: 0 }}>
            <figcaption className="pat-card-title">Grants per month, last 36 months</figcaption>
            {monthly.length ? (
              <div
                style={{ height: 240 }}
                role="img"
                aria-label={`${row.ticker} patent grants per month`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray={CHART.gridDash}
                      stroke={CHART.gridStroke}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={CHART.tick}
                      axisLine={CHART.xAxisLine}
                      tickLine={false}
                      tickFormatter={fmtMonth}
                      minTickGap={40}
                    />
                    <YAxis
                      tick={CHART.tick}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      allowDecimals={false}
                    />
                    <Tooltip
                      formatter={(v) => [fmtNum(v, 0), 'Grants']}
                      labelFormatter={fmtMonth}
                      contentStyle={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 12,
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                    <Bar dataKey="grants" fill="var(--cyan)" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="pat-empty">No grants in the last 36 months.</p>
            )}
          </figure>
          <div className="pat-card" style={{ minWidth: 0 }}>
            <h3 className="pat-card-title">Latest grants</h3>
            {latest.length ? (
              <div className="pat-table-wrap">
                <table className="pat-table">
                  <thead>
                    <tr>
                      <th scope="col">Patent</th>
                      <th scope="col">Title</th>
                      <th scope="col">Granted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latest.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <PatentLink id={p.id} />
                        </td>
                        <td className="pat-wrap">{p.title || DASH}</td>
                        <td className="pat-mono">{fmtDate(p.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="pat-empty">No grants loaded for this company.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default function PatentsClient({ data, error }) {
  const momentum = useMemo(() => data?.momentum || [], [data]);
  const recent = data?.recent || [];
  const sections = (data?.sections || []).filter((s) => s.grants > 0);
  const maxSection = Math.max(1, ...sections.map((s) => s.grants));
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ key: 'grants12', desc: true });
  const [open, setOpen] = useState(null);

  const view = useMemo(() => {
    const t = q.trim().toUpperCase();
    const list = t
      ? momentum.filter(
          (r) =>
            (r.ticker || '').toUpperCase().startsWith(t) ||
            (r.assignee || '').toUpperCase().includes(t),
        )
      : momentum;
    return [...list].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      const c = typeof x === 'string' ? x.localeCompare(y) : x - y;
      return sort.desc ? -c : c;
    });
  }, [momentum, q, sort]);

  const tickerItems = useMemo(
    () =>
      momentum
        .filter((m) => m.change != null)
        .slice(0, 20)
        .map((m) => ({
          id: m.ticker,
          lead: 'Patent grants, 12 mo',
          main: m.ticker,
          value: fmtSigned(m.change),
        })),
    [momentum],
  );
  usePublishTicker({ items: tickerItems, ariaLabel: 'Patent momentum' });

  const empty = !data?.total;

  return (
    <div className="pat-page">
      <header className="pat-header">
        <p className="pat-eyebrow">DATASETS · EYES ABOVE</p>
        <h1 className="pat-title">Patent Activity</h1>
        <p className="pat-sub">
          Which public companies are being granted more U.S. patents than a year ago, and in which
          fields.
        </p>
        {data?.through ? (
          <p className="pat-through">
            Data through <strong>{fmtDate(data.through)}</strong>
          </p>
        ) : null}
        <dl className="pat-stats" style={{ marginTop: 12 }}>
          <div className="pat-stat">
            <dt>Grants loaded</dt>
            <dd>{data?.total ? fmtNum(data.total, 0) : DASH}</dd>
          </div>
          <div className="pat-stat">
            <dt>Matched to a ticker</dt>
            <dd>{data?.matched ? fmtNum(data.matched, 0) : DASH}</dd>
          </div>
          <div className="pat-stat">
            <dt>Companies tracked</dt>
            <dd>{momentum.length ? momentum.length : DASH}</dd>
          </div>
        </dl>
      </header>

      <HubQueryLink dimension="eyes" />

      {error ? (
        <p className="pat-empty" role="alert">
          Patent data could not be loaded right now. Please try again shortly.
        </p>
      ) : empty ? (
        <p className="pat-empty">
          No patent grants are loaded yet. Grants issue on Tuesdays and load weekly from the USPTO.
        </p>
      ) : (
        <>
          {open ? <Company row={open} onClose={() => setOpen(null)} /> : null}

          <section className="pat-section" aria-labelledby="pat-mom-h">
            <h2 id="pat-mom-h" className="pat-section-title">
              Momentum
            </h2>
            <p className="pat-note">
              Public companies with at least 25 grants in the last 12 months, against the 12 months
              before. Select a ticker for its monthly grants and latest patents.
            </p>
            <div className="pat-controls" role="search">
              <input
                className="pat-input"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by ticker or company"
                aria-label="Search by ticker or company"
              />
            </div>
            {!view.length ? (
              <p className="pat-empty">
                {momentum.length
                  ? 'No company matches that search.'
                  : 'No company has 25 grants matched in the last 12 months yet.'}
              </p>
            ) : (
              <div className="pat-table-wrap">
                <table className="pat-table">
                  <thead>
                    <tr>
                      {COLS.map((c) => (
                        <th
                          key={c.key}
                          scope="col"
                          className={c.num ? 'r' : undefined}
                          aria-sort={
                            sort.key === c.key ? (sort.desc ? 'descending' : 'ascending') : 'none'
                          }
                        >
                          <button
                            type="button"
                            className="pat-sort"
                            onClick={() =>
                              setSort((s) => ({
                                key: c.key,
                                desc: s.key === c.key ? !s.desc : !!c.num,
                              }))
                            }
                          >
                            {c.label}
                            {sort.key === c.key ? (sort.desc ? ' ▾' : ' ▴') : ''}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {view.map((r) => (
                      <tr
                        key={r.ticker}
                        className={open?.ticker === r.ticker ? 'is-selected' : undefined}
                      >
                        <td>
                          <button
                            type="button"
                            className="pat-row-btn pat-mono"
                            onClick={() => setOpen(r)}
                            aria-label={`Open ${r.assignee || r.ticker} patents`}
                          >
                            {r.ticker}
                          </button>
                        </td>
                        <td>{r.assignee || DASH}</td>
                        <td className="pat-mono r">{fmtNum(r.grants12, 0) ?? DASH}</td>
                        <td className="pat-mono r">{fmtNum(r.prior12, 0) ?? DASH}</td>
                        <td className="r">
                          {r.change == null ? (
                            <span className="pat-muted">{DASH}</span>
                          ) : (
                            <span className={`pat-mono pat-${tone(r.change)}`}>
                              {fmtSigned(r.change)}
                            </span>
                          )}
                        </td>
                        <td>{cpcName(r.topCpc)}</td>
                        <td className="pat-mono">{fmtDate(r.lastGrant) || DASH}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="pat-grid pat-section">
            <section className="pat-card" aria-labelledby="pat-recent-h">
              <h2 id="pat-recent-h" className="pat-card-title">
                Recent grants to public companies
              </h2>
              {recent.length ? (
                <div className="pat-table-wrap">
                  <table className="pat-table">
                    <thead>
                      <tr>
                        <th scope="col">Patent</th>
                        <th scope="col">Ticker</th>
                        <th scope="col">Title</th>
                        <th scope="col">Granted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <PatentLink id={p.id} />
                          </td>
                          <td className="pat-mono">{p.ticker}</td>
                          <td className="pat-wrap">{p.title || DASH}</td>
                          <td className="pat-mono">{fmtDate(p.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="pat-empty">No grants matched to a ticker yet.</p>
              )}
            </section>

            <section className="pat-card" aria-labelledby="pat-cpc-h">
              <h2 id="pat-cpc-h" className="pat-card-title">
                Grants by CPC section, last 12 months
              </h2>
              {sections.length ? (
                <ul className="pat-bars">
                  {sections.map((s) => (
                    <li key={s.section} className="pat-bar-row">
                      <span className="pat-bar-label" title={cpcName(s.section)}>
                        {cpcName(s.section)}
                      </span>
                      <span className="pat-bar-track" aria-hidden="true">
                        <span
                          className="pat-bar-fill"
                          style={{ width: `${(100 * s.grants) / maxSection}%` }}
                        />
                      </span>
                      <span className="pat-mono">{fmtNum(s.grants, 0)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pat-empty">No grants with a CPC section in the last 12 months.</p>
              )}
            </section>
          </div>
        </>
      )}

      <footer className="pat-foot">
        <p>
          Granted U.S. patents by first assignee, matched to tickers by company name; subsidiaries
          and foreign filers may be missed.
        </p>
        <p>Source: USPTO PatentsView (PatentSearch API). Patent pages link to Google Patents.</p>
      </footer>
    </div>
  );
}
