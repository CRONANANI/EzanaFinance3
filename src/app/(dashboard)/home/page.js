'use client';

import { useState, useEffect, useMemo } from 'react';
import './terminal.css';

const HOLDINGS = [
  { ticker: 'AAPL', shares: 45, price: 189.84, change: 2.31, pctChange: 1.23 },
  { ticker: 'MSFT', shares: 30, price: 415.20, change: 3.15, pctChange: 0.76 },
  { ticker: 'NVDA', shares: 25, price: 485.60, change: 12.40, pctChange: 2.62 },
  { ticker: 'GOOGL', shares: 20, price: 174.13, change: -1.24, pctChange: -0.71 },
  { ticker: 'AMZN', shares: 35, price: 203.95, change: 4.85, pctChange: 2.44 },
  { ticker: 'META', shares: 15, price: 505.07, change: -3.42, pctChange: -0.67 },
  { ticker: 'TSLA', shares: 40, price: 248.50, change: -8.20, pctChange: -3.20 },
  { ticker: 'JPM', shares: 50, price: 198.40, change: 2.95, pctChange: 1.51 },
  { ticker: 'V', shares: 20, price: 287.32, change: 1.67, pctChange: 0.58 },
  { ticker: 'UNH', shares: 10, price: 527.18, change: -4.55, pctChange: -0.86 },
  { ticker: 'HD', shares: 18, price: 362.47, change: 5.12, pctChange: 1.43 },
  { ticker: 'XOM', shares: 60, price: 108.20, change: -1.32, pctChange: -1.20 },
  { ticker: 'LLY', shares: 8, price: 782.35, change: 11.20, pctChange: 1.45 },
  { ticker: 'PG', shares: 25, price: 168.90, change: 0.85, pctChange: 0.51 },
  { ticker: 'COST', shares: 12, price: 891.45, change: 7.30, pctChange: 0.83 },
];

const INDICES = [
  { name: 'S&P 500', value: '5,234.18', change: '+0.86%', up: true },
  { name: 'NASDAQ', value: '16,428.82', change: '+1.24%', up: true },
  { name: 'DOW', value: '39,512.84', change: '+0.32%', up: true },
  { name: 'VIX', value: '14.32', change: '-3.2%', up: false },
  { name: '10Y', value: '4.28%', change: '+0.02', up: true },
  { name: 'BTC', value: '67,842', change: '+2.1%', up: true },
  { name: 'GOLD', value: '2,342', change: '+0.4%', up: true },
  { name: 'OIL', value: '78.24', change: '-0.8%', up: false },
  { name: 'EUR/USD', value: '1.0842', change: '-0.12%', up: false },
];

const RISK_METRICS = [
  { label: 'Beta', value: '1.12', sub: 'vs S&P 500' },
  { label: 'Value at Risk', value: '3.1%', sub: '95% confidence' },
  { label: 'Sharpe Ratio', value: '0.78', sub: 'Risk-adjusted' },
  { label: 'Max Drawdown', value: '-12.4%', sub: 'Last 12mo' },
  { label: 'Sortino', value: '1.42', sub: 'Downside risk' },
  { label: 'Correlation', value: '0.87', sub: 'vs benchmark' },
];

const SUGGESTIONS = [
  { icon: 'warn', title: 'High U.S. Equity Concentration', desc: 'SOXX+NVDA+MSFT exceed half the portfolio in U.S. equities. Consider international diversification.' },
  { icon: 'info', title: 'Rebalance B-01 Recommended', desc: 'Deviation of 8.5% from target weights detected. Consider rebalancing to reduce tracking error.' },
  { icon: 'danger', title: 'Emerging Market Overlap', desc: 'VWO and IEMG hold ~60% identical positions. Consolidate to reduce redundant exposure.' },
  { icon: 'ok', title: 'Fixed Income Duration', desc: 'Portfolio duration at 4.2yr within target band. No action needed.' },
  { icon: 'warn', title: 'Sector Tilt Alert', desc: 'Technology allocation at 38.2% — 12% above benchmark weight. Monitor for mean reversion risk.' },
];

