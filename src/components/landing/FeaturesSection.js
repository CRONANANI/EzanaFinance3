'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const PORTFOLIO_METRICS = {
  '1D': [
    { label: "Today's P&L", value: '+$1,247', unit: '' },
    { label: 'Top Performer', value: 'NVDA', unit: '+12.4%' },
    { label: 'Market Performance', value: '+8.4%', unit: ' vs S&P 500' },
    { label: 'Volatility Score', value: '4.8', unit: '/10' },
  ],
  '1W': [
    { label: 'Risk Score', value: '6.2', unit: '/10' },
    { label: 'Sharpe Ratio', value: '1.45', unit: '' },
    { label: 'Dividends', value: '$847', unit: '/mo' },
    { label: 'Asset Allocation', value: 'Balanced', unit: '' },
  ],
  '1M': [
    { label: 'Beta vs Market', value: '1.05', unit: '' },
    { label: 'Sector Exposure', value: 'Tech', unit: ' 35%' },
    { label: 'Monthly Dividends', value: '$847', unit: '' },
    { label: 'Risk Score', value: '6.2', unit: '/10' },
  ],
  '1Y': [
    { label: 'YTD Return', value: '+18.2%', unit: '' },
    { label: 'Max Drawdown', value: '-4.3%', unit: '' },
    { label: 'Alpha vs S&P', value: '+2.1%', unit: '' },
    { label: 'Dividend Yield', value: '2.4%', unit: '' },
  ],
};

const INTEL_DATA = {
  contracts: [
    { agency: 'Department of Defense', company: 'Lockheed Martin', amount: '$450M Contract Award', date: '2 days ago', impact: 'high' },
    { agency: 'NASA', company: 'SpaceX', amount: '$1.2B Contract Award', date: '1 week ago', impact: 'high' },
    { agency: 'Department of Energy', company: 'Tesla', amount: '$85M Contract Award', date: '2 weeks ago', impact: 'medium' },
  ],
  lobbying: [
    { agency: 'Meta Platforms', company: 'Lobbying Expenditure', amount: '$5.2M spent in Q4 2025', date: 'Tech Policy, Privacy', impact: 'high' },
    { agency: 'Amazon', company: 'Lobbying Expenditure', amount: '$4.8M spent in Q4 2025', date: 'Cloud Computing, Labor', impact: 'high' },
    { agency: 'Google', company: 'Lobbying Expenditure', amount: '$3.9M spent in Q4 2025', date: 'AI Regulation, Antitrust', impact: 'medium' },
  ],
  patents: [
    { agency: 'Apple', company: 'Consumer Electronics', amount: '1247 patents filed in Q4 2025', date: 'Trend: ↑ Increasing', impact: 'high' },
    { agency: 'Tesla', company: 'Automotive AI', amount: '892 patents filed in Q4 2025', date: 'Trend: ↑ Increasing', impact: 'high' },
    { agency: 'Nvidia', company: 'AI Hardware', amount: '743 patents filed in Q4 2025', date: 'Trend: ↑ Increasing', impact: 'medium' },
  ],
};

const COMMUNITY_DATA = {
  trending: [
    { author: 'JD', name: 'John Doe', badge: 'expert', content: 'Just noticed a pattern in semiconductor congressional trades. NVDA purchases up 40% this week among tech committee members...', stats: { likes: 124, comments: 38, bookmarks: 56 } },
    { author: 'AS', name: 'Alex Smith', badge: 'verified', content: 'Defense contract awards correlating strongly with recent lobbying spend. Check out my detailed analysis...', stats: { likes: 89, comments: 22, bookmarks: 43 } },
  ],
  recent: [
    { author: 'MK', name: 'Maria Kim', badge: 'verified', content: 'New congressional trade alert: Senator just disclosed a large purchase in renewable energy sector. Interesting timing with upcoming legislation...', stats: { likes: 45, comments: 12, bookmarks: 23 } },
    { author: 'RP', name: 'Robert Park', badge: 'expert', content: 'Anyone else tracking the unusual patent filing activity from major tech companies this quarter? Something big might be coming...', stats: { likes: 67, comments: 18, bookmarks: 34 } },
  ],
};

