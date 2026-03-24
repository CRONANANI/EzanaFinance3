'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PinnableCard } from '@/components/ui/PinnableCard';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/components/learning/learning-opportunities.css';
import './inside-the-capitol.css';

/* ── Helpers ── */
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/* ── Static data ── */
const STAT_CARDS = [
  { id: 'trades', icon: 'bi-arrow-left-right', label: 'Total Trades', value: '2,847', change: '+124 this week', changeType: 'positive', color: '#10b981' },
  { id: 'volume', icon: 'bi-cash-stack', label: 'Total Volume', value: '$487M', change: '+$32M this month', changeType: 'positive', color: '#3b82f6' },
  { id: 'traders', icon: 'bi-people', label: 'Active Traders', value: '127', change: 'of 535 members', changeType: 'neutral', color: '#a78bfa' },
  { id: 'alerts', icon: 'bi-bell', label: 'New Alerts', value: '18', change: 'Last 24 hours', changeType: 'positive', color: '#fbbf24' },
];

const LATEST_TRADES = [
  { id: 1, type: 'SELL', ticker: 'KMB', company: 'Kimberly-Clark Corp', exchange: 'KMB:US', member: 'Tommy Tuberville', party: 'Republican', chamber: 'Senate', state: 'AL', amount: '100K–250K', date: 'Yesterday', flagged: true },
  { id: 2, type: 'SELL', ticker: 'HPQ', company: 'HP Inc', exchange: 'HPQ:US', member: 'Tommy Tuberville', party: 'Republican', chamber: 'Senate', state: 'AL', amount: '15K–50K', date: 'Yesterday', flagged: false },
  { id: 3, type: 'BUY', ticker: 'NVDA', company: 'NVIDIA Corp', exchange: 'NVDA:US', member: 'Nancy Pelosi', party: 'Democrat', chamber: 'House', state: 'CA', amount: '1M–5M', date: '2 days ago', flagged: true },
  { id: 4, type: 'SELL', ticker: 'CLX', company: 'The Clorox Co', exchange: 'CLX:US', member: 'Tommy Tuberville', party: 'Republican', chamber: 'Senate', state: 'AL', amount: '1K–15K', date: 'Yesterday', flagged: false },
  { id: 5, type: 'BUY', ticker: 'AAPL', company: 'Apple Inc', exchange: 'AAPL:US', member: 'Dan Crenshaw', party: 'Republican', chamber: 'House', state: 'TX', amount: '100K–250K', date: '3 days ago', flagged: false },
  { id: 6, type: 'SELL', ticker: 'META', company: 'Meta Platforms', exchange: 'META:US', member: 'Mark Warner', party: 'Democrat', chamber: 'Senate', state: 'VA', amount: '50K–100K', date: '3 days ago', flagged: false },
  { id: 7, type: 'BUY', ticker: 'MSFT', company: 'Microsoft Corp', exchange: 'MSFT:US', member: 'Josh Gottheimer', party: 'Democrat', chamber: 'House', state: 'NJ', amount: '15K–50K', date: '4 days ago', flagged: false },
  { id: 8, type: 'SELL', ticker: 'CLX', company: 'The Clorox Co', exchange: 'CLX:US', member: 'Tommy Tuberville', party: 'Republican', chamber: 'Senate', state: 'AL', amount: '15K–50K', date: 'Yesterday', flagged: false },
];

/* ── Politician Performance Data ── */
const PERF_WINDOWS = ['1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', '10Y'];
const PERF_LABELS = { '1W': '1 Week', '1M': '1 Month', '3M': '3 Months', '6M': '6 Months', '1Y': '1 Year', '3Y': '3 Years', '5Y': '5 Years', '10Y': '10 Years' };

