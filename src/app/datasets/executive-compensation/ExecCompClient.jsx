'use client';

/**
 * Executive Compensation (pay versus performance, Item 402(v)): a sortable,
 * searchable table of the latest fiscal year per company, and a company
 * detail with the multi-year history. Two single-series charts (pay actually
 * paid, and total shareholder return) instead of one dual-axis chart: the two
 * measures have different scales.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import EzanaQLBar from '@/components/ezanaql/EzanaQLBar';
import { seedForDataset } from '@/lib/ezanaql/seeds';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import { CHART } from '@/lib/chart-theme';
import { usd, NOT_REPORTED } from '@/lib/titans/format';
import './exec-comp.css';

const COLS = [
  { key: 'ticker', label: 'Ticker' },
  { key: 'company', label: 'Company' },
  { key: 'fiscalYear', label: 'Fiscal year', num: true, fmt: (v) => String(v) },
  { key: 'totalComp', label: 'CEO total pay', num: true, fmt: usd },
  { key: 'paid', label: 'Compensation actually paid', num: true, fmt: usd },
  { key: 'tsr', label: 'Company TSR ($100)', num: true, fmt: (v) => `$${Math.round(v)}` },
  { key: 'peerTsr', label: 'Peer TSR ($100)', num: true, fmt: (v) => `$${Math.round(v)}` },
  { key: 'netIncome', label: 'Net income', num: true, fmt: usd },
];

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function MiniChart({ title, data, dataKey, fmt }) {
  const points = data.filter((d) => d[dataKey] != null);
  if (points.length < 2) return null;
  return (
    <figure className="ecx-card" style={{ margin: 0 }}>
      <figcaption className="ecx-card-title">{title}</figcaption>
      <div style={{ height: 180 }} role="img" aria-label={`${title} by fiscal year`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray={CHART.gridDash}
              stroke={CHART.gridStroke}
              vertical={false}
            />
            <XAxis
              dataKey="fiscalYear"
              tick={CHART.tick}
              axisLine={CHART.xAxisLine}
              tickLine={false}
            />
            <YAxis
              tick={CHART.tick}
              axisLine={false}
              tickLine={false}
              width={64}
              tickFormatter={fmt}
            />
            <Tooltip
              formatter={(v) => [fmt(v), title]}
              labelFormatter={(l) => `Fiscal ${l}`}
              contentStyle={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
              }}
            />
            <Line
              type="linear"
              dataKey={dataKey}
              stroke={CHART.primaryStroke}
              strokeWidth={CHART.primaryStrokeWidth}
              dot={{ r: 4, strokeWidth: 2, stroke: 'var(--bg-primary)', fill: 'var(--emerald)' }}
              activeDot={{ r: 6 }}
              isAnimationActive={!reduced()}
              animationDuration={CHART.animationDuration}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

function Detail({ row, onClose }) {
  const [state, setState] = useState({ status: 'loading', rows: [] });
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/titans/exec-comp?cik=${encodeURIComponent(row.cik)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => setState({ status: d?.ok ? 'ready' : 'error', rows: d?.rows || [] }))
      .catch(() => !ctrl.signal.aborted && setState({ status: 'error', rows: [] }));
    return () => ctrl.abort();
  }, [row.cik]);

  const history = state.rows;
  const latest = history[history.length - 1];
  return (
    <section className="ecx-section ecx-card" aria-labelledby="ecx-detail-h" aria-live="polite">
      <div className="ecx-controls" style={{ marginTop: 0, justifyContent: 'space-between' }}>
        <h2 id="ecx-detail-h" className="ecx-section-title">
          {row.company} <span className="ecx-ticker">{row.ticker}</span>
        </h2>
        <button type="button" className="ecx-btn" onClick={onClose}>
          <i className="bi bi-x-lg" aria-hidden="true" /> Close
        </button>
      </div>
      {state.status === 'loading' ? (
        <div aria-busy="true">
          <div className="ecx-skel" />
          <div className="ecx-skel" />
        </div>
      ) : state.status === 'error' ? (
        <p className="ecx-empty">History could not be loaded.</p>
      ) : (
        <>
          <div className="ecx-grid">
            <MiniChart
              title="Compensation actually paid, CEO"
              data={history}
              dataKey="paid"
              fmt={(v) => usd(v)}
            />
            <MiniChart
              title="Company TSR, value of $100"
              data={history}
              dataKey="tsr"
              fmt={(v) => `$${Math.round(v)}`}
            />
          </div>
          <div className="ecx-table-wrap ecx-section">
            <table className="ecx-table">
              <thead>
                <tr>
                  <th scope="col">Fiscal year</th>
                  <th scope="col">CEO</th>
                  <th scope="col" className="r">
                    Total pay
                  </th>
                  <th scope="col" className="r">
                    Actually paid
                  </th>
                  <th scope="col" className="r">
                    Other NEOs, total
                  </th>
                  <th scope="col" className="r">
                    Other NEOs, paid
                  </th>
                  <th scope="col" className="r">
                    TSR
                  </th>
                  <th scope="col" className="r">
                    Peer TSR
                  </th>
                  <th scope="col" className="r">
                    Net income
                  </th>
                  <th scope="col">Company measure</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((h) => (
                  <tr key={`${h.fiscalYear}-${h.peoKey}`}>
                    <td className="ecx-mono">{h.fiscalYear}</td>
                    <td>{h.peoName || <span className="ecx-muted">{NOT_REPORTED}</span>}</td>
                    {['totalComp', 'paid', 'neoTotal', 'neoPaid'].map((k) => (
                      <td key={k} className="ecx-mono r">
                        {h[k] != null ? (
                          usd(h[k])
                        ) : (
                          <span className="ecx-muted">{NOT_REPORTED}</span>
                        )}
                      </td>
                    ))}
                    {['tsr', 'peerTsr'].map((k) => (
                      <td key={k} className="ecx-mono r">
                        {h[k] != null ? (
                          `$${Math.round(h[k])}`
                        ) : (
                          <span className="ecx-muted">{NOT_REPORTED}</span>
                        )}
                      </td>
                    ))}
                    <td className="ecx-mono r">
                      {h.netIncome != null ? (
                        usd(h.netIncome)
                      ) : (
                        <span className="ecx-muted">{NOT_REPORTED}</span>
                      )}
                    </td>
                    <td>
                      {h.measureName ? (
                        <>
                          {h.measureName}{' '}
                          <span className="ecx-mono">{usd(h.measureValue) || ''}</span>
                        </>
                      ) : (
                        <span className="ecx-muted">{NOT_REPORTED}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {latest?.href ? (
            <p className="ecx-note ecx-section">
              <a href={latest.href} target="_blank" rel="noopener noreferrer">
                Proxy statement on SEC EDGAR{' '}
                <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
              </a>
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

export default function ExecCompClient({ rows }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ key: 'totalComp', desc: true });
  const [open, setOpen] = useState(null);

  const view = useMemo(() => {
    const t = q.trim().toUpperCase();
    const list = t
      ? rows.filter(
          (r) =>
            (r.ticker || '').toUpperCase().startsWith(t) ||
            (r.company || '').toUpperCase().includes(t),
        )
      : rows;
    return [...list].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      const c = typeof x === 'string' ? x.localeCompare(y) : x - y;
      return sort.desc ? -c : c;
    });
  }, [rows, q, sort]);

  const tickerItems = useMemo(
    () =>
      rows.slice(0, 20).map((r) => ({
        id: r.cik,
        lead: `FY ${r.fiscalYear} CEO pay`,
        main: r.ticker || r.company,
        value: usd(r.totalComp) || NOT_REPORTED,
      })),
    [rows],
  );
  usePublishTicker({ items: tickerItems, ariaLabel: 'Highest reported CEO pay' });

  return (
    <div className="ecx-page">
      <header className="ecx-header">
        <p className="ecx-eyebrow">DATASETS · TITANS SHADOW</p>
        <h1 className="ecx-title">Executive compensation</h1>
        <p className="ecx-sub">
          &ldquo;Total pay&rdquo; is what the summary compensation table reports.
          &ldquo;Compensation actually paid&rdquo; is the SEC&apos;s adjusted figure, which moves
          with the share price.
        </p>
        <dl className="ecx-stats">
          <div className="ecx-stat">
            <dt>Companies</dt>
            <dd>{rows.length ? rows.length.toLocaleString('en-US') : '–'}</dd>
          </div>
          <div className="ecx-stat">
            <dt>Latest fiscal year</dt>
            <dd>{rows.length ? Math.max(...rows.map((r) => r.fiscalYear)) : '–'}</dd>
          </div>
        </dl>
      </header>

      <EzanaQLBar datasetScope={null} seedQuery={seedForDataset(null)} />

      {open ? <Detail row={open} onClose={() => setOpen(null)} /> : null}

      <div className="ecx-controls" role="search">
        <input
          className="ecx-input"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by ticker or company"
          aria-label="Search by ticker or company"
        />
      </div>

      {!rows.length ? (
        <p className="ecx-empty">
          No pay versus performance data loaded yet. Companies are added daily from their proxy
          statements on SEC EDGAR.
        </p>
      ) : (
        <div className="ecx-table-wrap">
          <table className="ecx-table">
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
                      className="ecx-sort"
                      onClick={() =>
                        setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : !!c.num }))
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
                <tr key={r.cik}>
                  <td>
                    <button
                      type="button"
                      className="ecx-row-btn ecx-mono"
                      onClick={() => setOpen(r)}
                      aria-label={`Open ${r.company} pay history`}
                    >
                      {r.ticker || '–'}
                    </button>
                  </td>
                  <td>{r.company}</td>
                  {COLS.slice(2).map((c) => (
                    <td key={c.key} className="ecx-mono r">
                      {r[c.key] != null ? (
                        c.fmt(r[c.key])
                      ) : (
                        <span className="ecx-muted">{NOT_REPORTED}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="ecx-foot">
        <p>
          Source: SEC EDGAR XBRL, pay versus performance disclosures in proxy statements (DEF 14A).
        </p>
        <p>
          TSR is the value of $100 invested at the start of the period, as each company reports it.
        </p>
      </footer>
    </div>
  );
}
