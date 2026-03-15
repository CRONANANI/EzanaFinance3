'use client';

import { useState, useEffect, useCallback } from 'react';
import { PinnableCard } from '@/components/ui/PinnableCard';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/theme-variables.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/pages/home-dashboard.css';
import '../../../../app-legacy/pages/betting-markets.css';

/* ── Static data (sports) ── */
const SPORTS_ODDS = [
  {
    sport: 'NBA',
    icon: 'bi-dribbble',
    games: [
      { time: '7:30 PM', home: 'Boston Celtics', away: 'Milwaukee Bucks', spread: '-4.5', total: '224.5', ml: '-185' },
      { time: '8:00 PM', home: 'Denver Nuggets', away: 'LA Lakers', spread: '-6.0', total: '218.0', ml: '-240' },
      { time: '10:00 PM', home: 'Golden State Warriors', away: 'Phoenix Suns', spread: '-2.5', total: '229.0', ml: '-135' },
    ],
  },
  {
    sport: 'NHL',
    icon: 'bi-trophy',
    games: [
      { time: '7:00 PM', home: 'NY Rangers', away: 'Carolina Hurricanes', spread: '-1.5', total: '5.5', ml: '-130' },
      { time: '8:00 PM', home: 'Dallas Stars', away: 'Colorado Avalanche', spread: 'PK', total: '6.0', ml: '+105' },
    ],
  },
  {
    sport: 'MLB',
    icon: 'bi-circle',
    games: [
      { time: '1:05 PM', home: 'NY Yankees', away: 'Boston Red Sox', spread: '-1.5', total: '8.5', ml: '-150' },
      { time: '4:10 PM', home: 'LA Dodgers', away: 'SF Giants', spread: '-1.5', total: '7.5', ml: '-175' },
      { time: '7:10 PM', home: 'Houston Astros', away: 'Texas Rangers', spread: '-1.5', total: '8.0', ml: '-140' },
    ],
  },
  {
    sport: 'Soccer — Premier League',
    icon: 'bi-globe',
    games: [
      { time: 'SAT 10:00', home: 'Arsenal', away: 'Manchester City', spread: '+0.5', total: '2.5', ml: '+155' },
      { time: 'SAT 12:30', home: 'Liverpool', away: 'Chelsea', spread: '-1.0', total: '3.0', ml: '-120' },
    ],
  },
];

const LINE_MOVEMENTS = [
  { game: 'Celtics vs Bucks', type: 'NBA', openSpread: '-3.0', currentSpread: '-4.5', openTotal: '226.0', currentTotal: '224.5', direction: 'up', sharp: true },
  { game: 'Nuggets vs Lakers', type: 'NBA', openSpread: '-5.0', currentSpread: '-6.0', openTotal: '220.0', currentTotal: '218.0', direction: 'up', sharp: false },
  { game: 'Warriors vs Suns', type: 'NBA', openSpread: '-1.0', currentSpread: '-2.5', openTotal: '231.0', currentTotal: '229.0', direction: 'up', sharp: true },
  { game: 'Rangers vs Hurricanes', type: 'NHL', openSpread: '-1.5', currentSpread: '-1.5', openTotal: '6.0', currentTotal: '5.5', direction: 'down', sharp: false },
  { game: 'Yankees vs Red Sox', type: 'MLB', openSpread: '-1.5', currentSpread: '-1.5', openTotal: '9.0', currentTotal: '8.5', direction: 'down', sharp: true },
  { game: 'Dodgers vs Giants', type: 'MLB', openSpread: '-1.5', currentSpread: '-1.5', openTotal: '8.0', currentTotal: '7.5', direction: 'down', sharp: false },
  { game: 'Arsenal vs Man City', type: 'Soccer', openSpread: 'PK', currentSpread: '+0.5', openTotal: '2.5', currentTotal: '2.5', direction: 'down', sharp: true },
];

