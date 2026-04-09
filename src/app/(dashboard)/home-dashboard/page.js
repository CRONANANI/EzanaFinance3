'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useOrg } from '@/contexts/OrgContext';
import { HeroSparkline } from '@/components/dashboard/HeroSparkline';
import { HERO_DATA } from '@/lib/dashboard-hero-data';
import { usePlaidPortfolioSummary } from '@/hooks/usePlaidPortfolioSummary';
import { supabase } from '@/lib/supabase';
import { IntIcon } from '@/components/ui/interactive-animated-arrow-icon';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import './home-dashboard.css';

const HOLDINGS_PAGE_SIZE = 6;
const LOTTIE_ARROW_LEFT =
  'https://res.cloudinary.com/dhdupwqli/raw/upload/arrowLeftCircle_yevrp4.json';
const LOTTIE_ARROW_RIGHT =
  'https://res.cloudinary.com/dhdupwqli/raw/upload/arrowRightCircle_zf9kg7.json';

const HOLDING_PALETTE = [
  '#4285F4',
  '#00a4ef',
  '#e50914',
  '#cc0000',
  '#0082fb',
  '#96bf48',
  '#76b900',
  '#f59e0b',
  '#a78bfa',
  '#ec4899',
];

function holdingColor(ticker) {
  const t = ticker || '';
  let h = 0;
  for (let i = 0; i < t.length; i++) h += t.charCodeAt(i);
  return HOLDING_PALETTE[h % HOLDING_PALETTE.length];
}

/* ═══════════════════════════════════════════════════════════
   TIMEFRAME-AWARE DATA — Hero + Holdings update when 1D/1M/6M/1Y clicked
   (Current Value dollar amount uses live Plaid summary when connected — see currentValue)
   ═══════════════════════════════════════════════════════════ */

