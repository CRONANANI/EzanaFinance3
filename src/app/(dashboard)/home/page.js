'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
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

const SUGGESTIONS = [
  { icon: 'warn', title: 'Review Sector Concentration', desc: 'Check whether any single sector exceeds 35% of total portfolio weight. Consider rebalancing if needed.' },
  { icon: 'info', title: 'Rebalance Opportunity', desc: 'Positions drifting from target weights may increase tracking error. Review quarterly.' },
  { icon: 'danger', title: 'Watch Correlated Holdings', desc: 'Highly correlated positions amplify drawdown risk. Consider diversifying across sectors.' },
  { icon: 'ok', title: 'Diversification Check', desc: 'Maintaining 15+ uncorrelated positions helps reduce idiosyncratic risk.' },
  { icon: 'warn', title: 'Earnings Season Alert', desc: 'Multiple holdings reporting this quarter. Monitor for volatility around announcement dates.' },
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

function DonutChart({ data }) {
  if (!data.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  let cumulative = 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const colors = ['#10b981', '#3b82f6', '#a78bfa', '#fbbf24', '#22d3ee', '#f472b6', '#fb923c', '#34d399', '#818cf8', '#f87171'];
  const topLabel = data[0];

  return (
    <svg viewBox="0 0 120 120" className="t-donut-svg">
      {data.map((d, i) => {
        const offset = (cumulative / total) * circumference;
        const length = (d.value / total) * circumference;
        cumulative += d.value;
        return (
          <circle
            key={i}
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={colors[i % colors.length]}
            strokeWidth="16"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 60 60)"
          />
        );
      })}
      <text x="60" y="56" textAnchor="middle" fill="#f0f6fc" fontSize="14" fontWeight="700" fontFamily="inherit">
        {total > 0 ? ((topLabel.value / total) * 100).toFixed(0) : 0}%
      </text>
      <text x="60" y="70" textAnchor="middle" fill="#8b949e" fontSize="8" fontFamily="inherit">
        {topLabel.label?.toUpperCase() || ''}
      </text>
    </svg>
  );
}

function MiniChart({ color = '#10b981', points }) {
  if (!points || points.length < 2) return null;
  const h = 100, w = 280;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);

  const d = points.map((p, i) => {
    const x = i * step;
    const y = h - ((p - min) / range) * (h - 10) - 5;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill="url(#chartGrad)" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function LoadingPulse() {
  return <div className="t-loading-pulse"><span className="t-green">Loading...</span></div>;
}

function corrColor(v) {
  if (v >= 0.9) return 'rgba(16, 185, 129, 0.9)';
  if (v >= 0.8) return 'rgba(16, 185, 129, 0.6)';
  if (v >= 0.7) return 'rgba(16, 185, 129, 0.35)';
  if (v >= 0.6) return 'rgba(59, 130, 246, 0.4)';
  return 'rgba(59, 130, 246, 0.2)';
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
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const fetchPortfolio = useCallback(async () => {
    if (!user) { setLoading(false); return; }
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

  useEffect(() => { fetchPortfolio(); }, [fetchPortfolio]);
  useEffect(() => { fetchMarketData(); }, [fetchMarketData]);

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

  const portfolioTotal = useMemo(() => enrichedHoldings.reduce((s, h) => s + h.value, 0), [enrichedHoldings]);
  const portfolioCostBasis = useMemo(() => enrichedHoldings.reduce((s, h) => s + h.costBasis, 0), [enrichedHoldings]);
  const portfolioChange = useMemo(() => enrichedHoldings.reduce((s, h) => s + h.change * h.shares, 0), [enrichedHoldings]);
  const portfolioTotalGain = portfolioTotal - portfolioCostBasis;
  const portfolioReturnPct = portfolioCostBasis > 0 ? (portfolioTotalGain / portfolioCostBasis) * 100 : 0;

  const allocationData = useMemo(() => {
    const byType = {};
    enrichedHoldings.forEach((h) => {
      const t = h.type || 'equity';
      byType[t] = (byType[t] || 0) + h.value;
    });
    return Object.entries(byType)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [enrichedHoldings]);

  const topMovers = useMemo(() => {
    return [...enrichedHoldings]
      .sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange))
      .slice(0, 6);
  }, [enrichedHoldings]);

  const corrTickers = useMemo(() => enrichedHoldings.slice(0, 5).map((h) => h.ticker), [enrichedHoldings]);
  const corrData = useMemo(() => {
    const n = corrTickers.length;
    if (n === 0) return [];
    const matrix = [];
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < n; j++) {
        if (i === j) row.push(1.0);
        else {
          const seed = (corrTickers[i].charCodeAt(0) + corrTickers[j].charCodeAt(0)) / 200;
          row.push(Math.round((0.5 + seed * 0.4) * 100) / 100);
        }
      }
      matrix.push(row);
    }
    return matrix;
  }, [corrTickers]);

  const portfolioChartPoints = useMemo(() => {
    const base = portfolioTotal || 10000;
    const pts = [];
    for (let i = 0; i < 30; i++) {
      pts.push(base * (0.95 + Math.sin(i * 0.3) * 0.03 + (i / 30) * 0.05 + (Math.random() - 0.5) * 0.01));
    }
    return pts;
  }, [portfolioTotal]);

  const isMarketOpen = useMemo(() => {
    const now = new Date();
    const h = now.getUTCHours();
    const m = now.getUTCMinutes();
    const mins = h * 60 + m;
    const day = now.getUTCDay();
    return day >= 1 && day <= 5 && mins >= 14 * 60 + 30 && mins < 21 * 60;
  }, []);

  const hasPortfolio = enrichedHoldings.length > 0;

  return (
    <div className="ezana-terminal">
      {/* ── TOP TICKER BAR ── */}
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
                    <span className="t-index-val">{q.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className={q.changePercent >= 0 ? 't-green' : 't-red'} style={{ fontSize: 10, fontWeight: 600 }}>
                      {q.changePercent >= 0 ? '+' : ''}{q.changePercent.toFixed(2)}%
                    </span>
                  </>
                ) : (
                  <span className="t-dim" style={{ fontSize: 10 }}>{marketLoading ? '...' : '—'}</span>
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
          <span className="t-dim" style={{ marginLeft: 4 }}>{time}</span>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="t-grid">
        {/* LEFT: Holdings */}
        <div className="t-panel t-holdings">
          <div className="t-panel-header">
            <span className="t-panel-title">Holdings</span>
            <span className="t-panel-badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
              {enrichedHoldings.length} position{enrichedHoldings.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="t-panel-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}><LoadingPulse /></div>
            ) : !hasPortfolio ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <p className="t-dim" style={{ fontSize: 11 }}>No holdings found.</p>
                <p className="t-dim" style={{ fontSize: 10, marginTop: 4 }}>Connect a brokerage via Plaid to see your positions here.</p>
              </div>
            ) : (
              <table className="t-holdings-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Price</th>
                    <th>Chg</th>
                    <th>%</th>
                    <th>Shares</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedHoldings.map((h) => (
                    <tr key={h.ticker}>
                      <td>{h.ticker}</td>
                      <td>{h.price.toFixed(2)}</td>
                      <td className={h.change >= 0 ? 't-green' : 't-red'}>
                        {h.change >= 0 ? '+' : ''}{h.change.toFixed(2)}
                      </td>
                      <td className={h.pctChange >= 0 ? 't-green' : 't-red'}>
                        {h.pctChange >= 0 ? '+' : ''}{h.pctChange.toFixed(2)}%
                      </td>
                      <td className="t-dim">{h.shares}</td>
                      <td>${h.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* CENTER-TOP: Portfolio Chart */}
        <div className="t-panel">
          <div className="t-panel-header">
            <span className="t-panel-title">Portfolio Performance</span>
            <span className="t-dim" style={{ fontSize: 10 }}>30D</span>
          </div>
          <div className="t-chart-area">
            <MiniChart color="#10b981" points={portfolioChartPoints} />
          </div>
          <div className="t-perf-stats">
            <div className="t-perf-stat">
              <div className="t-perf-stat-label">Total Value</div>
              <div className="t-perf-stat-value">${portfolioTotal > 0 ? (portfolioTotal / 1000).toFixed(1) + 'K' : '0'}</div>
            </div>
            <div className="t-perf-stat">
              <div className="t-perf-stat-label">Today</div>
              <div className={`t-perf-stat-value ${portfolioChange >= 0 ? 't-green' : 't-red'}`}>
                {portfolioChange >= 0 ? '+' : ''}${Math.abs(portfolioChange).toFixed(2)}
              </div>
            </div>
            <div className="t-perf-stat">
              <div className="t-perf-stat-label">Total Return</div>
              <div className={`t-perf-stat-value ${portfolioReturnPct >= 0 ? 't-green' : 't-red'}`}>
                {portfolioReturnPct >= 0 ? '+' : ''}{portfolioReturnPct.toFixed(1)}%
              </div>
            </div>
            <div className="t-perf-stat">
              <div className="t-perf-stat-label">Positions</div>
              <div className="t-perf-stat-value">{enrichedHoldings.length}</div>
            </div>
          </div>
        </div>

        {/* CENTER-RIGHT: Risk Analysis */}
        <div className="t-panel">
          <div className="t-panel-header">
            <span className="t-panel-title">Risk Analysis</span>
          </div>
          <div className="t-panel-body" style={{ padding: 0 }}>
            <div className="t-risk-grid">
              <RiskMetric label="Total P&L" value={`$${portfolioTotalGain.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} sub="Since inception" positive={portfolioTotalGain >= 0} />
              <RiskMetric label="Day Change" value={`$${portfolioChange.toFixed(2)}`} sub="Today's P&L" positive={portfolioChange >= 0} />
              <RiskMetric label="Cost Basis" value={`$${(portfolioCostBasis / 1000).toFixed(1)}K`} sub="Total invested" />
              <RiskMetric label="Return %" value={`${portfolioReturnPct.toFixed(2)}%`} sub="Total return" positive={portfolioReturnPct >= 0} />
              <RiskMetric label="Avg Position" value={enrichedHoldings.length > 0 ? `$${(portfolioTotal / enrichedHoldings.length / 1000).toFixed(1)}K` : '$0'} sub="Per holding" />
              <RiskMetric label="Largest" value={enrichedHoldings.length > 0 ? enrichedHoldings[0].ticker : '—'} sub={enrichedHoldings.length > 0 ? `$${enrichedHoldings[0].value.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : ''} />
            </div>
          </div>
        </div>

        {/* RIGHT: Suggestions + Movers */}
        <div className="t-panel t-suggestions">
          <div className="t-panel-header">
            <span className="t-panel-title">Risk Suggestions</span>
          </div>
          <div className="t-panel-body" style={{ padding: 0 }}>
            {SUGGESTIONS.map((s, i) => (
              <div key={i} className="t-suggestion-card">
                <div className={`t-sug-icon ${s.icon}`}>
                  <i className={`bi ${s.icon === 'warn' ? 'bi-exclamation-triangle' : s.icon === 'danger' ? 'bi-shield-exclamation' : s.icon === 'info' ? 'bi-info-circle' : 'bi-check-circle'}`} />
                </div>
                <div>
                  <div className="t-sug-title">{s.title}</div>
                  <div className="t-sug-desc">{s.desc}</div>
                </div>
              </div>
            ))}

            {topMovers.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(16,185,129,0.15)', marginTop: 4 }}>
                <div className="t-panel-header">
                  <span className="t-panel-title">Top Movers Today</span>
                </div>
                {topMovers.map((m) => (
                  <div key={m.ticker} className="t-mover-row">
                    <span className="t-mover-ticker">{m.ticker}</span>
                    <span className="t-mover-price">{m.price.toFixed(2)}</span>
                    <span className={`t-mover-change ${m.pctChange >= 0 ? 't-green' : 't-red'}`}>
                      {m.pctChange >= 0 ? '+' : ''}{m.pctChange.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM-LEFT: Asset Allocation */}
        <div className="t-panel">
          <div className="t-panel-header">
            <span className="t-panel-title">Asset Allocation</span>
          </div>
          {allocationData.length > 0 ? (
            <div className="t-donut-wrap">
              <DonutChart data={allocationData} />
              <div className="t-donut-legend">
                {allocationData.map((d, i) => {
                  const colors = ['#10b981', '#3b82f6', '#a78bfa', '#fbbf24', '#22d3ee', '#f472b6', '#fb923c'];
                  const pct = portfolioTotal > 0 ? ((d.value / portfolioTotal) * 100).toFixed(1) : '0';
                  return (
                    <div key={d.label} className="t-donut-legend-item">
                      <div className="t-donut-color" style={{ background: colors[i % colors.length] }} />
                      <span className="t-dim" style={{ minWidth: 72 }}>{d.label}</span>
                      <span className="t-donut-pct">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
              <p className="t-dim" style={{ fontSize: 11 }}>No allocation data.</p>
            </div>
          )}

          {/* Market overview below allocation */}
          <div style={{ borderTop: '1px solid rgba(16,185,129,0.15)' }}>
            <div className="t-panel-header">
              <span className="t-panel-title">Market Overview</span>
              <span className="t-panel-badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>LIVE</span>
            </div>
            <div style={{ maxHeight: 160, overflow: 'auto' }}>
              {INDEX_SYMBOLS.map((idx) => {
                const q = indexQuotes[idx.symbol];
                return (
                  <div key={idx.symbol} className="t-mover-row">
                    <span className="t-mover-ticker" style={{ minWidth: 60 }}>{idx.name}</span>
                    <span className="t-mover-price">{q ? q.price.toFixed(2) : '—'}</span>
                    <span className={`t-mover-change ${q && q.changePercent >= 0 ? 't-green' : 't-red'}`}>
                      {q ? `${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* BOTTOM-CENTER: Correlation Matrix */}
        <div className="t-panel">
          <div className="t-panel-header">
            <span className="t-panel-title">Correlation Matrix</span>
            <span className="t-panel-badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>HEAT MAP</span>
          </div>
          <div className="t-panel-body">
            {corrTickers.length > 0 ? (
              <div className="t-heatmap-grid" style={{ gridTemplateColumns: `32px repeat(${corrTickers.length}, 1fr)` }}>
                <div />
                {corrTickers.map((t) => (
                  <div key={`h-${t}`} className="t-heatmap-label">{t}</div>
                ))}
                {corrData.map((row, ri) => (
                  <CorrelationRow key={ri} ticker={corrTickers[ri]} row={row} />
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <p className="t-dim" style={{ fontSize: 11 }}>Add holdings to see correlation data.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM NEWS TICKER ── */}
      <div className="t-news-bar">
        <div className="t-news-label">
          <i className="bi bi-broadcast" style={{ marginRight: 4 }} /> LIVE
        </div>
        <div className="t-news-scroll">
          <div className="t-news-track">
            {enrichedHoldings.length > 0 ? (
              enrichedHoldings.slice(0, 10).flatMap((h, i) => [
                <span key={`a-${i}`} className="t-news-item">
                  <strong>{h.ticker}</strong> ${h.price.toFixed(2)} ({h.pctChange >= 0 ? '+' : ''}{h.pctChange.toFixed(2)}%) — {h.shares} shares worth ${h.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>,
                <span key={`b-${i}`} className="t-news-item">
                  <strong>{h.ticker}</strong> P&L: {h.totalGain >= 0 ? '+' : ''}${h.totalGain.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({h.costBasis > 0 ? ((h.totalGain / h.costBasis) * 100).toFixed(1) : '0'}%)
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

function RiskMetric({ label, value, sub, positive }) {
  const colorClass = positive === true ? 't-green' : positive === false ? 't-red' : '';
  return (
    <div className="t-risk-metric">
      <div className="t-risk-metric-label">{label}</div>
      <div className={`t-risk-metric-value ${colorClass}`}>{value}</div>
      <div className="t-risk-metric-sub">{sub}</div>
    </div>
  );
}

function CorrelationRow({ ticker, row }) {
  return (
    <>
      <div className="t-heatmap-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ticker}</div>
      {row.map((val, ci) => (
        <div key={ci} className="t-heatmap-cell" style={{ background: corrColor(val) }}>
          {val.toFixed(2)}
        </div>
      ))}
    </>
  );
}