const POLITICIAN_PERF = [
  { name: 'Nancy Pelosi', initials: 'NP', party: 'Democrat', chamber: 'House', state: 'CA',
    topHoldings: ['NVDA', 'AAPL', 'MSFT'],
    returns: { '1W': 3.2, '1M': 8.1, '3M': 18.4, '6M': 32.7, '1Y': 54.3, '3Y': 142.5, '5Y': 221.8, '10Y': 487.2 } },
  { name: 'Dan Crenshaw', initials: 'DC', party: 'Republican', chamber: 'House', state: 'TX',
    topHoldings: ['AAPL', 'MSFT', 'XOM'],
    returns: { '1W': 2.1, '1M': 5.9, '3M': 12.1, '6M': 19.8, '1Y': 38.7, '3Y': 89.4, '5Y': 156.3, '10Y': 298.1 } },
  { name: 'Mark Warner', initials: 'MW', party: 'Democrat', chamber: 'Senate', state: 'VA',
    topHoldings: ['META', 'CRM', 'SNOW'],
    returns: { '1W': 1.8, '1M': 6.3, '3M': 14.2, '6M': 24.5, '1Y': 41.2, '3Y': 98.7, '5Y': 178.9, '10Y': 356.4 } },
  { name: 'Tommy Tuberville', initials: 'TT', party: 'Republican', chamber: 'Senate', state: 'AL',
    topHoldings: ['KMB', 'HPQ', 'CLX'],
    returns: { '1W': -0.8, '1M': 1.2, '3M': 3.5, '6M': 7.8, '1Y': 12.4, '3Y': 28.6, '5Y': 45.2, '10Y': 89.3 } },
  { name: 'Josh Gottheimer', initials: 'JG', party: 'Democrat', chamber: 'House', state: 'NJ',
    topHoldings: ['MSFT', 'GOOGL', 'JPM'],
    returns: { '1W': 2.7, '1M': 7.4, '3M': 16.8, '6M': 28.3, '1Y': 46.1, '3Y': 118.3, '5Y': 195.7, '10Y': 412.6 } },
  { name: 'Michael McCaul', initials: 'MM', party: 'Republican', chamber: 'House', state: 'TX',
    topHoldings: ['LMT', 'RTX', 'MSFT'],
    returns: { '1W': 1.4, '1M': 4.2, '3M': 9.8, '6M': 16.2, '1Y': 29.5, '3Y': 67.8, '5Y': 112.4, '10Y': 234.7 } },
  { name: 'Shelley Capito', initials: 'SC', party: 'Republican', chamber: 'Senate', state: 'WV',
    topHoldings: ['JNJ', 'PFE', 'UNH'],
    returns: { '1W': 0.9, '1M': 3.1, '3M': 7.6, '6M': 13.4, '1Y': 22.8, '3Y': 52.1, '5Y': 88.6, '10Y': 178.3 } },
  { name: 'Ro Khanna', initials: 'RK', party: 'Democrat', chamber: 'House', state: 'CA',
    topHoldings: ['TSLA', 'PLTR', 'COIN'],
    returns: { '1W': 4.1, '1M': 9.8, '3M': 21.3, '6M': 35.9, '1Y': 62.7, '3Y': 158.4, '5Y': 248.1, '10Y': 523.9 } },
  { name: 'Pat Fallon', initials: 'PF', party: 'Republican', chamber: 'House', state: 'TX',
    topHoldings: ['AMZN', 'NVDA', 'AMD'],
    returns: { '1W': 2.9, '1M': 7.8, '3M': 17.5, '6M': 30.1, '1Y': 51.8, '3Y': 134.2, '5Y': 210.5, '10Y': 445.8 } },
  { name: 'John Curtis', initials: 'JC', party: 'Republican', chamber: 'House', state: 'UT',
    topHoldings: ['AVGO', 'QCOM', 'TXN'],
    returns: { '1W': 1.1, '1M': 3.6, '3M': 8.4, '6M': 14.9, '1Y': 26.3, '3Y': 61.4, '5Y': 102.8, '10Y': 210.5 } },
];

/* ── Politician Performance Chart ── */
const PC_W = 780;
const PC_H = 380;
const PC_PAD = { top: 50, right: 40, bottom: 50, left: 60 };
const PC_DOT_R = 6;