const RESOLVED_MARKETS = [
  { title: 'Will Fed raise rates at March 2026 FOMC?', outcome: 'no', date: 'Mar 10, 2026', finalPrice: 12 },
  { title: 'Will Bitcoin reach $80K in February 2026?', outcome: 'yes', date: 'Feb 28, 2026', finalPrice: 91 },
  { title: 'Will Tesla deliver 500K vehicles in Q4 2025?', outcome: 'no', date: 'Jan 15, 2026', finalPrice: 22 },
  { title: 'Will Ukraine-Russia ceasefire happen in 2025?', outcome: 'no', date: 'Dec 31, 2025', finalPrice: 8 },
  { title: 'Will Apple announce AR glasses at WWDC 2025?', outcome: 'no', date: 'Jun 10, 2025', finalPrice: 15 },
  { title: 'Will GDP growth exceed 3% in Q4 2025?', outcome: 'yes', date: 'Jan 30, 2026', finalPrice: 74 },
];

const VALUE_OPPORTUNITIES = [
  { market: 'Celtics -4.5 vs Bucks', source: 'NBA', ev: '+4.2%', type: 'positive', reason: 'Model projects Celtics by 7.1 at home, sharp money moving line from -3 to -4.5' },
  { market: 'Arsenal +0.5 vs Man City', source: 'EPL', ev: '+3.8%', type: 'positive', reason: 'Arsenal 12-1-0 at Emirates this season. Line moved from PK — value on the dog' },
  { market: 'Fed rate cut June — YES at 68¢', source: 'Polymarket', ev: '+5.1%', type: 'positive', reason: 'CME FedWatch shows 73% probability. Market pricing lag creates edge' },
  { market: 'BTC > $100K — YES at 42¢', source: 'Polymarket', ev: '-2.3%', type: 'negative', reason: 'On-chain metrics show weakening demand. Market may be overpriced near resistance' },
  { market: 'Yankees/Red Sox UNDER 8.5', source: 'MLB', ev: '+2.9%', type: 'positive', reason: 'Both starters have sub-3 ERA. Bullpen performance supports under' },
  { market: 'S&P 6000 by Dec — YES at 55¢', source: 'Polymarket', ev: '+6.4%', type: 'positive', reason: 'Earnings growth trajectory and rate cut cycle support ~15% upside from current levels' },
];

const CATEGORIES = ['All', 'Politics', 'Economics', 'Crypto', 'Tech', 'Sports', 'Culture'];

const CATEGORY_ICONS = {
  politics: 'bi-bank',
  economics: 'bi-graph-up',
  crypto: 'bi-currency-bitcoin',
  tech: 'bi-cpu',
  sports: 'bi-trophy',
  culture: 'bi-music-note-beamed',
};

const LEADERBOARD_WINDOWS = [
  { label: '1D', value: '1d' },
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: 'All', value: 'all' },
];

