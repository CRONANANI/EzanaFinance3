'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { HomeTerminalSummary } from '@/components/home/HomeTerminalSummary';
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
  const [time, setTime] = useState('');
  const [holdings, setHoldings] = useState([]);
  const [quotes, setQuotes] = useState({});
  const [indexQuotes, setIndexQuotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(true);

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

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

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
  const portfolioChange = useMemo(
    () => enrichedHoldings.reduce((s, h) => s + h.change * h.shares, 0),
    [enrichedHoldings],
  );

  const isMarketOpen = useMemo(() => {
    const now = new Date();
    const h = now.getUTCHours();
    const m = now.getUTCMinutes();
    const mins = h * 60 + m;
    const day = now.getUTCDay();
    return day >= 1 && day <= 5 && mins >= 14 * 60 + 30 && mins < 21 * 60;
  }, []);

  return (
    <div className="ezana-terminal">
      <div className="t-ticker-bar">
        <div className="t-brand">
          <div className="t-brand-icon">EF</div>
          <span>EZANA TERMINAL</span>
        </div>
        <div className="t-portfolio-value">
          <span className="t-pv-label">PORTFOLIO</span>
          {loading ? (
            <span className="t-pv-amount t-dim">---</span>
          ) : (
            <>
              <span className="t-pv-amount">
                ${portfolioTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`t-pv-change ${portfolioChange >= 0 ? 't-green' : 't-red'}`}>
                {portfolioChange >= 0 ? '+' : ''}
                {portfolioChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </>
          )}
        </div>
        <div className="t-indices-scroll">
          {INDEX_SYMBOLS.map((idx) => {
            const q = indexQuotes[idx.symbol];
            return (
              <div key={idx.name} className="t-index-item">
                <span className="t-index-name">{idx.name}</span>
                {q ? (
                  <>
                    <span className="t-index-val">
                      {q.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span
                      className={q.changePercent >= 0 ? 't-green' : 't-red'}
                      style={{ fontSize: 10, fontWeight: 600 }}
                    >
                      {q.changePercent >= 0 ? '+' : ''}
                      {q.changePercent.toFixed(2)}%
                    </span>
                  </>
                ) : (
                  <span className="t-dim" style={{ fontSize: 10 }}>
                    {marketLoading ? '...' : '—'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="t-market-status">
          <div className={`t-status-dot ${isMarketOpen ? 'open' : 'closed'}`} />
          <span style={{ color: isMarketOpen ? '#10b981' : '#ef4444' }}>
            {isMarketOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
          </span>
          <span className="t-dim" style={{ marginLeft: 4 }}>
            {time}
          </span>
        </div>
      </div>

      <HomeTerminalSummary
        portfolioTotal={portfolioTotal}
        portfolioChange={portfolioChange}
        enrichedHoldings={enrichedHoldings}
        loading={loading}
      />

      <div className="t-news-bar">
        <div className="t-news-label">
          <i className="bi bi-broadcast" style={{ marginRight: 4 }} /> LIVE
        </div>
        <div className="t-news-scroll">
          <div className="t-news-track">
            {enrichedHoldings.length > 0 ? (
              enrichedHoldings.slice(0, 10).flatMap((h, i) => [
                <span key={`a-${i}`} className="t-news-item">
                  <strong>{h.ticker}</strong> ${h.price.toFixed(2)} ({h.pctChange >= 0 ? '+' : ''}
                  {h.pctChange.toFixed(2)}%) — {h.shares} shares worth $
                  {h.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>,
                <span key={`b-${i}`} className="t-news-item">
                  <strong>{h.ticker}</strong> P&amp;L: {h.totalGain >= 0 ? '+' : ''}$
                  {h.totalGain.toLocaleString('en-US', { maximumFractionDigits: 0 })} (
                  {h.costBasis > 0 ? ((h.totalGain / h.costBasis) * 100).toFixed(1) : '0'}%)
                </span>,
              ])
            ) : (
              <span className="t-news-item">
                <strong>EZANA</strong> Welcome to Ezana Terminal. Connect your brokerage to see live portfolio data.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
