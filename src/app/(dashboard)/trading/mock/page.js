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
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useOrg } from '@/contexts/OrgContext';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import { useCompanySearchFinnhub } from '@/hooks/useFinnhub';
import { useChecklist } from '@/hooks/useChecklist';
import { useMockTheses } from '@/hooks/useMockTheses';
import { Button, IconButton, Modal, Tabs, Textarea, VisuallyHidden } from '@/components/ds';

import {
  ActivityCard,
  ClosePositionModal,
  MarketMoversCard,
  PerformanceCard,
  PositionsCard,
} from '@/components/trading/mock/MockSections';
import { OrderTicket } from '@/components/trading/mock/OrderTicket';
import { PreTradeCards } from '@/components/trading/mock/PreTradeCards';
import { ReviewOrderModal } from '@/components/trading/mock/ReviewOrderModal';
import { DeleteThesisModal, ThesisModal, ThesisPanel } from '@/components/trading/mock/ThesisPanel';
import {
  filterPositions,
  fmtQty,
  fmtShortDayET,
  journalRows,
  parseAmount,
  portfolioRows,
  sortPositions,
  ticketState,
} from '@/lib/trading/mock-ticket';
import {
  THESIS_LIMITS,
  capStatus,
  fitClauses,
  portfolioAlignment,
  thesisFit,
  whatIf,
} from '@/lib/trading/mock-thesis';
import { buildMockJournalCsv } from '@/lib/trading/mock-portfolio-csv';
import { riskSnapshot } from '@/lib/trading/mock-risk';
import { useCouncilSandbox } from '@/components/trading/mock/council/useCouncilSandbox';

/* The reset modal only renders after a click: its own lazy chunk. The charts
   load lazily inside PerformanceCard. */
const ResetPortfolioModal = dynamic(() => import('@/components/trading/ResetPortfolioModal'), {
  ssr: false,
  loading: () => null,
});
/* Council sandbox (Nov 2026): council members only, once membership is
   known. Its own lazy chunk, so the retail page never loads the council
   model. Nothing in it places, changes or blocks a paper order. */