function formatMoney(n) {
  if (n == null || isNaN(n)) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${n < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${n < 0 ? '-' : ''}$${(abs / 1_000).toFixed(1)}K`;
  return `${n < 0 ? '-' : ''}$${abs.toFixed(2)}`;
}

function formatVolume(v) {
  if (!v) return '$0';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function parseYesPrice(market) {
  try {
    const prices = typeof market.outcomePrices === 'string'
      ? JSON.parse(market.outcomePrices)
      : market.outcomePrices;
    if (Array.isArray(prices) && prices.length > 0) {
      return Math.round(parseFloat(prices[0]) * 100);
    }
  } catch { /* fallback */ }
  return 50;
}

function guessCategory(market) {
  const q = (market.question + ' ' + (market.category || '')).toLowerCase();
  if (q.includes('president') || q.includes('election') || q.includes('congress') || q.includes('trump') || q.includes('biden') || q.includes('democrat') || q.includes('republican')) return 'politics';
  if (q.includes('bitcoin') || q.includes('ethereum') || q.includes('crypto') || q.includes('btc') || q.includes('eth')) return 'crypto';
  if (q.includes('rate') || q.includes('gdp') || q.includes('recession') || q.includes('fed') || q.includes('inflation') || q.includes('s&p') || q.includes('market')) return 'economics';
  if (q.includes('ai') || q.includes('tesla') || q.includes('apple') || q.includes('spacex') || q.includes('tech') || q.includes('openai') || q.includes('google')) return 'tech';
  if (q.includes('nba') || q.includes('nfl') || q.includes('mlb') || q.includes('soccer') || q.includes('sport') || q.includes('super bowl') || q.includes('champion')) return 'sports';
  return 'culture';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SkeletonRows({ count = 5 }) {
  return Array.from({ length: count }).map((_, i) => (
    <div key={i} className="bm-skeleton-row">
      <div className="bm-skeleton bm-skeleton-circle" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="bm-skeleton bm-skeleton-line w-3-4" />
        <div className="bm-skeleton bm-skeleton-line w-1-2" />
      </div>
    </div>
  ));
}

export default function BettingMarketsPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  /* ── Live markets state ── */
  const [liveMarkets, setLiveMarkets] = useState([]);
  const [marketsLoading, setMarketsLoading] = useState(true);

  /* ── Leaderboard state ── */
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbWindow, setLbWindow] = useState('7d');
  const [lbLoading, setLbLoading] = useState(true);

  /* ── Trader profile state ── */
  const [traderQuery, setTraderQuery] = useState('');
  const [traderProfile, setTraderProfile] = useState(null);
  const [traderLoading, setTraderLoading] = useState(false);
  const [traderError, setTraderError] = useState('');

  /* ── Fetch live markets ── */
  const fetchMarkets = useCallback(async (tag) => {
    setMarketsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20', active: 'true' });
      if (tag && tag !== 'All') params.set('tag', tag.toLowerCase());
      const res = await fetch(`/api/polymarket/markets?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load markets');
      const data = await res.json();
      setLiveMarkets(data);
    } catch (err) {
      console.error(err);
      setLiveMarkets([]);
    } finally {
      setMarketsLoading(false);
    }
  }, []);

  useEffect(() => { fetchMarkets(activeCategory); }, [activeCategory, fetchMarkets]);

  /* ── Fetch leaderboard ── */
  const fetchLeaderboard = useCallback(async (window) => {
    setLbLoading(true);
    try {
      const res = await fetch(`/api/polymarket/leaderboard?window=${window}&sort=profit&limit=25`);
      if (!res.ok) throw new Error('Failed to load leaderboard');
      const data = await res.json();
      setLeaderboard(data);
    } catch (err) {
      console.error(err);
      setLeaderboard([]);
    } finally {
      setLbLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeaderboard(lbWindow); }, [lbWindow, fetchLeaderboard]);

  /* ── Look up trader ── */
  const lookupTrader = useCallback(async () => {
    if (!traderQuery.trim()) return;
    setTraderLoading(true);
    setTraderError('');
    setTraderProfile(null);
    try {
      const res = await fetch(`/api/polymarket/profile?username=${encodeURIComponent(traderQuery.trim())}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Not found (${res.status})`);
      }
      const data = await res.json();
      setTraderProfile(data);
    } catch (err) {
      setTraderError(err.message);
    } finally {
      setTraderLoading(false);
    }
  }, [traderQuery]);

  const handleLeaderboardClick = (username) => {
    setTraderQuery(username);
    setTraderLoading(true);
    setTraderError('');
    setTraderProfile(null);
    fetch(`/api/polymarket/profile?username=${encodeURIComponent(username)}`)
      .then((r) => r.ok ? r.json() : r.json().then((b) => { throw new Error(b.error || 'Not found'); }))
      .then(setTraderProfile)
      .catch((e) => setTraderError(e.message))
      .finally(() => setTraderLoading(false));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ── Derived stats ── */
  const totalVolume = liveMarkets.reduce((s, m) => s + (m.volume24hr || 0), 0);
  const activeMarketsCount = liveMarkets.length;

  return (
    <div className="betting-markets-container">
      {/* Stats Grid */}
      <div className="stats-grid condensed">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
            <i className="bi bi-graph-up-arrow" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{marketsLoading ? '—' : activeMarketsCount}</div>
            <div className="stat-label">Active Markets</div>
            <div className="stat-change positive">LIVE</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
            <i className="bi bi-cash-stack" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{marketsLoading ? '—' : formatVolume(totalVolume)}</div>
            <div className="stat-label">24h Volume</div>
            <div className="stat-change positive">Polymarket</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' }}>
            <i className="bi bi-people" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{lbLoading ? '—' : leaderboard.length}</div>
            <div className="stat-label">Top Traders</div>
            <div className="stat-change">{lbWindow} window</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(167, 139, 250, 0.2)', color: '#a78bfa' }}>
            <i className="bi bi-lightning" />
          </div>
          <div className="stat-content">
            <div className="stat-value">{VALUE_OPPORTUNITIES.filter((v) => v.type === 'positive').length}</div>
            <div className="stat-label">Value Opportunities</div>
            <div className="stat-change positive">EV+ detected</div>
          </div>
        </div>
      </div>

      {/* ── Trader Lookup (full-width) ── */}
      <PinnableCard cardId="trader-lookup" title="Polymarket Trader Lookup" sourcePage="/betting-markets" sourceLabel="Betting Markets" defaultW={12} defaultH={3}>
        <div className="component-card">
          <div className="card-header">
            <h3><i className="bi bi-person-badge" /> Polymarket Trader Lookup</h3>
            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--muted-foreground)' }}>Search any trader</span>
          </div>
          <div className="card-body">
            <div className="bm-trader-search">
              <input
                type="text"
                placeholder="Enter Polymarket username (e.g. ColdMath)"
                value={traderQuery}
                onChange={(e) => setTraderQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && lookupTrader()}
              />
              <button onClick={lookupTrader} disabled={traderLoading || !traderQuery.trim()}>
                {traderLoading ? 'Searching…' : 'Look Up'}
              </button>
            </div>

            {traderLoading && <SkeletonRows count={4} />}

            {traderError && (
              <div className="bm-empty-state">
                <i className="bi bi-exclamation-triangle" />
                <p>{traderError}</p>
              </div>
            )}

            {traderProfile && !traderLoading && (
              <div className="bm-trader-profile">
                {/* Profile header */}
                <div className="bm-profile-header">
                  <div className="bm-profile-avatar">
                    {traderProfile.profile?.profileImage ? (
                      <img src={traderProfile.profile.profileImage} alt="" />
                    ) : (
                      <span className="avatar-fallback">{(traderProfile.profile?.username || '?')[0].toUpperCase()}</span>
                    )}
                  </div>
                  <div className="bm-profile-info">
                    <div className="bm-profile-name">{traderProfile.profile?.username || traderProfile.profile?.name}</div>
                    {traderProfile.profile?.bio && <div className="bm-profile-bio">{traderProfile.profile.bio}</div>}
                  </div>
                </div>

                <div className="bm-profile-stats-row">
                  <div className="bm-profile-stat">
                    <div className="bm-profile-stat-value">{traderProfile.stats?.openPositions || 0}</div>
                    <div className="bm-profile-stat-label">Open Positions</div>
                  </div>
                  <div className="bm-profile-stat">
                    <div className="bm-profile-stat-value">{formatMoney(traderProfile.stats?.totalPositionsValue)}</div>
                    <div className="bm-profile-stat-label">Positions Value</div>
                  </div>
                  <div className="bm-profile-stat">
                    <div className="bm-profile-stat-value">{traderProfile.stats?.totalTrades || 0}</div>
                    <div className="bm-profile-stat-label">Recent Trades</div>
                  </div>
                </div>

                {/* Positions */}
                {traderProfile.positions?.length > 0 && (
                  <>
                    <div className="bm-section-label">Open Positions</div>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="bm-positions-table">
                        <thead>
                          <tr>
                            <th>Market</th>
                            <th>Side</th>
                            <th>Size</th>
                            <th>Avg Price</th>
                            <th>Cur Price</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {traderProfile.positions.slice(0, 20).map((p, i) => (
                            <tr key={i}>
                              <td className="market-title">{p.title || p.market || p.conditionId?.slice(0, 12) || '—'}</td>
                              <td><span className={p.outcome === 'Yes' || p.side === 'YES' ? 'bm-side-yes' : 'bm-side-no'}>{p.outcome || p.side || '—'}</span></td>
                              <td>{parseFloat(p.size || 0).toFixed(2)}</td>
                              <td>{parseFloat(p.avgPrice || 0).toFixed(2)}¢</td>
                              <td>{parseFloat(p.curPrice || p.price || 0).toFixed(2)}¢</td>
                              <td>{formatMoney(parseFloat(p.currentValue || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Recent Trades */}
                {traderProfile.trades?.length > 0 && (
                  <>
                    <div className="bm-section-label">Recent Trades</div>
                    <div className="bm-trades-list">
                      {traderProfile.trades.slice(0, 20).map((t, i) => (
                        <div key={i} className="bm-trade-item">
                          <span className={`bm-trade-side ${t.side?.toLowerCase() === 'buy' ? 'buy' : 'sell'}`}>{t.side || '—'}</span>
                          <span className="bm-trade-market">{t.title || t.market || t.conditionId?.slice(0, 12) || '—'}</span>
                          <span className="bm-trade-amount">{parseFloat(t.size || 0).toFixed(2)} shares</span>
                          <span className="bm-trade-price">@ {parseFloat(t.price || 0).toFixed(2)}¢</span>
                          <span className="bm-trade-time">{timeAgo(t.timestamp || t.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {!traderProfile.positions?.length && !traderProfile.trades?.length && (
                  <div className="bm-empty-state">
                    <i className="bi bi-inbox" />
                    <p>No open positions or recent trades found for this trader.</p>
                  </div>
                )}
              </div>
            )}

            {!traderProfile && !traderLoading && !traderError && (
              <div className="bm-empty-state">
                <i className="bi bi-search" />
                <p>Enter a Polymarket username above to view their profile, positions, and trade history.</p>
              </div>
            )}
          </div>
        </div>
      </PinnableCard>

      {/* Row 1: Live Prediction Markets + Sports Odds */}
      <div className="bm-grid-2">
        {/* Live Prediction Markets */}
        <PinnableCard cardId="polymarket-trending" title="Live Prediction Markets" sourcePage="/betting-markets" sourceLabel="Betting Markets" defaultW={6} defaultH={3}>
          <div className="component-card">
            <div className="card-header">
              <h3><i className="bi bi-bar-chart-line" /> Live Prediction Markets</h3>
              <span className="bm-value-badge positive">LIVE</span>
            </div>
            <div className="card-body">
              <div className="bm-category-pills" style={{ marginBottom: '1rem' }}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={`bm-pill ${activeCategory === cat ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat)}
                    type="button"
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {marketsLoading ? (
                <SkeletonRows count={6} />
              ) : liveMarkets.length === 0 ? (
                <div className="bm-empty-state">
                  <i className="bi bi-inbox" />
                  <p>No markets found for this category.</p>
                </div>
              ) : (
                <div className="bm-prediction-list">
                  {liveMarkets.map((m, i) => {
                    const cat = guessCategory(m);
                    const yesPrice = parseYesPrice(m);
                    return (
                      <div key={m.id || i} className="bm-prediction-card">
                        <div className={`bm-prediction-icon ${cat}`}>
                          <i className={`bi ${CATEGORY_ICONS[cat] || 'bi-question-circle'}`} />
                        </div>
                        <div className="bm-prediction-body">
                          <div className="bm-prediction-title">{m.question}</div>
                          <div className="bm-prediction-meta">
                            <span className="bm-prediction-volume">{formatVolume(m.volume)} volume</span>
                            <span>{formatVolume(m.liquidity)} liquidity</span>
                            {m.endDate && <span>Ends {new Date(m.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                          </div>
                          <div className="bm-prediction-bar-wrap">
                            <div className="bm-yes-no"><span className="t-green">YES</span></div>
                            <div className="bm-prediction-bar">
                              <div className="bm-prediction-bar-fill" style={{ width: `${yesPrice}%` }} />
                            </div>
                            <div className="bm-prediction-pct">{yesPrice}¢</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </PinnableCard>

        {/* Sports Odds Board */}
        <PinnableCard cardId="sports-odds" title="Sports Odds Board" sourcePage="/betting-markets" sourceLabel="Betting Markets" defaultW={6} defaultH={3}>
          <div className="component-card">
            <div className="card-header">
              <h3><i className="bi bi-trophy" /> Sports Odds Board</h3>
              <span style={{ fontSize: 'var(--font-xs)', color: 'var(--muted-foreground)' }}>Today&apos;s Lines</span>
            </div>
            <div className="card-body">
              <div className="bm-odds-board">
                {SPORTS_ODDS.map((sport) => (
                  <div key={sport.sport}>
                    <div className="bm-sport-header">
                      <i className={`bi ${sport.icon}`} /> {sport.sport}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr repeat(3, 80px)', gap: 0, marginBottom: '0.25rem' }}>
                      <div />
                      <div />
                      <div className="bm-odds-label">Spread</div>
                      <div className="bm-odds-label">Total</div>
                      <div className="bm-odds-label">ML</div>
                    </div>
                    {sport.games.map((g, gi) => (
                      <div key={gi} className="bm-game-row">
                        <div className="bm-game-time">{g.time}</div>
                        <div className="bm-teams">
                          <div className="bm-team">{g.home}</div>
                          <div className="bm-team away">{g.away}</div>
                        </div>
                        <div className="bm-odds-cell">{g.spread}</div>
                        <div className="bm-odds-cell">O/U {g.total}</div>
                        <div className="bm-odds-cell">{g.ml}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PinnableCard>
      </div>

      {/* Row 2: Leaderboard + Expected Value */}
      <div className="bm-grid-2">
        {/* Polymarket Leaderboard */}
        <PinnableCard cardId="polymarket-leaderboard" title="Polymarket Leaderboard" sourcePage="/betting-markets" sourceLabel="Betting Markets" defaultW={6} defaultH={3}>
          <div className="component-card">
            <div className="card-header">
              <h3><i className="bi bi-award" /> Polymarket Leaderboard</h3>
              <span className="bm-value-badge positive">LIVE</span>
            </div>
            <div className="card-body">
              <div className="bm-window-tabs">
                {LEADERBOARD_WINDOWS.map((w) => (
                  <button
                    key={w.value}
                    className={`bm-window-tab ${lbWindow === w.value ? 'active' : ''}`}
                    onClick={() => setLbWindow(w.value)}
                    type="button"
                  >
                    {w.label}
                  </button>
                ))}
              </div>

              {lbLoading ? (
                <SkeletonRows count={8} />
              ) : leaderboard.length === 0 ? (
                <div className="bm-empty-state">
                  <i className="bi bi-inbox" />
                  <p>No leaderboard data available.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="bm-leaderboard-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Trader</th>
                        <th>Profit</th>
                        <th>Volume</th>
                        <th>Markets</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((t, i) => {
                        const rank = i + 1;
                        const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'default';
                        const username = t.pseudonym || t.username || t.name || `0x…${(t.proxyWallet || t.userAddress || '').slice(-4)}`;
                        const profit = parseFloat(t.profit || t.pnl || 0);
                        const volume = parseFloat(t.volume || 0);
                        const numMarkets = t.numMarkets || t.markets || '—';

                        return (
                          <tr key={i} onClick={() => handleLeaderboardClick(username)} title={`View ${username}'s profile`}>
                            <td><span className={`bm-leaderboard-rank ${rankClass}`}>{rank}</span></td>
                            <td>
                              <div className="bm-leaderboard-user">
                                <div className="bm-leaderboard-user-avatar">
                                  {t.profileImage ? <img src={t.profileImage} alt="" /> : username[0]?.toUpperCase()}
                                </div>
                                <span className="bm-leaderboard-username">{username}</span>
                              </div>
                            </td>
                            <td><span className={profit >= 0 ? 'bm-profit-positive' : 'bm-profit-negative'}>{formatMoney(profit)}</span></td>
                            <td>{formatVolume(volume)}</td>
                            <td>{numMarkets}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </PinnableCard>

        {/* Expected Value Finder */}
        <PinnableCard cardId="ev-finder" title="Expected Value Finder" sourcePage="/betting-markets" sourceLabel="Betting Markets" defaultW={6} defaultH={2}>
          <div className="component-card">
            <div className="card-header">
              <h3><i className="bi bi-bullseye" /> Expected Value Finder</h3>
              <span className="bm-value-badge positive">{VALUE_OPPORTUNITIES.filter((v) => v.type === 'positive').length} EV+ BETS</span>
            </div>
            <div className="card-body">
              <div className="bm-prediction-list">
                {VALUE_OPPORTUNITIES.map((v, i) => (
                  <div key={i} className="bm-prediction-card">
                    <div className={`bm-prediction-icon ${v.type === 'positive' ? 'economics' : 'sports'}`}>
                      <i className={`bi ${v.type === 'positive' ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}`} />
                    </div>
                    <div className="bm-prediction-body">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
                        <span className="bm-prediction-title" style={{ marginBottom: 0 }}>{v.market}</span>
                        <span className={`bm-value-badge ${v.type === 'positive' ? 'positive' : ''}`} style={v.type !== 'positive' ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444' } : {}}>
                          EV {v.ev}
                        </span>
                      </div>
                      <div className="bm-prediction-meta">
                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{v.source}</span>
                      </div>
                      <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{v.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PinnableCard>
      </div>

      {/* Row 3: Line Movement + Resolved Markets */}
      <div className="bm-grid-2">
        {/* Line Movement Tracker */}
        <PinnableCard cardId="line-movement" title="Line Movement Tracker" sourcePage="/betting-markets" sourceLabel="Betting Markets" defaultW={6} defaultH={2}>
          <div className="component-card">
            <div className="card-header">
              <h3><i className="bi bi-arrow-left-right" /> Line Movement Tracker</h3>
              <span style={{ fontSize: 'var(--font-xs)', color: 'var(--muted-foreground)' }}>Last 24h</span>
            </div>
            <div className="card-body">
              <table className="bm-line-table">
                <thead>
                  <tr>
                    <th>Game</th>
                    <th>League</th>
                    <th>Open Spread</th>
                    <th>Current</th>
                    <th>Open Total</th>
                    <th>Current</th>
                    <th>Sharp</th>
                  </tr>
                </thead>
                <tbody>
                  {LINE_MOVEMENTS.map((l, i) => (
                    <tr key={i}>
                      <td className="ticker">{l.game}</td>
                      <td>{l.type}</td>
                      <td>{l.openSpread}</td>
                      <td>
                        <span className={l.openSpread !== l.currentSpread ? 'bm-arrow-up' : ''}>
                          {l.currentSpread}
                        </span>
                      </td>
                      <td>{l.openTotal}</td>
                      <td>
                        <span className={l.direction === 'down' ? 'bm-arrow-down' : l.direction === 'up' ? 'bm-arrow-up' : ''}>
                          {l.currentTotal} {l.openTotal !== l.currentTotal && (l.direction === 'down' ? '↓' : '↑')}
                        </span>
                      </td>
                      <td>{l.sharp && <span className="bm-value-badge arb"><i className="bi bi-lightning-fill" /> SHARP</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </PinnableCard>

        {/* Resolved Markets */}
        <PinnableCard cardId="resolved-markets" title="Recently Resolved Markets" sourcePage="/betting-markets" sourceLabel="Betting Markets" defaultW={6} defaultH={2}>
          <div className="component-card">
            <div className="card-header">
              <h3><i className="bi bi-check2-circle" /> Recently Resolved Markets</h3>
              <span style={{ fontSize: 'var(--font-xs)', color: 'var(--muted-foreground)' }}>Polymarket</span>
            </div>
            <div className="card-body">
              <div className="bm-resolved-list">
                {RESOLVED_MARKETS.map((r, i) => (
                  <div key={i} className={`bm-resolved-item ${r.outcome === 'yes' ? 'correct' : 'incorrect'}`}>
                    <div className={`bm-resolved-outcome ${r.outcome}`}>
                      <i className={`bi ${r.outcome === 'yes' ? 'bi-check-lg' : 'bi-x-lg'}`} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="bm-resolved-text">{r.title}</div>
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: 4 }}>
                        <span className="bm-resolved-date">{r.date}</span>
                        <span style={{ fontSize: '0.625rem', fontWeight: 700, color: r.outcome === 'yes' ? '#10b981' : '#ef4444' }}>
                          Resolved {r.outcome.toUpperCase()} at {r.finalPrice}¢
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PinnableCard>
      </div>
    </div>
  );
}
