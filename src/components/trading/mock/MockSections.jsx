'use client';

/**
 * Mock Trading page sections (Nov 2026 redesign, thesis layer Nov 14): the
 * KPI strip, the performance card, the open positions table, the activity
 * and trade journal, market movers and the close-position confirmation.
 * Presentational only: the page owns the portfolio, prices and trade calls
 * (useMockPortfolio), and every figure comes from the pure helpers in
 * src/lib/trading/mock-ticket.js so the KPIs, rows and journal agree.
 *
 * Toggles and tabs are text only (the selected one in emerald text);
 * secondary actions are plain text buttons. Styles: mock-trading.css.
 */
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AssetList, AssetRow, Button, Dropdown, MenuItem, Modal } from '@/components/ds';
import {
  POSITION_FILTERS,
  fmtPct,
  fmtQty,
  fmtSignedPct,
  fmtSignedUSD,
  fmtStampET,
  fmtUSD,
  normalizeMovers,
  signOf,
  weightBarFill,
} from '@/lib/trading/mock-ticket';

const MockPortfolioChart = dynamic(() => import('@/components/trading/MockPortfolioChart'), {
  ssr: false,
  loading: () => <div className="mpc-skel" aria-hidden="true" />,
});

/* ------------------------------------------------------------------ */

export function LetterAvatar({ symbol }) {
  return (
    <span className="mock-avatar" aria-hidden="true">
      {(symbol || '?').charAt(0)}
    </span>
  );
}

