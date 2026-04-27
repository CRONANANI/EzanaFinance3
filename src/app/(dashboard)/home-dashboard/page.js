'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useOrg } from '@/contexts/OrgContext';
import { HeroSparkline } from '@/components/dashboard/HeroSparkline';
import { HERO_DATA } from '@/lib/dashboard-hero-data';
import { usePlaidPortfolioSummary } from '@/hooks/usePlaidPortfolioSummary';
import { usePortfolioValueSeries } from '@/hooks/usePortfolioValueSeries';
import { supabase } from '@/lib/supabase';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import { useWatchlists } from '@/hooks/useWatchlists';
import './home-dashboard.css';

const HOLDINGS_PAGE_SIZE = 6;

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
   Current Value matches Home + Mock Trading: mock.totalValue or Plaid summary, not
   value-series “last” (server / DB prices can differ from client live total).
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

/**
 * Pie chart showing sector distribution by value. Hovering a segment
 * shows a tooltip with the sector name and exact dollar value.
 */
function SectorPieChart({ sectors, size = 140 }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const total = sectors.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;

  let currentAngle = -Math.PI / 2;
  const wedges = sectors.map((s) => {
    const valueFraction = s.value / total;
    const angle = valueFraction * Math.PI * 2;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    const path =
      sectors.length === 1
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return { path, color: s.color, sector: s, fraction: valueFraction };
  });

  const handleMouseMove = (e, idx) => {
    const wrap = e.currentTarget.closest?.('.db-sector-pie-wrap');
    const rect = wrap?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect();
    setHoveredIdx(idx);
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const hoveredSector = hoveredIdx !== null ? sectors[hoveredIdx] : null;

  return (
    <div className="db-sector-pie-wrap" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="db-sector-pie-svg"
        onMouseLeave={() => setHoveredIdx(null)}
        role="img"
        aria-label="Sector distribution by value"
      >
        {wedges.map((w, i) => (
          <path
            key={i}
            d={w.path}
            fill={w.color}
            className={`db-sector-pie-wedge ${hoveredIdx === i ? 'is-hovered' : ''}`}
            onMouseEnter={(e) => handleMouseMove(e, i)}
            onMouseMove={(e) => handleMouseMove(e, i)}
            onFocus={() => setHoveredIdx(i)}
            onBlur={() => setHoveredIdx(null)}
            tabIndex={0}
            aria-label={`${w.sector.name}: $${w.sector.value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })} (${w.sector.pct}%)`}
          />
        ))}
      </svg>

      {hoveredSector && (
        <div
          className="db-sector-pie-tooltip"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y - 8}px`,
          }}
          role="tooltip"
        >
          <div className="db-sector-pie-tooltip-name">
            <span
              className="db-sector-pie-tooltip-dot"
              style={{ background: hoveredSector.color }}
              aria-hidden
            />
            {hoveredSector.name}
          </div>
          <div className="db-sector-pie-tooltip-value">
            ${hoveredSector.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="db-sector-pie-tooltip-pct">{hoveredSector.pct}% of portfolio</div>
        </div>
      )}
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
  const [timeframe, setTimeframe] = useState('1M');
  const { points: valueSeriesDisplayPoints, dataForCurrentRange, isLoading: valueSeriesLoading, error: valueSeriesError } =
    usePortfolioValueSeries(timeframe);
  const [liveQuotes, setLiveQuotes] = useState({});
  const [plaidHoldingsPayload, setPlaidHoldingsPayload] = useState(null);
  const [holdingsPage, setHoldingsPage] = useState(0);
  const heroData = HERO_DATA[timeframe];

  const mock = useMockPortfolio();
  const useMock = mock.hasMockPortfolio;

  /**
   * Live total must match Home + Mock Trading: mock.totalValue (client + quotes) or
   * Plaid summary — NOT the last point of /api/portfolio/value-series (server uses
   * DB prices and can disagree with the headline).
   */
  const currentValue = useMock
    ? mock.totalValue
    : !plaidSummaryLoading && plaidConnected
      ? (plaidSummary?.totalValue ?? 0)
      : heroData.value;

  const valueWindowFromApi = useMemo(() => {
    const d = dataForCurrentRange;
    if (!d || d.length < 1) return null;
    const liveLast = Number.isFinite(currentValue) ? currentValue : d[d.length - 1].value;
    if (d.length < 2) {
      return {
        last: liveLast,
        changeAbs: 0,
        changePct: 0,
      };
    }
    const first = d[0].value;
    const last = liveLast;
    return {
      last,
      changeAbs: last - first,
      changePct: first > 0 ? ((last - first) / first) * 100 : 0,
    };
  }, [dataForCurrentRange, currentValue]);

  const sparklinePoints = useMemo(() => {
    const pts = valueSeriesDisplayPoints;
    if (!pts?.length || !Number.isFinite(currentValue)) return pts;
    const i = pts.length - 1;
    const lastPt = pts[i];
    if (Math.abs((lastPt?.value ?? 0) - currentValue) < 0.01) return pts;
    return [...pts.slice(0, -1), { ...lastPt, value: currentValue }];
  }, [valueSeriesDisplayPoints, currentValue]);

  const { watchlists: userWatchlists } = useWatchlists();
  const [selectedHomeWatchlistId, setSelectedHomeWatchlistId] = useState(null);

  useEffect(() => {
    if (userWatchlists.length > 0) {
      if (!selectedHomeWatchlistId || !userWatchlists.some((w) => w.id === selectedHomeWatchlistId)) {
        setSelectedHomeWatchlistId(userWatchlists[0].id);
      }
    }
  }, [userWatchlists, selectedHomeWatchlistId]);

  const activeHomeWatchlist = useMemo(() => {
    if (!userWatchlists.length) return null;
    const id = selectedHomeWatchlistId || userWatchlists[0]?.id;
    return userWatchlists.find((w) => w.id === id) || userWatchlists[0];
  }, [userWatchlists, selectedHomeWatchlistId]);

  const watchlistRows = useMemo(() => {
    const stocks = activeHomeWatchlist?.stocks;
    if (stocks?.length) {
      return stocks.map((s) => ({
        ticker: s.ticker,
        name: s.name || s.ticker,
        price: typeof s.price === 'number' ? s.price : 0,
        change: s.changePct ?? s.change ?? 0,
      }));
    }
    return WATCHLIST;
  }, [activeHomeWatchlist]);

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

  /** Total Profits: all positions, largest by market value first (scroll inside card) */
  const totalProfitsRows = useMemo(() => {
    if (useMock && mock.enrichedPositions.length > 0) {
      return [...mock.enrichedPositions]
        .sort((a, b) => b.posValue - a.posValue)
        .map((p) => ({
          symbol: p.symbol,
          posValue: p.posValue,
          pnl: p.pnl,
          pnlPct: p.pnlPct,
          color: p.color,
        }));
    }
    if (normalizedHoldings.length > 0) {
      return [...normalizedHoldings]
        .sort((a, b) => b.positionValue - a.positionValue)
        .map((h) => ({
          symbol: h.ticker,
          posValue: h.positionValue,
          pnl: null,
          pnlPct: h.change,
          dayDelta: h.changeDollar,
          color: h.color,
        }));
    }
    return [];
  }, [useMock, mock.enrichedPositions, normalizedHoldings]);

  const profitDonutSegmentSum = useMemo(
    () => totalProfitsRows.reduce((s, r) => s + (r.posValue || 0), 0) || 1,
    [totalProfitsRows],
  );

  const profitDonutSegments = useMemo(() => {
    if (totalProfitsRows.length > 0) {
      return totalProfitsRows.map((r) => {
        const pv = r.posValue || 0;
        return {
          label: r.symbol,
          pct: (pv / profitDonutSegmentSum) * 100,
          color: r.color,
          value: typeof r.pnl === 'number' && r.pnl > 0 ? r.pnl : 0,
        };
      });
    }
    if (useMock) {
      return mock.profitBreakdown.length
        ? mock.profitBreakdown
        : [{ label: 'No positions yet', pct: 100, color: '#2a2f3a' }];
    }
    return PROFIT_BREAKDOWN;
  }, [totalProfitsRows, profitDonutSegmentSum, useMock, mock.profitBreakdown]);

  const profitPositionWeights = useMemo(() => {
    const sum = totalProfitsRows.reduce((s, r) => s + (r.posValue || 0), 0) || 1;
    return totalProfitsRows.map((r) => ({
      ...r,
      weightPct: ((r.posValue || 0) / sum) * 100,
    }));
  }, [totalProfitsRows]);

  const displayTransactions = useMemo(() => {
    if (useMock) return mock.recentTransactions;
    return [...RECENT_TRANSACTIONS].sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );
  }, [useMock, mock.recentTransactions]);

  useEffect(() => {
    setHoldingsPage(0);
  }, [timeframe, useLiveHoldings, plaidHoldingsPayload?.aggregated?.length]);

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
        ...userWatchlists.flatMap((w) => (w.stocks || []).map((s) => s.ticker).filter(Boolean)),
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
  }, [plaidHoldingsPayload, useMock, mock.portfolio?.positions, userWatchlists]);

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
    // Mock portfolio with positions → use real sector breakdown
    if (useMock && mock.sectorData.length > 0) return mock.sectorData;
    // Mock portfolio loaded but no positions → empty (don't show fake data)
    if (useMock && mock.sectorData.length === 0) return [];
    // Real brokerage connected with holdings → use live Plaid data
    if (useLiveHoldings && mock.sectorData.length > 0) return mock.sectorData;
    // Org TMT team member → show industry breakdown
    if (isTmtTeamMember) return TMT_INDUSTRY_DATA;
    // Demo account
    if (user?.email === 'axmabeto@gmail.com') return SECTOR_DATA_DEMO;
    // No holdings at all (not mock, not Plaid connected) → empty
    if (!useMock && !useLiveHoldings) return [];
    return SECTOR_DATA_DEFAULT;
  }, [useMock, useLiveHoldings, mock.sectorData, user?.email, isTmtTeamMember]);

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
                className={`db-hero-change ${
                  (() => {
                    if (valueWindowFromApi) return valueWindowFromApi.changePct >= 0;
                    return (useMock ? mock.totalPnlPct : heroData.change) >= 0;
                  })()
                    ? 'positive'
                    : 'negative'
                }`}
              >
                {valueWindowFromApi
                  ? `${valueWindowFromApi.changePct >= 0 ? '+' : ''}${valueWindowFromApi.changePct.toFixed(2)}%`
                  : useMock
                    ? `${mock.totalPnlPct >= 0 ? '+' : ''}${mock.totalPnlPct.toFixed(2)}%`
                    : `${heroData.change >= 0 ? '+' : ''}${heroData.change}%`}
                <span className="db-hero-change-amt">
                  {valueWindowFromApi
                    ? `${valueWindowFromApi.changeAbs >= 0 ? '+' : ''}$${valueWindowFromApi.changeAbs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : useMock
                      ? `${mock.totalPnl >= 0 ? '+' : '-'}$${Math.abs(mock.totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : `${heroData.changeDollar >= 0 ? '+' : ''}$${heroData.changeDollar.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                </span>
                {valueWindowFromApi && (
                  <span className="db-hero-tf-pill" style={{ fontSize: '0.65rem', marginLeft: 6, opacity: 0.75 }}>
                    {timeframe}
                  </span>
                )}
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
          seriesPoints={sparklinePoints}
          range={timeframe}
          isLoading={valueSeriesLoading}
          loadError={valueSeriesError}
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
                <i className="bi bi-chevron-left" style={{ color: '#10b981', fontSize: '1rem', cursor: 'pointer' }} />
              </button>
              <h3>My Holdings</h3>
              <button
                type="button"
                className="db-holdings-nav-btn"
                disabled={!canHoldingsNext}
                onClick={() => setHoldingsPage((p) => Math.min(holdingsPageCount - 1, p + 1))}
                aria-label="Next holdings"
              >
                <i className="bi bi-chevron-right" style={{ color: '#10b981', fontSize: '1rem', cursor: 'pointer' }} />
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
                          <span className={`db-holding-per-share ${chSafe >= 0 ? 'positive' : 'negative'}`}>
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
                        <span className="db-holding-qty">
                          Quantity: {Number.isFinite(Number(h.qty)) ? Number(h.qty).toFixed(1) : h.qty}
                        </span>
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
          <div className="db-card-header" style={{ alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>Watchlist</h3>
            {userWatchlists.length > 0 && (
              <select
                value={selectedHomeWatchlistId || userWatchlists[0]?.id || ''}
                onChange={(e) => setSelectedHomeWatchlistId(e.target.value)}
                style={{
                  background: 'rgba(16, 185, 129, 0.06)',
                  border: '1px solid rgba(16, 185, 129, 0.15)',
                  borderRadius: '6px',
                  color: 'var(--text-primary, #f0f6fc)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.3rem 0.5rem',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {userWatchlists.map((wl) => (
                  <option key={wl.id} value={wl.id}>{wl.label}</option>
                ))}
              </select>
            )}
            <button className="db-icon-btn" title="Add" style={{ marginLeft: 'auto' }}><i className="bi bi-plus-lg" /></button>
          </div>
          <div className="db-watchlist-list">
            {watchlistRows.length === 0 ? (
              <div className="db-watchlist-empty">
                <i className="bi bi-bookmark" style={{ fontSize: '2rem', color: '#6b7280', marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#8b949e' }}>Empty watchlist — add stocks to track</p>
                <button className="db-icon-btn" style={{ marginTop: '0.75rem' }} title="Add stock"><i className="bi bi-plus-lg" /></button>
              </div>
            ) : (
              watchlistRows.map((w) => {
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
        {/* Total Profits — fixed height; list scrolls (positions by value, largest first) */}
        <div className="db-card db-profits-card" data-dashboard-card>
          <div className="db-card-header">
            <h3>Total Profits</h3>
            <Link href="/trading" className="db-icon-btn" title="View trading" aria-label="View trading">
              <i className="bi bi-box-arrow-up-right" />
            </Link>
          </div>
          <div className="db-profits-body">
            <div className="db-profits-chart-wrap">
              {useMock ? (
                <DonutChart
                  segments={profitDonutSegments}
                  size={110}
                  strokeWidth={16}
                  centerValue={`${mock.totalPnl >= 0 ? '+' : '-'}$${Math.abs(mock.totalPnl).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                  centerLabel={`${mock.totalPnlPct >= 0 ? '+' : ''}${mock.totalPnlPct.toFixed(2)}% total`}
                />
              ) : (
                <DonutChart
                  segments={profitDonutSegments}
                  size={110}
                  strokeWidth={16}
                  centerValue="$4,030"
                  centerLabel="-$150.20 from last month"
                />
              )}
            </div>
            <div className="db-profits-legend-scroll">
              {totalProfitsRows.length === 0 ? (
                <p className="db-profits-empty" style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--db-muted)' }}>
                  No positions to show. {useMock ? 'Add mock positions' : 'Link an account or use demo data'} to see P&amp;L by holding.
                </p>
              ) : (
                <ul className="db-profits-position-list">
                  {profitPositionWeights.map((p) => {
                    const pnl = p.pnl;
                    const hasPnl = typeof pnl === 'number';
                    return (
                      <li key={p.symbol} className="db-profits-legend-item">
                        <span className="db-legend-dot" style={{ background: p.color }} />
                        <span className="db-legend-label">{p.symbol}</span>
                        <span className="db-legend-amt">
                          {hasPnl
                            ? `${pnl >= 0 ? '+' : '-'}$${Math.abs(pnl).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                            : typeof p.dayDelta === 'number'
                              ? `Day ${p.dayDelta >= 0 ? '+' : ''}$${Math.abs(p.dayDelta).toFixed(0)}`
                              : '—'}
                        </span>
                        <span className="db-legend-pct">{p.weightPct.toFixed(0)}%</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Sector / Industry Distribution — pie chart with hover tooltips */}
        <div className="db-card db-sector-card" data-dashboard-card>
          <div className="db-card-header">
            <h3>{isTmtTeamMember ? 'Industry Distribution' : 'Sector Distribution'}</h3>
            {sectorRows.length > 0 && (
              <span className="db-sector-total" aria-hidden>
                {sectorRows.length} {sectorRows.length === 1 ? 'sector' : 'sectors'}
              </span>
            )}
          </div>

          {sectorRows.length === 0 ? (
            <div className="db-sector-empty">
              <i
                className="bi bi-pie-chart"
                style={{ fontSize: '1.75rem', color: 'rgba(16,185,129,0.25)', marginBottom: '0.5rem' }}
              />
              <p style={{ color: '#6b7280', fontSize: '0.8125rem', textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
                No holdings yet.<br />
                {useMock
                  ? 'Place a trade in Mock Trading to see your sector breakdown.'
                  : 'Connect a brokerage account to see your sector breakdown.'}
              </p>
            </div>
          ) : (
            <div className="db-sector-body">
              <div className="db-sector-pie-area">
                <SectorPieChart sectors={sectorRows} size={140} />
              </div>

              <ul className="db-sector-legend">
                {sectorRows.map((s) => (
                  <li key={s.name} className="db-sector-legend-item">
                    <span className="db-sector-legend-dot" style={{ background: s.color }} aria-hidden />
                    <span className="db-sector-legend-name">{s.name}</span>
                    <span className="db-sector-legend-pct">{s.pct}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Recent Transactions — fixed height; list scrolls (newest first) */}
        <div className="db-card db-transactions-card" data-dashboard-card>
          <div className="db-card-header">
            <h3>Recent Transactions</h3>
            <Link href="/trading/dashboard" className="db-icon-btn" title="Trading activity" aria-label="View trading activity">
              <i className="bi bi-box-arrow-up-right" />
            </Link>
          </div>
          <div className="db-tx-table-header">
            <span>Companies</span>
            <span>Amount</span>
            <span>Transaction ID</span>
          </div>
          <div className="db-tx-scroll">
            <div className="db-tx-list">
              {displayTransactions.map((tx) => {
                const q = tx.ticker ? liveQuotes[tx.ticker] : null;
                const rowKey = tx.id != null ? `tx-${tx.id}` : `tx-${tx.txId}`;
                return (
                  <div key={rowKey} className="db-tx-item">
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
    </div>
  );
}
