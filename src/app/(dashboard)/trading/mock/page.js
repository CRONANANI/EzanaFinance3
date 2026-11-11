'use client';

import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  useMemo,
  Suspense,
} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import { useCompanySearchFinnhub } from '@/hooks/useFinnhub';
import { useChecklist } from '@/hooks/useChecklist';

import {
  ActivityCard,
  ClosePositionModal,
  MarketMoversCard,
  MockKpiRow,
  PerformanceCard,
  PositionsCard,
} from '@/components/trading/mock/MockSections';
import { OrderTicket } from '@/components/trading/mock/OrderTicket';
import {
  fmtQty,
  parseAmount,
  positionRow,
  relativeTime,
  sortPositions,
  summarizePortfolio,
  ticketState,
} from '@/lib/trading/mock-ticket';

/* The reset modal only renders after a click: its own lazy chunk. The charts
   load lazily inside PerformanceCard. */
const ResetPortfolioModal = dynamic(() => import('@/components/trading/ResetPortfolioModal'), {
  ssr: false,
  loading: () => null,
});
import '../../home-dashboard/home-dashboard.css';
import './mock-trading.css';
import '@/styles/home-canvas.css';
import { markChecklistView } from '@/lib/onboarding/markView';

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

const MOCK_QUOTE_CHUNK = 45;

