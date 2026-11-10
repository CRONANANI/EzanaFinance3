'use client';

/**
 * Mock Trading page sections (Nov 2026 redesign): the KPI row, the
 * performance card, the open positions table, recent activity, market
 * movers and the close-position confirmation. Presentational only: the page
 * owns the portfolio, prices and trade calls (useMockPortfolio), and every
 * figure comes from src/lib/trading/mock-ticket.js so the KPIs, rows and
 * activity agree.
 */
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button, Modal } from '@/components/ds';
import {
  fmtDate,
  fmtDateTime,
  fmtQty,
  fmtSignedPct,
  fmtSignedUSD,
  fmtUSD,
  signOf,
} from '@/lib/trading/mock-ticket';

const MockPortfolioChart = dynamic(() => import('@/components/trading/MockPortfolioChart'), {
  ssr: false,
  loading: () => <div className="mpc-skel" aria-hidden="true" />,
});
const StockPriceChart = dynamic(() => import('@/components/research/StockPriceChart'), {
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
/* KPI row                                                             */
/* ------------------------------------------------------------------ */

export function MockKpiRow({ summary }) {
  const pnlDir = signOf(summary.totalPnl);
  const cards = [
    {
      key: 'value',
      icon: 'bi-stack',
      label: 'Total value',
      value: fmtUSD(summary.totalValue),
      sub: 'Cash + positions',
    },
    {
      key: 'cash',
      icon: 'bi-wallet2',
      label: 'Cash available',
      value: fmtUSD(summary.cash),
      sub: 'Ready to deploy',
    },
    {
      key: 'pnl',
      icon: 'bi-graph-up',
      label: 'Total P&L',
      value: fmtSignedUSD(summary.totalPnl),
      tone: pnlDir,
      sub: `${fmtSignedPct(summary.totalPnlPct)} (all time)`,
      title: `Unrealised ${fmtSignedUSD(summary.unrealised)}, realised ${fmtSignedUSD(summary.realised)}`,
    },
    {
      key: 'positions',
      icon: 'bi-briefcase',
      label: 'Open positions',
      value: String(summary.count),
      sub: `${fmtUSD(summary.marketValue)} market value`,
    },
  ];
  return (
    <section className="mock-kpis mock-portfolio-strip" aria-label="Account summary">
      {cards.map((c) => (
        <div key={c.key} className="mock-stat-card" title={c.title}>
          <span className="mock-stat-icon" aria-hidden="true">
            <i className={`bi ${c.icon}`} />
          </span>
          <div className="mock-stat-text">
            <span className="mock-stat-label">{c.label}</span>
            <span className={`mock-stat-value mock-num${c.tone ? ` is-${c.tone}` : ''}`}>
              {c.value}
            </span>
            <span className="mock-stat-sub">{c.sub}</span>
          </div>
        </div>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Performance                                                         */
/* ------------------------------------------------------------------ */

function SubjectSwitch({ subject, onSubject }) {
  return (
    <div className="mock-seg" role="group" aria-label="Chart subject">
      {[
        ['portfolio', 'Portfolio'],
        ['asset', 'Selected asset'],
      ].map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={`mock-seg__btn${subject === id ? ' is-on' : ''}`}
          aria-pressed={subject === id}
          onClick={() => onSubject(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function PerformanceCard({ subject, onSubject, startingCash, symbol, name, livePrice }) {
  const sw = <SubjectSwitch subject={subject} onSubject={onSubject} />;
  return (
    <section className="mock-card mock-perf" aria-label="Portfolio performance">
      {subject === 'portfolio' ? (
        <MockPortfolioChart startingCash={startingCash} headerExtra={sw} />
      ) : (
        <div className="mpc-root">
          <div className="mpc-header">
            <div className="mpc-header-left">
              <h2 className="mpc-title">Portfolio performance</h2>
              {sw}
            </div>
          </div>
          {symbol ? (
            <>
              <p className="mock-perf__asset">
                <span className="mock-num mock-strong">{symbol}</span>
                {name && name !== symbol ? <span className="mock-muted"> {name}</span> : null}
              </p>
              <StockPriceChart symbol={symbol} livePrice={livePrice || null} defaultRange="1Y" />
            </>
          ) : (
            <div className="mpc-empty">
              <i className="bi bi-search mpc-empty-icon" aria-hidden="true" />
              <p>Search a ticker in Place order to chart it here.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Open positions                                                      */
/* ------------------------------------------------------------------ */

const COLUMNS = [
  { key: 'symbol', label: 'Asset', align: 'left' },
  { key: 'opened', label: 'Opened', align: 'left' },
  { key: 'qty', label: 'Qty' },
  { key: 'avgCost', label: 'Avg cost' },
  { key: 'current', label: 'Current' },
  { key: 'pnl', label: 'P&L' },
  { key: 'value', label: 'Current value' },
];

export function PositionsCard({
  rows,
  loading,
  sort,
  onSort,
  onSelect,
  onClose,
  pending,
  priceNote,
}) {
  return (
    <section className="mock-card mock-positions" aria-labelledby="mock-pos-h">
      <header className="mock-card-header">
        <i className="bi bi-briefcase mock-card-icon" aria-hidden="true" />
        <h2 id="mock-pos-h" className="mock-card-title">
          Open positions
        </h2>
        {priceNote ? (
          <span className="mock-note" title={priceNote}>
            <i className="bi bi-exclamation-triangle" aria-hidden="true" /> Some live prices are
            delayed. Showing cost basis for those.
          </span>
        ) : null}
      </header>
      {loading ? (
        <SkeletonRows rows={5} />
      ) : rows.length === 0 ? (
        <p className="mock-empty">
          No open positions yet. Search a ticker to place your first paper trade.
        </p>
      ) : (
        <div className="mock-table-scroll">
          <table className="mock-table">
            <caption className="mock-sr">Open positions, sortable by any column</caption>
            <thead>
              <tr>
                {COLUMNS.map((c) => {
                  const on = sort.key === c.key;
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      className={c.align === 'left' ? 'is-left' : undefined}
                      aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <button type="button" className="mock-sort" onClick={() => onSort(c.key)}>
                        {c.label}
                        <i
                          className={`bi ${on && sort.dir === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill'}${on ? ' is-on' : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                    </th>
                  );
                })}
                <th scope="col">
                  <span className="mock-sr">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const dir = signOf(r.pnl);
                return (
                  <tr key={r.symbol}>
                    <th scope="row" className="is-left">
                      <button
                        type="button"
                        className="mock-asset-btn"
                        onClick={() => onSelect(r)}
                        aria-label={`Load ${r.symbol} into the order ticket`}
                      >
                        <LetterAvatar symbol={r.symbol} />
                        <span className="mock-asset-btn__text">
                          <span className="mock-num mock-strong">{r.symbol}</span>
                          {r.name && r.name !== r.symbol ? (
                            <span className="mock-muted mock-ellipsis">{r.name}</span>
                          ) : null}
                        </span>
                      </button>
                    </th>
                    <td className="is-left mock-soft">
                      {r.openedAt ? fmtDate(r.openedAt) : 'N/A'}
                    </td>
                    <td className="mock-num">{fmtQty(r.qty)}</td>
                    <td className="mock-num">{fmtUSD(r.avgCost)}</td>
                    <td className="mock-num">{fmtUSD(r.currentPrice)}</td>
                    <td className={`mock-num mock-pl is-${dir}`}>
                      <span>{fmtSignedUSD(r.pnl)}</span>
                      <span className="mock-pl__pct">{fmtSignedPct(r.pnlPct)}</span>
                    </td>
                    <td className="mock-num mock-strong">{fmtUSD(r.value)}</td>
                    <td>
                      <button
                        type="button"
                        className="mock-btn mock-btn--sm"
                        onClick={() => onClose(r)}
                        disabled={pending}
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Recent activity                                                     */
/* ------------------------------------------------------------------ */

export function ActivityCard({ items, loading }) {
  const [all, setAll] = useState(false);
  const list = all ? items.slice(0, 50) : items.slice(0, 5);
  return (
    <section className="mock-card mock-activity" aria-labelledby="mock-act-h">
      <header className="mock-card-header">
        <i className="bi bi-clock-history mock-card-icon" aria-hidden="true" />
        <h2 id="mock-act-h" className="mock-card-title">
          Recent activity
        </h2>
        {items.length > 5 ? (
          <button
            type="button"
            className="mock-link"
            aria-expanded={all}
            onClick={() => setAll((v) => !v)}
          >
            {all ? 'Show recent' : 'All activity'}{' '}
            <i className={`bi ${all ? 'bi-chevron-up' : 'bi-arrow-right'}`} aria-hidden="true" />
          </button>
        ) : null}
      </header>
      {loading ? (
        <SkeletonRows rows={4} />
      ) : items.length === 0 ? (
        <p className="mock-empty">No trades yet.</p>
      ) : (
        <ul className="mock-activity__list">
          {list.map((h) => {
            const buy = h.side === 'buy';
            return (
              <li key={h.id || `${h.ts}-${h.symbol}`} className="mock-activity__row">
                <span className={`mock-dot ${buy ? 'is-up' : 'is-down'}`} aria-hidden="true" />
                <div className="mock-activity__text">
                  <span className="mock-strong">
                    {buy ? 'Bought' : 'Sold'} <span className="mock-num">{h.symbol}</span>
                  </span>
                  <span className="mock-muted mock-small">
                    <span className="mock-num">{fmtQty(h.qty)}</span> shares @{' '}
                    <span className="mock-num">{fmtUSD(h.price)}</span> · {fmtDateTime(h.ts)}
                  </span>
                </div>
                <span className="mock-num mock-strong">{fmtUSD(h.total)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Market movers                                                       */
/* ------------------------------------------------------------------ */

const pctOf = (m) => {
  const n = parseFloat(String(m?.change ?? '').replace(/[%+]/g, ''));
  return Number.isFinite(n) ? n : null;
};

export function MarketMoversCard({ onSelect }) {
  const [state, setState] = useState({ status: 'loading', rows: [] });
  useEffect(() => {
    let cancelled = false;
    fetch('/api/fmp/movers?limit=5', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { gainers: [], losers: [] }))
      .then((d) => {
        if (cancelled) return;
        const rows = [...(d.gainers || []), ...(d.losers || [])]
          .map((m) => ({ ticker: m.ticker, name: m.name, price: Number(m.price), pct: pctOf(m) }))
          .filter((m) => m.ticker && m.pct != null)
          .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
          .slice(0, 5);
        setState({ status: 'ready', rows });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'ready', rows: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mock-card mock-movers" aria-labelledby="mock-mov-h">
      <header className="mock-card-header">
        <i className="bi bi-fire mock-card-icon" aria-hidden="true" />
        <h2 id="mock-mov-h" className="mock-card-title">
          Market movers
        </h2>
        <Link href="/market-analysis" className="mock-link">
          View more <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </header>
      {state.status === 'loading' ? (
        <SkeletonRows rows={5} />
      ) : state.rows.length === 0 ? (
        <p className="mock-empty">Market movers are unavailable right now.</p>
      ) : (
        <ul className="mock-movers__list">
          {state.rows.map((m) => (
            <li key={m.ticker}>
              <button
                type="button"
                className="mock-movers__row"
                onClick={() => onSelect(m.ticker, m.name)}
                aria-label={`Load ${m.ticker} into the order ticket, ${fmtSignedPct(m.pct)} today`}
              >
                <LetterAvatar symbol={m.ticker} />
                <span className="mock-movers__text">
                  <span className="mock-num mock-strong">{m.ticker}</span>
                  <span className="mock-muted mock-small mock-ellipsis">{m.name}</span>
                </span>
                <span className="mock-num mock-strong">{fmtUSD(m.price)}</span>
                <span className={`mock-chip mock-num is-${signOf(m.pct)}`}>
                  {fmtSignedPct(m.pct)}
                </span>
              </button>
            </li>
          ))}
        </ul>
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
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
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