const HOLDINGS_DATA = {
  '1D': [
    { ticker: 'GOOGL', name: 'Google', price: 1320.00, change: 4.12, changeDollar: 52.40, qty: 7, color: '#4285F4' },
    { ticker: 'MSFT', name: 'Microsoft', price: 1120.00, change: 3.25, changeDollar: 35.40, qty: 10, color: '#00a4ef' },
    { ticker: 'NFLX', name: 'Netflix', price: 980.00, change: 2.10, changeDollar: 20.10, qty: 6, color: '#e50914' },
    { ticker: 'TSLA', name: 'Tesla', price: 760.00, change: 1.85, changeDollar: 13.80, qty: 5, color: '#cc0000' },
    { ticker: 'META', name: 'Meta', price: 740.00, change: -1.45, changeDollar: -10.85, qty: 9, color: '#0082fb', worst: true },
    { ticker: 'SHOP', name: 'Shopify', price: 610.00, change: -2.30, changeDollar: -14.40, qty: 11, color: '#96bf48', worst: true },
    { ticker: 'NVDA', name: 'NVIDIA', price: 140.00, change: 2.50, changeDollar: 40.00, qty: 4, color: '#76b900' },
    { ticker: 'AAPL', name: 'Apple', price: 195.00, change: 1.20, changeDollar: 24.00, qty: 5, color: '#999999' },
    { ticker: 'AMZN', name: 'Amazon', price: 175.00, change: 0.80, changeDollar: 16.00, qty: 3, color: '#ff9900' },
  ],
  '1M': [
    { ticker: 'GOOGL', name: 'Google', price: 1320.00, change: 8.70, changeDollar: 105.60, qty: 7, color: '#4285F4' },
    { ticker: 'MSFT', name: 'Microsoft', price: 1120.00, change: 6.40, changeDollar: 67.20, qty: 10, color: '#00a4ef' },
    { ticker: 'TSLA', name: 'Tesla', price: 760.00, change: 5.20, changeDollar: 37.50, qty: 5, color: '#cc0000' },
    { ticker: 'NFLX', name: 'Netflix', price: 980.00, change: 3.80, changeDollar: 35.90, qty: 6, color: '#e50914' },
    { ticker: 'META', name: 'Meta', price: 740.00, change: -3.20, changeDollar: -24.50, qty: 9, color: '#0082fb', worst: true },
    { ticker: 'SHOP', name: 'Shopify', price: 610.00, change: -5.10, changeDollar: -32.80, qty: 11, color: '#96bf48', worst: true },
    { ticker: 'NVDA', name: 'NVIDIA', price: 140.00, change: 6.20, changeDollar: 35.00, qty: 4, color: '#76b900' },
    { ticker: 'AAPL', name: 'Apple', price: 195.00, change: 4.10, changeDollar: 20.00, qty: 5, color: '#999999' },
    { ticker: 'AMZN', name: 'Amazon', price: 175.00, change: 3.20, changeDollar: 14.00, qty: 3, color: '#ff9900' },
  ],
  '6M': [
    { ticker: 'GOOGL', name: 'Google', price: 1320.00, change: 22.40, changeDollar: 241.60, qty: 7, color: '#4285F4' },
    { ticker: 'MSFT', name: 'Microsoft', price: 1120.00, change: 18.90, changeDollar: 178.20, qty: 10, color: '#00a4ef' },
    { ticker: 'NFLX', name: 'Netflix', price: 980.00, change: 14.50, changeDollar: 124.20, qty: 6, color: '#e50914' },
    { ticker: 'TSLA', name: 'Tesla', price: 760.00, change: 12.10, changeDollar: 82.00, qty: 5, color: '#cc0000' },
    { ticker: 'SHOP', name: 'Shopify', price: 610.00, change: -8.60, changeDollar: -57.60, qty: 11, color: '#96bf48', worst: true },
    { ticker: 'META', name: 'Meta', price: 740.00, change: -4.30, changeDollar: -33.20, qty: 9, color: '#0082fb', worst: true },
    { ticker: 'NVDA', name: 'NVIDIA', price: 140.00, change: 18.00, changeDollar: 28.00, qty: 4, color: '#76b900' },
    { ticker: 'AAPL', name: 'Apple', price: 195.00, change: 12.00, changeDollar: 18.00, qty: 5, color: '#999999' },
    { ticker: 'AMZN', name: 'Amazon', price: 175.00, change: 10.00, changeDollar: 12.00, qty: 3, color: '#ff9900' },
  ],
  '1Y': [
    { ticker: 'GOOGL', name: 'Google', price: 1320.00, change: 38.50, changeDollar: 368.40, qty: 7, color: '#4285F4' },
    { ticker: 'MSFT', name: 'Microsoft', price: 1120.00, change: 32.20, changeDollar: 273.60, qty: 10, color: '#00a4ef' },
    { ticker: 'NFLX', name: 'Netflix', price: 980.00, change: 28.70, changeDollar: 218.40, qty: 6, color: '#e50914' },
    { ticker: 'TSLA', name: 'Tesla', price: 760.00, change: 24.50, changeDollar: 142.80, qty: 5, color: '#cc0000' },
    { ticker: 'META', name: 'Meta', price: 740.00, change: -12.40, changeDollar: -105.20, qty: 9, color: '#0082fb', worst: true },
    { ticker: 'SHOP', name: 'Shopify', price: 610.00, change: -18.70, changeDollar: -133.60, qty: 11, color: '#96bf48', worst: true },
    { ticker: 'NVDA', name: 'NVIDIA', price: 140.00, change: 42.00, changeDollar: 55.00, qty: 4, color: '#76b900' },
    { ticker: 'AAPL', name: 'Apple', price: 195.00, change: 28.00, changeDollar: 32.00, qty: 5, color: '#999999' },
    { ticker: 'AMZN', name: 'Amazon', price: 175.00, change: 22.00, changeDollar: 18.00, qty: 3, color: '#ff9900' },
  ],
};