/* ──────────────────────────────────────────
   MAIN PAGE
────────────────────────────────────────── */
function MockTradingPageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { completeTask } = useChecklist();
  /* Getting Started checklist: opening the paper portfolio reviews its P&L. */
  useEffect(() => {
    markChecklistView('mock.review_pnl');
  }, []);
  /* Portfolio state: backed by the mock portfolio API via useMockPortfolio */
  const {
    portfolio: portfolioFromHook,
    setPortfolio,
    placeTrade,
    resetPortfolio,
    syncing,
    isLoading: portfolioLoading,
  } = useMockPortfolio();
  const [dbTrades, setDbTrades] = useState([]);
  const [dbTradesLoaded, setDbTradesLoaded] = useState(false);
  /* Chart subject (Portfolio | Selected asset) and the close confirmation. */
  const [chartSubject, setChartSubject] = useState('portfolio');
  const [closeRow, setCloseRow] = useState(null);
  /* Autosave status: the time of the last finished save in this visit. */
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [, setClock] = useState(0);
  const wasSyncing = useRef(false);
  useEffect(() => {
    if (wasSyncing.current && !syncing) setLastSavedAt(Date.now());
    wasSyncing.current = syncing;
  }, [syncing]);
  useEffect(() => {
    if (!lastSavedAt) return undefined;
    const t = setInterval(() => setClock((c) => c + 1), 15_000);
    return () => clearInterval(t);
  }, [lastSavedAt]);
  /* Double-submit guard: one trade request in flight at a time. */
  const [tradePending, setTradePending] = useState(false);
  const tradePendingRef = useRef(false);

  const refreshDbTrades = useCallback(async () => {
    if (!user?.id) return;
    try {
      const listRes = await fetch('/api/mock-trades');
      const data = listRes.ok ? await listRes.json() : { trades: [] };
      setDbTrades(data.trades || []);
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  /* QA RET-10: the server quotes the price, executes against the stored cash
     and returns the new portfolio; the page renders that, not local maths. */
  const submitTrade = useCallback(
    async (order) => {
      if (tradePendingRef.current) return null;
      tradePendingRef.current = true;
      setTradePending(true);
      try {
        const r = await placeTrade(order);
        if (r.ok) void refreshDbTrades();
        return r;
      } finally {
        tradePendingRef.current = false;
        setTradePending(false);
      }
    },
    [placeTrade, refreshDbTrades],
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
      })
      .finally(() => {
        if (!cancelled) setDbTradesLoaded(true);
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
  /** When true, user picked a ticker via search/table/URL; keeps flows that respect explicit picks consistent. */
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
  /* Latest table prices, readable from fetchQuote without re-creating it. */
  const livePricesRef = useRef({});
  livePricesRef.current = livePrices;
  const [priceFetchError, setPriceFetchError] = useState(null);

  const [posSort, setPosSort] = useState({ key: null, dir: 'desc' });

  const fetchQuote = useCallback(async (sym) => {
    if (!sym) return;
    /* The positions table already has a live price for held tickers: show it
       immediately so Place Order never says "No price data" for a holding,
       then refresh from the quote API below. */
    const seeded = livePricesRef.current?.[String(sym).toUpperCase()];
    if (seeded?.price != null && Number(seeded.price) > 0) {
      setQuoteData({
        symbol: String(sym).toUpperCase(),
        price: Number(seeded.price),
        change: Number(seeded.change ?? 0),
        changesPercentage: Number(seeded.changesPercentage ?? seeded.changePercentage ?? 0),
      });
    }
    setQuoteLoading(true);
    try {
      const r = await fetch(`/api/fmp/quote?symbol=${encodeURIComponent(sym)}`, {
        cache: 'no-store',
      });
      const d = await r.json();
      if (d?.price != null && !d.error) setQuoteData(d);
      else if (!seeded?.price) setQuoteData(null);
    } catch {
      if (!seeded?.price) setQuoteData(null);
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
      { skipSync: true },
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
          if (typeof livePx === 'number' && livePx > 0 && livePx !== pos.currentPrice) {
            nextPositions[sym] = { ...pos, currentPrice: livePx };
            anyChanged = true;
          } else {
            nextPositions[sym] = pos;
          }
        }

        if (!anyChanged) return prev;

        return { ...prev, positions: nextPositions };
      },
      { skipSync: true },
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
    [clearSuggestions, setSearchQuery],
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

  const executeTrade = async () => {
    const dollarAmount = parseAmount(amount);
    const check = ticketState({
      side,
      amount: dollarAmount,
      cash: portfolio.cash,
      price: quoteData?.price ?? null,
      symbol: selectedSymbol,
      position: portfolio.positions[selectedSymbol] || null,
    });
    if (!check.canSubmit) {
      showToast(check.reason || 'Check the order.', 'error');
      return;
    }
    const r = await submitTrade({
      ticker: selectedSymbol,
      side,
      amount: dollarAmount,
      name: selectedName,
      asset_type: selectedType,
    });
    if (!r) return;
    if (!r.ok) {
      showToast(r.error || 'Trade failed.', 'error');
      return;
    }
    const verb = side === 'buy' ? 'Bought' : 'Sold';
    const qty = Number(r.trade?.quantity);
    const px = Number(r.trade?.price);
    showToast(
      Number.isFinite(qty) && Number.isFinite(px)
        ? `${verb} ${fmtQty(qty)} ${selectedSymbol} at ${fmtUSD(px)}`
        : `${verb} ${fmtUSD(r.trade?.total ?? dollarAmount)} of ${selectedSymbol}`,
    );
    completeTask('action_2');
    setAmount('');
  };

  /* Close = full market sell of the position, after the confirmation modal. */
  const confirmClose = async () => {
    const row = closeRow;
    if (!row) return;
    const r = await submitTrade({ ticker: row.symbol, side: 'sell', close: true });
    setCloseRow(null);
    if (!r) return;
    if (!r.ok) {
      showToast(r.error || 'Could not close position.', 'error');
      return;
    }
    showToast(`Closed ${row.symbol} for ${fmtUSD(r.trade?.total)}`);
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
      const sym = String(pos.symbol || '')
        .trim()
        .toUpperCase();
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

  /* One row model for the table, the KPIs and the close modal. */
  const positionRows = useMemo(
    () =>
      positionsList.map((pos) => {
        const sym = String(pos.symbol || '')
          .trim()
          .toUpperCase();
        const livePx = resolveLivePrice(livePrices[sym]);
        return positionRow({
          symbol: sym,
          name: pos.name || sym,
          type: pos.type,
          qty: Number(pos.qty),
          avgCost: Number(pos.avgCost),
          currentPrice: livePx ?? pos.currentPrice ?? pos.avgCost,
          openedAt: resolveOpenedAt(pos, portfolio.history),
        });
      }),
    [positionsList, livePrices, portfolio.history],
  );
  const sortedPositions = useMemo(
    () => sortPositions(positionRows, posSort.key, posSort.dir),
    [positionRows, posSort],
  );

  const togglePosSort = useCallback((key) => {
    setPosSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  const openPositionSymbolsKey = useMemo(() => {
    const set = new Set();
    for (const p of Object.values(portfolio.positions || {})) {
      const s = String(p.symbol || '')
        .trim()
        .toUpperCase();
      if (s) set.add(s);
    }
    return [...set].sort().join(',');
  }, [portfolio.positions]);

  // REMOVED: auto-default-to-largest-position effect.
  // The chart now defaults to MockPortfolioChart (portfolio-value time series).
  // selectedSymbol stays null until the user explicitly searches or clicks a position.
  // Clicking a position sets userExplicitChartPickRef=true via selectAsset(...).
  const effectiveStart = portfolio?.startingCash ?? STARTING_CASH;
  const summary = summarizePortfolio({
    cash: portfolio.cash,
    startingCash: effectiveStart,
    positions: positionRows,
  });

  useEffect(() => {
    const symbols = [
      ...new Set(
        Object.values(portfolio.positions || {})
          .map((p) =>
            String(p.symbol || '')
              .trim()
              .toUpperCase(),
          )
          .filter(Boolean),
      ),
    ].sort();

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
            setPriceFetchError(`HTTP ${res.status}, response not JSON`);
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
          if (stillMissing.length > 0 && !retryTimeout && !cancelled) {
            retryTimeout = setTimeout(() => {
              if (!cancelled) fetchQuotes();
            }, 5000);
          }
        } else {
          setPriceFetchError(null);
        }
      } catch (err) {
        if (!cancelled) setPriceFetchError(err?.message || 'fetch threw');
      }
    };

    fetchQuotes();

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
  const savedLabel = syncing
    ? 'Saving…'
    : lastSavedAt
      ? `Auto-saved ${relativeTime(lastSavedAt)}`
      : null;

  return (
    <div className="mock-page dashboard-page-inset ez-canvas">
      <header className="mock-head">
        <div className="mock-head__left">
          <Link href="/trading" className="mock-back">
            <i className="bi bi-arrow-left" aria-hidden="true" /> Trading
          </Link>
          <span className="mock-head__slash" aria-hidden="true">
            /
          </span>
          <h1 className="mock-title">Mock Trading</h1>
          <span className="mock-paper">
            <i className="bi bi-layers" aria-hidden="true" /> Paper account
          </span>
        </div>
        <div className="mock-head__right">
          {savedLabel ? (
            <span className="mock-saved" role="status">
              <span className={`mock-dot${syncing ? ' is-busy' : ' is-up'}`} aria-hidden="true" />
              {savedLabel}
            </span>
          ) : null}
          <button className="mock-btn" type="button" onClick={() => setResetModalOpen(true)}>
            <i className="bi bi-arrow-counterclockwise" aria-hidden="true" /> Reset portfolio
          </button>
        </div>
      </header>

      <ResetPortfolioModal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        onConfirm={async (startingAmount) => {
          const r = await resetPortfolio(startingAmount);
          if (!r.ok) {
            showToast(r.error || 'Reset failed.', 'error');
            return;
          }
          userExplicitChartPickRef.current = false;
          void refreshDbTrades();
          showToast(`Portfolio reset to $${startingAmount.toLocaleString('en-US')}.`);
        }}
        portfolio={{ ...portfolio, history: mergedActivity }}
        enrichedPositions={enrichedPositions}
      />

      <MockKpiRow summary={summary} />

      <div className="mock-layout">
        <div className="mock-left-col">
          <PerformanceCard
            subject={chartSubject}
            onSubject={setChartSubject}
            startingCash={effectiveStart}
            symbol={selectedSymbol}
            name={selectedName}
            livePrice={currentPrice}
          />
          <PositionsCard
            rows={sortedPositions}
            loading={portfolioLoading && positionRows.length === 0}
            sort={posSort}
            onSort={togglePosSort}
            onSelect={(r) => selectAsset(r.symbol, r.name, r.type)}
            onClose={(r) => setCloseRow(r)}
            pending={tradePending}
            priceNote={priceFetchError}
          />
          <ActivityCard
            items={mergedActivity}
            loading={Boolean(user?.id) && !dbTradesLoaded && mergedActivity.length === 0}
          />
        </div>

        <aside className="mock-right-col" aria-label="Trade">
          <div ref={searchRef} className="mock-ticket-wrap">
            <OrderTicket
              search={{
                query: searchQuery,
                setQuery: setSearchQuery,
                results: searchResults,
                loading: searchLoading,
                onPick: (r) => selectAsset(r.symbol, r.name, r.type),
                onSubmitTicker: submitSearchAsTicker,
              }}
              symbol={selectedSymbol}
              name={selectedName}
              quote={{
                price: currentPrice || null,
                change: Number(quoteData?.change ?? 0),
                changePct: Number(quoteData?.changesPercentage ?? quoteData?.changePercentage ?? 0),
                loading: quoteLoading,
              }}
              side={side}
              onSide={setSide}
              amount={amount}
              onAmount={setAmount}
              cash={portfolio.cash}
              position={selectedSymbol ? portfolio.positions[selectedSymbol] || null : null}
              pending={tradePending}
              onSubmit={executeTrade}
            />
          </div>
          <MarketMoversCard onSelect={(sym, nm) => selectAsset(sym, nm, 'Stock')} />
        </aside>
      </div>

      <ClosePositionModal
        row={closeRow}
        pending={tradePending}
        onCancel={() => setCloseRow(null)}
        onConfirm={confirmClose}
      />

      {toast && (
        <div className={`mock-toast is-${toast.type}`} role="status" aria-live="polite">
          <i
            className={`bi ${toast.type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}
            aria-hidden="true"
          />
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export default function MockTradingPage() {
  return (
    <Suspense
      fallback={<div className="mock-page dashboard-page-inset mock-loading">Loading…</div>}
    >
      <MockTradingPageInner />
    </Suspense>
  );
}