function SkeletonRows({ rows = 4 }) {
  return (
    <div className="mock-skel-stack" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="mock-skel mock-skel--row" />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Performance                                                         */
/* ------------------------------------------------------------------ */

/* Nov 23, 2026: no title and no chart-subject switch. The card
   is the portfolio chart, with the investment thesis strip (`top`) above the
   value, the return and the period selector. */
export function PerformanceCard({ startingCash, top = null }) {
  return (
    <section className="mock-card mock-perf" aria-label="Portfolio performance">
      <MockPortfolioChart startingCash={startingCash} top={top} hideTitle />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Open positions                                                      */
/* ------------------------------------------------------------------ */

/* Nov 23, 2026: open positions as asset tiles (ds AssetRow), the same list
   style as the Watchlist and the Dashboard. A sortable head shares the
   tiles' columns: asset, weight (with the thesis-cap bar, shares and average
   cost under it), market value over unrealized P&L, last price over the
   day's change, and Close. Clicking a tile loads it into the order ticket. */
const SORTS = [
  { key: 'symbol', label: 'Asset', col: 'asset' },
  { key: 'name', label: 'Company', col: 'asset' },
  { key: 'weight', label: 'Weight', col: 'hold' },
  { key: 'value', label: 'Value', col: 'value' },
  { key: 'pnl', label: 'P&L', col: 'value' },
  { key: 'current', label: 'Last', col: 'quote' },
  { key: 'dayPct', label: 'Day', col: 'quote' },
];

function PosSort({ c, sort, onSort }) {
  const on = sort.key === c.key;
  return (
    <button
      type="button"
      className={`mock-sort${on ? ' is-on' : ''}`}
      onClick={() => onSort(c.key)}
      aria-label={`Sort by ${c.label}${on ? (sort.dir === 'asc' ? ', ascending' : ', descending') : ''}`}
    >
      {c.label}
      <i
        className={`bi ${on && sort.dir === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill'}${on ? ' is-on' : ''}`}
        aria-hidden="true"
      />
    </button>
  );
}

/**
 * rows       the sorted, filtered rows to show
 * total      the unfiltered count (the header count)
 * filter     'all' | 'winners' | 'losers'
 * selected   the ticker loaded in the order ticket (that row is highlighted)
 * cap        the active thesis cap (percent) or null; the weight bar is full
 *            at the cap, else at the largest weight
 * capTone    (row) => 'within' | 'nearing' | 'over', the bar's tone
 */
export function PositionsCard({
  rows,
  total = rows.length,
  allRows = rows,
  loading,
  sort,
  onSort,
  filter = 'all',
  onFilter,
  selected = null,
  cap = null,
  capTone = null,
  onSelect,
  onClose,
  pending,
  priceNote,
  headerExtra = null,
}) {
  const filterLabel = POSITION_FILTERS.find((f) => f.id === filter)?.label || 'All positions';
  return (
    <section className="mock-card mock-positions" aria-labelledby="mock-pos-h">
      <header className="mock-card-header">
        <i className="bi bi-briefcase mock-card-icon" aria-hidden="true" />
        <h2 id="mock-pos-h" className="mock-card-title">
          Open positions <span className="mock-count mock-num">({total})</span>
        </h2>
        {priceNote ? (
          <span className="mock-note" title={priceNote}>
            <i className="bi bi-exclamation-triangle" aria-hidden="true" /> Some live prices are
            delayed. Showing cost basis for those.
          </span>
        ) : null}
        <div className="mock-card-header__end">
          {headerExtra}
          {total > 0 ? (
            <Dropdown
              align="right"
              trigger={
                <span className="mock-btn mock-btn--sm" aria-label={`Filter: ${filterLabel}`}>
                  {filterLabel} <i className="bi bi-chevron-down" aria-hidden="true" />
                </span>
              }
            >
              {POSITION_FILTERS.map((f) => (
                <MenuItem
                  key={f.id}
                  icon={filter === f.id ? 'bi-check-lg' : undefined}
                  onClick={() => onFilter?.(f.id)}
                >
                  {f.label}
                </MenuItem>
              ))}
            </Dropdown>
          ) : null}
        </div>
      </header>
      {loading ? (
        <SkeletonRows rows={5} />
      ) : total === 0 ? (
        <p className="mock-empty">
          No open positions yet. Search a ticker to place your first paper trade.
        </p>
      ) : rows.length === 0 ? (
        <p className="mock-empty">
          No {filter === 'winners' ? 'winning' : 'losing'} positions right now.
        </p>
      ) : (
        <div className="mock-pos">
          <div className="mock-pos-head" role="group" aria-label="Sort open positions">
            {['asset', 'hold', 'value', 'quote'].map((col) => (
              <span key={col} className={`mock-pos-head__${col}`}>
                {SORTS.filter((c) => c.col === col).map((c) => (
                  <PosSort key={c.key} c={c} sort={sort} onSort={onSort} />
                ))}
              </span>
            ))}
            <span className="mock-sr">Actions</span>
          </div>
          <AssetList className="mock-pos-list" aria-label="Open positions">
            {rows.map((r) => {
              const dir = signOf(r.pnl);
              const tone = capTone ? capTone(r) : 'within';
              const fill = weightBarFill(r.weight, allRows, cap);
              const company = r.name && r.name !== r.symbol ? r.name : 'N/A';
              return (
                <AssetRow
                  key={r.symbol}
                  className="mock-pos-row"
                  ticker={r.symbol}
                  name={company}
                  logo={r.type === 'Crypto' || r.type === 'Commodity' ? null : undefined}
                  selected={selected === r.symbol}
                  onSelect={() => onSelect(r)}
                  selectLabel={`Load ${r.symbol} into the order ticket`}
                  trend={
                    <span className="mock-pos-hold">
                      <span className={`mock-weight is-${tone}`}>
                        {tone !== 'within' ? (
                          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                        ) : null}
                        <span className="mock-num">{fmtPct(r.weight)}</span>
                        <span className="mock-wbar" aria-hidden="true">
                          <span style={{ '--fill': fill }} />
                        </span>
                        {tone !== 'within' ? (
                          <span className="mock-sr">
                            {tone === 'over' ? ', past the thesis cap' : ', nearing the thesis cap'}
                          </span>
                        ) : null}
                      </span>
                      <span className="mock-pos-sub mock-num">
                        {fmtQty(r.qty)} sh · avg {fmtUSD(r.avgCost)}
                      </span>
                    </span>
                  }
                  meta={
                    <span className="mock-pos-value">
                      <span className="mock-num mock-strong">{fmtUSD(r.value)}</span>
                      <span className={`mock-num mock-pl is-${dir}`}>
                        <span className="mock-pos-pl-usd">{fmtSignedUSD(r.pnl)} </span>(
                        {fmtSignedPct(r.pnlPct)})
                      </span>
                    </span>
                  }
                  price={fmtUSD(r.currentPrice)}
                  change={r.dayPct}
                  changeText={fmtSignedPct(r.dayPct)}
                  actions={
                    <button
                      type="button"
                      className="mock-btn mock-btn--sm"
                      onClick={() => onClose(r)}
                      disabled={pending}
                      aria-label={`Close ${r.symbol} position`}
                    >
                      Close
                    </button>
                  }
                />
              );
            })}
          </AssetList>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Activity and trade journal                                          */
/* ------------------------------------------------------------------ */

/**
 * rows   journalRows() output, newest first
 * extra  optional header controls (the page adds filter tabs and export)
 * columns optional extra trailing columns: [{ key, label, render(row) }]
 */
export function ActivityCard({
  rows,
  loading,
  extra = null,
  columns = [],
  empty = 'No trades yet.',
}) {
  const [all, setAll] = useState(false);
  const list = all ? rows.slice(0, 50) : rows.slice(0, 5);
  return (
    <section className="mock-card mock-activity" aria-labelledby="mock-act-h">
      <header className="mock-card-header">
        <i className="bi bi-clock-history mock-card-icon" aria-hidden="true" />
        <h2 id="mock-act-h" className="mock-card-title">
          Activity and trade journal
        </h2>
        <div className="mock-card-header__end">{extra}</div>
      </header>
      {loading ? (
        <SkeletonRows rows={4} />
      ) : rows.length === 0 ? (
        <p className="mock-empty">{empty}</p>
      ) : (
        <>
          <div className="mock-table-scroll">
            <table className="mock-table mock-table--journal">
              <caption className="mock-sr">Trades, newest first</caption>
              <thead>
                <tr>
                  <th scope="col" className="is-left">
                    Time (ET)
                  </th>
                  <th scope="col" className="is-left">
                    Type
                  </th>
                  <th scope="col" className="is-left">
                    Symbol
                  </th>
                  <th scope="col" className="is-left">
                    Details
                  </th>
                  <th scope="col">Amount</th>
                  <th scope="col" className="is-left">
                    Position impact
                  </th>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      className={c.align === 'right' ? undefined : 'is-left'}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((h) => {
                  const buy = h.side === 'buy';
                  return (
                    <tr key={h.id || `${h.ts}-${h.symbol}`}>
                      <td className="is-left mock-num mock-soft">{fmtStampET(h.ts)}</td>
                      <td className="is-left">
                        <span className={`mock-badge ${buy ? 'is-up' : 'is-down'}`}>
                          {buy ? 'Buy' : 'Sell'}
                        </span>
                      </td>
                      <th scope="row" className="is-left mock-num mock-strong">
                        {h.symbol}
                      </th>
                      <td className="is-left mock-soft mock-num">{h.details}</td>
                      <td className="mock-num mock-strong">{fmtUSD(h.total)}</td>
                      <td className="is-left mock-num mock-soft">{h.impactText}</td>
                      {columns.map((c) => (
                        <td key={c.key} className={c.align === 'right' ? undefined : 'is-left'}>
                          {c.render(h)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length > 5 ? (
            <button
              type="button"
              className="mock-link mock-link--start"
              aria-expanded={all}
              onClick={() => setAll((v) => !v)}
            >
              {all ? 'Show recent' : 'All activity'}{' '}
              <i className={`bi ${all ? 'bi-chevron-up' : 'bi-arrow-right'}`} aria-hidden="true" />
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Market movers                                                       */
/* ------------------------------------------------------------------ */

export function MarketMoversCard({ onSelect }) {
  const [state, setState] = useState({ status: 'loading', gainers: [], losers: [] });
  const [side, setSide] = useState('gainers');
  useEffect(() => {
    let cancelled = false;
    fetch('/api/fmp/movers?limit=5', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { gainers: [], losers: [] }))
      .then((d) => {
        if (!cancelled) setState({ status: 'ready', ...normalizeMovers(d, 5) });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'ready', gainers: [], losers: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const rows = state[side] || [];
  const nothing = state.gainers.length === 0 && state.losers.length === 0;

  return (
    <section className="mock-card mock-movers" aria-labelledby="mock-mov-h">
      <header className="mock-card-header">
        <i className="bi bi-bar-chart-line mock-card-icon" aria-hidden="true" />
        <h2 id="mock-mov-h" className="mock-card-title">
          Market movers
        </h2>
        <Link href="/market-analysis" className="mock-link">
          View more <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </header>
      {state.status === 'loading' ? (
        <SkeletonRows rows={5} />
      ) : nothing ? (
        <p className="mock-empty">Market movers are unavailable right now.</p>
      ) : (
        <>
          <div className="mock-seg" role="group" aria-label="Show gainers or losers">
            {[
              ['gainers', 'Gainers'],
              ['losers', 'Losers'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`mock-seg__btn${side === id ? ' is-on' : ''}`}
                aria-pressed={side === id}
                onClick={() => setSide(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {rows.length === 0 ? (
            <p className="mock-empty">
              No {side === 'gainers' ? 'gainers' : 'losers'} to show right now.
            </p>
          ) : (
            <div className="mock-table-scroll">
              <table className="mock-table mock-table--movers">
                <caption className="mock-sr">
                  Top {side === 'gainers' ? 'gainers' : 'losers'} today
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="is-left">
                      Symbol
                    </th>
                    <th scope="col" className="is-left">
                      Company
                    </th>
                    <th scope="col">Last</th>
                    <th scope="col">Change</th>
                    <th scope="col">% change</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.ticker}>
                      <th scope="row" className="is-left">
                        <button
                          type="button"
                          className="mock-asset-btn"
                          onClick={() => onSelect(m.ticker, m.name)}
                          aria-label={`Load ${m.ticker} into the order ticket, ${fmtSignedPct(m.pct)} today`}
                        >
                          <span className="mock-num mock-strong">{m.ticker}</span>
                        </button>
                      </th>
                      <td className="is-left mock-soft">
                        <span className="mock-ellipsis mock-company mock-company--sm">
                          {m.name || 'N/A'}
                        </span>
                      </td>
                      <td className="mock-num">{fmtUSD(m.price)}</td>
                      <td className={`mock-num mock-tone is-${signOf(m.change)}`}>
                        {fmtSignedUSD(m.change)}
                      </td>
                      <td className={`mock-num mock-tone is-${signOf(m.pct)}`}>
                        {fmtSignedPct(m.pct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Close position confirmation                                         */
/* ------------------------------------------------------------------ */

export function ClosePositionModal({ row, pending, onCancel, onConfirm }) {
  return (
    <Modal
      open={Boolean(row)}
      onClose={onCancel}
      title={row ? `Close your ${row.symbol} position?` : ''}
      size="440px"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={pending}>
            Close position
          </Button>
        </>
      }
    >
      {row ? (
        <div className="mock-confirm">
          <p className="mock-confirm__lead">
            This sells all of your {row.symbol} shares at the live price when you confirm.
          </p>
          <dl className="mock-confirm__list">
            <div>
              <dt>Shares</dt>
              <dd className="mock-num">{fmtQty(row.qty)}</dd>
            </div>
            <div>
              <dt>Estimated proceeds</dt>
              <dd className="mock-num">{fmtUSD(row.value)}</dd>
            </div>
            <div>
              <dt>P&amp;L realised</dt>
              <dd className={`mock-num mock-pl is-${signOf(row.pnl)}`}>
                {fmtSignedUSD(row.pnl)} ({fmtSignedPct(row.pnlPct)})
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </Modal>
  );
}
