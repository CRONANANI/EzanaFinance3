'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { PinnableCard } from '@/components/ui/PinnableCard';
import { ProfileCarousel } from '@/components/ui/profile-carousel';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/components/learning/learning-opportunities.css';
import '../../../../app-legacy/pages/home-dashboard.css';
import './for-the-quants-strategies.css';

/* ── Strategy data ── */
const ACTIVE_STRATEGIES = [
  {
    id: 'apple',
    name: 'Apple Inc.',
    ticker: 'AAPL',
    icon: '🍎',
    liveSince: 'Feb 12th',
    status: 'LIVE',
    capital: 7579.52,
    gains: 756.34,
    price: 1134.86,
    priceChange: 3.36,
    color: '#10b981',
    metrics: { capitalInvested: 15000, netProfit: 12000, annualReturn: 50.37, monthlyReturn: 3.45, maxDrawdown: 12.07, tradefyScore: 4.5 },
  },
  {
    id: 'eurusd',
    name: 'EUR/USD',
    ticker: 'EUR/USD',
    icon: '💱',
    liveSince: 'Feb 13th',
    status: 'LIVE',
    capital: 8738.40,
    gains: 938.85,
    price: 1.0847,
    priceChange: 0.12,
    color: '#3b82f6',
    metrics: { capitalInvested: 12000, netProfit: 8500, annualReturn: 42.18, monthlyReturn: 2.89, maxDrawdown: 8.43, tradefyScore: 4.2 },
  },
  {
    id: 'google',
    name: 'Google',
    ticker: 'GOOG',
    icon: '🔍',
    liveSince: 'Feb 12th',
    status: 'LIVE',
    capital: 10297.87,
    gains: 1250.74,
    price: 178.42,
    priceChange: 2.14,
    color: '#fbbf24',
    metrics: { capitalInvested: 18000, netProfit: 14200, annualReturn: 62.31, monthlyReturn: 4.12, maxDrawdown: 9.87, tradefyScore: 4.7 },
  },
];

const DRAFT_STRATEGIES = [
  {
    id: 'tesla',
    name: 'Tesla Inc.',
    ticker: 'TSLA',
    icon: '⚡',
    liveSince: 'Feb 12th',
    status: 'DRAFT',
    capital: 9425.12,
    tradefyScore: 4.5,
    price: 248.50,
    priceChange: -1.24,
    color: '#ef4444',
    metrics: { capitalInvested: 9425, netProfit: 0, annualReturn: 0, monthlyReturn: 0, maxDrawdown: 0, tradefyScore: 4.5 },
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    ticker: 'MSFT',
    icon: '🪟',
    liveSince: 'Feb 12th',
    status: 'DRAFT',
    capital: 3975.45,
    tradefyScore: 4.5,
    price: 428.75,
    priceChange: 0.78,
    color: '#a78bfa',
    metrics: { capitalInvested: 3975, netProfit: 0, annualReturn: 0, monthlyReturn: 0, maxDrawdown: 0, tradefyScore: 4.5 },
  },
];

const ALLOCATION_DATA = [
  { label: 'Google', pct: 15, color: '#fbbf24' },
  { label: 'Apple Inc', pct: 20, color: '#10b981' },
  { label: 'Tesla', pct: 24, color: '#ef4444' },
  { label: 'S&P 500', pct: 20, color: '#3b82f6' },
  { label: 'Others', pct: 12, color: '#6b7280' },
];

/* ── Chart helpers ── */
function generateChartPoints(seed, count, min, max, trend = 0.5) {
  const pts = [];
  let v = min + (max - min) * 0.3;
  for (let i = 0; i < count; i++) {
    v += Math.sin(i * 0.4 + seed) * ((max - min) * 0.06) + trend * ((max - min) * 0.008);
    v += (Math.random() - 0.45) * ((max - min) * 0.03);
    v = Math.max(min, Math.min(max, v));
    pts.push(v);
  }
  return pts;
}

