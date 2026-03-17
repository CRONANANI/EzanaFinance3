'use client';

import { useState } from 'react';
import Link from 'next/link';
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

const LATEST_INSIGHTS = [
  { id: 1, time: 'Today, 10:09', title: 'Northrop Grumman Considers Tank Ammo Production in Pol…', emoji: '🏭', cat: 'Defense' },
  { id: 2, time: 'Yesterday', title: 'Bath & Body Revises Sales Forecast Amidst Economic Head…', emoji: '📊', cat: 'Consumer' },
  { id: 3, time: 'Yesterday', title: 'Cisco Adjusts Projections Amid Networking Equipment Dem…', emoji: '🌐', cat: 'Tech' },
  { id: 4, time: '2 days ago', title: 'Investors Show Interest in Weight-Loss; Drug Makers Surge …', emoji: '💊', cat: 'Healthcare' },
  { id: 5, time: '2 days ago', title: 'Exxon Aims To Become a Lithium Producing Company by 20…', emoji: '⚡', cat: 'Energy' },
  { id: 6, time: '3 days ago', title: 'Federal Reserve Signals Data-Dependent Approach to Rate…', emoji: '🏦', cat: 'Economics' },
];

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

export default function InsideTheCapitolPage() {
  const [assetFilter, setAssetFilter] = useState('Stocks Only');
  const [typeFilter, setTypeFilter] = useState('All');
  const [activePolIdx, setActivePolIdx] = useState(0);

  const trades = LATEST_TRADES.filter((t) => {
    if (typeFilter === 'Buy') return t.type === 'BUY';
    if (typeFilter === 'Sell') return t.type === 'SELL';
    return true;
  });

  const pol = FEATURED_POLITICIANS[activePolIdx];

  return (
    <div className="itc-page">
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

        {/* TOP RIGHT — Latest Insights */}
        <PinnableCard cardId="itc-latest-insights" title="Latest Insights" sourcePage="/inside-the-capitol" sourceLabel="Inside The Capitol" defaultW={2} defaultH={3}>
          <div className="itc-card">
            <div className="itc-hdr">
              <h3>LATEST INSIGHTS</h3>
              <Link href="/ezana-echo" className="itc-va">VIEW ALL</Link>
            </div>
            <div className="itc-body">
              {LATEST_INSIGHTS.map((ins) => (
                <div key={ins.id} className="itc-ins">
                  <div className="itc-ins-img">{ins.emoji}</div>
                  <div className="itc-ins-content">
                    <div className="itc-ins-meta">
                      <span className="itc-ins-time">{ins.time}</span>
                      <span className={`itc-ins-cat ${ins.cat.toLowerCase()}`}>{ins.cat}</span>
                    </div>
                    <div className="itc-ins-title">{ins.title}</div>
                  </div>
                </div>
              ))}
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
