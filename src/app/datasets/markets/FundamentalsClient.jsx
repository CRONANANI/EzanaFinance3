'use client';

/**
 * Company fundamentals from SEC EDGAR XBRL: the latest fiscal year for the
 * largest filers by revenue, sortable and searchable; a row expands to the
 * company's annual and quarterly history. Growth is computed from reported
 * values only. Prices are not shown yet.
 */
import { Fragment, useEffect, useMemo, useState } from 'react';
import HubQueryLink from '@/components/datasets/HubQueryLink';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import { PolicyMomentumCard } from '@/components/congress/PolicyMomentumCard';
import { usd, money2, signedPct, shortDate, NOT_REPORTED } from '@/lib/titans/format';
import './fundamentals.css';

const COLUMNS = [
  { key: 'ticker', label: 'Ticker' },
  { key: 'company', label: 'Company' },
  { key: 'revenue', label: 'Revenue', num: true, fmt: usd },
  { key: 'revenue_growth', label: 'Revenue growth', num: true, fmt: signedPct },
  { key: 'net_income', label: 'Net income', num: true, fmt: usd },
  { key: 'eps_diluted', label: 'Diluted EPS', num: true, fmt: money2 },
  { key: 'operating_cash_flow', label: 'Operating cash flow', num: true, fmt: usd },
  { key: 'assets', label: 'Total assets', num: true, fmt: usd },
  { key: 'equity', label: 'Equity', num: true, fmt: usd },
  { key: 'cash', label: 'Cash', num: true, fmt: usd },
];

const HISTORY = [
  ['revenue', 'Revenue', usd],
  ['gross_profit', 'Gross profit', usd],
  ['operating_income', 'Operating income', usd],
  ['net_income', 'Net income', usd],
  ['eps_diluted', 'Diluted EPS', money2],
  ['operating_cash_flow', 'Operating cash flow', usd],
  ['capex', 'Capital expenditure', usd],
  ['assets', 'Total assets', usd],
  ['liabilities', 'Total liabilities', usd],
  ['equity', 'Equity', usd],
  ['cash', 'Cash', usd],
  ['long_term_debt', 'Long-term debt', usd],
];

function frameLabel(p) {
  const m = /^CY(\d{4})(Q(\d))?(I)?$/.exec(p.frame);
  if (!m) return p.frame;
  if (m[4]) return `As of ${shortDate(p.end) || m[1]}`;
  return m[3] ? `Q${m[3]} ${m[1]}` : `FY ${m[1]}`;
}

