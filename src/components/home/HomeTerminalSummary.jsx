'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import '@/app/(dashboard)/home-dashboard/home-dashboard.css';
import './home-terminal-summary.css';
import { ThisWeekOnEzana } from './ThisWeekOnEzana';
import { OrgHomeCards } from '@/components/org/OrgHomeCards';
import { useOrg } from '@/contexts/OrgContext';
import { generateUserMockData } from '@/lib/userMockData';
import { HeroSparkline } from '@/components/dashboard/HeroSparkline';
import { HERO_DATA } from '@/lib/dashboard-hero-data';

const PORTFOLIO_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const CHART_PATHS_BY_DAY = [
  'M0,62 C96,58 192,52 288,46 C352,42 416,38 480,34',
  'M0,50 C80,54 160,42 240,36 C320,30 400,28 480,32',
  'M0,44 C100,48 200,40 300,34 C380,28 440,22 480,26',
  'M0,58 C120,52 220,44 320,38 C400,33 452,30 480,28',
  'M0,40 C90,46 180,38 270,32 C360,26 430,24 480,20',
];

function defaultNyDowIndex() {
  const wd = new Date().toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'short' });
  const key = wd.slice(0, 3);
  const map = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4 };
  return map[key] ?? 4;
}

function buildDailyPortfolioSnapshots({ portfolioTotal, portfolioChange, hasPortfolio, hero1d }) {
  const baseValue = hasPortfolio && portfolioTotal > 0 ? portfolioTotal : hero1d.value;
  const baseChange = hasPortfolio ? portfolioChange : hero1d.changeDollar;
  const mults = [0.988, 0.994, 1.002, 0.997, 1.008];
  const drift = [-0.004, 0.002, 0.003, -0.0015, 0.0025];

  return PORTFOLIO_DAY_LABELS.map((label, i) => {
    const v = baseValue * mults[i] + baseValue * drift[i] * 0.12;
    const ch = baseChange * (0.45 + i * 0.12) + baseValue * drift[i] * 0.06;
    const pct = v > 0 ? (ch / v) * 100 : 0;
    const trades = Math.max(0, Math.round((hero1d.companies ?? 8) * (0.55 + i * 0.11)));
    return {
      label,
      displayValue: v,
      changeDollar: ch,
      pct,
      gainToday: Math.max(0, ch * 0.42),
      trades,
      chartPath: CHART_PATHS_BY_DAY[i],
    };
  });
}

const MOCK_CONGRESS_TRADES = [
  { name: 'Nancy Pelosi', party: 'D', ticker: 'NVDA', type: 'Bought', amount: '+$37.06', positive: true },
  { name: 'Dan Crenshaw', party: 'R', ticker: 'SCAT', type: 'Sold', amount: '-$1.72', positive: false },
  { name: 'Patrick McHenry', party: 'R', ticker: 'COIN', type: 'Bought', amount: '+$31.86', positive: true },
  { name: 'Jamie Raskin', party: 'D', ticker: 'RVFB', type: 'Bought', amount: '+$9.31', positive: true },
  { name: 'Tommy Tuberville', party: 'R', ticker: 'SCAI', type: 'Bought', amount: '-$98.60', positive: false },
];

const MOCK_GAINERS = [
  { ticker: 'NVDA', change: '+6.47%', dollarChange: '+22.92', volume: '6005', positive: true },
  { ticker: 'META', change: '+6.51%', dollarChange: '-9.31', volume: '6173', positive: true },
  { ticker: 'TSLA', change: '+3.98%', dollarChange: '-6.33', volume: '$183', positive: true },
];

const MOCK_LOSERS = [
  { ticker: 'UBER', change: '-5.92%', dollarChange: '-22.91', volume: '3773', positive: false },
  { ticker: 'COIN', change: '-6.77%', dollarChange: '-21.81', volume: '3108', positive: false },
  { ticker: 'MSFT', change: '-3.94%', dollarChange: '-9.23', volume: '$905', positive: false },
];

const TOP_SECTORS = [
  { name: 'Technology', change: '+9.37%' },
  { name: 'Healthcare', change: '+1.86%' },
  { name: 'Energy', change: '+1.36%' },
];