function PoliticianPerfChart({ window: tw }) {
  const router = useRouter();
  const [hoveredId, setHoveredId] = useState(null);

  const sorted = useMemo(
    () => [...POLITICIAN_PERF].sort((a, b) => b.returns[tw] - a.returns[tw]),
    [tw]
  );

  const returns = sorted.map((p) => p.returns[tw]);
  const yMax = Math.ceil((Math.max(...returns) + 10) / 10) * 10;
  const yMin = Math.min(Math.floor((Math.min(...returns) - 5) / 10) * 10, 0);
  const innerW = PC_W - PC_PAD.left - PC_PAD.right;
  const innerH = PC_H - PC_PAD.top - PC_PAD.bottom;

  const getX = (i) => PC_PAD.left + (i / (sorted.length - 1)) * innerW;
  const getY = (v) => PC_PAD.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const yStep = yMax - yMin > 100 ? 50 : yMax - yMin > 40 ? 20 : 10;
  const yTicks = [];
  for (let t = yMin; t <= yMax; t += yStep) yTicks.push(t);

  const linePath = sorted.map((p, i) => `${i === 0 ? 'M' : 'L'}${getX(i)},${getY(p.returns[tw])}`).join(' ');
  const areaPath = `${linePath} L${getX(sorted.length - 1)},${PC_PAD.top + innerH} L${getX(0)},${PC_PAD.top + innerH} Z`;

  const hovered = hoveredId != null ? sorted[hoveredId] : null;

  return (
    <div className="itc-perf-chart-wrap">
      <svg viewBox={`0 0 ${PC_W} ${PC_H}`} preserveAspectRatio="xMidYMid meet" className="itc-perf-svg">
        <defs>
          <linearGradient id="itcPerfGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          <filter id="itcDotGlow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.35" />
          </filter>
          {sorted.map((_, i) => (
            <clipPath key={i} id={`itcClip${i}`}>
              <circle cx={getX(i)} cy={getY(sorted[i].returns[tw])} r={PC_DOT_R} />
            </clipPath>
          ))}
        </defs>

        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PC_PAD.left} y1={getY(t)} x2={PC_W - PC_PAD.right} y2={getY(t)} stroke="rgba(16,185,129,.12)" strokeWidth="1" strokeDasharray="4 4" />
            <text x={PC_PAD.left - 10} y={getY(t)} textAnchor="end" dominantBaseline="middle" fill="#6b7280" fontSize="11" fontFamily="Plus Jakarta Sans, sans-serif">
              {t}%
            </text>
          </g>
        ))}

        {yMin <= 0 && yMax >= 0 && (
          <line x1={PC_PAD.left} y1={getY(0)} x2={PC_W - PC_PAD.right} y2={getY(0)} stroke="rgba(16,185,129,.25)" strokeWidth="1" />
        )}

        <line x1={PC_PAD.left} y1={PC_PAD.top} x2={PC_PAD.left} y2={PC_PAD.top + innerH} stroke="rgba(16,185,129,.3)" strokeWidth="1" />
        <line x1={PC_PAD.left} y1={PC_PAD.top + innerH} x2={PC_W - PC_PAD.right} y2={PC_PAD.top + innerH} stroke="rgba(16,185,129,.3)" strokeWidth="1" />

        <path d={areaPath} fill="url(#itcPerfGrad)" />
        <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
        <path d={linePath} fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" pathLength="100" strokeDasharray="3 97" className="itc-perf-pulse" />

        {sorted.map((p, i) => {
          const cx = getX(i);
          const cy = getY(p.returns[tw]);
          const isHov = hoveredId === i;
          const borderColor = p.party === 'Democrat' ? '#3b82f6' : '#ef4444';
          const bgColor = p.party === 'Democrat' ? '#2563eb' : '#dc2626';

          return (
            <g key={p.name} onMouseEnter={() => setHoveredId(i)} onMouseLeave={() => setHoveredId(null)} onClick={() => router.push(`/inside-the-capitol/${slugify(p.name)}`)} style={{ cursor: 'pointer' }}>
              <circle cx={cx} cy={cy} r={PC_DOT_R + 3} fill="none" stroke={borderColor} strokeWidth={isHov ? 3.5 : 2} filter="url(#itcDotGlow)" opacity={isHov ? 1 : 0.85} />
              <circle cx={cx} cy={cy} r={PC_DOT_R} fill={bgColor} />
              <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="7" fontWeight="800" fontFamily="Plus Jakarta Sans, sans-serif">{p.initials}</text>
              <text x={cx} y={cy + PC_DOT_R + 10} textAnchor="middle" fill={isHov ? '#f0f6fc' : '#8b949e'} fontSize="9" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">
                {p.returns[tw] >= 0 ? '+' : ''}{p.returns[tw]}%
              </text>
              <circle cx={cx} cy={cy} r={PC_DOT_R + 14} fill="transparent" style={{ pointerEvents: 'all' }} />
            </g>
          );
        })}
      </svg>

      {hovered && (() => {
        const idx = hoveredId;
        const xPct = (getX(idx) / PC_W) * 100;
        const yPct = (getY(hovered.returns[tw]) / PC_H) * 100;
        const alignRight = xPct > 65;
        return (
          <div className="itc-perf-tooltip" style={{
            left: alignRight ? undefined : `${Math.max(xPct, 8)}%`,
            right: alignRight ? `${Math.max(100 - xPct, 8)}%` : undefined,
            top: `${Math.max(yPct - 28, 2)}%`,
            transform: alignRight ? 'translateX(50%)' : 'translateX(-50%)',
          }}>
            <div className="itc-perf-tip-hdr">
              <span className={`itc-avatar-sm ${hovered.party.toLowerCase()}`}>{hovered.initials}</span>
              <div>
                <div className="itc-perf-tip-name">{hovered.name}</div>
                <div className="itc-perf-tip-meta"><span className={`itc-dot ${hovered.party.toLowerCase()}`} />{hovered.party} · {hovered.chamber} · {hovered.state}</div>
              </div>
            </div>
            <div className={`itc-perf-tip-return ${hovered.returns[tw] >= 0 ? 'pos' : 'neg'}`}>
              {hovered.returns[tw] >= 0 ? '+' : ''}{hovered.returns[tw]}% return ({PERF_LABELS[tw]})
            </div>
            <div className="itc-perf-tip-hold">
              <span className="itc-perf-tip-hold-lbl">Top Holdings:</span>
              {hovered.topHoldings.map((t) => <span key={t} className="itc-perf-tip-tk">${t}</span>)}
            </div>
            <div className="itc-perf-tip-rank">Rank #{idx + 1} of {sorted.length}</div>
          </div>
        );
      })()}
    </div>
  );
}

