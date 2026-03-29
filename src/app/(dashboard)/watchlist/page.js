'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { PinnableCard } from '@/components/ui/PinnableCard';
import { CoursePreviewSection } from '@/components/learning/CoursePreviewSection';
import { useChecklist } from '@/hooks/useChecklist';
import { getCoursesForWatchlistPreview } from '@/lib/learning-curriculum';
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
function fmtPct(n) { return `${n>=0?'+':''}${n.toFixed(2)}%`; }

function mergeFinnhubQuote(item, quoteMap) {
  const sym = item.quoteSymbol || item.ticker;
  if (!sym || !quoteMap?.[sym]) return item;
  const q = quoteMap[sym];
  return { ...item, price: q.price, pct: q.changePercent, change: q.change };
}

/* ═══════════════════════════════════════════
   TOP STRIP CARDS — mix of indices, politicians, institutions
   All are clickable and drive the chart below
   ═══════════════════════════════════════════ */
const TOP_STRIP = [
  { id: 'idx-spx',   type: 'index', name: 'S&P 500',      ticker: 'SPY', quoteSymbol: 'SPY', price: 6024.54, change: 10.32, pct: 0.58, topAssets: ['AAPL','MSFT','NVDA','AMZN'] },
  { id: 'idx-dji',   type: 'index', name: 'Dow Jones',     ticker: 'DIA', quoteSymbol: 'DIA', price: 44524.40, change: 143.05, pct: 0.56, topAssets: ['UNH','GS','MSFT','HD'] },
  { id: 'idx-ftse',  type: 'index', name: 'FTSE 100',      ticker: 'EWU', quoteSymbol: 'EWU', price: 8296.68, change: 7.43, pct: 0.56, topAssets: ['SHEL','AZN','HSBA','ULVR'] },

  { id: 'pol-pelosi',     type: 'politician', name: 'Nancy Pelosi',      ticker: 'NVDA', quoteSymbol: 'NVDA', price: 3036028,  change: 88045,  pct: 2.9,  slug: 'nancy-pelosi',      party: 'Democrat',   topAssets: ['NVDA','AAPL','RBLX','MSFT'] },
  { id: 'pol-tuberville', type: 'politician', name: 'Tommy Tuberville',  ticker: 'KMB', quoteSymbol: 'KMB', price: 1280000,  change: -17920, pct: -1.4, slug: 'tommy-tuberville',  party: 'Republican', topAssets: ['KMB','HPQ','CLX','PG'] },
  { id: 'pol-crenshaw',   type: 'politician', name: 'Dan Crenshaw',      ticker: 'AAPL', quoteSymbol: 'AAPL', price: 890000,   change: 33820,  pct: 3.8,  slug: 'dan-crenshaw',      party: 'Republican', topAssets: ['AAPL','MSFT','AMZN','XOM'] },

  { id: 'inst-citadel',     type: 'institution', name: 'Citadel Securities',   ticker: 'NVDA', quoteSymbol: 'NVDA', price: 9700000000,  change: 291000000, pct: 3.09, topAssets: ['NVDA','SPY','AAPL','META'], revenue: '$9.7B Revenue' },
  { id: 'inst-janestreet',  type: 'institution', name: 'Jane Street',          ticker: 'SPY', quoteSymbol: 'SPY', price: 20500000000, change: 615000000, pct: 3.10, topAssets: ['ETFs','Options','Crypto','FX'], revenue: '$20.5B Revenue' },
  { id: 'inst-bridgewater', type: 'institution', name: 'Bridgewater',          ticker: 'SPY', quoteSymbol: 'SPY', price: 19700000000, change: -197000000, pct: -0.99, topAssets: ['SPY','GLD','TLT','EEM'], revenue: '$19.7B AUM' },

  { id: 'idx-nky',  type: 'index', name: 'NIKKEI 225',   ticker: 'EWJ', quoteSymbol: 'EWJ', price: 39053.78, change: 312.45, pct: 0.81, topAssets: ['7203.T','6758.T','9984.T','6861.T'] },
  { id: 'idx-dax',  type: 'index', name: 'DAX',           ticker: 'EWG', quoteSymbol: 'EWG', price: 19243.28, change: 48.12, pct: 0.25, topAssets: ['SAP','SIE','ALV','DTE'] },

  { id: 'pol-warner',      type: 'politician', name: 'Mark Warner',       ticker: 'META', quoteSymbol: 'META', price: 2140000,  change: 25680, pct: 1.2,  slug: 'mark-warner', party: 'Democrat', topAssets: ['META','CRM','SNOW','MSFT'] },
  { id: 'pol-gottheimer',  type: 'politician', name: 'Josh Gottheimer',   ticker: 'MSFT', quoteSymbol: 'MSFT', price: 640000,   change: 13440, pct: 2.1,  slug: 'josh-gottheimer', party: 'Democrat', topAssets: ['MSFT','GOOGL','JPM'] },

  { id: 'inst-renaissance', type: 'institution', name: 'Renaissance Tech',     ticker: 'NVO', quoteSymbol: 'NVO', price: 31200000000, change: 936000000, pct: 3.10, topAssets: ['NVO','VRTX','NOW','REGN'], revenue: '$31.2B AUM' },
  { id: 'inst-berkshire',   type: 'institution', name: 'Berkshire Hathaway',   ticker: 'BRK-B', quoteSymbol: 'BRK-B', price: 348000000000, change: 3480000000, pct: 1.01, topAssets: ['AAPL','BAC','AXP','KO'], revenue: '$348B Portfolio' },
  { id: 'inst-point72',     type: 'institution', name: 'Point72',              ticker: 'MSFT', quoteSymbol: 'MSFT', price: 34500000000, change: 690000000, pct: 2.04, topAssets: ['MSFT','GOOGL','AMZN','UNH'], revenue: '$34.5B AUM' },
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

/* ── Full sidebar watchlist (superset — user's saved items) ── */
const WATCHLIST_ITEMS = [
  { id: 'NVDA', type: 'stock', name: 'NVIDIA Corp', ticker: 'NVDA', price: 875.20, change: 12.40, pct: 1.44, topAssets: ['GPUs','Data Center','AI Chips','Auto'] },
  { id: 'AAPL', type: 'stock', name: 'Apple Inc', ticker: 'AAPL', price: 192.30, change: 2.10, pct: 1.10, topAssets: ['iPhone','Services','Mac','Wearables'] },
  { id: 'MSFT', type: 'stock', name: 'Microsoft Corp', ticker: 'MSFT', price: 428.75, change: 3.30, pct: 0.78, topAssets: ['Azure','Office 365','Windows','Gaming'] },
  { id: 'TSLA', type: 'stock', name: 'Tesla Inc', ticker: 'TSLA', price: 248.50, change: -8.20, pct: -3.19, topAssets: ['Model Y','Energy','FSD','Cybertruck'] },
  { id: 'META', type: 'stock', name: 'Meta Platforms', ticker: 'META', price: 512.80, change: 6.40, pct: 1.26, topAssets: ['Instagram','WhatsApp','Reality Labs','Ads'] },
  { id: 'AMZN', type: 'stock', name: 'Amazon.com', ticker: 'AMZN', price: 188.75, change: 4.20, pct: 2.27, topAssets: ['AWS','E-commerce','Prime','Ads'] },
  { id: 'GOOGL', type: 'stock', name: 'Alphabet Inc', ticker: 'GOOGL', price: 172.30, change: 1.85, pct: 1.09, topAssets: ['Search','YouTube','Cloud','Waymo'] },
  ...TOP_STRIP.filter(i => i.type === 'politician'),
  ...TOP_STRIP.filter(i => i.type === 'institution'),
];

const TIME_RANGES = ['1D','5D','1M','YTD','6M','1Y','5Y','MAX'];
const SIDEBAR_TABS = ['All','Stocks','Politicians','Institutions'];

/* ── Chart point generator ── */
function genPts(seed, n = 100, up = true) {
  const pts = []; let v = 50;
  for (let i = 0; i < n; i++) {
    v += Math.sin(i*.3+seed)*2.5 + (up?.12:-.08) + Math.sin(i*.7+seed*2)*1.2 + (Math.random()-.5)*.8;
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

/* ── Main chart component ── */
function Chart({ item, timeRange }) {
  const seed = useMemo(() => item ? item.id.split('').reduce((a,c) => a+c.charCodeAt(0),0) : 42, [item]);
  const up = item ? item.change >= 0 : true;
  const pts = useMemo(() => genPts(seed, 140, up), [seed, up]);
  const W = 900, H = 340;
  const step = W/(pts.length-1);
  const line = pts.map((y,i) => `${i===0?'M':'L'}${i*step},${H-(y/100)*H}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const col = up ? '#10b981' : '#ef4444';

  return (
    <div className="wl-chart-box">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="wl-chart-svg">
        <defs>
          <linearGradient id={`cg-${seed}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={col} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[.2,.4,.6,.8].map(f => <line key={f} x1="0" y1={H*f} x2={W} y2={H*f} stroke="rgba(16,185,129,.05)" strokeWidth="1"/>)}
        <path d={area} fill={`url(#cg-${seed})`}/>
        <path d={line} fill="none" stroke={col} strokeWidth="2.5" vectorEffect="non-scaling-stroke"/>
        <circle cx={W} cy={H-(pts[pts.length-1]/100)*H} r="5" fill={col} stroke="#0d1117" strokeWidth="2"/>
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
  const addedStockRef = useRef(false);
  const [selected, setSelected] = useState(TOP_STRIP[0]);
  const [quoteMap, setQuoteMap] = useState({});
  const [timeRange, setTimeRange] = useState('1Y');
  const [sideTab, setSideTab] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const symbols = [
      ...new Set([
        ...TOP_STRIP.map((i) => i.quoteSymbol),
        ...COMMODITIES.map((c) => c.ticker),
        ...WATCHLIST_ITEMS.filter((x) => x.type === 'stock').map((x) => x.ticker),
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
  }, []);
  const sideItems = useMemo(() => {
    let items = WATCHLIST_ITEMS;
    if (sideTab === 'Stocks') items = items.filter(i => i.type === 'stock');
    if (sideTab === 'Politicians') items = items.filter(i => i.type === 'politician');
    if (sideTab === 'Institutions') items = items.filter(i => i.type === 'institution');
    if (search.trim()) { const q = search.toLowerCase(); items = items.filter(i => i.name.toLowerCase().includes(q) || i.ticker.toLowerCase().includes(q)); }
    return items;
  }, [sideTab, search]);

  const selectAny = useCallback((item) => {
    setSelected(item);
    if (item?.type === 'stock' && !addedStockRef.current) {
      addedStockRef.current = true;
      completeTask('watchlist_1');
    }
  }, [completeTask]);

  const selectedMerged = useMemo(
    () => mergeFinnhubQuote(selected, quoteMap),
    [selected, quoteMap],
  );

  const isUp = selectedMerged.change >= 0;

  const holderList = useMemo(() => {
    if (selected?.type !== 'stock' || !selected.ticker) return [];
    return (HOLDERS_BY_TICKER[selected.ticker] || []).slice(0, 10);
  }, [selected]);

  const watchlistCourses = useMemo(() => getCoursesForWatchlistPreview(4), []);

  return (
    <div className="wl-page dashboard-page-inset">

      {/* ═══ TOP STRIP — mixed indices, politicians, institutions ═══ */}
      <div className="wl-top-strip">
        {TOP_STRIP.map((raw) => {
          const item = mergeFinnhubQuote(raw, quoteMap);
          const active = selected.id === item.id;
          const up = item.change >= 0;
          return (
            <button key={item.id} type="button" className={`wl-strip-card ${item.type} ${active?'active':''}`} onClick={() => selectAny(raw)}>
              <div className="wl-strip-top">
                <TypeIcon item={item}/>
                <div className="wl-strip-info">
                  <span className="wl-strip-name">{item.name}</span>
                  <span className="wl-strip-sub">
                    {item.type === 'politician' && <><span className={`wl-dot ${item.party?.toLowerCase()}`}/>{item.party} · {item.ticker}</>}
                    {item.type === 'institution' && <>{item.revenue || '13F'} · {item.ticker}</>}
                    {item.type === 'index' && <>{item.ticker}</>}
                  </span>
          </div>
        </div>
              <div className="wl-strip-bottom">
                <div>
                  <span className="wl-strip-price">{fmtPrice(item.price)}</span>
                  <span className={`wl-strip-chg ${up?'up':'dn'}`}>{fmtPct(item.pct)}</span>
          </div>
                <Spark seed={item.id.charCodeAt(0)+item.id.charCodeAt(item.id.length-1)} up={up}/>
        </div>
              <div className="wl-strip-assets">
                {item.topAssets.slice(0,3).map(a => <span key={a} className="wl-strip-asset">{a}</span>)}
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
            className={`wl-comm ${selected.id === c.id ? 'active' : ''}`}
            onClick={() => selectAny(raw)}
            style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
          >
            <span className="wl-comm-name">{c.name} · {c.ticker}</span>
            <span className="wl-comm-price">${fmtSmall(c.price)}</span>
            <span className={`wl-comm-chg ${c.change>=0?'up':'dn'}`}>{fmtChg(c.change)} {fmtPct(c.pct)}</span>
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
              {selected.type !== 'stock' && (
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
              {selected.type !== 'stock' && (
                <div className={`wl-big-chg ${isUp ? 'up' : 'dn'}`}>
                  <i className={`bi ${isUp ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}`} />
                  {fmtPct(selectedMerged.pct)}
                </div>
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

          <div className="wl-top-assets">
            <h4>{selected.type === 'stock' ? 'Revenue Segments' : selected.type === 'index' ? 'Top Constituents' : 'Top Holdings'}</h4>
            <div className="wl-ta-grid">
              {selected.topAssets.map(a => (
                <div key={a} className="wl-ta-chip">
                  <span className="wl-ta-dot"/>{a}
                </div>
              ))}
            </div>
          </div>

          <div className="wl-cmp">
            <div className="wl-cmp-hdr">
              <span/><span>Name</span><span>Value</span><span>Change</span><span>Type</span><span/>
            </div>
            {TOP_STRIP.filter(i => i.id !== selected.id).slice(0,5).map(raw => {
              const item = mergeFinnhubQuote(raw, quoteMap);
              return (
              <button key={item.id} type="button" className="wl-cmp-row" onClick={() => selectAny(raw)}>
                <TypeIcon item={item}/>
                <span className="wl-cmp-name">{item.name}</span>
                <span className="wl-cmp-val">{fmtPrice(item.price)}</span>
                <span className={`wl-cmp-chg ${item.change>=0?'up':'dn'}`}>{fmtPct(item.pct)}</span>
                <span className={`wl-cmp-type ${item.type}`}>
                  {item.type === 'index' ? 'Index' : item.type === 'politician' ? 'Congress' : '13F Fund'}
                </span>
                <Spark seed={item.id.charCodeAt(0)*3} up={item.change>=0} w={48} h={16}/>
              </button>
              );
            })}
              </div>
            </div>

        {/* ── RIGHT: Sidebar ── */}
        <aside className="wl-side">
          <div className="wl-side-hdr">
            <h3>My Watchlist</h3>
            <span className="wl-side-cnt">{sideItems.length}</span>
          </div>

          <div className="wl-side-search">
            <i className="bi bi-search"/>
            <input type="text" placeholder="Search stocks, portfolios, funds…" value={search} onChange={e => setSearch(e.target.value)}/>
                    </div>

          <div className="wl-side-tabs">
            {SIDEBAR_TABS.map((t) => (
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

          <div className="wl-side-list">
            {sideItems.map(raw => {
              const item = mergeFinnhubQuote(raw, quoteMap);
              const act = selected.id === item.id;
              const up = item.change >= 0;
              return (
                <button key={item.id} type="button" className={`wl-si ${act?'act':''} ${item.type}`} onClick={() => selectAny(raw)}>
                  <div className="wl-si-left">
                    {item.type === 'stock' && <span className="wl-si-tk">{item.ticker}</span>}
                    {item.type === 'politician' && <span className={`wl-si-av ${item.party?.toLowerCase()}`}>{item.name.split(' ').map(w=>w[0]).join('')}</span>}
                    {item.type === 'institution' && <span className="wl-si-inst"><i className="bi bi-building"/></span>}
                    <div className="wl-si-info">
                      <span className="wl-si-name">{item.name}</span>
                      <span className="wl-si-sub">{item.type==='stock'?item.ticker:item.type==='politician'?`${item.party} · ${item.ticker}`:`13F · ${item.ticker}`}</span>
                    </div>
                  </div>
                  <div className="wl-si-right">
                    <span className="wl-si-price">{fmtPrice(item.price)}</span>
                    <span className={`wl-si-chg ${up?'up':'dn'}`}>{fmtPct(item.pct)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <button type="button" className="wl-add" data-task-target="watchlist-add-button" onClick={() => { completeTask('watchlist_1'); }}><i className="bi bi-plus-lg"/> Add to Watchlist</button>
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