const EARNINGS = [
  { ticker: 'AAPL', date: 'Apr 24', time: 'AMC', est: '$1.50' },
  { ticker: 'MSFT', date: 'Apr 25', time: 'AMC', est: '$2.82' },
  { ticker: 'GOOGL', date: 'Apr 25', time: 'AMC', est: '$1.89' },
  { ticker: 'META', date: 'Apr 30', time: 'AMC', est: '$4.32' },
  { ticker: 'AMZN', date: 'May 1', time: 'AMC', est: '$0.83' },
  { ticker: 'TSLA', date: 'Apr 23', time: 'AMC', est: '$0.49' },
  { ticker: 'NVDA', date: 'May 22', time: 'AMC', est: '$5.59' },
  { ticker: 'LLY', date: 'May 1', time: 'BMO', est: '$2.48' },
];

const TOP_MOVERS = [
  { ticker: 'SMCI', price: '912.80', change: '+14.2%', up: true },
  { ticker: 'NVDA', price: '485.60', change: '+2.6%', up: true },
  { ticker: 'PLTR', price: '24.18', change: '+5.8%', up: true },
  { ticker: 'ARM', price: '132.50', change: '+4.1%', up: true },
  { ticker: 'RIVN', price: '10.24', change: '-8.4%', up: false },
  { ticker: 'NKE', price: '94.30', change: '-3.2%', up: false },
];

const NEWS_ITEMS = [
  { tag: '★', text: 'Fed Chair Powell signals rate cuts may begin in Q3 as inflation cools toward 2% target' },
  { tag: 'NVDA', text: 'NVIDIA announces next-gen Blackwell Ultra chips — expected 4x inference throughput' },
  { tag: 'TSLA', text: 'Tesla Q1 deliveries miss estimates at 386K units, shares drop 3.2% premarket' },
  { tag: 'AAPL', text: 'Apple reportedly in talks with OpenAI for iOS 19 AI features partnership' },
  { tag: '★', text: 'U.S. 10-Year Treasury yield rises to 4.28% amid stronger-than-expected jobs data' },
  { tag: 'JPM', text: 'JPMorgan raises S&P 500 year-end target to 5,600 citing AI-driven earnings growth' },
  { tag: '★', text: 'China PMI expands to 51.2 in March, signaling manufacturing recovery' },
  { tag: 'BTC', text: 'Bitcoin halving complete — hashrate drops 15%, miners consolidate operations' },
];

const ALLOCATION_DATA = [
  { label: 'Equity', pct: 62, color: '#10b981' },
  { label: 'Fixed Income', pct: 18, color: '#3b82f6' },
  { label: 'Alternatives', pct: 8, color: '#a78bfa' },
  { label: 'Cash', pct: 7, color: '#fbbf24' },
  { label: 'Crypto', pct: 5, color: '#22d3ee' },
];

const CORR_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN'];
const CORR_DATA = [
  [1.0, 0.82, 0.71, 0.78, 0.65],
  [0.82, 1.0, 0.76, 0.84, 0.72],
  [0.71, 0.76, 1.0, 0.68, 0.61],
  [0.78, 0.84, 0.68, 1.0, 0.77],
  [0.65, 0.72, 0.61, 0.77, 1.0],
];

function corrColor(v) {
  if (v >= 0.9) return 'rgba(16, 185, 129, 0.9)';
  if (v >= 0.8) return 'rgba(16, 185, 129, 0.6)';
  if (v >= 0.7) return 'rgba(16, 185, 129, 0.35)';
  if (v >= 0.6) return 'rgba(59, 130, 246, 0.4)';
  return 'rgba(59, 130, 246, 0.2)';
}

function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.pct, 0);
  let cumulative = 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg viewBox="0 0 120 120" className="t-donut-svg">
      {data.map((d, i) => {
        const offset = (cumulative / total) * circumference;
        const length = (d.pct / total) * circumference;
        cumulative += d.pct;
        return (
          <circle
            key={i}
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={d.color}
            strokeWidth="16"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 60 60)"
          />
        );
      })}
      <text x="60" y="56" textAnchor="middle" fill="#f0f6fc" fontSize="14" fontWeight="700" fontFamily="inherit">
        {data[0].pct}%
      </text>
      <text x="60" y="70" textAnchor="middle" fill="#8b949e" fontSize="8" fontFamily="inherit">
        EQUITY
      </text>
    </svg>
  );
}

