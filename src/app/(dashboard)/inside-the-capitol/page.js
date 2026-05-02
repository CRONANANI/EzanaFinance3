'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PinnableCard } from '@/components/ui/PinnableCard';
import { useChecklist } from '@/hooks/useChecklist';
import { CoursePreviewSection } from '@/components/learning/CoursePreviewSection';
import { getCoursesByTrack } from '@/lib/learning-curriculum';
import { TopPerformingPoliticiansCard } from '@/components/capitol/TopPerformingPoliticiansCard';

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

/**
 * Parse Quiver's Trade_Size_USD range string into a midpoint number.
 */
function parseTradeSizeMidpoint(raw) {
  if (!raw || typeof raw !== 'string') return 0;
  const cleaned = raw.replace(/\$/g, '').replace(/,/g, '').trim();
  const plusMatch = cleaned.match(/^(\d+)\s*\+$/);
  if (plusMatch) return Number(plusMatch[1]);
  const rangeMatch = cleaned.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    const lo = Number(rangeMatch[1]);
    const hi = Number(rangeMatch[2]);
    return Math.round((lo + hi) / 2);
  }
  const single = Number(cleaned);
  return Number.isFinite(single) ? single : 0;
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

/**
 * Normalize a Quiver congress trade into the shape the Inside the Capitol page expects.
 * Downstream (Latest Trades, sector stats) rely on these field names.
 */
function normalizeTrade(t, _chamberFallback, idx = 0) {
  const name = t.Name || 'Unknown';
  const rawType = (t.Transaction || '').toString();
  const lower = rawType.toLowerCase();
  const isSell =
    lower.includes('sale') || lower.includes('sold') || lower.includes('disposal');
  const isBuy =
    lower.includes('purchase') || lower.includes('buy') || lower.includes('bought');

  const sym = (t.Ticker || '').toString().toUpperCase();
  const rawDate = t.Traded || t.Filed || null;

  const partyRaw = (t.Party || '').toString().trim();
  let party = 'Unknown';
  if (/^r(ep)?/i.test(partyRaw) || partyRaw === 'R') party = 'Republican';
  else if (/^d(em)?/i.test(partyRaw) || partyRaw === 'D') party = 'Democrat';
  else if (/^i(nd)?/i.test(partyRaw) || partyRaw === 'I') party = 'Independent';

  const chamber = t.Chamber === 'Senate' ? 'Senate' : 'House';

  let state = (t.State || '').toString().toUpperCase().slice(0, 2);
  if (!state && t.District) {
    const m = String(t.District).match(/\b([A-Z]{2})\b/);
    if (m) state = m[1];
  }

  const amountNum = parseTradeSizeMidpoint(t.Trade_Size_USD);
  const amountDisplay = t.Trade_Size_USD || '—';

  const excessReturn =
    t.excess_return != null && t.excess_return !== ''
      ? (() => {
          const n = parseFloat(String(t.excess_return));
          return Number.isFinite(n) ? n : null;
        })()
      : null;

  const type = isSell ? 'SELL' : isBuy ? 'BUY' : 'BUY';

  return {
    id: `${chamber}-${sym}-${rawDate || idx}-${name}-${idx}`,
    type,
    ticker: sym,
    company: t.Company || sym || '—',
    exchange: sym ? `${sym}:US` : '—',
    member: name,
    party,
    chamber,
    state,
    amount: amountDisplay,
    date: relDate(rawDate),
    flagged: false,
    link: '',
    rawDate,
    bioGuideId: t.BioGuideID || null,
    amountNum,
    excessReturn,
  };
}

