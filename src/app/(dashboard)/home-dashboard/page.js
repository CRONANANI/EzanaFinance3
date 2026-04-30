'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useOrg } from '@/contexts/OrgContext';
import { HeroSparkline } from '@/components/dashboard/HeroSparkline';
import { usePlaidPortfolioSummary } from '@/hooks/usePlaidPortfolioSummary';
import { usePortfolioValueSeries } from '@/hooks/usePortfolioValueSeries';
import { supabase } from '@/lib/supabase';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import { useWatchlists } from '@/hooks/useWatchlists';
import './home-dashboard.css';

/** 9 holdings per page = 3 columns × 3 rows. Was 6 (3×2); tighter per-card
    sizing in home-dashboard.css keeps total height similar to before. */
const HOLDINGS_PAGE_SIZE = 9;

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

/** TMT team: industry-level breakdown instead of broad sectors */
const TMT_INDUSTRY_DATA = [
  { name: 'Software', detail: 'SaaS, AI', pct: 32, value: 63584.0, color: '#3b82f6' },
  { name: 'Hardware', detail: 'Devices, Semiconductors', pct: 38, value: 75506.0, color: '#10b981' },
  { name: 'Media', detail: 'Streaming, Advertising, Gaming', pct: 19, value: 37753.0, color: '#a78bfa' },
  { name: 'Telecommunications', detail: '5G, Internet Services', pct: 11, value: 21857.0, color: '#f59e0b' },
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

function DashboardSkeleton() {
  return (
    <div className="db-skeleton-wrap">
      <div className="db-skeleton-greeting">
        <div className="db-skel-bar db-skel-bar--lg" style={{ width: '320px' }} />
        <div className="db-skel-bar db-skel-bar--sm" style={{ width: '440px', marginTop: '0.5rem' }} />
      </div>

      <div className="db-skel-card db-skel-card--hero">
        <div className="db-skel-bar db-skel-bar--md" style={{ width: '120px' }} />
        <div className="db-skel-bar db-skel-bar--xl" style={{ width: '320px', marginTop: '0.65rem' }} />
        <div className="db-skel-bar db-skel-bar--sm" style={{ width: '180px', marginTop: '0.5rem' }} />
        <div className="db-skel-bar db-skel-bar--chart" style={{ marginTop: '1.5rem' }} />
      </div>

      <div className="db-skel-row" style={{ gridTemplateColumns: '1fr 320px' }}>
        <div className="db-skel-card">
          <div className="db-skel-bar db-skel-bar--md" style={{ width: '120px' }} />
          <div className="db-skel-bar db-skel-bar--md" style={{ width: '100%', marginTop: '1rem' }} />
          <div className="db-skel-bar db-skel-bar--md" style={{ width: '90%', marginTop: '0.5rem' }} />
          <div className="db-skel-bar db-skel-bar--md" style={{ width: '85%', marginTop: '0.5rem' }} />
        </div>
        <div className="db-skel-card">
          <div className="db-skel-bar db-skel-bar--md" style={{ width: '80px' }} />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="db-skel-bar db-skel-bar--md" style={{ width: '100%', marginTop: '0.85rem' }} />
          ))}
        </div>
      </div>

      <div className="db-skel-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="db-skel-card db-skel-card--short">
            <div className="db-skel-bar db-skel-bar--md" style={{ width: '100px' }} />
            <div className="db-skel-bar db-skel-bar--xl" style={{ width: '60%', marginTop: '1.25rem' }} />
            <div className="db-skel-bar db-skel-bar--sm" style={{ width: '80%', marginTop: '0.5rem' }} />
          </div>
        ))}
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
  const [timeframe, setTimeframe] = useState('1M');
  const { points: valueSeriesDisplayPoints, dataForCurrentRange, isLoading: valueSeriesLoading, error: valueSeriesError } =
    usePortfolioValueSeries(timeframe);
  const [liveQuotes, setLiveQuotes] = useState({});
  const [plaidHoldingsPayload, setPlaidHoldingsPayload] = useState(null);
  const [holdingsPage, setHoldingsPage] = useState(0);
  /** Currently expanded sector name in the Sector Distribution card. null = none expanded. */
  const [expandedSector, setExpandedSector] = useState(null);

  const mock = useMockPortfolio();
  const useMock = mock.hasMockPortfolio;

  const isInitialLoading = plaidSummaryLoading || mock.isLoading || valueSeriesLoading;
  const hasNoData = !isInitialLoading && !useMock && !plaidConnected;

  /**
   * Live total must match Home + Mock Trading: mock.totalValue (client + quotes) or
   * Plaid summary — NOT the last point of /api/portfolio/value-series (server uses
   * DB prices and can disagree with the headline).
   */
  const currentValue = useMock
    ? mock.totalValue
    : plaidConnected
      ? (plaidSummary?.totalValue ?? null)
      : null;

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
    return [];
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
    return [];
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
    return [{ label: 'No positions', pct: 100, color: '#2a2f3a', value: 0 }];
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
    return [];
  }, [useMock, mock.recentTransactions]);

  useEffect(() => {
    setHoldingsPage(0);
  }, [timeframe, useLiveHoldings, plaidHoldingsPayload?.aggregated?.length]);

  useEffect(() => {
    const fromPlaid = (plaidHoldingsPayload?.aggregated || []).map((h) => h.ticker).filter(Boolean);
    const fromMock = useMock ? Object.keys(mock.portfolio?.positions || {}) : [];
    const tickers = [
      ...new Set([
        ...fromPlaid,
        ...fromMock,
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
    if (useMock && mock.sectorData.length > 0) return mock.sectorData;
    if (plaidConnected && mock.sectorData.length > 0) return mock.sectorData;
    if (isTmtTeamMember) return TMT_INDUSTRY_DATA;
    return [];
  }, [useMock, plaidConnected, mock.sectorData, isTmtTeamMember]);

  /**
   * Group enriched positions by sector for the expandable legend rows.
   * Map shape: { 'Technology': [{symbol, qty, posValue, pnl, pnlPct, currentPrice}, ...], ... }
   *
   * Each sector's array is sorted by posValue descending so the largest
   * holdings show first when expanded.
   *
   * For the TMT industry case, this map is empty — TMT_INDUSTRY_DATA is
   * hardcoded aggregate data without per-position breakdown. Industry rows
   * surface as non-expandable.
   */
  const holdingsBySector = useMemo(() => {
    const map = {};
    if (!mock.enrichedPositions) return map;
    for (const pos of mock.enrichedPositions) {
      const sectorName = pos.sector || 'Other';
      if (!map[sectorName]) map[sectorName] = [];
      map[sectorName].push({
        symbol: pos.symbol,
        qty: pos.qty,
        posValue: pos.posValue,
        pnl: pos.pnl,
        pnlPct: pos.pnlPct,
        currentPrice: pos.currentPrice,
      });
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => b.posValue - a.posValue);
    }
    return map;
  }, [mock.enrichedPositions]);

  // If the currently-expanded sector disappears (e.g., user closed all positions
  // in it), auto-collapse so we don't keep stale state.
  useEffect(() => {
    if (expandedSector && !sectorRows.some((s) => s.name === expandedSector)) {
      setExpandedSector(null);
    }
  }, [sectorRows, expandedSector]);

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

  const heroChangeToneClass =
    valueWindowFromApi != null
      ? valueWindowFromApi.changePct >= 0
        ? 'positive'
        : 'negative'
      : useMock
        ? mock.totalPnlPct >= 0
          ? 'positive'
          : 'negative'
        : typeof plaidSummary?.totalGainLossPercent === 'number'
          ? plaidSummary.totalGainLossPercent >= 0
            ? 'positive'
            : 'negative'
          : 'is-muted';

  return (
    <div className="db-page dashboard-page-inset">
      {isInitialLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
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
            ) : valueWindowFromApi && Math.abs(valueWindowFromApi.changePct) > 1e-6 ? (
              valueWindowFromApi.changePct >= 0 ? (
                <>
                  Over your selected timeframe, portfolio value is up{' '}
                  <strong className="db-greeting-highlight">+{valueWindowFromApi.changePct.toFixed(2)}%</strong>.
                </>
              ) : (
                <>
                  Over your selected timeframe, portfolio value is{' '}
                  <strong className="db-greeting-highlight">{valueWindowFromApi.changePct.toFixed(2)}%</strong>.
                </>
              )
            ) : typeof plaidSummary?.totalGainLossPercent === 'number' && plaidConnected ? (
              <>
                Overall vs cost basis:{' '}
                <strong className="db-greeting-highlight">
                  {plaidSummary.totalGainLossPercent >= 0 ? '+' : ''}
                  {plaidSummary.totalGainLossPercent.toFixed(2)}%
                </strong>
              </>
            ) : hasNoData ? (
              <>Connect a brokerage or try Mock Trading to see personalized portfolio insights.</>
            ) : (
              <>Your portfolio summary updates as linked accounts sync.</>
            )}
          </p>
          <p className="db-greeting-date">{formatLongDate()}</p>
        </div>
      </div>

      {/* ═══ HERO: Portfolio Value Card ═══ */}
      <div className="db-hero-card">
        <div className="db-hero-card-header">
          <Link href="/trading/mock" className="db-hero-card-title-link">
            <h3 className="db-hero-card-title">
              Portfolio Snapshot <i className="bi bi-arrow-up-right db-hero-card-title-icon" />
            </h3>
          </Link>
        </div>
        <div className="db-hero-body">
        <div className="db-hero-left">
          <div className="db-hero-top">
            <div>
              <span className="db-hero-label">Current Value <i className="bi bi-arrow-up-right" /></span>
              <div className="db-hero-value">
                {useMock || (plaidConnected && currentValue != null) ? (
                  `$${Number(currentValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                ) : (
                  <span className="db-hero-value-placeholder">Connect a brokerage</span>
                )}
              </div>
              <span className={`db-hero-change ${heroChangeToneClass}`}>
                {valueWindowFromApi ? (
                  <>
                    {`${valueWindowFromApi.changePct >= 0 ? '+' : ''}${valueWindowFromApi.changePct.toFixed(2)}%`}
                    <span className="db-hero-change-amt">
                      {`${valueWindowFromApi.changeAbs >= 0 ? '+' : ''}$${valueWindowFromApi.changeAbs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </span>
                    <span className="db-hero-tf-pill" style={{ fontSize: '0.65rem', marginLeft: 6, opacity: 0.75 }}>
                      {timeframe}
                    </span>
                  </>
                ) : useMock ? (
                  <>
                    {`${mock.totalPnlPct >= 0 ? '+' : ''}${mock.totalPnlPct.toFixed(2)}%`}
                    <span className="db-hero-change-amt">
                      {`${mock.totalPnl >= 0 ? '+' : '-'}$${Math.abs(mock.totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </span>
                  </>
                ) : typeof plaidSummary?.totalGainLossPercent === 'number' && plaidConnected ? (
                  <>
                    {`${plaidSummary.totalGainLossPercent >= 0 ? '+' : ''}${plaidSummary.totalGainLossPercent.toFixed(2)}%`}
                    <span className="db-hero-change-amt">
                      {typeof plaidSummary.totalGainLoss === 'number'
                        ? `${plaidSummary.totalGainLoss >= 0 ? '+' : '-'}$${Math.abs(plaidSummary.totalGainLoss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : ''}
                    </span>
                    <span className="db-hero-tf-pill" style={{ fontSize: '0.65rem', marginLeft: 6, opacity: 0.75 }}>
                      vs cost basis
                    </span>
                  </>
                ) : (
                  <span className="db-hero-change is-muted">
                    Portfolio performance for this range appears when your account is linked.
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
                {useMock ? (
                  mock.enrichedPositions.length
                ) : plaidConnected && typeof plaidSummary?.positionCount === 'number' ? (
                  plaidSummary.positionCount
                ) : normalizedHoldings.length > 0 ? (
                  normalizedHoldings.length
                ) : (
                  <span className="db-hero-stat-muted">Link an account</span>
                )}
              </span>
            </div>
            <div className="db-hero-stat">
              <span className="db-hero-stat-label">Cash Balance <i className="bi bi-arrow-up-right" /></span>
              <span className="db-hero-stat-value">
                {useMock ? (
                  <>
                    $
                    {mock.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </>
                ) : (
                  <span className="db-hero-stat-muted">Held at your institution</span>
                )}
              </span>
            </div>
            <div className="db-hero-stat">
              <span className="db-hero-stat-label">
                {useMock ? 'Total P&L' : 'Total gain / loss'} <i className="bi bi-arrow-up-right" />
              </span>
              <span
                className="db-hero-stat-value"
                style={useMock ? { color: mock.totalPnl >= 0 ? '#10b981' : '#ef4444' } : {}}
              >
                {useMock ? (
                  `${mock.totalPnl >= 0 ? '+' : ''}$${Math.abs(mock.totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                ) : typeof plaidSummary?.totalGainLoss === 'number' && plaidConnected ? (
                  `${plaidSummary.totalGainLoss >= 0 ? '+' : '-'}$${Math.abs(plaidSummary.totalGainLoss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                ) : (
                  <span className="db-hero-stat-muted">No cost basis yet</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Chart area */}
        <HeroSparkline
          portfolioValue={currentValue != null ? currentValue : undefined}
          changePct={useMock ? mock.totalPnlPct : undefined}
          seriesPoints={sparklinePoints}
          range={timeframe}
          isLoading={valueSeriesLoading}
          loadError={valueSeriesError}
        />
        </div>
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
                    href={`/trading/mock?symbol=${encodeURIComponent(h.ticker)}`}
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
                  centerValue={
                    typeof plaidSummary?.totalGainLoss === 'number' && plaidConnected
                      ? `${plaidSummary.totalGainLoss >= 0 ? '+' : '-'}$${Math.abs(plaidSummary.totalGainLoss).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                      : ''
                  }
                  centerLabel={
                    typeof plaidSummary?.totalGainLossPercent === 'number' && plaidConnected
                      ? `${plaidSummary.totalGainLossPercent >= 0 ? '+' : ''}${plaidSummary.totalGainLossPercent.toFixed(2)}% vs cost basis`
                      : totalProfitsRows.length === 0
                        ? 'Add holdings to track P&L'
                        : 'Day change by position'
                  }
                />
              )}
            </div>
            <div className="db-profits-legend-scroll">
              {totalProfitsRows.length === 0 ? (
                <p className="db-profits-empty" style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--db-muted)' }}>
                  No positions to show. {useMock ? 'Add mock positions' : 'Link an account'} to see P&amp;L by holding.
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
                {sectorRows.map((s) => {
                  const isExpanded = expandedSector === s.name;
                  const sectorHoldings = holdingsBySector[s.name] || [];
                  const canExpand = sectorHoldings.length > 0; // TMT aggregate data has no per-position data

                  return (
                    <li key={s.name} className="db-sector-legend-row">
                      <button
                        type="button"
                        className={`db-sector-legend-item db-sector-legend-item-btn ${isExpanded ? 'is-expanded' : ''}`}
                        onClick={() => {
                          if (!canExpand) return;
                          setExpandedSector(isExpanded ? null : s.name);
                        }}
                        disabled={!canExpand}
                        aria-expanded={canExpand ? isExpanded : undefined}
                        aria-controls={canExpand ? `db-sector-holdings-${s.name.replace(/\s+/g, '-')}` : undefined}
                      >
                        <span className="db-sector-legend-dot" style={{ background: s.color }} aria-hidden />
                        <span className="db-sector-legend-name">{s.name}</span>
                        <span className="db-sector-legend-pct">{s.pct}%</span>
                        {canExpand && (
                          <i
                            className={`bi bi-chevron-${isExpanded ? 'up' : 'down'} db-sector-legend-chevron`}
                            aria-hidden
                          />
                        )}
                      </button>

                      {isExpanded && canExpand && (
                        <ul
                          id={`db-sector-holdings-${s.name.replace(/\s+/g, '-')}`}
                          className="db-sector-holdings-list"
                        >
                          {sectorHoldings.map((h) => (
                            <li key={h.symbol} className="db-sector-holding-row">
                              <span className="db-sector-holding-symbol">{h.symbol}</span>
                              <span className="db-sector-holding-qty">
                                {h.qty} {h.qty === 1 ? 'share' : 'shares'}
                              </span>
                              <span className="db-sector-holding-value">
                                ${h.posValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                              </span>
                              <span
                                className={`db-sector-holding-pnl ${h.pnlPct >= 0 ? 'is-up' : 'is-down'}`}
                              >
                                {h.pnlPct >= 0 ? '+' : ''}{h.pnlPct.toFixed(2)}%
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
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
              {displayTransactions.length === 0 ? (
                <p className="db-profits-empty" style={{ margin: '1rem 0.5rem', fontSize: '0.8125rem', color: 'var(--db-muted)' }}>
                  {useMock ? 'No mock trades yet.' : 'Linked account activity will appear here.'}
                </p>
              ) : (
                displayTransactions.map((tx) => {
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
                })
              )}
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