const CHART_PATHS = {
  '1D': 'M0,65 C40,60 80,45 120,50 C160,55 200,35 240,30 C280,25 320,40 360,20 C400,15 440,25 480,10',
  '1M': 'M0,70 C40,65 80,55 120,60 C160,50 200,45 240,35 C280,40 320,30 360,25 C400,20 440,15 480,10',
  '6M': 'M0,75 C40,70 80,60 120,55 C160,65 200,50 240,40 C280,35 320,25 360,30 C400,20 440,12 480,8',
  '1Y': 'M0,80 C40,75 80,70 120,60 C160,55 200,65 240,45 C280,35 320,40 360,25 C400,18 440,12 480,5',
};

const WATCHLIST = [
  { ticker: 'NVDA', name: 'NVIDIA Corp.', price: 954.7, change: 3.12 },
  { ticker: 'AAPL', name: 'Apple Inc.', price: 198.32, change: 1.27 },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', price: 174.66, change: 0.84 },
  { ticker: 'UBER', name: 'Uber Technologies', price: 954.7, change: 3.12 },
  { ticker: 'SONY', name: 'Sony Group Corp.', price: 954.7, change: 3.12 },
];

const SECTOR_DATA_DEFAULT = [
  { name: 'Energy', pct: 45, value: 38096.0, color: '#10b981' },
  { name: 'Technology', pct: 20, value: 18404.0, color: '#3b82f6' },
  { name: 'Telecom', pct: 25, value: 30200.0, color: '#a78bfa' },
  { name: 'Healthcare', pct: 10, value: 9202.0, color: '#fbbf24' },
];

/** Demo account: extra sector so the card reads full */
const SECTOR_DATA_DEMO = [
  { name: 'Energy', pct: 40, value: 33800.0, color: '#10b981' },
  { name: 'Technology', pct: 20, value: 18404.0, color: '#3b82f6' },
  { name: 'Telecom', pct: 18, value: 21744.0, color: '#a78bfa' },
  { name: 'Healthcare', pct: 10, value: 9202.0, color: '#fbbf24' },
  { name: 'Manufacturing', pct: 12, value: 10140.0, color: '#ec4899' },
];

/** TMT team: industry-level breakdown instead of broad sectors */
const TMT_INDUSTRY_DATA = [
  { name: 'Software', detail: 'SaaS, AI', pct: 32, value: 63584.0, color: '#3b82f6' },
  { name: 'Hardware', detail: 'Devices, Semiconductors', pct: 38, value: 75506.0, color: '#10b981' },
  { name: 'Media', detail: 'Streaming, Advertising, Gaming', pct: 19, value: 37753.0, color: '#a78bfa' },
  { name: 'Telecommunications', detail: '5G, Internet Services', pct: 11, value: 21857.0, color: '#f59e0b' },
];

const PROFIT_BREAKDOWN = [
  { label: 'Stocks', pct: 45, color: '#10b981' },
  { label: 'Funds', pct: 20, color: '#3b82f6' },
  { label: 'ETFs', pct: 25, color: '#a78bfa' },
  { label: 'Crypto', pct: 10, color: '#fbbf24' },
];