function parseLobbyingAmount(raw) {
  if (raw == null || raw === '') return 0;
  if (typeof raw === 'number') return raw;
  const s = String(raw).trim();
  const suffixMatch = s.match(/^\$?([\d.]+)\s*([KMB])$/i);
  if (suffixMatch) {
    const n = Number(suffixMatch[1]);
    const mult = { K: 1e3, M: 1e6, B: 1e9 }[suffixMatch[2].toUpperCase()];
    return Number.isFinite(n) ? n * mult : 0;
  }
  const cleaned = s.replace(/[$,]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatCompactUSD(n) {
  if (!Number.isFinite(n) || n === 0) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function formatShortDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Map `politician_annual_performance` row to the featured-politician card shape. */
function mapTopPerformerToFeatured(p, idx) {
  const name = p.politician_name || 'Unknown';
  const parts = name.split(/\s+/).filter(Boolean);
  const initials =
    parts.map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const partyRaw = String(p.party || '').toLowerCase();
  let party = 'Independent';
  if (partyRaw.includes('dem') || partyRaw === 'd') party = 'Democrat';
  else if (partyRaw.includes('rep') || partyRaw === 'r') party = 'Republican';
  const ch = String(p.chamber || '').toLowerCase();
  const chamber = ch === 'senate' ? 'Senate' : 'House';
  const volN = Number(p.total_volume_estimated);
  const volume = formatCompactUSD(volN);
  let seed = 0;
  const pid = String(p.politician_id ?? idx);
  for (let i = 0; i < pid.length; i += 1) {
    seed = Math.imul(31, seed) + pid.charCodeAt(i);
  }
  seed = Math.abs(seed) % 17;
  return {
    id: p.politician_id || String(idx),
    name,
    party,
    chamber,
    state: '—',
    initials,
    trades: p.num_trades ?? 0,
    filings: '—',
    issuers: '—',
    volume,
    seed,
  };
}

/* STAT_CARDS — values are filled dynamically from fetched data */
const STAT_CARDS_BASE = [
  { id: 'trades', icon: 'bi-arrow-left-right', label: 'Total Trades', color: '#10b981' },
  { id: 'volume', icon: 'bi-cash-stack', label: 'Total Volume', color: '#3b82f6' },
  { id: 'traders', icon: 'bi-people', label: 'Active Traders', color: '#a78bfa' },
  { id: 'alerts', icon: 'bi-bell', label: 'New Alerts', color: '#fbbf24' },
];

/* Politician Performance Chart now lives in
   src/components/capitol/TopPerformingPoliticiansCard.jsx and is driven by
   precomputed real P&L estimates from politician_annual_performance. The old
   in-file SVG line chart + seed-data endpoint (/api/fmp/performance) have
   been replaced. */

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
  const [selectedYear, setSelectedYear] = useState(null);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [lobbyingData, setLobbyingData] = useState([]);
  const [lobbyingLoading, setLobbyingLoading] = useState(true);
  const [sec13fData, setSec13fData] = useState([]);
  const [sec13fLoading, setSec13fLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    trades: { value: '—', change: 'Loading...', changeType: 'neutral' },
    volume: { value: '—', change: 'Loading...', changeType: 'neutral' },
    traders: { value: '—', change: 'of 535 members', changeType: 'neutral' },
    alerts: { value: '—', change: 'Last 24 hours', changeType: 'neutral' },
  });
  const [featuredPoliticians, setFeaturedPoliticians] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [unusualVolume, setUnusualVolume] = useState([]);
  const [bipartisanTrades, setBipartisanTrades] = useState([]);
  const [earningsWatch, setEarningsWatch] = useState([]);
  const [insightLoading, setInsightLoading] = useState(true);

  useEffect(() => {
    async function fetchTrades() {
      setTradesLoading(true);
      try {
        const res = await fetch('/api/quiver/congress-trades');
        if (!res.ok) {
          console.error('[inside-the-capitol] congress-trades HTTP', res.status);
          setLatestTrades([]);
          setStatsData({
            trades: { value: '—', change: 'Could not load', changeType: 'neutral' },
            volume: { value: '—', change: '—', changeType: 'neutral' },
            traders: { value: '—', change: '—', changeType: 'neutral' },
            alerts: { value: '—', change: '—', changeType: 'neutral' },
          });
          return;
        }

        const parsed = await res.json();
        const arr = Array.isArray(parsed) ? parsed : [];

        const normalized = arr.map((t, i) => normalizeTrade(t, null, i));
        const all = normalized.sort(
          (a, b) => new Date(b.rawDate || 0) - new Date(a.rawDate || 0)
        );

        setLatestTrades(all);

        const total = all.length;
        const thisWeek = all.filter((t) => {
          const d = new Date(t.rawDate);
          return !Number.isNaN(d.getTime()) && Date.now() - d.getTime() < 7 * 86400000;
        }).length;

        const last24h = all.filter((t) => {
          const d = new Date(t.rawDate);
          return !Number.isNaN(d.getTime()) && Date.now() - d.getTime() < 86400000;
        }).length;

        const uniqueMembers = new Set(all.map((t) => t.member)).size;

        const totalVolume = all.reduce((sum, t) => sum + (t.amountNum || 0), 0);
        const volumeDisplay =
          totalVolume >= 1_000_000_000
            ? `$${(totalVolume / 1_000_000_000).toFixed(1)}B`
            : totalVolume >= 1_000_000
              ? `$${(totalVolume / 1_000_000).toFixed(1)}M`
              : totalVolume >= 1_000
                ? `$${(totalVolume / 1_000).toFixed(0)}K`
                : `$${totalVolume.toFixed(0)}`;

        setStatsData({
          trades: {
            value: total.toLocaleString(),
            change: `+${thisWeek} this week`,
            changeType: 'positive',
          },
          volume: {
            value: volumeDisplay,
            change: 'Est. from disclosed ranges',
            changeType: 'neutral',
          },
          traders: {
            value: uniqueMembers.toLocaleString(),
            change: 'of 535 members',
            changeType: 'neutral',
          },
          alerts: {
            value: last24h.toLocaleString(),
            change: 'Last 24 hours',
            changeType: last24h > 0 ? 'positive' : 'neutral',
          },
        });
      } catch (err) {
        console.error('[inside-the-capitol] fetchTrades failed:', err);
        setLatestTrades([]);
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/quiver/lobbying');
        const data = res.ok ? await res.json() : [];
        if (cancelled) return;
        const arr = Array.isArray(data) ? data : [];
        arr.sort((a, b) => new Date(b.Date || 0) - new Date(a.Date || 0));
        setLobbyingData(arr.slice(0, 25));
      } catch (err) {
        console.error('[lobbying] fetch failed:', err);
        if (!cancelled) setLobbyingData([]);
      } finally {
        if (!cancelled) setLobbyingLoading(false);
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
        const res = await fetch('/api/quiver/sec13f');
        const data = res.ok ? await res.json() : [];
        if (cancelled) return;
        const arr = Array.isArray(data) ? data : [];
        arr.sort((a, b) => {
          const dateDiff = new Date(b.Date || 0) - new Date(a.Date || 0);
          if (dateDiff !== 0) return dateDiff;
          return (Number(b.Value) || 0) - (Number(a.Value) || 0);
        });
        setSec13fData(arr.slice(0, 25));
      } catch (err) {
        console.error('[sec13f] fetch failed:', err);
        if (!cancelled) setSec13fData([]);
      } finally {
        if (!cancelled) setSec13fLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const year = new Date().getFullYear();
    (async () => {
      setFeaturedLoading(true);
      setInsightLoading(true);
      try {
        const [perfRes, biRes, unRes, ewRes] = await Promise.all([
          fetch(`/api/politicians/top-performers?year=${year}&limit=4`),
          fetch('/api/inside-capitol/bipartisan-trades?limit=4'),
          fetch('/api/inside-capitol/unusual-volume?limit=3'),
          fetch('/api/inside-capitol/earnings-watch?limit=3'),
        ]);
        const perfJson = perfRes.ok ? await perfRes.json() : {};
        const biJson = biRes.ok ? await biRes.json() : {};
        const unJson = unRes.ok ? await unRes.json() : {};
        const ewJson = ewRes.ok ? await ewRes.json() : {};
        if (cancelled) return;
        if (!perfJson.error && Array.isArray(perfJson.performers)) {
          setFeaturedPoliticians(perfJson.performers.map(mapTopPerformerToFeatured));
        } else {
          setFeaturedPoliticians([]);
        }
        setBipartisanTrades(Array.isArray(biJson.trades) ? biJson.trades : []);
        setUnusualVolume(Array.isArray(unJson.unusual) ? unJson.unusual : []);
        setEarningsWatch(Array.isArray(ewJson.alerts) ? ewJson.alerts : []);
      } catch {
        if (!cancelled) {
          setFeaturedPoliticians([]);
          setBipartisanTrades([]);
          setUnusualVolume([]);
          setEarningsWatch([]);
        }
      } finally {
        if (!cancelled) {
          setFeaturedLoading(false);
          setInsightLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set();
    for (const trade of latestTrades) {
      const d = trade.rawDate ? new Date(trade.rawDate) : null;
      const y = d && !Number.isNaN(d.getTime()) ? d.getFullYear() : null;
      if (y && y >= 2000 && y <= 2100) years.add(y);
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [latestTrades]);

  const sectorData = useMemo(() => {
    if (tradesLoading) return [];
    if (latestTrades.length === 0) return [];

    const effectiveYear = selectedYear ?? availableYears[0] ?? null;
    if (effectiveYear == null) return [];

    const sectorMap = {};
    for (const trade of latestTrades) {
      const d = trade.rawDate ? new Date(trade.rawDate) : null;
      const y = d && !Number.isNaN(d.getTime()) ? d.getFullYear() : null;
      if (y !== effectiveYear) continue;

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

    return derived;
  }, [latestTrades, tradesLoading, selectedYear, availableYears]);

  useEffect(() => {
    if (selectedYear === null && availableYears.length > 0) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

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

  useEffect(() => {
    if (featuredPoliticians.length === 0) {
      setActivePolIdx(0);
      return;
    }
    setActivePolIdx((i) => Math.min(i, featuredPoliticians.length - 1));
  }, [featuredPoliticians.length]);

  const pol = featuredPoliticians[activePolIdx];

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

      {/* Row 2: Top Performing Politicians — full width.
          Driven by the precomputed politician_annual_performance table
          (weekly cron refresh + manual backfill). See
          src/components/capitol/TopPerformingPoliticiansCard.jsx and
          /api/politicians/top-performers. */}
      <PinnableCard cardId="itc-top-performers" title="Top Performing Politicians" sourcePage="/inside-the-capitol" sourceLabel="Inside The Capitol" defaultW={4} defaultH={3} className="itc-pinnable-fill">
        <div className="itc-card">
          <TopPerformingPoliticiansCard
            onOpenPolitician={() => completeTask('capitol_1')}
          />
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

        <PinnableCard cardId="itc-sectors" title="Sector Activity on the Year" sourcePage="/inside-the-capitol" sourceLabel="Inside The Capitol" defaultW={2} defaultH={2} className="itc-pinnable-fill">
          <div className="itc-card">
            <div className="itc-hdr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <h3>SECTOR ACTIVITY ON THE YEAR</h3>
              {availableYears.length > 0 && (
                <select
                  value={selectedYear ?? availableYears[0] ?? ''}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="itc-year-select"
                  aria-label="Select year"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="itc-body itc-body-pad">
              {tradesLoading ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#8b949e', fontSize: '0.82rem' }}>Loading sectors...</div>
              ) : sectorData.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#8b949e', fontSize: '0.82rem' }}>
                  No sector activity for {selectedYear ?? availableYears[0] ?? 'this year'}.
                </div>
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
            {featuredLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#8b949e', fontSize: '0.85rem' }}>
                Loading…
              </div>
            ) : featuredPoliticians.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#8b949e', fontSize: '0.85rem' }}>
                No top performer data for {new Date().getFullYear()} yet.
              </div>
            ) : (
              <>
                <div className="itc-pol-tabs">
                  {featuredPoliticians.map((p, i) => (
                    <button key={p.id} type="button" className={`itc-pol-tab ${activePolIdx === i ? 'on' : ''}`} onClick={() => setActivePolIdx(i)}>
                      <span className={`itc-avatar-sm ${p.party.toLowerCase()}`}>{p.initials}</span>
                      <span className="itc-pol-tab-name">{p.name.split(' ').pop()}</span>
                    </button>
                  ))}
                </div>
                {pol ? (
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
                ) : null}
              </>
            )}
          </div>
        </div>
      </PinnableCard>

      {/* Row 4.5: Lobbying Activity + Recent 13F Filings */}
      <div className="itc-row-trades-sector">
        <PinnableCard
          cardId="itc-lobbying"
          title="Lobbying Activity"
          sourcePage="/inside-the-capitol"
          sourceLabel="Inside The Capitol"
          defaultW={2}
          defaultH={2}
          className="itc-pinnable-fill"
        >
          <div className="itc-card">
            <div className="itc-hdr">
              <h3>LOBBYING ACTIVITY</h3>
            </div>
            <div className="itc-body itc-body-pad">
              {lobbyingLoading ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#8b949e', fontSize: '0.82rem' }}>
                  Loading lobbying data…
                </div>
              ) : lobbyingData.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#8b949e', fontSize: '0.82rem' }}>
                  No recent lobbying disclosures available.
                </div>
              ) : (
                lobbyingData.map((l, i) => {
                  const amt = parseLobbyingAmount(l.Amount);
                  return (
                    <div key={`${l.Client}-${l.Registrant}-${l.Date}-${i}`} className="itc-lob-row">
                      <div className="itc-lob-left">
                        <span className="itc-lob-client">{l.Client || '—'}</span>
                        <span className="itc-lob-meta">
                          via {l.Registrant || 'Unknown'} · {l.Issue || l.Specific_Issue || 'General'}
                        </span>
                      </div>
                      <div className="itc-lob-right">
                        <span className="itc-lob-amount">{formatCompactUSD(amt)}</span>
                        <span className="itc-lob-date">{formatShortDate(l.Date)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </PinnableCard>

        <PinnableCard
          cardId="itc-sec13f"
          title="Recent 13F Filings"
          sourcePage="/inside-the-capitol"
          sourceLabel="Inside The Capitol"
          defaultW={2}
          defaultH={2}
          className="itc-pinnable-fill"
        >
          <div className="itc-card">
            <div className="itc-hdr">
              <h3>RECENT 13F FILINGS</h3>
            </div>
            <div className="itc-body itc-body-pad">
              {sec13fLoading ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#8b949e', fontSize: '0.82rem' }}>
                  Loading 13F filings…
                </div>
              ) : sec13fData.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#8b949e', fontSize: '0.82rem' }}>
                  No recent 13F filings available.
                </div>
              ) : (
                sec13fData.map((f, i) => {
                  const value = Number(f.Value) || 0;
                  const fundName = f.Name || f.Fund || 'Unknown Fund';
                  return (
                    <div key={`${fundName}-${f.Ticker}-${f.Date}-${i}`} className="itc-13f-row">
                      <div className="itc-13f-left">
                        <span className="itc-13f-fund">{fundName}</span>
                        <span className="itc-13f-meta">
                          <span className="itc-13f-ticker">{f.Ticker || '—'}</span>
                          {f.ReportPeriod && ` · ${formatShortDate(f.ReportPeriod)}`}
                        </span>
                      </div>
                      <div className="itc-13f-right">
                        <span className="itc-13f-value">{formatCompactUSD(value)}</span>
                        <span className="itc-13f-filed">Filed {formatShortDate(f.Date)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </PinnableCard>
      </div>

      {/* Row 5: Unusual volume · Bipartisan trades · Earnings watch */}
      <div className="itc-grid-3">
        <PinnableCard cardId="itc-unusual-volume" title="Unusual Trading Volume" sourcePage="/inside-the-capitol" sourceLabel="Inside The Capitol" defaultW={2} defaultH={2} className="itc-pinnable-fill">
          <div className="itc-new-card">
            <h3 className="itc-new-card-title">Unusual Trading Volume</h3>
            <p className="itc-new-card-sub">Politicians with significantly higher-than-normal trading activity this week</p>
            <div className="itc-new-card-list">
              {insightLoading ? (
                <p style={{ padding: '0.75rem 0', margin: 0, color: '#8b949e', fontSize: '0.85rem' }}>Loading…</p>
              ) : unusualVolume.length === 0 ? (
                <p style={{ padding: '0.75rem 0', margin: 0, color: '#8b949e', fontSize: '0.85rem' }}>No unusual activity detected from recent disclosures.</p>
              ) : (
                unusualVolume.map((u) => (
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
                      {(u.top || []).map((tk, i) => (
                        <span key={tk}>
                          {i > 0 ? ', ' : ''}
                          <Link href={`/company-research?ticker=${tk}`} className="itc-unusual-tk">{tk}</Link>
                        </span>
                      ))}
                    </p>
                  </div>
                </div>
                ))
              )}
            </div>
          </div>
        </PinnableCard>

        <PinnableCard cardId="itc-bipartisan-trades" title="Bipartisan Trades" sourcePage="/inside-the-capitol" sourceLabel="Inside The Capitol" defaultW={2} defaultH={2} className="itc-pinnable-fill">
          <div className="itc-new-card">
            <h3 className="itc-new-card-title">Bipartisan Trades</h3>
            <p className="itc-new-card-sub">Stocks being bought by both parties this month</p>
            <div className="itc-new-card-list">
              {insightLoading ? (
                <p style={{ padding: '0.75rem 0', margin: 0, color: '#8b949e', fontSize: '0.85rem' }}>Loading…</p>
              ) : bipartisanTrades.length === 0 ? (
                <p style={{ padding: '0.75rem 0', margin: 0, color: '#8b949e', fontSize: '0.85rem' }}>No bipartisan buys in the last 30 days from recent disclosures.</p>
              ) : (
                bipartisanTrades.map((b) => (
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
                ))
              )}
            </div>
          </div>
        </PinnableCard>

        <PinnableCard cardId="itc-earnings-watch" title="Upcoming Earnings Watch" sourcePage="/inside-the-capitol" sourceLabel="Inside The Capitol" defaultW={2} defaultH={2} className="itc-pinnable-fill">
          <div className="itc-new-card">
            <h3 className="itc-new-card-title">Upcoming Earnings Watch</h3>
            <p className="itc-new-card-sub">Companies with congressional trades ahead of earnings</p>
            <div className="itc-new-card-list">
              {insightLoading ? (
                <p style={{ padding: '0.75rem 0', margin: 0, color: '#8b949e', fontSize: '0.85rem' }}>Loading…</p>
              ) : earningsWatch.length === 0 ? (
                <p style={{ padding: '0.75rem 0', margin: 0, color: '#8b949e', fontSize: '0.85rem' }}>No earnings-window trades matched recent filings.</p>
              ) : (
                earningsWatch.map((e, ei) => (
                <div key={`${e.ticker}-${e.member}-${ei}`} className="itc-earn-row">
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
                ))
              )}
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