export function FeaturesSection() {
  const sectionRef = useRef(null);
  const [portfolioRange, setPortfolioRange] = useState('1W');
  const [intelTab, setIntelTab] = useState('contracts');
  const [communityView, setCommunityView] = useState('trending');

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const blocks = section.querySelectorAll('.feature-block');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -100px 0px' }
    );
    blocks.forEach((block) => observer.observe(block));
    const fallback = setTimeout(() => {
      blocks.forEach((block) => block.classList.add('visible'));
    }, 2500);
    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  const portfolioMetrics = PORTFOLIO_METRICS[portfolioRange] || PORTFOLIO_METRICS['1W'];
  const intelItems = INTEL_DATA[intelTab] || INTEL_DATA.contracts;
  const communityPosts = COMMUNITY_DATA[communityView] || COMMUNITY_DATA.trending;

  return (
    <section ref={sectionRef} className="features-section" id="features">
      <div className="features-container">
        {/* 1. Portfolio - matches legacy order */}
        <div className="feature-block" data-feature="portfolio">
          <div className="feature-content">
            <div className="feature-visual">
              <div className="visual-container portfolio-visual">
                <div className="portfolio-dashboard">
                  <div className="dashboard-header">
                    <h4>Portfolio Performance</h4>
                    <div className="time-range">
                      {['1D', '1W', '1M', '1Y'].map((r) => (
                        <button key={r} type="button" className={`time-btn ${portfolioRange === r ? 'active' : ''}`} onClick={() => setPortfolioRange(r)}>{r}</button>
                      ))}
                    </div>
                  </div>
                  <div className="portfolio-value">
                    <div className="value-amount">$127,843.52</div>
                    <div className="value-change positive"><i className="bi bi-arrow-up" /><span>+$2,847.31 (+2.28%)</span></div>
                  </div>
                  <div className="mini-chart">
                    <svg width="100%" height="120" viewBox="0 0 400 120" aria-hidden="true">
                      <defs><linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.3 }} /><stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 0 }} /></linearGradient></defs>
                      <path className="chart-line" d="M 0 80 L 50 70 L 100 65 L 150 55 L 200 50 L 250 45 L 300 35 L 350 30 L 400 20" fill="none" stroke="#10b981" strokeWidth="2" />
                      <path className="chart-area" d="M 0 80 L 50 70 L 100 65 L 150 55 L 200 50 L 250 45 L 300 35 L 350 30 L 400 20 L 400 120 L 0 120 Z" fill="url(#chartGradient)" />
                    </svg>
                  </div>
                  <div className="metrics-mini-grid">
                    {portfolioMetrics.map((m, i) => (
                      <div key={i} className="metric-mini">
                        <span className="metric-label">{m.label}</span>
                        <span className="metric-value">{m.value}{m.unit ? <span className="metric-unit">{m.unit}</span> : null}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="feature-description">
              <h2 className="feature-title">Professional-grade portfolio analytics</h2>
              <p className="feature-text">Track your investments with institutional-quality tools. Get real-time performance metrics, automated risk assessment, dividend tracking, and sophisticated asset allocation analysis—all in one elegant dashboard.</p>
              <div className="feature-stats">
                <div className="stat-item"><span className="stat-value">Sub-100ms</span><span className="stat-label">Response Time</span></div>
                <div className="stat-item"><span className="stat-value">10+</span><span className="stat-label">Asset Classes</span></div>
                <div className="stat-item"><span className="stat-value">24/7</span><span className="stat-label">Market Data</span></div>
              </div>
              <Link href="/home-dashboard" className="feature-cta"><span>See Portfolio Tools</span><i className="bi bi-arrow-right" /></Link>
            </div>
          </div>
        </div>

        {/* 2. Congressional Trading - Ledger-style transactions (same size as other cards) */}
        <div className="feature-block reverse" data-feature="congress">
          <div className="feature-content">
            <div className="feature-visual">
              <div className="visual-container congress-visual congress-visual-compact">
                <div className="trading-feed">
                  <div className="feed-header">
                    <h4>Congressional Trading Ledger</h4>
                    <span className="live-indicator"><span className="pulse-dot" /> Live</span>
                  </div>
                  <div className="feed-items ledger-style">
                    <div className="trade-item">
                      <div className="trade-icon"><i className="bi bi-arrow-up-circle-fill text-green" /></div>
                      <div className="trade-details">
                        <div className="trade-header"><span className="politician-name">Nancy Pelosi</span><span className="trade-badge purchase">Purchase</span></div>
                        <div className="trade-info"><span className="ticker">NVDA</span><span className="amount">$50,001 - $100,000</span></div>
                        <div className="trade-meta"><span className="timestamp">2 minutes ago</span><span className="party democrat">Democrat</span></div>
                      </div>
                    </div>
                    <div className="trade-item">
                      <div className="trade-icon"><i className="bi bi-arrow-down-circle-fill text-red" /></div>
                      <div className="trade-details">
                        <div className="trade-header"><span className="politician-name">Dan Crenshaw</span><span className="trade-badge sale">Sale</span></div>
                        <div className="trade-info"><span className="ticker">TSLA</span><span className="amount">$15,001 - $50,000</span></div>
                        <div className="trade-meta"><span className="timestamp">5 minutes ago</span><span className="party republican">Republican</span></div>
                      </div>
                    </div>
                    <div className="trade-item">
                      <div className="trade-icon"><i className="bi bi-arrow-up-circle-fill text-green" /></div>
                      <div className="trade-details">
                        <div className="trade-header"><span className="politician-name">Josh Gottheimer</span><span className="trade-badge purchase">Purchase</span></div>
                        <div className="trade-info"><span className="ticker">AAPL</span><span className="amount">$100,001 - $250,000</span></div>
                        <div className="trade-meta"><span className="timestamp">8 minutes ago</span><span className="party democrat">Democrat</span></div>
                      </div>
                    </div>
                    <div className="trade-item">
                      <div className="trade-icon"><i className="bi bi-arrow-up-circle-fill text-green" /></div>
                      <div className="trade-details">
                        <div className="trade-header"><span className="politician-name">Mark Warner</span><span className="trade-badge purchase">Purchase</span></div>
                        <div className="trade-info"><span className="ticker">MSFT</span><span className="amount">$1,001 - $15,000</span></div>
                        <div className="trade-meta"><span className="timestamp">12 minutes ago</span><span className="party democrat">Democrat</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="feed-filters">
                    <button type="button" className="filter-pill active">All Trades</button>
                    <button type="button" className="filter-pill">Purchases</button>
                    <button type="button" className="filter-pill">Sales</button>
                    <button type="button" className="filter-pill">House</button>
                    <button type="button" className="filter-pill">Senate</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="feature-description">
              <h2 className="feature-title">Track congressional trades in real-time</h2>
              <p className="feature-text">Monitor stock purchases and sales by members of Congress with advanced filtering, real-time alerts, and detailed portfolio analysis. Follow specific politicians and never miss a trade that could move the market.</p>
              <div className="feature-stats">
                <div className="stat-item"><span className="stat-value">15,000+</span><span className="stat-label">Trades Tracked</span></div>
                <div className="stat-item"><span className="stat-value">535</span><span className="stat-label">Congress Members</span></div>
                <div className="stat-item"><span className="stat-value">Real-time</span><span className="stat-label">Updates</span></div>
              </div>
              <Link href="/inside-the-capitol" className="feature-cta"><span>Explore Congressional Trading</span><i className="bi bi-arrow-right" /></Link>
            </div>
          </div>
        </div>

        {/* 3. Market Intelligence - tabs switch data */}
        <div className="feature-block" data-feature="intelligence">
          <div className="feature-content">
            <div className="feature-visual">
              <div className="visual-container intelligence-visual">
                <div className="intelligence-dashboard">
                  <div className="intelligence-tabs">
                    {['contracts', 'lobbying', 'patents'].map((tab) => (
                      <button key={tab} type="button" className={`intel-tab ${intelTab === tab ? 'active' : ''}`} onClick={() => setIntelTab(tab)}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="intel-panel">
                    {intelItems.map((item, i) => (
                      <div key={i} className="intel-item">
                        <div className={`intel-icon ${intelTab}`}>
                          <i className={`bi ${intelTab === 'contracts' ? 'bi-file-earmark-text' : intelTab === 'lobbying' ? 'bi-megaphone' : 'bi-lightbulb'}`} />
                        </div>
                        <div className="intel-content">
                          <div className="intel-title">{item.agency}</div>
                          <div className="intel-company">{item.company}</div>
                          <div className="intel-amount">{item.amount}</div>
                          <div className="intel-meta"><span className="intel-date">{item.date}</span><span className={`intel-impact ${item.impact}`}>{item.impact === 'high' ? 'High' : 'Medium'} Impact</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="feature-description">
              <h2 className="feature-title">Uncover market-moving intelligence</h2>
              <p className="feature-text">Access critical data that institutional investors use: government contract awards, lobbying expenditures, and patent filings. Identify opportunities before they become mainstream news and stay ahead of market movements.</p>
              <div className="feature-stats">
                <div className="stat-item"><span className="stat-value">5,000+</span><span className="stat-label">Contracts/Year</span></div>
                <div className="stat-item"><span className="stat-value">$3.7B</span><span className="stat-label">Lobbying Tracked</span></div>
                <div className="stat-item"><span className="stat-value">100K+</span><span className="stat-label">Patents Filed</span></div>
              </div>
              <Link href="#resources" className="feature-cta"><span>Discover Market Intelligence</span><i className="bi bi-arrow-right" /></Link>
            </div>
          </div>
        </div>

        {/* 4. Community - was missing from Next.js */}
        <div className="feature-block reverse" data-feature="community">
          <div className="feature-content">
            <div className="feature-description">
              <h2 className="feature-title">Learn from collective intelligence</h2>
              <p className="feature-text">Join a thriving community of informed investors. Share research, discuss strategies, and learn from collective market intelligence. Build your reputation and connect with traders who share your investment philosophy.</p>
              <div className="feature-stats">
                <div className="stat-item"><span className="stat-value">10,000+</span><span className="stat-label">Active Users</span></div>
                <div className="stat-item"><span className="stat-value">50K+</span><span className="stat-label">Shared Insights</span></div>
                <div className="stat-item"><span className="stat-value">Daily</span><span className="stat-label">Discussions</span></div>
              </div>
              <Link href="#heroSection" className="feature-cta"><span>Join the Community</span><i className="bi bi-arrow-right" /></Link>
            </div>
            <div className="feature-visual">
              <div className="visual-container community-visual">
                <div className="community-feed">
                  <div className="feed-header">
                    <h4>Community Insights</h4>
                    <div className="feed-actions">
                      <button type="button" className={`feed-action ${communityView === 'trending' ? 'active' : ''}`} onClick={() => setCommunityView('trending')}><i className="bi bi-fire" /> Trending</button>
                      <button type="button" className={`feed-action ${communityView === 'recent' ? 'active' : ''}`} onClick={() => setCommunityView('recent')}><i className="bi bi-clock" /> Recent</button>
                    </div>
                  </div>
                  <div className="community-items">
                    {communityPosts.map((post, i) => (
                      <div key={i} className="community-post">
                        <div className="post-author">
                          <div className="author-avatar">{post.author}</div>
                          <div className="author-info"><span className="author-name">{post.name}</span><span className={`author-badge ${post.badge}`}>{post.badge === 'expert' ? 'Expert Trader' : 'Verified'}</span></div>
                        </div>
                        <div className="post-content"><p>{post.content}</p></div>
                        <div className="post-stats"><span className="stat"><i className="bi bi-hand-thumbs-up" /> {post.stats.likes}</span><span className="stat"><i className="bi bi-chat" /> {post.stats.comments}</span><span className="stat"><i className="bi bi-bookmark" /> {post.stats.bookmarks}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
