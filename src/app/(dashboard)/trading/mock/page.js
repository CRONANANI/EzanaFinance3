'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo, Fragment, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import { useCompanySearchFinnhub } from '@/hooks/useFinnhub';

/* Both StockPriceChart (Recharts) and ResetPortfolioModal are not on the
   critical path for the mock-trading dashboard — the chart renders inside a
   tab panel, the modal only after a confirm click. Lazy chunks keep the
   initial 268 kB bundle smaller. */
const StockPriceChart = dynamic(
  () => import('@/components/research/StockPriceChart'),
  { ssr: false, loading: () => <div style={{ height: 360 }} aria-hidden /> }
);
const ResetPortfolioModal = dynamic(
  () => import('@/components/trading/ResetPortfolioModal'),
  { ssr: false, loading: () => null }
);
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
  startingCash: STARTING_CASH,
});

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

function resolveOpenedAt(pos, history) {
  if (pos.openedAt) return pos.openedAt;
  // Fallback for legacy positions saved before openedAt was stamped:
  // find the earliest 'buy' entry in history for this symbol.
  const buys = (history || [])
    .filter((h) => h.side === 'buy' && h.symbol === pos.symbol)
    .map((h) => h.ts)
    .filter(Boolean)
    .sort();
  return buys[0] || null;
}

function formatOpenedDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Normalize live quote entries (numbers or numeric strings from API). */
function resolveLivePrice(entry) {
  if (!entry || entry.price == null) return null;
  const p = entry.price;
  if (typeof p === 'number' && Number.isFinite(p) && p > 0) return p;
  if (typeof p === 'string' && p.trim() !== '') {
    const n = Number(p);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function chunkSymbols(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Position with highest market value (qty × current price), for default chart symbol. */
function getLargestPositionByValue(positions, livePrices) {
  const list = Object.values(positions || {});
  if (list.length === 0) return null;
  let best = null;
  let bestVal = -Infinity;
  let bestSym = '';
  for (const pos of list) {
    const sym = String(pos.symbol || '').trim().toUpperCase();
    const livePx = resolveLivePrice(livePrices[sym]);
    const px = livePx ?? pos.currentPrice ?? pos.avgCost;
    const val = Number(px) * Number(pos.qty);
    if (val > bestVal || (val === bestVal && sym < bestSym)) {
      bestVal = val;
      best = pos;
      bestSym = sym;
    }
  }
  return best;
}

const MOCK_QUOTE_CHUNK = 45;

/* ──────────────────────────────────────────
   MAIN PAGE
────────────────────────────────────────── */
function MockTradingPageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  /* Portfolio state — backed by Supabase via useMockPortfolio */
  const { portfolio: portfolioFromHook, setPortfolio, syncing } = useMockPortfolio();
  const [dbTrades, setDbTrades] = useState([]);

  const persistMockTrade = useCallback(
    async (payload) => {
      if (!user?.id) return;
      try {
        const res = await fetch('/api/mock-trades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) return;
        const listRes = await fetch('/api/mock-trades');
        const data = listRes.ok ? await listRes.json() : { trades: [] };
        setDbTrades(data.trades || []);
      } catch {
        /* ignore */
      }
    },
    [user?.id],
  );

  useEffect(() => {
    if (!user?.id) {
      setDbTrades([]);
      return;
    }
    let cancelled = false;
    fetch('/api/mock-trades')
      .then((r) => (r.ok ? r.json() : { trades: [] }))
      .then((d) => {
        if (!cancelled) setDbTrades(d.trades || []);
      })
      .catch(() => {
        if (!cancelled) setDbTrades([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Use hook portfolio; fall back to fresh if not loaded yet
  const portfolio = portfolioFromHook ?? freshPortfolio();

  /* Same symbol search as Company Research page (Finnhub via /api/finnhub/search) */
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    suggestions: searchResults,
    loading: searchLoading,
    clearSuggestions,
  } = useCompanySearchFinnhub();

  const searchRef = useRef(null);
  /** When true, chart ticker follows user search/table picks; when false, chart defaults to largest position (or AAPL). */
  const userExplicitChartPickRef = useRef(false);

  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [selectedName, setSelectedName] = useState('');
  const [selectedType, setSelectedType] = useState('Stock');
  const [quoteData, setQuoteData] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const [side, setSide] = useState('buy');
  const [amount, setAmount] = useState('');

  const [toast, setToast] = useState(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const toastRef = useRef(null);
  const [livePrices, setLivePrices] = useState({});
  const [priceFetchError, setPriceFetchError] = useState(null);

  const fetchQuote = useCallback(async (sym) => {
    if (!sym) return;
    setQuoteLoading(true);
    try {
      const r = await fetch(`/api/fmp/quote?symbol=${encodeURIComponent(sym)}`, {
        cache: 'no-store',
      });
      const d = await r.json();
      setQuoteData(d?.price != null && !d.error ? d : null);
    } catch {
      setQuoteData(null);
    } finally {
      setQuoteLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedSymbol) {
      setQuoteData(null);
      return;
    }
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

  // Broadcast live prices from the batch FMP fetch into
  // every position's currentPrice field. Without this,
  // pos.currentPrice only gets updated for the ticker
  // currently selected in Place Order (via the effect
  // above), leaving every other position stuck at its
  // cost basis. This effect runs whenever livePrices
  // changes and patches every matching position at once.
  useEffect(() => {
    const liveKeys = Object.keys(livePrices);
    if (liveKeys.length === 0) return;

    setPortfolio(
      (prev) => {
        if (!prev.positions || Object.keys(prev.positions).length === 0) {
          return prev;
        }

        let anyChanged = false;
        const nextPositions = {};
        for (const [sym, pos] of Object.entries(prev.positions)) {
          const symUpper = String(sym).toUpperCase();
          const livePx = resolveLivePrice(livePrices[symUpper]);
          if (
            typeof livePx === 'number' &&
            livePx > 0 &&
            livePx !== pos.currentPrice
          ) {
            nextPositions[sym] = { ...pos, currentPrice: livePx };
            anyChanged = true;
          } else {
            nextPositions[sym] = pos;
          }
        }

        if (!anyChanged) return prev;

        return { ...prev, positions: nextPositions };
      },
      { skipSync: true }
    );
  }, [livePrices, setPortfolio]);

  const normalizeAssetType = (t) => {
    if (!t || typeof t !== 'string') return 'Stock';
    if (t.includes('ETF')) return 'ETF';
    if (t.includes('Crypto')) return 'Crypto';
    if (t.includes('Commodity')) return 'Commodity';
    return 'Stock';
  };

  const selectAsset = useCallback(
    (symbol, name, type, { userInitiated = true } = {}) => {
      if (userInitiated) userExplicitChartPickRef.current = true;
      setSelectedSymbol(String(symbol).toUpperCase());
      setSelectedName(name || symbol);
      setSelectedType(normalizeAssetType(type));
      setSearchQuery('');
      clearSuggestions();
      setAmount('');
    },
    [clearSuggestions, setSearchQuery]
  );

  /** Enter a ticker directly (same behavior as Company Research search bar) */
  const submitSearchAsTicker = useCallback(() => {
    const q = searchQuery.trim();
    if (!q) return;
    const sym = q.toUpperCase();
    selectAsset(sym, sym, 'Stock', { userInitiated: true });
  }, [searchQuery, selectAsset]);

  useLayoutEffect(() => {
    const raw = searchParams.get('symbol');
    if (!raw?.trim()) return;
    const sym = raw.trim().toUpperCase();
    selectAsset(sym, sym, 'Stock', { userInitiated: true });
  }, [searchParams, selectAsset]);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        clearSuggestions();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [clearSuggestions]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3200);
  };

  const executeTrade = () => {
    if (!selectedSymbol) {
      showToast('Search for a ticker to trade.', 'error');
      return;
    }
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
              openedAt: new Date().toISOString(),
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
      void persistMockTrade({
        ticker: selectedSymbol,
        quantity: qty,
        price,
        trade_type: 'buy',
        total_amount: dollarAmount,
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
    void persistMockTrade({
      ticker: selectedSymbol,
      quantity: sellQty,
      price,
      trade_type: 'sell',
      total_amount: sellTotal,
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
        const r = await fetch(`/api/fmp/quote?symbol=${encodeURIComponent(sym)}`, {
          cache: 'no-store',
        });
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
    void persistMockTrade({
      ticker: sym,
      quantity: pos.qty,
      price,
      trade_type: 'sell',
      total_amount: total,
    });
    showToast(`✓ Closed ${sym} position for ${fmtUSD(total)}`);
  };

  const mergedActivity = useMemo(() => {
    if (dbTrades.length > 0) {
      return dbTrades.map((r) => ({
        id: r.id,
        side: r.trade_type,
        symbol: r.ticker,
        qty: Number(r.quantity),
        price: Number(r.price),
        total: Number(r.total_amount ?? Number(r.quantity) * Number(r.price)),
        ts: r.created_at,
      }));
    }
    return portfolio.history || [];
  }, [dbTrades, portfolio.history]);

  const enrichedPositions = useMemo(() => {
    const list = Object.values(portfolio.positions || {});
    return list.map((pos) => {
      const sym = String(pos.symbol || '').trim().toUpperCase();
      const livePx = resolveLivePrice(livePrices[sym]);
      const curPrice = livePx ?? pos.currentPrice ?? pos.avgCost;
      const pnl = (curPrice - pos.avgCost) * pos.qty;
      const pnlPct = pos.avgCost ? (curPrice / pos.avgCost - 1) * 100 : 0;
      return {
        symbol: sym,
        qty: pos.qty,
        avgCost: pos.avgCost,
        currentPrice: curPrice,
        pnl,
        pnlPct,
        openedAt: resolveOpenedAt(pos, portfolio.history),
      };
    });
  }, [portfolio.positions, portfolio.history, livePrices]);

  const positionsList = Object.values(portfolio.positions || {});
  const openPositionSymbolsKey = useMemo(() => {
    const set = new Set();
    for (const p of Object.values(portfolio.positions || {})) {
      const s = String(p.symbol || '').trim().toUpperCase();
      if (s) set.add(s);
    }
    return [...set].sort().join(',');
  }, [portfolio.positions]);

  useLayoutEffect(() => {
    if (userExplicitChartPickRef.current) return;
    const best = getLargestPositionByValue(portfolio.positions, livePrices);
    if (best) {
      const sym = String(best.symbol).toUpperCase();
      setSelectedSymbol(sym);
      setSelectedName(best.name || sym);
      setSelectedType(normalizeAssetType(best.type));
    } else {
      setSelectedSymbol(null);
      setSelectedName('');
      setSelectedType('Stock');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync default chart ticker when positions/prices change; skip when user picked explicitly
  }, [openPositionSymbolsKey, livePrices, portfolio.positions]);
  const totalPositionValue = positionsList.reduce((s, p) => {
    const sym = String(p.symbol || '').trim().toUpperCase();
    const livePx = resolveLivePrice(livePrices[sym]);
    const px = livePx ?? p.currentPrice ?? p.avgCost;
    return s + px * p.qty;
  }, 0);
  const totalPortfolioValue = portfolio.cash + totalPositionValue;
  const effectiveStart = portfolio?.startingCash ?? STARTING_CASH;
  const totalPnl = totalPortfolioValue - effectiveStart;
  const totalPnlPct = effectiveStart > 0 ? (totalPortfolioValue / effectiveStart - 1) * 100 : 0;

  useEffect(() => {
    const symbols = [...new Set(
      Object.values(portfolio.positions || {})
        .map((p) => String(p.symbol || '').trim().toUpperCase())
        .filter(Boolean),
    )].sort();

    if (symbols.length === 0) {
      setLivePrices({});
      setPriceFetchError(null);
      return undefined;
    }

    let cancelled = false;
    let retryTimeout = null;
    const symbolsSet = new Set(symbols);

    const fetchQuotes = async () => {
      try {
        const combined = {};
        const chunks = chunkSymbols(symbols, MOCK_QUOTE_CHUNK);

        for (const group of chunks) {
          if (cancelled) return;
          const qs = encodeURIComponent(group.join(','));
          const res = await fetch(`/api/fmp/quote?symbols=${qs}`, { cache: 'no-store' });
          const data = await res.json().catch(() => null);
          if (cancelled) return;

          if (!data) {
            setPriceFetchError(`HTTP ${res.status} — response not JSON`);
            continue;
          }

          if (data.priceMap && typeof data.priceMap === 'object') {
            Object.assign(combined, data.priceMap);
          }
        }

        if (cancelled) return;

        const missingAfterBatch = symbols.filter((sym) => resolveLivePrice(combined[sym]) == null);
        for (const sym of missingAfterBatch) {
          if (cancelled) return;
          try {
            const res = await fetch(`/api/fmp/quote?symbol=${encodeURIComponent(sym)}`, {
              cache: 'no-store',
            });
            const d = await res.json().catch(() => null);
            if (!d || d.error) continue;
            const px = resolveLivePrice({ price: d.price });
            if (px != null) {
              combined[sym] = {
                price: px,
                change: typeof d.change === 'number' ? d.change : Number(d.change) || 0,
                changesPercentage:
                  typeof d.changesPercentage === 'number'
                    ? d.changesPercentage
                    : Number(d.changesPercentage ?? d.changePercentage) || 0,
              };
            }
          } catch {
            /* ignore per-symbol */
          }
        }

        setLivePrices((prev) => {
          const next = { ...prev, ...combined };
          for (const k of Object.keys(next)) {
            if (!symbolsSet.has(k)) delete next[k];
          }
          return next;
        });

        const stillMissing = symbols.filter((sym) => resolveLivePrice(combined[sym]) == null);
        if (stillMissing.length > 0) {
          setPriceFetchError(
            `No live price for: ${stillMissing.join(', ')} (showing cost basis as fallback)`,
          );
        } else {
          setPriceFetchError(null);
        }
      } catch (err) {
        if (!cancelled) setPriceFetchError(err?.message || 'fetch threw');
      }
    };

    fetchQuotes();

    retryTimeout = setTimeout(() => {
      if (!cancelled) fetchQuotes();
    }, 2500);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchQuotes();
    }, 30_000);

    return () => {
      cancelled = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when ticker set changes
  }, [openPositionSymbolsKey]);

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
            onClick={() => setResetModalOpen(true)}
          >
            <i className="bi bi-arrow-counterclockwise" /> Reset Portfolio
          </button>

          <ResetPortfolioModal
            open={resetModalOpen}
            onClose={() => setResetModalOpen(false)}
            onConfirm={(startingAmount) => {
              const fresh = { cash: startingAmount, positions: {}, history: [], startingCash: startingAmount };
              userExplicitChartPickRef.current = false;
              setPortfolio(fresh);
              showToast(
                `Portfolio reset to $${startingAmount.toLocaleString('en-US')}.`,
              );
            }}
            portfolio={{ ...portfolio, history: mergedActivity }}
            enrichedPositions={enrichedPositions}
          />
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
            {totalPnlPct.toFixed(2)}% vs{' '}
            {effectiveStart >= 1000
              ? `$${(effectiveStart / 1000).toFixed(0)}K`
              : `$${effectiveStart.toLocaleString('en-US')}`}
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
              {!selectedSymbol && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '300px',
                    color: 'var(--text-secondary, #9ca3af)',
                    textAlign: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <i className="bi bi-graph-up" style={{ fontSize: '2.5rem', opacity: 0.25, color: '#10b981' }} />
                  <p style={{ fontSize: '0.875rem', margin: 0, maxWidth: 300 }}>
                    Type a company or ticker in the search bar to view a chart
                  </p>
                </div>
              )}
              {selectedSymbol && (
                <StockPriceChart symbol={selectedSymbol} livePrice={currentPrice || null} />
              )}
            </div>
          </div>

          <div className="mock-card">
            <div className="mock-card-header">
              <h3>
                <i className="bi bi-briefcase" /> Open Positions
              </h3>
              {priceFetchError && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.08)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    marginLeft: '8px',
                  }}
                  title="Live prices failed to load. Showing cost basis as fallback."
                >
                  ⚠ {priceFetchError}
                </span>
              )}
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
                      <th>Opened</th>
                      <th>Qty</th>
                      <th>Avg Cost</th>
                      <th>Current</th>
                      <th>P&amp;L</th>
                      <th>Current Value</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {positionsList.map((pos) => {
                      const sym = String(pos.symbol || '').trim().toUpperCase();
                      const livePx = resolveLivePrice(livePrices[sym]);
                      const curPrice = livePx ?? pos.currentPrice ?? pos.avgCost;
                      const pnl = (curPrice - pos.avgCost) * pos.qty;
                      const pnlPct = (curPrice / pos.avgCost - 1) * 100;

                      return (
                        <Fragment key={pos.symbol}>
                          <tr>
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
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {formatOpenedDate(resolveOpenedAt(pos, portfolio.history))}
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
                            <td
                              style={{
                                color: 'var(--foreground, #f0f6fc)',
                                fontVariantNumeric: 'tabular-nums',
                                fontWeight: 600,
                              }}
                            >
                              {fmtUSD(pos.qty * curPrice)}
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
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {mergedActivity.length > 0 && (
            <div className="mock-card">
              <div className="mock-card-header">
                <h3>
                  <i className="bi bi-clock-history" /> Recent Activity
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {mergedActivity.length} trade{mergedActivity.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="mock-card-body" style={{ padding: '0 1.25rem 1rem' }}>
                <div className="mock-activity-list">
                  {mergedActivity.slice(0, 12).map((h) => (
                    <div className="mock-activity-item" key={h.id || `${h.ts}-${h.symbol}`}>
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
              <div className="mock-search-wrap" ref={searchRef}>
                <input
                  type="text"
                  className="mock-search-input"
                  placeholder="Search company or ticker"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      e.preventDefault();
                      submitSearchAsTicker();
                    }
                  }}
                  autoComplete="off"
                  style={{ fontSize: '16px' }}
                />
                {(searchResults.length > 0 ||
                  (searchQuery.trim().length >= 2 && searchLoading)) && (
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
                        key={r.symbol}
                        className="mock-search-result-item"
                        onMouseDown={() =>
                          selectAsset(r.symbol, r.name, r.type)
                        }
                        role="presentation"
                      >
                        <div>
                          <div className="mock-result-symbol">{r.symbol}</div>
                          <div className="mock-result-name">{r.name}</div>
                        </div>
                        <span className="mock-result-type">{normalizeAssetType(r.type)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mock-asset-selected">
              <div className="mock-asset-left">
                <span className="mock-asset-ticker">{selectedSymbol || '—'}</span>
                <span className="mock-asset-name">{selectedName || 'Search to select an asset'}</span>
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
                !selectedSymbol ||
                !currentPrice ||
                !dollarAmount ||
                dollarAmount <= 0 ||
                (side === 'buy' && dollarAmount > portfolio.cash)
              }
            >
              {side === 'buy' ? `Buy ${selectedSymbol || '…'}` : `Sell ${selectedSymbol || '…'}`}
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

export default function MockTradingPage() {
  return (
    <Suspense
      fallback={
        <div className="mock-page dashboard-page-inset" style={{ padding: '2rem', color: '#94a3b8' }}>
          Loading…
        </div>
      }
    >
      <MockTradingPageInner />
    </Suspense>
  );
}
