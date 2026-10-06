'use client';

/**
 * Insider Trading (Form 4): 30-day stats, the largest open-market buys and
 * sales, cluster buys, and a search by ticker or insider that lists every
 * transaction in the last 12 months. Open-market trades (codes P and S) lead;
 * awards, exercises and other codes are listed but de-emphasised.
 */
import { useCallback, useMemo, useState } from 'react';
import EzanaQLBar from '@/components/ezanaql/EzanaQLBar';
import { seedForDataset } from '@/lib/ezanaql/seeds';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import { TRANSACTION_CODES } from '@/lib/sec/form4-codes';
import { usd, int, money2, shortDate, NOT_REPORTED } from '@/lib/titans/format';
import './insider.css';

const NONE = [];
const OPEN_MARKET = new Set(['P', 'S']);

function TradeTable({ rows, showCode = false, empty }) {
  if (!rows.length) return <p className="insx-empty">{empty}</p>;
  return (
    <div className="insx-table-wrap">
      <table className="insx-table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Ticker</th>
            <th scope="col">Company</th>
            <th scope="col">Insider</th>
            {showCode ? <th scope="col">Code</th> : null}
            <th scope="col" className="r">
              Shares
            </th>
            <th scope="col" className="r">
              Price
            </th>
            <th scope="col" className="r">
              Value
            </th>
            <th scope="col" className="r">
              Owned after
            </th>
            <th scope="col">
              <span className="insx-muted">Filing</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={showCode && !OPEN_MARKET.has(r.code) ? 'is-dim' : undefined}>
              <td className="insx-mono">{shortDate(r.date) || NOT_REPORTED}</td>
              <td>
                {r.ticker ? (
                  <span className="insx-ticker">{r.ticker}</span>
                ) : (
                  <span className="insx-muted">None</span>
                )}
              </td>
              <td>{r.company}</td>
              <td>
                {r.insider}
                {r.title ? <span className="insx-muted"> · {r.title}</span> : null}
              </td>
              {showCode ? (
                <td>
                  <span
                    className={`insx-chip${r.code === 'P' ? ' insx-chip--pos' : r.code === 'S' ? ' insx-chip--neg' : ''}`}
                    title={TRANSACTION_CODES[r.code] || 'Other'}
                  >
                    {r.code || '?'}
                    {r.derivative ? ' (deriv.)' : ''}
                  </span>
                </td>
              ) : null}
              <td className="insx-mono r">{int(r.shares) || NOT_REPORTED}</td>
              <td className="insx-mono r">{money2(r.price) || NOT_REPORTED}</td>
              <td className="insx-mono r">{usd(r.value) || NOT_REPORTED}</td>
              <td className="insx-mono r">{int(r.ownedAfter) || NOT_REPORTED}</td>
              <td>
                {r.href ? (
                  <a
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Form 4 for ${r.ticker || r.company} on SEC EDGAR (opens in a new tab)`}
                  >
                    <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                  </a>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Search() {
  const [mode, setMode] = useState('ticker');
  const [q, setQ] = useState('');
  const [state, setState] = useState({ status: 'idle', rows: NONE, label: '' });

  const run = useCallback(
    (e) => {
      e?.preventDefault();
      const term = q.trim();
      if (!term) return;
      setState({ status: 'loading', rows: NONE, label: term });
      fetch(`/api/titans/insider?${mode}=${encodeURIComponent(term)}`)
        .then((r) => r.json())
        .then((d) =>
          setState(
            d?.ok
              ? { status: 'ready', rows: d.rows || NONE, label: term }
              : { status: 'error', rows: NONE, label: d?.error || 'Search failed.' },
          ),
        )
        .catch(() => setState({ status: 'error', rows: NONE, label: 'Search failed.' }));
    },
    [mode, q],
  );

  return (
    <section className="insx-section" aria-labelledby="insx-search-h">
      <h2 id="insx-search-h" className="insx-section-title">
        Search by ticker or insider
      </h2>
      <p className="insx-note">Every Form 4 transaction in the last 12 months, newest first.</p>
      <form className="insx-controls" onSubmit={run} role="search">
        <select
          className="insx-select"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          aria-label="Search by"
        >
          <option value="ticker">Ticker</option>
          <option value="insider">Insider name</option>
        </select>
        <input
          className="insx-input"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={mode === 'ticker' ? 'e.g. AAPL' : 'e.g. Cook'}
          aria-label={mode === 'ticker' ? 'Ticker' : 'Insider name'}
        />
        <button type="submit" className="insx-btn">
          <i className="bi bi-search" aria-hidden="true" /> Search
        </button>
      </form>
      <div aria-live="polite">
        {state.status === 'loading' ? (
          <div aria-busy="true">
            <div className="insx-skel" />
            <div className="insx-skel" />
          </div>
        ) : state.status === 'error' ? (
          <p className="insx-empty">{state.label}</p>
        ) : state.status === 'ready' ? (
          <TradeTable
            rows={state.rows}
            showCode
            empty={`No Form 4 transactions for ${state.label} in the last 12 months.`}
          />
        ) : null}
      </div>
    </section>
  );
}

export default function InsiderClient({ overview }) {
  const o = overview;
  const latest = o?.latest || NONE;
  const tickerItems = useMemo(
    () =>
      latest.map((r) => ({
        id: r.id,
        lead: r.code === 'P' ? 'Insider buy' : 'Insider sale',
        main: `${r.ticker || r.company} · ${r.insider || ''}`,
        value: usd(r.value) || NOT_REPORTED,
      })),
    [latest],
  );
  usePublishTicker({ items: tickerItems, ariaLabel: 'Newest open-market insider trades' });

  return (
    <div className="insx-page">
      <header className="insx-header">
        <p className="insx-eyebrow">DATASETS · TITANS SHADOW</p>
        <h1 className="insx-title">Insider trading</h1>
        <p className="insx-sub">
          Buys and sales by company officers, directors and 10% owners, parsed from every SEC Form
          4. Open-market trades (codes P and S) are the ones most people watch; awards and exercises
          are listed but de-emphasised.
        </p>
        <dl className="insx-stats">
          <div className="insx-stat">
            <dt>Open-market buys, 30 days</dt>
            <dd>{o ? `${int(o.stats.buys)} · ${usd(o.stats.buyValue) || '$0'}` : '–'}</dd>
          </div>
          <div className="insx-stat">
            <dt>Open-market sales, 30 days</dt>
            <dd>{o ? `${int(o.stats.sells)} · ${usd(o.stats.sellValue) || '$0'}` : '–'}</dd>
          </div>
          <div className="insx-stat">
            <dt>Latest transaction</dt>
            <dd>{shortDate(o?.asOf) || '–'}</dd>
          </div>
        </dl>
      </header>

      <EzanaQLBar datasetScope={null} seedQuery={seedForDataset(null)} />

      {!o || (!o.topBuys.length && !o.topSells.length) ? (
        <p className="insx-empty insx-section">
          No open-market Form 4 trades parsed for the last 30 days yet. Transactions appear here as
          filings are read from SEC EDGAR.
        </p>
      ) : null}

      <div className="insx-grid insx-section">
        <section className="insx-card" aria-labelledby="insx-buys-h">
          <h2 id="insx-buys-h" className="insx-card-title">
            Largest open-market buys, last 30 days
          </h2>
          <TradeTable
            rows={o?.topBuys || NONE}
            empty="No open-market buys with a reported price yet."
          />
        </section>
        <section className="insx-card" aria-labelledby="insx-sells-h">
          <h2 id="insx-sells-h" className="insx-card-title">
            Largest open-market sales, last 30 days
          </h2>
          <TradeTable
            rows={o?.topSells || NONE}
            empty="No open-market sales with a reported price yet."
          />
        </section>
      </div>

      <section className="insx-section" aria-labelledby="insx-cluster-h">
        <h2 id="insx-cluster-h" className="insx-section-title">
          Cluster buys
        </h2>
        <p className="insx-note">
          Companies where three or more different insiders bought on the open market within 14 days,
          over the last 90 days.
        </p>
        {o?.clusters?.length ? (
          <div className="insx-table-wrap">
            <table className="insx-table">
              <thead>
                <tr>
                  <th scope="col">Ticker</th>
                  <th scope="col">Company</th>
                  <th scope="col">Window</th>
                  <th scope="col" className="r">
                    Insiders
                  </th>
                  <th scope="col" className="r">
                    Buys
                  </th>
                  <th scope="col" className="r">
                    Value
                  </th>
                  <th scope="col">Who</th>
                </tr>
              </thead>
              <tbody>
                {o.clusters.map((c) => (
                  <tr key={`${c.ticker || c.company}-${c.from}`}>
                    <td>
                      {c.ticker ? (
                        <span className="insx-ticker">{c.ticker}</span>
                      ) : (
                        <span className="insx-muted">None</span>
                      )}
                    </td>
                    <td>{c.company}</td>
                    <td className="insx-mono">
                      {shortDate(c.from)} to {shortDate(c.to)}
                    </td>
                    <td className="insx-mono r">{c.insiders.length}</td>
                    <td className="insx-mono r">{c.trades}</td>
                    <td className="insx-mono r">{usd(c.value) || NOT_REPORTED}</td>
                    <td>
                      {c.insiders.slice(0, 4).join(', ')}
                      {c.insiders.length > 4 ? ' and others' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="insx-empty">No cluster buys in the last 90 days.</p>
        )}
      </section>

      <Search />

      <section className="insx-section" aria-labelledby="insx-codes-h">
        <h2 id="insx-codes-h" className="insx-section-title">
          What the codes mean
        </h2>
        <dl className="insx-legend">
          {['P', 'S', 'A', 'M', 'F', 'G'].map((c) => (
            <div key={c}>
              <dt>{c}</dt>
              <dd>{TRANSACTION_CODES[c]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="insx-foot">
        <p>
          Source: SEC EDGAR, Form 4 (and the SEC insider transactions data sets for older history).
        </p>
        <p>
          Amounts are as filed. A price the filing did not report shows as Not reported, never as
          zero.
        </p>
      </footer>
    </div>
  );
}
