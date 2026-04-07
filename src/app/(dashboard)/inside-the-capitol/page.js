'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PinnableCard } from '@/components/ui/PinnableCard';
import { useChecklist } from '@/hooks/useChecklist';
import { CoursePreviewSection } from '@/components/learning/CoursePreviewSection';
import { getCoursesByTrack } from '@/lib/learning-curriculum';

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

/** Parse FMP amount string to a short display string */
function fmtAmount(raw) {
  if (raw == null || raw === '') return '—';
  const s = String(raw);
  return s
    .replace(/\$[\d,]+\s*-\s*\$[\d,]+/g, (m) => {
      const parts = m.replace(/\$/g, '').split(/\s*-\s*/);
      const fmt = (n) => {
        const v = parseInt(String(n).replace(/,/g, ''), 10);
        if (Number.isNaN(v)) return n;
        if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
        if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
        return String(v);
      };
      return `${fmt(parts[0])}–${fmt(parts[1])}`;
    })
    .trim();
}

/** Relative date string from ISO date */
function relDate(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Normalize a raw FMP trade object to the shape the UI expects */
function normalizeTrade(t, chamber, idx = 0) {
  const first = t.firstName || '';
  const last = t.lastName || '';
  const name = `${first} ${last}`.trim() || t.office || t.name || 'Unknown';
  const rawType = (t.type || t.transactionType || '').toString();
  const lower = rawType.toLowerCase();
  const isSell =
    lower.includes('sale') || lower.includes('sell') || lower.includes('disposal');
  const sym = (t.symbol || t.ticker || '').toUpperCase();
  const disclosure = t.disclosureDate || t.date || t.transactionDate;
  const rawDate = disclosure || t.transactionDate;
  let stateAbbr = '';
  if (t.district) {
    const d = String(t.district);
    const m = d.match(/\b([A-Z]{2})\b/);
    if (m) stateAbbr = m[1];
    else stateAbbr = d.replace(/\d+/g, '').trim().slice(0, 2).toUpperCase();
  } else if (t.state) {
    stateAbbr = String(t.state).slice(0, 2).toUpperCase();
  }

  return {
    id: `${chamber}-${sym}-${rawDate || idx}-${name}-${idx}`,
    type: isSell ? 'SELL' : 'BUY',
    ticker: sym,
    company: t.assetDescription || t.asset || sym || '—',
    exchange: sym ? `${sym}:US` : '—',
    member: name,
    party: 'Unknown',
    chamber,
    state: stateAbbr,
    amount: fmtAmount(t.amount),
    date: relDate(disclosure || t.transactionDate),
    flagged: false,
    link: t.link || t.url || '',
    rawDate,
  };
}

/* STAT_CARDS — values are filled dynamically from fetched data */
const STAT_CARDS_BASE = [
  { id: 'trades', icon: 'bi-arrow-left-right', label: 'Total Trades', color: '#10b981' },
  { id: 'volume', icon: 'bi-cash-stack', label: 'Total Volume', color: '#3b82f6' },
  { id: 'traders', icon: 'bi-people', label: 'Active Traders', color: '#a78bfa' },
  { id: 'alerts', icon: 'bi-bell', label: 'New Alerts', color: '#fbbf24' },
];

/* ── Politician Performance Chart (year-based, FMP-backed) ── */
const PC_W = 780;
const PC_H = Math.round(392 * 0.7);
const PC_PAD = { top: 50, right: 40, bottom: 62, left: 60 };
const PC_DOT_R = 6;
const PC_DOT_FONT = 5.5;
const PC_DOT_PCT_FS = 6.5;

/** Cubic smooth path through points (similar to Chart.js tension) */
function buildSmoothPath(points) {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const [x, y] = points[0];
    return `M ${x} ${y}`;
  }
  const p = points.map(([px, py]) => ({ x: px, y: py }));
  let d = `M ${p[0].x} ${p[0].y}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[Math.min(p.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function PoliticianPerfChart({ onOpenPolitician }) {
  const router = useRouter();
  const [hoveredId, setHoveredId] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/fmp/performance')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setChartData(d.chartData || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const activePoints = chartData.filter((d) => d.topPerformer != null);

  if (loading) {
    return (
      <div className="itc-perf-chart-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
        <span style={{ color: '#8b949e', fontSize: '0.85rem' }}>Loading performance data...</span>
      </div>
    );
  }

  if (error || activePoints.length === 0) {
    return (
      <div className="itc-perf-chart-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
        <span style={{ color: '#8b949e', fontSize: '0.85rem' }}>
          {error ? `Could not load: ${error}` : 'No performance data available.'}
        </span>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const xYears = [];
  for (let y = 2016; y <= currentYear; y++) xYears.push(y);

  const returns = activePoints.map((d) => d.returnPct);
  const yMin = 0;
  const yMax = Math.ceil((Math.max(...returns) + 20) / 20) * 20;
  const yStep = 20;
  const yTicks = [];
  for (let t = yMin; t <= yMax; t += yStep) yTicks.push(t);

  const innerW = PC_W - PC_PAD.left - PC_PAD.right;
  const innerH = PC_H - PC_PAD.top - PC_PAD.bottom;
  const yearSpan = Math.max(1, currentYear - 2016);

  const getX = (year) => PC_PAD.left + ((year - 2016) / yearSpan) * innerW;
  const getY = (v) => PC_PAD.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const linePoints = activePoints.map((d) => [getX(d.year), getY(d.returnPct)]);
  const linePath = buildSmoothPath(linePoints);
  const yBase = PC_PAD.top + innerH;
  const areaPath =
    linePoints.length > 0
      ? `${linePath} L ${linePoints[linePoints.length - 1][0]} ${yBase} L ${linePoints[0][0]} ${yBase} Z`
      : '';

  return (
    <div className="itc-perf-chart-wrap">
      <svg viewBox={`0 0 ${PC_W} ${PC_H}`} preserveAspectRatio="xMidYMid meet" className="itc-perf-svg">
        <defs>
          <linearGradient id="itcPerfGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="itcMetalDot" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2a2a3e" />
            <stop offset="100%" stopColor="#1a1a2e" />
          </linearGradient>
          <filter id="itcMetalDotShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
          </filter>
        </defs>

        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PC_PAD.left} y1={getY(t)} x2={PC_W - PC_PAD.right} y2={getY(t)} stroke="rgba(156, 163, 175, 0.1)" strokeWidth="1" />
            <text x={PC_PAD.left - 10} y={getY(t)} textAnchor="end" dominantBaseline="middle" fill="#9ca3af" fontSize="10" fontFamily="Plus Jakarta Sans, sans-serif">
              {t}%
            </text>
          </g>
        ))}

        <line x1={PC_PAD.left} y1={PC_PAD.top} x2={PC_PAD.left} y2={PC_PAD.top + innerH} stroke="rgba(156, 163, 175, 0.1)" strokeWidth="1" />
        <line x1={PC_PAD.left} y1={PC_PAD.top + innerH} x2={PC_W - PC_PAD.right} y2={PC_PAD.top + innerH} stroke="rgba(156, 163, 175, 0.1)" strokeWidth="1" />

        {xYears.map((yr) => (
          <text
            key={yr}
            x={getX(yr)}
            y={PC_PAD.top + innerH + 18}
            textAnchor="middle"
            fill="#9ca3af"
            fontSize="10"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            {yr}
          </text>
        ))}

        <path d={areaPath} fill="url(#itcPerfGrad)" />
        <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {activePoints.map((d, i) => {
          const cx = getX(d.year);
          const cy = getY(d.returnPct);
          const isHov = hoveredId === i;
          const rDot = isHov ? PC_DOT_R + 1 : PC_DOT_R;
          const p = d.topPerformer;

          return (
            <g
              key={d.year}
              onMouseEnter={() => setHoveredId(i)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => { onOpenPolitician?.(); router.push(`/inside-the-capitol/${slugify(p.name)}`); }}
              style={{ cursor: 'pointer' }}
            >
              <circle cx={cx} cy={cy} r={rDot} fill="url(#itcMetalDot)" filter="url(#itcMetalDotShadow)" stroke={isHov ? '#10b981' : 'none'} strokeWidth={isHov ? 1 : 0} />
              <text x={cx} y={cy + 0.5} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={PC_DOT_FONT} fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif">
                {p.initials}
              </text>
              <text x={cx} y={cy + PC_DOT_R + 9} textAnchor="middle" fill={isHov ? '#f0f6fc' : '#8b949e'} fontSize={PC_DOT_PCT_FS} fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif">
                {d.returnPct >= 0 ? '+' : ''}{d.returnPct}%
              </text>
              <circle cx={cx} cy={cy} r={PC_DOT_R + 10} fill="transparent" style={{ pointerEvents: 'all' }} />
            </g>
          );
        })}
      </svg>

      {hoveredId != null && (() => {
        const d = activePoints[hoveredId];
        if (!d || !d.topPerformer) return null;
        const p = d.topPerformer;
        const cx = getX(d.year);
        const cy = getY(d.returnPct);
        const xPct = (cx / PC_W) * 100;
        const yPct = (cy / PC_H) * 100;
        const alignRight = xPct > 65;
        return (
          <div className="itc-perf-tooltip" style={{
            left: alignRight ? undefined : `${Math.max(xPct, 8)}%`,
            right: alignRight ? `${Math.max(100 - xPct, 8)}%` : undefined,
            top: `${Math.max(yPct - 28, 2)}%`,
            transform: alignRight ? 'translateX(50%)' : 'translateX(-50%)',
          }}>
            <div className="itc-perf-tip-hdr">
              <span className={`itc-avatar-sm ${p.party.toLowerCase()}`}>{p.initials}</span>
              <div>
                <div className="itc-perf-tip-name">{p.name}</div>
                <div className="itc-perf-tip-meta">
                  <span className={`itc-dot ${p.party.toLowerCase()}`} />
                  {p.party} · {p.chamber} · {p.state}
                </div>
              </div>
            </div>
            <div className={`itc-perf-tip-return ${d.returnPct >= 0 ? 'pos' : 'neg'}`}>
              {d.returnPct >= 0 ? '+' : ''}{d.returnPct}% return in {d.year}
            </div>
            {p.topSymbols?.length > 0 && (
              <div className="itc-perf-tip-hold">
                <span className="itc-perf-tip-hold-lbl">Top Buys:</span>
                {p.topSymbols.map((s) => <span key={s} className="itc-perf-tip-tk">${s}</span>)}
              </div>
            )}
            <div className="itc-perf-tip-rank">Top Performer · {d.year} · {p.tradeCount} trades on record</div>
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

const TICKER_SECTOR = {
  AAPL: 'Technology', MSFT: 'Technology', NVDA: 'Technology', GOOGL: 'Technology',
  META: 'Technology', AMZN: 'Technology', TSLA: 'Technology', AMD: 'Technology',
  AVGO: 'Technology', QCOM: 'Technology', TXN: 'Technology', INTC: 'Technology',
  CRM: 'Technology', NOW: 'Technology', SNOW: 'Technology', PLTR: 'Technology',
  ADBE: 'Technology', ORCL: 'Technology', IBM: 'Technology', CSCO: 'Technology',
  JNJ: 'Healthcare', PFE: 'Healthcare', UNH: 'Healthcare', ABBV: 'Healthcare',
  MRK: 'Healthcare', LLY: 'Healthcare', TMO: 'Healthcare', DHR: 'Healthcare',
  JPM: 'Finance', BAC: 'Finance', GS: 'Finance', MS: 'Finance', WFC: 'Finance',
  BLK: 'Finance', V: 'Finance', MA: 'Finance', AXP: 'Finance', C: 'Finance',
  LMT: 'Defense', RTX: 'Defense', NOC: 'Defense', GD: 'Defense', BA: 'Defense',
  XOM: 'Energy', CVX: 'Energy', COP: 'Energy', SLB: 'Energy', EOG: 'Energy',
  WMT: 'Consumer Disc.', HD: 'Consumer Disc.', MCD: 'Consumer Disc.',
  SBUX: 'Consumer Disc.', NKE: 'Consumer Disc.', TGT: 'Consumer Disc.',
  GE: 'Industrials', CAT: 'Industrials', HON: 'Industrials', UPS: 'Industrials',
  NFLX: 'Comm. Services', DIS: 'Comm. Services', CMCSA: 'Comm. Services',
  T: 'Comm. Services', VZ: 'Comm. Services',
};

const SECTOR_DATA_FALLBACK = [
  { sector: 'Technology', buy: 68, sell: 32, vol: '—', trades: 0 },
  { sector: 'Healthcare', buy: 55, sell: 45, vol: '—', trades: 0 },
  { sector: 'Defense', buy: 42, sell: 58, vol: '—', trades: 0 },
  { sector: 'Finance', buy: 61, sell: 39, vol: '—', trades: 0 },
  { sector: 'Energy', buy: 48, sell: 52, vol: '—', trades: 0 },
  { sector: 'Consumer Disc.', buy: 52, sell: 48, vol: '—', trades: 0 },
  { sector: 'Industrials', buy: 54, sell: 46, vol: '—', trades: 0 },
  { sector: 'Comm. Services', buy: 49, sell: 51, vol: '—', trades: 0 },
];

const UNUSUAL_VOLUME = [
  { slug: 'nancy-pelosi', name: 'Nancy Pelosi', initials: 'NP', party: 'Democrat', tradesWeek: 15, avgWeek: 4, total: '$2.3M', top: ['NVDA', 'AAPL', 'MSFT'] },
  { slug: 'tommy-tuberville', name: 'Tommy Tuberville', initials: 'TT', party: 'Republican', tradesWeek: 12, avgWeek: 3, total: '$890K', top: ['KMB', 'CLX', 'HPQ'] },
  { slug: 'dan-crenshaw', name: 'Dan Crenshaw', initials: 'DC', party: 'Republican', tradesWeek: 8, avgWeek: 2, total: '$450K', top: ['AAPL', 'TSLA', 'MSFT'] },
];

const BIPARTISAN_TRADES = [
  { ticker: 'NVDA', name: 'NVIDIA Corp', dems: 3, reps: 4, total: '$4.2M' },
  { ticker: 'AAPL', name: 'Apple Inc', dems: 2, reps: 3, total: '$1.8M' },
  { ticker: 'MSFT', name: 'Microsoft Corp', dems: 4, reps: 2, total: '$2.1M' },
  { ticker: 'GOOGL', name: 'Alphabet Inc', dems: 2, reps: 2, total: '$950K' },
];

const EARNINGS_WATCH = [
  { ticker: 'NVDA', earnDate: 'Apr 2, 2026', slug: 'nancy-pelosi', member: 'Nancy Pelosi', side: 'bought', range: '$1M–$5M', when: '3 days ago', warn: 'Traded 3 days before earnings' },
  { ticker: 'AAPL', earnDate: 'Apr 8, 2026', slug: 'dan-crenshaw', member: 'Dan Crenshaw', side: 'bought', range: '$100K–$250K', when: '1 week ago', warn: 'Traded 7 days before earnings' },
  { ticker: 'META', earnDate: 'Apr 10, 2026', slug: 'mark-warner', member: 'Mark Warner', side: 'sold', range: '$50K–$100K', when: '5 days ago', warn: 'Sold 5 days before earnings' },
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
  const { completeTask } = useChecklist();

  const [typeFilter, setTypeFilter] = useState('All');
  const [activePartyFilter, setActivePartyFilter] = useState(null);
  const [activeStateFilter, setActiveStateFilter] = useState(null);
  const [activePolIdx, setActivePolIdx] = useState(0);

  const [latestTrades, setLatestTrades] = useState([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    trades: { value: '—', change: 'Loading...', changeType: 'neutral' },
    volume: { value: '—', change: 'Loading...', changeType: 'neutral' },
    traders: { value: '—', change: 'of 535 members', changeType: 'neutral' },
    alerts: { value: '—', change: 'Last 24 hours', changeType: 'neutral' },
  });

  useEffect(() => {
    async function fetchTrades() {
      setTradesLoading(true);
      try {
        const [senateRes, houseRes] = await Promise.all([
          fetch('/api/fmp/senate?type=latest&page=0&limit=100'),
          fetch('/api/fmp/house?type=latest&page=0&limit=100'),
        ]);

        const senateRaw = senateRes.ok ? await senateRes.json() : [];
        const houseRaw = houseRes.ok ? await houseRes.json() : [];

        const senateArr = Array.isArray(senateRaw) ? senateRaw : [];
        const houseArr = Array.isArray(houseRaw) ? houseRaw : [];

        const senate = senateArr.map((t, i) => normalizeTrade(t, 'Senate', i));
        const house = houseArr.map((t, i) => normalizeTrade(t, 'House', i));

        const all = [...senate, ...house].sort(
          (a, b) => new Date(b.rawDate || 0) - new Date(a.rawDate || 0)
        );

        setLatestTrades(all);

        const total = all.length;
        const thisWeek = all.filter((t) => {
          const d = new Date(t.rawDate);
          return !Number.isNaN(d.getTime()) && Date.now() - d.getTime() < 7 * 86400000;
        }).length;

        const uniqueMembers = new Set(all.map((t) => t.member)).size;

        const last24h = all.filter((t) => {
          const d = new Date(t.rawDate);
          return !Number.isNaN(d.getTime()) && Date.now() - d.getTime() < 86400000;
        }).length;

        setStatsData({
          trades: {
            value: total.toLocaleString(),
            change: `+${thisWeek} this week`,
            changeType: 'positive',
          },
          volume: {
            value: '$—',
            change: 'See individual trades',
            changeType: 'neutral',
          },
          traders: {
            value: String(uniqueMembers),
            change: 'of 535 members',
            changeType: 'neutral',
          },
          alerts: {
            value: String(last24h),
            change: 'Last 24 hours',
            changeType: last24h > 0 ? 'positive' : 'neutral',
          },
        });
      } catch (err) {
        console.error('Failed to fetch congressional trades:', err);
        setStatsData({
          trades: { value: '—', change: 'Could not load', changeType: 'neutral' },
          volume: { value: '—', change: '—', changeType: 'neutral' },
          traders: { value: '—', change: '—', changeType: 'neutral' },
          alerts: { value: '—', change: '—', changeType: 'neutral' },
        });
      } finally {
        setTradesLoading(false);
      }
    }

    fetchTrades();
  }, []);

  const sectorData = useMemo(() => {
    if (tradesLoading) return [];
    if (latestTrades.length === 0) return SECTOR_DATA_FALLBACK;

    const sectorMap = {};
    for (const trade of latestTrades) {
      const sector = TICKER_SECTOR[trade.ticker] || 'Other';
      if (sector === 'Other') continue;
      if (!sectorMap[sector]) sectorMap[sector] = { buys: 0, sells: 0 };
      if (trade.type === 'BUY') sectorMap[sector].buys += 1;
      else sectorMap[sector].sells += 1;
    }

    const derived = Object.entries(sectorMap)
      .map(([sector, counts]) => {
        const total = counts.buys + counts.sells;
        if (total === 0) return null;
        const buyPct = Math.round((counts.buys / total) * 100);
        return {
          sector,
          buy: buyPct,
          sell: 100 - buyPct,
          trades: total,
          vol: '—',
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.trades - a.trades)
      .slice(0, 10);

    return derived.length > 0 ? derived : SECTOR_DATA_FALLBACK;
  }, [latestTrades, tradesLoading]);

  const capitolCourses = useMemo(() => {
    const stocks = getCoursesByTrack('stocks');
    const relevant = stocks.filter(c =>
      c.title.includes('Macroeconomics') ||
      c.title.includes('Behavioral Finance') ||
      c.title.includes('Reading Financial News') ||
      c.title.includes('Fundamental Analysis 101')
    );
    if (relevant.length < 4) {
      const fill = stocks.filter(c => c.level === 'basic' && !relevant.find(r => r.id === c.id));
      return [...relevant, ...fill].slice(0, 4);
    }
    return relevant.slice(0, 4);
  }, []);

  useEffect(() => {
    setActivePartyFilter(partyFilter || null);
  }, [partyFilter]);

  useEffect(() => {
    setActiveStateFilter(stateFilter || null);
  }, [stateFilter]);

  const trades = latestTrades.filter((t) => {
    const ty = (t.type || '').toUpperCase();
    if (typeFilter === 'Buy') return ty === 'BUY';
    if (typeFilter === 'Sell') return ty === 'SELL';
    if (activePartyFilter) {
      if (t.party && t.party.toLowerCase() !== 'unknown' && t.party.toLowerCase() !== activePartyFilter) {
        return false;
      }
    }
    if (activeStateFilter) {
      const abbr = STATE_SLUG_TO_ABBR[activeStateFilter] || activeStateFilter.toUpperCase().slice(0, 2);
      if (t.state && t.state !== abbr) return false;
    }
    return true;
  });

  const pol = FEATURED_POLITICIANS[activePolIdx];

  return (
    <div className="itc-page dashboard-page-inset">
      {/* ── Stats ── */}
      <div className="itc-stats">
        {STAT_CARDS_BASE.map((s) => {
          const live = statsData[s.id] || {};
          return (
            <div key={s.id} className="itc-stat">
              <div className="itc-stat-icon">
                <i className={`bi ${s.icon}`} />
              </div>
              <div>
                <div className="itc-stat-val">{live.value ?? '—'}</div>
                <div className="itc-stat-lbl">{s.label}</div>
                <div className={`itc-stat-chg ${live.changeType ?? 'neutral'}`}>{live.change ?? ''}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2: Top Performing Politicians — full width */}
      <PinnableCard cardId="itc-top-performers" title="Top Performing Politicians" sourcePage="/inside-the-capitol" sourceLabel="Inside The Capitol" defaultW={4} defaultH={3} className="itc-pinnable-fill">
        <div className="itc-card">
          <div className="itc-hdr">
            <div className="itc-hdr-left">
              <h3 className="itc-perf-section-title">TOP PERFORMING POLITICIANS</h3>
            </div>
            <Link href="/watchlist" className="itc-va">VIEW ALL</Link>
          </div>
          <div className="itc-perf-subtitle" style={{ padding: '0 1.25rem 0.5rem', color: '#8b949e', fontSize: '0.78rem' }}>
            Top congressional trader by year · 2016 – {new Date().getFullYear()} · Based on disclosed trades via FMP
          </div>
          <div className="itc-body itc-perf-body" style={{ overflow: 'visible' }}>
            <PoliticianPerfChart onOpenPolitician={() => completeTask('capitol_1')} />
          </div>
        </div>
      </PinnableCard>

      {/* Row 3: Latest Trades + Sector Activity */}
      <div className="itc-row-trades-sector">
        <PinnableCard cardId="itc-latest-trades" title="Latest Trades" sourcePage="/inside-the-capitol" sourceLabel="Inside The Capitol" defaultW={2} defaultH={3} className="itc-pinnable-fill">
          <div className="itc-card">
            <div className="itc-hdr">
              <div className="itc-hdr-left">
                <h3>LATEST TRADES</h3>
              </div>
              <Link href="/watchlist" className="itc-va">VIEW ALL</Link>
            </div>
            <div className="itc-sub-filters">
              {['All', 'Buy', 'Sell'].map((f) => (
                <button key={f} type="button" className={`itc-sf ${typeFilter === f ? 'on' : ''}`} onClick={() => setTypeFilter(f)}>{f}</button>
              ))}
              <span className="itc-sf-label">Party</span>
              <span data-task-target="capitol-party-filter" style={{ display: 'inline-flex', gap: 4 }}>
                <Link
                  href="/inside-the-capitol?party=republican"
                  className={`itc-sf ${activePartyFilter === 'republican' ? 'on' : ''}`}
                  onClick={() => completeTask('capitol_2')}
                >
                  R
                </Link>
                <Link
                  href="/inside-the-capitol?party=democrat"
                  className={`itc-sf ${activePartyFilter === 'democrat' ? 'on' : ''}`}
                  onClick={() => completeTask('capitol_2')}
                >
                  D
                </Link>
              </span>
              {(activePartyFilter || activeStateFilter) && (
                <Link href="/inside-the-capitol" className="itc-filter-clear">
                  <span className="itc-filter-tag">{activePartyFilter ? activePartyFilter.charAt(0).toUpperCase() + activePartyFilter.slice(1) : ''}{activePartyFilter && activeStateFilter ? ' · ' : ''}{activeStateFilter ? activeStateFilter.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : ''}</span>
                  <i className="bi bi-x" />
                </Link>
              )}
            </div>
            <div className="itc-body">
              {tradesLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#8b949e', fontSize: '0.85rem' }}>
                  Loading latest trades...
                </div>
              ) : trades.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#8b949e', fontSize: '0.85rem' }}>
                  No trades found.
                </div>
              ) : (
                trades.slice(0, 20).map((t, ti) => (
                  <div key={t.id} className="itc-tr">
                    <div className="itc-tr-type-col">
                      <span className={`itc-tr-type ${(t.type || '').toLowerCase()}`}>{t.type}</span>
                      <span className="itc-tr-date">{t.date}</span>
                    </div>
                    <div className="itc-tr-co">
                      <span className="itc-tr-co-name">{t.company}</span>
                      <Link
                        href={`/company-research?q=${encodeURIComponent(t.ticker)}`}
                        className="itc-tr-co-exch"
                        onClick={() => completeTask('capitol_3')}
                        data-task-target={ti === 0 ? 'capitol-stock-ticker' : undefined}
                      >
                        {t.exchange}
                      </Link>
                    </div>
                    <Link
                      href={`/inside-the-capitol/${slugify(t.member)}`}
                      className="itc-tr-mem"
                      onClick={() => completeTask('capitol_1')}
                      data-task-target={ti === 0 ? 'capitol-politician-name' : undefined}
                    >
                      <span className="itc-tr-mem-name">{t.member}</span>
                      <span className="itc-tr-mem-meta"><span className={`itc-dot ${t.party.toLowerCase()}`} />{t.party} | {t.chamber} | {t.state || '—'}</span>
                    </Link>
                    <div className="itc-tr-right">
                      <span className="itc-tr-amt">{t.amount}</span>
                      {t.link && (
                        <a
                          href={t.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="itc-tr-link"
                          title="View disclosure"
                          style={{ color: '#10b981', fontSize: '0.7rem', marginLeft: 6 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <i className="bi bi-box-arrow-up-right" />
                        </a>
                      )}
                      {t.flagged && <span className="itc-tr-flag"><i className="bi bi-flag-fill" /></span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </PinnableCard>

        <PinnableCard cardId="itc-sectors" title="Sector Activity" sourcePage="/inside-the-capitol" sourceLabel="Inside The Capitol" defaultW={2} defaultH={2} className="itc-pinnable-fill">
          <div className="itc-card">
            <div className="itc-hdr"><h3>SECTOR ACTIVITY</h3></div>
            <div className="itc-body itc-body-pad">
              {tradesLoading ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#8b949e', fontSize: '0.82rem' }}>Loading sectors...</div>
              ) : (
                sectorData.map((s) => (
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
                ))
              )}
            </div>
          </div>
        </PinnableCard>
      </div>

      {/* Row 4: Politicians I'm Following — full width */}
      <PinnableCard cardId="itc-featured-politicians" title={"Politicians I'm Following"} sourcePage="/inside-the-capitol" sourceLabel="Inside The Capitol" defaultW={4} defaultH={3} className="itc-pinnable-fill">
        <div className="itc-card">
          <div className="itc-hdr">
            <h3>POLITICIANS I&apos;M FOLLOWING</h3>
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
                <Link href={`/inside-the-capitol/${slugify(pol.name)}`} className={`itc-avatar-lg ${pol.party.toLowerCase()}`} onClick={() => completeTask('capitol_1')}>{pol.initials}</Link>
                <div>
                  <Link href={`/inside-the-capitol/${slugify(pol.name)}`} className="itc-pol-name" onClick={() => completeTask('capitol_1')}>{pol.name}</Link>
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

      {/* Row 5: Unusual volume · Bipartisan trades · Earnings watch */}
      <div className="itc-grid-3">
        <PinnableCard cardId="itc-unusual-volume" title="Unusual Trading Volume" sourcePage="/inside-the-capitol" sourceLabel="Inside The Capitol" defaultW={2} defaultH={2} className="itc-pinnable-fill">
          <div className="itc-new-card">
            <h3 className="itc-new-card-title">Unusual Trading Volume</h3>
            <p className="itc-new-card-sub">Politicians with significantly higher-than-normal trading activity this week</p>
            <div className="itc-new-card-list">
              {UNUSUAL_VOLUME.map((u) => (
                <div key={u.slug} className="itc-unusual-row">
                  <Link href={`/inside-the-capitol/${u.slug}`} className="itc-unusual-avatar-link" aria-label={u.name}>
                    <span className={`itc-avatar-sm ${u.party.toLowerCase()}`}>{u.initials}</span>
                  </Link>
                  <div className="itc-unusual-body">
                    <Link href={`/inside-the-capitol/${u.slug}`} className="itc-unusual-name">{u.name}</Link>
                    <p className="itc-unusual-meta">
                      {u.tradesWeek} trades this week (avg: {u.avgWeek}/week) · {u.total} total
                    </p>
                    <p className="itc-unusual-stocks">
                      Top stocks:{' '}
                      {u.top.map((tk, i) => (
                        <span key={tk}>
                          {i > 0 ? ', ' : ''}
                          <Link href={`/company-research?ticker=${tk}`} className="itc-unusual-tk">{tk}</Link>
                        </span>
                      ))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PinnableCard>

        <PinnableCard cardId="itc-bipartisan-trades" title="Bipartisan Trades" sourcePage="/inside-the-capitol" sourceLabel="Inside The Capitol" defaultW={2} defaultH={2} className="itc-pinnable-fill">
          <div className="itc-new-card">
            <h3 className="itc-new-card-title">Bipartisan Trades</h3>
            <p className="itc-new-card-sub">Stocks being bought by both parties this month</p>
            <div className="itc-new-card-list">
              {BIPARTISAN_TRADES.map((b) => (
                <div key={b.ticker} className="itc-bipart-row">
                  <div className="itc-bipart-hdr">
                    <Link href={`/company-research?ticker=${b.ticker}`} className="itc-bipart-tk">{b.ticker}</Link>
                    <span className="itc-bipart-co"> — {b.name}</span>
                  </div>
                  <p className="itc-bipart-meta">
                    <span className="itc-bipart-party dem"><span className="itc-bip-dot dem" aria-hidden />{b.dems} Democrats bought</span>
                    <span className="itc-bipart-sep"> · </span>
                    <span className="itc-bipart-party rep"><span className="itc-bip-dot rep" aria-hidden />{b.reps} Republicans bought</span>
                    <span className="itc-bipart-sep"> · </span>
                    <span className="itc-bipart-total">Total: {b.total}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </PinnableCard>

        <PinnableCard cardId="itc-earnings-watch" title="Upcoming Earnings Watch" sourcePage="/inside-the-capitol" sourceLabel="Inside The Capitol" defaultW={2} defaultH={2} className="itc-pinnable-fill">
          <div className="itc-new-card">
            <h3 className="itc-new-card-title">Upcoming Earnings Watch</h3>
            <p className="itc-new-card-sub">Companies with congressional trades ahead of earnings</p>
            <div className="itc-new-card-list">
              {EARNINGS_WATCH.map((e) => (
                <div key={e.ticker} className="itc-earn-row">
                  <div className="itc-earn-hdr">
                    <Link href={`/company-research?ticker=${e.ticker}`} className="itc-earn-tk">{e.ticker}</Link>
                    <span className="itc-earn-date"> — Earnings: {e.earnDate}</span>
                  </div>
                  <p className="itc-earn-line">
                    <Link href={`/inside-the-capitol/${e.slug}`}>{e.member}</Link>
                    {' '}
                    {e.side}
                    {' '}
                    {e.range}
                    {' '}
                    ({e.when})
                  </p>
                  <p className="itc-earn-warn">
                    <i className="bi bi-exclamation-triangle-fill" aria-hidden />
                    {' '}
                    {e.warn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </PinnableCard>
      </div>

      <CoursePreviewSection
        title="Political Trading Analysis"
        subtitle="Learn to analyze and track congressional trading patterns"
        courses={capitolCourses}
        viewAllHref="/learning-center?track=stocks"
      />
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