function MiniChart({ color = '#10b981', points }) {
  const h = 100;
  const w = 280;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);

  const d = points.map((p, i) => {
    const x = i * step;
    const y = h - ((p - min) / range) * (h - 10) - 5;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const gradientD = `${d} L ${w} ${h} L 0 ${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={gradientD} fill="url(#chartGrad)" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

export default function HomeTerminalPage() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const portfolioTotal = useMemo(() =>
    HOLDINGS.reduce((s, h) => s + h.price * h.shares, 0), []
  );

  const portfolioChange = useMemo(() =>
    HOLDINGS.reduce((s, h) => s + h.change * h.shares, 0), []
  );

  const portfolioChartPoints = useMemo(() => {
    const base = 58000;
    const pts = [];
    for (let i = 0; i < 30; i++) {
      pts.push(base + Math.sin(i * 0.3) * 2000 + i * 120 + (Math.random() - 0.5) * 800);
    }
    return pts;
  }, []);

  const spChartPoints = useMemo(() => {
    const base = 5000;
    const pts = [];
    for (let i = 0; i < 30; i++) {
      pts.push(base + Math.sin(i * 0.25) * 100 + i * 6 + (Math.random() - 0.5) * 40);
    }
    return pts;
  }, []);

  const isMarketOpen = useMemo(() => {
    const now = new Date();
    const h = now.getUTCHours();
    const m = now.getUTCMinutes();
    const mins = h * 60 + m;
    return now.getUTCDay() >= 1 && now.getUTCDay() <= 5 && mins >= 14 * 60 + 30 && mins < 21 * 60;
  }, []);

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
          <span className="t-pv-amount">${portfolioTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className={`t-pv-change ${portfolioChange >= 0 ? 't-green' : 't-red'}`}>
            {portfolioChange >= 0 ? '+' : ''}{portfolioChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="t-indices-scroll">
          {INDICES.map((idx) => (
            <div key={idx.name} className="t-index-item">
              <span className="t-index-name">{idx.name}</span>
              <span className="t-index-val">{idx.value}</span>
              <span className={idx.up ? 't-green' : 't-red'} style={{ fontSize: 10, fontWeight: 600 }}>{idx.change}</span>
            </div>
          ))}
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
            <span className="t-panel-badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>{HOLDINGS.length} positions</span>
          </div>
          <div className="t-panel-body" style={{ padding: 0 }}>
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
                {HOLDINGS.map((h) => (
                  <tr key={h.ticker}>
                    <td>{h.ticker}</td>
                    <td>{h.price.toFixed(2)}</td>
                    <td className={h.change >= 0 ? 't-green' : 't-red'}>{h.change >= 0 ? '+' : ''}{h.change.toFixed(2)}</td>
                    <td className={h.pctChange >= 0 ? 't-green' : 't-red'}>{h.pctChange >= 0 ? '+' : ''}{h.pctChange.toFixed(2)}%</td>
                    <td className="t-dim">{h.shares}</td>
                    <td>${(h.price * h.shares).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CENTER-TOP: Portfolio Chart */}
        <div className="t-panel">
          <div className="t-panel-header">
            <span className="t-panel-title">Portfolio vs S&P 500</span>
            <span className="t-dim" style={{ fontSize: 10 }}>30D</span>
          </div>
          <div className="t-chart-legend">
            <div className="t-chart-legend-item">
              <div className="t-legend-line" style={{ background: '#10b981' }} />
              <span className="t-dim">Portfolio</span>
            </div>
            <div className="t-chart-legend-item">
              <div className="t-legend-line" style={{ background: '#3b82f6' }} />
              <span className="t-dim">S&P 500</span>
            </div>
          </div>
          <div className="t-chart-area">
            <MiniChart color="#10b981" points={portfolioChartPoints} />
          </div>
          <div className="t-perf-stats">
            <div className="t-perf-stat">
              <div className="t-perf-stat-label">Return (1Y)</div>
              <div className="t-perf-stat-value t-green">+24.5%</div>
            </div>
            <div className="t-perf-stat">
              <div className="t-perf-stat-label">Alpha</div>
              <div className="t-perf-stat-value t-green">+3.2%</div>
            </div>
            <div className="t-perf-stat">
              <div className="t-perf-stat-label">Volatility</div>
              <div className="t-perf-stat-value">18.4%</div>
            </div>
            <div className="t-perf-stat">
              <div className="t-perf-stat-label">Win Rate</div>
              <div className="t-perf-stat-value">62.8%</div>
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
              {RISK_METRICS.map((m) => (
                <div key={m.label} className="t-risk-metric">
                  <div className="t-risk-metric-label">{m.label}</div>
                  <div className="t-risk-metric-value">{m.value}</div>
                  <div className="t-risk-metric-sub">{m.sub}</div>
                </div>
              ))}
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

            {/* Top Movers section inside right column */}
            <div style={{ borderTop: '1px solid rgba(16,185,129,0.15)', marginTop: 4 }}>
              <div className="t-panel-header">
                <span className="t-panel-title">Top Movers Today</span>
              </div>
              {TOP_MOVERS.map((m) => (
                <div key={m.ticker} className="t-mover-row">
                  <span className="t-mover-ticker">{m.ticker}</span>
                  <span className="t-mover-price">{m.price}</span>
                  <span className={`t-mover-change ${m.up ? 't-green' : 't-red'}`}>{m.change}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM-LEFT (col 2): Asset Allocation + Correlation */}
        <div className="t-panel">
          <div className="t-panel-header">
            <span className="t-panel-title">Asset Allocation</span>
          </div>
          <div className="t-donut-wrap">
            <DonutChart data={ALLOCATION_DATA} />
            <div className="t-donut-legend">
              {ALLOCATION_DATA.map((d) => (
                <div key={d.label} className="t-donut-legend-item">
                  <div className="t-donut-color" style={{ background: d.color }} />
                  <span className="t-dim" style={{ minWidth: 72 }}>{d.label}</span>
                  <span className="t-donut-pct">{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
          {/* Earnings Calendar below allocation */}
          <div style={{ borderTop: '1px solid rgba(16,185,129,0.15)' }}>
            <div className="t-panel-header">
              <span className="t-panel-title">Earnings Calendar</span>
              <span className="t-panel-badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>UPCOMING</span>
            </div>
            <div style={{ maxHeight: 140, overflow: 'auto' }}>
              {EARNINGS.map((e) => (
                <div key={e.ticker + e.date} className="t-earnings-row">
                  <span className="t-earnings-ticker">{e.ticker}</span>
                  <span className="t-earnings-date">{e.date}</span>
                  <span className="t-dim" style={{ fontSize: 10 }}>{e.time}</span>
                  <span className="t-earnings-est">Est. {e.est}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM-CENTER: Correlation Matrix + Volatility */}
        <div className="t-panel">
          <div className="t-panel-header">
            <span className="t-panel-title">Correlation Matrix</span>
            <span className="t-panel-badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>HEAT MAP</span>
          </div>
          <div className="t-panel-body">
            <div className="t-heatmap-grid" style={{ gridTemplateColumns: `32px repeat(${CORR_TICKERS.length}, 1fr)` }}>
              <div />
              {CORR_TICKERS.map((t) => (
                <div key={`h-${t}`} className="t-heatmap-label">{t}</div>
              ))}
              {CORR_DATA.map((row, ri) => (
                <>
                  <div key={`l-${ri}`} className="t-heatmap-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{CORR_TICKERS[ri]}</div>
                  {row.map((val, ci) => (
                    <div
                      key={`${ri}-${ci}`}
                      className="t-heatmap-cell"
                      style={{ background: corrColor(val) }}
                    >
                      {val.toFixed(2)}
                    </div>
                  ))}
                </>
              ))}
            </div>
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
            {[...NEWS_ITEMS, ...NEWS_ITEMS].map((n, i) => (
              <span key={i} className="t-news-item">
                <strong>{n.tag}</strong> {n.text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