function History({ ticker, colSpan }) {
  const [state, setState] = useState({ status: 'loading', h: null });
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/titans/fundamentals?ticker=${encodeURIComponent(ticker)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) =>
        setState({
          status: !d?.ok ? 'error' : d.history ? 'ready' : 'none',
          h: d?.history || null,
        }),
      )
      .catch(() => !ctrl.signal.aborted && setState({ status: 'error', h: null }));
    return () => ctrl.abort();
  }, [ticker]);

  let body;
  if (state.status === 'loading') body = <div className="fndx-skel" aria-busy="true" />;
  else if (state.status === 'none')
    body = <p className="fndx-note">No reported fundamentals for {ticker}.</p>;
  else if (state.status === 'error' || !state.h)
    body = <p className="fndx-note">History could not be loaded.</p>;
  else {
    const durations = state.h.periods.filter((p) => p.type !== 'instant');
    const instants = state.h.periods.filter((p) => p.type === 'instant');
    const block = (list, keys) =>
      list.length ? (
        <div className="fndx-table-wrap">
          <table className="fndx-table">
            <thead>
              <tr>
                <th scope="col">Metric</th>
                {list.map((p) => (
                  <th key={p.frame} scope="col" className="r">
                    {frameLabel(p)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys
                .filter(([k]) => list.some((p) => p.values[k]))
                .map(([k, label, fmt]) => (
                  <tr key={k}>
                    <td>{label}</td>
                    {list.map((p) => (
                      <td key={p.frame} className="fndx-mono r">
                        {p.values[k] ? (
                          fmt(p.values[k].value)
                        ) : (
                          <span className="fndx-muted">{NOT_REPORTED}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : null;
    body = (
      <>
        {block(
          durations,
          HISTORY.filter(
            ([k]) => !['assets', 'liabilities', 'equity', 'cash', 'long_term_debt'].includes(k),
          ),
        )}
        {block(
          instants,
          HISTORY.filter(([k]) =>
            ['assets', 'liabilities', 'equity', 'cash', 'long_term_debt'].includes(k),
          ),
        )}
      </>
    );
  }
  return (
    <tr>
      <td colSpan={colSpan}>
        <div className="fndx-card">{body}</div>
      </td>
    </tr>
  );
}

const NO_ROWS = [];

export default function FundamentalsClient({ table }) {
  const rows = table?.rows || NO_ROWS;
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ key: 'revenue', desc: true });
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
    const k = sort.key;
    return [...list].sort((a, b) => {
      const x = a[k];
      const y = b[k];
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
        lead: `FY ${table?.year}`,
        main: r.ticker,
        value: usd(r.revenue) || NOT_REPORTED,
      })),
    [rows, table?.year],
  );
  usePublishTicker({ items: tickerItems, ariaLabel: 'Largest companies by reported revenue' });

  const q2 = q.trim().toUpperCase();
  const notInTable = q2 && /^[A-Z.\-]{1,10}$/.test(q2) && !view.length;

  return (
    <div className="fndx-page">
      <header className="fndx-header">
        <p className="fndx-eyebrow">DATASETS · TITANS SHADOW</p>
        <h1 className="fndx-title">Company fundamentals</h1>
        <p className="fndx-sub">
          Revenue, earnings, cash flow and balance sheets as companies report them to the SEC, for
          the latest fiscal year. Growth is computed only when both years are reported.
        </p>
        <dl className="fndx-stats">
          <div className="fndx-stat">
            <dt>Fiscal year</dt>
            <dd>{table?.year || '–'}</dd>
          </div>
          <div className="fndx-stat">
            <dt>Companies reporting</dt>
            <dd>{table?.companies?.toLocaleString('en-US') || '–'}</dd>
          </div>
          <div className="fndx-stat">
            <dt>Shown</dt>
            <dd>{rows.length ? `Top ${rows.length} by revenue` : '–'}</dd>
          </div>
        </dl>
      </header>

      <HubQueryLink dimension="titans" />

      <p className="fndx-note fndx-section">Prices are not shown yet.</p>

      <div className="fndx-controls" role="search">
        <input
          className="fndx-input"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by ticker or company"
          aria-label="Search by ticker or company"
        />
      </div>

      {!rows.length ? (
        <p className="fndx-empty">
          Fundamentals have not been loaded yet. They refresh daily from SEC EDGAR XBRL filings.
        </p>
      ) : (
        <div className="fndx-table-wrap">
          <table className="fndx-table">
            <thead>
              <tr>
                {COLUMNS.map((c) => (
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
                      className="fndx-sort"
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
                <Fragment key={r.cik}>
                  <tr>
                    <td>
                      <button
                        type="button"
                        className="fndx-row-btn fndx-mono"
                        aria-expanded={open === r.ticker}
                        onClick={() => setOpen((o) => (o === r.ticker ? null : r.ticker))}
                      >
                        <i
                          className={`bi ${open === r.ticker ? 'bi-chevron-down' : 'bi-chevron-right'}`}
                          aria-hidden="true"
                        />{' '}
                        {r.ticker}
                      </button>
                    </td>
                    <td>{r.company}</td>
                    {COLUMNS.slice(2).map((c) => {
                      const v = r[c.key];
                      const txt = v == null ? null : c.fmt(v);
                      const tone =
                        c.key === 'revenue_growth' && v != null
                          ? v >= 0
                            ? ' fndx-pos'
                            : ' fndx-neg'
                          : '';
                      return (
                        <td key={c.key} className={`fndx-mono r${tone}`}>
                          {txt || <span className="fndx-muted">{NOT_REPORTED}</span>}
                        </td>
                      );
                    })}
                  </tr>
                  {open === r.ticker ? (
                    <History ticker={r.ticker} colSpan={COLUMNS.length} />
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {notInTable ? (
        <div className="fndx-section">
          <p className="fndx-note">{q2} is not among the largest filers shown. Its own history:</p>
          <table className="fndx-table">
            <tbody>
              <History ticker={q2} colSpan={1} />
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="fndx-section">
        <PolicyMomentumCard />
      </div>

      <footer className="fndx-foot">
        <p>Source: SEC EDGAR XBRL (company financial statements as filed).</p>
        <p>
          Fiscal year is the calendar-aligned SEC frame; balance-sheet figures are at the year end.
          Figures a company did not tag show as Not reported.
        </p>
      </footer>
    </div>
  );
}
