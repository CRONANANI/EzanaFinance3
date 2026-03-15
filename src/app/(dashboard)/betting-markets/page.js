'use client';

import { useState } from 'react';
import { PinnableCard } from '@/components/ui/PinnableCard';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/theme-variables.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/pages/home-dashboard.css';
import '../../../../app-legacy/pages/betting-markets.css';

const POLYMARKET_TRENDING = [
  { title: 'Will the Fed cut rates at the June 2026 FOMC meeting?', category: 'economics', yesPrice: 68, volume: '$14.2M', endDate: 'Jun 18, 2026', traders: '12.4K' },
  { title: 'Will Bitcoin exceed $100,000 before July 2026?', category: 'crypto', yesPrice: 42, volume: '$28.7M', endDate: 'Jun 30, 2026', traders: '31.2K' },
  { title: 'Will AI-generated content be regulated by the US by end of 2026?', category: 'tech', yesPrice: 34, volume: '$6.8M', endDate: 'Dec 31, 2026', traders: '8.1K' },
  { title: 'Will the US enter a recession in 2026?', category: 'economics', yesPrice: 29, volume: '$18.4M', endDate: 'Dec 31, 2026', traders: '22.7K' },
  { title: 'Will a Democrat win the 2028 Presidential Election?', category: 'politics', yesPrice: 51, volume: '$42.1M', endDate: 'Nov 5, 2028', traders: '67.3K' },
  { title: 'Will Ethereum flip Bitcoin market cap in 2026?', category: 'crypto', yesPrice: 8, volume: '$4.1M', endDate: 'Dec 31, 2026', traders: '6.9K' },
  { title: 'Will SpaceX land humans on Mars by 2030?', category: 'tech', yesPrice: 12, volume: '$9.3M', endDate: 'Dec 31, 2030', traders: '15.2K' },
  { title: 'Will S&P 500 close above 6,000 by Dec 2026?', category: 'economics', yesPrice: 55, volume: '$11.6M', endDate: 'Dec 31, 2026', traders: '18.9K' },
];

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

export default function BettingMarketsPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredMarkets = activeCategory === 'All'
    ? POLYMARKET_TRENDING
    : POLYMARKET_TRENDING.filter((m) => m.category.toLowerCase() === activeCategory.toLowerCase());

  return (
    <div className="betting-markets-container">
      {/* Stats Grid */}
      <div className="stats-grid condensed">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
            <i className="bi bi-graph-up-arrow" />
          </div>
          <div className="stat-content">
            <div className="stat-value">248</div>
            <div className="stat-label">Active Markets</div>
            <div className="stat-change positive">+18 today</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
            <i className="bi bi-cash-stack" />
          </div>
          <div className="stat-content">
            <div className="stat-value">$134M</div>
            <div className="stat-label">24h Volume</div>
            <div className="stat-change positive">+12.4% vs avg</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' }}>
            <i className="bi bi-bullseye" />
          </div>
          <div className="stat-content">
            <div className="stat-value">78.4%</div>
            <div className="stat-label">Resolution Accuracy</div>
            <div className="stat-change">Markets &gt;50% YES</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(167, 139, 250, 0.2)', color: '#a78bfa' }}>
            <i className="bi bi-lightning" />
          </div>
          <div className="stat-content">
            <div className="stat-value">6</div>
            <div className="stat-label">Value Opportunities</div>
            <div className="stat-change positive">EV+ detected</div>
          </div>
        </div>
      </div>

      {/* Row 1: Polymarket + Sports Odds */}
      <div className="bm-grid-2">
        {/* Polymarket Trending Markets */}
        <PinnableCard cardId="polymarket-trending" title="Polymarket — Trending Markets" sourcePage="/betting-markets" sourceLabel="Betting Markets" defaultW={6} defaultH={3}>
          <div className="component-card">
            <div className="card-header">
              <h3><i className="bi bi-bar-chart-line" /> Polymarket — Prediction Markets</h3>
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
              <div className="bm-prediction-list">
                {filteredMarkets.map((m, i) => (
                  <div key={i} className="bm-prediction-card">
                    <div className={`bm-prediction-icon ${m.category}`}>
                      <i className={`bi ${CATEGORY_ICONS[m.category] || 'bi-question-circle'}`} />
                    </div>
                    <div className="bm-prediction-body">
                      <div className="bm-prediction-title">{m.title}</div>
                      <div className="bm-prediction-meta">
                        <span className="bm-prediction-volume">{m.volume} volume</span>
                        <span>{m.traders} traders</span>
                        <span>Ends {m.endDate}</span>
                      </div>
                      <div className="bm-prediction-bar-wrap">
                        <div className="bm-yes-no"><span className="t-green">YES</span></div>
                        <div className="bm-prediction-bar">
                          <div className="bm-prediction-bar-fill" style={{ width: `${m.yesPrice}%` }} />
                        </div>
                        <div className="bm-prediction-pct">{m.yesPrice}¢</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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

      {/* Row 2: Line Movement + EV Finder */}
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

        {/* Expected Value Finder */}
        <PinnableCard cardId="ev-finder" title="Expected Value Finder" sourcePage="/betting-markets" sourceLabel="Betting Markets" defaultW={6} defaultH={2}>
          <div className="component-card">
            <div className="card-header">
              <h3><i className="bi bi-bullseye" /> Expected Value Finder</h3>
              <span className="bm-value-badge positive">6 EV+ BETS</span>
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

      {/* Row 3: Resolved Markets */}
      <PinnableCard cardId="resolved-markets" title="Recently Resolved Markets" sourcePage="/betting-markets" sourceLabel="Betting Markets" defaultW={12} defaultH={2}>
        <div className="component-card">
          <div className="card-header">
            <h3><i className="bi bi-check2-circle" /> Recently Resolved Markets</h3>
            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--muted-foreground)' }}>Polymarket</span>
          </div>
          <div className="card-body">
            <div className="bm-grid-3">
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
  );
}
