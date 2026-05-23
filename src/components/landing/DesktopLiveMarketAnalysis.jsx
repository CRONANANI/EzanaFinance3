'use client';

import { useEffect, useState, useMemo } from 'react';

const MAP_DOTS = (() => {
  const dots = [];
  for (let i = 0; i < 60; i++) {
    dots.push({
      x: 15 + Math.random() * 18,
      y: 30 + Math.random() * 18,
      active: Math.random() > 0.85,
    });
  }
  for (let i = 0; i < 30; i++) {
    dots.push({
      x: 25 + Math.random() * 10,
      y: 55 + Math.random() * 20,
      active: Math.random() > 0.9,
    });
  }
  for (let i = 0; i < 80; i++) {
    dots.push({
      x: 45 + Math.random() * 15,
      y: 30 + Math.random() * 40,
      active: Math.random() > 0.85,
    });
  }
  for (let i = 0; i < 70; i++) {
    dots.push({
      x: 65 + Math.random() * 20,
      y: 35 + Math.random() * 20,
      active: Math.random() > 0.85,
    });
  }
  for (let i = 0; i < 15; i++) {
    dots.push({ x: 80 + Math.random() * 8, y: 70 + Math.random() * 10, active: false });
  }
  return dots;
})();

const NEWS_ITEMS_POOL = [
  {
    source: 'PROACTIVE INVESTORS',
    title: 'Ilika advances Goliath commercialisation strategy',
    severity: 'medium',
  },
  {
    source: 'SEEKING ALPHA',
    title: 'Global Ship Lease: Contract visibility, balance sheet strength',
    severity: 'medium',
  },
  {
    source: 'SEEKING ALPHA',
    title: 'Semis won the first AI trade. Software may win the next',
    severity: 'medium',
  },
  {
    source: 'CRYPTOPOLITAN',
    title: 'Overleveraged Bitcoin bulls get crushed in $576M wipeout',
    severity: 'medium',
  },
  {
    source: 'MARKETBEAT',
    title: 'Euronet Worldwide pitches payments platform shift',
    severity: 'medium',
  },
  {
    source: 'NEWSBTC',
    title: 'Hyperliquid is becoming a core infrastructure layer',
    severity: 'medium',
  },
  {
    source: 'AMBCRYPTO',
    title: 'Harvard dumps entire ETH ETF holdings in Q1',
    severity: 'medium',
  },
];

const TICKER_DATA = [
  { name: 'CHINA', val: '35.52', pct: '-1.03%', up: false },
  { name: 'INDIA', val: '48.39', pct: '+0.75%', up: true },
  { name: 'ASX', val: '28.78', pct: '-0.72%', up: false },
  { name: 'TSX', val: '58.51', pct: '-0.12%', up: false },
  { name: 'BRAZIL', val: '36.37', pct: '-1.73%', up: false },
  { name: 'KOSPI', val: '182.03', pct: '-2.36%', up: false },
  { name: 'GOLD', val: '413.82', pct: '-0.76%', up: false },
  { name: 'SILVER', val: '68.36', pct: '+1.57%', up: true },
  { name: 'OIL WTI', val: '140.92', pct: '-1.14%', up: false },
  { name: 'NAT GAS', val: '10.94', pct: '-3.44%', up: false },
  { name: 'COPPER', val: '85.35', pct: '+0.45%', up: true },
  { name: 'BTC', val: '75,393.67', pct: '+0%', up: true },
  { name: 'ETH', val: '2,061.98', pct: '+0%', up: true },
  { name: 'S&P 500', val: '745.64', pct: '+0.39%', up: true },
  { name: 'NASDAQ', val: '717.54', pct: '+0.42%', up: true },
];

export function DesktopLiveMarketAnalysis() {
  const [tickerOffset, setTickerOffset] = useState(0);
  const [activeDotIndex, setActiveDotIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTickerOffset((o) => (o + 1) % TICKER_DATA.length), 2500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setActiveDotIndex((i) => i + 1), 800);
    return () => clearInterval(id);
  }, []);

  const visibleNews = useMemo(() => NEWS_ITEMS_POOL.slice(0, 4), []);

  return (
    <div className="desktop-screen">
      <div className="desktop-ticker-bar">
        <span className="desktop-ticker-live">● LIVE</span>
        <div className="desktop-ticker-track">
          {TICKER_DATA.concat(TICKER_DATA)
            .slice(tickerOffset, tickerOffset + 10)
            .map((t, i) => (
              <span key={`${t.name}-${i}`} className="desktop-ticker-item">
                <span className="desktop-ticker-name">{t.name}</span>{' '}
                <span className="desktop-ticker-val">{t.val}</span>{' '}
                <span className={t.up ? 'desktop-ticker-pct--up' : 'desktop-ticker-pct--down'}>
                  {t.pct}
                </span>
              </span>
            ))}
        </div>
      </div>

      <div className="desktop-tabs">
        <span className="desktop-tab">The Map</span>
        <span className="desktop-tab">The Chain</span>
        <span className="desktop-tab desktop-tab--active">Empire Ranking & Analysis</span>
      </div>

      <div className="desktop-stage">
        <div className="desktop-map">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="desktop-map-svg">
            {MAP_DOTS.map((d, i) => {
              const isActive = d.active && (activeDotIndex + i) % 6 === 0;
              return (
                <circle
                  key={i}
                  cx={d.x}
                  cy={d.y}
                  r={isActive ? 0.7 : 0.3}
                  fill={isActive ? '#10b981' : 'rgba(139, 148, 158, 0.4)'}
                  className={isActive ? 'desktop-map-dot--pulse' : ''}
                />
              );
            })}
          </svg>
        </div>

        <div className="desktop-news-panel">
          <div className="desktop-news-header">
            <div className="desktop-news-icon">✈</div>
            <div>
              <div className="desktop-news-title">
                Intelligence, Surveillance &amp; Reconnaissance
              </div>
              <div className="desktop-news-sub">
                Live geolocated news from public sources · Polymarket signals
              </div>
            </div>
          </div>

          <div className="desktop-news-regions">
            {['United States', 'Europe', 'UK', 'Middle East', 'China', 'India', 'Africa'].map(
              (r) => (
                <span key={r} className="desktop-news-region-pill">
                  {r}
                </span>
              ),
            )}
          </div>

          <div className="desktop-news-list">
            {visibleNews.map((n, i) => (
              <div key={i} className="desktop-news-item">
                <div className="desktop-news-meta">
                  <span>GLOBAL</span>
                  <span>·</span>
                  <span>{n.source}</span>
                  <span>·</span>
                  <span>4H AGO</span>
                </div>
                <div className="desktop-news-headline">{n.title}</div>
                <span className="desktop-news-severity">{n.severity.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
