'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

export function FeaturesSection() {
  const sectionRef = useRef(null);

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
                      <button type="button" className="time-btn">1D</button>
                      <button type="button" className="time-btn active">1W</button>
                      <button type="button" className="time-btn">1M</button>
                      <button type="button" className="time-btn">1Y</button>
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
                    <div className="metric-mini"><span className="metric-label">Risk Score</span><span className="metric-value">6.2<span className="metric-unit">/10</span></span></div>
                    <div className="metric-mini"><span className="metric-label">Sharpe Ratio</span><span className="metric-value">1.45</span></div>
                    <div className="metric-mini"><span className="metric-label">Dividends</span><span className="metric-value">$847<span className="metric-unit">/mo</span></span></div>
                    <div className="metric-mini"><span className="metric-label">Asset Allocation</span><span className="metric-value">Balanced</span></div>
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

        {/* 2. Congressional Trading - Ledger-style transactions */}
        <div className="feature-block reverse" data-feature="congress">
          <div className="feature-content">
            <div className="feature-visual">
              <div className="visual-container congress-visual">
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
                    <div className="trade-item">
                      <div className="trade-icon"><i className="bi bi-arrow-down-circle-fill text-red" /></div>
                      <div className="trade-details">
                        <div className="trade-header"><span className="politician-name">Tommy Tuberville</span><span className="trade-badge sale">Sale</span></div>
                        <div className="trade-info"><span className="ticker">GOOGL</span><span className="amount">$50,001 - $100,000</span></div>
                        <div className="trade-meta"><span className="timestamp">18 minutes ago</span><span className="party republican">Republican</span></div>
                      </div>
                    </div>
                    <div className="trade-item">
                      <div className="trade-icon"><i className="bi bi-arrow-up-circle-fill text-green" /></div>
                      <div className="trade-details">
                        <div className="trade-header"><span className="politician-name">Susie Lee</span><span className="trade-badge purchase">Purchase</span></div>
                        <div className="trade-info"><span className="ticker">META</span><span className="amount">$15,001 - $50,000</span></div>
                        <div className="trade-meta"><span className="timestamp">25 minutes ago</span><span className="party democrat">Democrat</span></div>
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

        {/* 3. Market Intelligence */}
        <div className="feature-block" data-feature="intelligence">
          <div className="feature-content">
            <div className="feature-visual">
              <div className="visual-container intelligence-visual">
                <div className="intelligence-dashboard">
                  <div className="intelligence-tabs">
                    <button type="button" className="intel-tab active">Contracts</button>
                    <button type="button" className="intel-tab">Lobbying</button>
                    <button type="button" className="intel-tab">Patents</button>
                  </div>
                  <div className="intel-panel">
                    <div className="intel-item">
                      <div className="intel-icon contracts"><i className="bi bi-file-earmark-text" /></div>
                      <div className="intel-content">
                        <div className="intel-title">Department of Defense</div>
                        <div className="intel-company">Lockheed Martin</div>
                        <div className="intel-amount">$450M Contract Award</div>
                        <div className="intel-meta"><span className="intel-date">2 days ago</span><span className="intel-impact high">High Impact</span></div>
                      </div>
                    </div>
                    <div className="intel-item">
                      <div className="intel-icon contracts"><i className="bi bi-file-earmark-text" /></div>
                      <div className="intel-content">
                        <div className="intel-title">NASA</div>
                        <div className="intel-company">SpaceX</div>
                        <div className="intel-amount">$1.2B Contract Award</div>
                        <div className="intel-meta"><span className="intel-date">1 week ago</span><span className="intel-impact high">High Impact</span></div>
                      </div>
                    </div>
                    <div className="intel-item">
                      <div className="intel-icon contracts"><i className="bi bi-file-earmark-text" /></div>
                      <div className="intel-content">
                        <div className="intel-title">Department of Energy</div>
                        <div className="intel-company">Tesla</div>
                        <div className="intel-amount">$85M Contract Award</div>
                        <div className="intel-meta"><span className="intel-date">2 weeks ago</span><span className="intel-impact medium">Medium Impact</span></div>
                      </div>
                    </div>
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
                      <button type="button" className="feed-action"><i className="bi bi-fire" /> Trending</button>
                      <button type="button" className="feed-action"><i className="bi bi-clock" /> Recent</button>
                    </div>
                  </div>
                  <div className="community-items">
                    <div className="community-post">
                      <div className="post-author">
                        <div className="author-avatar">JD</div>
                        <div className="author-info"><span className="author-name">John Doe</span><span className="author-badge expert">Expert Trader</span></div>
                      </div>
                      <div className="post-content"><p>Just noticed a pattern in semiconductor congressional trades. NVDA purchases up 40% this week among tech committee members...</p></div>
                      <div className="post-stats"><span className="stat"><i className="bi bi-hand-thumbs-up" /> 124</span><span className="stat"><i className="bi bi-chat" /> 38</span><span className="stat"><i className="bi bi-bookmark" /> 56</span></div>
                    </div>
                    <div className="community-post">
                      <div className="post-author">
                        <div className="author-avatar">AS</div>
                        <div className="author-info"><span className="author-name">Alex Smith</span><span className="author-badge verified">Verified</span></div>
                      </div>
                      <div className="post-content"><p>Defense contract awards correlating strongly with recent lobbying spend. Check out my detailed analysis...</p></div>
                      <div className="post-stats"><span className="stat"><i className="bi bi-hand-thumbs-up" /> 89</span><span className="stat"><i className="bi bi-chat" /> 22</span><span className="stat"><i className="bi bi-bookmark" /> 43</span></div>
                    </div>
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