const councilChunk = () => import('@/components/trading/mock/council/CouncilSandbox');
const CouncilHeader = dynamic(() => councilChunk().then((m) => m.CouncilHeader), {
  ssr: false,
  loading: () => null,
});
const CouncilCards = dynamic(() => councilChunk().then((m) => m.CouncilCards), {
  ssr: false,
  loading: () => null,
});
const CouncilOrderCheck = dynamic(() => councilChunk().then((m) => m.CouncilOrderCheck), {
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
  /* Council sandbox: council members only, once membership is known. */
  const { isOrgUser, isLoading: orgLoading, orgData } = useOrg();
  const councilReady = Boolean(isOrgUser && !orgLoading);
  const [compareRange, setCompareRange] = useState('3M');
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
    isLoading: portfolioLoading,
  } = useMockPortfolio();
  const [dbTrades, setDbTrades] = useState([]);
  const [dbTradesLoaded, setDbTradesLoaded] = useState(false);
  /* Chart subject (Portfolio | Selected asset) and the close confirmation. */
  const [closeRow, setCloseRow] = useState(null);
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

  /* Risk snapshot: the last 3 months of daily value plus the S&P 500, read
     again after each trade. The statistics come from mock-risk.js. */
  const [riskSeries, setRiskSeries] = useState(null);
  useEffect(() => {
    if (!user?.id) {
      setRiskSeries({ points: [], benchmark: [] });
      return undefined;
    }
    let cancelled = false;
    fetch('/api/portfolio/mock-value-series?range=3M&benchmark=1', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => {
        if (!cancelled)
          setRiskSeries({
            points: Array.isArray(d.points) ? d.points : [],
            benchmark: Array.isArray(d.benchmark) ? d.benchmark : [],
          });
      })
      .catch(() => {
        if (!cancelled) setRiskSeries({ points: [], benchmark: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, dbTrades.length]);

  // Use hook portfolio; fall back to fresh if not loaded yet
  const portfolio = portfolioFromHook ?? freshPortfolio();

  /* Same symbol search as US Equities page (Finnhub via /api/finnhub/search) */
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
  /* Time of the last batch quote fetch that priced every position. */

  const [posSort, setPosSort] = useState({ key: null, dir: 'desc' });
  const [posFilter, setPosFilter] = useState('all');

  /* Thesis layer (Nov 14 2026): the user's theses, the Build / edit and
     delete modals, the review step and the journal's note editing. */
  const theses = useMockTheses({ enabled: Boolean(user?.id) });
  const [thesisModal, setThesisModal] = useState({ open: false, thesis: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePending, setDeletePending] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [journalTab, setJournalTab] = useState('all');
  const [noteRow, setNoteRow] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [notePending, setNotePending] = useState(false);
  const [exporting, setExporting] = useState(false);
  /* Sector by ticker (from the stock stats response), fetched once each. */
  const [sectors, setSectors] = useState({});
  /* Market cap text by ticker, from the same response (council check only). */
  const [marketCaps, setMarketCaps] = useState({});
  const sectorsAsked = useRef(new Set());

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

  /** Enter a ticker directly (same behavior as US Equities search bar) */
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

  const executeTrade = async (note = '') => {
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
      ...(note && note.trim() ? { thesis_note: note } : {}),
    });
    setReviewOpen(false);
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

  /* The journal reads the stored trade log; before it loads (or for a guest)
     it falls back to the portfolio's own history in the same shape. */
  const journal = useMemo(() => {
    const log =
      dbTrades.length > 0
        ? dbTrades
        : (portfolio.history || []).map((h, i) => ({
            id: h.id || `h-${i}-${h.ts}`,
            ticker: h.symbol,
            trade_type: h.side,
            quantity: h.qty,
            price: h.price,
            total_amount: h.total,
            created_at: h.ts,
          }));
    return journalRows(log);
  }, [dbTrades, portfolio.history]);

  /* The reset modal's activity list keeps its original shape. */
  const mergedActivity = useMemo(
    () =>
      journal.map((r) => ({
        id: r.id,
        side: r.side,
        symbol: r.symbol,
        qty: r.qty,
        price: r.price,
        total: r.total,
        ts: r.ts,
      })),
    [journal],
  );

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

  const effectiveStart = portfolio?.startingCash ?? STARTING_CASH;

  /* One row model for the table, the KPIs, the pre-trade cards and the close
     modal: portfolioRows adds the day move and the weight, and returns the
     summary the rows add up to. */
  const { rows: positionRows, summary } = useMemo(() => {
    const changes = {};
    const positions = Object.values(portfolio.positions || {}).map((pos) => {
      const sym = String(pos.symbol || '')
        .trim()
        .toUpperCase();
      const live = livePrices[sym];
      const livePx = resolveLivePrice(live);
      const ch = Number(live?.change);
      if (livePx != null && live?.change != null && Number.isFinite(ch)) changes[sym] = ch;
      return {
        symbol: sym,
        name: pos.name || sym,
        type: pos.type,
        qty: Number(pos.qty),
        avgCost: Number(pos.avgCost),
        currentPrice: livePx ?? pos.currentPrice ?? pos.avgCost,
        openedAt: resolveOpenedAt(pos, portfolio.history),
      };
    });
    return portfolioRows({
      positions,
      cash: portfolio.cash,
      startingCash: effectiveStart,
      changes,
    });
  }, [portfolio.positions, portfolio.history, portfolio.cash, livePrices, effectiveStart]);

  const risk = useMemo(
    () =>
      riskSeries
        ? riskSnapshot({
            points: riskSeries.points,
            benchmark: riskSeries.benchmark,
            positions: positionRows,
            totalValue: summary.totalValue,
          })
        : null,
    [riskSeries, positionRows, summary.totalValue],
  );

  /* Council sandbox data (fetches nothing unless councilReady). The value
     series is read again after each trade, like the risk series. */
  const council = useCouncilSandbox(councilReady, {
    range: compareRange,
    tradesKey: dbTrades.length,
  });
  const councilReal = useMemo(
    () => ({
      positions: positionRows,
      cash: portfolio.cash,
      startingCash: effectiveStart,
      loading: portfolioLoading && !portfolioFromHook,
    }),
    [positionRows, portfolio.cash, effectiveStart, portfolioLoading, portfolioFromHook],
  );

  const sortedPositions = useMemo(
    () => filterPositions(sortPositions(positionRows, posSort.key, posSort.dir), posFilter),
    [positionRows, posSort, posFilter],
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

  // The chart defaults to MockPortfolioChart (portfolio-value time series).
  // selectedSymbol stays null until the user explicitly searches or clicks a position.

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

  /* The ticket's order projected onto the portfolio (What-if, the ticket's
     projected weight). null until there is a symbol, a price and an amount. */
  const projection = whatIf({
    side,
    amount: parseAmount(amount),
    symbol: selectedSymbol,
    price: currentPrice,
    cash: portfolio.cash,
    positions: positionRows,
    totalValue: summary.totalValue,
  });

  /* Sectors for the ticket's ticker and every holding (the sector check and
     portfolio alignment). One request per ticker per visit. */
  const sectorSymbolsKey = [selectedSymbol, ...positionRows.map((r) => r.symbol)]
    .filter(Boolean)
    .join(',');
  const hasActiveThesis = Boolean(theses.active);
  /* The council layer reads the same sectors (and market caps) for its IPS
     check; for everyone else this runs only with an active thesis, as before. */
  const wantSectors = hasActiveThesis || councilReady;
  useEffect(() => {
    if (!wantSectors) return;
    /* No cancellation: each ticker is asked once, and its answer is kept even
       if the effect runs again before it lands. */
    const wanted = [...new Set(sectorSymbolsKey.split(',').filter(Boolean))].filter(
      (sym) => !sectorsAsked.current.has(sym),
    );
    for (const sym of wanted) {
      sectorsAsked.current.add(sym);
      fetch(`/api/fmp/stock-stats?symbol=${encodeURIComponent(sym)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          setSectors((m) => ({ ...m, [sym]: d?.sector || null }));
          setMarketCaps((m) => ({ ...m, [sym]: d?.mcap || null }));
        })
        .catch(() => {
          sectorsAsked.current.delete(sym);
        });
    }
  }, [sectorSymbolsKey, wantSectors]);

  /* One fit result feeds the ticket's check line, the alignment card, the
     risk card's cap notice, the panel's Current trade fit and the review. */
  const thesis = theses.active;
  const fit = thesisFit({
    thesis,
    projection,
    sector: selectedSymbol ? (sectors[selectedSymbol] ?? null) : null,
    isFund: selectedType === 'ETF',
    beta: risk?.beta ?? null,
  });
  const clauses = fitClauses({ thesis, fit, projection });
  const alignment = thesis
    ? portfolioAlignment({ thesis, positions: positionRows, sectors })
    : null;
  const cap = thesis ? Number(thesis.max_single_name_pct) : null;
  const capAlert =
    fit?.checks.concentration === 'over' && projection
      ? { symbol: projection.symbol, cap: cap.toFixed(1) }
      : null;

  /* The order being typed, for the council's IPS check (descriptive only). */
  const councilAmount = parseAmount(amount);
  const councilOrder = useMemo(
    () =>
      selectedSymbol && councilAmount > 0
        ? { side, symbol: selectedSymbol, amount: councilAmount }
        : null,
    [side, selectedSymbol, councilAmount],
  );
  const councilCheck = (variant) =>
    councilReady ? (
      <CouncilOrderCheck
        council={council}
        real={councilReal}
        marketSectors={sectors}
        order={councilOrder}
        marketCapText={selectedSymbol ? (marketCaps[selectedSymbol] ?? null) : null}
        variant={variant}
      />
    ) : null;
  /* Load into ticket (council pitches): fills the ticket, never submits. */
  const loadIntoTicket = (sym, nm) => {
    selectAsset(sym, nm, 'Stock');
    searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const runThesis = async (fn, done) => {
    const r = await fn();
    if (!r.ok) showToast(r.error || 'That did not work.', 'error');
    else if (done) showToast(done);
    return r;
  };

  const journalShown = useMemo(() => {
    if (journalTab === 'notes') return journal.filter((r) => r.note);
    return journal;
  }, [journal, journalTab]);

  const openNote = (row) => {
    setNoteRow(row);
    setNoteText(row.note || '');
  };
  const saveNote = async () => {
    if (!noteRow || notePending) return;
    setNotePending(true);
    try {
      const res = await fetch(`/api/mock-trades/${encodeURIComponent(noteRow.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ thesis_note: noteText }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Could not save the note.');
      setDbTrades((list) =>
        list.map((t) =>
          t.id === noteRow.id ? { ...t, thesis_note: j.trade?.thesis_note ?? null } : t,
        ),
      );
      setNoteRow(null);
      showToast(j.trade?.thesis_note ? 'Note saved.' : 'Note cleared.');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setNotePending(false);
    }
  };

  /* Export CSV: the whole trade log with each trade's thesis and note. */
  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const r = await fetch('/api/mock-trades?limit=5000', {
        credentials: 'include',
        cache: 'no-store',
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || 'Could not export your trades.');
      const blob = new Blob([buildMockJournalCsv(d.trades || [])], {
        type: 'text/csv;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ezana-mock-journal-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      showToast(e.message || 'Could not export your trades.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const noteColumns =
    journalTab === 'trades'
      ? []
      : [
          {
            key: 'note',
            label: 'Thesis note',
            render: (h) =>
              h.note ? (
                <span className="mock-note-text">{h.note}</span>
              ) : (
                <span className="mock-muted">None</span>
              ),
          },
          {
            key: 'edit',
            label: <span className="mock-sr">Edit</span>,
            align: 'right',
            render: (h) =>
              dbTrades.some((t) => t.id === h.id) ? (
                <IconButton
                  icon="bi-pencil"
                  size="sm"
                  label={`Edit thesis note for ${h.symbol}, ${fmtShortDayET(h.ts)}`}
                  onClick={() => openNote(h)}
                />
              ) : null,
          },
        ];
  return (
    <div className="mock-page dashboard-page-inset ez-canvas">
      {/* Nov 23, 2026: no head row, so the cards start right under the nav.
          Reset portfolio lives in the Open positions header. */}
      <VisuallyHidden as="h1">Mock Trading</VisuallyHidden>

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

      {councilReady ? (
        <CouncilHeader
          council={council}
          real={councilReal}
          marketSectors={sectors}
          councilName={orgData?.org?.name || null}
        />
      ) : null}

      {/* Nov 23, 2026 layout. Left: the performance card (with the
          investment thesis strip above the figures), then open positions,
          activity and council cards. Right: Place order at the top, aligned
          with the performance card, then the What-if, Risk snapshot and
          Thesis alignment cards, then market movers. */}
      <div className="mock-layout">
        <div className="mock-left-col">
          <PerformanceCard
            startingCash={effectiveStart}
            top={
              <ThesisPanel
                strip
                theses={theses}
                alignment={alignment}
                fit={fit}
                onBuild={() => setThesisModal({ open: true, thesis: null })}
                onEdit={(t) => setThesisModal({ open: true, thesis: t })}
                onDelete={(t) => setDeleteTarget(t)}
                onActivate={(id) => runThesis(() => theses.activate(id))}
              />
            }
          />
          <PositionsCard
            rows={sortedPositions}
            total={positionRows.length}
            allRows={positionRows}
            loading={portfolioLoading && positionRows.length === 0}
            sort={posSort}
            onSort={togglePosSort}
            filter={posFilter}
            onFilter={setPosFilter}
            selected={selectedSymbol}
            cap={cap}
            capTone={thesis ? (r) => capStatus(r.weight, cap) : null}
            onSelect={(r) => selectAsset(r.symbol, r.name, r.type)}
            onClose={(r) => setCloseRow(r)}
            pending={tradePending}
            priceNote={priceFetchError}
            headerExtra={
              <button
                className="mock-btn mock-btn--sm"
                type="button"
                onClick={() => setResetModalOpen(true)}
              >
                <i className="bi bi-arrow-counterclockwise" aria-hidden="true" /> Reset portfolio
              </button>
            }
          />
          <ActivityCard
            rows={journalShown}
            loading={Boolean(user?.id) && !dbTradesLoaded && journal.length === 0}
            columns={noteColumns}
            empty={journalTab === 'notes' ? 'No thesis notes yet.' : 'No trades yet.'}
            extra={
              journal.length > 0 ? (
                <>
                  <Tabs
                    className="mock-journal-tabs"
                    tabs={[
                      { id: 'all', label: 'All activity' },
                      { id: 'trades', label: 'Trades' },
                      { id: 'notes', label: 'Thesis notes' },
                    ]}
                    value={journalTab}
                    onChange={setJournalTab}
                  />
                  {user?.id ? (
                    <button
                      type="button"
                      className="mock-btn mock-btn--sm"
                      onClick={exportCsv}
                      disabled={exporting}
                      aria-busy={exporting || undefined}
                    >
                      <i className="bi bi-download" aria-hidden="true" />{' '}
                      {exporting ? 'Preparing CSV…' : 'Export CSV'}
                    </button>
                  ) : null}
                </>
              ) : null
            }
          />
          {councilReady ? (
            <CouncilCards
              council={council}
              real={councilReal}
              marketSectors={sectors}
              range={compareRange}
              onRange={setCompareRange}
              onLoadTicker={loadIntoTicket}
            />
          ) : null}
        </div>

        <aside className="mock-right-col" aria-label="Place order and pre-trade checks">
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
              onReview={() => setReviewOpen(true)}
              projection={projection}
              clauses={clauses}
              extra={councilCheck('ticket')}
            />
          </div>
          <PreTradeCards
            projection={projection}
            risk={risk}
            capAlert={capAlert}
            thesis={thesis}
            fit={fit}
            clauses={clauses}
            onBuild={() => setThesisModal({ open: true, thesis: null })}
          />
          <MarketMoversCard onSelect={(sym, nm) => selectAsset(sym, nm, 'Stock')} />
        </aside>
      </div>

      <ReviewOrderModal
        open={reviewOpen}
        order={
          projection
            ? {
                side,
                symbol: projection.symbol,
                amount: projection.amount,
                shares: projection.shares,
                cashAfter: projection.cash.after,
                weightAfter: projection.weight.after,
              }
            : null
        }
        clauses={clauses}
        thesisName={thesis?.name || null}
        pending={tradePending}
        onCancel={() => setReviewOpen(false)}
        onPlace={(note) => executeTrade(note)}
        extra={councilCheck('review')}
      />

      <ThesisModal
        open={thesisModal.open}
        thesis={thesisModal.thesis}
        onClose={() => setThesisModal({ open: false, thesis: null })}
        onSave={(values) =>
          thesisModal.thesis
            ? runThesis(() => theses.update(thesisModal.thesis.id, values), 'Thesis saved.')
            : runThesis(() => theses.create(values), 'Thesis created.')
        }
      />
      <DeleteThesisModal
        thesis={deleteTarget}
        pending={deletePending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeletePending(true);
          const r = await runThesis(() => theses.remove(deleteTarget.id), 'Thesis deleted.');
          setDeletePending(false);
          if (r.ok) setDeleteTarget(null);
        }}
      />
      <Modal
        open={Boolean(noteRow)}
        onClose={() => setNoteRow(null)}
        title={noteRow ? `Thesis note for ${noteRow.symbol}, ${fmtShortDayET(noteRow.ts)}` : ''}
        size="460px"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNoteRow(null)} disabled={notePending}>
              Cancel
            </Button>
            <Button onClick={saveNote} loading={notePending}>
              Save note
            </Button>
          </>
        }
      >
        <Textarea
          id="mock-note-edit"
          label="Note"
          rows={4}
          value={noteText}
          maxLength={THESIS_LIMITS.note}
          onChange={(e) => setNoteText(e.target.value)}
          hint={`${noteText.length} of ${THESIS_LIMITS.note} characters. Leave it empty to clear the note.`}
        />
      </Modal>

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
