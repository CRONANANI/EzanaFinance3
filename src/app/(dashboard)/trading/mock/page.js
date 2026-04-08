'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import StockPriceChart from '@/components/research/StockPriceChart';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import '../../home-dashboard/home-dashboard.css';
import './mock-trading.css';

/* ──────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────── */
const STARTING_CASH = 100_000;

const freshPortfolio = () => ({
  cash: STARTING_CASH,
  positions: {},
  history: [],
});

const POPULAR_ASSETS = [
  { symbol: 'AAPL', name: 'Apple Inc', type: 'Stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corp', type: 'Stock' },
  { symbol: 'MSFT', name: 'Microsoft Corp', type: 'Stock' },
  { symbol: 'TSLA', name: 'Tesla Inc', type: 'Stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc', type: 'Stock' },
  { symbol: 'AMZN', name: 'Amazon.com', type: 'Stock' },
  { symbol: 'META', name: 'Meta Platforms', type: 'Stock' },
  { symbol: 'BTCUSD', name: 'Bitcoin / USD', type: 'Crypto' },
  { symbol: 'ETHUSD', name: 'Ethereum / USD', type: 'Crypto' },
  { symbol: 'GCUSD', name: 'Gold Spot', type: 'Commodity' },
  { symbol: 'SIUSD', name: 'Silver Spot', type: 'Commodity' },
  { symbol: 'CLUSD', name: 'Crude Oil WTI', type: 'Commodity' },
  { symbol: 'SPY', name: 'S&P 500 ETF', type: 'ETF' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', type: 'ETF' },
];

/* ──────────────────────────────────────────
   HELPERS
────────────────────────────────────────── */
function fmtUSD(n) {
  return `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtChange(n) {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${fmtUSD(n)}`;
}

/* ──────────────────────────────────────────
   MAIN PAGE
────────────────────────────────────────── */
export default function MockTradingPage() {
  /* Portfolio state — backed by Supabase via useMockPortfolio */
  const {
    portfolio: portfolioFromHook,
    setPortfolio,
    syncing,
    liveQuotes: hookQuotes,
  } = useMockPortfolio();

  // Use hook portfolio; fall back to fresh if not loaded yet
  const portfolio = portfolioFromHook ?? freshPortfolio();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [selectedName, setSelectedName] = useState('Apple Inc');
  const [selectedType, setSelectedType] = useState('Stock');
  const [quoteData, setQuoteData] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const [side, setSide] = useState('buy');
  const [amount, setAmount] = useState('');

  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);

  const fetchQuote = useCallback(async (sym) => {
    if (!sym) return;
    setQuoteLoading(true);
    try {
      const r = await fetch(`/api/fmp/quote?symbol=${encodeURIComponent(sym)}`);
      const d = await r.json();
      setQuoteData(d?.price != null ? d : null);
    } catch {
      setQuoteData(null);
    } finally {
      setQuoteLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuote(selectedSymbol);
  }, [selectedSymbol, fetchQuote]);

  useEffect(() => {
    if (!quoteData?.price || !selectedSymbol) return;
    setPortfolio(
      (prev) => {
        if (!prev.positions[selectedSymbol]) return prev;
        return {
          ...prev,
          positions: {
            ...prev.positions,
            [selectedSymbol]: {
              ...prev.positions[selectedSymbol],
              currentPrice: quoteData.price,
            },
          },
        };
      },
      { skipSync: true }
    );
  }, [quoteData, selectedSymbol, setPortfolio]);

  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const r = await fetch(`/api/fmp/search?q=${encodeURIComponent(q.trim())}`);
      if (r.ok) {
        const d = await r.json();
        setSearchResults(Array.isArray(d) ? d.slice(0, 10) : []);
      } else {
        const q2 = q.toLowerCase();
        setSearchResults(
          POPULAR_ASSETS.filter(
            (a) => a.symbol.toLowerCase().includes(q2) || a.name.toLowerCase().includes(q2)
          ).slice(0, 8)
        );
      }
    } catch {
      const q2 = q.toLowerCase();
      setSearchResults(
        POPULAR_ASSETS.filter(
          (a) => a.symbol.toLowerCase().includes(q2) || a.name.toLowerCase().includes(q2)
        ).slice(0, 8)
      );
    }
    setSearchLoading(false);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(searchQuery), 280);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, doSearch]);

  const selectAsset = (symbol, name, type) => {
    setSelectedSymbol(symbol.toUpperCase());
    setSelectedName(name);
    setSelectedType(type ?? 'Stock');
    setSearchQuery('');
    setSearchResults([]);
    setAmount('');
  };

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3200);
  };

  const executeTrade = () => {
    const price = quoteData?.price;
    if (!price || price <= 0) {
      showToast('Could not get current price.', 'error');
      return;
    }
    const dollarAmount = parseFloat(amount);
    if (!dollarAmount || dollarAmount <= 0) {
      showToast('Enter a valid amount.', 'error');
      return;
    }
    const qty = dollarAmount / price;

    if (side === 'buy') {
      if (dollarAmount > portfolio.cash) {
        showToast('Insufficient funds.', 'error');
        return;
      }
      setPortfolio((prev) => {
        const total = dollarAmount;
        const p = { ...prev, cash: prev.cash - total };
        const existing = p.positions[selectedSymbol];
        if (existing) {
          const newQty = existing.qty + qty;
          const newAvgCost = (existing.avgCost * existing.qty + price * qty) / newQty;
          p.positions = {
            ...p.positions,
            [selectedSymbol]: {
              ...existing,
              qty: newQty,
              avgCost: newAvgCost,
              currentPrice: price,
            },
          };
        } else {
          p.positions = {
            ...p.positions,
            [selectedSymbol]: {
              symbol: selectedSymbol,
              name: selectedName,
              type: selectedType,
              qty,
              avgCost: price,
              currentPrice: price,
            },
          };
        }
        p.history = [
          {
            id: Date.now(),
            side: 'buy',
            symbol: selectedSymbol,
            qty,
            price,
            total,
            ts: new Date().toISOString(),
          },
          ...p.history,
        ].slice(0, 100);
        return p;
      });
      showToast(`✓ Bought ${fmtUSD(dollarAmount)} of ${selectedSymbol} @ ${fmtUSD(price)}`);
      setAmount('');
      return;
    }

    const pos = portfolio.positions[selectedSymbol];
    if (!pos || pos.qty <= 0) {
      showToast(`No ${selectedSymbol} position to sell.`, 'error');
      return;
    }
    const sellQty = Math.min(qty, pos.qty);
    const sellTotal = sellQty * price;

    setPortfolio((prev) => {
      const pPos = prev.positions[selectedSymbol];
      if (!pPos || pPos.qty <= 0) return prev;
      const sq = Math.min(qty, pPos.qty);
      const st = sq * price;
      const p = { ...prev, cash: prev.cash + st };
      const newQty = pPos.qty - sq;
      if (newQty < 0.00001) {
        const { [selectedSymbol]: _, ...rest } = p.positions;
        p.positions = rest;
      } else {
        p.positions = {
          ...p.positions,
          [selectedSymbol]: { ...pPos, qty: newQty, currentPrice: price },
        };
      }
      p.history = [
        {
          id: Date.now(),
          side: 'sell',
          symbol: selectedSymbol,
          qty: sq,
          price,
          total: st,
          ts: new Date().toISOString(),
        },
        ...p.history,
      ].slice(0, 100);
      return p;
    });
    showToast(`✓ Sold ${fmtUSD(sellTotal)} of ${selectedSymbol} @ ${fmtUSD(price)}`);
    setAmount('');
  };

  const closePosition = async (sym) => {
    const pos = portfolio.positions[sym];
    if (!pos) return;

    let price = pos.currentPrice;
    if (!price || price <= 0) {
      try {
        const r = await fetch(`/api/fmp/quote?symbol=${encodeURIComponent(sym)}`);
        const d = await r.json();
        price = d?.price ?? 0;
      } catch {
        price = 0;
      }
    }

    if (!price) {
      showToast('Could not get price to close position.', 'error');
      return;
    }

    const total = pos.qty * price;
    setPortfolio((prev) => {
      const { [sym]: _, ...rest } = prev.positions;
      return {
        ...prev,
        cash: prev.cash + total,
        positions: rest,
        history: [
          {
            id: Date.now(),
            side: 'sell',
            symbol: sym,
            qty: pos.qty,
            price,
            total,
            ts: new Date().toISOString(),
          },
          ...prev.history,
        ].slice(0, 100),
      };
    });
    showToast(`✓ Closed ${sym} position for ${fmtUSD(total)}`);
  };

  const positionsList = Object.values(portfolio.positions);
  const totalPositionValue = positionsList.reduce(
    (s, p) => s + (p.currentPrice ?? p.avgCost) * p.qty,
    0
  );
  const totalPortfolioValue = portfolio.cash + totalPositionValue;
  const totalPnl = totalPortfolioValue - STARTING_CASH;
  const totalPnlPct = (totalPortfolioValue / STARTING_CASH - 1) * 100;

  const currentPrice = quoteData?.price ?? 0;
  const dollarAmount = parseFloat(amount) || 0;
  const estimatedQty = currentPrice > 0 ? dollarAmount / currentPrice : 0;

  const currentPosition = portfolio.positions[selectedSymbol];
  const canSell = currentPosition && currentPosition.qty > 0;

  const quoteChange = quoteData?.change ?? 0;
  const quoteChangePct =
    quoteData?.changesPercentage ?? quoteData?.changePercentage ?? 0;

  return (
    <div className="mock-page dashboard-page-inset">
      <div className="mock-header">
        <div className="mock-header-left">
          <Link
            href="/trading"
            style={{
              color: '#6b7280',
              textDecoration: 'none',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            <i className="bi bi-arrow-left" /> Trading
          </Link>
          <span style={{ color: '#374151' }}>/</span>
          <h1 className="mock-title">Mock Trading</h1>
          <span className="mock-badge">
            <i className="bi bi-controller" /> Paper Account
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {syncing && (
            <span
              style={{
                fontSize: '0.7rem',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                style={{ animation: 'mock-portfolio-spin 0.9s linear infinite' }}
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                <path
                  d="M12 2a10 10 0 0 1 10 10"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Saving…
            </span>
          )}
          <button
            className="mock-reset-btn"
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  'Reset your mock portfolio back to $100,000? This cannot be undone.'
                )
              ) {
                const fresh = { cash: 100_000, positions: {}, history: [] };
                setPortfolio(fresh);
                showToast('Portfolio reset to $100,000.');
              }
            }}
          >
            <i className="bi bi-arrow-counterclockwise" /> Reset Portfolio
          </button>
        </div>
      </div>

      <div className="mock-portfolio-strip">
        <div className="mock-stat-card">
          <span className="mock-stat-label">Total Value</span>
          <span className="mock-stat-value">{fmtUSD(totalPortfolioValue)}</span>
          <span className="mock-stat-sub">Cash + Positions</span>
        </div>
        <div className="mock-stat-card">
          <span className="mock-stat-label">Cash Available</span>
          <span className="mock-stat-value">{fmtUSD(portfolio.cash)}</span>
          <span className="mock-stat-sub">Ready to deploy</span>
        </div>
        <div className="mock-stat-card">
          <span className="mock-stat-label">Total P&amp;L</span>
          <span className={`mock-stat-value ${totalPnl >= 0 ? 'positive' : 'negative'}`}>
            {fmtChange(totalPnl)}
          </span>
          <span className="mock-stat-sub">
            {totalPnlPct >= 0 ? '+' : ''}
            {totalPnlPct.toFixed(2)}% vs $100K
          </span>
        </div>
        <div className="mock-stat-card">
          <span className="mock-stat-label">Open Positions</span>
          <span className="mock-stat-value">{positionsList.length}</span>
          <span className="mock-stat-sub">{fmtUSD(totalPositionValue)} invested</span>
        </div>
      </div>

      <div className="mock-layout">
        <div className="mock-left-col">
          <div className="mock-card">
            <div className="mock-card-body" style={{ paddingTop: '1.125rem' }}>
              <StockPriceChart symbol={selectedSymbol} livePrice={currentPrice || null} />
            </div>
          </div>

          <div className="mock-card">
            <div className="mock-card-header">
              <h3>
                <i className="bi bi-briefcase" /> Open Positions
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {positionsList.length} position{positionsList.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="mock-card-body" style={{ padding: '0 1.25rem 1rem' }}>
              {positionsList.length === 0 ? (
                <div className="mock-empty-state">
                  <i className="bi bi-inbox" />
                  <p>No open positions. Search for an asset and place your first trade.</p>
                </div>
              ) : (
                <table className="mock-positions-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Qty</th>
                      <th>Avg Cost</th>
                      <th>Current</th>
                      <th>P&amp;L</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {positionsList.map((pos) => {
                      const curPrice = pos.currentPrice ?? pos.avgCost;
                      const pnl = (curPrice - pos.avgCost) * pos.qty;
                      const pnlPct = (curPrice / pos.avgCost - 1) * 100;
                      return (
                        <tr key={pos.symbol}>
                          <td>
                            <button
                              className="mock-pos-ticker"
                              type="button"
                              onClick={() => selectAsset(pos.symbol, pos.name, pos.type)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                font: 'inherit',
                                cursor: 'pointer',
                              }}
                            >
                              {pos.symbol}
                            </button>
                            <span className="mock-pos-name">{pos.name}</span>
                          </td>
                          <td
                            style={{
                              color: 'var(--foreground, #f0f6fc)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {pos.qty < 1 ? pos.qty.toFixed(4) : pos.qty.toFixed(2)}
                          </td>
                          <td
                            style={{
                              color: 'var(--foreground, #f0f6fc)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {fmtUSD(pos.avgCost)}
                          </td>
                          <td
                            style={{
                              color: 'var(--foreground, #f0f6fc)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {fmtUSD(curPrice)}
                          </td>
                          <td>
                            <span className={`mock-pnl ${pnl >= 0 ? 'positive' : 'negative'}`}>
                              {pnl >= 0 ? '+' : ''}
                              {fmtUSD(pnl)}
                              <br />
                              <span style={{ fontSize: '0.65rem', fontWeight: 500 }}>
                                {pnlPct >= 0 ? '+' : ''}
                                {pnlPct.toFixed(2)}%
                              </span>
                            </span>
                          </td>
                          <td>
                            <button
                              className="mock-close-pos-btn"
                              type="button"
                              onClick={() => closePosition(pos.symbol)}
                            >
                              Close
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {portfolio.history.length > 0 && (
            <div className="mock-card">
              <div className="mock-card-header">
                <h3>
                  <i className="bi bi-clock-history" /> Recent Activity
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {portfolio.history.length} trade{portfolio.history.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="mock-card-body" style={{ padding: '0 1.25rem 1rem' }}>
                <div className="mock-activity-list">
                  {portfolio.history.slice(0, 12).map((h) => (
                    <div className="mock-activity-item" key={h.id}>
                      <div className={`mock-activity-dot ${h.side}`} />
                      <div className="mock-activity-body">
                        <div className="mock-activity-label">
                          {h.side === 'buy' ? 'Bought' : 'Sold'} {h.symbol}
                        </div>
                        <div className="mock-activity-meta">
                          {h.qty < 1 ? h.qty.toFixed(4) : h.qty.toFixed(2)} shares @ {fmtUSD(h.price)}{' '}
                          ·{' '}
                          {new Date(h.ts).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="mock-activity-amount">{fmtUSD(h.total)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mock-trade-panel">
          <div className="mock-trade-panel-header">
            <i className="bi bi-graph-up-arrow" style={{ color: '#10b981' }} />
            <h3>Place Order</h3>
          </div>
          <div className="mock-trade-body">
            <div className="mock-field">
              <label>Search Asset</label>
              <div className="mock-search-wrap" ref={searchRef}>
                <i className="bi bi-search mock-search-icon" />
                <input
                  type="text"
                  className="mock-search-input"
                  placeholder="AAPL, Bitcoin, Gold..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ fontSize: '16px' }}
                />
                {(searchResults.length > 0 || (searchQuery.length >= 1 && searchLoading)) && (
                  <div className="mock-search-results">
                    {searchLoading && (
                      <div
                        style={{ padding: '0.75rem 0.875rem', color: '#6b7280', fontSize: '0.8125rem' }}
                      >
                        Searching…
                      </div>
                    )}
                    {searchResults.map((r) => (
                      <div
                        key={r.symbol ?? r.ticker}
                        className="mock-search-result-item"
                        onMouseDown={() =>
                          selectAsset(
                            r.symbol ?? r.ticker,
                            r.name ?? r.description ?? r.symbol,
                            r.type ?? r.assetType ?? 'Stock'
                          )
                        }
                        role="presentation"
                      >
                        <div>
                          <div className="mock-result-symbol">{r.symbol ?? r.ticker}</div>
                          <div className="mock-result-name">{r.name ?? r.description}</div>
                        </div>
                        <span className="mock-result-type">{r.type ?? r.assetType ?? 'Stock'}</span>
                      </div>
                    ))}
                  </div>
                )}
                {searchQuery.length === 0 && searchResults.length === 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.375rem',
                      marginTop: '0.5rem',
                    }}
                  >
                    {POPULAR_ASSETS.slice(0, 8).map((a) => (
                      <button
                        key={a.symbol}
                        type="button"
                        onClick={() => selectAsset(a.symbol, a.name, a.type)}
                        style={{
                          padding: '0.25rem 0.625rem',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          color: selectedSymbol === a.symbol ? '#fff' : '#6b7280',
                          background:
                            selectedSymbol === a.symbol ? '#10b981' : 'rgba(16,185,129,0.05)',
                          border: `1px solid ${selectedSymbol === a.symbol ? '#10b981' : 'rgba(16,185,129,0.1)'}`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'all 0.12s',
                        }}
                      >
                        {a.symbol}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mock-asset-selected">
              <div className="mock-asset-left">
                <span className="mock-asset-ticker">{selectedSymbol}</span>
                <span className="mock-asset-name">{selectedName}</span>
              </div>
              <div className="mock-asset-right">
                {quoteLoading ? (
                  <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>Loading…</span>
                ) : currentPrice > 0 ? (
                  <>
                    <div className="mock-asset-price">{fmtUSD(currentPrice)}</div>
                    <span
                      className={`mock-asset-change ${quoteChange >= 0 ? 'positive' : 'negative'}`}
                    >
                      {quoteChange >= 0 ? '+' : ''}
                      {fmtUSD(quoteChange)} ({quoteChangePct >= 0 ? '+' : ''}
                      {Number(quoteChangePct).toFixed(2)}%)
                    </span>
                  </>
                ) : (
                  <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>No price data</span>
                )}
              </div>
            </div>

            <div className="mock-side-tabs">
              <button
                className={`mock-side-tab buy ${side === 'buy' ? 'active' : ''}`}
                type="button"
                onClick={() => setSide('buy')}
              >
                Buy
              </button>
              <button
                className={`mock-side-tab sell ${side === 'sell' ? 'active' : ''}`}
                type="button"
                onClick={() => setSide('sell')}
                disabled={!canSell}
                style={{ opacity: !canSell ? 0.4 : 1 }}
              >
                Sell
              </button>
            </div>

            <div className="mock-field">
              <label>Amount (USD)</label>
              <div className="mock-amount-wrap">
                <span className="mock-amount-prefix">$</span>
                <input
                  type="number"
                  className="mock-input with-prefix"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  step="any"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div className="mock-quick-btns">
                {[100, 500, 1000, 5000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    className="mock-quick-btn"
                    onClick={() => setAmount(String(v))}
                  >
                    ${v.toLocaleString()}
                  </button>
                ))}
                <button
                  type="button"
                  className="mock-quick-btn"
                  onClick={() =>
                    setAmount(
                      side === 'buy'
                        ? Math.floor(portfolio.cash).toString()
                        : currentPosition
                          ? String(
                              Math.round(
                                currentPosition.qty *
                                  (currentPosition.currentPrice ?? currentPosition.avgCost) *
                                  100
                              ) / 100
                            )
                          : ''
                    )
                  }
                >
                  Max
                </button>
              </div>
            </div>

            {dollarAmount > 0 && currentPrice > 0 && (
              <div className="mock-order-summary">
                <div className="mock-order-row">
                  <span>Est. shares</span>
                  <span>
                    {estimatedQty < 1 ? estimatedQty.toFixed(4) : estimatedQty.toFixed(2)}
                  </span>
                </div>
                <div className="mock-order-row">
                  <span>Price per share</span>
                  <span>{fmtUSD(currentPrice)}</span>
                </div>
                {side === 'buy' && (
                  <div className="mock-order-row">
                    <span>Cash after</span>
                    <span
                      style={{
                        color: portfolio.cash - dollarAmount < 0 ? '#ef4444' : undefined,
                      }}
                    >
                      {fmtUSD(Math.max(0, portfolio.cash - dollarAmount))}
                    </span>
                  </div>
                )}
                <div
                  className="mock-order-row total"
                  style={{
                    borderTop: '1px solid rgba(16,185,129,0.08)',
                    paddingTop: '4px',
                    marginTop: '2px',
                  }}
                >
                  <span>Order total</span>
                  <span>{fmtUSD(dollarAmount)}</span>
                </div>
              </div>
            )}

            <button
              className={`mock-submit-btn ${side}`}
              type="button"
              onClick={executeTrade}
              disabled={
                !currentPrice ||
                !dollarAmount ||
                dollarAmount <= 0 ||
                (side === 'buy' && dollarAmount > portfolio.cash)
              }
            >
              {side === 'buy' ? `Buy ${selectedSymbol}` : `Sell ${selectedSymbol}`}
            </button>

            {side === 'buy' && dollarAmount > portfolio.cash && (
              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#ef4444', margin: 0 }}>
                Insufficient funds — available: {fmtUSD(portfolio.cash)}
              </p>
            )}

            <p
              style={{
                textAlign: 'center',
                fontSize: '0.65rem',
                color: '#4b5563',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Paper trading only. No real money involved. Prices are real-time via FMP.
            </p>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`mock-toast ${toast.type}`}>
          {toast.type === 'success' ? (
            <i className="bi bi-check-circle-fill" style={{ color: '#10b981' }} />
          ) : (
            <i className="bi bi-x-circle-fill" style={{ color: '#ef4444' }} />
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
