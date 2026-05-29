'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useOrg } from '@/contexts/OrgContext';
import { HeroSparkline } from '@/components/dashboard/HeroSparkline';
import { TickerPerformanceChart } from '@/components/home/TickerPerformanceChart';
import { AddPortfolioModal } from '@/components/home/AddPortfolioModal';
import { useElo } from '@/hooks/useElo';
import { usePlaidPortfolioSummary } from '@/hooks/usePlaidPortfolioSummary';
import { usePortfolioValueSeries } from '@/hooks/usePortfolioValueSeries';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import { useWatchlists } from '@/hooks/useWatchlists';
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

const TICKER_ITEMS = [
  { tag: 'LIVE', text: 'JT CLOSED 20,371.81  +0.61%' },
  { tag: 'FLOWS', text: 'Equities +$2.1B · IG credit tight 2bps · HY issuance light' },
  { tag: 'CONGRESS', text: '14 STOCK Act filings (24h) — committees: Energy, Intel, Banking' },
  { tag: 'EIF', text: 'Quarterly window: elevated odds in AI · mfg · biotech mega caps' },
  { tag: 'FED WATCH', text: 'Speakers on deck — front-end yields tick higher into auction' },
];

const EVENTS = {
  TOMORROW: [
    {
      date: 'May 27',
      title: 'API Crude Oil Stock Change (May/22)',
      region: 'US',
      kind: 'economic',
    },
    { date: 'May 27', title: 'Fed Cook Speech', region: 'US', kind: 'fed' },
    { date: 'May 27', title: 'MBA 30-Year Mortgage Rate (May/22)', region: 'US', kind: 'economic' },
    { date: 'May 27', title: 'Fed Logan Speech', region: 'US', kind: 'fed' },
  ],
  'THU MAY 28': [
    {
      date: 'May 28',
      title: 'EIA Gasoline Stocks Change (May/22)',
      region: 'US',
      kind: 'economic',
    },
    {
      date: 'May 28',
      title: 'EIA Crude Oil Stocks Change (May/22)',
      region: 'US',
      kind: 'economic',
    },
    { date: 'May 28', title: 'New Home Sales (Apr)', region: 'US', kind: 'economic' },
    { date: 'May 28', title: 'Fed Williams Speech', region: 'US', kind: 'fed' },
    {
      date: 'May 28',
      title: 'PCE Price Index YoY (Apr)',
      region: 'US',
      kind: 'economic',
      flag: 'HIGH',
    },
  ],
};

const RANGE_BUTTONS = ['1D', '5D', '1M', '3M', '6M', '1Y', 'ALL'];

function portfolioSeriesRange(tf) {
  return tf === '5D' ? '7D' : tf;
}

