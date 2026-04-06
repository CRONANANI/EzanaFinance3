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

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** YTD sparkline path: one segment per month Jan → current month */
function buildYtdChartPath(monthCount) {
  const w = 480;
  const baseY = 46;
  if (monthCount <= 1) {
    return `M0,${baseY} L${w},${baseY - 10}`;
  }
  const parts = [];
  for (let i = 0; i < monthCount; i++) {
    const t = i / (monthCount - 1);
    const x = t * w;
    const y = baseY - 14 * Math.sin(t * Math.PI * 0.92) + t * 10;
    const clamped = Math.min(72, Math.max(10, y));
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${clamped.toFixed(1)}`);
  }
  return parts.join(' ');
}

function buildYtdMonthlySnapshots({ portfolioTotal, portfolioChange, hasPortfolio, hero1d }) {
  const baseValue = hasPortfolio && portfolioTotal > 0 ? portfolioTotal : hero1d.value;
  const baseChange = hasPortfolio ? portfolioChange : hero1d.changeDollar;
  const monthIdx = new Date().getMonth();
  const n = monthIdx + 1;
  const drift = [-0.004, 0.002, 0.003, -0.0015, 0.0025, -0.002, 0.0015, 0.002, -0.001, 0.0025, -0.0015, 0.002];

  const rows = [];
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    const mult = 0.94 + t * 0.06;
    const d = drift[i % drift.length];
    const v =
      i === n - 1
        ? baseValue
        : baseValue * mult + baseValue * d * 0.08;
    const ch =
      i === n - 1
        ? baseChange
        : baseChange * (0.35 + t * 0.55) + baseValue * d * 0.04;
    const pct = v > 0 ? (ch / v) * 100 : 0;
    const trades = Math.max(0, Math.round((hero1d.companies ?? 8) * (0.45 + t * 0.4)));
    rows.push({
      label: MONTH_SHORT[i],
      displayValue: v,
      changeDollar: ch,
      pct,
      gainToday: Math.max(0, ch * 0.42),
      trades,
    });
  }
  const path = buildYtdChartPath(n);
  return { rows, chartPath: path };
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

/** Upcoming Events grid — `day` is day-of-month (calendar uses current month/year) */
const UPCOMING_EVENTS_GRID = [
  { id: 1, type: 'fed', icon: '🏛️', title: 'Fed Rate Decision', day: 7, time: '2:00 PM', color: '#3b82f6' },
  { id: 2, type: 'earnings', icon: '📊', title: 'NVDA Earnings', day: 8, time: '4:30 PM', color: '#10b981' },
  { id: 3, type: 'alert', icon: '🔔', title: 'Portfolio Alert', day: 9, time: 'All Day', color: '#f59e0b' },
  { id: 4, type: 'economic', icon: '📈', title: 'CPI Release', day: 10, time: '8:30 AM', color: '#6366f1' },
  { id: 5, type: 'earnings', icon: '📊', title: 'AAPL Earnings', day: 11, time: '4:30 PM', color: '#10b981' },
  { id: 6, type: 'fed', icon: '🏛️', title: 'Fed Minutes', day: 14, time: '2:00 PM', color: '#3b82f6' },
  { id: 7, type: 'economic', icon: '📉', title: 'Retail Sales', day: 15, time: '8:30 AM', color: '#6366f1' },
  { id: 8, type: 'alert', icon: '⚠️', title: 'Margin Call Warning', day: 16, time: 'Alert', color: '#ef4444' },
  { id: 9, type: 'earnings', icon: '📊', title: 'MSFT Earnings', day: 17, time: '4:30 PM', color: '#10b981' },
  { id: 10, type: 'economic', icon: '🏠', title: 'Housing Starts', day: 17, time: '8:30 AM', color: '#6366f1' },
  { id: 11, type: 'fed', icon: '🏛️', title: 'Fed Speaker: Powell', day: 18, time: '10:00 AM', color: '#3b82f6' },
  { id: 12, type: 'alert', icon: '🔔', title: 'Watchlist Price Alert', day: 21, time: 'Alert', color: '#f59e0b' },
];

const EVENT_COLOURS = {
  fed: '#3b82f6',
  earnings: '#10b981',
  alert: '#f59e0b',
  economic: '#6366f1',
};

const EVENT_LEGEND = [
  { type: 'earnings', label: 'Earnings', colour: '#10b981' },
  { type: 'fed', label: 'Fed / Macro', colour: '#3b82f6' },
  { type: 'economic', label: 'Economic', colour: '#6366f1' },
  { type: 'alert', label: 'Alert', colour: '#f59e0b' },
];

const DAY_LABELS_SUN_FIRST = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

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
  const { isOrgUser } = useOrg();

  useEffect(() => {
    if (user?.id) {
      setMockData(generateUserMockData(user.id));
    }
  }, [user?.id]);

  const hasPortfolio = enrichedHoldings.length > 0;
  const hero1d = HERO_DATA['1D'];

  const { rows: monthSnapshots, chartPath: ytdChartPath } = useMemo(
    () =>
      buildYtdMonthlySnapshots({
        portfolioTotal,
        portfolioChange,
        hasPortfolio,
        hero1d,
      }),
    [portfolioTotal, portfolioChange, hasPortfolio, hero1d],
  );

  const sel = monthSnapshots[monthSnapshots.length - 1] ?? monthSnapshots[0];
  const displayPct = sel.pct;
  const displayChangeDollar = sel.changeDollar;
  const gainTodayDisplay = sel.gainToday;

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

  const ezanaScore = mockData?.activityScore != null ? Math.min(99, Math.round(mockData.activityScore / 4.5)) : 22;

  const weekDots = useMemo(() => {
    const n = Math.min(7, Math.max(0, streakDays));
    return Array.from({ length: 7 }, (_, i) => i < n);
  }, [streakDays]);

  const upcomingCalendar = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const startDow = new Date(y, m, 1).getDay();
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    const dayToType = {};
    UPCOMING_EVENTS_GRID.forEach((ev) => {
      const dom = Math.min(Math.max(1, ev.day), daysInMonth);
      dayToType[dom] = ev.type;
    });
    return { y, m, daysInMonth, cells, dayToType, monthTitle: `${MONTH_SHORT[m]} ${y}` };
  }, []);

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
                <div className="home-portfolio-chart-bleed" style={{ height: 120, marginBottom: 0 }}>
                  <HeroSparkline
                    portfolioValue={snapshotValueNum || currentValue}
                    changePct={displayPct}
                    chartPath={ytdChartPath}
                    axisLabels={monthSnapshots.map((m) => m.label)}
                  />
                </div>
                <div className="home-portfolio-gain-row">
                  <span className="home-portfolio-gain-label">Gain Today</span>
                  <span className="home-portfolio-gain-value">
                    $
                    {gainTodayDisplay.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
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
                    <div className="hts-events-grid-calendar">
                      <div className="hts-events-grid-left">
                        <div className="hts-events-3x4-grid">
                          {UPCOMING_EVENTS_GRID.map((ev) => {
                            const dom = Math.min(Math.max(1, ev.day), upcomingCalendar.daysInMonth);
                            return (
                              <div
                                key={ev.id}
                                className="hts-events-grid-cell"
                                style={{
                                  background: `${ev.color}12`,
                                  border: `1px solid ${ev.color}30`,
                                }}
                              >
                                <div className="hts-events-grid-cell-head">
                                  <span className="hts-events-grid-icon" aria-hidden>
                                    {ev.icon}
                                  </span>
                                  <span className="hts-events-grid-date" style={{ color: ev.color }}>
                                    {MONTH_SHORT[upcomingCalendar.m]} {dom}
                                  </span>
                                </div>
                                <p className="hts-events-grid-title">{ev.title}</p>
                                <p className="hts-events-grid-time">{ev.time}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="hts-events-calendar-right">
                        <div className="hts-events-cal-month">{upcomingCalendar.monthTitle}</div>
                        <div className="hts-events-cal-dow">
                          {DAY_LABELS_SUN_FIRST.map((d) => (
                            <div key={d} className="hts-events-cal-dow-cell">
                              {d}
                            </div>
                          ))}
                        </div>
                        <div className="hts-events-cal-cells">
                          {upcomingCalendar.cells.map((day, idx) => {
                            if (day == null) {
                              return <div key={`empty-${idx}`} className="hts-events-cal-day empty" />;
                            }
                            const eventType = upcomingCalendar.dayToType[day];
                            const dotColour = eventType ? EVENT_COLOURS[eventType] : null;
                            return (
                              <div
                                key={day}
                                className={`hts-events-cal-day ${dotColour ? 'has-event' : ''}`}
                                style={
                                  dotColour
                                    ? {
                                        background: `${dotColour}18`,
                                        border: `1px solid ${dotColour}30`,
                                      }
                                    : undefined
                                }
                              >
                                <span
                                  className="hts-events-cal-day-num"
                                  style={{
                                    color: dotColour || undefined,
                                    fontWeight: dotColour ? 700 : 400,
                                  }}
                                >
                                  {day}
                                </span>
                                {dotColour ? <span className="hts-events-cal-dot" style={{ background: dotColour }} /> : null}
                              </div>
                            );
                          })}
                        </div>
                        <div className="hts-events-cal-legend">
                          {EVENT_LEGEND.map((l) => (
                            <div key={l.type} className="hts-events-cal-legend-row">
                              <span className="hts-events-cal-legend-swatch" style={{ background: l.colour }} />
                              <span className="hts-events-cal-legend-label">{l.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
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
                <div
                  className="db-card home-streak-ezana-merged"
                  style={{
                    padding: '0.75rem 0.9rem',
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '1.1rem' }} aria-hidden>
                          🔥
                        </span>
                        <span
                          style={{
                            fontSize: '1.5rem',
                            fontWeight: 800,
                            color: 'var(--home-heading)',
                            lineHeight: 1,
                          }}
                        >
                          {streakDays}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--home-muted-soft)', fontWeight: 500 }}>day streak</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', marginTop: '0.5rem' }}>
                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => (
                          <div key={`${label}-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <div
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: weekDots[i] ? '#10b981' : 'rgba(255, 255, 255, 0.06)',
                                border: weekDots[i] ? '2px solid #10b981' : '2px solid rgba(255, 255, 255, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {weekDots[i] ? (
                                <span style={{ fontSize: '0.55rem', color: '#fff', fontWeight: 700 }}>✓</span>
                              ) : null}
                            </div>
                            <span style={{ fontSize: '0.5rem', color: 'var(--home-muted-soft)', fontWeight: 500 }}>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: '0.65rem',
                          color: 'var(--home-muted-soft)',
                          fontWeight: 600,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          marginBottom: '0.2rem',
                        }}
                      >
                        Ezana Score
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#D4AF37', lineHeight: 1 }}>
                        {ezanaScore}
                        <span style={{ fontSize: '0.75rem', color: 'var(--home-muted)', fontWeight: 400 }}>/100</span>
                      </div>
                      <div
                        style={{
                          width: '80px',
                          height: '4px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          borderRadius: '2px',
                          marginTop: '0.4rem',
                          marginLeft: 'auto',
                        }}
                      >
                        <div
                          style={{
                            width: `${ezanaScore}%`,
                            height: '100%',
                            borderRadius: '2px',
                            background: 'linear-gradient(90deg, #D4AF37, #f0c040)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      paddingTop: '0.75rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      fontSize: '0.65rem',
                      color: 'var(--home-muted-soft)',
                      fontWeight: 500,
                    }}
                  >
                    Active investor · Keep your streak going
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
