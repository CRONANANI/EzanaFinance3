'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { PinnableCard } from '@/components/ui/PinnableCard';
import { CoursePreviewSection } from '@/components/learning/CoursePreviewSection';
import { useChecklist } from '@/hooks/useChecklist';
import { getCoursesForWatchlistPreview } from '@/lib/learning-curriculum';
import { useOrg } from '@/contexts/OrgContext';
import { MOCK_TEAM_PERFORMANCE } from '@/lib/orgMockData';
import { getComparableAssets } from '@/lib/comparableAssets';
import { useWatchlists } from '@/hooks/useWatchlists';
import { getTickerMeta } from '@/lib/tickerSearchData';
import { WatchlistSearch } from '@/components/watchlist/WatchlistSearch';
import { ChevronDown, Check } from 'lucide-react';
import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/components/learning/learning-opportunities.css';
import './watchlist.css';

/* ── Helpers ── */
function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
function fmtPrice(n) { if (n >= 1e9) return `$${(n/1e9).toFixed(1)}B`; if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`; return `$${n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function fmtSmall(n) { return n >= 1000 ? n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : n.toFixed(2); }
function fmtChg(n) { return `${n>=0?'+':''}${n.toFixed(2)}`; }
function fmtPct(n) {
  const x = Number(n);
  if (n == null || Number.isNaN(x)) return '—';
  return `${x >= 0 ? '+' : ''}${x.toFixed(2)}%`;
}

function mergeFinnhubQuote(item, quoteMap) {
  if (item.type === 'politician' || item.type === 'institution') return item;
  const sym = item.quoteSymbol || item.ticker;
  if (!sym || !quoteMap?.[sym]) return item;
  const q = quoteMap[sym];
  return { ...item, price: q.price, pct: q.changePercent, change: q.change };
}

/** Scale YTD portfolio return % to selected chart period (modeled cumulative return). */
const RETURN_RANGE_MULT = {
  '1D': 0.012,
  '5D': 0.048,
  '1M': 0.19,
  'YTD': 1,
  '6M': 0.64,
  '1Y': 1.05,
  '5Y': 2.75,
  'MAX': 3.9,
};

function rangeEndReturnPct(returnYtd, timeRange) {
  const y = Number(returnYtd);
  if (Number.isNaN(y)) return 0;
  const m = RETURN_RANGE_MULT[timeRange] ?? 1;
  return y * m;
}

function genReturnPctPts(seed, n, endPct) {
  const pts = [];
  const safe = Math.abs(endPct) < 0.005 ? (endPct >= 0 ? 0.01 : -0.01) : endPct;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const base = safe * t;
    const wobble =
      Math.sin(seed * 0.07 + i * 0.35) * Math.abs(safe) * 0.09 +
      Math.sin(seed + i * 0.22) * Math.abs(safe) * 0.05;
    pts.push(base + wobble);
  }
  pts[n - 1] = endPct;
  return pts;
}

/* ═══════════════════════════════════════════
   TOP STRIP CARDS — mix of indices, politicians, institutions
   All are clickable and drive the chart below
   ═══════════════════════════════════════════ */
const TOP_STRIP = [
  { id: 'idx-spx',   type: 'index', name: 'S&P 500',      ticker: 'SPY', quoteSymbol: 'SPY', price: 6024.54, change: 10.32, pct: 0.58, topAssets: ['AAPL','MSFT','NVDA','AMZN'] },
  { id: 'idx-dji',   type: 'index', name: 'Dow Jones',     ticker: 'DIA', quoteSymbol: 'DIA', price: 44524.40, change: 143.05, pct: 0.56, topAssets: ['UNH','GS','MSFT','HD'] },
  { id: 'idx-ftse',  type: 'index', name: 'FTSE 100',      ticker: 'EWU', quoteSymbol: 'EWU', price: 8296.68, change: 7.43, pct: 0.56, topAssets: ['SHEL','AZN','HSBA','ULVR'] },

  { id: 'pol-pelosi',     type: 'politician', name: 'Nancy Pelosi',      returnYtd: 18.4,  slug: 'nancy-pelosi',      party: 'Democrat',   topAssets: ['NVDA','AAPL','RBLX','MSFT'] },
  { id: 'pol-tuberville', type: 'politician', name: 'Tommy Tuberville',  returnYtd: -4.2,  slug: 'tommy-tuberville',  party: 'Republican', topAssets: ['KMB','HPQ','CLX','PG'] },
  { id: 'pol-crenshaw',   type: 'politician', name: 'Dan Crenshaw',      returnYtd: 11.2,  slug: 'dan-crenshaw',      party: 'Republican', topAssets: ['AAPL','MSFT','AMZN','XOM'] },

  { id: 'inst-citadel',     type: 'institution', name: 'Citadel Securities',   returnYtd: 14.6, topAssets: ['NVDA','SPY','AAPL','META'], revenue: '$9.7B Revenue' },
  { id: 'inst-janestreet',  type: 'institution', name: 'Jane Street',          returnYtd: 16.8, topAssets: ['ETFs','Options','Crypto','FX'], revenue: '$20.5B Revenue' },
  { id: 'inst-bridgewater', type: 'institution', name: 'Bridgewater',          returnYtd: 3.1,  topAssets: ['SPY','GLD','TLT','EEM'], revenue: '$19.7B AUM' },

  { id: 'idx-nky',  type: 'index', name: 'NIKKEI 225',   ticker: 'EWJ', quoteSymbol: 'EWJ', price: 39053.78, change: 312.45, pct: 0.81, topAssets: ['7203.T','6758.T','9984.T','6861.T'] },
  { id: 'idx-dax',  type: 'index', name: 'DAX',           ticker: 'EWG', quoteSymbol: 'EWG', price: 19243.28, change: 48.12, pct: 0.25, topAssets: ['SAP','SIE','ALV','DTE'] },

  { id: 'pol-warner',      type: 'politician', name: 'Mark Warner',       returnYtd: 9.2,  slug: 'mark-warner', party: 'Democrat', topAssets: ['META','CRM','SNOW','MSFT'] },
  { id: 'pol-gottheimer',  type: 'politician', name: 'Josh Gottheimer',   returnYtd: 12.5, slug: 'josh-gottheimer', party: 'Democrat', topAssets: ['MSFT','GOOGL','JPM'] },

  { id: 'inst-renaissance', type: 'institution', name: 'Renaissance Tech',     returnYtd: 12.4, topAssets: ['NVO','VRTX','NOW','REGN'], revenue: '$31.2B AUM' },
  { id: 'inst-berkshire',   type: 'institution', name: 'Berkshire Hathaway',   returnYtd: 8.1,  topAssets: ['AAPL','BAC','AXP','KO'], revenue: '$348B Portfolio' },
  { id: 'inst-point72',     type: 'institution', name: 'Point72',              returnYtd: 10.5, topAssets: ['MSFT','GOOGL','AMZN','UNH'], revenue: '$34.5B AUM' },
];

/* ── Commodities & futures strip ── */
const COMMODITIES = [
  { id: 'cmd-gold', type: 'commodity', name: 'Gold', ticker: 'GC=F', price: 2648.5, change: 18.25, pct: 0.69, topAssets: ['Mining','Central Banks','ETFs','Jewelry'] },
  { id: 'cmd-silver', type: 'commodity', name: 'Silver', ticker: 'SI=F', price: 31.24, change: 0.82, pct: 2.7, topAssets: ['Industrial','Solar','ETFs','Jewelry'] },
  { id: 'cmd-platinum', type: 'commodity', name: 'Platinum', ticker: 'PL=F', price: 1024.3, change: 12.4, pct: 1.23, topAssets: ['Auto','Industrial','Jewelry','Investment'] },
  { id: 'cmd-palladium', type: 'commodity', name: 'Palladium', ticker: 'PA=F', price: 1088.0, change: -9.2, pct: -0.84, topAssets: ['Auto Catalysts','Electronics','Chemical','Dental'] },
  { id: 'cmd-copper', type: 'commodity', name: 'Copper', ticker: 'HG=F', price: 4.38, change: -0.05, pct: -1.13, topAssets: ['Construction','Electronics','Transport','Industrial'] },
  { id: 'cmd-oil', type: 'commodity', name: 'Oil (WTI)', ticker: 'CL=F', price: 78.91, change: 1.24, pct: 1.6, topAssets: ['Transport','Plastics','Heating','Chemical'] },
  { id: 'cmd-natgas', type: 'commodity', name: 'Nat Gas', ticker: 'NG=F', price: 3.42, change: -0.08, pct: -2.28, topAssets: ['Heating','Power Gen','Chemical','LNG'] },
  { id: 'cry-btc', type: 'crypto', name: 'Bitcoin', ticker: 'BTC-USD', price: 98240.0, change: 1240.0, pct: 1.28, topAssets: ['Store of Value','DeFi','Mining','Payments'] },
  { id: 'cry-eth', type: 'crypto', name: 'Ethereum', ticker: 'ETH-USD', price: 3456.0, change: 42.3, pct: 1.24, topAssets: ['DeFi','NFTs','Layer 2','Staking'] },
  { id: 'cry-sol', type: 'crypto', name: 'Solana', ticker: 'SOL-USD', price: 188.4, change: 3.12, pct: 1.68, topAssets: ['DeFi','NFTs','Payments','Gaming'] },
  { id: 'cmd-wheat', type: 'commodity', name: 'Wheat', ticker: 'ZW=F', price: 548.25, change: -4.5, pct: -0.81, topAssets: ['Food','Feed','Ethanol','Export'] },
  { id: 'cmd-corn', type: 'commodity', name: 'Corn', ticker: 'ZC=F', price: 442.5, change: 2.25, pct: 0.51, topAssets: ['Feed','Ethanol','Food','Export'] },
];

/** Legendary investors & friends holding this ticker — demo (chart initials) */
const HOLDERS_BY_TICKER = {
  AAPL: [
    { initials: 'EW', name: 'Emma Wilson', userId: 'demo-emma-wilson' },
    { initials: 'DK', name: 'David Kim', userId: 'demo-david-kim' },
    { initials: 'LP', name: 'Lisa Park', userId: 'demo-lisa-park' },
    { initials: 'AC', name: 'Alex Chen', userId: 'demo-alex-chen' },
    { initials: 'WB', name: 'Warren Buffett', userId: 'demo-warren-buffett' },
    { initials: 'RD', name: 'Ray Dalio', userId: 'demo-ray-dalio' },
    { initials: 'CK', name: 'Cathie Wood', userId: 'demo-cathie-wood' },
    { initials: 'PB', name: 'Peter Lynch', userId: 'demo-peter-lynch' },
    { initials: 'JM', name: 'Joel Greenblatt', userId: 'demo-joel-greenblatt' },
    { initials: 'CM', name: 'Charlie Munger', userId: 'demo-charlie-munger' },
  ],
  NVDA: [
    { initials: 'EW', name: 'Emma Wilson', userId: 'demo-emma-wilson' },
    { initials: 'DK', name: 'David Kim', userId: 'demo-david-kim' },
    { initials: 'AC', name: 'Alex Chen', userId: 'demo-alex-chen' },
    { initials: 'CK', name: 'Cathie Wood', userId: 'demo-cathie-wood' },
    { initials: 'JM', name: 'Jensen Huang', userId: 'demo-jensen-huang' },
  ],
  MSFT: [
    { initials: 'EW', name: 'Emma Wilson', userId: 'demo-emma-wilson' },
    { initials: 'WB', name: 'Bill Gates', userId: 'demo-bill-gates' },
    { initials: 'RD', name: 'Ray Dalio', userId: 'demo-ray-dalio' },
    { initials: 'LP', name: 'Lisa Park', userId: 'demo-lisa-park' },
  ],
};

const TIME_RANGES = ['1D','5D','1M','YTD','6M','1Y','5Y','MAX'];

/* ── Chart point generator ── */
function genPts(seed, n = 100, up = true) {
  const pts = []; let v = 50;
  for (let i = 0; i < n; i++) {
    v += Math.sin(i * 0.3 + seed) * 2.5 + (up ? 0.12 : -0.08) + Math.sin(i * 0.7 + seed * 2) * 1.2 + (Math.random() - 0.5) * 0.8;
    v = Math.max(4, Math.min(96, v));
    pts.push(v);
  }
  return pts;
}

/* ── Mini sparkline SVG ── */
function Spark({ seed, up, w = 64, h = 22 }) {
  const pts = useMemo(() => genPts(seed, 24, up), [seed, up]);
  const d = pts.map((y,i) => `${(i/(pts.length-1))*w},${h-(y/100)*h}`).join(' ');
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="wl-spark"><polyline points={d} fill="none" stroke={up?'#10b981':'#ef4444'} strokeWidth="1.5"/></svg>;
}

function SparkPortfolio({ seed, returnYtd, w = 64, h = 22 }) {
  const pts = useMemo(() => genReturnPctPts(seed, 24, returnYtd ?? 0), [seed, returnYtd]);
  const minV = Math.min(0, ...pts);
  const maxV = Math.max(...pts, minV + 0.01);
  const up = (returnYtd ?? 0) >= 0;
  const d = pts.map((v, i) => `${(i / (pts.length - 1)) * w},${h - ((v - minV) / (maxV - minV)) * h}`).join(' ');
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="wl-spark"><polyline points={d} fill="none" stroke={up ? '#10b981' : '#ef4444'} strokeWidth="1.5" /></svg>;
}

/* ── Main chart component ── */
function Chart({ item, timeRange }) {
  const seed = useMemo(() => (item ? item.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) : 42), [item]);
  const isPortfolio = item?.type === 'politician' || item?.type === 'institution';

  const chartGeom = useMemo(() => {
    const W = 900;
    const H = 340;
    if (!item) {
      return { area: '', line: '', col: '#10b981', dotY: H / 2, gradientId: 'cg-empty' };
    }
    if (isPortfolio) {
      const ytd = item.returnYtd ?? 0;
      const end = rangeEndReturnPct(ytd, timeRange);
      const pts = genReturnPctPts(seed, 140, end);
      const minV = Math.min(0, ...pts);
      const maxV = Math.max(...pts, minV + 0.01);
      const norm = (v) => H - ((v - minV) / (maxV - minV)) * H;
      const step = W / (pts.length - 1);
      const linePath = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${i * step},${norm(v)}`).join(' ');
      const areaPath = `${linePath} L${W},${H} L0,${H} Z`;
      const col = end >= 0 ? '#10b981' : '#ef4444';
      const dotY = norm(pts[pts.length - 1]);
      return { area: areaPath, line: linePath, col, dotY, gradientId: `cg-${seed}-pf` };
    }
    const up = item.change >= 0;
    const pts = genPts(seed, 140, up);
    const step = W / (pts.length - 1);
    const linePath = pts.map((y, i) => `${i === 0 ? 'M' : 'L'}${i * step},${H - (y / 100) * H}`).join(' ');
    const areaPath = `${linePath} L${W},${H} L0,${H} Z`;
    const col = up ? '#10b981' : '#ef4444';
    const dotY = H - (pts[pts.length - 1] / 100) * H;
    return { area: areaPath, line: linePath, col, dotY, gradientId: `cg-${seed}` };
  }, [item, seed, timeRange, isPortfolio]);

  const W = 900;
  const H = 340;

  return (
    <div className="wl-chart-box">
      {isPortfolio && (
        <div className="wl-chart-y-label" aria-hidden>Return %</div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="wl-chart-svg">
        <defs>
          <linearGradient id={chartGeom.gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartGeom.col} stopOpacity="0.18" />
            <stop offset="100%" stopColor={chartGeom.col} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.2, 0.4, 0.6, 0.8].map((f) => (
          <line key={f} x1="0" y1={H * f} x2={W} y2={H * f} stroke="rgba(16,185,129,.05)" strokeWidth="1" />
        ))}
        <path d={chartGeom.area} fill={`url(#${chartGeom.gradientId})`} />
        <path d={chartGeom.line} fill="none" stroke={chartGeom.col} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        <circle cx={W} cy={chartGeom.dotY} r="5" fill={chartGeom.col} stroke="#0d1117" strokeWidth="2" />
      </svg>
    </div>
  );
}

/* ── Type badge helper ── */
function TypeIcon({ item }) {
  if (item.type === 'index') return <span className="wl-strip-badge idx"><i className="bi bi-bar-chart-line"/></span>;
  if (item.type === 'politician') return <span className={`wl-strip-badge pol ${item.party?.toLowerCase()}`}>{item.name.split(' ').map(w=>w[0]).join('')}</span>;
  if (item.type === 'institution') return <span className="wl-strip-badge inst"><i className="bi bi-building"/></span>;
  return <span className="wl-strip-badge stk">{item.ticker?.slice(0,3)}</span>;
}

export default function WatchlistPage() {
  const { completeTask } = useChecklist();
  const { isOrgUser, orgRole, orgData } = useOrg();
  const addedStockRef = useRef(false);
  /** User-picked row; effective selection is derived so first paint always has a valid `selected`. */
  const [manualSelected, setManualSelected] = useState(null);
  const [quoteMap, setQuoteMap] = useState({});
  const [timeRange, setTimeRange] = useState('YTD');
  const [sideTab, setSideTab] = useState('All');
  const [search, setSearch] = useState('');
  const {
    watchlists: mockWatchlists,
    loading: watchlistsLoading,
    addItem: addWatchlistItem,
  } = useWatchlists();

  const [selectedWatchlistId, setSelectedWatchlistId] = useState(null);

  useEffect(() => {
    if (!watchlistsLoading && mockWatchlists.length > 0) {
      if (!selectedWatchlistId || !mockWatchlists.some((w) => w.id === selectedWatchlistId)) {
        setSelectedWatchlistId(mockWatchlists[0].id);
      }
    }
  }, [watchlistsLoading, mockWatchlists, selectedWatchlistId]);
  const [wlDropdownOpen, setWlDropdownOpen] = useState(false);
  const wlDropdownRef = useRef(null);

  const orgTeamId = useMemo(() => {
    if (!isOrgUser) return null;
    if (orgRole === 'executive') return null;
    return orgData?.team?.id || 't7';
  }, [isOrgUser, orgRole, orgData?.team?.id]);

  const orgTeamPerf = useMemo(() => {
    if (!isOrgUser) return null;
    if (orgRole === 'executive') return null;
    return MOCK_TEAM_PERFORMANCE.find((t) => t.team_id === (orgTeamId || 't7')) || MOCK_TEAM_PERFORMANCE[6];
  }, [isOrgUser, orgRole, orgTeamId]);

  const stripItems = useMemo(() => {
    if (!isOrgUser) return TOP_STRIP;

    const tickers =
      orgRole === 'executive'
        ? [...new Set(MOCK_TEAM_PERFORMANCE.flatMap((t) => t.top_holdings))].slice(0, 12)
        : (orgTeamPerf?.top_holdings || ['NVDA', 'AAPL', 'MSFT', 'META']);

    return tickers.map((tk) => ({
      id: `org-${tk}`,
      type: 'stock',
      name: tk,
      ticker: tk,
      quoteSymbol: tk,
      price: 0,
      change: 0,
      pct: 0,
      topAssets: [],
    }));
  }, [isOrgUser, orgRole, orgTeamPerf]);

  const ALL_SELECTABLE = useMemo(() => [...stripItems, ...COMMODITIES], [stripItems]);

  const selected = useMemo(() => {
    if (!ALL_SELECTABLE.length) return null;
    if (manualSelected && ALL_SELECTABLE.some((i) => i.id === manualSelected.id)) {
      return manualSelected;
    }
    return stripItems[0] ?? COMMODITIES[0] ?? null;
  }, [stripItems, manualSelected, ALL_SELECTABLE]);

  useEffect(() => {
    function closeWlDrop(e) {
      if (wlDropdownRef.current && !wlDropdownRef.current.contains(e.target)) {
        setWlDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', closeWlDrop);
    return () => document.removeEventListener('mousedown', closeWlDrop);
  }, []);

  const watchlistTickerSymbols = useMemo(
    () =>
      isOrgUser
        ? []
        : [...new Set(mockWatchlists.flatMap((w) => w.stocks.map((s) => s.ticker)))],
    [isOrgUser, mockWatchlists],
  );

  useEffect(() => {
    const symbols = [
      ...new Set([
        ...stripItems.map((i) => i.quoteSymbol),
        ...COMMODITIES.map((c) => c.ticker),
        ...watchlistTickerSymbols,
      ]),
    ].filter(Boolean);
    let cancelled = false;
    const load = () => {
      fetch(`/api/market/batch-quotes?symbols=${symbols.join(',')}`)
        .then((r) => (r.ok ? r.json() : {}))
        .then((d) => {
          if (!cancelled) setQuoteMap(d.quotes || {});
        })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [stripItems, isOrgUser, watchlistTickerSymbols]);

  const onAddStock = useCallback(
    (ticker, watchlistId) => {
      const meta = getTickerMeta(ticker);
      if (!meta) return;
      addWatchlistItem(watchlistId, {
        type: 'stock',
        ticker,
        name: meta.name,
        sector: meta.sector,
      });
    },
    [addWatchlistItem],
  );

  const sideItems = useMemo(() => {
    if (isOrgUser) {
      let items = stripItems;
      if (sideTab === 'Stocks') items = items.filter((i) => i.type === 'stock');
      if (search.trim()) {
        const q = search.toLowerCase();
        items = items.filter((i) => i.name.toLowerCase().includes(q) || i.ticker.toLowerCase().includes(q));
      }
      return items;
    }
    const wl = mockWatchlists.find((w) => w.id === selectedWatchlistId) || mockWatchlists[0];
    let items = (wl?.stocks || []).map((s) => ({
      id: s.ticker,
      type: 'stock',
      name: s.name,
      ticker: s.ticker,
      price: s.price,
      change: s.change,
      pct: s.changePct,
      topAssets: [s.sector],
    }));
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(q) || i.ticker.toLowerCase().includes(q));
    }
    return items;
  }, [search, isOrgUser, stripItems, mockWatchlists, selectedWatchlistId, sideTab]);

  const comparableRows = useMemo(() => {
    if (!selected) return [];
    if (selected.type === 'politician' || selected.type === 'institution') return [];
    const sym = (selected.quoteSymbol || selected.ticker || '').toUpperCase().replace(/\./g, '-');
    return getComparableAssets(sym);
  }, [selected]);

  const selectAny = useCallback((item) => {
    setManualSelected(item);
    if (item?.type === 'stock' && !addedStockRef.current) {
      addedStockRef.current = true;
      completeTask('watchlist_1');
    }
  }, [completeTask]);

  const selectedMerged = useMemo(
    () => mergeFinnhubQuote(selected, quoteMap),
    [selected, quoteMap],
  );

  const portfolioReturn =
    selected.type === 'politician' || selected.type === 'institution'
      ? rangeEndReturnPct(selected.returnYtd, timeRange)
      : null;

  const isUp =
    portfolioReturn != null ? portfolioReturn >= 0 : selectedMerged.change >= 0;

  const holderList = useMemo(() => {
    if (selected?.type !== 'stock' || !selected.ticker) return [];
    return (HOLDERS_BY_TICKER[selected.ticker] || []).slice(0, 10);
  }, [selected]);

  const watchlistCourses = useMemo(() => getCoursesForWatchlistPreview(4), []);

  if (!selected) {
    return (
      <div className="wl-page dashboard-page-inset">
        <p style={{ color: '#8b949e', padding: '2rem 0', textAlign: 'center' }}>
          No watchlist items to display.
        </p>
      </div>
    );
  }

  return (
    <div className="wl-page dashboard-page-inset">

      {/* ═══ TOP STRIP — mixed indices, politicians, institutions ═══ */}
      <div className="wl-top-strip">
        {stripItems.map((raw) => {
          const item = mergeFinnhubQuote(raw, quoteMap);
          const active = selected?.id === item.id;
          const isPF = item.type === 'politician' || item.type === 'institution';
          const up = isPF ? (item.returnYtd ?? 0) >= 0 : item.change >= 0;
          return (
            <button
              key={item.id}
              type="button"
              className={`wl-strip-card ${item.type} ${active ? 'active' : ''}`}
              onClick={() => selectAny(raw)}
            >
              <div className="wl-strip-top">
                <TypeIcon item={item} />
                <div className="wl-strip-info">
                  <span className="wl-strip-name">{item.name}</span>
                  <span className="wl-strip-sub">
                    {item.type === 'politician' && (
                      <>
                        <span className={`wl-dot ${item.party?.toLowerCase()}`} />
                        {item.party} · Portfolio
                      </>
                    )}
                    {item.type === 'institution' && <>{item.revenue || '13F'} · Portfolio</>}
                    {item.type === 'index' && <>{item.ticker}</>}
                  </span>
                </div>
              </div>
              <div className="wl-strip-bottom">
                <div>
                  {isPF ? (
                    <>
                      <span className="wl-strip-price">{fmtPct(item.returnYtd)}</span>
                      <span className="wl-strip-chg wl-strip-ytd-label">YTD</span>
                    </>
                  ) : (
                    <>
                      <span className="wl-strip-price">{fmtPrice(item.price)}</span>
                      <span className={`wl-strip-chg ${up ? 'up' : 'dn'}`}>{fmtPct(item.pct)}</span>
                    </>
                  )}
                </div>
                {isPF ? (
                  <SparkPortfolio seed={item.id.charCodeAt(0) + item.id.charCodeAt(item.id.length - 1)} returnYtd={item.returnYtd} />
                ) : (
                  <Spark seed={item.id.charCodeAt(0) + item.id.charCodeAt(item.id.length - 1)} up={up} />
                )}
              </div>
              <div className="wl-strip-assets">
                {item.topAssets.slice(0, 3).map((a) => (
                  <span key={a} className="wl-strip-asset">
                    {a}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* ═══ COMMODITIES ROW ═══ */}
      <div className="wl-comm-strip">
        {COMMODITIES.map((raw) => {
          const c = mergeFinnhubQuote({ ...raw, quoteSymbol: raw.ticker }, quoteMap);
          return (
            <button
              key={c.id}
              type="button"
              className={`wl-comm ${selected?.id === c.id ? 'active' : ''}`}
              onClick={() => selectAny(raw)}
            >
              <span className="wl-comm-name">
                {c.name} · {c.ticker}
              </span>
              <span className="wl-comm-price">${fmtSmall(c.price)}</span>
              <span className={`wl-comm-chg ${c.change >= 0 ? 'up' : 'dn'}`}>
                {fmtChg(c.change)} {fmtPct(c.pct)}
              </span>
            </button>
          );
        })}
      </div>

      {/* ═══ MAIN: Chart + Sidebar ═══ */}
      <div className="wl-main">

        {/* ── LEFT: Chart ── */}
        <div className="wl-chart-panel">
          <div className="wl-bc">
            <span className="wl-bc-home">HOME</span>
            <i className="bi bi-chevron-right"/>
            <span className="wl-bc-cur">{selected.name}</span>
            {selected.type !== 'index' && selected.type !== 'stock' && (
              <span className={`wl-bc-tag ${selected.type}`}>{selected.type === 'politician' ? 'PORTFOLIO' : '13F'}</span>
            )}
            {selected.type === 'politician' && selected.slug && (
              <Link href={`/inside-the-capitol/${selected.slug}`} className="wl-bc-link">
                <i className="bi bi-box-arrow-up-right"/> View Profile
              </Link>
            )}
          </div>

          <div className={`wl-price-row ${selected.type === 'stock' ? 'wl-price-row--stock' : ''}`}>
            <div className="wl-price-title-block">
              {selected.type === 'stock' && (
                <div className="wl-ticker-name-line">
                  <span className="wl-ticker-strong">{selected.ticker}</span>
                  <span className="wl-ticker-sep">—</span>
                  <span className="wl-co-full-name">{selected.name}</span>
                </div>
              )}
              {(selected.type === 'politician' || selected.type === 'institution') && (
                <>
                  <div className="wl-big-price">{fmtPct(portfolioReturn)}</div>
                  <div className="wl-price-meta">{selected.name} · {timeRange} return (modeled)</div>
                </>
              )}
              {selected.type !== 'stock' && selected.type !== 'politician' && selected.type !== 'institution' && (
                <>
                  <div className="wl-big-price">{fmtPrice(selectedMerged.price)}</div>
                  <div className="wl-price-meta">{selected.name} · {selected.ticker}</div>
                </>
              )}
            </div>
            <div className="wl-price-right-cluster">
              {selected.type === 'stock' && (
                <div className="wl-price-num-block">
                  <div className="wl-big-price">{fmtPrice(selectedMerged.price)}</div>
                  <div className={`wl-big-chg ${isUp ? 'up' : 'dn'}`}>
                    <i className={`bi ${isUp ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}`} />
                    {fmtPct(selectedMerged.pct)}
                  </div>
                </div>
              )}
              {selected.type !== 'stock' && selected.type !== 'politician' && selected.type !== 'institution' && (
                <div className={`wl-big-chg ${isUp ? 'up' : 'dn'}`}>
                  <i className={`bi ${isUp ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}`} />
                  {fmtPct(selectedMerged.pct)}
                </div>
              )}
              {(selected.type === 'politician' || selected.type === 'institution') && (
                <div className="wl-portfolio-hint">Based on disclosed positions</div>
              )}
              {selected.type === 'stock' && holderList.length > 0 && (
                <div className="wl-holder-bubbles" aria-label="Investors and friends holding this stock">
                  {holderList.map((h) => (
                    <Link
                      key={h.userId + h.initials}
                      href={`/community/profile/${h.userId}`}
                      className="wl-holder-chip"
                      title={h.name}
                    >
                      {h.initials}
                    </Link>
                  ))}
                </div>
              )}
              {selected.type === 'stock' && (
                <button
                  type="button"
                  className="wl-bc-link wl-price-alert-btn"
                  onClick={() => completeTask('watchlist_3')}
                  data-task-target="watchlist-price-alert"
                >
                  <i className="bi bi-bell" /> Set price alert
                </button>
              )}
            </div>
          </div>

          <div className="wl-tr-row">
            {TIME_RANGES.map(t => <button key={t} type="button" className={`wl-tr ${timeRange===t?'on':''}`} onClick={()=>setTimeRange(t)}>{t}</button>)}
        </div>

          <Chart item={selectedMerged} timeRange={timeRange}/>

          {comparableRows.length > 0 && (
            <div className="wl-top-assets wl-comp-section">
              <h4>Comparable Assets</h4>
              <div className="wl-comp-table">
                <div className="wl-comp-head">
                  <span>Ticker</span>
                  <span>Name</span>
                  <span>Price</span>
                  <span>Chg</span>
                  <span>Mkt cap</span>
                  <span>Vol</span>
                </div>
                {comparableRows.map((row) => (
                  <div key={row.ticker} className="wl-comp-row">
                    <span className="wl-comp-tk">{row.ticker}</span>
                    <span>{row.name}</span>
                    <span>{fmtSmall(row.price)}</span>
                    <span className={`wl-comp-chg ${row.changePct >= 0 ? 'up' : 'dn'}`}>{fmtPct(row.changePct)}</span>
                    <span>{row.marketCap}</span>
                    <span>{row.volume}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="wl-cmp">
            <div className="wl-cmp-hdr">
              <span/><span>Name</span><span>Value</span><span>Change</span><span>Type</span><span/>
            </div>
            {TOP_STRIP.filter(i => i.id !== selected.id).slice(0,5).map(raw => {
              const item = mergeFinnhubQuote(raw, quoteMap);
              const isPF = item.type === 'politician' || item.type === 'institution';
              const up = isPF ? (item.returnYtd ?? 0) >= 0 : item.change >= 0;
              return (
              <button key={item.id} type="button" className="wl-cmp-row" onClick={() => selectAny(raw)}>
                <TypeIcon item={item}/>
                <span className="wl-cmp-name">{item.name}</span>
                <span className="wl-cmp-val">{isPF ? fmtPct(item.returnYtd) : fmtPrice(item.price)}</span>
                <span className={`wl-cmp-chg ${up ? 'up' : 'dn'}`}>{isPF ? 'YTD' : fmtPct(item.pct)}</span>
                <span className={`wl-cmp-type ${item.type}`}>
                  {item.type === 'index' ? 'Index' : item.type === 'politician' ? 'Congress' : item.type === 'institution' ? '13F Fund' : '—'}
                </span>
                {isPF ? (
                  <SparkPortfolio seed={item.id.charCodeAt(0) * 3} returnYtd={item.returnYtd} w={48} h={16} />
                ) : (
                  <Spark seed={item.id.charCodeAt(0)*3} up={up} w={48} h={16}/>
                )}
              </button>
              );
            })}
              </div>
            </div>

        {/* ── RIGHT: Sidebar ── */}
        <aside className="wl-side">
          <div className="wl-side-hdr">
            <div>
              <h3>
                {isOrgUser
                  ? orgRole === 'executive'
                    ? 'Council Watchlist'
                    : `${orgTeamPerf?.team_name || 'Team'} Watchlist`
                  : 'My Watchlist'}
              </h3>
              {!isOrgUser && (
                <p
                  style={{
                    fontSize: '0.6rem',
                    color: 'var(--muted-foreground, #6b7280)',
                    margin: '1px 0 0',
                    fontWeight: 500,
                  }}
                >
                  Defaults: All Stocks · Politicians
                </p>
              )}
            </div>
            <span className="wl-side-cnt">{sideItems.length}</span>
          </div>

          {!isOrgUser ? (
            <>
              <div ref={wlDropdownRef} className="wl-wl-dropdown">
                <button
                  type="button"
                  className="wl-wl-trigger"
                  onClick={() => setWlDropdownOpen((o) => !o)}
                  aria-expanded={wlDropdownOpen}
                >
                  <span>
                    {(mockWatchlists.find((w) => w.id === selectedWatchlistId) || mockWatchlists[0])?.label ??
                      'My Watchlist'}
                  </span>
                  <ChevronDown size={14} className={wlDropdownOpen ? 'wl-wl-chev-open' : ''} style={{ flexShrink: 0, opacity: 0.8 }} />
                </button>
                {wlDropdownOpen && (
                  <div className="wl-wl-panel" role="listbox">
                    {mockWatchlists.map((list) => (
                      <button
                        key={list.id}
                        type="button"
                        role="option"
                        aria-selected={selectedWatchlistId === list.id}
                        className={`wl-wl-opt ${selectedWatchlistId === list.id ? 'on' : ''}`}
                        onClick={() => {
                          setSelectedWatchlistId(list.id);
                          setWlDropdownOpen(false);
                          completeTask('watchlist_2');
                        }}
                      >
                        <span>{list.label}</span>
                        <span className="wl-wl-meta">
                          {list.stocks.length} stocks
                          {selectedWatchlistId === list.id ? <Check size={12} style={{ marginLeft: 6 }} /> : null}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <WatchlistSearch
                query={search}
                onQueryChange={setSearch}
                mockWatchlists={mockWatchlists}
                onAddStock={onAddStock}
              />
            </>
          ) : (
            <div className="wl-side-search">
              <i className="bi bi-search" />
              <input
                type="text"
                placeholder="Search stocks, portfolios, funds…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}

          {isOrgUser && (
            <div className="wl-side-tabs">
              {['All', 'Stocks'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`wl-st ${sideTab === t ? 'on' : ''}`}
                  data-task-target={t === 'Stocks' ? 'watchlist-create-list' : undefined}
                  onClick={() => {
                    setSideTab(t);
                    if (t !== 'All') completeTask('watchlist_2');
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          <div className="wl-side-list">
            {sideItems.map(raw => {
              const item = mergeFinnhubQuote(raw, quoteMap);
              const act = selected.id === item.id;
              const isPF = item.type === 'politician' || item.type === 'institution';
              const up = isPF ? (item.returnYtd ?? 0) >= 0 : item.change >= 0;
              return (
                <button key={item.id} type="button" className={`wl-si ${act?'act':''} ${item.type}`} onClick={() => selectAny(raw)}>
                  <div className="wl-si-left">
                    {item.type === 'stock' && <span className="wl-si-tk">{item.ticker}</span>}
                    {item.type === 'politician' && <span className={`wl-si-av ${item.party?.toLowerCase()}`}>{item.name.split(' ').map(w=>w[0]).join('')}</span>}
                    {item.type === 'institution' && <span className="wl-si-inst"><i className="bi bi-building"/></span>}
                    <div className="wl-si-info">
                      <span className="wl-si-name">{item.name}</span>
                      <span className="wl-si-sub">
                        {item.type === 'stock' && item.ticker}
                        {item.type === 'politician' && `${item.party} · Portfolio`}
                        {item.type === 'institution' && `${item.revenue || '13F'} · Portfolio`}
                      </span>
                    </div>
                  </div>
                  <div className="wl-si-right">
                    <span className="wl-si-price">{isPF ? fmtPct(item.returnYtd) : fmtPrice(item.price)}</span>
                    <span className={`wl-si-chg ${up ? 'up' : 'dn'}`}>{isPF ? 'YTD' : fmtPct(item.pct)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {!isOrgUser && (
            <button type="button" className="wl-add" data-task-target="watchlist-add-button" onClick={() => { completeTask('watchlist_1'); }}>
              <i className="bi bi-plus-lg"/> Add to Watchlist
            </button>
          )}
        </aside>
      </div>

      <CoursePreviewSection
        title="Recommended Courses"
        subtitle="Stock fundamentals, portfolio construction & core skills"
        courses={watchlistCourses}
        viewAllHref="/learning-center?track=stocks"
      />
    </div>
  );
}
