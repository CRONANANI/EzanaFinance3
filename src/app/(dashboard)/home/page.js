'use client';

import { useState, useEffect, useMemo, useCallback, cloneElement } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { HomeTerminalSummary } from '@/components/home/HomeTerminalSummary';
import { HERO_DATA } from '@/lib/dashboard-hero-data';
import { usePlaidPortfolioSummary } from '@/hooks/usePlaidPortfolioSummary';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import '../../../../app-legacy/assets/css/theme-variables.css';
import '../../../../app-legacy/assets/css/theme.css';
import '../home-dashboard/home-dashboard.css';
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

  /** Same dollar amount as /home-dashboard "Current Value" (Plaid summary, mock, or demo hero) */
  const marqueePortfolioValue = useMemo(() => {
    if (!user) return 0;
    if (mock.hasMockPortfolio) return mock.totalValue;
    if (plaidSummaryLoading) return null;
    if (plaidConnected) return plaidSummary?.totalValue ?? 0;
    return HERO_DATA['1D'].value;
  }, [user, mock.hasMockPortfolio, mock.totalValue, plaidSummaryLoading, plaidConnected, plaidSummary]);

  /** Hero cards match dashboard Current Value; falls back to live-enriched sum while summary loads */
  const portfolioTotalAligned = marqueePortfolioValue ?? portfolioTotal;

  const portfolioChange = useMemo(() => {
    if (mock.hasMockPortfolio) return mock.totalPnl;
    return enrichedHoldings.reduce((s, h) => s + h.change * h.shares, 0);
  }, [mock.hasMockPortfolio, mock.totalPnl, enrichedHoldings]);

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
        {user && (loading || plaidSummaryLoading) ? (
          <span className="t-dim">—</span>
        ) : marqueePortfolioValue == null ? (
          <span className="t-dim">—</span>
        ) : (
          <>
            <span className="db-watchlist-price">
              $
              {marqueePortfolioValue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>{' '}
            <span
              className={`db-hero-change ${portfolioChange >= 0 ? 'positive' : 'negative'}`}
              style={{ marginTop: 0 }}
            >
              {portfolioChange >= 0 ? '+' : ''}
              {portfolioChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              today
            </span>
          </>
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
              <span className="db-watchlist-price">
                {q.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>{' '}
              <span
                className={`db-watchlist-change ${q.changePercent >= 0 ? 'positive' : 'negative'}`}
              >
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
      <span key="cong" className="t-news-item">
        <strong>CONGRESS</strong>{' '}
        <span className="t-dim">
          14 STOCK Act filings (24h) · committees: Energy, Intel, Banking · watch semis &amp; defense
        </span>
      </span>,
    );
    blocks.push(
      <span key="13f" className="t-news-item">
        <strong>13F</strong>{' '}
        <span className="t-dim">Quarterly window: elevated adds in AI infra · trims in legacy retail</span>
      </span>,
    );
    blocks.push(
      <span key="fed" className="t-news-item">
        <strong>FED WATCH</strong>{' '}
        <span className="t-dim">Speakers on deck · front-end yields leading risk tone</span>
      </span>,
    );
    blocks.push(
      <span key="vol" className="t-news-item">
        <strong>VOL</strong>{' '}
        <span className="t-dim">Index complex bid · single-name skew elevated into earnings cluster</span>
      </span>,
    );
    blocks.push(
      <span key="fx" className="t-news-item">
        <strong>FX</strong>{' '}
        <span className="t-dim">DXY steady · carry quiet · EMFX mixed on commodity patch</span>
      </span>,
    );
    blocks.push(
      <span key="echo" className="t-news-item">
        <strong>EZANA ECHO</strong>{' '}
        <span className="t-dim">New: disclosure lag vs. price — how to read filing dates vs. trade dates</span>
      </span>,
    );
    blocks.push(
      <span key="alerts" className="t-news-item">
        <strong>ALERTS</strong>{' '}
        <span className="t-dim">Price targets · congressional mentions · watchlist gaps · portfolio risk</span>
      </span>,
    );
    if (enrichedHoldings.length > 0) {
      enrichedHoldings.slice(0, 10).forEach((h, i) => {
        blocks.push(
          <span key={`h-${i}`} className="t-news-item">
            <strong className="db-watchlist-ticker">{h.ticker}</strong>{' '}
            <span className="db-watchlist-price">${h.price.toFixed(2)}</span> (
            <span className={`db-watchlist-change ${h.pctChange >= 0 ? 'positive' : 'negative'}`}>
              {h.pctChange >= 0 ? '+' : ''}
              {h.pctChange.toFixed(2)}%
            </span>
            ) — {h.shares} sh ·{' '}
            <span className="db-watchlist-price">
              ${h.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
          </span>,
        );
      });
    } else {
      blocks.push(
        <span key="empty" className="t-news-item">
          <strong>EZANA</strong> Welcome to Ezana Terminal. Connect your brokerage to see live portfolio data.
        </span>,
      );
    }
    return blocks;
  }, [
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
        enrichedHoldings={enrichedHoldings}
        loading={loading}
        hasUser={!!user}
        weekPlaidTransactions={weekPlaidTransactions}
        weekTradeHistory={weekTradeHistory}
      />
    </div>
  );
}
