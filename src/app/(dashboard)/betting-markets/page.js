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

const STAT_CARDS = [
  {
    id: 'live',
    icon: '🏈',
    label: 'Live Events',
    value: '24 today',
    sub: 'NFL NBA NHL',
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

const SPORT_TABS = ['NFL', 'NBA', 'NHL', 'MLB', 'Soccer'];

const ODDS_DATA = {
  NFL: [
    {
      league: 'NFL — Today',
      games: [
        {
          title: 'Chiefs vs Bills',
          time: '4:25 PM ET',
          away: 'KC',
          home: 'BUF',
          spreadAway: '-2.5 (-110)',
          spreadHome: '+2.5 (-110)',
          total: 'O/U 48.5',
          ml: 'Moneyline: KC -145  BUF +125',
        },
        {
          title: 'Cowboys vs Eagles',
          time: '8:20 PM ET',
          away: 'DAL',
          home: 'PHI',
          spreadAway: '+3.0 (-105)',
          spreadHome: '-3.0 (-115)',
          total: 'O/U 44.0',
          ml: 'Moneyline: DAL +140  PHI -160',
        },
      ],
    },
  ],
  NBA: [
    {
      league: 'NBA — Today',
      games: [
        {
          title: 'Lakers vs Celtics',
          time: '7:30 PM ET',
          away: 'LAL',
          home: 'BOS',
          spreadAway: '+3.5 (-110)',
          spreadHome: '-3.5 (-110)',
          total: 'O/U 224.5',
          ml: 'Moneyline: LAL +145  BOS -165',
        },
        {
          title: 'Warriors vs Bucks',
          time: '8:00 PM ET',
          away: 'GSW',
          home: 'MIL',
          spreadAway: '-1.5 (-105)',
          spreadHome: '+1.5 (-115)',
          total: 'O/U 231',
          ml: 'Moneyline: GSW -125  MIL +105',
        },
        {
          title: 'Nuggets vs Suns',
          time: '10:00 PM ET',
          away: 'DEN',
          home: 'PHX',
          spreadAway: '-4.0 (-108)',
          spreadHome: '+4.0 (-112)',
          total: 'O/U 226.0',
          ml: 'Moneyline: DEN -195  PHX +168',
        },
      ],
    },
  ],
  NHL: [
    {
      league: 'NHL — Today',
      games: [
        {
          title: 'Canadiens vs Bruins',
          time: '7:00 PM ET',
          away: 'MTL',
          home: 'BOS',
          spreadAway: '+1.5 (-135)',
          spreadHome: '-1.5 (+115)',
          total: 'O/U 5.5',
          ml: 'Moneyline: MTL +180  BOS -210',
        },
        {
          title: 'Rangers vs Hurricanes',
          time: '7:00 PM ET',
          away: 'NYR',
          home: 'CAR',
          spreadAway: '-1.5 (-120)',
          spreadHome: '+1.5 (+100)',
          total: 'O/U 6.0',
          ml: 'Moneyline: NYR -135  CAR +115',
        },
      ],
    },
  ],
  MLB: [
    {
      league: 'MLB — Today',
      games: [
        {
          title: 'Yankees vs Red Sox',
          time: '1:05 PM ET',
          away: 'NYY',
          home: 'BOS',
          spreadAway: '-1.5 (-115)',
          spreadHome: '+1.5 (-105)',
          total: 'O/U 8.5',
          ml: 'Moneyline: NYY -150  BOS +130',
        },
      ],
    },
  ],
  Soccer: [
    {
      league: 'Soccer — Today',
      games: [
        {
          title: 'Arsenal vs Manchester City',
          time: '12:30 PM ET',
          away: 'ARS',
          home: 'MCI',
          spreadAway: '+0.5 (-110)',
          spreadHome: '-0.5 (-110)',
          total: 'O/U 2.5',
          ml: 'Moneyline: ARS +155  MCI -185',
        },
      ],
    },
  ],
};

const LEADER_ALL = [
  { rank: 1, name: 'Emma Wilson', slug: 'emma-wilson', pnl: '+$4,230', win: '72% win', tag: '🔥', partner: false },
  { rank: 2, name: 'David Kim', slug: 'david-kim', pnl: '+$3,180', win: '68% win', tag: '', partner: false },
  { rank: 3, name: 'Alex Chen', slug: 'alex-chen', pnl: '+$2,890', win: '71% win', tag: '', partner: true },
  { rank: 4, name: 'Lisa Park', slug: 'lisa-park', pnl: '+$2,450', win: '65% win', tag: '', partner: false },
  { rank: 5, name: 'Sarah Johnson', slug: 'sarah-johnson', pnl: '+$1,980', win: '63% win', tag: '', partner: false },
  { rank: 6, name: 'Mike Torres', slug: 'mike-torres', pnl: '+$1,750', win: '67% win', tag: '✅', partner: true },
  { rank: 7, name: 'James Wilson', slug: 'james-wilson', pnl: '+$1,420', win: '61% win', tag: '', partner: false },
  { rank: 8, name: 'Maria Garcia', slug: 'maria-garcia', pnl: '+$1,180', win: '66% win', tag: '', partner: false },
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
      backstory: ['Bucks on a back-to-back; Warriors defense ranks top-5 in rim protection over the last 10.'],
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

function PolymarketSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [markets, setMarkets] = useState([]);
  const [marketsLoading, setMarketsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/polymarket/markets?limit=6')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setMarkets(Array.isArray(d) ? d : d.markets || []))
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
            style={{ fontSize: '0.6875rem', color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}
          >
            View All ↗
          </a>
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          {marketsLoading && (
            <p style={{ color: 'var(--home-muted, #6b7280)', fontSize: '0.8125rem' }}>Loading markets…</p>
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
                      yesProb != null ? (yesProb > 60 ? '#10b981' : yesProb > 40 ? '#f59e0b' : '#ef4444') : '#6b7280',
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
                    <p style={{ color: 'var(--home-muted, #6b7280)', fontSize: '0.6875rem', margin: 0 }}>Vol: {vol}</p>
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
                    <p style={{ fontSize: '0.5625rem', color: 'var(--home-muted, #6b7280)', margin: 0 }}>YES</p>
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
          {searching && <p style={{ color: 'var(--home-muted, #6b7280)', fontSize: '0.75rem' }}>Searching…</p>}
          {!searching && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
            <p style={{ color: 'var(--home-muted, #6b7280)', fontSize: '0.75rem' }}>No traders found.</p>
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
                <p style={{ color: 'var(--home-heading, #111827)', fontSize: '0.8125rem', fontWeight: 700, margin: 0 }}>
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
                  {Math.abs(Number(u.profitLoss)).toLocaleString('en-US', { maximumFractionDigits: 0 })}
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
                  window.open(`https://polymarket.com/profile/${u.proxyWallet || u.address}`, '_blank')
                }
              >
                View
              </button>
            </div>
          ))}
        </div>
      </div>
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
      const res = await fetch(`/api/polygon/markets?source=kalshi&search=${encodeURIComponent(q.trim())}&limit=20`);
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
            style={{ fontSize: '0.6875rem', color: '#10b981', fontWeight: 600, textDecoration: 'none' }}
          >
            View All ↗
          </a>
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          {marketsLoading && (
            <p style={{ color: 'var(--home-muted, #6b7280)', fontSize: '0.8125rem' }}>Loading markets…</p>
          )}
          {!marketsLoading && markets.length === 0 && (
            <p style={{ color: 'var(--home-muted, #6b7280)', fontSize: '0.8125rem' }}>
              No markets available. Configure Kalshi API connectivity or try again later.
            </p>
          )}
          {markets.map((m, i) => {
            const prob =
              typeof m.yes_bid === 'number' ? m.yes_bid * 100 : typeof m.probability === 'number' ? m.probability * 100 : null;
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
                      prob != null ? (prob > 60 ? '#10b981' : prob > 40 ? '#f59e0b' : '#ef4444') : '#6b7280',
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
                    <p style={{ color: 'var(--home-muted, #6b7280)', fontSize: '0.6875rem', margin: 0 }}>Vol: {vol}</p>
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
                    <p style={{ fontSize: '0.5625rem', color: 'var(--home-muted, #6b7280)', margin: 0 }}>YES</p>
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(16,185,129,0.06)' }}>
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
              <p style={{ color: 'var(--home-muted, #6b7280)', fontSize: '0.75rem', marginTop: '0.5rem' }}>Searching…</p>
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
                  <p style={{ flex: 1, color: 'var(--home-heading, #111827)', fontSize: '0.8125rem', margin: 0 }}>
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
  const [lbTab, setLbTab] = useState('All');
  const [evOpen, setEvOpen] = useState(null);

  const closeModal = useCallback(() => setEvOpen(null), []);

  const leaderboardRows = useMemo(() => {
    let rows = LEADER_ALL;
    if (lbTab === 'Friends') rows = LEADER_FRIENDS;
    if (lbTab === 'Partners') rows = LEADER_PARTNERS;
    return rows.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [lbTab]);

  // NOTE: Commented out - getCoursesByTrack not available
  // const bettingCourses = useMemo(() => getCoursesByTrack('betting').slice(0, 4), []);

  const oddsBlocks = ODDS_DATA[sport] || [];

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
          <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--home-heading, #111827)', margin: 0 }}>
            Betting Markets
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--home-muted, #6b7280)', margin: '0.15rem 0 0' }}>
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
        {STAT_CARDS.map((s) => (
          <div key={s.id} className="bm-stat-card">
            <div className="bm-stat-top">
              <span className="bm-stat-label">
                <span aria-hidden>{s.icon}</span> {s.label}
              </span>
            </div>
            <div className="bm-stat-value">{s.value}</div>
            <div className={`bm-stat-sub ${s.subTone === 'up' ? 'bm-stat-delta up' : ''}`}>{s.sub}</div>
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
                  <div key={g.title} className="bm-game">
                    <div className="bm-game-title">
                      <span>{g.title}</span>
                      <span className="bm-game-time">{g.time}</span>
                    </div>
                    <div className="bm-game-lines">
                      {g.away} {g.spreadAway} &nbsp;&nbsp; {g.home} {g.spreadHome} &nbsp;&nbsp; {g.total}
                    </div>
                    <div className="bm-game-ml">{g.ml}</div>
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
            <h3>Betting Leaderboard</h3>
            <button type="button" className="db-icon-btn" aria-label="Expand">
              <i className="bi bi-box-arrow-up-right" />
            </button>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
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
            <div className="bm-leader-list">
              {leaderboardRows.map((r) => (
                <div key={r.name} className="bm-lb-row">
                  <span className="bm-lb-rank">{r.rank}.</span>
                  <Link href={`/community/profile/${r.slug}`} className="bm-lb-name">
                    {r.name}
                  </Link>
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
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>High EV Opportunities Today</p>
            {EV_ITEMS.map((e) => (
              <div key={e.id} className="bm-ev-item">
                <div className="bm-ev-title">{e.title}</div>
                <div className="bm-ev-meta">
                  EV: {e.ev} &nbsp;·&nbsp; Confidence: {e.confidence}
                </div>
                <button type="button" className="bm-ev-btn" onClick={() => setEvOpen(e)}>
                  View Analysis →
                </button>
              </div>
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
                <span style={{ color: lm.move.startsWith('-') ? '#ef4444' : '#10b981' }}>{lm.move}</span>
              </div>
              <MiniLineChart seed={idx * 17 + lm.title.length} up={!lm.move.startsWith('-')} />
            </div>
          ))}
          <div className="bm-lm-footer">🚨 Reverse line movements flagged: {reverseCount} today</div>
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
              <h2 id="bm-ev-title">Expected Value Analysis</h2>
              <button type="button" className="bm-modal-close" onClick={closeModal} aria-label="Close">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="bm-modal-sub">{evOpen.analysis.headline}</div>
            <div className="bm-modal-section">
              <h3>The Math</h3>
              {evOpen.analysis.math.map((line) => (
                <p key={line} style={{ marginBottom: '0.5rem' }}>
                  {line}
                </p>
              ))}
            </div>
            <dl className="bm-modal-grid">
              <dt>Implied Probability</dt>
              <dd>{evOpen.analysis.implied ?? '—'}</dd>
              <dt>Model Probability</dt>
              <dd>{evOpen.analysis.model ?? '—'}</dd>
              <dt>Edge</dt>
              <dd>{evOpen.analysis.edge ?? '—'}</dd>
              <dt>Expected Value</dt>
              <dd>{evOpen.analysis.evPer100 ?? '—'} per $100 wagered</dd>
            </dl>
            <div className="bm-modal-section">
              <h3>Backstory</h3>
              {evOpen.analysis.backstory.map((p) => (
                <p key={p} style={{ marginBottom: '0.5rem' }}>
                  {p}
                </p>
              ))}
            </div>
            <div className="bm-modal-conf">
              Confidence: {evOpen.analysis.confidence}
              <div style={{ color: '#9ca3af', fontWeight: 600, marginTop: 6 }}>Based on: {evOpen.analysis.basedOn}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
