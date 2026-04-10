'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

const STARTING_CASH = 100_000;
const POST_DEBOUNCE_MS = 800;
const LS_KEY = 'ezana_mock_portfolio_v1';

const TICKER_SECTOR = {
  AAPL: 'Technology', MSFT: 'Technology', NVDA: 'Technology', GOOGL: 'Technology',
  META: 'Technology', AMZN: 'Technology', TSLA: 'Technology', AMD: 'Technology',
  AVGO: 'Technology', QCOM: 'Technology', INTC: 'Technology', CRM: 'Technology',
  ADBE: 'Technology', ORCL: 'Technology', HPQ: 'Technology', IBM: 'Technology',
  JNJ: 'Healthcare', PFE: 'Healthcare', UNH: 'Healthcare', ABBV: 'Healthcare',
  MRK: 'Healthcare', LLY: 'Healthcare', TMO: 'Healthcare',
  JPM: 'Finance', BAC: 'Finance', GS: 'Finance', MS: 'Finance',
  V: 'Finance', MA: 'Finance', AXP: 'Finance',
  LMT: 'Defense', RTX: 'Defense', NOC: 'Defense', BA: 'Defense',
  XOM: 'Energy', CVX: 'Energy', COP: 'Energy',
  WMT: 'Consumer', HD: 'Consumer', MCD: 'Consumer', TGT: 'Consumer',
  SPY: 'ETF', QQQ: 'ETF', IVV: 'ETF', VTI: 'ETF',
  BTCUSD: 'Crypto', ETHUSD: 'Crypto', SOLUSD: 'Crypto',
  GCUSD: 'Commodity', SIUSD: 'Commodity', CLUSD: 'Commodity',
};

const SECTOR_COLORS = {
  Technology: '#3b82f6', Healthcare: '#10b981', Finance: '#a78bfa',
  Defense: '#f59e0b', Energy: '#f97316', Consumer: '#ec4899',
  ETF: '#06b6d4', Crypto: '#fbbf24', Commodity: '#84cc16', Other: '#6b7280',
};

function loadLocal() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveLocal(portfolio) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(portfolio)); } catch { /* quota */ }
}

function withMeta(portfolio) {
  if (!portfolio || typeof portfolio !== 'object') return portfolio;
  return { ...portfolio, _meta: { ...(portfolio._meta || {}), updatedAt: Date.now() } };
}

async function postToServer(portfolio, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch('/api/mock-portfolio', {
    method: 'POST', headers, body: JSON.stringify({ portfolio }),
  });
}