const RECENT_TRANSACTIONS = [
  { company: 'Meta', ticker: 'META', date: '10 Dec 2025', amount: 954.7, positive: true, txId: '#784512372' },
  { company: 'Uber', ticker: 'UBER', date: '10 Dec 2025', amount: 954.7, positive: false, txId: '#784512371' },
  { company: 'NVIDIA', ticker: 'NVDA', date: '09 Dec 2025', amount: 954.7, positive: true, txId: '#784512370' },
  { company: 'Apple', ticker: 'AAPL', date: '08 Dec 2025', amount: 1240.5, positive: true, txId: '#784512369' },
  { company: 'Microsoft', ticker: 'MSFT', date: '07 Dec 2025', amount: 980.75, positive: true, txId: '#784512368' },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatLongDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/* ═══════════════════════════════════════════════════════════
   DONUT CHART COMPONENT
   ═══════════════════════════════════════════════════════════ */
function DonutChart({ segments, size = 160, strokeWidth = 22, centerValue, centerLabel }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="db-donut-wrap" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="db-donut-svg">
        {segments.map((seg, i) => {
          const dash = (seg.pct / 100) * circumference;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              key={i}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke={seg.color} strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          );
        })}
      </svg>
      <div className="db-donut-center">
        <span className="db-donut-value">{centerValue}</span>
        {centerLabel && <span className="db-donut-label">{centerLabel}</span>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN DASHBOARD PAGE
   ═══════════════════════════════════════════════════════════ */
export default function HomeDashboardPage() {
  const { user } = useAuth();
  const { isOrgUser, orgRole, orgData } = useOrg();
  const { connected: plaidConnected, summary: plaidSummary, isLoading: plaidSummaryLoading } =
    usePlaidPortfolioSummary();
  const [timeframe, setTimeframe] = useState('1D');
  const [liveQuotes, setLiveQuotes] = useState({});
  const [plaidHoldingsPayload, setPlaidHoldingsPayload] = useState(null);
  const [holdingsPage, setHoldingsPage] = useState(0);
  const heroData = HERO_DATA[timeframe];
  const chartPath = CHART_PATHS[timeframe];

  const mock = useMockPortfolio();
  const useMock = mock.hasMockPortfolio;

  const useLiveHoldings =
    !!plaidHoldingsPayload?.connected && (plaidHoldingsPayload?.aggregated?.length ?? 0) > 0;

  const normalizedHoldings = useMemo(() => {
    if (useMock && mock.enrichedPositions.length === 0) {
      return [];
    }
    if (useMock && mock.enrichedPositions.length > 0) {
      return mock.enrichedPositions.map((pos) => ({
        ticker: pos.symbol,
        name: pos.name,
        qty: pos.qty,
        price: pos.currentPrice,
        positionValue: pos.posValue,
        change: pos.dayChangePct,
        changeDollar: pos.dayChange,
        color: holdingColor(pos.symbol),
        worst: pos.dayChangePct < 0,
      }));
    }
    if (useLiveHoldings) {
      return (plaidHoldingsPayload.aggregated || [])
        .map((h) => {
          const ticker = h.ticker;
          const q = liveQuotes[ticker];
          const qty = Number(h.totalQuantity) || 0;
          const priceFromQuote = q?.price != null ? Number(q.price) : null;
          const lastPrice = h.lastPrice != null ? Number(h.lastPrice) : null;
          const totalFromApi = Number(h.totalValue) || 0;
          const price =
            priceFromQuote != null
              ? priceFromQuote
              : lastPrice != null
                ? lastPrice
                : qty > 0
                  ? totalFromApi / qty
                  : 0;
          const positionValue =
            priceFromQuote != null && qty > 0
              ? priceFromQuote * qty
              : totalFromApi > 0
                ? totalFromApi
                : price * qty;
          const ch = q != null ? q.changePercent : 0;
          const changeDollar = q != null && qty ? (q.change ?? 0) * qty : 0;
          return {
            ticker,
            name: h.name || ticker,
            qty,
            price,
            positionValue,
            change: ch,
            changeDollar,
            color: holdingColor(ticker),
            worst: ch < 0,
          };
        })
        .sort((a, b) => b.positionValue - a.positionValue);
    }
    const raw = HOLDINGS_DATA[timeframe];
    return raw
      .map((h) => {
        const q = liveQuotes[h.ticker];
        const price = q?.price ?? h.price;
        const qty = h.qty;
        const positionValue = price * qty;
        const ch = q != null ? q.changePercent : h.change;
        const changeDollar =
          q != null && h.qty != null ? (q.change ?? 0) * h.qty : h.changeDollar;
        return {
          ticker: h.ticker,
          name: h.name,
          qty,
          price,
          positionValue,
          change: ch,
          changeDollar,
          color: h.color,
          worst: h.worst,
        };
      })
      .sort((a, b) => b.positionValue - a.positionValue);
  }, [useMock, mock.enrichedPositions, useLiveHoldings, plaidHoldingsPayload, timeframe, liveQuotes]);

  const holdingsPageCount = Math.max(1, Math.ceil(normalizedHoldings.length / HOLDINGS_PAGE_SIZE));
  const canHoldingsPrev = holdingsPage > 0;
  const canHoldingsNext = holdingsPage < holdingsPageCount - 1;
  const pagedHoldings = useMemo(
    () =>
      normalizedHoldings.slice(
        holdingsPage * HOLDINGS_PAGE_SIZE,
        holdingsPage * HOLDINGS_PAGE_SIZE + HOLDINGS_PAGE_SIZE,
      ),
    [normalizedHoldings, holdingsPage],
  );

  useEffect(() => {
    setHoldingsPage(0);
  }, [timeframe, useLiveHoldings, plaidHoldingsPayload?.aggregated?.length]);

  const currentValue = useMock
    ? mock.totalValue
    : !plaidSummaryLoading && plaidConnected
      ? (plaidSummary?.totalValue ?? 0)
      : heroData.value;

  useEffect(() => {
    const fromPlaid = (plaidHoldingsPayload?.aggregated || []).map((h) => h.ticker).filter(Boolean);
    const fromMock = useMock ? Object.keys(mock.portfolio?.positions || {}) : [];
    const tickers = [
      ...new Set([
        ...Object.values(HOLDINGS_DATA)
          .flat()
          .map((h) => h.ticker),
        ...fromPlaid,
        ...fromMock,
        ...WATCHLIST.map((w) => w.ticker),
        ...RECENT_TRANSACTIONS.map((t) => t.ticker).filter(Boolean),
      ]),
    ];
    let cancelled = false;
    const load = () => {
      fetch(`/api/market/batch-quotes?symbols=${tickers.join(',')}`)
        .then((r) => (r.ok ? r.json() : {}))
        .then((d) => {
          if (!cancelled) setLiveQuotes(d.quotes || {});
        })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [plaidHoldingsPayload, useMock, mock.portfolio?.positions]);

  const userName = user?.user_metadata?.first_name
    || user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Investor';

  const greeting = getGreeting();

  const isTmtTeamMember =
    isOrgUser &&
    orgData?.team?.slug === 'technology-media-telecom' &&
    (orgRole === 'analyst' || orgRole === 'portfolio_manager');

  const sectorRows = useMemo(() => {
    if (useMock && mock.sectorData.length > 0) return mock.sectorData;
    if (isTmtTeamMember) return TMT_INDUSTRY_DATA;
    if (user?.email === 'axmabeto@gmail.com') return SECTOR_DATA_DEMO;
    return SECTOR_DATA_DEFAULT;
  }, [useMock, mock.sectorData, user?.email, isTmtTeamMember]);

  useEffect(() => {
    if (!user) {
      setPlaidHoldingsPayload(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch('/api/plaid/holdings', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!cancelled) setPlaidHoldingsPayload(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="db-page dashboard-page-inset">
      {/* ═══ GREETING ═══ */}
      <div className="db-greeting-section">
        <div>
          <h1 className="db-greeting">
            {greeting}, {userName}{' '}
            <span className="db-greeting-waving" aria-hidden>
              <i className="bi bi-hand-thumbs-up" />
            </span>
          </h1>
          <p className="db-greeting-sub">
            {useMock ? (
              mock.totalPnl >= 0 ? (
                <>
                  Your mock portfolio is up{' '}
                  <strong className="db-greeting-highlight">+{mock.totalPnlPct.toFixed(2)}%</strong> since you started — paper trading!
                </>
              ) : (
                <>
                  Your mock portfolio is down{' '}
                  <strong className="db-greeting-highlight">{mock.totalPnlPct.toFixed(2)}%</strong> — adjust your strategy!
                </>
              )
            ) : heroData.change >= 0 ? (
              <>Today you amassed a <strong className="db-greeting-highlight">+{heroData.change}% increase</strong> in your portfolio holdings</>
            ) : (
              <>Markets are down <strong className="db-greeting-highlight">{Math.abs(heroData.change)}%</strong> today — stay the course, long-term wins</>
            )}
          </p>
          <p className="db-greeting-date">{formatLongDate()}</p>
        </div>
      </div>

      {/* ═══ HERO: Portfolio Value Card ═══ */}
      <div className="db-hero-card">
        <div className="db-hero-left">
          <div className="db-hero-top">
            <div>
              <span className="db-hero-label">Current Value <i className="bi bi-arrow-up-right" /></span>
              <div className="db-hero-value">
                ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <span
                className={`db-hero-change ${(useMock ? mock.totalPnlPct : heroData.change) >= 0 ? 'positive' : 'negative'}`}
              >
                {useMock
                  ? `${mock.totalPnlPct >= 0 ? '+' : ''}${mock.totalPnlPct.toFixed(2)}%`
                  : `${heroData.change >= 0 ? '+' : ''}${heroData.change}%`}
                <span className="db-hero-change-amt">
                  {useMock
                    ? `${mock.totalPnl >= 0 ? '+' : '-'}$${Math.abs(mock.totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : `${heroData.changeDollar >= 0 ? '+' : ''}$${heroData.changeDollar.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                </span>
              </span>
            </div>
            <div className="db-hero-timeframes">
              {['1D', '1M', '6M', '1Y'].map((tf) => (
                <button
                  key={tf}
                  className={`db-tf-btn ${timeframe === tf ? 'active' : ''}`}
                  onClick={() => setTimeframe(tf)}
                >{tf}</button>
              ))}
            </div>
          </div>

          {/* Mini stats row */}
          <div className="db-hero-stats">
            <div className="db-hero-stat">
              <span className="db-hero-stat-label">
                {useMock ? 'Open Positions' : 'Total Companies'} <i className="bi bi-arrow-up-right" />
              </span>
              <span className="db-hero-stat-value">
                {useMock ? mock.enrichedPositions.length : heroData.companies}
              </span>
            </div>
            <div className="db-hero-stat">
              <span className="db-hero-stat-label">Cash Balance <i className="bi bi-arrow-up-right" /></span>
              <span className="db-hero-stat-value">
                $
                {useMock
                  ? mock.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : heroData.cash.toLocaleString()}
              </span>
            </div>
            <div className="db-hero-stat">
              <span className="db-hero-stat-label">
                {useMock ? 'Total P&L' : 'Committed Cash'} <i className="bi bi-arrow-up-right" />
              </span>
              <span
                className="db-hero-stat-value"
                style={useMock ? { color: mock.totalPnl >= 0 ? '#10b981' : '#ef4444' } : {}}
              >
                {useMock
                  ? `${mock.totalPnl >= 0 ? '+' : ''}$${Math.abs(mock.totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `$${heroData.committed.toLocaleString()}`}
              </span>
            </div>
          </div>
        </div>

        {/* Chart area */}
        <HeroSparkline
          portfolioValue={currentValue}
          changePct={useMock ? mock.totalPnlPct : heroData.change}
          chartPath={chartPath}
        />
      </div>

      {/* ═══ ROW 2: Portfolios + Watchlist ═══ */}
      <div className="db-row-2">
        {/* My Holdings */}
        <div className="db-card db-portfolios-card">
          <div className="db-card-header">
            <div className="db-holdings-header-left">
              <button
                type="button"
                className="db-holdings-nav-btn"
                disabled={!canHoldingsPrev}
                onClick={() => setHoldingsPage((p) => Math.max(0, p - 1))}
                aria-label="Previous holdings"
              >
                <IntIcon
                  animationData={LOTTIE_ARROW_LEFT}
                  color="#10b981"
                  playOnClick
                  size={44}
                />
              </button>
              <h3>My Holdings</h3>
              <button
                type="button"
                className="db-holdings-nav-btn"
                disabled={!canHoldingsNext}
                onClick={() => setHoldingsPage((p) => Math.min(holdingsPageCount - 1, p + 1))}
                aria-label="Next holdings"
              >
                <IntIcon
                  animationData={LOTTIE_ARROW_RIGHT}
                  color="#10b981"
                  playOnClick
                  size={44}
                />
              </button>
            </div>
            <div className="db-card-header-right">
              <div className="db-tf-group-sm">
                {['1D', '1M', '6M', '1Y'].map((tf) => (
                  <button key={tf} className={`db-tf-btn-sm ${timeframe === tf ? 'active' : ''}`} onClick={() => setTimeframe(tf)}>{tf}</button>
                ))}
              </div>
              <button className="db-icon-btn" title="Export"><i className="bi bi-box-arrow-up-right" /></button>
            </div>
          </div>
          <div className="db-portfolio-grid">
            {pagedHoldings.length === 0 ? (
              <p className="db-holdings-empty">No holdings to display. Link an account to see positions here.</p>
            ) : (
              pagedHoldings.map((h) => {
                const ch = Number(h.change);
                const chSafe = Number.isFinite(ch) ? ch : 0;
                return (
                  <Link
                    key={h.ticker}
                    href={`/company-research?ticker=${h.ticker}`}
                    className={`db-holding-card db-holding-card-link ${chSafe >= 0 ? 'db-holding-positive' : 'db-holding-negative'}`}
                  >
                    <div className="db-holding-top">
                      <span className="db-holding-dot" style={{ background: h.color }} />
                      <div className="db-holding-info">
                        <div className="db-holding-title-row">
                          <span className="db-holding-label">
                            {h.name} ({h.ticker})
                          </span>
                          <span className="db-holding-per-share">
                            ${h.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                            per share
                          </span>
                        </div>
                        <span className="db-holding-value">
                          $
                          {h.positionValue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        <span className={`db-holding-change ${chSafe >= 0 ? 'positive' : 'negative'}`}>
                          {chSafe >= 0 ? '+' : ''}
                          {chSafe.toFixed(2)}% ({h.changeDollar >= 0 ? '+' : ''}$
                          {Math.abs(h.changeDollar).toFixed(2)})
                        </span>
                        <span className="db-holding-qty">Quantity: {h.qty}</span>
                      </div>
                    </div>
                    {h.worst && <span className="db-holding-worst-badge">Underperforming</span>}
                    <span className="db-holding-view-details">View Details</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Watchlist */}
        <div className="db-card db-watchlist-card">
          <div className="db-card-header">
            <h3>Watchlist</h3>
            <button className="db-icon-btn" title="Add"><i className="bi bi-plus-lg" /></button>
          </div>
          <div className="db-watchlist-list">
            {WATCHLIST.length === 0 ? (
              <div className="db-watchlist-empty">
                <i className="bi bi-bookmark" style={{ fontSize: '2rem', color: '#6b7280', marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#8b949e' }}>Empty watchlist — add stocks to track</p>
                <button className="db-icon-btn" style={{ marginTop: '0.75rem' }} title="Add stock"><i className="bi bi-plus-lg" /></button>
              </div>
            ) : (
              WATCHLIST.map((w) => {
                const q = liveQuotes[w.ticker];
                const px = q?.price ?? w.price;
                const ch = q != null ? q.changePercent : w.change;
                return (
                <div key={w.ticker} className="db-watchlist-item">
                  <div className="db-watchlist-left">
                    <div className="db-watchlist-avatar">
                      <span>{w.ticker[0]}</span>
                    </div>
                    <div>
                      <span className="db-watchlist-ticker">{w.ticker}</span>
                      <span className="db-watchlist-name">{w.name}</span>
                    </div>
                  </div>
                  <div className="db-watchlist-right">
                    <span className="db-watchlist-price">${px.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className={`db-watchlist-change ${ch >= 0 ? 'positive' : 'negative'}`}>
                      <i className={`bi ${ch >= 0 ? 'bi-caret-up-fill' : 'bi-caret-down-fill'}`} style={{ fontSize: '0.625rem', marginRight: 2 }} />
                      {ch >= 0 ? '+' : ''}{Number(ch).toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
              })
            )}
          </div>
        </div>
      </div>

      {/* ═══ ROW 3: Profits + Sectors + Transactions ═══ */}
      <div className="db-row-3">
        {/* Total Profits */}
        <div className="db-card db-profits-card">
          <div className="db-card-header">
            <h3>Total Profits</h3>
            <button className="db-icon-btn"><i className="bi bi-box-arrow-up-right" /></button>
          </div>
          <div className="db-profits-body">
            <div className="db-profits-chart-wrap">
              {useMock ? (
                <DonutChart
                  segments={
                    mock.profitBreakdown.length > 0
                      ? mock.profitBreakdown
                      : [{ label: 'Cash', pct: 100, color: '#10b981' }]
                  }
                  size={150}
                  strokeWidth={20}
                  centerValue={`${mock.totalPnl >= 0 ? '+' : '-'}$${Math.abs(mock.totalPnl).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                  centerLabel={`${mock.totalPnlPct >= 0 ? '+' : ''}${mock.totalPnlPct.toFixed(2)}% total`}
                />
              ) : (
                <DonutChart
                  segments={PROFIT_BREAKDOWN}
                  size={150}
                  strokeWidth={20}
                  centerValue="$4,030"
                  centerLabel="-$150.20 from last month"
                />
              )}
            </div>
            <div className="db-profits-legend">
              {(useMock
                ? mock.profitBreakdown.length > 0
                  ? mock.profitBreakdown
                  : [{ label: 'Portfolio', pct: 100, color: '#10b981' }]
                : PROFIT_BREAKDOWN
              ).map((p) => (
                <div key={p.label} className="db-profits-legend-item">
                  <span className="db-legend-dot" style={{ background: p.color }} />
                  <span className="db-legend-label">{p.label}</span>
                  <span className="db-legend-pct">{p.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sector / Industry Distribution */}
        <div className="db-card db-sector-card">
          <div className="db-card-header">
            <h3>{isTmtTeamMember ? 'Industry Distribution' : 'Sector Distribution'}</h3>
            <div className="db-sector-bar-mini">
              {sectorRows.map((s) => (
                <div key={s.name} className="db-sector-bar-seg" style={{ width: `${s.pct}%`, background: s.color }} />
              ))}
            </div>
          </div>
          <div className="db-sector-list db-sector-list--compact">
            {sectorRows.map((s) => (
              <div key={s.name} className="db-sector-item">
                <div className="db-sector-item-left">
                  <span className="db-sector-dot" style={{ background: s.color }} />
                  <div>
                    <span className="db-sector-name">{s.name}</span>
                    {s.detail && <span className="db-sector-detail">{s.detail}</span>}
                    <span className="db-sector-pct">{s.pct}%</span>
                  </div>
                </div>
                <span className="db-sector-value">${s.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="db-card db-transactions-card">
          <div className="db-card-header">
            <h3>Recent Transactions</h3>
            <button className="db-icon-btn"><i className="bi bi-box-arrow-up-right" /></button>
          </div>
          <div className="db-tx-table-header">
            <span>Companies</span>
            <span>Amount</span>
            <span>Transaction ID</span>
          </div>
          <div className="db-tx-list">
            {(useMock ? mock.recentTransactions : RECENT_TRANSACTIONS).map((tx) => {
              const q = tx.ticker ? liveQuotes[tx.ticker] : null;
              return (
              <div key={tx.txId} className="db-tx-item">
                <div className="db-tx-company">
                  <div className="db-tx-avatar"><span>{tx.company[0]}</span></div>
                  <div>
                    <span className="db-tx-name">{tx.company} ({tx.ticker})</span>
                    <span className="db-tx-date">{tx.date}</span>
                    {q && (
                      <span className="db-tx-date" style={{ display: 'block', color: '#9ca3af' }}>
                        Last: ${q.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`db-tx-amount ${tx.positive ? 'positive' : 'negative'}`}>
                  {tx.positive ? '+' : '-'}${tx.amount.toLocaleString()}
                </span>
                <span className="db-tx-id">{tx.txId}</span>
              </div>
            );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