const CAL_LEGEND = [
  { label: 'Earnings', color: '#0e7c4f' },
  { label: 'Dividends', color: '#0ea5e9' },
  { label: 'IPOs', color: '#a855f7' },
  { label: 'Economic', color: '#d97706' },
  { label: 'Capitol', color: '#94a3b8' },
];

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
function BandHeader({ number, label, meta, dark = false }) {
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

/* Mini calendar component */
function MiniCalendar() {
  const weeks = [
    [null, null, null, null, 1, 2, 3],
    [4, 5, 6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15, 16, 17],
    [18, 19, 20, 21, 22, 23, 24],
    [25, 26, 27, 28, 29, 30, 31],
  ];
  const today = new Date().getDate();
  const eventDays = new Set([27, 28, 29, 30]);
  return (
    <div className="bs-cal-box">
      <div className="bs-cal-head">May 2026</div>
      <div className="bs-cal-grid">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <div key={d} className="bs-cal-dow">
            {d}
          </div>
        ))}
        {weeks.flat().map((d, i) => (
          <div
            key={i}
            className={`bs-cal-cell ${d === today ? 'bs-cal-cell--today' : ''} ${d === null ? 'bs-cal-cell--empty' : ''}`}
          >
            {d}
            {eventDays.has(d) && <span className="bs-cal-dot" />}
          </div>
        ))}
      </div>
      <div className="bs-cal-legend">
        {CAL_LEGEND.map((c) => (
          <div key={c.label} className="bs-cal-leg-item">
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
  const { user } = useAuth();
  const { isOrgUser, orgData } = useOrg();
  const {
    connected: plaidConnected,
    summary: plaidSummary,
    refresh: refreshPlaidSummary,
  } = usePlaidPortfolioSummary();
  const [timeframe, setTimeframe] = useState('5D');
  const seriesRange = portfolioSeriesRange(timeframe);
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
  const [pulseRange, setPulseRange] = useState('1D');
  const [tickerModal, setTickerModal] = useState(null);
  const [tickerModalRange, setTickerModalRange] = useState('1M');
  const [streakDays, setStreakDays] = useState(0);
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
          };
        })
        .sort((a, b) => b.positionValue - a.positionValue);
    }
    return [];
  }, [useMock, mock.enrichedPositions, useLiveHoldings, plaidHoldingsPayload, liveQuotes]);

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

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    'there';

  const displayValue = Number.isFinite(currentValue) ? currentValue : 0;
  const changePct = valueWindowFromApi?.changePct ?? 0;
  const changeAbs = valueWindowFromApi?.changeAbs ?? 0;

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
        const rows = json?.sectors?.data ?? json?.data ?? [];
        const degraded = Boolean(json?.sectors?.degraded);
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
                  top: sectors.filter((s) => s.chg > 0).slice(0, 3),
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
        const res = await fetch('/api/fmp/movers?limit=3');
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
        const res = await fetch('/api/fmp/congress-latest');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setCongressTrades(
            (data.trades || data || []).slice(0, 5).map((t) => ({
              rep: t.representative || t.name || '—',
              cham: t.chamber || t.house || 'Congress',
              when: t.transactionDate || t.date || '—',
              sym: t.ticker || t.symbol || '—',
              side: (t.type || t.transactionType || '').toUpperCase().includes('PURCHASE')
                ? 'BUY'
                : 'SELL',
              size: t.amount || t.range || '—',
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
        const res = await fetch('/api/market-data/news?limit=5');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setOpportunities(
            (data.news || []).slice(0, 5).map((a) => ({
              sym: '',
              title: a.title || a.headline || '',
              src: a.source || '',
              url: a.url || '#',
              when: a.datetime
                ? new Date(a.datetime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : '',
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

  /* Fetch Plaid holdings if connected */
  useEffect(() => {
    if (!plaidConnected) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/plaid/holdings');
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
  }, [plaidConnected]);

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
        setStreakDays(d.streakDays ?? 0);
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
        const res = await fetch('/api/market-data/news?limit=12');
        if (!res.ok) return;
        const data = await res.json();
        const items = (data.news || []).slice(0, 12).map((a) => ({
          tag: (a.source || 'NEWS').toString().toUpperCase().slice(0, 10),
          text: a.title || a.headline || '',
        }));
        if (!cancelled && items.length) setTickerItems(items);
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
  }, []);

  return (
    <div className="bs-shell">
      {/* ═══ TICKER MARQUEE ═══ */}
      <div className="bs-ticker">
        <div className="bs-ticker-inner">
          {tickerItems.concat(tickerItems).map((t, i) => (
            <span key={i} className="bs-ticker-item">
              <span className="bs-ticker-tag">{t.tag}</span>
              <span className="bs-ticker-text">{t.text}</span>
            </span>
          ))}
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
          </div>
        </div>
      </section>

      {/* ═══ INDEX STRIP ═══ */}
      <div className="bs-band bs-band--dark">
        <div className="bs-page-inner bs-page-inner--tight">
          <div className="bs-index-strip">
            {indices.length === 0
              ? Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className={`bs-index-cell ${i > 0 ? 'bs-index-cell--bordered' : ''}`}
                  >
                    <div className="bs-skeleton bs-skeleton-line" />
                    <div className="bs-skeleton bs-skeleton-value" />
                  </div>
                ))
              : indices.map((idx, i) => (
                  <div
                    key={idx.sym}
                    className={`bs-index-cell ${i > 0 ? 'bs-index-cell--bordered' : ''}`}
                  >
                    <div className="bs-index-sym">{idx.sym}</div>
                    <div className="bs-index-last">{idx.last}</div>
                    <div
                      className={`bs-index-chg ${idx.up ? 'bs-index-chg--up' : 'bs-index-chg--down'}`}
                    >
                      {idx.chg}
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {/* ═══ BAND I — LATELY ON EZANA ═══ */}
      <section className="bs-band bs-band--cream">
        <div className="bs-page-inner">
          <BandHeader number="I" label="Lately on Ezana" meta="Performance · trailing seven days" />
          <div className="bs-chart-row">
            <div className="bs-chart-wide">
              <HeroSparkline
                portfolioValue={currentValue != null ? currentValue : undefined}
                changePct={useMock ? mock.totalPnlPct : undefined}
                seriesPoints={sparklinePoints}
                range={seriesRange}
                isLoading={valueSeriesLoading}
                loadError={valueSeriesError}
              />
            </div>
            <div className="bs-chart-aside">
              <div className="bs-aside-head">Portfolio</div>
              <div className="bs-aside-row">
                <span
                  className="bs-aside-dot"
                  style={{ background: 'var(--bs-chart-port-color)' }}
                />
                <span className="bs-aside-label">
                  {isOrgUser && orgData?.name ? orgData.name : 'My Portfolio'}
                </span>
                <span className="bs-aside-val">
                  {valueWindowFromApi ? fmtPct(valueWindowFromApi.changePct) : '—'}
                </span>
              </div>
              <div className="bs-aside-head" style={{ marginTop: 18 }}>
                Range
              </div>
              <div className="bs-seg-group">
                {RANGE_BUTTONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`bs-seg ${timeframe === r ? 'bs-seg--active' : ''}`}
                    onClick={() => setTimeframe(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
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
                          <td className="bs-td-sym">{h.ticker}</td>
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
            <div className="bs-pos-r">
              {sectorRows.length > 0 && (
                <div className="bs-sector-panel">
                  <div className="bs-prog-label">Sector breakdown</div>
                  {sectorRows.slice(0, 5).map((s) => (
                    <div key={s.name} className="bs-sector-row">
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
                    </div>
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
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BAND III — MARKETS PULSE (dark) ═══ */}
      <section className="bs-band bs-band--dark">
        <div className="bs-page-inner">
          <BandHeader number="III" label="Markets pulse" meta="S&P 500 GICS · today" dark />
          <div className="bs-pulse-range-toggle">
            {['1D', '1W', '1M', 'YTD'].map((r) => (
              <button
                key={r}
                type="button"
                className={`bs-seg ${pulseRange === r ? 'bs-seg--active' : ''}`}
                onClick={() => setPulseRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="bs-pulse-row">
            {sectorLoaded && sectorEmpty ? (
              <p className="bs-pulse-empty">No sector data yet</p>
            ) : null}
            <div className="bs-pulse-col">
              <div className="bs-pulse-head-dark">Leaders</div>
              {(sectorData.top.length ? sectorData.top : [{ name: 'Loading…', chg: 0 }]).map(
                (s) => (
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
                ),
              )}
            </div>
            <div className="bs-pulse-divider" />
            <div className="bs-pulse-col">
              <div className="bs-pulse-head-dark">Laggards</div>
              {(sectorData.bottom.length ? sectorData.bottom : [{ name: 'Loading…', chg: 0 }]).map(
                (s) => (
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
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BAND IV — THE SCHEDULE ═══ */}
      <section className="bs-band bs-band--cream">
        <div className="bs-page-inner">
          <BandHeader number="IV" label="The schedule" meta="Events, releases &amp; filings" />
          <div className="bs-sched-row">
            <div className="bs-sched-events">
              {Object.entries(EVENTS).map(([day, list]) => (
                <div key={day} className="bs-event-day-block">
                  <div className="bs-event-day-head">
                    <span className="bs-event-day-label">{day}</span>
                    <span className="bs-event-day-count">{list.length} events</span>
                  </div>
                  <div className="bs-event-grid">
                    {list.map((ev, i) => (
                      <div key={i} className="bs-event-item">
                        <div className="bs-event-date">{ev.date}</div>
                        <div className="bs-event-title">{ev.title}</div>
                        <div className="bs-event-meta-row">
                          <span>{ev.region}</span>
                          {ev.flag && <span className="bs-event-flag">{ev.flag}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="bs-sched-aside">
              <MiniCalendar />
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
                      className={`bs-cong-side ${c.side === 'BUY' ? 'bs-cong-side--buy' : 'bs-cong-side--sell'}`}
                    >
                      {c.side}
                    </div>
                    <div className="bs-cong-size">{c.size}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Column C — Top movers */}
            <div className="bs-intel-col">
              <div className="bs-sub-head">
                <h3 className="bs-sub-title">Top movers today</h3>
                <span className="bs-sub-meta">U.S. equities</span>
              </div>
              <div className="bs-mover-head">Gainers</div>
              {(gainers.length ? gainers : [{ sym: '—', pct: 0, chg: '—' }]).map((g, i) => (
                <div key={g.sym} className="bs-mover-row">
                  <span className="bs-mover-sym">{g.sym}</span>
                  <span className="bs-mover-pct bs-mover-pct--up">
                    {g.pct >= 0 ? '+' : ''}
                    {g.pct.toFixed(2)}%
                  </span>
                  <Spark
                    values={genSeries(91 + i * 7, 24, 0.8, 1.0)}
                    color="var(--bs-green)"
                    w={56}
                    h={20}
                  />
                </div>
              ))}
              <div className="bs-mover-head" style={{ marginTop: 14 }}>
                Losers
              </div>
              {(losers.length ? losers : [{ sym: '—', pct: 0, chg: '—' }]).map((l, i) => (
                <div key={l.sym} className="bs-mover-row">
                  <span className="bs-mover-sym">{l.sym}</span>
                  <span className="bs-mover-pct bs-mover-pct--down">
                    {l.pct >= 0 ? '+' : ''}
                    {l.pct.toFixed(2)}%
                  </span>
                  <Spark
                    values={genSeries(31 + i * 9, 24, -0.6, 1.0)}
                    color="var(--bs-red)"
                    w={56}
                    h={20}
                  />
                </div>
              ))}
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
              {['1D', '1W', '1M', '3M', '6M', '1Y', '5Y', 'ALL'].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`bs-seg ${tickerModalRange === r ? 'bs-seg--active' : ''}`}
                  onClick={() => setTickerModalRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <TickerPerformanceChart symbol={tickerModal} range={tickerModalRange} />
          </div>
        </div>
      )}
    </div>
  );
}