function pointsToPath(pts, width, height, padTop = 10, padBottom = 10) {
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const step = width / (pts.length - 1);
  return pts.map((p, i) => {
    const x = i * step;
    const y = padTop + (height - padTop - padBottom) * (1 - (p - min) / range);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function pointsToArea(pts, width, height, padTop = 10, padBottom = 10) {
  const line = pointsToPath(pts, width, height, padTop, padBottom);
  return `${line} L${width},${height} L0,${height} Z`;
}

/* ── Mini Spark Chart ── */
function SparkChart({ seed = 1, color = '#10b981', width = 200, height = 80 }) {
  const pts = useMemo(() => generateChartPoints(seed, 30, 100, 600, 0.8), [seed]);
  const line = pointsToPath(pts, width, height);
  const area = pointsToArea(pts, width, height);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={`sg-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${seed})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

/* ── Donut Chart ── */
function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.pct, 0);
  let cumulative = 0;
  const r = 52, cx = 64, cy = 64, circ = 2 * Math.PI * r;
  return (
    <div className="ftq-donut-wrap">
      <svg viewBox="0 0 128 128" className="ftq-donut-svg">
        {data.map((d, i) => {
          const offset = (cumulative / total) * circ;
          const length = (d.pct / total) * circ;
          cumulative += d.pct;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color}
              strokeWidth="14" strokeDasharray={`${length} ${circ - length}`}
              strokeDashoffset={-offset} transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dasharray 0.5s' }}
            />
          );
        })}
      </svg>
      <div className="ftq-donut-legend">
        {data.map((d, i) => (
          <div key={i} className="ftq-donut-item">
            <span className="ftq-donut-color" style={{ background: d.color }} />
            <span className="ftq-donut-label">{d.label}</span>
            <span className="ftq-donut-pct">{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Performance Chart (for strategy detail) ── */
function PerformanceChart({ strategy }) {
  const W = 800, H = 340;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'];
  const yLabels = [200, 400, 600, 800, 1000];

  const seed = strategy.id.charCodeAt(0);
  const strategyPts = useMemo(() => generateChartPoints(seed, 60, 250, 950, 1.2), [seed]);
  const benchmarkPts = useMemo(() => generateChartPoints(seed + 50, 60, 200, 500, 0.3), [seed]);

  const strategyLine = pointsToPath(strategyPts, W, H - 60, 20, 40);
  const strategyArea = pointsToArea(strategyPts, W, H - 60, 20, 40);
  const benchmarkLine = pointsToPath(benchmarkPts, W, H - 60, 20, 40);

  const [hoverIdx, setHoverIdx] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relX = x / rect.width;
    const idx = Math.min(Math.floor(relX * strategyPts.length), strategyPts.length - 1);
    setHoverIdx(idx);
    setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="ftq-perf-chart">
      <h3 className="ftq-perf-title">Strategy Performance</h3>
      <div className="ftq-perf-chart-wrap"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="ftq-perf-svg">
          <defs>
            <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {yLabels.map(v => {
            const y = 20 + (H - 60) * (1 - (v - 200) / 800);
            return <line key={v} x1="0" y1={y} x2={W} y2={y} stroke="rgba(16,185,129,0.08)" strokeWidth="1" />;
          })}
          <path d={strategyArea} fill="url(#perfGrad)" />
          <path d={strategyLine} fill="none" stroke="#10b981" strokeWidth="2.5" />
          <path d={benchmarkLine} fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="4 3" />
          {hoverIdx !== null && (
            <>
              <line
                x1={(hoverIdx / (strategyPts.length - 1)) * W}
                y1="0"
                x2={(hoverIdx / (strategyPts.length - 1)) * W}
                y2={H - 40}
                stroke="rgba(16,185,129,0.4)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <circle
                cx={(hoverIdx / (strategyPts.length - 1)) * W}
                cy={20 + (H - 60) * (1 - (strategyPts[hoverIdx] - 200) / 800)}
                r="5" fill="#10b981" stroke="#0d1117" strokeWidth="2"
              />
              <circle
                cx={(hoverIdx / (strategyPts.length - 1)) * W}
                cy={20 + (H - 60) * (1 - (benchmarkPts[hoverIdx] - 200) / 800)}
                r="5" fill="#f97316" stroke="#0d1117" strokeWidth="2"
              />
            </>
          )}
        </svg>
        <div className="ftq-perf-y-axis">
          {yLabels.reverse().map(v => (
            <span key={v}>${v.toLocaleString()}</span>
          ))}
        </div>
        <div className="ftq-perf-x-axis">
          {days.map((d, i) => <span key={i}>{d}</span>)}
        </div>
        {hoverIdx !== null && (
          <div className="ftq-perf-tooltip" style={{ left: Math.min(hoverPos.x, 600), top: Math.max(hoverPos.y - 90, 10) }}>
            <div className="ftq-tooltip-row">
              <span className="ftq-tooltip-dot green" />
              <span>${strategyPts[hoverIdx].toFixed(2)}</span>
            </div>
            <div className="ftq-tooltip-row">
              <span className="ftq-tooltip-dot orange" />
              <span>${benchmarkPts[hoverIdx].toFixed(2)}</span>
            </div>
            <div className="ftq-tooltip-date">
              {days[Math.floor((hoverIdx / strategyPts.length) * 7)]}, {Math.floor(Math.random() * 28 + 1)} Mar 2023
            </div>
          </div>
        )}
      </div>
      <div className="ftq-benchmark-tag">
        <span className="ftq-benchmark-icon">S&P</span>
        <span className="ftq-benchmark-dot" />
        <span>S&P 500</span>
        <button type="button" className="ftq-benchmark-remove">&times;</button>
      </div>
    </div>
  );
}

/* ── Strategy Detail View ── */
function StrategyDetail({ strategy, onBack }) {
  const isLive = strategy.status === 'LIVE';
  const m = strategy.metrics;
  return (
    <div className="ftq-detail">
      <div className="ftq-detail-header">
        <div className="ftq-detail-header-left">
          <button type="button" className="ftq-back-btn" onClick={onBack}>
            <i className="bi bi-arrow-left" />
          </button>
          <div>
            <div className="ftq-detail-title-row">
              <h2>New Generated Strategy</h2>
              <button type="button" className="ftq-rename-btn">
                <i className="bi bi-pencil" /> Rename
              </button>
            </div>
            <div className="ftq-detail-subtitle">
              {strategy.ticker}, Created 15 mins ago
              <span className={`ftq-badge ${strategy.status.toLowerCase()}`}>{strategy.status}</span>
            </div>
          </div>
        </div>
        <div className="ftq-detail-header-right">
          <button type="button" className="ftq-data-btn">
            Full Data <i className="bi bi-chevron-down" />
          </button>
          <div className="ftq-detail-stock">
            <div className="ftq-detail-stock-icon">{strategy.icon}</div>
            <div>
              <div className="ftq-detail-stock-name">{strategy.name}</div>
              <div className="ftq-detail-stock-ticker">{strategy.ticker}</div>
            </div>
          </div>
          <div className="ftq-detail-price-block">
            <span className="ftq-detail-price-label">Price</span>
            <span className="ftq-detail-price">${strategy.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <span className={`ftq-price-change-badge ${strategy.priceChange >= 0 ? 'positive' : 'negative'}`}>
            {strategy.priceChange >= 0 ? '+' : ''}{strategy.priceChange.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="ftq-metrics-row">
        <div className="ftq-metric-card">
          <div className="ftq-metric-value">$ {m.capitalInvested.toLocaleString()}</div>
          <div className="ftq-metric-label"><span className="ftq-metric-dot green" /> Capital</div>
        </div>
        <div className="ftq-metric-card">
          <div className="ftq-metric-value">$ {m.netProfit.toLocaleString()}</div>
          <div className="ftq-metric-label"><span className="ftq-metric-dot green" /> Net Profit</div>
        </div>
        <div className="ftq-metric-card">
          <div className="ftq-metric-value">{m.annualReturn.toFixed(2)}%</div>
          <div className="ftq-metric-label"><span className="ftq-metric-dot orange" /> Annual Return</div>
        </div>
        <div className="ftq-metric-card">
          <div className="ftq-metric-value">{m.monthlyReturn.toFixed(2)}%</div>
          <div className="ftq-metric-label"><span className="ftq-metric-dot orange" /> Monthly Return</div>
        </div>
        <div className="ftq-metric-card">
          <div className="ftq-metric-value">{m.maxDrawdown.toFixed(2)}%</div>
          <div className="ftq-metric-label"><span className="ftq-metric-dot orange" /> Max Drawdown</div>
        </div>
        <div className="ftq-metric-card">
          <div className="ftq-metric-value">
            <i className="bi bi-star-fill" style={{ color: '#fbbf24', marginRight: 6, fontSize: '0.9em' }} />
            {m.tradefyScore}
          </div>
          <div className="ftq-metric-label">
            <span className="ftq-metric-dot orange" /> Tradefy Score
          </div>
          <div className="ftq-score-bar">
            <div className="ftq-score-bar-fill" style={{ width: `${(m.tradefyScore / 5) * 100}%` }} />
          </div>
        </div>
      </div>

      <PerformanceChart strategy={strategy} />
    </div>
  );
}

/* ── Main Page ── */
export default function ForTheQuantsPage() {
  const [selectedStrategy, setSelectedStrategy] = useState(null);

  const totalCapital = ACTIVE_STRATEGIES.reduce((s, st) => s + st.capital, 0) +
    DRAFT_STRATEGIES.reduce((s, st) => s + st.capital, 0);
  const totalGains = ACTIVE_STRATEGIES.reduce((s, st) => s + (st.gains || 0), 0);

  if (selectedStrategy) {
    const all = [...ACTIVE_STRATEGIES, ...DRAFT_STRATEGIES];
    const strat = all.find(s => s.id === selectedStrategy);
    if (strat) {
      return (
        <div className="ftq-page">
          <StrategyDetail strategy={strat} onBack={() => setSelectedStrategy(null)} />
        </div>
      );
    }
  }

  return (
    <div className="ftq-page">
      {/* ── Top Section: 3 cards ── */}
      <div className="ftq-top-grid">
        <div className="ftq-top-card ftq-trading-card">
          <div className="ftq-trading-chart-bg">
            <SparkChart seed={42} color="#10b981" width={400} height={160} />
          </div>
          <div className="ftq-trading-content">
            <div className="ftq-trading-label">
              <i className="bi bi-graph-up-arrow" style={{ marginRight: 6 }} />
              Currently Trading
            </div>
            <div className="ftq-trading-value">
              ${totalCapital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="ftq-trading-stats">
              <div>
                <span className="ftq-trading-stat-label">Live Strategies</span>
                <span className="ftq-trading-stat-value">{ACTIVE_STRATEGIES.length}</span>
              </div>
              <div>
                <span className="ftq-trading-stat-label">Assets</span>
                <span className="ftq-trading-stat-value">{ACTIVE_STRATEGIES.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="ftq-top-card ftq-balance-card">
          <div className="ftq-balance-header">
            <span className="ftq-balance-name">Balance</span>
            <span className="ftq-balance-gain">+$250.22 <span className="ftq-balance-period">/pm</span></span>
          </div>
          <div className="ftq-balance-chart">
            <SparkChart seed={77} color="#10b981" width={300} height={100} />
          </div>
          <div className="ftq-balance-x-axis">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </div>

        <div className="ftq-top-card ftq-allocation-card">
          <DonutChart data={ALLOCATION_DATA} />
        </div>
      </div>

      {/* ── Active Strategies ── */}
      <div className="ftq-section">
        <h3 className="ftq-section-title">ACTIVE STRATEGIES</h3>
        <div className="ftq-strategies-grid">
          {ACTIVE_STRATEGIES.map(strat => (
            <button
              key={strat.id}
              type="button"
              className="ftq-strategy-card live"
              onClick={() => setSelectedStrategy(strat.id)}
            >
              <div className="ftq-strat-header">
                <div className="ftq-strat-icon">{strat.icon}</div>
                <div className="ftq-strat-info">
                  <span className="ftq-strat-name">{strat.name}</span>
                  <span className="ftq-strat-meta">
                    {strat.ticker}, Live since {strat.liveSince}
                    <span className="ftq-badge live">LIVE</span>
                  </span>
                </div>
              </div>
              <div className="ftq-strat-numbers">
                <div>
                  <span className="ftq-strat-num-label">Capital</span>
                  <span className="ftq-strat-num-value">${strat.capital.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="ftq-strat-num-label">Gains</span>
                  <span className="ftq-strat-num-value positive">${strat.gains.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </button>
          ))}
          <button type="button" className="ftq-strategy-card ftq-create-card">
            <div className="ftq-create-icon">
              <svg viewBox="0 0 48 48" width="48" height="48">
                <polygon points="24,4 44,24 24,44 4,24" fill="none" stroke="#10b981" strokeWidth="2" />
                <polygon points="24,10 38,24 24,38 10,24" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="1.5" />
                <line x1="24" y1="18" x2="24" y2="30" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                <line x1="18" y1="24" x2="30" y2="24" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="ftq-create-label">Create New Strategy</span>
          </button>
        </div>
      </div>

      {/* ── Draft Strategies ── */}
      <div className="ftq-section">
        <h3 className="ftq-section-title">DRAFT STRATEGIES</h3>
        <div className="ftq-strategies-grid">
          {DRAFT_STRATEGIES.map(strat => (
            <button
              key={strat.id}
              type="button"
              className="ftq-strategy-card draft"
              onClick={() => setSelectedStrategy(strat.id)}
            >
              <div className="ftq-strat-header">
                <div className="ftq-strat-icon">{strat.icon}</div>
                <div className="ftq-strat-info">
                  <span className="ftq-strat-name">{strat.name}</span>
                  <span className="ftq-strat-meta">
                    {strat.ticker}, live since {strat.liveSince}
                    <span className="ftq-badge draft">DRAFT</span>
                  </span>
                </div>
              </div>
              <div className="ftq-strat-numbers">
                <div>
                  <span className="ftq-strat-num-label">Capital</span>
                  <span className="ftq-strat-num-value">${strat.capital.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="ftq-strat-num-label">Tradefy Score</span>
                  <span className="ftq-strat-num-value">
                    <i className="bi bi-star-fill" style={{ color: '#fbbf24', marginRight: 4 }} />
                    {strat.tradefyScore}
                  </span>
                </div>
              </div>
              <div className="ftq-strat-broker-link">Connect a broker to go live &rarr;</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Learning ── */}
      <section className="learning-opportunities">
        <div className="learning-header">
          <div className="learning-title-area">
            <div className="learning-icon"><i className="bi bi-mortarboard-fill" /></div>
            <div className="learning-title-text">
              <h3>Quantitative Finance Courses</h3>
              <p>Master mathematical models and algorithmic trading strategies</p>
            </div>
          </div>
          <Link href="/learning-center" className="view-all-btn">View All Courses</Link>
        </div>
        <div className="courses-grid">
          <div className="course-card">
            <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 10 hours</span></div>
            <h4 className="course-title">Python for Financial Analysis</h4>
            <p className="course-description">Learn to use Python, pandas, and NumPy for quantitative finance and data analysis.</p>
            <div className="course-meta"><div className="meta-item"><i className="bi bi-book" /> 32 lessons</div><div className="meta-item"><i className="bi bi-people" /> 5,234 enrolled</div></div>
            <div className="course-footer"><span className="course-level intermediate">Intermediate</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
          <div className="course-card">
            <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 8 hours</span></div>
            <h4 className="course-title">Statistical Arbitrage Strategies</h4>
            <p className="course-description">Master pairs trading, mean reversion, and cointegration-based strategies.</p>
            <div className="course-meta"><div className="meta-item"><i className="bi bi-book" /> 28 lessons</div><div className="meta-item"><i className="bi bi-people" /> 2,847 enrolled</div></div>
            <div className="course-footer"><span className="course-level advanced">Advanced</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
          <div className="course-card">
            <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 12 hours</span></div>
            <h4 className="course-title">Machine Learning for Trading</h4>
            <p className="course-description">Build predictive models using regression, neural networks, and ensemble methods.</p>
            <div className="course-meta"><div className="meta-item"><i className="bi bi-book" /> 40 lessons</div><div className="meta-item"><i className="bi bi-people" /> 3,912 enrolled</div></div>
            <div className="course-footer"><span className="course-level advanced">Advanced</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
          <div className="course-card">
            <div className="course-header"><span className="course-type">Skill</span><span className="course-duration"><i className="bi bi-clock" /> 6 hours</span></div>
            <h4 className="course-title">Options Pricing Models</h4>
            <p className="course-description">Deep dive into Black-Scholes, binomial trees, and Monte Carlo simulations.</p>
            <div className="course-meta"><div className="meta-item"><i className="bi bi-book" /> 22 lessons</div><div className="meta-item"><i className="bi bi-people" /> 1,847 enrolled</div></div>
            <div className="course-footer"><span className="course-level advanced">Advanced</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
        </div>
      </section>
    </div>
  );
}
