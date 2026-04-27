'use client';

import { useState, useEffect, useMemo, useCallback, cloneElement } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { HomeTerminalSummary } from '@/components/home/HomeTerminalSummary';
import { usePlaidPortfolioSummary } from '@/hooks/usePlaidPortfolioSummary';
import { useAlpacaPortfolioSummary } from '@/hooks/useAlpacaPortfolioSummary';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import '../../../../app-legacy/assets/css/theme-variables.css';
import '../../../../app-legacy/assets/css/theme.css';
import './terminal.css';

const INDEX_SYMBOLS = [
  { name: 'S&P 500', symbol: 'SPY' },
  { name: 'NASDAQ', symbol: 'QQQ' },
  { name: 'DOW', symbol: 'DIA' },
  { name: 'GOLD', symbol: 'GLD' },
  { name: 'OIL', symbol: 'USO' },
  { name: 'BONDS', symbol: 'TLT' },
  { name: 'BTC', symbol: 'IBIT' },
  { name: 'VIX', symbol: 'VIXY' },
  { name: 'EUR/USD', symbol: 'FXE' },
];

function HomeTerminalSkeleton() {
  return (
    <div className="ezana-terminal ezana-terminal--skeleton" aria-hidden>
      <div className="ezana-terminal-bar-strip ezana-terminal-bar-strip--top">
        <div className="dashboard-page-inset ezana-terminal-bar-inner">
          <div className="t-home-skel-marquee">
            <div className="t-home-skel-bar t-home-skel-bar--lg" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
      <div className="dashboard-page-inset" style={{ padding: '1.5rem 2rem' }}>
        <div className="t-home-skel-grid">
          <div className="t-home-skel-card">
            <div className="t-home-skel-bar t-home-skel-bar--md" style={{ width: '45%' }} />
            <div className="t-home-skel-bar t-home-skel-bar--xl" style={{ width: '72%', marginTop: '1rem' }} />
            <div className="t-home-skel-bar t-home-skel-bar--chart" style={{ marginTop: '1.25rem' }} />
          </div>
          <div className="t-home-skel-card t-home-skel-card--short">
            <div className="t-home-skel-bar t-home-skel-bar--md" style={{ width: '55%' }} />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="t-home-skel-bar t-home-skel-bar--sm" style={{ width: '100%', marginTop: '0.65rem' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

async function fetchBatchQuotes(symbols) {
  if (!symbols.length) return {};
  try {
    const res = await fetch(`/api/market/batch-quotes?symbols=${symbols.join(',')}`);
    if (!res.ok) return {};
    const data = await res.json();
    return data.quotes || {};
  } catch {
    return {};
  }
}

export default function HomeTerminalPage() {
  const { user } = useAuth();
  const { connected: plaidConnected, summary: plaidSummary, isLoading: plaidSummaryLoading } =
    usePlaidPortfolioSummary();
  const { connected: alpacaConnected, summary: alpacaSummary, isLoading: alpacaSummaryLoading } =
    useAlpacaPortfolioSummary();
  const mock = useMockPortfolio();
  const [time, setTime] = useState('');
  const [holdings, setHoldings] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [indexQuotes, setIndexQuotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(true);
  const [weekPlaidTransactions, setWeekPlaidTransactions] = useState([]);
  const [weekTradeHistory, setWeekTradeHistory] = useState([]);

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const fetchPortfolio = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('plaid_holdings')
        .select('id, ticker_symbol, quantity, institution_price, institution_value, cost_basis, type')
        .eq('user_id', user.id)
        .order('institution_value', { ascending: false });

      if (error) throw error;
      const rows = data || [];
      setHoldings(rows);

      if (rows.length > 0) {
        const symbols = [...new Set(rows.map((h) => h.ticker_symbol).filter(Boolean))];
        const q = await fetchBatchQuotes(symbols);
        setQuotes(q);
      }
    } catch (err) {
      console.error('Portfolio fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchMarketData = useCallback(async () => {
    try {
      const symbols = INDEX_SYMBOLS.map((i) => i.symbol);
      const q = await fetchBatchQuotes(symbols);
      setIndexQuotes(q);
    } catch (err) {
      console.error('Market data error:', err);
    } finally {
      setMarketLoading(false);
    }
  }, []);

  const fetchWeekRecap = useCallback(async () => {
    if (!user) {
      setWeekPlaidTransactions([]);
      setWeekTradeHistory([]);
      return;
    }
    try {
      const monday = new Date();
      const dow = monday.getDay();
      const toMonday = dow === 0 ? -6 : 1 - dow;
      monday.setDate(monday.getDate() + toMonday);
      monday.setHours(0, 0, 0, 0);
      const mondayStr = monday.toISOString().split('T')[0];
      const mondayIso = monday.toISOString();

      const [plaidRes, tradeRes] = await Promise.all([
        supabase
          .from('plaid_transactions')
          .select('*')
          .eq('user_id', user.id)
          .gte('transaction_date', mondayStr)
          .order('transaction_date', { ascending: true }),
        supabase
          .from('trade_history')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', mondayIso)
          .order('created_at', { ascending: true }),
      ]);

      if (plaidRes.error) {
        console.warn('Week Plaid transactions:', plaidRes.error.message);
        setWeekPlaidTransactions([]);
      } else {
        setWeekPlaidTransactions(plaidRes.data || []);
      }
      if (tradeRes.error) {
        console.warn('Week trade history:', tradeRes.error.message);
        setWeekTradeHistory([]);
      } else {
        setWeekTradeHistory(tradeRes.data || []);
      }
    } catch (err) {
      console.error('Week recap fetch error:', err);
      setWeekPlaidTransactions([]);
      setWeekTradeHistory([]);
    }
  }, [user]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  useEffect(() => {
    fetchWeekRecap();
  }, [fetchWeekRecap]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchMarketData();
      if (holdings.length > 0) {
        const symbols = [...new Set(holdings.map((h) => h.ticker_symbol).filter(Boolean))];
        fetchBatchQuotes(symbols).then(setQuotes);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [holdings, fetchMarketData]);

  const enrichedHoldings = useMemo(() => {
    return holdings.map((h) => {
      const q = quotes[h.ticker_symbol];
      const livePrice = q?.price ?? h.institution_price ?? 0;
      const liveChange = q?.change ?? 0;
      const livePct = q?.changePercent ?? 0;
      const shares = h.quantity || 0;
      const value = livePrice * shares;
      const costBasis = h.cost_basis || 0;
      const totalGain = value - costBasis;
      return {
        ticker: h.ticker_symbol,
        shares,
        price: livePrice,
        change: liveChange,
        pctChange: livePct,
        value,
        costBasis,
        totalGain,
        type: h.type || 'equity',
      };
    });
  }, [holdings, quotes]);

  const portfolioTotal = useMemo(
    () => enrichedHoldings.reduce((s, h) => s + h.value, 0),
    [enrichedHoldings],
  );

  const isInitialLoading =
    Boolean(user) && (loading || alpacaSummaryLoading || plaidSummaryLoading || mock.isLoading);

  /** Real total only — never a demo placeholder (loading is gated by skeleton). */
  const portfolioTotalAligned = useMemo(() => {
    if (!user) return null;

    if (alpacaConnected) {
      if (alpacaSummaryLoading) return null;
      if (alpacaSummary?.totalValue != null) return alpacaSummary.totalValue;
    }

    if (plaidConnected) {
      if (plaidSummaryLoading) return null;
      if (plaidSummary?.totalValue != null) return plaidSummary.totalValue;
      if (portfolioTotal > 0) return portfolioTotal;
      return null;
    }

    if (mock.hasMockPortfolio) return mock.totalValue;

    return null;
  }, [
    user,
    alpacaConnected,
    alpacaSummaryLoading,
    alpacaSummary?.totalValue,
    plaidConnected,
    plaidSummaryLoading,
    plaidSummary?.totalValue,
    mock.hasMockPortfolio,
    mock.totalValue,
    portfolioTotal,
  ]);

  const marqueePortfolioValue = portfolioTotalAligned;

  const portfolioChange = useMemo(() => {
    // Match the priority chain from portfolioTotalAligned:
    // Alpaca → Plaid → mock → fallback
    if (alpacaConnected && alpacaSummary?.totalGainLoss != null) {
      return alpacaSummary.totalGainLoss;
    }
    if (mock.hasMockPortfolio) return mock.totalPnl;
    return enrichedHoldings.reduce((s, h) => s + h.change * h.shares, 0);
  }, [
    alpacaConnected,
    alpacaSummary?.totalGainLoss,
    mock.hasMockPortfolio,
    mock.totalPnl,
    enrichedHoldings,
  ]);

  const isMarketOpen = useMemo(() => {
    const now = new Date();
    const h = now.getUTCHours();
    const m = now.getUTCMinutes();
    const mins = h * 60 + m;
    const day = now.getUTCDay();
    return day >= 1 && day <= 5 && mins >= 14 * 60 + 30 && mins < 21 * 60;
  }, []);

  const marqueeBlocks = useMemo(() => {
    const blocks = [];
    blocks.push(
      <span key="brand" className="t-news-item">
        <span className="t-brand-icon t-brand-icon--inline">EF</span>{' '}
        <strong>EZANA TERMINAL</strong>
      </span>,
    );
    blocks.push(
      <span key="pv" className="t-news-item">
        <strong>PORTFOLIO</strong>{' '}
        {user ? (
          marqueePortfolioValue != null && Number.isFinite(marqueePortfolioValue) ? (
            <>
              <strong>
                $
                {marqueePortfolioValue.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>{' '}
              <span className={portfolioChange >= 0 ? 't-green' : 't-red'}>
                {portfolioChange >= 0 ? '+' : ''}
                {portfolioChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                today
              </span>
            </>
          ) : (
            <span className="t-dim">Connect a brokerage or enable mock trading for a live headline.</span>
          )
        ) : (
          <span className="t-dim">Sign in to track your portfolio on the tape.</span>
        )}
      </span>,
    );
    INDEX_SYMBOLS.forEach((idx) => {
      const q = indexQuotes[idx.symbol];
      blocks.push(
        <span key={idx.symbol} className="t-news-item">
          <strong>{idx.name}</strong>{' '}
          {q ? (
            <>
              {q.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className={q.changePercent >= 0 ? 't-green' : 't-red'}>
                ({q.changePercent >= 0 ? '+' : ''}
                {q.changePercent.toFixed(2)}%)
              </span>
            </>
          ) : (
            <span className="t-dim">{marketLoading ? '…' : '—'}</span>
          )}
        </span>,
      );
    });
    blocks.push(
      <span key="mkt" className="t-news-item">
        <span className={isMarketOpen ? 't-green' : 't-red'}>{isMarketOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}</span>{' '}
        <span className="t-dim">{time}</span>
      </span>,
    );
    blocks.push(
      <span key="flow" className="t-news-item">
        <strong>FLOWS</strong>{' '}
        <span className="t-dim">
          Equities +$2.1B · IG credit tight 2bps · <span className="t-green">HY</span> issuance light
        </span>
      </span>,
    );
    blocks.push(
      <span key="cong" className="t-news-item t-news-item--segment">
        <strong>CONGRESS</strong>{' '}
        <span className="t-dim">
          14 STOCK Act filings (24h) · committees: Energy, Intel, Banking · watch semis &amp; defense
        </span>
      </span>,
    );
    blocks.push(
      <span key="13f" className="t-news-item t-news-item--segment">
        <strong>13F</strong>{' '}
        <span className="t-dim">Quarterly window: elevated adds in AI infra · trims in legacy retail</span>
      </span>,
    );
    blocks.push(
      <span key="fed" className="t-news-item t-news-item--segment">
        <strong>FED WATCH</strong>{' '}
        <span className="t-dim">Speakers on deck · front-end yields leading risk tone</span>
      </span>,
    );
    blocks.push(
      <span key="vol" className="t-news-item t-news-item--segment">
        <strong>VOL</strong>{' '}
        <span className="t-dim">Index complex bid · single-name skew elevated into earnings cluster</span>
      </span>,
    );
    blocks.push(
      <span key="fx" className="t-news-item t-news-item--segment">
        <strong>FX</strong>{' '}
        <span className="t-dim">DXY steady · carry quiet · EMFX mixed on commodity patch</span>
      </span>,
    );
    blocks.push(
      <span key="echo" className="t-news-item t-news-item--segment">
        <strong>EZANA ECHO</strong>{' '}
        <span className="t-dim">New: disclosure lag vs. price — how to read filing dates vs. trade dates</span>
      </span>,
    );
    blocks.push(
      <span key="alerts" className="t-news-item t-news-item--segment">
        <strong>ALERTS</strong>{' '}
        <span className="t-dim">Price targets · congressional mentions · watchlist gaps · portfolio risk</span>
      </span>,
    );
    if (enrichedHoldings.length > 0) {
      enrichedHoldings.slice(0, 10).forEach((h, i) => {
        blocks.push(
          <span key={`h-${i}`} className="t-news-item">
            <strong>{h.ticker}</strong> ${h.price.toFixed(2)} ({h.pctChange >= 0 ? '+' : ''}
            {h.pctChange.toFixed(2)}%) — {h.shares} sh · $
            {h.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </span>,
        );
      });
    } else {
      blocks.push(
        <span key="empty" className="t-news-item">
          <strong style={{ color: '#10b981' }}>Welcome.</strong>{' '}
          <span style={{ color: '#10b981' }}>Connect your brokerage to see live portfolio data.</span>
        </span>,
      );
    }
    return blocks;
  }, [
    user,
    loading,
    plaidSummaryLoading,
    marqueePortfolioValue,
    portfolioChange,
    indexQuotes,
    marketLoading,
    isMarketOpen,
    time,
    enrichedHoldings,
  ]);

  const marqueeTrack = useMemo(
    () => (
      <>
        {marqueeBlocks.map((el, i) => cloneElement(el, { key: `m1-${i}` }))}
        {marqueeBlocks.map((el, i) => cloneElement(el, { key: `m2-${i}` }))}
      </>
    ),
    [marqueeBlocks],
  );

  return (
    <div className="ezana-terminal">
      {isInitialLoading ? (
        <HomeTerminalSkeleton />
      ) : (
        <>
          <div className="ezana-terminal-bar-strip ezana-terminal-bar-strip--top">
            <div className="dashboard-page-inset ezana-terminal-bar-inner">
              <div className="t-news-bar t-terminal-marquee-top">
                <div className="t-news-label">
                  <i className="bi bi-broadcast" style={{ marginRight: 4 }} /> LIVE
                </div>
                <div className="t-news-scroll">
                  <div className="t-news-track">{marqueeTrack}</div>
                </div>
              </div>
            </div>
          </div>

          <HomeTerminalSummary
            portfolioTotal={portfolioTotalAligned}
            portfolioChange={portfolioChange}
            enrichedHoldings={
              mock.hasMockPortfolio && mock.enrichedPositions?.length > 0
                ? mock.enrichedPositions
                : enrichedHoldings
            }
            loading={loading}
            hasUser={!!user}
            weekPlaidTransactions={weekPlaidTransactions}
            weekTradeHistory={weekTradeHistory}
            plaidConnected={plaidConnected}
            plaidSummary={plaidSummary}
            mockTotalValue={mock.totalValue}
            mockHasMockPortfolio={mock.hasMockPortfolio}
          />
        </>
      )}
    </div>
  );
}
