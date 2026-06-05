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

const EV_SPORT_TABS = ['NFL', 'NBA', 'NHL', 'MLB', 'Football'];

const EV_ITEMS_BY_SPORT = {
  NFL: [
    {
      id: 'nfl1',
      title: 'Chiefs -3.5 vs Ravens',
      ev: '+3.8%',
      confidence: 'High',
      sport: 'NFL',
      analysis: {
        headline: 'Chiefs -3.5 vs Ravens',
        implied: '52.4%',
        model: '56.8%',
        edge: '+4.4%',
        evPer100: '+3.8%',
        confidence: 'HIGH',
        basedOn: 'Mahomes home record, Ravens secondary injuries, red-zone efficiency',
        math: [
          'Market implies Chiefs cover 52.4% of the time.',
          'Our Poisson model estimates 56.8% after adjusting for home splits and defensive injuries.',
          'Edge of +4.4% after vig.',
        ],
        backstory: [
          'Chiefs are 12-3 ATS at home this season. Ravens missing two starting CBs confirmed Friday.',
          'Mahomes averages 2.4 TDs at home vs 1.8 on the road — regression model weights this heavily.',
        ],
      },
    },
    {
      id: 'nfl2',
      title: 'Over 44.5 Bills/Dolphins',
      ev: '+2.1%',
      confidence: 'Medium',
      sport: 'NFL',
      analysis: {
        headline: 'Over 44.5 Bills/Dolphins',
        implied: '49.5%',
        model: '52.0%',
        edge: '+2.5%',
        evPer100: '+2.1%',
        confidence: 'MEDIUM',
        basedOn: 'Pace of play, weather forecast, total line movement',
        math: [
          'Market total at 44.5 implies ~49.5% over probability.',
          'Our simulation using team pace and defensive DVOA gives 52.0%.',
        ],
        backstory: [
          'Both teams top-10 in pace; dome game removes wind concerns. Divisional games historically trend over.',
        ],
      },
    },
  ],
  NBA: [
    {
      id: 'nba1',
      title: 'Lakers +3.5 vs Celtics',
      ev: '+4.2%',
      confidence: 'High',
      sport: 'NBA',
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
          'The Lakers are 8-2 ATS in their last 10 road games. Celtics dealing with a key center injury.',
          'Historical ATS record in this matchup favors the underdog by 3.2 points.',
        ],
      },
    },
    {
      id: 'nba2',
      title: 'Warriors ML vs Bucks',
      ev: '+2.8%',
      confidence: 'Medium',
      sport: 'NBA',
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
  ],
  NHL: [
    {
      id: 'nhl1',
      title: 'Canadiens +1.5 vs Bruins',
      ev: '+6.1%',
      confidence: 'High',
      sport: 'NHL',
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
  ],
  MLB: [
    {
      id: 'mlb1',
      title: 'Yankees -1.5 vs Blue Jays',
      ev: '+3.4%',
      confidence: 'Medium',
      sport: 'MLB',
      analysis: {
        headline: 'Yankees -1.5 vs Blue Jays',
        implied: '41.0%',
        model: '45.2%',
        edge: '+4.2%',
        evPer100: '+3.4%',
        confidence: 'MEDIUM',
        basedOn: 'Starting pitcher matchup, bullpen fatigue, run-line regression',
        math: [
          'Market run-line implies Yankees cover 41% of the time.',
          'Our Poisson regression on runs scored gives 45.2% after pitching matchup adjustments.',
        ],
        backstory: [
          'Yankees ace on the mound with a 2.1 ERA at home. Blue Jays bullpen logged 14 innings in 3 days.',
        ],
      },
    },
  ],
  Football: [
    {
      id: 'fb1',
      title: 'Arsenal -1 vs Man Utd',
      ev: '+3.2%',
      confidence: 'High',
      sport: 'Football',
      analysis: {
        headline: 'Arsenal -1 vs Man Utd',
        implied: '48.0%',
        model: '51.9%',
        edge: '+3.9%',
        evPer100: '+3.2%',
        confidence: 'HIGH',
        basedOn: 'xG trends, home advantage, squad rotation',
        math: [
          'Market handicap implies Arsenal covers 48% of the time.',
          'Our expected goals model gives 51.9% — edge holds after vig.',
        ],
        backstory: [
          'Arsenal unbeaten at home in 14. Man Utd rotate heavily after midweek European fixture.',
        ],
      },
    },
  ],
};

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
    border: isActive ? '1px solid #6366f1' : '1px solid var(--bm-border)',
    background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
    color: isActive ? '#6366f1' : 'var(--bm-muted)',
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
          <h3 style={{ color: 'var(--bm-heading)' }}>
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
            <p style={{ color: 'var(--bm-muted)', fontSize: '0.8125rem' }}>Loading markets…</p>
          )}
          {!marketsLoading && markets.length === 0 && (
            <p style={{ color: 'var(--bm-muted)', fontSize: '0.8125rem' }}>
              No markets available. Check Polymarket API connectivity.
            </p>
          )}
          {markets.map((m, i) => {
            const yesProb = parseYesProb(m);
            const vol = m.volume
              ? `$${Number(m.volume).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
              : null;
            const rowStyle = {
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.65rem 0',
              borderBottom: '1px solid rgba(99,102,241,0.06)',
              width: i === 0 ? '100%' : undefined,
              textAlign: 'left',
              fontFamily: 'inherit',
            };
            const rowContent = (
              <>
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
                        : 'var(--bm-subtle)',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      color: 'var(--bm-heading)',
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
                        color: 'var(--bm-muted)',
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
                        color: 'var(--bm-muted)',
                        margin: 0,
                      }}
                    >
                      YES
                    </p>
                  </div>
                )}
              </>
            );
            if (i === 0) {
              return (
                <button
                  key={m.id || m.conditionId || i}
                  type="button"
                  data-task-target="prediction-market-item"
                  style={{
                    ...rowStyle,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(99,102,241,0.06)',
                    cursor: 'pointer',
                  }}
                >
                  {rowContent}
                </button>
              );
            }
            return (
              <div key={m.id || m.conditionId || i} style={rowStyle}>
                {rowContent}
              </div>
            );
          })}
        </div>
      </div>

      <div className="db-card">
        <div className="db-card-header">
          <h3 style={{ color: 'var(--bm-heading)' }}>Search Polymarket Traders</h3>
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
            <i className="bi bi-search" style={{ color: 'var(--bm-subtle)', fontSize: '0.8rem' }} />
            <input
              type="text"
              data-task-target="polymarket-search"
              placeholder="Search by wallet address or username…"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--bm-heading)',
                fontSize: '0.8125rem',
                width: '100%',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>
          {searching && <p style={{ color: 'var(--bm-muted)', fontSize: '0.75rem' }}>Searching…</p>}
          {!searching && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
            <p style={{ color: 'var(--bm-muted)', fontSize: '0.75rem' }}>No traders found.</p>
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
                    color: 'var(--bm-heading)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    margin: 0,
                  }}
                >
                  {u.name || u.username || 'Trader'}
                </p>
                <p
                  style={{
                    color: 'var(--bm-muted)',
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
          <h3 style={{ color: 'var(--bm-heading)' }}>
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
            <p style={{ color: 'var(--bm-muted)', fontSize: '0.8125rem' }}>Loading markets…</p>
          )}
          {!marketsLoading && markets.length === 0 && (
            <p style={{ color: 'var(--bm-muted)', fontSize: '0.8125rem' }}>
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
                        : 'var(--bm-subtle)',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      color: 'var(--bm-heading)',
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
                        color: 'var(--bm-muted)',
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
                        color: 'var(--bm-muted)',
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
                color: 'var(--bm-muted)',
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
              <i
                className="bi bi-search"
                style={{ color: 'var(--bm-subtle)', fontSize: '0.8rem' }}
              />
              <input
                type="text"
                placeholder="Search by keyword, ticker, or category…"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--bm-heading)',
                  fontSize: '0.8125rem',
                  width: '100%',
                  fontFamily: 'var(--font-sans)',
                }}
              />
            </div>
            {searching && (
              <p
                style={{
                  color: 'var(--bm-muted)',
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
                      color: 'var(--bm-heading)',
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
  const [evSport, setEvSport] = useState('NFL');
  const [lbTab, setLbTab] = useState('All');
  const [evOpen, setEvOpen] = useState(null);
  const [polymarketLeaderboard, setPolymarketLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('WEEK');

  const closeModal = useCallback(() => setEvOpen(null), []);

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
              color: 'var(--bm-heading)',
              margin: 0,
            }}
          >
            Betting Markets
          </h1>
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--bm-muted)',
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
                color: platform === p.id ? '#111' : 'var(--bm-text)',
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
                  color: 'var(--bm-heading)',
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
                          : '1px solid var(--bm-border)',
                      background: leaderboardPeriod === p ? 'rgba(99,102,241,0.1)' : 'transparent',
                      color: leaderboardPeriod === p ? '#6366f1' : 'var(--bm-muted)',
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
                    color: 'var(--bm-muted)',
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
                    color: 'var(--bm-muted)',
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
              <span className="bm-lb-name" style={{ cursor: 'default' }}>
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

        <div cardId="betting-ev-finder" className="db-card" data-task-target="sports-odds-board">
          <div className="db-card-header">
            <h3>Expected Value Opportunities</h3>
            <button type="button" className="db-icon-btn" aria-label="Expand">
              <i className="bi bi-box-arrow-up-right" />
            </button>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            <div className="bm-ev-sport-tabs">
              {EV_SPORT_TABS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`bm-ev-sport-tab ${evSport === s ? 'on' : ''}`}
                  onClick={() => setEvSport(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <p
              style={{
                margin: '0.75rem 0 0.5rem',
                fontSize: '0.7rem',
                color: 'var(--bm-muted)',
                fontWeight: 600,
              }}
            >
              {evSport} — High EV Opportunities Today
            </p>
            {(EV_ITEMS_BY_SPORT[evSport] || []).length === 0 ? (
              <div
                style={{
                  padding: '1.5rem 0',
                  textAlign: 'center',
                  color: 'var(--bm-muted)',
                  fontSize: '0.75rem',
                }}
              >
                No EV opportunities detected for {evSport} right now.
              </div>
            ) : (
              (EV_ITEMS_BY_SPORT[evSport] || []).map((e) => (
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
              ))
            )}
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
