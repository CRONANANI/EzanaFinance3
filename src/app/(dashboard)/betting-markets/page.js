'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
// NOTE: These components don't exist and cause Vercel build failures
// import { PinnableCard } from '@/components/ui/PinnableCard';
// import { CoursePreviewSection } from '@/components/learning/CoursePreviewSection';
// import { getCoursesByTrack } from '@/lib/learning-curriculum';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/pages/home-dashboard.css';
import '../../../../app-legacy/components/learning/learning-opportunities.css';
import './betting-markets.css';
import TraderProfileModal from '@/components/polymarket/TraderProfileModal';

const SPORT_TABS = ['NFL', 'NBA', 'NHL', 'MLB', 'Soccer'];

// Empty fallback — real games are fetched from /api/betting/live-games at
// runtime. The fallback exists so the page still has a defined source if
// the fetch is in flight or fails. Stat cards (live event count, active
// sports) are derived dynamically inside the component from `liveGames`.
const ODDS_DATA_FALLBACK = {};

const LEADER_ALL = [
  {
    rank: 1,
    name: 'Emma Wilson',
    slug: 'emma-wilson',
    pnl: '+$4,230',
    win: '72% win',
    tag: '🔥',
    partner: false,
  },
  {
    rank: 2,
    name: 'David Kim',
    slug: 'david-kim',
    pnl: '+$3,180',
    win: '68% win',
    tag: '',
    partner: false,
  },
  {
    rank: 3,
    name: 'Alex Chen',
    slug: 'alex-chen',
    pnl: '+$2,890',
    win: '71% win',
    tag: '',
    partner: true,
  },
  {
    rank: 4,
    name: 'Lisa Park',
    slug: 'lisa-park',
    pnl: '+$2,450',
    win: '65% win',
    tag: '',
    partner: false,
  },
  {
    rank: 5,
    name: 'Sarah Johnson',
    slug: 'sarah-johnson',
    pnl: '+$1,980',
    win: '63% win',
    tag: '',
    partner: false,
  },
  {
    rank: 6,
    name: 'Mike Torres',
    slug: 'mike-torres',
    pnl: '+$1,750',
    win: '67% win',
    tag: '✅',
    partner: true,
  },
  {
    rank: 7,
    name: 'James Wilson',
    slug: 'james-wilson',
    pnl: '+$1,420',
    win: '61% win',
    tag: '',
    partner: false,
  },
  {
    rank: 8,
    name: 'Maria Garcia',
    slug: 'maria-garcia',
    pnl: '+$1,180',
    win: '66% win',
    tag: '',
    partner: false,
  },
];

const LEADER_FRIENDS = LEADER_ALL.filter((_, i) => [0, 1, 3, 7].includes(i));
const LEADER_PARTNERS = LEADER_ALL.filter((r) => r.partner);

const EV_ITEMS = [
  {
    id: 'ev1',
    title: 'Lakers +3.5 vs Celtics',
    ev: '+4.2%',
    confidence: 'High',
    analysis: {
      headline: 'Lakers +3.5 vs Celtics',
      implied: '47.6%',
      model: '52.1%',
      edge: '+4.5%',
      evPer100: '+4.2%',
      confidence: 'HIGH',
      basedOn: 'Injury data, ATS trends, matchup history',
      math: [
        'Market odds imply Lakers cover 47.6% of the time.',
        'Our model estimates they cover 52.1%.',
        'This creates a +4.2% edge.',
      ],
      backstory: [
        'The Lakers are 8-2 ATS in their last 10 road games. Celtics are dealing with a key injury to their starting center.',
        'Historical ATS record in this matchup favors the underdog by 3.2 points.',
      ],
    },
  },
  {
    id: 'ev2',
    title: 'Warriors ML vs Bucks',
    ev: '+2.8%',
    confidence: 'Medium',
    analysis: {
      headline: 'Warriors ML vs Bucks',
      implied: '52.0%',
      model: '55.4%',
      edge: '+3.4%',
      evPer100: '+2.8%',
      confidence: 'MEDIUM',
      basedOn: 'Rest advantage, home court, injury report',
      math: [
        'Market prices Warriors win at 52% implied.',
        'Our model: 55.4% after pace and defense adjustments.',
      ],
      backstory: [
        'Bucks on a back-to-back; Warriors defense ranks top-5 in rim protection over the last 10.',
      ],
    },
  },
  {
    id: 'ev3',
    title: 'Canadiens +1.5 vs Bruins',
    ev: '+6.1%',
    confidence: 'High',
    analysis: {
      headline: 'Canadiens +1.5 vs Bruins',
      implied: '44.2%',
      model: '51.8%',
      edge: '+7.6%',
      evPer100: '+6.1%',
      confidence: 'HIGH',
      basedOn: 'Goalie matchup, 5v5 expected goals',
      math: ['Puck-line mispriced vs our simulation after goalie confirmation.'],
      backstory: ['Montreal has covered +1.5 in 7 of last 10 as a road dog.'],
    },
  },
  {
    id: 'ev4',
    title: 'Over 224.5 Lakers/Celtics',
    ev: '+1.9%',
    confidence: 'Low',
    analysis: {
      headline: 'Over 224.5 Lakers/Celtics',
      implied: '49.0%',
      model: '51.2%',
      edge: '+2.2%',
      evPer100: '+1.9%',
      confidence: 'LOW',
      basedOn: 'Pace projection only — thin edge',
      math: ['Both teams top-8 in pace; total still shaded low vs model.'],
      backstory: ['Watch late injury scratches before lock — variance is high.'],
    },
  },
];

