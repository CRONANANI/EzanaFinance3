'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useOrg } from '@/contexts/OrgContext';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TickerPerformanceChart } from '@/components/home/TickerPerformanceChart';
import { AddPortfolioModal } from '@/components/home/AddPortfolioModal';
import { DateSelector } from '@/components/ui/DateSelector';
import { useElo } from '@/hooks/useElo';
import { usePlaidPortfolioSummary } from '@/hooks/usePlaidPortfolioSummary';
import { usePortfolioValueSeries } from '@/hooks/usePortfolioValueSeries';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import { useWatchlists } from '@/hooks/useWatchlists';
import { useLoginHistory } from '@/hooks/useLoginHistory';
import { useUpcomingEvents, formatEventDay } from '@/hooks/useUpcomingEvents';
import { useUserRelevanceSet } from '@/hooks/useUserRelevanceSet';
import './broadsheet.css';

const HOLDINGS_PAGE_SIZE = 9;

const SECTOR_COLORS = {
  Technology: '#3b82f6',
  Healthcare: '#10b981',
  Finance: '#a78bfa',
  Financials: '#a78bfa',
  'Financial Services': '#a78bfa',
  Defense: '#f59e0b',
  Energy: '#f97316',
  Consumer: '#ec4899',
  ETF: '#06b6d4',
  Crypto: '#fbbf24',
  Commodity: '#84cc16',
  'Communication Services': '#8b5cf6',
  'Real Estate': '#14b8a6',
  Industrials: '#f97316',
  Materials: '#78716c',
  Utilities: '#22d3ee',
  Other: '#6b7280',
};

function sectorColor(sectorName) {
  if (!sectorName) return '#6b7280';
  return SECTOR_COLORS[sectorName] ?? '#6b7280';
}

const INDEX_COLORS = {
  'S&P 500': '#94928a',
  NASDAQ: '#0e7c4f',
  'Russell 2K': '#7c3aed',
  'Dow Jones': '#d97706',
  VIX: '#ec4899',
  WTI: '#f97316',
  '10Y': '#06b6d4',
};
function indexColor(sym) {
  return INDEX_COLORS[sym] || '#6b7280';
}

const INDEX_API_KEYS = {
  'S&P 500': 'spx',
  NASDAQ: 'ixic',
  'Russell 2K': 'rut',
  'Dow Jones': 'dji',
  VIX: 'vix',
  WTI: 'wti',
  '10Y': 'tnx',
};

function indexHistoryPeriod(tf) {
  return tf === '5D' ? '7D' : tf;
}

function formatTickByRange(at, range) {
  const d = new Date(at);
  if (range === '1D') {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  if (range === '5D' || range === '1W' || range === '1M') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (range === '3M' || range === '6M') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

const TICKER_ITEMS = [
  { tag: 'LIVE', text: 'JT CLOSED 20,371.81  +0.61%' },
  { tag: 'FLOWS', text: 'Equities +$2.1B · IG credit tight 2bps · HY issuance light' },
  { tag: 'CONGRESS', text: '14 STOCK Act filings (24h) — committees: Energy, Intel, Banking' },
  { tag: 'EIF', text: 'Quarterly window: elevated odds in AI · mfg · biotech mega caps' },
  { tag: 'FED WATCH', text: 'Speakers on deck — front-end yields tick higher into auction' },
];

/* Schedule (Band IV) category metadata — colours/labels mirror the
   /api/market-data/upcoming-events feed so dots, chips and event accents
   stay consistent. */
const EVENT_CATEGORY_META = {
  earnings: { label: 'Earnings', color: '#10b981' },
  dividends: { label: 'Dividends', color: '#22c55e' },
  ipos: { label: 'IPOs', color: '#a855f7' },
  economic: { label: 'Economic', color: '#6366f1' },
  fed: { label: 'Economic', color: '#3b82f6' },
  'inside-the-capitol': { label: 'Capitol', color: '#f97316' },
  crypto: { label: 'Crypto', color: '#fbbf24' },
  commodity: { label: 'Commodities', color: '#84cc16' },
};

const EVENT_CATEGORY_FALLBACK_COLOR = '#94a3b8';

function eventCategoryColor(category) {
  return EVENT_CATEGORY_META[category]?.color ?? EVENT_CATEGORY_FALLBACK_COLOR;
}

/* Filter chips. Chips for categories with no events in the current window
   are hidden at render time so the row never implies a feed that isn't there. */
const SCHEDULE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'earnings', label: 'Earnings' },
  { key: 'dividends', label: 'Dividends' },
  { key: 'ipos', label: 'IPOs' },
  { key: 'economic', label: 'Economic' },
  { key: 'inside-the-capitol', label: 'Capitol' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'commodity', label: 'Commodities' },
];

/* Default calendar legend shown before any events load / when none are in window. */
const DEFAULT_CAL_LEGEND = [
  { key: 'earnings', label: 'Earnings', color: '#10b981' },
  { key: 'dividends', label: 'Dividends', color: '#22c55e' },
  { key: 'ipos', label: 'IPOs', color: '#a855f7' },
  { key: 'economic', label: 'Economic', color: '#6366f1' },
  { key: 'inside-the-capitol', label: 'Capitol', color: '#f97316' },
];

const RANGE_BUTTONS = ['1D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', '10Y', 'ALL'];

function portfolioSeriesRange(tf) {
  if (tf === '5D') return '7D';
  return tf;
}


/* ═══ HELPERS ═══ */
const fmtMoney = (n) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** 'daily' on weekdays, 'weekly' on Sat/Sun (America/New_York). */
function getMoversWindow() {
  const nyParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
  }).formatToParts(new Date());
  const day = nyParts.find((p) => p.type === 'weekday')?.value;
  return day === 'Sat' || day === 'Sun' ? 'weekly' : 'daily';
}

/**
 * Commodities shown in the home Top Movers — must match the watchlist page's
 * COMMODITIES_ONLY constant so both surfaces show the same instruments.
 */
const HOME_COMMODITIES = [
  { name: 'Gold', batchSym: 'GC=F', candleSym: 'GCUSD' },
  { name: 'Silver', batchSym: 'SI=F', candleSym: 'SIUSD' },
  { name: 'Platinum', batchSym: 'PL=F', candleSym: 'PLUSD' },
  { name: 'Palladium', batchSym: 'PA=F', candleSym: 'PAUSD' },
  { name: 'Copper', batchSym: 'HG=F', candleSym: 'HGUSD' },
  { name: 'Oil (WTI)', batchSym: 'CL=F', candleSym: 'CLUSD' },
  { name: 'Nat Gas', batchSym: 'NG=F', candleSym: 'NGUSD' },
  { name: 'Wheat', batchSym: 'ZW=F', candleSym: 'ZWUSD' },
  { name: 'Corn', batchSym: 'ZC=F', candleSym: 'ZCUSD' },
];

function weeklyPctFromCandles(candles) {
  if (!candles?.length || candles.length < 2) return null;
  const first = Number(candles[0]?.close ?? candles[0]?.c ?? candles[0]?.price ?? 0);
  const last = Number(
    candles[candles.length - 1]?.close ??
      candles[candles.length - 1]?.c ??
      candles[candles.length - 1]?.price ??
      0,
  );
  if (first <= 0) return null;
  return { pct: ((last - first) / first) * 100, price: last };
}

function formatLongDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatBriefLabel() {
  const hour = new Date().getHours();
  if (hour < 12) return 'The Morning Brief';
  if (hour < 17) return 'The Afternoon Brief';
  return 'The Evening Brief';
}

/* Smooth SVG path from values array */
function pathFromValues(values, w, h, padY = 4) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = w / (values.length - 1);
  const pts = values.map((v, i) => [i * stepX, h - padY - ((v - min) / range) * (h - padY * 2)]);
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx.toFixed(2)} ${y0.toFixed(2)}, ${cx.toFixed(2)} ${y1.toFixed(2)}, ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  return { d, pts };
}

/* Deterministic series generator for placeholder charts */
function genSeries(seed, n = 40, drift = 0.5, vol = 1) {
  let x = seed;
  const out = [];
  let v = 50;
  for (let i = 0; i < n; i++) {
    x = (x * 9301 + 49297) % 233280;
    const r = x / 233280;
    v += (r - 0.5) * vol + drift * 0.02;
    out.push(v);
  }
  return out;
}