const FEATURED_POLITICIANS = [
  { id: 1, name: 'Nancy Pelosi', party: 'Democrat', chamber: 'House', state: 'CA', initials: 'NP', trades: 312, filings: 8, issuers: 47, volume: '24.8M', seed: 1 },
  { id: 2, name: 'Tommy Tuberville', party: 'Republican', chamber: 'Senate', state: 'AL', initials: 'TT', trades: 188, filings: 2, issuers: 94, volume: '1.60M', seed: 4 },
  { id: 3, name: 'Dan Crenshaw', party: 'Republican', chamber: 'House', state: 'TX', initials: 'DC', trades: 156, filings: 4, issuers: 38, volume: '3.2M', seed: 7 },
  { id: 4, name: 'Mark Warner', party: 'Democrat', chamber: 'Senate', state: 'VA', initials: 'MW', trades: 201, filings: 6, issuers: 52, volume: '8.4M', seed: 10 },
];

const LATEST_BUZZ = [
  { id: 1, time: 'Today, 07:16', platform: 'twitter', text: "Rep. Connolly's stock divestment in $D, $SAIC, $LDOS yields capital gains", tickers: ['D', 'SAIC', 'LDOS'], sentiment: 'neutral' },
  { id: 2, time: 'Yesterday', platform: 'news', text: 'Unusual trading volume detected among Senate Banking Committee members ahead of hearing', tickers: ['JPM', 'BAC', 'GS'], sentiment: 'bearish' },
  { id: 3, time: '2 days ago', platform: 'twitter', text: 'Multiple defense sector sales reported by Senator Tuberville, totaling $250K+', tickers: ['LMT', 'RTX', 'NOC'], sentiment: 'bearish' },
  { id: 4, time: '3 days ago', platform: 'news', text: 'Tech committee members increasing exposure to AI stocks ahead of regulation vote', tickers: ['NVDA', 'MSFT', 'GOOGL'], sentiment: 'bullish' },
];