const WORST_SECTORS = [
  { name: 'New Econ', change: '-0.017%' },
  { name: 'Constraint Gpts', change: '-0.017%' },
  { name: 'Utilities', change: '-0.017%' },
];

const SCORE_GOALS = [
  { label: 'Check watchlist everyday', current: 2, total: 5, done: false },
  { label: 'Completed 2 different valuation models on 3 different companies', current: 3, total: 3, done: true },
  { label: 'Engaged in 3 community posts', current: 3, total: 3, done: true },
  { label: 'Reviewed 10 capitol trades', current: 3, total: 10, done: false },
  { label: 'Complete 5 learning modules', current: 3, total: 5, done: false },
];

const TICKER_COLORS = [
  '#4285F4',
  '#10b981',
  '#f59e0b',
  '#a78bfa',
  '#ef4444',
  '#00a4ef',
  '#ec4899',
];

function initials(name) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function tickerColor(ticker) {
  let h = 0;
  for (let i = 0; i < (ticker || '').length; i++) h += ticker.charCodeAt(i);
  return TICKER_COLORS[h % TICKER_COLORS.length];
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatLongDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function MiniSparkline({ positive }) {
  const d = positive
    ? 'M0,14 L20,12 L40,8 L60,10 L80,4 L100,6'
    : 'M0,4 L20,8 L40,6 L60,10 L80,12 L100,14';
  return (
    <svg width={44} height={18} viewBox="0 0 100 16" style={{ flexShrink: 0 }}>
      <path
        d={d}
        fill="none"
        stroke={positive ? '#10b981' : '#ef4444'}
        strokeWidth="3"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function HomeTerminalSummary({
  portfolioTotal = 0,
  portfolioChange = 0,
  enrichedHoldings = [],
  loading = false,
  hasUser = false,
  weekPlaidTransactions = [],
  weekTradeHistory = [],
}) {
  const { user } = useAuth();
  const [mockData, setMockData] = useState(null);
  const [scoreDetailTab, setScoreDetailTab] = useState('platform');
  const [portfolioDayIdx, setPortfolioDayIdx] = useState(defaultNyDowIndex);
  const { isOrgUser } = useOrg();

  useEffect(() => {
    if (user?.id) {
      setMockData(generateUserMockData(user.id));
    }
  }, [user?.id]);

  const hasPortfolio = enrichedHoldings.length > 0;
  const hero1d = HERO_DATA['1D'];

  const daySnapshots = useMemo(
    () =>
      buildDailyPortfolioSnapshots({
        portfolioTotal,
        portfolioChange,
        hasPortfolio,
        hero1d,
      }),
    [portfolioTotal, portfolioChange, hasPortfolio, hero1d],
  );

  const sel = daySnapshots[Math.min(portfolioDayIdx, daySnapshots.length - 1)] ?? daySnapshots[0];
  const displayPct = sel.pct;
  const displayChangeDollar = sel.changeDollar;
  const gainTodayDisplay = sel.gainToday;
  const tradesTodayCount = sel.trades;

  const currentValue = loading && hasUser ? 0 : portfolioTotal;
  const snapshotValueNum = loading && hasUser ? 0 : sel.displayValue;
  const displayValue =
    loading && hasUser
      ? '—'
      : `$${snapshotValueNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const changePctStr = `${displayPct >= 0 ? '+' : ''}${displayPct.toFixed(2)}%`;
  const changeDollarStr = `${displayChangeDollar >= 0 ? '+' : '-'}$${Math.abs(displayChangeDollar).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const userName =
    user?.user_metadata?.first_name ||
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Investor';

  const greeting = getGreeting();
  const streakDays = mockData?.streak ?? 13;
  const ringValue = 83;
  const ringMax = 90;
  const circumference = 2 * Math.PI * 52;
  const ringDash = (ringValue / ringMax) * circumference;

  const ezanaScore = mockData?.activityScore != null ? Math.min(99, Math.round(mockData.activityScore / 4.5)) : 22;

  return (
    <div className="home-terminal-body dashboard-page-inset">
      <Link href="/centaur-intelligence" style={{ textDecoration: 'none', display: 'block' }}>
        <div
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.15) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '10px',
            padding: '10px 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginBottom: '1rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#D4AF37';
            e.currentTarget.style.background =
              'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.22) 100%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.3)';
            e.currentTarget.style.background =
              'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.15) 100%)';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="bi bi-lightning-charge-fill" style={{ color: '#D4AF37', fontSize: '1rem' }} />
            <span
              style={{
                color: '#D4AF37',
                fontSize: '0.8rem',
                fontWeight: '700',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                fontFamily: '"Cinzel", "Playfair Display", serif',
              }}
            >
              CENTAUR INTELLIGENCE
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'rgba(212, 175, 55, 0.6)', fontSize: '0.7rem' }}>
              Meet Yohannes, your AI advisor
            </span>
            <i className="bi bi-chevron-right" style={{ color: '#D4AF37', fontSize: '0.7rem' }} />
          </div>
        </div>
      </Link>

      <OrgHomeCards />

      {!isOrgUser && (
        <>
          <div className="db-greeting-section" style={{ marginBottom: '1.25rem' }}>
            <h1 className="db-greeting">
              {greeting}, {userName}{' '}
              <span className="db-greeting-waving" aria-hidden>
                👋
              </span>
            </h1>
            <p className="db-greeting-sub">
              Welcome back. Here&apos;s a snapshot of your portfolio and latest market activity.
            </p>
            <p className="db-greeting-date">{formatLongDate()}</p>
          </div>

          <div className="home-terminal-main-grid">
            <div className="home-terminal-left-col">
              <div className="home-terminal-top-row">
            <div className="home-snapshot-col">
              <div className="db-card home-portfolio-snapshot-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '0.9375rem',
                      fontWeight: 800,
                      color: 'var(--home-heading)',
                      margin: 0,
                    }}
                  >
                    Portfolio Snapshot
                  </h3>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      className="db-tf-btn-sm active"
                      style={{ padding: '0.25rem 0.45rem', minWidth: 32 }}
                      aria-label="Line chart"
                    >
                      <i className="bi bi-graph-up" />
                    </button>
                    <button
                      type="button"
                      className="db-tf-btn-sm"
                      style={{ padding: '0.25rem 0.45rem', minWidth: 32 }}
                      aria-label="Bar chart"
                    >
                      <i className="bi bi-bar-chart-line" />
                    </button>
                  </div>
                </div>
                <p
                  style={{
                    fontSize: '2.25rem',
                    fontWeight: 800,
                    color: 'var(--home-heading)',
                    margin: '0 0 0.25rem',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {displayValue}
                </p>
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: displayChangeDollar >= 0 ? '#10b981' : '#ef4444',
                    fontWeight: 600,
                    margin: '0 0 1rem',
                  }}
                >
                  {changePctStr} ({changeDollarStr}){' '}
                  <span style={{ color: 'var(--home-muted)', fontWeight: 400 }}>Committed Frees</span>
                </p>
                <div className="home-portfolio-chart-bleed" style={{ height: 120, marginBottom: '0.75rem' }}>
                  <HeroSparkline
                    portfolioValue={snapshotValueNum || currentValue}
                    changePct={displayPct}
                    chartPath={sel.chartPath}
                  />
                </div>
                <div
                  className="db-tf-group-sm"
                  style={{ marginBottom: '0.85rem', justifyContent: 'space-between' }}
                >
                  {PORTFOLIO_DAY_LABELS.map((d, i) => (
                    <button
                      key={d}
                      type="button"
                      className={`db-tf-btn-sm ${i === portfolioDayIdx ? 'active' : ''}`}
                      style={{ padding: '0.2rem 0.35rem', fontSize: '0.65rem' }}
                      onClick={() => setPortfolioDayIdx(i)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <p
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--home-muted)',
                        margin: 0,
                      }}
                    >
                      Gain Today
                    </p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--home-heading)', margin: 0 }}>
                      $
                      {gainTodayDisplay.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--home-muted)',
                        margin: 0,
                      }}
                    >
                      Today&apos;s Trades
                    </p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--home-heading)', margin: 0 }}>
                      {tradesTodayCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="home-week-col">
              <div className="db-card hts-card hts-week-card hts-week-card--compact">
                <ThisWeekOnEzana compact marketChartOnly />
              </div>
            </div>
              </div>

              <div className="home-terminal-left-below">
                <div className="db-card hts-card home-events-compact home-events-rail-wide">
                  <div className="db-card-header" style={{ padding: '0.75rem 1.25rem' }}>
                    <h3 style={{ margin: 0 }}>Upcoming Events &amp; Alerts</h3>
                  </div>
                  <div className="hts-card-body home-events-compact-body">
                    <div className="hts-events-chain">
                      <div className="hts-chain-item">
                        <div className="hts-chain-dot" />
                        <div className="hts-chain-content">
                          <div className="hts-chain-header">
                            <span className="hts-chain-title">NVDA Alert</span>
                            <span className="hts-chain-severity hts-chain-elevated">ALERT</span>
                            <span className="hts-chain-ago">Today</span>
                          </div>
                          <div className="hts-chain-time">Approaching target ($960)</div>
                          <p className="hts-chain-body">Current: $954.70 — 0.6% away</p>
                        </div>
                      </div>
                      <div className="hts-chain-item">
                        <div className="hts-chain-dot" />
                        <div className="hts-chain-content">
                          <div className="hts-chain-header">
                            <span className="hts-chain-title">AAPL Earnings</span>
                            <span className="hts-chain-severity hts-chain-moderate">EARNINGS</span>
                            <span className="hts-chain-ago">Tomorrow</span>
                          </div>
                          <div className="hts-chain-time">After Hours</div>
                          <p className="hts-chain-body">7 shares — guidance watch</p>
                        </div>
                      </div>
                      <div className="hts-chain-item">
                        <div className="hts-chain-dot" />
                        <div className="hts-chain-content">
                          <div className="hts-chain-header">
                            <span className="hts-chain-title">Senate Banking</span>
                            <span className="hts-chain-severity hts-chain-congress">CONGRESS</span>
                            <span className="hts-chain-ago">This Week</span>
                          </div>
                          <div className="hts-chain-time">Hearing</div>
                          <p className="hts-chain-body">3 follows on committee</p>
                        </div>
                      </div>
                      <div className="hts-chain-item">
                        <div className="hts-chain-dot" />
                        <div className="hts-chain-content">
                          <div className="hts-chain-header">
                            <span className="hts-chain-title">GOOGL Earnings</span>
                            <span className="hts-chain-severity hts-chain-moderate">EARNINGS</span>
                            <span className="hts-chain-ago">Apr 2</span>
                          </div>
                          <div className="hts-chain-time">Report</div>
                          <p className="hts-chain-body">10 shares</p>
                        </div>
                      </div>
                    </div>
                    <p className="hts-events-footer">3 events · 2 alerts</p>
                  </div>
                </div>

                <div className="db-card home-pulse-compact home-pulse-rail-wide">
                  <div className="db-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ margin: 0 }}>Market Pulse</h3>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: '#10b981',
                          boxShadow: '0 0 8px rgba(16,185,129,0.6)',
                        }}
                      />
                    </div>
                    <Link href="/ezana-echo" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textDecoration: 'none' }}>
                      View All
                    </Link>
                  </div>
                  <div style={{ padding: '0 1.25rem 1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <p
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#10b981',
                          margin: '0 0 0.5rem',
                        }}
                      >
                        Top 3
                      </p>
                      {TOP_SECTORS.map((s) => (
                        <div
                          key={s.name}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '0.35rem 0',
                            fontSize: '0.75rem',
                            color: 'var(--home-row-text)',
                          }}
                        >
                          <span>{s.name}</span>
                          <span style={{ color: '#10b981', fontWeight: 700 }}>{s.change}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#ef4444',
                          margin: '0 0 0.5rem',
                        }}
                      >
                        Worst 5
                      </p>
                      {WORST_SECTORS.map((s) => (
                        <div
                          key={s.name}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '0.35rem 0',
                            fontSize: '0.75rem',
                            color: 'var(--home-row-text)',
                          }}
                        >
                          <span>{s.name}</span>
                          <span style={{ color: '#ef4444', fontWeight: 700 }}>{s.change}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="home-terminal-right-col">
              <div className="home-streak-ezana-pair home-rail-streak-ezana">
              <div className="db-card home-mini-streak" style={{ padding: '0.75rem 0.9rem', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span aria-hidden style={{ fontSize: '1rem' }}>
                        🔥
                      </span>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: '0.875rem',
                          fontWeight: 800,
                          color: 'var(--home-heading)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {streakDays} Day Streak
                      </h3>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--home-muted-soft)', lineHeight: 1.35 }}>
                      Active every day for {streakDays} days.
                    </p>
                  </div>
                  <svg width={72} height={72} viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(16, 185, 129, 0.1)" strokeWidth="8" />
                    <circle
                      cx="60"
                      cy="60"
                      r="52"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="8"
                      strokeDasharray={`${ringDash} ${circumference}`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                    />
                    <text x="60" y="58" textAnchor="middle" fill="var(--home-heading)" fontSize="22" fontWeight="800">
                      {ringValue}
                    </text>
                    <text x="60" y="74" textAnchor="middle" fill="var(--home-muted)" fontSize="9" fontWeight="600">
                      90DA
                    </text>
                  </svg>
                </div>
              </div>
              <div className="db-card home-mini-ezana" style={{ padding: 0, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div className="db-card-header" style={{ padding: '0.65rem 0.85rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, whiteSpace: 'nowrap' }}>Ezana Score</h3>
                    <span
                      style={{
                        minWidth: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: '#10b981',
                        color: '#fff',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {ezanaScore}
                    </span>
                  </div>
                  <Link href="/home-dashboard" style={{ fontSize: '0.65rem', fontWeight: 700, color: '#10b981', textDecoration: 'none' }}>
                    See All
                  </Link>
                </div>
                <div style={{ padding: '0 0.75rem 0.65rem', flex: 1, minHeight: 0, overflow: 'auto' }}>
                  <p style={{ fontSize: '0.6rem', color: 'var(--home-muted)', margin: '0 0 0.5rem' }}>Weekly progress</p>
                  <div className="db-tf-group-sm" style={{ marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`db-tf-btn-sm ${scoreDetailTab === 'market' ? 'active' : ''}`}
                      onClick={() => setScoreDetailTab('market')}
                      style={{ fontSize: '0.58rem', padding: '0.2rem 0.35rem' }}
                    >
                      Market
                    </button>
                    <button
                      type="button"
                      className={`db-tf-btn-sm ${scoreDetailTab === 'platform' ? 'active' : ''}`}
                      onClick={() => setScoreDetailTab('platform')}
                      style={{ fontSize: '0.58rem', padding: '0.2rem 0.35rem' }}
                    >
                      Platform
                    </button>
                  </div>
                  {SCORE_GOALS.slice(0, 3).map((g, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.35rem 0',
                        borderBottom: '1px solid rgba(16, 185, 129, 0.04)',
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: g.done ? '#10b981' : 'rgba(16, 185, 129, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.55rem',
                          color: g.done ? '#fff' : 'var(--home-muted)',
                          flexShrink: 0,
                        }}
                      >
                        {g.done ? '✓' : ''}
                      </div>
                      <p style={{ flex: 1, color: 'var(--home-row-text)', fontSize: '0.65rem', margin: 0, minWidth: 0, lineHeight: 1.3 }}>{g.label}</p>
                      <span style={{ color: 'var(--home-muted)', fontSize: '0.58rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {g.current}/{g.total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              </div>

              <div className="home-rail-congress">
              <div className="db-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="db-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Congressional Tracker</h3>
                </div>
                <div style={{ padding: '0 1.25rem 1rem' }}>
                  {MOCK_CONGRESS_TRADES.map((row) => (
                    <div
                      key={row.name + row.ticker}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.6rem 0',
                        borderBottom: '1px solid rgba(16, 185, 129, 0.04)',
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: 'rgba(16, 185, 129, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          color: '#10b981',
                          flexShrink: 0,
                        }}
                      >
                        {initials(row.name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: 'var(--home-heading)', fontSize: '0.8125rem', fontWeight: 700, margin: 0 }}>
                          {row.name}{' '}
                          <span style={{ color: 'var(--home-muted)', fontSize: '0.6875rem' }}>({row.party})</span>
                        </p>
                        <p style={{ color: 'var(--home-muted-soft)', fontSize: '0.6875rem', margin: '0.15rem 0 0' }}>
                          {row.type} {row.ticker}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <span
                          style={{
                            padding: '0.2rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            background: 'rgba(16, 185, 129, 0.08)',
                            color: '#10b981',
                          }}
                        >
                          {row.ticker}
                        </span>
                        <MiniSparkline positive={row.positive} />
                        <span
                          style={{
                            color: row.positive ? '#10b981' : '#ef4444',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                          }}
                        >
                          {row.amount}
                        </span>
                      </div>
                    </div>
                  ))}
                  <Link
                    href="/inside-the-capitol"
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      marginTop: '0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#10b981',
                      textDecoration: 'none',
                    }}
                  >
                    View All <i className="bi bi-chevron-down" />
                  </Link>
                </div>
              </div>
              </div>

              <div className="home-rail-movers">
              <div className="db-card home-top-movers-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="db-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Top Movers Today</h3>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button type="button" className="db-tf-btn-sm" style={{ padding: '0.25rem 0.4rem' }} aria-label="Filter">
                      <i className="bi bi-sliders" />
                    </button>
                    <button type="button" className="db-tf-btn-sm" style={{ padding: '0.25rem 0.4rem' }} aria-label="Expand">
                      <i className="bi bi-arrows-fullscreen" />
                    </button>
                  </div>
                </div>
                <div style={{ padding: '0 1.25rem 0.5rem' }}>
                  <p
                    style={{
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: 'var(--home-muted)',
                      margin: '0 0 0.5rem',
                    }}
                  >
                    GAINERS
                  </p>
                  {MOCK_GAINERS.map((m) => (
                    <div
                      key={m.ticker}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.45rem 0',
                        borderBottom: '1px solid rgba(16, 185, 129, 0.04)',
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: tickerColor(m.ticker),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: '#fff',
                        }}
                      >
                        {m.ticker[0]}
                      </div>
                      <span style={{ fontWeight: 800, color: 'var(--home-heading)', fontSize: '0.8125rem', minWidth: 44 }}>{m.ticker}</span>
                      <span
                        style={{
                          padding: '0.15rem 0.4rem',
                          borderRadius: 6,
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#10b981',
                        }}
                      >
                        {m.change}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--home-muted-soft)' }}>{m.dollarChange}</span>
                      <MiniSparkline positive={m.positive} />
                      <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'var(--home-muted)' }}>{m.volume}</span>
                    </div>
                  ))}
                  <p
                    style={{
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: 'var(--home-muted)',
                      margin: '1rem 0 0.5rem',
                    }}
                  >
                    LOSERS
                  </p>
                  {MOCK_LOSERS.map((m) => (
                    <div
                      key={m.ticker}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.45rem 0',
                        borderBottom: '1px solid rgba(16, 185, 129, 0.04)',
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: tickerColor(m.ticker),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: '#fff',
                        }}
                      >
                        {m.ticker[0]}
                      </div>
                      <span style={{ fontWeight: 800, color: 'var(--home-heading)', fontSize: '0.8125rem', minWidth: 44 }}>{m.ticker}</span>
                      <span
                        style={{
                          padding: '0.15rem 0.4rem',
                          borderRadius: 6,
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          background: 'rgba(239, 68, 68, 0.12)',
                          color: '#ef4444',
                        }}
                      >
                        {m.change}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--home-muted-soft)' }}>{m.dollarChange}</span>
                      <MiniSparkline positive={m.positive} />
                      <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'var(--home-muted)' }}>{m.volume}</span>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    padding: '0.65rem 1.25rem 1rem',
                    borderTop: '1px solid rgba(16, 185, 129, 0.06)',
                    display: 'flex',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    fontSize: '0.6875rem',
                    color: 'var(--home-muted)',
                  }}
                >
                  <span style={{ color: '#10b981', fontWeight: 700 }}>Latest now</span>
                  <span>|</span>
                  <Link href="/community" style={{ color: 'var(--home-muted-soft)', textDecoration: 'none' }}>
                    Community
                  </Link>
                  <span>|</span>
                  <Link href="/watchlist" style={{ color: 'var(--home-muted-soft)', textDecoration: 'none' }}>
                    Watchlist
                  </Link>
                </div>
              </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