export function useMockPortfolio() {
  const { user } = useAuth();
  const [portfolio, setPortfolioState] = useState(null);
  const [serverLoaded, setServerLoaded] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [liveQuotes, setLiveQuotes] = useState({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const intervalRef = useRef(null);
  const postTimerRef = useRef(null);
  const postPayloadRef = useRef(null);
  const tokenRef = useRef(null);

  useEffect(() => { setStorageReady(true); }, []);

  // Keep a live access token ref for use in fire-and-forget POSTs and unload flushes
  useEffect(() => {
    if (!user?.id) { tokenRef.current = null; return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      tokenRef.current = session?.access_token ?? null;
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      tokenRef.current = session?.access_token ?? null;
    });
    return () => subscription.unsubscribe();
  }, [user?.id]);

  const flushPost = useCallback(async () => {
    if (!user?.id) return;
    const payload = postPayloadRef.current;
    postPayloadRef.current = null;
    if (!payload) return;
    setSyncing(true);
    try { await postToServer(payload, tokenRef.current); }
    catch { /* network */ }
    finally { setSyncing(false); }
  }, [user?.id]);

  const schedulePost = useCallback((next) => {
    postPayloadRef.current = next;
    if (postTimerRef.current) clearTimeout(postTimerRef.current);
    postTimerRef.current = setTimeout(() => {
      postTimerRef.current = null;
      flushPost();
    }, POST_DEBOUNCE_MS);
  }, [flushPost]);

  const setPortfolio = useCallback((update, options = {}) => {
    const { skipSync = false } = options;
    setPortfolioState((prev) => {
      const base = prev ?? { cash: STARTING_CASH, positions: {}, history: [] };
      const raw = typeof update === 'function' ? update(base) : update;
      if (raw == null) return raw;
      const next = withMeta(raw);
      saveLocal(next);
      if (!skipSync && user?.id) {
        // Immediate POST — data reaches Supabase right now, not after 800ms
        postToServer(next, tokenRef.current).catch(() => {});
        // Debounce as belt-and-suspenders for rapid sequential updates
        schedulePost(next);
      }
      return next;
    });
  }, [schedulePost, user?.id]);

  useEffect(() => {
    return () => { if (postTimerRef.current) clearTimeout(postTimerRef.current); };
  }, []);

  // Flush on tab close or hide — covers the case where user closes browser
  // within the 800ms debounce window after a trade
  useEffect(() => {
    if (!user?.id) return;
    const flush = () => {
      const payload = postPayloadRef.current;
      if (!payload) return;
      postPayloadRef.current = null;
      if (postTimerRef.current) { clearTimeout(postTimerRef.current); postTimerRef.current = null; }
      const body = JSON.stringify({ portfolio: payload });
      const token = tokenRef.current;
      try {
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          const url = token ? `/api/mock-portfolio?token=${encodeURIComponent(token)}` : '/api/mock-portfolio';
          navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }));
        } else {
          fetch('/api/mock-portfolio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body, keepalive: true,
          }).catch(() => {});
        }
      } catch { /* unload — best effort */ }
    };
    const onVisChange = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, [user?.id]);

  // Hydrate: boot from localStorage for instant UI, then fetch from server
  useEffect(() => {
    if (!storageReady) return;
    if (!user?.id) {
      const local = loadLocal();
      if (local) setPortfolioState(local);
      setServerLoaded(true);
      return;
    }
    // Show local immediately while server loads
    const bootLocal = loadLocal();
    if (bootLocal) setPortfolioState(bootLocal);

    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        tokenRef.current = token ?? null;

        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/mock-portfolio', { headers });
        if (cancelled) return;

        if (!res.ok) {
          console.warn('[useMockPortfolio] GET failed:', res.status);
          setServerLoaded(true);
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        const serverP = data?.portfolio;
        const serverT = data?.updated_at ? new Date(data.updated_at).getTime() : 0;
        const curLocal = loadLocal();
        const localT = curLocal?._meta?.updatedAt ?? 0;

        if (serverP && typeof serverP === 'object' && Object.keys(serverP).length > 0) {
          if (!curLocal || serverT >= localT) {
            // Server is authoritative
            setPortfolioState(serverP);
            saveLocal(serverP);
          } else {
            // Local is newer — use it and push to server
            setPortfolioState(curLocal);
            postToServer(curLocal, token).catch(() => {});
          }
        } else if (curLocal) {
          // Nothing on server yet — push local up
          setPortfolioState(curLocal);
          postToServer(curLocal, token).catch(() => {});
        }
      } catch (err) {
        console.error('[useMockPortfolio] hydration error:', err);
      } finally {
        if (!cancelled) setServerLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [storageReady, user?.id]);

  const fetchPrices = useCallback(async (positions) => {
    const symbols = Object.keys(positions || {});
    if (!symbols.length) return;
    setQuotesLoading(true);
    try {
      const results = await Promise.allSettled(
        symbols.map((sym) =>
          fetch(`/api/fmp/quote?symbol=${encodeURIComponent(sym)}`)
            .then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ),
      );
      const quotes = {};
      symbols.forEach((sym, i) => {
        const d = results[i].status === 'fulfilled' ? results[i].value : null;
        if (d?.price != null) {
          quotes[sym] = {
            price: Number(d.price),
            change: Number(d.change ?? 0),
            changePercent: Number(d.changesPercentage ?? d.changePercentage ?? 0),
          };
        }
      });
      setLiveQuotes(quotes);
    } catch { /* ignore */ }
    finally { setQuotesLoading(false); }
  }, []);

  useEffect(() => {
    if (!portfolio?.positions) return undefined;
    fetchPrices(portfolio.positions);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => fetchPrices(portfolio.positions), 60_000);
    return () => clearInterval(intervalRef.current);
  }, [portfolio?.positions, fetchPrices]);

  const hasMockPortfolio = serverLoaded && portfolio != null;
  const positions = portfolio?.positions ?? {};
  const history = portfolio?.history ?? [];
  const cash = portfolio?.cash ?? STARTING_CASH;

  const enrichedPositions = Object.values(positions).map((pos) => {
    const q = liveQuotes[pos.symbol];
    const currentPrice = q?.price ?? pos.currentPrice ?? pos.avgCost;
    const posValue = currentPrice * pos.qty;
    const pnl = (currentPrice - pos.avgCost) * pos.qty;
    const pnlPct = pos.avgCost ? (currentPrice / pos.avgCost - 1) * 100 : 0;
    return {
      ...pos, currentPrice, posValue, pnl, pnlPct,
      dayChange: q ? (q.change ?? 0) * pos.qty : 0,
      dayChangePct: q?.changePercent ?? 0,
      sector: TICKER_SECTOR[pos.symbol] ?? 'Other',
    };
  }).sort((a, b) => b.posValue - a.posValue);

  const totalPositionValue = enrichedPositions.reduce((s, p) => s + p.posValue, 0);
  const totalValue = cash + totalPositionValue;
  const totalPnl = totalValue - STARTING_CASH;
  const totalPnlPct = (totalValue / STARTING_CASH - 1) * 100;

  const sectorMap = {};
  for (const pos of enrichedPositions) sectorMap[pos.sector] = (sectorMap[pos.sector] ?? 0) + pos.posValue;
  const sectorTotal = Object.values(sectorMap).reduce((a, b) => a + b, 0) || 1;
  const sectorData = Object.entries(sectorMap)
    .map(([name, value]) => ({ name, value, pct: Math.round((value / sectorTotal) * 100), color: SECTOR_COLORS[name] ?? '#6b7280' }))
    .sort((a, b) => b.value - a.value);

  const typeMap = {};
  for (const pos of enrichedPositions) { const t = pos.type ?? 'Stock'; typeMap[t] = (typeMap[t] ?? 0) + Math.max(0, pos.pnl); }
  const typeTotal = Object.values(typeMap).reduce((a, b) => a + b, 0) || 1;
  const TYPE_COLORS = { Stock: '#10b981', Crypto: '#fbbf24', Commodity: '#f97316', ETF: '#3b82f6', Other: '#a78bfa' };
  const profitBreakdown = Object.entries(typeMap).map(([label, value]) => ({
    label, value, pct: Math.round((value / typeTotal) * 100), color: TYPE_COLORS[label] ?? '#6b7280',
  }));

  const recentTransactions = history.slice(0, 8).map((h) => ({
    company: h.symbol, ticker: h.symbol,
    date: new Date(h.ts).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
    amount: h.total, positive: h.side === 'buy', txId: `#${h.id.toString().slice(-9)}`,
  }));

  return {
    hasMockPortfolio, portfolio, setPortfolio, syncing,
    enrichedPositions, cash, totalValue, totalPositionValue,
    totalPnl, totalPnlPct, sectorData, profitBreakdown,
    recentTransactions, liveQuotes, quotesLoading, STARTING_CASH,
  };
}