const SECTOR_DATA = [
  { sector: 'Technology', buy: 68, sell: 32, vol: '$142M', trades: 487 },
  { sector: 'Healthcare', buy: 55, sell: 45, vol: '$89M', trades: 312 },
  { sector: 'Defense', buy: 42, sell: 58, vol: '$67M', trades: 198 },
  { sector: 'Finance', buy: 61, sell: 39, vol: '$78M', trades: 267 },
  { sector: 'Energy', buy: 48, sell: 52, vol: '$54M', trades: 156 },
  { sector: 'Consumer', buy: 52, sell: 48, vol: '$38M', trades: 134 },
];

const FILINGS = [
  { member: 'Nancy Pelosi', type: 'PTR', date: 'Mar 12, 2026', tickers: ['NVDA', 'AAPL', 'RBLX'], isNew: true },
  { member: 'Tommy Tuberville', type: 'PTR', date: 'Mar 11, 2026', tickers: ['KMB', 'HPQ', 'CLX'], isNew: true },
  { member: 'Dan Crenshaw', type: 'Annual', date: 'Mar 10, 2026', tickers: ['AAPL', 'MSFT'], isNew: false },
  { member: 'Mark Warner', type: 'PTR', date: 'Mar 8, 2026', tickers: ['META', 'CRM'], isNew: false },
  { member: 'Josh Gottheimer', type: 'PTR', date: 'Mar 7, 2026', tickers: ['MSFT', 'GOOGL'], isNew: false },
];