const LINE_MOVES = [
  {
    id: 'lm1',
    title: 'Lakers vs Celtics — Spread',
    opened: 'LAL +4.5',
    current: 'LAL +3.5',
    move: '-1.0',
    kind: 'spread',
    reverse: false,
  },
  {
    id: 'lm2',
    title: 'Warriors vs Bucks — Total',
    opened: '228.5',
    current: '231',
    move: '+2.5',
    kind: 'total',
    reverse: true,
  },
];

function seedPts(s, n = 24) {
  let v = 50;
  const out = [];
  for (let i = 0; i < n; i++) {
    v += Math.sin(i * 0.4 + s) * 8 + (s % 7) * 0.5;
    v = Math.max(15, Math.min(85, v));
    out.push(v);
  }
  return out;
}

function MiniLineChart({ seed, up = true }) {
  const pts = useMemo(() => seedPts(seed), [seed]);
  const w = 400;
  const h = 48;
  const line = useMemo(() => {
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const r = max - min || 1;
    return pts
      .map((p, i) => {
        const x = (i / (pts.length - 1)) * w;
        const y = 4 + (h - 8) * (1 - (p - min) / r);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [pts, w, h]);
  const col = up ? '#10b981' : '#ef4444';
  return (
    <div className="bm-mini-chart">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <path d={line} fill="none" stroke={col} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function parseYesProb(m) {
  let raw = m.outcomePrices;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }
  if (Array.isArray(raw) && raw.length > 0) {
    const v = parseFloat(raw[0]);
    return Number.isFinite(v) ? v * 100 : null;
  }
  if (typeof m.yes === 'number') return m.yes * 100;
  if (typeof m.probability === 'number') return m.probability * 100;
  return null;
}

function chipStyle(isActive) {
  return {
    padding: '0.25rem 0.6rem',
    fontSize: '0.65rem',
    fontWeight: 700,
    borderRadius: 5,
    border: isActive ? '1px solid #6366f1' : '1px solid rgba(0,0,0,0.08)',
    background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
    color: isActive ? '#6366f1' : '#6b7280',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontFamily: 'var(--font-sans)',
  };
}

function formatVolumeShort(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

const PM_TOP_MARKET_TAG_SLUGS = new Set([
  'politics',
  'crypto',
  'sports',
  'economics',
  'economy',
  'geopolitics',
  'international-affairs',
  'tech',
  'science',
]);

function PolymarketSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [markets, setMarkets] = useState([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [selectedTrader, setSelectedTrader] = useState(null);
  const [tags, setTags] = useState([]);
  const [activeTag, setActiveTag] = useState(null);

  useEffect(() => {
    fetch('/api/polymarket/tags')
      .then((r) => (r.ok ? r.json() : { tags: [] }))
      .then((d) => {
        const curated = (d.tags || []).filter((t) =>
          PM_TOP_MARKET_TAG_SLUGS.has(String(t.slug || '').toLowerCase()),
        );
        setTags(curated);
      })
      .catch(() => setTags([]));
  }, []);

  useEffect(() => {
    setMarketsLoading(true);
    const url = activeTag
      ? `/api/polymarket/markets?limit=6&tag=${encodeURIComponent(activeTag.slug)}`
      : '/api/polymarket/markets?limit=6';
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setMarkets(Array.isArray(d) ? d : d.markets || []))
      .catch(() => setMarkets([]))
      .finally(() => setMarketsLoading(false));
  }, [activeTag]);

  const handleSearch = useCallback(async (q) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/polymarket/user-search?q=${encodeURIComponent(q.trim())}`);
      const data = res.ok ? await res.json() : {};
      setSearchResults(data.profiles || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  return (
    <>
      <div className="db-card">
        <div className="db-card-header">
          <h3 style={{ color: 'var(--home-heading, #111827)' }}>
            <span style={{ color: '#6366f1', marginRight: 6 }}>◆</span> Polymarket — Top Markets
          </h3>
          <a
            href="https://polymarket.com"
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: '0.6875rem',
              color: '#6366f1',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            View All ↗
          </a>
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          {tags.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                padding: '0 0 0.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTag(null)}
                style={chipStyle(!activeTag)}
              >
                All
              </button>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  style={chipStyle(activeTag?.id === tag.id)}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          )}
          {marketsLoading && (
            <p style={{ color: 'var(--home-muted, #6b7280)', fontSize: '0.8125rem' }}>
              Loading markets…
            </p>
          )}
          {!marketsLoading && markets.length === 0 && (
            <p style={{ color: 'var(--home-muted, #6b7280)', fontSize: '0.8125rem' }}>
              No markets available. Check Polymarket API connectivity.
            </p>
          )}
          {markets.map((m, i) => {
            const yesProb = parseYesProb(m);
            const vol = m.volume
              ? `$${Number(m.volume).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
              : null;
            return (
              <div
                key={m.id || m.conditionId || i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0',
                  borderBottom: '1px solid rgba(99,102,241,0.06)',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background:
                      yesProb != null
                        ? yesProb > 60
                          ? '#10b981'
                          : yesProb > 40
                            ? '#f59e0b'
                            : '#ef4444'
                        : '#6b7280',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      color: 'var(--home-heading, #111827)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.question || m.title || 'Market'}
                  </p>
                  {vol && (
                    <p
                      style={{
                        color: 'var(--home-muted, #6b7280)',
                        fontSize: '0.6875rem',
                        margin: 0,
                      }}
                    >
                      Vol: {vol}
                    </p>
                  )}
                </div>
                {yesProb != null && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 800,
                        color: yesProb > 60 ? '#10b981' : yesProb > 40 ? '#f59e0b' : '#ef4444',
                      }}
                    >
                      {yesProb.toFixed(0)}%
                    </span>
                    <p
                      style={{
                        fontSize: '0.5625rem',
                        color: 'var(--home-muted, #6b7280)',
                        margin: 0,
                      }}
                    >
                      YES
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="db-card">
        <div className="db-card-header">
          <h3 style={{ color: 'var(--home-heading, #111827)' }}>Search Polymarket Traders</h3>
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              background: 'rgba(99,102,241,0.04)',
              border: '1px solid rgba(99,102,241,0.12)',
              borderRadius: '8px',
              padding: '0.45rem 0.75rem',
              marginBottom: '0.75rem',
            }}
          >
            <i className="bi bi-search" style={{ color: '#6b7280', fontSize: '0.8rem' }} />
            <input
              type="text"
              placeholder="Search by wallet address or username…"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--home-heading, #111827)',
                fontSize: '0.8125rem',
                width: '100%',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>
          {searching && (
            <p style={{ color: 'var(--home-muted, #6b7280)', fontSize: '0.75rem' }}>Searching…</p>
          )}
          {!searching && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
            <p style={{ color: 'var(--home-muted, #6b7280)', fontSize: '0.75rem' }}>
              No traders found.
            </p>
          )}
          {searchResults.map((u, i) => (
            <div
              key={u.proxyWallet || u.address || i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.6rem 0',
                borderBottom: '1px solid rgba(99,102,241,0.06)',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'rgba(99,102,241,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#6366f1',
                  flexShrink: 0,
                }}
              >
                {(u.name || u.username || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    color: 'var(--home-heading, #111827)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    margin: 0,
                  }}
                >
                  {u.name || u.username || 'Trader'}
                </p>
                <p
                  style={{
                    color: 'var(--home-muted, #6b7280)',
                    fontSize: '0.6875rem',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {(u.proxyWallet || u.address || '').slice(0, 14)}…
                </p>
              </div>
              {u.profitLoss != null && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    flexShrink: 0,
                    color: Number(u.profitLoss) >= 0 ? '#10b981' : '#ef4444',
                  }}
                >
                  {Number(u.profitLoss) >= 0 ? '+' : ''}$
                  {Math.abs(Number(u.profitLoss)).toLocaleString('en-US', {
                    maximumFractionDigits: 0,
                  })}
                </span>
              )}
              <button
                type="button"
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(99,102,241,0.25)',
                  background: 'rgba(99,102,241,0.06)',
                  color: '#6366f1',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                  fontFamily: 'var(--font-sans)',
                }}
                onClick={() =>
                  setSelectedTrader({
                    wallet: u.proxyWallet || u.address,
                    name: u.name || u.username,
                    image: u.profileImage,
                  })
                }
              >
                View
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedTrader && (
        <TraderProfileModal
          wallet={selectedTrader.wallet}
          displayName={selectedTrader.name}
          profileImage={selectedTrader.image}
          onClose={() => setSelectedTrader(null)}
        />
      )}
    </>
  );
}

function KalshiSection() {
  const [markets, setMarkets] = useState([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetch('/api/polygon/markets?source=kalshi&limit=6')
      .then((r) => (r.ok ? r.json() : { markets: [] }))
      .then((d) => setMarkets(d.markets || []))
      .catch(() => setMarkets([]))
      .finally(() => setMarketsLoading(false));
  }, []);

  const handleSearch = useCallback(async (q) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/polygon/markets?source=kalshi&search=${encodeURIComponent(q.trim())}&limit=20`,
      );
      const data = res.ok ? await res.json() : {};
      setSearchResults(data.markets || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  return (
    <>
      <div className="db-card">
        <div className="db-card-header">
          <h3 style={{ color: 'var(--home-heading, #111827)' }}>
            <span style={{ color: '#10b981', marginRight: 6 }}>◆</span> Kalshi — Top Markets
          </h3>
          <a
            href="https://kalshi.com"
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: '0.6875rem',
              color: '#10b981',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            View All ↗
          </a>
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          {marketsLoading && (
            <p style={{ color: 'var(--home-muted, #6b7280)', fontSize: '0.8125rem' }}>
              Loading markets…
            </p>
          )}
          {!marketsLoading && markets.length === 0 && (
            <p style={{ color: 'var(--home-muted, #6b7280)', fontSize: '0.8125rem' }}>
              No markets available. Configure Kalshi API connectivity or try again later.
            </p>
          )}
          {markets.map((m, i) => {
            const prob =
              typeof m.yes_bid === 'number'
                ? m.yes_bid * 100
                : typeof m.probability === 'number'
                  ? m.probability * 100
                  : null;
            const vol = m.volume
              ? `$${Number(m.volume).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
              : null;
            return (
              <div
                key={m.ticker || m.id || i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0',
                  borderBottom: '1px solid rgba(16,185,129,0.06)',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '2px',
                    flexShrink: 0,
                    background:
                      prob != null
                        ? prob > 60
                          ? '#10b981'
                          : prob > 40
                            ? '#f59e0b'
                            : '#ef4444'
                        : '#6b7280',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      color: 'var(--home-heading, #111827)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.title || m.question || m.ticker || 'Market'}
                  </p>
                  {vol && (
                    <p
                      style={{
                        color: 'var(--home-muted, #6b7280)',
                        fontSize: '0.6875rem',
                        margin: 0,
                      }}
                    >
                      Vol: {vol}
                    </p>
                  )}
                </div>
                {prob != null && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 800,
                        color: prob > 60 ? '#10b981' : prob > 40 ? '#f59e0b' : '#ef4444',
                      }}
                    >
                      {prob.toFixed(0)}%
                    </span>
                    <p
                      style={{
                        fontSize: '0.5625rem',
                        color: 'var(--home-muted, #6b7280)',
                        margin: 0,
                      }}
                    >
                      YES
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          <div
            style={{
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(16,185,129,0.06)',
            }}
          >
            <p
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--home-muted, #6b7280)',
                margin: '0 0 0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Search Kalshi Markets
            </p>
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                background: 'rgba(16,185,129,0.04)',
                border: '1px solid rgba(16,185,129,0.12)',
                borderRadius: '8px',
                padding: '0.45rem 0.75rem',
              }}
            >
              <i className="bi bi-search" style={{ color: '#6b7280', fontSize: '0.8rem' }} />
              <input
                type="text"
                placeholder="Search by keyword, ticker, or category…"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--home-heading, #111827)',
                  fontSize: '0.8125rem',
                  width: '100%',
                  fontFamily: 'var(--font-sans)',
                }}
              />
            </div>
            {searching && (
              <p
                style={{
                  color: 'var(--home-muted, #6b7280)',
                  fontSize: '0.75rem',
                  marginTop: '0.5rem',
                }}
              >
                Searching…
              </p>
            )}
            {!searching &&
              searchResults.length > 0 &&
              searchResults.map((mk, idx) => (
                <div
                  key={mk.ticker || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid rgba(16,185,129,0.04)',
                  }}
                >
                  <p
                    style={{
                      flex: 1,
                      color: 'var(--home-heading, #111827)',
                      fontSize: '0.8125rem',
                      margin: 0,
                    }}
                  >
                    {mk.title || mk.ticker}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function BettingMarketsPage() {
  const [platform, setPlatform] = useState('polymarket');
  const [sport, setSport] = useState('NBA');
  const [liveGames, setLiveGames] = useState({});
  const [gamesLoading, setGamesLoading] = useState(false);
  const [lbTab, setLbTab] = useState('All');
  const [evOpen, setEvOpen] = useState(null);
  const [polymarketLeaderboard, setPolymarketLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('WEEK');

  const closeModal = useCallback(() => setEvOpen(null), []);

  // Fetch today's real games for every supported league in parallel on
  // mount. The /api/betting/live-games route normalizes provider output
  // into { home, away, status, score, win_probability, local_start } and
  // returns [] when no upstream key is configured — the UI gracefully
  // renders an empty board in that case rather than stale mock data.
  useEffect(() => {
    let cancelled = false;
    setGamesLoading(true);

    const fetchAllLeagues = async () => {
      const leagues = ['NBA', 'MLB', 'NHL', 'NFL', 'Soccer'];
      const results = {};

      await Promise.all(
        leagues.map(async (league) => {
          try {
            const res = await fetch(`/api/betting/live-games?sport=${league}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.games && data.games.length > 0) {
              results[league] = [
                {
                  league: `${league} — Today`,
                  games: data.games
                    .filter(
                      (g) =>
                        g.status === 'scheduled' ||
                        g.status === 'inprogress' ||
                        g.status === 'closed',
                    )
                    .slice(0, 8)
                    .map((g) => ({
                      title: `${g.away} vs ${g.home}`,
                      time:
                        g.local_start?.replace(/^[A-Za-z]+ [A-Za-z]+ \d+, /, '') || g.start_time,
                      away: g.away,
                      home: g.home,
                      score: g.score
                        ? `${g.away} ${g.score[g.away]} - ${g.score[g.home]} ${g.home}`
                        : null,
                      status: g.status,
                      spreadAway: g.status === 'scheduled' ? 'TBD' : '',
                      spreadHome: g.status === 'scheduled' ? 'TBD' : '',
                      total:
                        g.status === 'closed' && g.score
                          ? `Final: ${g.score[g.away]}-${g.score[g.home]}`
                          : g.status === 'inprogress'
                            ? `Live: ${g.score?.[g.away] ?? 0}-${g.score?.[g.home] ?? 0}`
                            : 'Upcoming',
                      ml: g.win_probability
                        ? `Win Prob: ${g.away} ${(g.win_probability[g.away] ?? 50).toFixed(0)}% — ${g.home} ${(g.win_probability[g.home] ?? 50).toFixed(0)}%`
                        : g.score
                          ? `Final Score: ${g.score[g.away]} - ${g.score[g.home]}`
                          : '',
                    })),
                },
              ];
            }
          } catch (err) {
            console.warn(`[betting] Failed to fetch ${league}:`, err);
          }
        }),
      );

      if (!cancelled) {
        setLiveGames(results);
        setGamesLoading(false);
      }
    };

    fetchAllLeagues();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLeaderboardLoading(true);
    fetch(`/api/polymarket/builder-leaderboard?timePeriod=${leaderboardPeriod}&limit=15`)
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d) => {
        if (cancelled) return;
        setPolymarketLeaderboard(d.entries || []);
      })
      .catch(() => !cancelled && setPolymarketLeaderboard([]))
      .finally(() => !cancelled && setLeaderboardLoading(false));
    return () => {
      cancelled = true;
    };
  }, [leaderboardPeriod]);

  const leaderboardRows = useMemo(() => {
    if (lbTab === 'All') {
      return polymarketLeaderboard.map((e) => ({
        rank: e.rank,
        name: e.builder,
        slug: e.builder.toLowerCase().replace(/\s+/g, '-'),
        pnl: `$${formatVolumeShort(e.volume)}`,
        win: `${e.activeUsers} users`,
        tag: e.verified ? '✓' : '',
        partner: false,
        isReal: true,
      }));
    }
    let rows = LEADER_ALL;
    if (lbTab === 'Friends') rows = LEADER_FRIENDS;
    if (lbTab === 'Partners') rows = LEADER_PARTNERS;
    return rows.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [lbTab, polymarketLeaderboard]);

  // NOTE: Commented out - getCoursesByTrack not available
  // const bettingCourses = useMemo(() => getCoursesByTrack('betting').slice(0, 4), []);

  const oddsBlocks = liveGames[sport] || ODDS_DATA_FALLBACK[sport] || [];

  // Derive Live Events stat from real fetched data so the card reflects
  // today's actual game count and which leagues currently have action.
  const totalGames = Object.values(liveGames).reduce(
    (sum, blocks) => sum + blocks.reduce((s, b) => s + (b.games?.length || 0), 0),
    0,
  );
  const activeSports = Object.keys(liveGames)
    .filter((k) => liveGames[k]?.length > 0)
    .join(' ');

  const dynamicStats = [
    {
      id: 'live',
      icon: '🏈',
      label: 'Live Events',
      value: gamesLoading ? '...' : `${totalGames} today`,
      sub: activeSports || (gamesLoading ? 'Loading...' : 'No games scheduled'),
    },
    {
      id: 'vol',
      icon: '💰',
      label: 'Total Volume',
      value: '$4.2M today',
      sub: '▲ +12% vs yesterday',
      subTone: 'up',
    },
    {
      id: 'win',
      icon: '🎯',
      label: 'Your Win Rate',
      value: '68% (34/50)',
      sub: '▲ from 62%',
      subTone: 'up',
    },
    {
      id: 'ev',
      icon: '📊',
      label: 'EV Opportunities',
      value: '7 found today',
      sub: '3 high confidence',
    },
  ];

  const reverseCount = LINE_MOVES.filter((l) => l.reverse).length;

  return (
    <div className="bm-page dashboard-page-inset db-page">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '0.5rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.125rem',
              fontWeight: 800,
              color: 'var(--home-heading, #111827)',
              margin: 0,
            }}
          >
            Betting Markets
          </h1>
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--home-muted, #6b7280)',
              margin: '0.15rem 0 0',
            }}
          >
            Prediction markets, sports odds &amp; EV analysis
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '3px',
            background: 'rgba(212,175,55,0.06)',
            border: '1px solid rgba(212,175,55,0.15)',
            borderRadius: '10px',
            padding: '3px',
          }}
        >
          {[
            { id: 'polymarket', label: 'Polymarket' },
            { id: 'kalshi', label: 'Kalshi' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              style={{
                padding: '5px 16px',
                borderRadius: '7px',
                border: 'none',
                background: platform === p.id ? '#d4af37' : 'transparent',
                color: platform === p.id ? '#111' : 'var(--home-muted, #6b7280)',
                fontSize: '0.8125rem',
                fontWeight: platform === p.id ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bm-stat-row">
        {dynamicStats.map((s) => (
          <div key={s.id} className="bm-stat-card">
            <div className="bm-stat-top">
              <span className="bm-stat-label">
                <span aria-hidden>{s.icon}</span> {s.label}
              </span>
            </div>
            <div className="bm-stat-value">{s.value}</div>
            <div className={`bm-stat-sub ${s.subTone === 'up' ? 'bm-stat-delta up' : ''}`}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      <div cardId="betting-odds-board" className="db-card bm-odds-board">
        <div className="db-card-header">
          <h3>Live Sports Odds</h3>
          <button type="button" className="db-icon-btn" aria-label="Expand">
            <i className="bi bi-box-arrow-up-right" />
          </button>
        </div>
        <div style={{ padding: '0 1.25rem 1rem' }}>
          <div className="bm-odds-head">
            <h3
              style={{
                margin: 0,
                fontSize: '0.9375rem',
                fontWeight: 800,
                color: 'var(--home-heading, #111827)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span aria-hidden>🏈</span> Live Trending Sports Odds
            </h3>
            <div className="bm-sport-tabs" role="tablist" aria-label="Sport filter">
              {SPORT_TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={sport === t}
                  className={`bm-sport-tab ${sport === t ? 'on' : ''}`}
                  onClick={() => setSport(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="bm-odds-scroll">
            {oddsBlocks.map((block) => (
              <div key={block.league}>
                <div className="bm-league-hdr">{block.league}</div>
                {block.games.map((g) => (
                  <div key={`${g.away}-${g.home}-${g.time}`} className="bm-game">
                    <div className="bm-game-title">
                      <span>{g.title}</span>
                      <span
                        className={`bm-game-time ${g.status === 'inprogress' ? 'bm-game-live' : ''}`}
                      >
                        {g.status === 'inprogress'
                          ? '🔴 LIVE'
                          : g.status === 'closed'
                            ? 'Final'
                            : g.time}
                      </span>
                    </div>
                    <div className="bm-game-lines">{g.total}</div>
                    {g.ml && <div className="bm-game-ml">{g.ml}</div>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bm-two-col">
        <div cardId="betting-leaderboard" className="db-card">
          <div className="db-card-header">
            <h3>Leaderboard</h3>
            <button type="button" className="db-icon-btn" aria-label="Expand">
              <i className="bi bi-box-arrow-up-right" />
            </button>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 800,
                  color: 'var(--home-heading, #111827)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span aria-hidden>🏆</span> Rankings
              </span>
              <div className="bm-lb-tabs">
                {['All', 'Friends', 'Partners'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`bm-lb-tab ${lbTab === t ? 'on' : ''}`}
                    onClick={() => setLbTab(t)}
                    title={t === 'Partners' ? 'Partners & Creators' : undefined}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {lbTab === 'All' && (
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {['DAY', 'WEEK', 'MONTH', 'ALL'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setLeaderboardPeriod(p)}
                    style={{
                      padding: '3px 9px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      borderRadius: 5,
                      border:
                        leaderboardPeriod === p
                          ? '1px solid #6366f1'
                          : '1px solid rgba(0,0,0,0.08)',
                      background: leaderboardPeriod === p ? 'rgba(99,102,241,0.1)' : 'transparent',
                      color: leaderboardPeriod === p ? '#6366f1' : '#6b7280',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {p === 'ALL' ? 'All Time' : p}
                  </button>
                ))}
              </div>
            )}
            <div className="bm-leader-list">
              {leaderboardLoading && lbTab === 'All' && (
                <div
                  style={{
                    padding: '1rem',
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: '0.75rem',
                  }}
                >
                  Loading leaderboard…
                </div>
              )}
              {!leaderboardLoading && leaderboardRows.length === 0 && lbTab === 'All' && (
                <div
                  style={{
                    padding: '1rem',
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: '0.75rem',
                  }}
                >
                  No leaderboard data available.
                </div>
              )}
              {leaderboardRows.map((r) => (
                <div key={`${r.isReal ? 'pm' : 'ez'}-${r.rank}-${r.name}`} className="bm-lb-row">
                  <span className="bm-lb-rank">{r.rank}.</span>
                  {r.isReal ? (
                    <span className="bm-lb-name" style={{ cursor: 'default' }}>
                      {r.name}
                    </span>
                  ) : (
                    <Link href={`/community/profile/${r.slug}`} className="bm-lb-name">
                      {r.name}
                    </Link>
                  )}
                  <span className="bm-lb-pnl">{r.pnl}</span>
                  <span className="bm-lb-meta">
                    {r.win} {r.tag}
                  </span>
                </div>
              ))}
            </div>
            <div className="bm-lb-you bm-lb-row">
              <span className="bm-lb-rank">23</span>
              <span className="bm-lb-name" style={{ cursor: 'default', color: '#8b949e' }}>
                You
              </span>
              <span className="bm-lb-pnl">+$840</span>
              <span className="bm-lb-meta">58% win</span>
            </div>
            <button type="button" className="bm-view-rankings">
              View Full Rankings →
            </button>
          </div>
        </div>

        <div cardId="betting-ev-finder" className="db-card">
          <div className="db-card-header">
            <h3>Expected Value Finder</h3>
            <button type="button" className="db-icon-btn" aria-label="Expand">
              <i className="bi bi-box-arrow-up-right" />
            </button>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            <p
              style={{
                margin: '0 0 0.75rem',
                fontSize: '0.75rem',
                color: '#6b7280',
                fontWeight: 600,
              }}
            >
              High EV Opportunities Today
            </p>
            {EV_ITEMS.map((e) => (
              <button
                key={e.id}
                type="button"
                className="bm-ev-item bm-ev-item--clickable"
                onClick={() => setEvOpen(e)}
              >
                <div
                  className={`bm-ev-confidence-dot bm-ev-confidence-dot--${e.confidence.toLowerCase()}`}
                />
                <div className="bm-ev-item-body">
                  <div className="bm-ev-title">{e.title}</div>
                  <div className="bm-ev-meta">
                    EV: {e.ev} &nbsp;·&nbsp; Confidence: {e.confidence}
                  </div>
                </div>
                <i className="bi bi-chevron-right bm-ev-arrow" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div cardId="betting-line-move" className="db-card">
        <div className="db-card-header">
          <h3>Line Movement Tracker</h3>
          <button type="button" className="db-icon-btn" aria-label="Expand">
            <i className="bi bi-box-arrow-up-right" />
          </button>
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          {LINE_MOVES.map((lm, idx) => (
            <div key={lm.id} className="bm-lm-item">
              <div className="bm-lm-title">
                <span aria-hidden>📈</span> {lm.title}
              </div>
              <div className="bm-lm-stats">
                Opened: {lm.opened} &nbsp;&nbsp; Current: {lm.current} &nbsp;&nbsp; Movement:{' '}
                <span style={{ color: lm.move.startsWith('-') ? '#ef4444' : '#10b981' }}>
                  {lm.move}
                </span>
              </div>
              <MiniLineChart seed={idx * 17 + lm.title.length} up={!lm.move.startsWith('-')} />
            </div>
          ))}
          <div className="bm-lm-footer">
            🚨 Reverse line movements flagged: {reverseCount} today
          </div>
        </div>
      </div>

      {platform === 'polymarket' && <PolymarketSection />}
      {platform === 'kalshi' && <KalshiSection />}

      {/* NOTE: Commented out - CoursePreviewSection and bettingCourses not available
      <CoursePreviewSection
        title="Recommended Courses"
        subtitle="Track 3 — Betting Markets & Prediction Markets"
        courses={bettingCourses}
        viewAllHref="/learning-center?track=betting"
      />
      */}

      {evOpen && (
        <div
          className="bm-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bm-ev-title"
          onClick={closeModal}
        >
          <div className="bm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bm-modal-hdr">
              <div className="bm-modal-hdr-left">
                <div
                  className="bm-modal-type-badge"
                  style={{
                    background:
                      evOpen.confidence === 'High'
                        ? 'rgba(16,185,129,0.12)'
                        : evOpen.confidence === 'Medium'
                          ? 'rgba(245,158,11,0.12)'
                          : 'rgba(239,68,68,0.12)',
                    color:
                      evOpen.confidence === 'High'
                        ? '#10b981'
                        : evOpen.confidence === 'Medium'
                          ? '#f59e0b'
                          : '#ef4444',
                    borderColor:
                      evOpen.confidence === 'High'
                        ? 'rgba(16,185,129,0.3)'
                        : evOpen.confidence === 'Medium'
                          ? 'rgba(245,158,11,0.3)'
                          : 'rgba(239,68,68,0.3)',
                  }}
                >
                  <i
                    className={`bi ${
                      evOpen.confidence === 'High'
                        ? 'bi-shield-fill-check'
                        : evOpen.confidence === 'Medium'
                          ? 'bi-shield-fill-exclamation'
                          : 'bi-shield-fill-x'
                    }`}
                  />
                  {evOpen.confidence} Confidence
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 id="bm-ev-title" className="bm-modal-title">
                    {evOpen.analysis.headline}
                  </h2>
                  <div className="bm-modal-ev-badge">EV: {evOpen.analysis.evPer100} per $100</div>
                </div>
              </div>
              <button
                type="button"
                className="bm-modal-close"
                onClick={closeModal}
                aria-label="Close"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="bm-modal-body">
              <div className="bm-modal-section">
                <h3 className="bm-modal-section-title">
                  <i className="bi bi-calculator" /> The Math
                </h3>
                {evOpen.analysis.math.map((line) => (
                  <p key={line} className="bm-modal-text">
                    {line}
                  </p>
                ))}
              </div>

              <div className="bm-modal-kpi-grid">
                <div className="bm-modal-kpi">
                  <span className="bm-modal-kpi-label">Implied Prob</span>
                  <span className="bm-modal-kpi-value">{evOpen.analysis.implied ?? '—'}</span>
                </div>
                <div className="bm-modal-kpi">
                  <span className="bm-modal-kpi-label">Model Prob</span>
                  <span className="bm-modal-kpi-value">{evOpen.analysis.model ?? '—'}</span>
                </div>
                <div className="bm-modal-kpi">
                  <span className="bm-modal-kpi-label">Edge</span>
                  <span className="bm-modal-kpi-value" style={{ color: '#10b981' }}>
                    {evOpen.analysis.edge ?? '—'}
                  </span>
                </div>
                <div className="bm-modal-kpi">
                  <span className="bm-modal-kpi-label">Expected Value</span>
                  <span className="bm-modal-kpi-value" style={{ color: '#d4af37' }}>
                    {evOpen.analysis.evPer100 ?? '—'}
                  </span>
                </div>
              </div>

              <div className="bm-modal-section">
                <h3 className="bm-modal-section-title">
                  <i className="bi bi-book" /> Backstory
                </h3>
                {evOpen.analysis.backstory.map((p) => (
                  <p key={p} className="bm-modal-text">
                    {p}
                  </p>
                ))}
              </div>

              <div className="bm-modal-insight">
                <div className="bm-modal-insight-label">
                  <i className="bi bi-lightbulb" /> Based On
                </div>
                <p className="bm-modal-insight-text">{evOpen.analysis.basedOn}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