/* Inline sparkline SVG */
function Spark({ values, w = 96, h = 28, color, fill = false, strokeWidth = 1.5 }) {
  const resolvedColor = color || 'var(--bs-green)';
  const { d, pts } = pathFromValues(values, w, h, 3);
  const areaD = d + ` L ${pts[pts.length - 1][0].toFixed(2)} ${h} L ${pts[0][0].toFixed(2)} ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {fill && <path d={areaD} fill={resolvedColor} fillOpacity="0.12" />}
      <path
        d={d}
        fill="none"
        stroke={resolvedColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Band header component (Bands I-V) */
function BandHeader({ number, label, meta, dark = false, centered = false }) {
  if (centered) {
    return (
      <div className={`bs-band-head bs-band-head--centered ${dark ? 'bs-band-head--dark' : ''}`}>
        <span className={`bs-band-num ${dark ? 'bs-band-num--dark' : ''}`}>{number}</span>
        <h2 className={`bs-band-label ${dark ? 'bs-band-label--dark' : ''}`}>{label}</h2>
        {meta ? (
          <span className={`bs-band-meta ${dark ? 'bs-band-meta--dark' : ''}`}>{meta}</span>
        ) : null}
      </div>
    );
  }
  return (
    <div className={`bs-band-head ${dark ? 'bs-band-head--dark' : ''}`}>
      <div className="bs-band-head-left">
        <span className={`bs-band-num ${dark ? 'bs-band-num--dark' : ''}`}>{number}</span>
        <h2 className={`bs-band-label ${dark ? 'bs-band-label--dark' : ''}`}>{label}</h2>
      </div>
      {meta ? (
        <span className={`bs-band-meta ${dark ? 'bs-band-meta--dark' : ''}`}>{meta}</span>
      ) : null}
    </div>
  );
}

/* Mini calendar — renders the current month with a coloured dot per event
   category on each day that has events (respecting the active filter). */
function MiniCalendar({ cells, dayToCategories, today, monthTitle, legend }) {
  return (
    <div className="bs-cal-box">
      <div className="bs-cal-head">{monthTitle}</div>
      <div className="bs-cal-grid">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <div key={d} className="bs-cal-dow">
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          const cats = d != null ? dayToCategories[d] || [] : [];
          return (
            <div
              key={i}
              className={`bs-cal-cell ${d === today ? 'bs-cal-cell--today' : ''} ${d === null ? 'bs-cal-cell--empty' : ''}`}
            >
              {d}
              {cats.length > 0 && (
                <span className="bs-cal-dots">
                  {cats.slice(0, 3).map((cat) => (
                    <span
                      key={cat}
                      className="bs-cal-dot"
                      style={{
                        position: 'static',
                        transform: 'none',
                        background: eventCategoryColor(cat),
                      }}
                    />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="bs-cal-legend">
        {legend.map((c) => (
          <div key={c.key} className="bs-cal-leg-item">
            <span className="bs-cal-leg-dot" style={{ background: c.color }} />
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ MAIN PAGE ═══ */
export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isOrgUser, orgData } = useOrg();
  const {
    connected: plaidConnected,
    summary: plaidSummary,
    refresh: refreshPlaidSummary,
  } = usePlaidPortfolioSummary();
  const [timeframe, setTimeframe] = useState('1W');
  const seriesRange = portfolioSeriesRange(timeframe);

  // ─── Schedule (Band IV): live, now-anchored events ───────────────
  // Personalised feed (today → end of month) from the shared upcoming-events
  // route; replaces the old hardcoded May events + static calendar.
  const scheduleRelevance = useUserRelevanceSet();
  const { events: liveScheduleEvents, isLoading: scheduleLoading } = useUpcomingEvents({
    relevance: scheduleRelevance,
  });
  const [eventFilter, setEventFilter] = useState('all');

  const scheduleData = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    // Monday-first grid (matches the Mo…Su day-of-week header).
    const startOffset = (new Date(y, m, 1).getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const todayDay = now.getDate();
    const todayMidnight = new Date(y, m, todayDay, 0, 0, 0);
    // "Upcoming week" window for the event list — today through +7 days.
    const weekEnd = new Date(y, m, todayDay + 7, 23, 59, 59);

    const parseDay = (ev) => {
      if (!ev?.fullDate) return null;
      const [ey, em, ed] = String(ev.fullDate).slice(0, 10).split('-').map(Number);
      if (!ey || !em || !ed) return null;
      return new Date(ey, em - 1, ed);
    };

    // Defensive client-side window check — never paint a stale past date.
    const inWindow = (liveScheduleEvents || []).filter((ev) => {
      const d = parseDay(ev);
      return d && d >= todayMidnight;
    });

    const matchesFilter = (ev) => eventFilter === 'all' || ev.category === eventFilter;

    // Calendar dots: every day this month that has a (filter-matching) event,
    // tagged with each distinct category so the dots are colour-coded.
    const dayToCategories = {};
    inWindow.filter(matchesFilter).forEach((ev) => {
      const d = parseDay(ev);
      if (!d || d.getMonth() !== m || d.getFullYear() !== y) return;
      const day = d.getDate();
      (dayToCategories[day] ??= []);
      const cat = ev.category || ev.type;
      if (cat && !dayToCategories[day].includes(cat)) dayToCategories[day].push(cat);
    });

    // Event list: filter-matching events within the next 7 days, grouped by day.
    const groupMap = new Map();
    for (const ev of inWindow) {
      if (!matchesFilter(ev)) continue;
      const d = parseDay(ev);
      if (!d || d > weekEnd) continue;
      const key = String(ev.fullDate).slice(0, 10);
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key).push(ev);
    }
    const dayGroups = Array.from(groupMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, items]) => ({ day, label: formatEventDay(day), items }));

    const categoriesWithEvents = new Set(inWindow.map((ev) => ev.category));
    const legend = DEFAULT_CAL_LEGEND.filter((c) => categoriesWithEvents.has(c.key));

    return {
      cells,
      today: todayDay,
      monthTitle: new Date(y, m, 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
      dayToCategories,
      dayGroups,
      categoriesWithEvents,
      legend: legend.length ? legend : DEFAULT_CAL_LEGEND,
      totalWeek: dayGroups.reduce((n, g) => n + g.items.length, 0),
      totalWindow: inWindow.length,
    };
  }, [liveScheduleEvents, eventFilter]);

  const availableScheduleFilters = useMemo(
    () =>
      SCHEDULE_FILTERS.filter(
        (f) => f.key === 'all' || scheduleData.categoriesWithEvents.has(f.key),
      ),
    [scheduleData.categoriesWithEvents],
  );

  // If the active filter's category drops out of the window, snap back to All.
  useEffect(() => {
    if (eventFilter === 'all') return;
    if (!availableScheduleFilters.some((f) => f.key === eventFilter)) {
      setEventFilter('all');
    }
  }, [availableScheduleFilters, eventFilter]);
  const {
    points: valueSeriesDisplayPoints,
    dataForCurrentRange,
    isLoading: valueSeriesLoading,
    error: valueSeriesError,
  } = usePortfolioValueSeries(seriesRange);
  const [liveQuotes, setLiveQuotes] = useState({});
  const [plaidHoldingsPayload, setPlaidHoldingsPayload] = useState(null);
  const [holdingsPage, setHoldingsPage] = useState(0);

  const [indices, setIndices] = useState([]);
  const [sectorData, setSectorData] = useState({ top: [], bottom: [] });
  const [sectorLoaded, setSectorLoaded] = useState(false);
  const [sectorEmpty, setSectorEmpty] = useState(false);
  const [gainers, setGainers] = useState([]);
  const [losers, setLosers] = useState([]);
  const [congressTrades, setCongressTrades] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [tickerItems, setTickerItems] = useState(TICKER_ITEMS);
  const [activeIndices, setActiveIndices] = useState(new Set(['S&P 500']));
  const [indexSeries, setIndexSeries] = useState({});
  const [indexSeriesLoading, setIndexSeriesLoading] = useState(false);
  const [commodityMovers, setCommodityMovers] = useState([]);
  const [cryptoMovers, setCryptoMovers] = useState([]);
  const [pulseRange, setPulseRange] = useState('1D');
  const [sectorDrilldown, setSectorDrilldown] = useState(null);
  const [tickerModal, setTickerModal] = useState(null);
  const [tickerModalRange, setTickerModalRange] = useState('1M');
  const { streakDays } = useLoginHistory(30);
  const [streakMultiplier, setStreakMultiplier] = useState(false);
  const [addPortfolioOpen, setAddPortfolioOpen] = useState(false);
  const { rating: eloRating, tierLabel: eloTier } = useElo(user?.id);

  const { watchlists: userWatchlists } = useWatchlists();
  const [selectedWatchlistId, setSelectedWatchlistId] = useState(null);

  const mock = useMockPortfolio();
  const useMock = mock.hasMockPortfolio;

  const currentValue = useMock
    ? mock.totalValue
    : plaidConnected
      ? (plaidSummary?.totalValue ?? null)
      : null;

  const valueWindowFromApi = useMemo(() => {
    const d = dataForCurrentRange;
    if (!d || d.length < 1) return null;
    const liveLast = Number.isFinite(currentValue) ? currentValue : d[d.length - 1].value;
    if (d.length < 2) return { last: liveLast, changeAbs: 0, changePct: 0 };
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

  const combinedChartData = useMemo(() => {
    const portfolioPts = (sparklinePoints || []).map((p) => ({
      at: p.at,
      label: new Date(p.at).getTime(),
      value: p.value,
    }));
    const portfolioBase = portfolioPts[0]?.value || 0;

    let out;
    if (portfolioPts.length > 0) {
      out = portfolioPts.map((p) => ({
        ...p,
        portfolio: portfolioBase > 0 ? ((p.value - portfolioBase) / portfolioBase) * 100 : 0,
      }));
    } else {
      const dateSet = new Set();
      for (const label of activeIndices) {
        const apiKey = INDEX_API_KEYS[label];
        if (!apiKey) continue;
        const series = indexSeries[apiKey] || [];
        for (const pt of series) {
          const ymd = pt.ymd || pt.date;
          if (ymd) dateSet.add(ymd);
        }
      }
      const sortedDates = [...dateSet].sort();
      out = sortedDates.map((ymd) => ({
        at: new Date(ymd + 'T12:00:00Z').toISOString(),
        label: new Date(ymd + 'T12:00:00Z').getTime(),
      }));
    }

    for (const label of activeIndices) {
      const apiKey = INDEX_API_KEYS[label];
      if (!apiKey) continue;
      const series = indexSeries[apiKey] || [];
      if (!series.length) continue;
      const lookup = new Map(series.map((pt) => [pt.ymd || pt.date, pt.pct]));
      for (const row of out) {
        const dateKey = new Date(row.at).toISOString().slice(0, 10);
        const pct = lookup.get(dateKey);
        if (typeof pct === 'number') row[apiKey] = pct;
      }
    }
    return out;
  }, [sparklinePoints, activeIndices, indexSeries]);

  /* Existing holdings normalization (preserve from current page.js) */
  const useLiveHoldings =
    !!plaidHoldingsPayload?.connected && (plaidHoldingsPayload?.aggregated?.length ?? 0) > 0;

  const normalizedHoldings = useMemo(() => {
    if (useMock && mock.enrichedPositions.length > 0) {
      return mock.enrichedPositions.map((pos) => ({
        ticker: pos.symbol,
        name: pos.name,
        qty: pos.qty,
        price: pos.currentPrice,
        positionValue: pos.posValue,
        change: pos.dayChangePct,
        sector: pos.sector || 'Other',
      }));
    }
    if (useLiveHoldings) {
      return (plaidHoldingsPayload.aggregated || [])
        .map((h) => {
          const ticker = h.ticker;
          const q = liveQuotes[ticker];
          const qty = Number(h.totalQuantity) || 0;
          const price = q?.price ?? Number(h.lastPrice) ?? 0;
          const positionValue = price * qty || Number(h.totalValue) || 0;
          const ch = q?.changePercent ?? 0;
          return {
            ticker,
            name: h.name || ticker,
            qty,
            price,
            positionValue,
            change: ch,
            sector: h.sector || 'Other',
            freshness: h.freshness || 'realtime',
          };
        })
        .sort((a, b) => b.positionValue - a.positionValue);
    }
    return [];
  }, [useMock, mock.enrichedPositions, useLiveHoldings, plaidHoldingsPayload, liveQuotes]);

  const sectorDrilldownHoldings = useMemo(() => {
    if (!sectorDrilldown) return [];
    return normalizedHoldings.filter((h) => (h.sector || 'Other') === sectorDrilldown);
  }, [sectorDrilldown, normalizedHoldings]);

  const holdingsPageCount = Math.max(1, Math.ceil(normalizedHoldings.length / HOLDINGS_PAGE_SIZE));
  const pagedHoldings = useMemo(
    () =>
      normalizedHoldings.slice(
        holdingsPage * HOLDINGS_PAGE_SIZE,
        (holdingsPage + 1) * HOLDINGS_PAGE_SIZE,
      ),
    [normalizedHoldings, holdingsPage],
  );

  const totalPortfolioValue =
    currentValue || normalizedHoldings.reduce((s, h) => s + h.positionValue, 0);

  const sectorRows = useMemo(() => {
    if (useMock && mock.sectorData.length > 0) return mock.sectorData;
    const map = {};
    for (const h of normalizedHoldings) {
      const s = h.sector || 'Other';
      map[s] = (map[s] || 0) + h.positionValue;
    }
    const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value,
        pct: Math.round((value / total) * 100),
        color: sectorColor(name),
      }))
      .sort((a, b) => b.value - a.value);
  }, [useMock, mock.sectorData, normalizedHoldings]);

  const profitBars = useMemo(() => {
    if (useMock && mock.enrichedPositions.length > 0) {
      return [...mock.enrichedPositions]
        .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
        .slice(0, 6)
        .map((p) => ({
          symbol: p.symbol,
          pnl: p.pnl,
          color: p.color || sectorColor(p.sector),
        }));
    }
    if (normalizedHoldings.length > 0) {
      return [...normalizedHoldings]
        .sort((a, b) => b.positionValue - a.positionValue)
        .slice(0, 6)
        .map((h) => ({
          symbol: h.ticker,
          pnl: null,
          weightPct: totalPortfolioValue > 0 ? (h.positionValue / totalPortfolioValue) * 100 : 0,
          color: sectorColor(h.sector),
        }));
    }
    return [];
  }, [useMock, mock.enrichedPositions, normalizedHoldings, totalPortfolioValue]);

  const activeWatchlist = useMemo(() => {
    if (!userWatchlists.length) return null;
    return userWatchlists.find((w) => w.id === selectedWatchlistId) || userWatchlists[0];
  }, [userWatchlists, selectedWatchlistId]);

  const watchlistRows = useMemo(() => {
    const stocks = activeWatchlist?.stocks;
    if (!stocks?.length) return [];
    return stocks.map((s) => ({
      ticker: s.ticker,
      name: s.name || s.ticker,
      price: typeof s.price === 'number' ? s.price : 0,
      change: s.changePct ?? s.change ?? 0,
    }));
  }, [activeWatchlist]);

  const commodityGainers = useMemo(
    () =>
      [...commodityMovers]
        .filter((c) => c.pct > 0)
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 3),
    [commodityMovers],
  );
  const commodityLosers = useMemo(
    () =>
      [...commodityMovers]
        .filter((c) => c.pct < 0)
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 3),
    [commodityMovers],
  );
  const cryptoGainers = useMemo(
    () =>
      [...cryptoMovers]
        .filter((c) => c.pct > 0)
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 3),
    [cryptoMovers],
  );
  const cryptoLosers = useMemo(
    () =>
      [...cryptoMovers]
        .filter((c) => c.pct < 0)
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 3),
    [cryptoMovers],
  );

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    'there';

  const displayValue = Number.isFinite(currentValue) ? currentValue : 0;
  const changePct = valueWindowFromApi?.changePct ?? 0;
  const changeAbs = valueWindowFromApi?.changeAbs ?? 0;

  const moversWindow = getMoversWindow();
  const moversTitle = moversWindow === 'weekly' ? 'Top movers this week' : 'Top movers today';

  useEffect(() => {
    if (userWatchlists.length > 0 && !selectedWatchlistId) {
      setSelectedWatchlistId(userWatchlists[0].id);
    }
  }, [userWatchlists, selectedWatchlistId]);

  useEffect(() => {
    setHoldingsPage(0);
  }, [timeframe, normalizedHoldings.length]);

  useEffect(() => {
    let cancelled = false;
    const period = indexHistoryPeriod(timeframe);
    setIndexSeriesLoading(true);
    fetch(`/api/market/index-history?period=${period}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled || !json?.indices) return;
        const out = {};
        for (const [k, v] of Object.entries(json.indices)) {
          out[k] = Array.isArray(v?.series) ? v.series : [];
        }
        setIndexSeries(out);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIndexSeriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [timeframe]);

  useEffect(() => {
    if (!indexSeries || Object.keys(indexSeries).length === 0) return;
    setIndices((prev) =>
      prev.map((row) => {
        const apiKey = INDEX_API_KEYS[row.sym];
        const series = indexSeries[apiKey];
        if (!series || !series.length) return row;
        const last = series[series.length - 1];
        const first = series[0];
        const lastPrice = last?.close ?? 0;
        const pct = (last?.pct ?? 0) - (first?.pct ?? 0);
        return {
          ...row,
          last: lastPrice.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          chg: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
          up: pct >= 0,
        };
      }),
    );
  }, [indexSeries]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/market/batch-quotes?symbols=SPY,QQQ,IWM,DIA,VIXY,USO,IEF');
        if (!res.ok) return;
        const data = await res.json();
        const quotes = data.quotes || {};
        const map = [
          { sym: 'S&P 500', key: 'SPY' },
          { sym: 'NASDAQ', key: 'QQQ' },
          { sym: 'Russell 2K', key: 'IWM' },
          { sym: 'Dow Jones', key: 'DIA' },
          { sym: 'VIX', key: 'VIXY' },
          { sym: 'WTI', key: 'USO' },
          { sym: '10Y', key: 'IEF' },
        ];
        if (!cancelled) {
          setIndices(
            map.map((m) => {
              const q = quotes[m.key];
              if (!q) return { sym: m.sym, last: '—', chg: '—', up: false };
              const price = q.price ?? q.regularMarketPrice ?? 0;
              const chgPct = q.changePercent ?? q.regularMarketChangePercent ?? 0;
              return {
                sym: m.sym,
                last: price.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
                chg: `${chgPct >= 0 ? '+' : ''}${chgPct.toFixed(2)}%`,
                up: chgPct >= 0,
              };
            }),
          );
        }
      } catch {
        /* ignore */
      }
    };
    load();
    const id = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSectorLoaded(false);
    (async () => {
      try {
        const res = await fetch(`/api/fmp/sector-performance?range=${pulseRange}`);
        if (!res.ok) return;
        const json = await res.json();
        const rows = Array.isArray(json?.sectors)
          ? json.sectors
          : Array.isArray(json?.data)
            ? json.data
            : [];
        const degraded = Boolean(json?.degraded);
        const sectors = rows
          .map((s) => ({ name: s.name || s.sector, chg: Number(s.changePct ?? 0) }))
          .sort((a, b) => b.chg - a.chg);
        if (!cancelled) {
          const empty = degraded || sectors.length === 0;
          setSectorEmpty(empty);
          setSectorData(
            empty
              ? { top: [], bottom: [] }
              : {
                  top: sectors.filter((s) => s.chg > 0).slice(0, 5),
                  bottom: sectors
                    .filter((s) => s.chg <= 0)
                    .slice(-5)
                    .reverse(),
                },
          );
          setSectorLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setSectorEmpty(true);
          setSectorLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pulseRange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let res = await fetch('/api/alpha/movers?limit=3');
        if (!res.ok) {
          res = await fetch('/api/fmp/movers?limit=3');
        }
        if (!res.ok) return;
        const data = await res.json();
        const toPct = (s) => parseFloat(String(s).replace(/[+%]/g, '')) || 0;
        if (!cancelled) {
          setGainers(
            (data.gainers || []).slice(0, 3).map((g) => ({
              sym: g.ticker,
              pct: toPct(g.change),
              chg: g.dollarChange ?? g.change ?? '—',
            })),
          );
          setLosers(
            (data.losers || []).slice(0, 3).map((l) => ({
              sym: l.ticker,
              pct: toPct(l.change),
              chg: l.dollarChange ?? l.change ?? '—',
            })),
          );
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tradesRes, lobbyingRes] = await Promise.allSettled([
          fetch('/api/fmp/congress-latest', { cache: 'no-store' }),
          fetch('/api/quiver/lobbying', { cache: 'no-store' }),
        ]);

        const tradeRows = [];
        if (tradesRes.status === 'fulfilled' && tradesRes.value.ok) {
          const tradesData = await tradesRes.value.json();
          const trades = tradesData.trades || tradesData || [];
          for (const t of Array.isArray(trades) ? trades.slice(0, 4) : []) {
            tradeRows.push({
              kind: 'trade',
              rep: t.representative || t.name || '—',
              cham: t.chamber || t.house || 'Congress',
              when: t.transactionDate || t.date || '—',
              sym: t.ticker || t.symbol || '—',
              side: (t.type || t.transactionType || '').toUpperCase().includes('PURCHASE')
                ? 'BUY'
                : 'SELL',
              size: t.amount || t.range || '—',
              ts: t.transactionDate ? new Date(t.transactionDate).getTime() : 0,
            });
          }
        }

        const lobbyingRows = [];
        if (lobbyingRes.status === 'fulfilled' && lobbyingRes.value.ok) {
          const lobbyingData = await lobbyingRes.value.json();
          const items = Array.isArray(lobbyingData) ? lobbyingData : [];
          for (const l of items.slice(0, 4)) {
            const amount = Number(l.Amount);
            const amountFmt = Number.isFinite(amount)
              ? amount >= 1_000_000
                ? `$${(amount / 1_000_000).toFixed(1)}M`
                : amount >= 1_000
                  ? `$${(amount / 1_000).toFixed(0)}K`
                  : `$${amount.toLocaleString()}`
              : '—';
            lobbyingRows.push({
              kind: 'lobbying',
              rep: l.Client || l.Registrant || '—',
              cham: 'Lobbying',
              when: l.Date || '—',
              sym: (l.Ticker || '').toUpperCase() || '—',
              side: 'LOBBY',
              size: amountFmt,
              ts: l.Date ? new Date(l.Date).getTime() : 0,
            });
          }
        }

        const merged = [...tradeRows, ...lobbyingRows].sort((a, b) => b.ts - a.ts).slice(0, 6);

        if (!cancelled) {
          setCongressTrades(merged);
        }
      } catch {
        /* ignore — fallback empty-state placeholder will render */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const holdingTickers = (normalizedHoldings || [])
          .map((h) => (h.ticker || '').toUpperCase())
          .filter(Boolean);
        const watchlistTickers = (userWatchlists || [])
          .flatMap((w) => (w.stocks || []).map((s) => (s.ticker || '').toUpperCase()))
          .filter(Boolean);
        const userTickers = new Set([...holdingTickers, ...watchlistTickers]);

        const res = await fetch('/api/isr/feed?window=24h&minSeverity=Low', {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        const allEvents = Array.isArray(data?.events) ? data.events : [];

        const SEVERITY_RANK = { Critical: 3, High: 2, Medium: 1, Low: 0 };
        const scored = allEvents.map((e) => {
          const impacted = Array.isArray(e.impactedSymbols)
            ? e.impactedSymbols.map((s) => String(s).toUpperCase())
            : [];
          const matchedTicker = impacted.find((s) => userTickers.has(s));
          return {
            event: e,
            relevance: matchedTicker ? 1 : 0,
            matchedTicker: matchedTicker || impacted[0] || '',
            severity: SEVERITY_RANK[e.severity] ?? 0,
            ts: e.publishedAt ? new Date(e.publishedAt).getTime() : 0,
          };
        });
        scored.sort((a, b) => b.relevance - a.relevance || b.severity - a.severity || b.ts - a.ts);

        const top = scored.slice(0, 5).map(({ event, matchedTicker }) => ({
          sym: matchedTicker || '',
          title: event.headline || '',
          src: event.source || '',
          url: event.url || '#',
          when: event.publishedAt
            ? new Date(event.publishedAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })
            : '',
        }));

        if (!cancelled) {
          setOpportunities(top);
        }
      } catch {
        /* ignore — empty state will render */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [normalizedHoldings, userWatchlists]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (moversWindow === 'daily') {
          const batchSyms = HOME_COMMODITIES.map((c) => c.batchSym).join(',');
          const res = await fetch(
            `/api/market/batch-quotes?symbols=${encodeURIComponent(batchSyms)}`,
          );
          if (!res.ok) return;
          const data = await res.json();
          const quotes = data?.quotes || {};
          const rows = HOME_COMMODITIES.map((c) => {
            const q = quotes[c.batchSym];
            if (!q) return null;
            const pct = Number(q.changePercent);
            if (!Number.isFinite(pct)) return null;
            return {
              sym: c.name,
              pct,
              price: Number(q.price) || 0,
            };
          }).filter(Boolean);
          if (!cancelled) setCommodityMovers(rows);
        } else {
          const results = await Promise.all(
            HOME_COMMODITIES.map(async (c) => {
              try {
                const r = await fetch(
                  `/api/market-data/stock-candles?symbol=${encodeURIComponent(c.candleSym)}&range=1W`,
                );
                if (!r.ok) return null;
                const j = await r.json();
                const row = weeklyPctFromCandles(j.candles || j.points || []);
                return row ? { sym: c.name, ...row } : null;
              } catch {
                return null;
              }
            }),
          );
          if (!cancelled) setCommodityMovers(results.filter(Boolean));
        }
      } catch {
        /* ignore — empty state will render */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [moversWindow]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (moversWindow === 'daily') {
          const res = await fetch('/api/fmp/crypto');
          if (!res.ok) return;
          const data = await res.json();
          const rows = (data.quotes || []).map((q) => ({
            sym: q.name,
            pct: Number(q.changePercent) || 0,
            price: Number(q.price) || 0,
          }));
          if (!cancelled) setCryptoMovers(rows);
        } else {
          const list = await fetch('/api/fmp/crypto').then((r) =>
            r.ok ? r.json() : { quotes: [] },
          );
          const symbols = (list.quotes || []).map((q) => ({ sym: q.symbol, name: q.name }));
          const results = await Promise.all(
            symbols.map(async (s) => {
              try {
                const r = await fetch(
                  `/api/market-data/stock-candles?symbol=${encodeURIComponent(s.sym)}&range=1W`,
                );
                if (!r.ok) return null;
                const j = await r.json();
                const row = weeklyPctFromCandles(j.candles || j.points || []);
                return row ? { sym: s.name, ...row } : null;
              } catch {
                return null;
              }
            }),
          );
          if (!cancelled) setCryptoMovers(results.filter(Boolean));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [moversWindow]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === '1') {
      fetch('/api/portfolio/holdings', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) setPlaidHoldingsPayload(d);
        });
      refreshPlaidSummary();
      window.history.replaceState({}, '', '/home');
    }
  }, [refreshPlaidSummary]);

  /* Fetch unified holdings (SnapTrade preferred, Plaid fallback) */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/portfolio/holdings', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setPlaidHoldingsPayload(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  /* Live quotes: portfolio holdings + watchlist */
  useEffect(() => {
    const holdingTickers = normalizedHoldings.map((h) => h.ticker).filter(Boolean);
    const watchTickers = userWatchlists
      .flatMap((w) => (w.stocks || []).map((s) => s.ticker))
      .filter(Boolean);
    const tickers = [...new Set([...holdingTickers, ...watchTickers])];
    if (!tickers.length) return;
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
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [normalizedHoldings.length, userWatchlists]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch('/api/leaderboard/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d || d.error) return;
        setStreakMultiplier(Boolean(d.multiplier_active));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const wlTickers = userWatchlists
          .flatMap((w) => (w.stocks || []).map((s) => s.ticker))
          .filter(Boolean)
          .slice(0, 20)
          .join(',');
        const tickerParam = wlTickers ? `&tickers=${wlTickers}` : '';
        const res = await fetch(`/api/market-data/news?limit=12${tickerParam}`);
        if (!res.ok) return;
        const data = await res.json();
        const newsItems = (data.news || []).slice(0, 12).map((a) => ({
          tag: (a.source || 'NEWS').toString().toUpperCase().slice(0, 10),
          text: a.title || a.headline || '',
          url: a.url || '',
        }));

        const watchPriceItems = [];
        for (const wl of userWatchlists) {
          for (const s of (wl.stocks || []).slice(0, 8)) {
            const q = liveQuotes[s.ticker];
            if (!q) continue;
            const px = q.price ?? 0;
            const ch = q.changePercent ?? 0;
            watchPriceItems.push({
              tag: s.ticker,
              text: `${px.toLocaleString('en-US', { minimumFractionDigits: 2 })}  ${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%`,
              url: `/company-research?q=${encodeURIComponent(s.ticker)}`,
            });
          }
        }

        const INDEX_TICKER_MAP = {
          'S&P 500': 'SPY',
          NASDAQ: 'QQQ',
          'Russell 2K': 'IWM',
          'Dow Jones': 'DIA',
          VIX: 'VIXY',
          WTI: 'USO',
          '10Y': 'IEF',
        };
        const indexPriceItems = indices.map((idx) => ({
          tag: idx.sym,
          text: `${idx.last}  ${idx.chg}`,
          url: INDEX_TICKER_MAP[idx.sym]
            ? `/company-research?q=${encodeURIComponent(INDEX_TICKER_MAP[idx.sym])}`
            : '',
        }));

        const merged = [];
        const allPrices = [...indexPriceItems, ...watchPriceItems];
        const maxLen = Math.max(newsItems.length, allPrices.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < newsItems.length) merged.push(newsItems[i]);
          if (i < allPrices.length) merged.push(allPrices[i]);
        }

        if (!cancelled && merged.length) setTickerItems(merged);
      } catch {
        /* keep fallback */
      }
    };
    load();
    const id = setInterval(load, 120000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [liveQuotes, indices, userWatchlists]);

  return (
    <div className="bs-shell">
      {/* ═══ TICKER MARQUEE ═══ */}
      <div className="bs-ticker">
        <div className="bs-ticker-inner">
          {tickerItems.concat(tickerItems).map((t, i) => {
            const isInternal = t.url && t.url.startsWith('/');
            const isExternal = t.url && !t.url.startsWith('/');
            return (
              <a
                key={i}
                href={t.url || '#'}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="bs-ticker-item"
                onClick={(e) => {
                  if (!t.url) {
                    e.preventDefault();
                    return;
                  }
                  if (isInternal) {
                    e.preventDefault();
                    router.push(t.url);
                  }
                }}
              >
                <span className="bs-ticker-tag">{t.tag}</span>
                <span className="bs-ticker-text">{t.text}</span>
              </a>
            );
          })}
        </div>
      </div>

      {/* ═══ BAND 0 — HERO ═══ */}
      <section className="bs-band bs-band--light">
        <div className="bs-page-inner">
          <div className="bs-hero-row">
            <div className="bs-hero-l">
              <div className="bs-eyebrow">
                {formatBriefLabel()} · {formatLongDate()}
              </div>
              <h1 className="bs-hero-greet">
                {getGreeting()}, {firstName}.
              </h1>
              <p className="bs-hero-lede">
                Markets closed higher. Your portfolio outpaced the S&amp;P 500 by{' '}
                <strong className="bs-strong">1.24%</strong> today, led by{' '}
                <button
                  type="button"
                  className="bs-ticker-link"
                  onClick={() => setTickerModal('TSLA')}
                >
                  TSLA
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  className="bs-ticker-link"
                  onClick={() => setTickerModal('AVGO')}
                >
                  AVGO
                </button>
                . Watch the <strong className="bs-strong">PCE print</strong> Thursday.
              </p>
              <div className="bs-hero-progress">
                <div className="bs-prog-card bs-prog-card--compact">
                  <div className="bs-prog-label">
                    Day streak
                    {streakMultiplier ? (
                      <span className="bs-streak-mult"> · 1.5× ELO active</span>
                    ) : null}
                  </div>
                  <div className="bs-prog-num">
                    {streakDays}
                    <span className="bs-prog-slash">/30</span>
                  </div>
                  <div className="bs-streak-bars">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <span
                        key={i}
                        className={`bs-streak-bar ${i < streakDays ? 'bs-streak-bar--filled' : ''}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="bs-prog-card bs-prog-card--compact">
                  <div className="bs-prog-label">ELO rating · {eloTier}</div>
                  <div className="bs-prog-num">
                    {eloRating.toLocaleString()}
                    <span className="bs-prog-slash">/10,000</span>
                  </div>
                  <div className="bs-elo-track">
                    <div
                      className="bs-elo-fill"
                      style={{ width: `${Math.min(100, (eloRating / 10000) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="bs-hero-r">
              <div className="bs-hero-r-head">
                <div className="bs-section-label">
                  {isOrgUser && orgData?.name ? `${orgData.name} portfolio` : 'My Portfolio'}
                </div>
                <button
                  type="button"
                  className="bs-add-portfolio-btn"
                  onClick={() => setAddPortfolioOpen(true)}
                >
                  + Add Portfolio
                </button>
              </div>
              <div className="bs-hero-num">{fmtMoney(displayValue)}</div>
              <div className="bs-hero-delta-row">
                <span className={`bs-hero-pos ${changePct >= 0 ? '' : 'bs-hero-pos--neg'}`}>
                  {fmtPct(changePct)}
                </span>
                <span className="bs-hero-abs">
                  {changeAbs >= 0 ? '+' : ''}
                  {fmtMoney(Math.abs(changeAbs))} · today
                </span>
              </div>
              <div className="bs-hero-stats">
                {[
                  ['1W', '+8.42%'],
                  ['1M', '+12.10%'],
                  ['YTD', '+24.7%'],
                  ['Beta', '1.08'],
                ].map(([l, v]) => (
                  <div key={l} className="bs-hero-stat">
                    <div className="bs-hero-stat-label">{l}</div>
                    <div className="bs-hero-stat-val">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BAND I — LATELY ON EZANA ═══ */}
      <section className="bs-band bs-band--cream">
        <div className="bs-page-inner">
          <BandHeader
            number="I"
            label="Lately on Ezana"
            meta={`Performance · ${timeframe === '1D' ? 'today' : timeframe === '5D' ? 'trailing five days' : timeframe === '1M' ? 'past month' : timeframe === '3M' ? 'past 3 months' : timeframe === '6M' ? 'past 6 months' : timeframe === '1Y' ? 'past year' : 'all time'}`}
            centered
          />
          <div className="bs-chart-block">
            <div className="bs-chart-range-row">
              <DateSelector
                ranges={RANGE_BUTTONS}
                value={timeframe}
                onChange={setTimeframe}
                size="lg"
              />
            </div>

            <div className="bs-chart-wide">
              {valueSeriesLoading || indexSeriesLoading ? (
                <div className="bs-chart-loading">Loading chart…</div>
              ) : combinedChartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={combinedChartData}>
                    <defs>
                      <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--bs-green)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="var(--bs-green)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--bs-border-subtle)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="at"
                      tick={{ fill: 'var(--bs-text-label)', fontSize: 11 }}
                      axisLine={{ stroke: 'var(--bs-border-rule)' }}
                      tickLine={false}
                      interval="preserveStartEnd"
                      minTickGap={60}
                      tickFormatter={(at) => formatTickByRange(at, timeframe)}
                    />
                    <YAxis
                      tick={{ fill: 'var(--bs-text-label)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => (v >= 0 ? '+' : '') + v.toFixed(1) + '%'}
                      width={55}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0].payload;
                        return (
                          <div className="bs-chart-tooltip">
                            <div className="bs-chart-tooltip-date">
                              {formatTickByRange(p.at, timeframe)}
                            </div>
                            {payload.map((entry) => (
                              <div
                                key={entry.dataKey}
                                className="bs-chart-tooltip-val"
                                style={{ color: entry.stroke }}
                              >
                                {entry.name}:{' '}
                                {(entry.value >= 0 ? '+' : '') + entry.value.toFixed(2)}%
                              </div>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="portfolio"
                      name="Portfolio"
                      stroke="var(--bs-green)"
                      strokeWidth={2}
                      fill="url(#portfolioFill)"
                      isAnimationActive
                      animationDuration={400}
                    />
                    {Array.from(activeIndices).map((label) => {
                      const apiKey = INDEX_API_KEYS[label];
                      if (!apiKey) return null;
                      return (
                        <Area
                          key={apiKey}
                          type="monotone"
                          dataKey={apiKey}
                          name={label}
                          stroke={indexColor(label)}
                          strokeWidth={1.5}
                          fill="transparent"
                          isAnimationActive={false}
                          connectNulls
                        />
                      );
                    })}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="bs-chart-loading">No data for this range</div>
              )}
            </div>

            <div className="bs-index-strip">
              {indices.map((idx) => {
                const isOn = activeIndices.has(idx.sym);
                return (
                  <button
                    key={idx.sym}
                    type="button"
                    className={`bs-index-chip ${isOn ? 'bs-index-chip--active' : ''}`}
                    onClick={() =>
                      setActiveIndices((prev) => {
                        const next = new Set(prev);
                        if (next.has(idx.sym)) next.delete(idx.sym);
                        else next.add(idx.sym);
                        return next;
                      })
                    }
                  >
                    <span
                      className="bs-index-chip-dot"
                      style={{
                        background: isOn ? indexColor(idx.sym) : 'var(--bs-border-rule)',
                      }}
                    />
                    <span>{idx.sym}</span>
                    <span
                      className="bs-index-chip-pct"
                      style={{
                        color: isOn ? 'inherit' : idx.up ? 'var(--bs-green)' : 'var(--bs-red)',
                      }}
                    >
                      {idx.chg}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BAND II — POSITIONS & PROGRESS ═══ */}
      <section className="bs-band bs-band--light">
        <div className="bs-page-inner">
          <BandHeader number="II" label="Positions &amp; progress" meta="Holdings · streak · ELO" />
          <div className="bs-pos-row">
            <div className="bs-pos-l">
              <div className="bs-sub-head">
                <h3 className="bs-sub-title">Holdings</h3>
                <span className="bs-sub-meta">
                  {normalizedHoldings.length === 0
                    ? 'No positions'
                    : `Page ${holdingsPage + 1} of ${holdingsPageCount} · ${normalizedHoldings.length} total`}
                </span>
              </div>
              {pagedHoldings.length === 0 ? (
                <p className="bs-holdings-empty">
                  {useMock
                    ? 'No mock positions yet — open Mock Trading to build a portfolio.'
                    : plaidConnected
                      ? 'Holdings sync in progress…'
                      : 'Link a brokerage or try Mock Trading to see positions here.'}
                </p>
              ) : (
                <table className="bs-table">
                  <thead>
                    <tr>
                      <th className="bs-th bs-th--l">Symbol</th>
                      <th className="bs-th bs-th--l">Name</th>
                      <th className="bs-th bs-th--r">Day</th>
                      <th className="bs-th bs-th--r">Value</th>
                      <th className="bs-th bs-th--r">Weight</th>
                      <th className="bs-th bs-th--r">7-day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedHoldings.map((h, i) => {
                      const q = liveQuotes[h.ticker];
                      const ch = q?.changePercent ?? h.change ?? 0;
                      const weight =
                        totalPortfolioValue > 0 ? (h.positionValue / totalPortfolioValue) * 100 : 0;
                      const up = ch >= 0;
                      return (
                        <tr key={h.ticker} className="bs-tr">
                          <td className="bs-td-sym">
                            {h.ticker}
                            {h.freshness === 'end_of_day' && (
                              <span className="hpg-eod-badge" title="End-of-day data (via Plaid)">
                                EOD
                              </span>
                            )}
                          </td>
                          <td className="bs-td-name">{h.name}</td>
                          <td className={`bs-td-r ${up ? 'bs-td-r--up' : 'bs-td-r--down'}`}>
                            {fmtPct(ch)}
                          </td>
                          <td className="bs-td-r">
                            ${h.positionValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="bs-td-r">{weight.toFixed(1)}%</td>
                          <td className="bs-td-spark">
                            <Spark
                              values={genSeries(7 + i * 11, 28, up ? 0.6 : -0.3, 1.2)}
                              color={up ? 'var(--bs-green)' : 'var(--bs-red)'}
                              fill
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {holdingsPageCount > 1 && (
                <div className="bs-pagination">
                  <button
                    type="button"
                    disabled={holdingsPage === 0}
                    onClick={() => setHoldingsPage((p) => p - 1)}
                  >
                    ← Prev
                  </button>
                  <span>
                    {holdingsPage + 1} / {holdingsPageCount}
                  </span>
                  <button
                    type="button"
                    disabled={holdingsPage >= holdingsPageCount - 1}
                    onClick={() => setHoldingsPage((p) => p + 1)}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
            <div className="bs-pos-r">
              {sectorRows.length > 0 && (
                <div className="bs-sector-panel">
                  <div className="bs-prog-label">Sector breakdown</div>
                  {sectorRows.slice(0, 5).map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      className="bs-sector-row bs-sector-row--btn"
                      onClick={() => setSectorDrilldown(s.name)}
                    >
                      <span className="bs-sector-name">
                        <span className="bs-sector-dot" style={{ background: s.color }} />
                        {s.name}
                      </span>
                      <div className="bs-sector-bar">
                        <div
                          className="bs-sector-bar-fill"
                          style={{ width: `${s.pct}%`, background: s.color }}
                        />
                      </div>
                      <span className="bs-sector-pct">{s.pct}%</span>
                    </button>
                  ))}
                </div>
              )}
              {profitBars.length > 0 && (
                <div className="bs-profits-panel">
                  <div className="bs-prog-label">Position P&amp;L</div>
                  {(() => {
                    const maxMag =
                      profitBars.reduce(
                        (m, r) =>
                          Math.max(
                            m,
                            typeof r.pnl === 'number' ? Math.abs(r.pnl) : r.weightPct || 0,
                          ),
                        0,
                      ) || 1;
                    return profitBars.map((r) => {
                      const mag = typeof r.pnl === 'number' ? Math.abs(r.pnl) : r.weightPct || 0;
                      const positive = typeof r.pnl === 'number' ? r.pnl >= 0 : true;
                      const barColor =
                        typeof r.pnl === 'number' ? (positive ? '#34d399' : '#f87171') : r.color;
                      return (
                        <div key={r.symbol} className="bs-profits-bar-row">
                          <span className="bs-profits-sym">{r.symbol}</span>
                          <div className="bs-profits-track">
                            <div
                              className="bs-profits-fill"
                              style={{
                                width: `${(mag / maxMag) * 100}%`,
                                background: barColor,
                              }}
                            />
                          </div>
                          <span className="bs-profits-val" style={{ color: barColor }}>
                            {typeof r.pnl === 'number'
                              ? `${positive ? '+' : '-'}$${Math.abs(r.pnl).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                              : `${(r.weightPct || 0).toFixed(0)}%`}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
              <div className="bs-watchlist-panel">
                <div className="bs-sub-head">
                  <h3 className="bs-sub-title">Watchlist</h3>
                  {userWatchlists.length > 1 && (
                    <select
                      value={selectedWatchlistId || ''}
                      onChange={(e) => setSelectedWatchlistId(e.target.value)}
                      className="bs-watchlist-select"
                    >
                      {userWatchlists.map((wl) => (
                        <option key={wl.id} value={wl.id}>
                          {wl.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {watchlistRows.length === 0 ? (
                  <p className="bs-watchlist-empty">
                    Empty watchlist — add symbols to track live prices.
                  </p>
                ) : (
                  watchlistRows.map((w) => {
                    const q = liveQuotes[w.ticker];
                    const px = q?.price ?? w.price;
                    const ch = q?.changePercent ?? w.change;
                    return (
                      <div key={w.ticker} className="bs-watchlist-row">
                        <span className="bs-watchlist-ticker">{w.ticker}</span>
                        <span className="bs-watchlist-name">{w.name}</span>
                        <span className="bs-watchlist-price">
                          ${Number(px).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span
                          className={`bs-watchlist-chg ${ch >= 0 ? 'bs-pulse-pct--up' : 'bs-pulse-pct--down'}`}
                        >
                          {ch >= 0 ? '+' : ''}
                          {Number(ch).toFixed(2)}%
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BAND III — MARKETS PULSE (dark) ═══ */}
      <section className="bs-band bs-band--dark">
        <div className="bs-page-inner">
          <BandHeader
            number="III"
            label="Markets pulse"
            meta={`S&P 500 GICS · ${
              {
                '1D': 'today',
                '1W': 'past week',
                '1M': 'past month',
                '3M': 'past 3 months',
                '6M': 'past 6 months',
                '1Y': 'past year',
                '3Y': 'past 3 years',
                '5Y': 'past 5 years',
                '10Y': 'past 10 years',
                ALL: 'all time',
                CUSTOM: 'custom range',
              }[pulseRange] || 'recent'
            }`}
            dark
          />
          <div className="bs-chart-range-row">
            <DateSelector
              ranges={RANGE_BUTTONS}
              value={pulseRange}
              onChange={setPulseRange}
              size="lg"
            />
          </div>
          <div className="bs-pulse-row">
            {sectorLoaded && sectorEmpty ? (
              <p className="bs-pulse-empty">No sector data yet</p>
            ) : null}
            <div className="bs-pulse-col">
              <div className="bs-pulse-head-dark">Leaders</div>
              {(sectorData.top.length
                ? sectorData.top
                : sectorLoaded
                  ? []
                  : [{ name: 'Loading…', chg: 0 }]
              ).map((s) => (
                <div key={s.name} className="bs-pulse-line">
                  <span className="bs-pulse-name">{s.name}</span>
                  <div className="bs-pulse-bar">
                    <div
                      className="bs-pulse-bar-fill bs-pulse-bar-fill--up"
                      style={{ width: `${Math.min((Math.abs(s.chg) / 2) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="bs-pulse-pct bs-pulse-pct--up">
                    {s.chg >= 0 ? '+' : ''}
                    {s.chg.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
            <div className="bs-pulse-divider" />
            <div className="bs-pulse-col">
              <div className="bs-pulse-head-dark">Laggards</div>
              {(sectorData.bottom.length
                ? sectorData.bottom
                : sectorLoaded
                  ? []
                  : [{ name: 'Loading…', chg: 0 }]
              ).map((s) => (
                <div key={s.name} className="bs-pulse-line">
                  <span className="bs-pulse-name">{s.name}</span>
                  <div className="bs-pulse-bar">
                    <div
                      className="bs-pulse-bar-fill bs-pulse-bar-fill--down"
                      style={{ width: `${Math.min((Math.abs(s.chg) / 2) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="bs-pulse-pct bs-pulse-pct--down">
                    {s.chg >= 0 ? '+' : ''}
                    {s.chg.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BAND IV — THE SCHEDULE ═══ */}
      <section className="bs-band bs-band--cream">
        <div className="bs-page-inner">
          <BandHeader number="IV" label="The schedule" meta="Events, releases &amp; filings" />
          <div
            className="bs-sched-filters"
            role="tablist"
            aria-label="Filter schedule by event category"
          >
            {availableScheduleFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={eventFilter === f.key}
                className={`bs-sched-chip${eventFilter === f.key ? ' is-active' : ''}`}
                onClick={() => setEventFilter(f.key)}
              >
                {f.key !== 'all' && (
                  <span
                    className="bs-sched-chip-dot"
                    style={{ background: eventCategoryColor(f.key) }}
                  />
                )}
                {f.label}
              </button>
            ))}
          </div>
          <div className="bs-sched-row">
            <div className="bs-sched-events">
              {scheduleLoading && scheduleData.totalWindow === 0 ? (
                <div className="bs-sched-empty">Loading upcoming events…</div>
              ) : scheduleData.dayGroups.length === 0 ? (
                <div className="bs-sched-empty">
                  {scheduleData.totalWindow === 0
                    ? 'No upcoming events in the next week. Economic releases for your region and events for the companies, politicians and assets you follow will appear here.'
                    : `No ${(
                        SCHEDULE_FILTERS.find((f) => f.key === eventFilter)?.label || ''
                      ).toLowerCase()} events in the next week.`}
                </div>
              ) : (
                scheduleData.dayGroups.map((group) => (
                  <div key={group.day} className="bs-event-day-block">
                    <div className="bs-event-day-head">
                      <span className="bs-event-day-label">{group.label}</span>
                      <span className="bs-event-day-count">
                        {group.items.length} {group.items.length === 1 ? 'event' : 'events'}
                      </span>
                    </div>
                    <div className="bs-event-grid">
                      {group.items.map((ev) => (
                        <div
                          key={ev.id}
                          className="bs-event-item"
                          style={{ borderLeft: `2px solid ${ev.color || eventCategoryColor(ev.category)}` }}
                          title={ev.subtitle || ev.title}
                        >
                          <div
                            className="bs-event-date"
                            style={{ color: ev.color || eventCategoryColor(ev.category) }}
                          >
                            {EVENT_CATEGORY_META[ev.category]?.label || ev.category}
                            {ev.time ? ` · ${ev.time}` : ''}
                          </div>
                          <div className="bs-event-title">{ev.title}</div>
                          <div className="bs-event-meta-row">
                            <span>{ev.subtitle || ev.symbol || ''}</span>
                            {ev.impact === 'High' && <span className="bs-event-flag">HIGH</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="bs-sched-aside">
              <MiniCalendar
                cells={scheduleData.cells}
                dayToCategories={scheduleData.dayToCategories}
                today={scheduleData.today}
                monthTitle={scheduleData.monthTitle}
                legend={scheduleData.legend}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BAND V — INTELLIGENCE ═══ */}
      <section className="bs-band bs-band--light">
        <div className="bs-page-inner">
          <BandHeader number="V" label="Intelligence" />
          <div className="bs-intel-grid">
            {/* Column A — Market opportunities */}
            <div className="bs-intel-col">
              <div className="bs-sub-head">
                <h3 className="bs-sub-title">Market opportunities</h3>
                <span className="bs-sub-meta">Matched · moderate</span>
              </div>
              {(opportunities.length
                ? opportunities
                : [{ sym: '—', title: 'Loading headlines…', src: '', when: '', url: '' }]
              ).map((o, i) => (
                <a
                  key={`${o.sym}-${i}`}
                  href={o.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bs-opp-row bs-opp-row--link"
                  onClick={(e) => {
                    if (!o.url) e.preventDefault();
                  }}
                >
                  <div className="bs-opp-rule">
                    <span className="bs-opp-sym">{o.sym}</span>
                    <span className="bs-opp-when">{o.when}</span>
                  </div>
                  <div className="bs-opp-title">{o.title}</div>
                  <div className="bs-opp-src">{o.src}</div>
                </a>
              ))}
            </div>

            {/* Column B — Congressional tracker */}
            <div className="bs-intel-col">
              <div className="bs-sub-head">
                <h3 className="bs-sub-title">Congressional tracker</h3>
                <span className="bs-sub-meta">Latest 24h</span>
              </div>
              {(congressTrades.length
                ? congressTrades
                : [{ rep: '—', cham: '', when: '', sym: '—', side: 'BUY', size: '—' }]
              ).map((c, i) => (
                <div key={`${c.sym}-${i}`} className="bs-cong-row">
                  <div className="bs-cong-left">
                    <div className="bs-cong-name">{c.rep}</div>
                    <div className="bs-cong-meta">
                      {c.cham} · {c.when}
                    </div>
                  </div>
                  <div className="bs-cong-right">
                    <div className="bs-cong-sym">{c.sym}</div>
                    <div
                      className={`bs-cong-side ${
                        c.side === 'BUY'
                          ? 'bs-cong-side--buy'
                          : c.side === 'LOBBY'
                            ? 'bs-cong-side--lobby'
                            : 'bs-cong-side--sell'
                      }`}
                    >
                      {c.side}
                    </div>
                    <div className="bs-cong-size">{c.size}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bs-movers-row">
            <div className="bs-sub-head">
              <h3 className="bs-sub-title">{moversTitle}</h3>
              <span className="bs-sub-meta">
                {moversWindow === 'weekly' ? 'Week ending Friday close' : 'Current session'}
              </span>
            </div>

            <div className="bs-movers-grid">
              <div className="bs-movers-col">
                <div className="bs-mover-group-head">Equities</div>
                <div className="bs-mover-head">Gainers</div>
                {(gainers.length ? gainers : [{ sym: '—', pct: 0 }]).slice(0, 3).map((g, i) => (
                  <Link
                    key={`eg-${g.sym}-${i}`}
                    href={`/company-research?q=${encodeURIComponent(g.sym)}`}
                    className="bs-mover-row bs-mover-row--link"
                  >
                    <span className="bs-mover-sym">{g.sym}</span>
                    <span className="bs-mover-pct bs-mover-pct--up">+{g.pct.toFixed(2)}%</span>
                    <Spark
                      values={genSeries(91 + i * 7, 24, 0.8, 1.0)}
                      color="var(--bs-green)"
                      w={56}
                      h={20}
                    />
                  </Link>
                ))}
                <div className="bs-mover-head" style={{ marginTop: 10 }}>
                  Losers
                </div>
                {(losers.length ? losers : [{ sym: '—', pct: 0 }]).slice(0, 3).map((l, i) => (
                  <Link
                    key={`el-${l.sym}-${i}`}
                    href={`/company-research?q=${encodeURIComponent(l.sym)}`}
                    className="bs-mover-row bs-mover-row--link"
                  >
                    <span className="bs-mover-sym">{l.sym}</span>
                    <span className="bs-mover-pct bs-mover-pct--down">{l.pct.toFixed(2)}%</span>
                    <Spark
                      values={genSeries(31 + i * 9, 24, -0.6, 1.0)}
                      color="var(--bs-red)"
                      w={56}
                      h={20}
                    />
                  </Link>
                ))}
              </div>

              <div className="bs-movers-col">
                <div className="bs-mover-group-head">Commodities</div>
                <div className="bs-mover-head">Gainers</div>
                {commodityGainers.length === 0 ? (
                  <p className="bs-mover-empty">No gainers</p>
                ) : (
                  commodityGainers.map((c, i) => (
                    <Link
                      key={`cg-${c.sym}`}
                      href="/watchlist"
                      className="bs-mover-row bs-mover-row--link"
                    >
                      <span className="bs-mover-sym">{c.sym}</span>
                      <span className="bs-mover-pct bs-mover-pct--up">+{c.pct.toFixed(2)}%</span>
                      <Spark
                        values={genSeries(41 + i * 13, 24, 0.5, 1.0)}
                        color="var(--bs-green)"
                        w={56}
                        h={20}
                      />
                    </Link>
                  ))
                )}
                <div className="bs-mover-head" style={{ marginTop: 10 }}>
                  Losers
                </div>
                {commodityLosers.length === 0 ? (
                  <p className="bs-mover-empty">No losers</p>
                ) : (
                  commodityLosers.map((c, i) => (
                    <Link
                      key={`cl-${c.sym}`}
                      href="/watchlist"
                      className="bs-mover-row bs-mover-row--link"
                    >
                      <span className="bs-mover-sym">{c.sym}</span>
                      <span className="bs-mover-pct bs-mover-pct--down">{c.pct.toFixed(2)}%</span>
                      <Spark
                        values={genSeries(141 + i * 13, 24, -0.5, 1.0)}
                        color="var(--bs-red)"
                        w={56}
                        h={20}
                      />
                    </Link>
                  ))
                )}
              </div>

              <div className="bs-movers-col">
                <div className="bs-mover-group-head">Alternatives</div>
                <div className="bs-mover-head">Gainers</div>
                {cryptoGainers.length === 0 ? (
                  <p className="bs-mover-empty">No gainers</p>
                ) : (
                  cryptoGainers.map((c, i) => (
                    <Link
                      key={`ag-${c.sym}`}
                      href="/watchlist"
                      className="bs-mover-row bs-mover-row--link"
                    >
                      <span className="bs-mover-sym">{c.sym}</span>
                      <span className="bs-mover-pct bs-mover-pct--up">+{c.pct.toFixed(2)}%</span>
                      <Spark
                        values={genSeries(51 + i * 5, 24, 0.6, 1.2)}
                        color="var(--bs-green)"
                        w={56}
                        h={20}
                      />
                    </Link>
                  ))
                )}
                <div className="bs-mover-head" style={{ marginTop: 10 }}>
                  Losers
                </div>
                {cryptoLosers.length === 0 ? (
                  <p className="bs-mover-empty">No losers</p>
                ) : (
                  cryptoLosers.map((c, i) => (
                    <Link
                      key={`al-${c.sym}`}
                      href="/watchlist"
                      className="bs-mover-row bs-mover-row--link"
                    >
                      <span className="bs-mover-sym">{c.sym}</span>
                      <span className="bs-mover-pct bs-mover-pct--down">{c.pct.toFixed(2)}%</span>
                      <Spark
                        values={genSeries(151 + i * 5, 24, -0.4, 1.2)}
                        color="var(--bs-red)"
                        w={56}
                        h={20}
                      />
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ COLOPHON ═══ */}
      <div className="bs-band bs-band--dark">
        <div className="bs-page-inner">
          <div className="bs-colophon">
            <span>EZANA · {formatBriefLabel()}</span>
            <span>
              Compiled{' '}
              {new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'America/New_York',
              })}{' '}
              ET · next update 22:00 ET
            </span>
          </div>
        </div>
      </div>

      {sectorDrilldown && (
        <div className="bs-sector-modal-overlay" onClick={() => setSectorDrilldown(null)}>
          <div className="bs-sector-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bs-sector-modal-head">
              <div>
                <div className="bs-sector-modal-eyebrow">Sector breakdown</div>
                <div className="bs-sector-modal-title">{sectorDrilldown}</div>
              </div>
              <button
                type="button"
                className="bs-sector-modal-close"
                onClick={() => setSectorDrilldown(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {sectorDrilldownHoldings.length === 0 ? (
              <p className="bs-sector-modal-empty">No holdings in this sector.</p>
            ) : (
              <table className="bs-sector-modal-table">
                <thead>
                  <tr>
                    <th className="bs-th bs-th--l">Symbol</th>
                    <th className="bs-th bs-th--l">Name</th>
                    <th className="bs-th bs-th--r">Day</th>
                    <th className="bs-th bs-th--r">Value</th>
                    <th className="bs-th bs-th--r">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {sectorDrilldownHoldings.map((h) => {
                    const q = liveQuotes[h.ticker];
                    const ch = q?.changePercent ?? h.change ?? 0;
                    const weight =
                      totalPortfolioValue > 0 ? (h.positionValue / totalPortfolioValue) * 100 : 0;
                    const up = ch >= 0;
                    return (
                      <tr key={h.ticker} className="bs-tr">
                        <td className="bs-td-sym">{h.ticker}</td>
                        <td className="bs-td-name">{h.name}</td>
                        <td className={`bs-td-r ${up ? 'bs-td-r--up' : 'bs-td-r--down'}`}>
                          {fmtPct(ch)}
                        </td>
                        <td className="bs-td-r">
                          ${h.positionValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="bs-td-r">{weight.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <AddPortfolioModal
        open={addPortfolioOpen}
        onClose={() => setAddPortfolioOpen(false)}
        onConnected={() => {
          setAddPortfolioOpen(false);
          refreshPlaidSummary();
        }}
      />

      {tickerModal && (
        <div className="bs-ticker-modal-overlay" onClick={() => setTickerModal(null)}>
          <div className="bs-ticker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bs-ticker-modal-head">
              <span className="bs-ticker-modal-sym">{tickerModal}</span>
              <button
                type="button"
                className="bs-ticker-modal-close"
                onClick={() => setTickerModal(null)}
              >
                ×
              </button>
            </div>
            <div className="bs-ticker-modal-ranges">
              <DateSelector
                ranges={RANGE_BUTTONS}
                value={tickerModalRange}
                onChange={setTickerModalRange}
                size="lg"
              />
            </div>
            <TickerPerformanceChart symbol={tickerModal} range={tickerModalRange} />
          </div>
        </div>
      )}
    </div>
  );
}