/* ── Spark SVG ── */
function Spark({ seed = 0, color = '#10b981' }) {
  const pts = [];
  let y = 50;
  for (let i = 0; i < 40; i++) {
    y += Math.sin(i * 0.4 + seed) * 6 + (Math.sin(i * 1.1 + seed * 2) * 3);
    y = Math.max(8, Math.min(92, y));
    pts.push(`${(i / 39) * 100},${y}`);
  }
  const area = `M0,100 L0,${pts[0].split(',')[1]} ${pts.map((p) => `L${p}`).join(' ')} L100,100 Z`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="itc-spark">
      <defs>
        <linearGradient id={`sg${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg${seed})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* State slug (URL) to abbreviation mapping for trade filtering */
const STATE_SLUG_TO_ABBR = {
  'california': 'CA', 'alabama': 'AL', 'texas': 'TX', 'virginia': 'VA',
  'new-jersey': 'NJ', 'west-virginia': 'WV', 'utah': 'UT',
};

function InsideTheCapitolContent() {
  const searchParams = useSearchParams();
  const partyFilter = searchParams.get('party');
  const stateFilter = searchParams.get('state');

  const [assetFilter, setAssetFilter] = useState('Stocks Only');
  const [typeFilter, setTypeFilter] = useState('All');
  const [activePartyFilter, setActivePartyFilter] = useState(null);
  const [activeStateFilter, setActiveStateFilter] = useState(null);
  const [activePolIdx, setActivePolIdx] = useState(0);
  const [perfWindow, setPerfWindow] = useState('1Y');

  useEffect(() => {
    setActivePartyFilter(partyFilter || null);
  }, [partyFilter]);

  useEffect(() => {
    setActiveStateFilter(stateFilter || null);
  }, [stateFilter]);

  const trades = LATEST_TRADES.filter((t) => {
    if (typeFilter === 'Buy') return t.type === 'BUY';
    if (typeFilter === 'Sell') return t.type === 'SELL';
    if (activePartyFilter) {
      if (t.party.toLowerCase() !== activePartyFilter) return false;
    }
    if (activeStateFilter) {
      const abbr = STATE_SLUG_TO_ABBR[activeStateFilter] || activeStateFilter.toUpperCase().slice(0, 2);
      if (t.state !== abbr) return false;
    }
    return true;
  });

  const pol = FEATURED_POLITICIANS[activePolIdx];

  return (
    <div className="itc-page dashboard-page-inset">
      {/* ── Stats ── */}
      <div className="itc-stats">
        {STAT_CARDS.map((s) => (
          <div key={s.id} className="itc-stat">
            <div className="itc-stat-icon" style={{ background: `${s.color}18`, color: s.color }}>
              <i className={`bi ${s.icon}`} />
            </div>
            <div>
              <div className="itc-stat-val">{s.value}</div>
              <div className="itc-stat-lbl">{s.label}</div>
              <div className={`itc-stat-chg ${s.changeType}`}>{s.change}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 2×2 Grid ── */}
      <div className="itc-grid-2x2">
        {/* TOP LEFT — Latest Trades */}
        <PinnableCard cardId="itc-latest-trades" title="Latest Trades" sourcePage="/inside-the-capitol" sourceLabel="Inside The Capitol" defaultW={2} defaultH={3}>
          <div className="itc-card">
            <div className="itc-hdr">
              <div className="itc-hdr-left">
                <h3>LATEST TRADES</h3>
                <div className="itc-chips">
                  {['Stocks Only', 'Options', 'All'].map((f) => (
                    <button key={f} type="button" className={`itc-chip ${assetFilter === f ? 'on' : ''}`} onClick={() => setAssetFilter(f)}>
                      {f}{assetFilter === f && <i className="bi bi-chevron-down" />}
                    </button>
                  ))}
                </div>
              </div>
              <Link href="/watchlist" className="itc-va">VIEW ALL</Link>
            </div>
            <div className="itc-sub-filters">
              {['All', 'Buy', 'Sell'].map((f) => (
                <button key={f} type="button" className={`itc-sf ${typeFilter === f ? 'on' : ''}`} onClick={() => setTypeFilter(f)}>{f}</button>
              ))}
              {(activePartyFilter || activeStateFilter) && (
                <Link href="/inside-the-capitol" className="itc-filter-clear">
                  <span className="itc-filter-tag">{activePartyFilter ? activePartyFilter.charAt(0).toUpperCase() + activePartyFilter.slice(1) : ''}{activePartyFilter && activeStateFilter ? ' · ' : ''}{activeStateFilter ? activeStateFilter.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : ''}</span>
                  <i className="bi bi-x" />
                </Link>
              )}
            </div>
            <div className="itc-body">
              {trades.map((t) => (
                <div key={t.id} className="itc-tr">
                  <div className="itc-tr-type-col">
                    <span className={`itc-tr-type ${t.type.toLowerCase()}`}>{t.type}</span>
                    <span className="itc-tr-date">{t.date}</span>
                  </div>
                  <div className="itc-tr-co">
                    <span className="itc-tr-co-name">{t.company}</span>
                    <span className="itc-tr-co-exch">{t.exchange}</span>
                  </div>
                  <Link href={`/inside-the-capitol/${slugify(t.member)}`} className="itc-tr-mem">
                    <span className="itc-tr-mem-name">{t.member}</span>
                    <span className="itc-tr-mem-meta"><span className={`itc-dot ${t.party.toLowerCase()}`} />{t.party} | {t.chamber} | {t.state}</span>
                  </Link>
                  <div className="itc-tr-right">
                    <span className="itc-tr-amt">{t.amount}</span>
                    {t.flagged && <span className="itc-tr-flag"><i className="bi bi-flag-fill" /></span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PinnableCard>

        {/* TOP RIGHT — Top Performing Politicians */}
        <PinnableCard cardId="itc-top-performers" title="Top Performers" sourcePage="/inside-the-capitol" sourceLabel="Inside The Capitol" defaultW={2} defaultH={3}>
          <div className="itc-card">
            <div className="itc-hdr">
              <div className="itc-hdr-left">
                <h3>TOP PERFORMING POLITICIANS</h3>
              </div>
              <Link href="/watchlist" className="itc-va">VIEW ALL</Link>
            </div>
            <div className="itc-perf-windows">
              {PERF_WINDOWS.map((w) => (
                <button key={w} type="button" className={`itc-pw ${perfWindow === w ? 'on' : ''}`} onClick={() => setPerfWindow(w)}>{w}</button>
              ))}
            </div>
            <div className="itc-body" style={{ overflow: 'visible' }}>
              <PoliticianPerfChart window={perfWindow} />
            </div>
          </div>
        </PinnableCard>

        {/* BOTTOM LEFT — Featured Politicians */}
        <PinnableCard cardId="itc-featured-politicians" title="Featured Politicians" sourcePage="/inside-the-capitol" sourceLabel="Inside The Capitol" defaultW={2} defaultH={3}>
          <div className="itc-card">
            <div className="itc-hdr">
              <h3>FEATURED POLITICIANS</h3>
              <Link href="/watchlist" className="itc-va">VIEW ALL</Link>
            </div>
            <div className="itc-body">
              <div className="itc-pol-tabs">
                {FEATURED_POLITICIANS.map((p, i) => (
                  <button key={p.id} type="button" className={`itc-pol-tab ${activePolIdx === i ? 'on' : ''}`} onClick={() => setActivePolIdx(i)}>
                    <span className={`itc-avatar-sm ${p.party.toLowerCase()}`}>{p.initials}</span>
                    <span className="itc-pol-tab-name">{p.name.split(' ').pop()}</span>
                  </button>
                ))}
              </div>
              <div className="itc-pol-detail">
                <div className="itc-pol-top">
                  <Link href={`/inside-the-capitol/${slugify(pol.name)}`} className={`itc-avatar-lg ${pol.party.toLowerCase()}`}>{pol.initials}</Link>
                  <div>
                    <Link href={`/inside-the-capitol/${slugify(pol.name)}`} className="itc-pol-name">{pol.name}</Link>
                    <div className="itc-pol-meta"><span className={`itc-dot ${pol.party.toLowerCase()}`} />{pol.party} | {pol.chamber} | {pol.state}</div>
                  </div>
                </div>
                <div className="itc-pol-nums">
                  {[
                    { v: pol.trades, l: 'Trades' },
                    { v: pol.filings, l: 'Filings' },
                    { v: pol.issuers, l: 'Issuers' },
                    { v: pol.volume, l: 'Volume' },
                  ].map((s) => (
                    <div key={s.l} className="itc-pol-num">
                      <span className="itc-pol-num-v">{s.v}</span>
                      <span className="itc-pol-num-l">{s.l}</span>
                    </div>
                  ))}
                </div>
                <div className="itc-pol-chart">
                  <span className="itc-pol-chart-lbl">vs S&P500</span>
                  <Spark seed={pol.seed} color="#10b981" />
                </div>
              </div>
            </div>
          </div>
        </PinnableCard>

        {/* BOTTOM RIGHT — Latest Buzz */}
        <PinnableCard cardId="itc-latest-buzz" title="Latest Buzz" sourcePage="/inside-the-capitol" sourceLabel="Inside The Capitol" defaultW={2} defaultH={3}>
          <div className="itc-card">
            <div className="itc-hdr">
              <h3>LATEST BUZZ</h3>
              <Link href="/community" className="itc-va">VIEW ALL</Link>
            </div>
            <div className="itc-body">
              {LATEST_BUZZ.map((b) => (
                <div key={b.id} className="itc-bz">
                  <div className="itc-bz-left">
                    <span className="itc-bz-time">{b.time}</span>
                    {b.platform === 'twitter' && <i className="bi bi-twitter itc-bz-plat" style={{ color: '#60a5fa' }} />}
                    {b.platform === 'news' && <i className="bi bi-newspaper itc-bz-plat" style={{ color: '#8b949e' }} />}
                  </div>
                  <div className="itc-bz-body">
                    <p className="itc-bz-text">{b.text}</p>
                    <div className="itc-bz-tickers">
                      {b.tickers.map((tk) => (
                        <span key={tk} className={`itc-bz-tk ${b.sentiment}`}>${tk}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PinnableCard>
      </div>

      {/* ── Bottom row ── */}
      <div className="itc-grid-2">
        {/* Sector Activity */}
        <PinnableCard cardId="itc-sectors" title="Sector Activity" sourcePage="/inside-the-capitol" sourceLabel="Inside The Capitol" defaultW={2} defaultH={2}>
          <div className="itc-card">
            <div className="itc-hdr"><h3>SECTOR ACTIVITY</h3></div>
            <div className="itc-body itc-body-pad">
              {SECTOR_DATA.map((s) => (
                <div key={s.sector} className="itc-sec">
                  <div className="itc-sec-info">
                    <span className="itc-sec-name">{s.sector}</span>
                    <span className="itc-sec-meta">{s.trades} trades · {s.vol}</span>
                  </div>
                  <div className="itc-sec-bar">
                    <div className="itc-sec-buy" style={{ width: `${s.buy}%` }}>{s.buy}%</div>
                    <div className="itc-sec-sell" style={{ width: `${s.sell}%` }}>{s.sell}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PinnableCard>

        {/* Recent Filings */}
        <PinnableCard cardId="itc-filings" title="Recent Filings" sourcePage="/inside-the-capitol" sourceLabel="Inside The Capitol" defaultW={2} defaultH={2}>
          <div className="itc-card">
            <div className="itc-hdr">
              <h3>RECENT FILINGS</h3>
              <Link href="/watchlist" className="itc-va">VIEW ALL</Link>
            </div>
            <div className="itc-body">
              {FILINGS.map((f, i) => (
                <div key={i} className="itc-fil">
                  <div className="itc-fil-left">
                    <span className={`itc-fil-dot ${f.isNew ? 'new' : ''}`} />
                    <div>
                      <Link href={`/inside-the-capitol/${slugify(f.member)}`} className="itc-fil-name">{f.member}</Link>
                      <span className="itc-fil-meta">{f.type} · {f.date}</span>
                    </div>
                  </div>
                  <div className="itc-fil-tickers">
                    {f.tickers.map((t) => <span key={t} className="itc-fil-tk">${t}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PinnableCard>
      </div>

      {/* ── Learning ── */}
      <section className="learning-opportunities">
        <div className="learning-header">
          <div className="learning-title-area">
            <div className="learning-icon"><i className="bi bi-mortarboard-fill" /></div>
            <div className="learning-title-text"><h3>Political Trading Analysis</h3><p>Learn to analyze and track congressional trading patterns</p></div>
          </div>
          <Link href="/learning-center" className="view-all-btn">View All Courses</Link>
        </div>
        <div className="courses-grid">
          {[
            { title: 'Congressional Trading 101', desc: 'Track, analyze, and interpret congressional stock trades.', dur: '3 hours', lessons: 10, enrolled: 3124, level: 'beginner' },
            { title: 'Lobbying Data Analysis', desc: 'Analyze lobbying expenditures and connect them to markets.', dur: '4 hours', lessons: 12, enrolled: 1847, level: 'intermediate' },
            { title: 'Policy Impact on Markets', desc: 'Predict market movements based on legislative proposals.', dur: '5 hours', lessons: 16, enrolled: 2456, level: 'advanced' },
            { title: '13F Filing Deep Dive', desc: 'Read and interpret institutional 13F filings.', dur: '2 hours', lessons: 8, enrolled: 2891, level: 'beginner' },
          ].map((c, i) => (
            <div key={i} className="course-card">
              <div className="course-header"><span className="course-type">{i % 2 === 0 ? 'Course' : 'Skill'}</span><span className="course-duration"><i className="bi bi-clock" /> {c.dur}</span></div>
              <h4 className="course-title">{c.title}</h4>
              <p className="course-description">{c.desc}</p>
              <div className="course-meta"><div className="meta-item"><i className="bi bi-book" /> {c.lessons} lessons</div><div className="meta-item"><i className="bi bi-people" /> {c.enrolled.toLocaleString()} enrolled</div></div>
              <div className="course-footer"><span className={`course-level ${c.level}`}>{c.level.charAt(0).toUpperCase() + c.level.slice(1)}</span><button className="enroll-btn" type="button">Enroll Now</button></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function InsideTheCapitolPage() {
  return (
    <Suspense fallback={
      <div className="itc-page dashboard-page-inset" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#8b949e' }}>Loading...</p>
      </div>
    }>
      <InsideTheCapitolContent />
    </Suspense>
  );
}
