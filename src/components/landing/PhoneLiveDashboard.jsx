'use client';

import { useEffect, useState, useMemo } from 'react';

const HOLDINGS = [
  { ticker: 'AAPL', pctBase: 14.43, valueBase: 572.2, color: '#10b981' },
  { ticker: 'TSLA', pctBase: 13.24, valueBase: 566.2, color: '#3b82f6' },
  { ticker: 'AVGO', pctBase: 4.11, valueBase: 520.6, color: '#10b981' },
  { ticker: 'NVDA', pctBase: 2.04, valueBase: 510.2, color: '#a855f7' },
  { ticker: 'MSFT', pctBase: -2.3, valueBase: 488.5, color: '#ef4444' },
  { ticker: 'LLY', pctBase: 21.85, valueBase: 243.7, color: '#10b981' },
];

const PORTFOLIO_BASE = 4725307.37;

function fmtMoney(n) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PhoneLiveDashboard() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const portfolio = useMemo(() => {
    const variance = Math.sin(tick * 1.3) * 0.0005 + Math.cos(tick * 0.7) * 0.0003;
    return PORTFOLIO_BASE * (1 + variance);
  }, [tick]);

  const dayChange = useMemo(() => {
    const base = 225307.37;
    return base * (1 + Math.sin(tick * 0.9) * 0.02);
  }, [tick]);

  const dayChangePct = ((dayChange / (PORTFOLIO_BASE - dayChange)) * 100).toFixed(2);

  const holdings = useMemo(
    () =>
      HOLDINGS.map((h, i) => ({
        ...h,
        pct: h.pctBase + Math.sin((tick + i) * 1.7) * 0.4,
        value: h.valueBase * (1 + Math.sin((tick + i) * 1.1) * 0.005),
      })),
    [tick],
  );

  return (
    <div className="phone-screen">
      <div className="phone-topbar">
        <div className="phone-logo" />
        <div className="phone-topbar-icons">
          <div className="phone-topbar-bell" />
          <div className="phone-topbar-menu" />
        </div>
      </div>

      <div className="phone-card">
        <div className="phone-card-header">
          <span className="phone-card-title">Portfolio Snapshot</span>
          <span className="phone-card-arrow">↗</span>
        </div>
        <div className="phone-card-subtitle">Mock Portfolio</div>
        <div className="phone-portfolio-value">${fmtMoney(portfolio)}</div>
        <div className="phone-portfolio-change phone-portfolio-change--up">
          +{dayChangePct}% (+${fmtMoney(dayChange)})
        </div>

        <svg className="phone-sparkline" viewBox="0 0 320 80" preserveAspectRatio="none">
          <defs>
            <linearGradient id="phoneSparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(16,185,129,0.3)" />
              <stop offset="100%" stopColor="rgba(16,185,129,0)" />
            </linearGradient>
          </defs>
          <path
            d="M 0 60 Q 40 55, 80 50 T 160 38 T 240 28 T 320 24 L 320 80 L 0 80 Z"
            fill="url(#phoneSparkGrad)"
          />
          <path
            d="M 0 60 Q 40 55, 80 50 T 160 38 T 240 28 T 320 24"
            stroke="#10b981"
            strokeWidth="2"
            fill="none"
          />
        </svg>

        <div className="phone-sparkline-axis">
          <span>Jan</span>
          <span>Feb</span>
          <span>Mar</span>
          <span>Apr</span>
          <span>May</span>
        </div>
      </div>

      <div className="phone-card phone-card--holdings">
        <div className="phone-card-header">
          <span className="phone-card-title-small">TOP HOLDINGS</span>
        </div>
        {holdings.map((h) => (
          <div key={h.ticker} className="phone-holding-row">
            <span className="phone-holding-dot" style={{ background: h.color }} />
            <span className="phone-holding-ticker">{h.ticker}</span>
            <span
              className={`phone-holding-pct ${h.pct >= 0 ? 'phone-holding-pct--up' : 'phone-holding-pct--down'}`}
            >
              {h.pct >= 0 ? '+' : ''}
              {h.pct.toFixed(2)}%
            </span>
            <span className="phone-holding-value">${h.value.toFixed(1)}K</span>
          </div>
        ))}
      </div>

      <div className="phone-bottomnav">
        <div className="phone-bottomnav-item">Home</div>
        <div className="phone-bottomnav-item">Dash</div>
        <div className="phone-bottomnav-item phone-bottomnav-item--active">Trade</div>
        <div className="phone-bottomnav-item">Community</div>
        <div className="phone-bottomnav-item">Profile</div>
      </div>
    </div>
  );
}
