'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import '@/app/(dashboard)/home-dashboard/home-dashboard.css';
import './home-terminal-summary.css';
import dynamic from 'next/dynamic';

/* ThisWeekOnEzana renders several Recharts line/bar charts. Loading
   Recharts (~150 KB gz) on initial Home paint delayed LCP even though
   these charts sit below the fold — the data is weekly metadata, not
   part of the hero. Dynamic-importing with ssr:false keeps the server
   HTML simple and delays the Recharts chunk until the browser is idle. */
const ThisWeekOnEzana = dynamic(
  () => import('./ThisWeekOnEzana').then((m) => ({ default: m.ThisWeekOnEzana })),
  { ssr: false, loading: () => null }
);
import { OrgHomeCards } from '@/components/org/OrgHomeCards';
import { useOrg } from '@/contexts/OrgContext';
import { useProGate } from '@/components/upgrade/ProGateContext';
import { generateUserMockData } from '@/lib/userMockData';
import { HeroSparkline } from '@/components/dashboard/HeroSparkline';
import { useUpcomingEvents, formatEventDay } from '@/hooks/useUpcomingEvents';
import { useUserRelevanceSet } from '@/hooks/useUserRelevanceSet';

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

function buildYtdMonthlySnapshots({ portfolioTotal, portfolioChange, hasPortfolio }) {
  const baseValue = hasPortfolio && portfolioTotal > 0 ? portfolioTotal : 0;
  const baseChange = hasPortfolio ? portfolioChange : 0;
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

// Fallback mock events were removed along with the "April 17" bug. When the
// live feed is empty we show a proper empty state instead of fabricating rows.

const EVENT_COLOURS = {
  earnings: '#10b981',
  dividends: '#22c55e',
  ipos: '#a855f7',
  economic: '#6366f1',
  fed: '#3b82f6',
  'inside-the-capitol': '#f97316',
  crypto: '#fbbf24',
  commodity: '#84cc16',
  alert: '#f59e0b',
};

const EVENT_LEGEND = [
  { type: 'earnings', label: 'Earnings', colour: '#10b981' },
  { type: 'dividends', label: 'Dividends', colour: '#22c55e' },
  { type: 'ipos', label: 'IPOs', colour: '#a855f7' },
  { type: 'economic', label: 'Economic', colour: '#6366f1' },
  { type: 'inside-the-capitol', label: 'Capitol', colour: '#f97316' },
];

// Every category the user can potentially see. Chips for categories with
// zero events in the current window are hidden at render time — this
// keeps the filter row clean for users who follow only a subset (e.g.
// stocks + politicians but no crypto).
const EVENT_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'earnings', label: 'Earnings' },
  { key: 'dividends', label: 'Dividends' },
  { key: 'ipos', label: 'IPOs' },
  { key: 'economic', label: 'Economic' },
  { key: 'inside-the-capitol', label: 'Capitol' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'commodity', label: 'Commodities' },
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
  portfolioTotal = null,
  portfolioChange = 0,
  enrichedHoldings = [],
  loading = false,
  hasUser = false,
  weekPlaidTransactions = [],
  weekTradeHistory = [],
  plaidConnected = false,
  plaidSummary = null,
  mockTotalValue = 0,
  mockHasMockPortfolio = false,
}) {
  const { user } = useAuth();
  const [mockData, setMockData] = useState(null);
  const relevance = useUserRelevanceSet();
  const {
    events: liveEvents,
    errors: eventsErrors,
    isLoading: eventsLoading,
    isRateLimited: eventsRateLimited,
    relevanceEmpty,
  } = useUpcomingEvents({ relevance });
  const [eventFilter, setEventFilter] = useState('all');
  const [congressTrades, setCongressTrades] = useState([]);
  const [congressLoading, setCongressLoading] = useState(true);
  const [portfolioValueTf, setPortfolioValueTf] = useState('1D');
  const { isOrgUser } = useOrg();
  const { openProGate } = useProGate();

  useEffect(() => {
    if (user?.id) {
      setMockData(generateUserMockData(user.id));
    }
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    async function fetchCongress() {
      setCongressLoading(true);
      try {
        const [houseRes, senateRes] = await Promise.all([
          fetch('/api/fmp/house?type=latest&page=0&limit=20'),
          fetch('/api/fmp/senate?type=latest&page=0&limit=20'),
        ]);
        const houseRaw = houseRes.ok ? await houseRes.json() : [];
        const senateRaw = senateRes.ok ? await senateRes.json() : [];

        const normalize = (t, chamber) => {
          const first = t.firstName || '';
          const last = t.lastName || '';
          const name = `${first} ${last}`.trim() || t.office || t.name || 'Unknown';
          const rawType = (t.type || t.transactionType || '').toString().toLowerCase();
          const isSell = rawType.includes('sale') || rawType.includes('sell') || rawType.includes('disposal');
          const sym = (t.symbol || t.ticker || '').toUpperCase();

          const rawAmt = t.amount || '';
          let amount = rawAmt;
          const match = rawAmt.match(/\$([\d,]+)\s*[-–]\s*\$([\d,]+)/);
          if (match) {
            const lo = parseInt(match[1].replace(/,/g, ''), 10);
            const hi = parseInt(match[2].replace(/,/g, ''), 10);
            const fmt = (n) =>
              n >= 1_000_000
                ? `$${(n / 1_000_000).toFixed(1)}M`
                : n >= 1_000
                  ? `$${Math.round(n / 1_000)}K`
                  : `$${n}`;
            amount = `${fmt(lo)}–${fmt(hi)}`;
          }

          const disclosure = t.disclosureDate || t.date || t.transactionDate || '';
          const rawDate = new Date(disclosure);
          const ts = rawDate.getTime();
          const relDate = !disclosure
            ? '—'
            : Number.isNaN(ts)
              ? disclosure
              : (() => {
                  const diff = Math.floor((Date.now() - ts) / 86_400_000);
                  if (diff === 0) return 'Today';
                  if (diff === 1) return '1d ago';
                  return `${diff}d ago`;
                })();

          return { name, sym, chamber, isSell, amount, relDate, ts: ts || 0 };
        };

        const house = Array.isArray(houseRaw) ? houseRaw.map((t) => normalize(t, 'House')) : [];
        const senate = Array.isArray(senateRaw) ? senateRaw.map((t) => normalize(t, 'Senate')) : [];

        const combined = [...house, ...senate].sort((a, b) => b.ts - a.ts).slice(0, 5);

        if (!cancelled) {
          setCongressTrades(combined);
          setCongressLoading(false);
        }
      } catch {
        if (!cancelled) {
          setCongressTrades([]);
          setCongressLoading(false);
        }
      }
    }

    fetchCongress();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasPortfolio =
    enrichedHoldings.length > 0 ||
    (plaidConnected && plaidSummary?.totalValue != null) ||
    mockHasMockPortfolio;

  const portfolioSnapshotNum = useMemo(() => {
    if (plaidConnected && plaidSummary?.totalValue != null) return plaidSummary.totalValue;
    if (mockHasMockPortfolio) return mockTotalValue;
    return 0;
  }, [plaidConnected, plaidSummary?.totalValue, mockHasMockPortfolio, mockTotalValue]);

  const isPlaidSource = plaidConnected && plaidSummary?.totalValue != null;

  const portfolioTotalNum = portfolioTotal != null && Number.isFinite(Number(portfolioTotal)) ? Number(portfolioTotal) : 0;

  const { rows: monthSnapshots, chartPath: ytdChartPath } = useMemo(
    () =>
      buildYtdMonthlySnapshots({
        portfolioTotal: hasUser ? portfolioSnapshotNum : portfolioTotalNum,
        portfolioChange,
        hasPortfolio,
      }),
    [portfolioTotalNum, portfolioSnapshotNum, portfolioChange, hasPortfolio, hasUser],
  );

  const sel = monthSnapshots[monthSnapshots.length - 1] ?? monthSnapshots[0];
  const displayPct = sel.pct;
  const displayChangeDollar = sel.changeDollar;

  const currentValue = hasUser ? portfolioSnapshotNum : portfolioTotalNum;
  const snapshotValueNum = sel.displayValue;

  const showPortfolioHeadline =
    hasUser &&
    (hasPortfolio ||
      (portfolioSnapshotNum > 0 && Number.isFinite(portfolioSnapshotNum)));

  const displayValue = !hasUser
    ? portfolioTotal != null && Number.isFinite(Number(portfolioTotal))
      ? `$${Number(portfolioTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : 'Sign in for your portfolio'
    : showPortfolioHeadline
      ? `$${portfolioSnapshotNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : 'Connect a brokerage or try mock trading';

  const changePctStr = showPortfolioHeadline ? `${displayPct >= 0 ? '+' : ''}${displayPct.toFixed(2)}%` : '';
  const changeDollarStr = showPortfolioHeadline
    ? `${displayChangeDollar >= 0 ? '+' : '-'}$${Math.abs(displayChangeDollar).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '';

  const userName =
    user?.user_metadata?.first_name ||
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Investor';

  const greeting = getGreeting();
  const streakDays = mockData?.streak ?? 0;

  const ezanaScore = mockData?.activityScore != null ? Math.min(99, Math.round(mockData.activityScore / 4.5)) : 22;

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

    const todayDayOfMonth = now.getDate();
    const todayMidnight = new Date(y, m, todayDayOfMonth, 0, 0, 0);

    // Defensive client-side window check — matches todayAndEndOfMonth() on the
    // server. Guards against the API returning items outside the requested
    // range (FMP occasionally does this) so we never paint a stale date like
    // last month's "April 17" on the calendar.
    const inWindow = liveEvents.filter((ev) => {
      if (!ev.fullDate) return false;
      const [ey, em, ed] = String(ev.fullDate).slice(0, 10).split('-').map(Number);
      if (!ey || !em || !ed) return false;
      const evDate = new Date(ey, em - 1, ed);
      return evDate >= todayMidnight;
    });

    const filtered =
      eventFilter === 'all'
        ? inWindow
        : inWindow.filter((ev) => ev.category === eventFilter);

    // Calendar dots always reflect the full set (not just the active filter)
    // so users see at-a-glance where every event sits, even when narrowing
    // the left panel to one category.
    inWindow.forEach((ev) => {
      const ed = parseInt(String(ev.fullDate).slice(8, 10), 10);
      const em = parseInt(String(ev.fullDate).slice(5, 7), 10) - 1;
      if (em !== m) return;
      if (ed >= 1 && ed <= daysInMonth) {
        // First event wins per day — good enough for a colour hint.
        if (!dayToType[ed]) dayToType[ed] = ev.category || ev.type;
      }
    });

    // Group the visible (filtered) events by day for the "Today / Tomorrow /
    // Fri, Apr 25" section headers.
    const groupMap = new Map();
    for (const ev of filtered) {
      const key = String(ev.fullDate).slice(0, 10);
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key).push(ev);
    }
    const dayGroups = Array.from(groupMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, items]) => ({ day, label: formatEventDay(day), items }));

    // Which categories actually have events in the current window?
    // Chips for empty categories are hidden so the filter row doesn't
    // mislead users into thinking the API failed for, say, crypto when
    // they follow none.
    const categoriesWithEvents = new Set(inWindow.map((ev) => ev.category));

    return {
      y,
      m,
      daysInMonth,
      cells,
      dayToType,
      monthTitle: `${MONTH_SHORT[m]} ${y}`,
      eventsSource: filtered,
      dayGroups,
      totalVisible: filtered.length,
      totalAll: inWindow.length,
      categoriesWithEvents,
    };
  }, [liveEvents, eventFilter]);

  const availableFilters = useMemo(
    () =>
      EVENT_FILTERS.filter(
        (f) => f.key === 'all' || upcomingCalendar.categoriesWithEvents.has(f.key),
      ),
    [upcomingCalendar.categoriesWithEvents],
  );

  // If the user switched to a filter whose category no longer has events
  // (e.g. they removed the only crypto they followed), quietly snap back
  // to "all" so they don't stare at an empty panel.
  useEffect(() => {
    if (eventFilter === 'all') return;
    if (!availableFilters.some((f) => f.key === eventFilter)) {
      setEventFilter('all');
    }
  }, [availableFilters, eventFilter]);

  return (
    <div className="home-terminal-body dashboard-page-inset">
      <div
        role="button"
        tabIndex={0}
        onClick={openProGate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openProGate();
          }
        }}
        style={{ cursor: 'pointer', textDecoration: 'none', display: 'block' }}
      >
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
      </div>

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
              <div className="db-card home-portfolio-snapshot-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--home-heading)', margin: 0 }}>
                      Portfolio Snapshot
                    </h3>
                    <span
                      className="portfolio-source-label"
                      style={{ fontSize: '11px', opacity: 0.6, color: 'var(--home-muted-soft)', display: 'block', marginTop: 2 }}
                    >
                      {hasUser
                        ? isPlaidSource
                          ? 'Brokerage Account'
                          : mockHasMockPortfolio
                            ? 'Mock Portfolio'
                            : ''
                        : '\u00a0'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {['1D', '1M', '6M', '1Y'].map((tf) => (
                        <button
                          key={tf}
                          type="button"
                          onClick={() => setPortfolioValueTf(tf)}
                          style={{
                            padding: '0.2rem 0.45rem',
                            borderRadius: '4px',
                            border: 'none',
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: portfolioValueTf === tf ? '#10b981' : 'rgba(107, 114, 128, 0.1)',
                            color: portfolioValueTf === tf ? '#fff' : 'var(--home-muted)',
                          }}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button type="button" className="db-tf-btn-sm active" style={{ padding: '0.25rem 0.45rem', minWidth: 32 }} aria-label="Line chart">
                        <i className="bi bi-graph-up" />
                      </button>
                      <button type="button" className="db-tf-btn-sm" style={{ padding: '0.25rem 0.45rem', minWidth: 32 }} aria-label="Bar chart">
                        <i className="bi bi-bar-chart-line" />
                      </button>
                    </div>
                  </div>
                </div>

                <p className="home-num-hero portfolio-value" style={{ margin: '0 0 0.15rem' }}>
                  {displayValue}
                </p>
                {hasUser && !showPortfolioHeadline ? (
                  <p
                    className="home-num-change"
                    style={{ margin: '0 0 0.5rem', color: 'var(--home-muted)', fontSize: '0.75rem' }}
                  >
                    Performance appears when you link an account or use mock trading.
                  </p>
                ) : (
                  <p
                    className={`home-num-change ${displayChangeDollar >= 0 ? 'positive' : 'negative'}`}
                    style={{ margin: '0 0 0.5rem' }}
                  >
                    {hasUser && showPortfolioHeadline ? `${changePctStr} (${changeDollarStr})` : '\u00a0'}
                  </p>
                )}

                <div
                  style={{ height: 80, minHeight: 80, maxHeight: 80, marginBottom: '0.75rem', overflow: 'hidden' }}
                  title={`Portfolio view: ${portfolioValueTf} (chart data follows account snapshot until historical ranges are wired)`}
                >
                  <HeroSparkline
                    portfolioValue={snapshotValueNum || currentValue}
                    changePct={displayPct}
                    chartPath={ytdChartPath}
                    axisLabels={monthSnapshots.map((mm) => mm.label)}
                  />
                </div>

                <div style={{ height: 1, background: 'rgba(16,185,129,0.08)', margin: '0 -1.25rem 0.65rem' }} />

                <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--home-muted)', margin: '0 0 0.5rem' }}>
                  Top Holdings
                </p>

                {enrichedHoldings.length === 0 ? (
                  <p style={{ fontSize: '0.75rem', color: 'var(--home-muted)', margin: 0 }}>
                    No positions yet — start mock trading to see holdings here.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {enrichedHoldings.slice(0, 6).map((h) => {
                      const symbol = h.symbol ?? h.ticker ?? '?';
                      let pnlPct = h.pnlPct ?? h.pctChange;
                      if (pnlPct == null && h.costBasis > 0 && (h.value ?? h.posValue) != null) {
                        const val = h.posValue ?? h.value ?? 0;
                        pnlPct = ((val - h.costBasis) / h.costBasis) * 100;
                      }
                      if (typeof pnlPct !== 'number' || Number.isNaN(pnlPct)) pnlPct = 0;
                      const posValue = h.posValue ?? h.value ?? 0;
                      const isPos = pnlPct >= 0;
                      const dotColor = h.color || tickerColor(symbol);
                      return (
                        <div
                          key={symbol}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.3rem 0.5rem',
                            borderRadius: '6px',
                            background: isPos ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
                            borderLeft: `3px solid ${isPos ? '#10b981' : '#ef4444'}`,
                          }}
                        >
                          <span style={{ width: 7, height: 7, borderRadius: '2px', background: dotColor, flexShrink: 0 }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--home-heading)' }}>{symbol}</span>
                          </div>
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              color: isPos ? '#10b981' : '#ef4444',
                              flexShrink: 0,
                              minWidth: 48,
                              textAlign: 'right',
                            }}
                          >
                            {isPos ? '+' : ''}
                            {pnlPct.toFixed(2)}%
                          </span>
                          <span style={{ fontSize: '0.5625rem', color: 'var(--home-muted)', flexShrink: 0, minWidth: 44, textAlign: 'right' }}>
                            $
                            {posValue >= 1000
                              ? `${(posValue / 1000).toFixed(1)}K`
                              : posValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                  <div
                    className="db-card-header hts-events-header"
                    style={{ padding: '0.75rem 1.25rem' }}
                  >
                    <h3 style={{ margin: 0 }}>Upcoming Events &amp; Alerts</h3>
                    <div className="hts-events-filter-row" role="tablist" aria-label="Event category filter">
                      {availableFilters.map((f) => (
                        <button
                          key={f.key}
                          type="button"
                          role="tab"
                          aria-selected={eventFilter === f.key}
                          className={`hts-events-filter-chip${eventFilter === f.key ? ' is-active' : ''}`}
                          onClick={() => setEventFilter(f.key)}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="hts-card-body home-events-compact-body">
                    {(eventsErrors?.length > 0 || eventsRateLimited) && (
                      <div className="hts-events-warn">
                        <i className="bi bi-exclamation-triangle" aria-hidden />
                        <span>
                          {eventsRateLimited
                            ? 'Refreshing soon…'
                            : `Some feeds didn't load: ${eventsErrors.map((e) => e.split(':')[0]).join(', ')}`}
                        </span>
                      </div>
                    )}
                    <div className="hts-events-grid-calendar">
                      <div className="hts-events-grid-left">
                        {eventsLoading && upcomingCalendar.eventsSource.length === 0 ? (
                          <div className="hts-events-loading">
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                              <div key={i} className="hts-events-skeleton" />
                            ))}
                          </div>
                        ) : upcomingCalendar.totalVisible === 0 ? (
                          <div className="hts-events-empty">
                            <i
                              className={
                                relevanceEmpty || relevance?.isEmpty
                                  ? 'bi bi-eye'
                                  : 'bi bi-calendar-event'
                              }
                              aria-hidden
                            />
                            {relevanceEmpty || relevance?.isEmpty ? (
                              <>
                                <p style={{ marginBottom: '0.25rem', fontWeight: 600 }}>
                                  Nothing to watch yet
                                </p>
                                <p style={{ fontSize: '0.75rem', opacity: 0.75, maxWidth: 320, margin: '0 auto' }}>
                                  Add companies to your portfolio, or follow tickers, politicians,
                                  crypto, or commodities on the Watchlist page to see upcoming
                                  events tailored to you.
                                </p>
                                <div
                                  style={{
                                    display: 'flex',
                                    gap: '0.5rem',
                                    justifyContent: 'center',
                                    marginTop: '0.75rem',
                                  }}
                                >
                                  <Link
                                    href="/watchlist"
                                    className="hts-events-empty-cta"
                                  >
                                    Go to watchlists
                                  </Link>
                                  <Link
                                    href="/trading/mock"
                                    className="hts-events-empty-cta"
                                  >
                                    Build portfolio
                                  </Link>
                                </div>
                              </>
                            ) : upcomingCalendar.totalAll === 0 ? (
                              <p>
                                No upcoming events for your holdings or watchlists in the
                                remainder of the month. Economic events for your region will
                                appear here when scheduled.
                              </p>
                            ) : (
                              <p>
                                No{' '}
                                {EVENT_FILTERS.find((f) => f.key === eventFilter)?.label.toLowerCase()}{' '}
                                events in this window.
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="hts-events-day-list">
                            {upcomingCalendar.dayGroups.map((group) => (
                              <div key={group.day} className="hts-events-day-group">
                                <div className="hts-events-day-label">
                                  <span>{group.label}</span>
                                  <span className="hts-events-day-count">{group.items.length}</span>
                                </div>
                                <div className="hts-events-3x4-grid">
                                  {group.items.map((ev) => (
                                    <div
                                      key={ev.id}
                                      className="hts-events-grid-cell"
                                      style={{
                                        background: `${ev.color}12`,
                                        border: `1px solid ${ev.color}30`,
                                      }}
                                      title={ev.subtitle || ev.title}
                                    >
                                      <div className="hts-events-grid-cell-head">
                                        <span className="hts-events-grid-icon" aria-hidden>
                                          {ev.icon}
                                        </span>
                                        <span
                                          className="hts-events-grid-date"
                                          style={{ color: ev.color }}
                                        >
                                          {(() => {
                                            const [, em, ed] = String(ev.fullDate).slice(0, 10).split('-').map(Number);
                                            return `${MONTH_SHORT[em - 1]} ${ed}`;
                                          })()}
                                        </span>
                                        {ev.impact === 'High' && (
                                          <span className="hts-events-impact-pill high">High</span>
                                        )}
                                      </div>
                                      <p className="hts-events-grid-title">{ev.title}</p>
                                      <p className="hts-events-grid-time">
                                        {ev.subtitle ? ev.subtitle : ev.time}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
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
                  className="db-card home-streak-ezana-merged streak-card component-card"
                  style={{
                    padding: '16px 20px',
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    background: 'var(--card-bg, #fff)',
                    border: '1px solid var(--card-border, rgba(16, 185, 129, 0.12))',
                    borderRadius: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 auto', minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '32px',
                          lineHeight: 1,
                          filter: 'drop-shadow(0 0 8px rgba(251, 146, 60, 0.6))',
                        }}
                        aria-hidden
                      >
                        🔥
                      </div>
                      <div>
                        <div style={{ fontSize: '22px', fontWeight: 700, color: '#f97316', lineHeight: 1 }}>{streakDays}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary, var(--home-muted-soft))', marginTop: '2px' }}>
                          Day Streak
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginLeft: 'auto', flexShrink: 0 }}>
                        {Array.from({ length: 7 }).map((_, i) => (
                          <div
                            key={i}
                            style={{
                              width: '6px',
                              height: '24px',
                              borderRadius: '3px',
                              background: i < streakDays ? '#f97316' : 'var(--card-border, rgba(16, 185, 129, 0.15))',
                              opacity: 0.4 + (i / 7) * 0.6,
                            }}
                          />
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
                    <span style={{ fontSize: '0.625rem', color: 'var(--home-muted)', fontWeight: 500 }}>Latest disclosures</span>
                  </div>
                  <div style={{ padding: '0 1.25rem 1rem' }}>
                    {congressLoading && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--home-muted)', padding: '0.5rem 0', margin: 0 }}>
                        Loading trades…
                      </p>
                    )}

                    {!congressLoading && congressTrades.length === 0 && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--home-muted)', padding: '0.5rem 0', margin: 0 }}>
                        No recent trades available.
                      </p>
                    )}

                    {!congressLoading &&
                      congressTrades.map((row, i) => {
                        const initialsStr = row.name
                          .split(' ')
                          .filter(Boolean)
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase();

                        return (
                          <div
                            key={`${row.name}-${row.sym}-${i}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem 0',
                              borderBottom:
                                i < congressTrades.length - 1 ? '1px solid rgba(16, 185, 129, 0.04)' : 'none',
                            }}
                          >
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: '50%',
                                background: 'rgba(16, 185, 129, 0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.6rem',
                                fontWeight: 800,
                                color: '#10b981',
                                flexShrink: 0,
                              }}
                            >
                              {initialsStr}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p
                                style={{
                                  color: 'var(--home-heading)',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  margin: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {row.name}
                              </p>
                              <p style={{ color: 'var(--home-muted)', fontSize: '0.625rem', margin: 0 }}>
                                {row.chamber} · {row.relDate}
                              </p>
                            </div>

                            {row.sym && (
                              <span
                                style={{
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                  fontSize: '0.625rem',
                                  fontWeight: 700,
                                  background: row.isSell ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                  color: row.isSell ? '#ef4444' : '#10b981',
                                  flexShrink: 0,
                                }}
                              >
                                {row.sym}
                              </span>
                            )}

                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: '0.6875rem',
                                  fontWeight: 700,
                                  color: row.isSell ? '#ef4444' : '#10b981',
                                }}
                              >
                                {row.isSell ? 'SELL' : 'BUY'}
                              </p>
                              <p style={{ margin: 0, fontSize: '0.5625rem', color: 'var(--home-muted)' }}>
                                {row.amount}
                              </p>
                            </div>
                          </div>
                        );
                      })}

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
                      View All <i className="bi bi-chevron-right" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="home-rail-movers">
              <div
                className="db-card home-top-movers-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  flex: 1,
                  minHeight: 0,
                  alignSelf: 'stretch',
                }}
              >
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
                      margin: '0.25rem 0 0.35rem',
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
                        padding: '0.35rem 0',
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
                      margin: '0.5rem 0 0.35rem',
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
                        padding: '0.35rem 0',
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
              </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
