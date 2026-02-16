import Link from 'next/link';

export function FeaturesSection() {
  return (
    <section className="features-section" id="features">
      <div className="features-container">
        <div className="feature-block" data-feature="congress">
          <div className="feature-content">
            <div className="feature-visual">
              <div className="visual-container congress-visual">
                <div className="trading-feed">
                  <div className="feed-header">
                    <h4>Congressional Trading Activity</h4>
                    <span className="live-indicator"><span className="pulse-dot" /> Live</span>
                  </div>
                  <div className="feed-items">
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
              <p className="feature-text">Monitor stock purchases and sales by members of Congress with advanced filtering, real-time alerts, and detailed portfolio analysis.</p>
              <div className="feature-stats">
                <div className="stat-item"><span className="stat-value">15,000+</span><span className="stat-label">Trades Tracked</span></div>
                <div className="stat-item"><span className="stat-value">535</span><span className="stat-label">Congress Members</span></div>
                <div className="stat-item"><span className="stat-value">Real-time</span><span className="stat-label">Updates</span></div>
              </div>
              <Link href="/inside-the-capitol" className="feature-cta"><span>Explore Congressional Trading</span><i className="bi bi-arrow-right" /></Link>
            </div>
          </div>
        </div>

        <div className="feature-block reverse" data-feature="portfolio">
          <div className="feature-content">
            <div className="feature-description">
              <h2 className="feature-title">Professional-grade portfolio analytics</h2>
              <p className="feature-text">Track your investments with institutional-quality tools. Get real-time performance metrics, automated risk assessment, and asset allocation analysis.</p>
              <div className="feature-stats">
                <div className="stat-item"><span className="stat-value">Sub-100ms</span><span className="stat-label">Response Time</span></div>
                <div className="stat-item"><span className="stat-value">10+</span><span className="stat-label">Asset Classes</span></div>
                <div className="stat-item"><span className="stat-value">24/7</span><span className="stat-label">Market Data</span></div>
              </div>
              <Link href="/home-dashboard" className="feature-cta"><span>See Portfolio Tools</span><i className="bi bi-arrow-right" /></Link>
            </div>
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
                </div>
              </div>
            </div>
          </div>
        </div>

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
                  </div>
                </div>
              </div>
            </div>
            <div className="feature-description">
              <h2 className="feature-title">Uncover market-moving intelligence</h2>
              <p className="feature-text">Access government contract awards, lobbying expenditures, and patent filings. Identify opportunities before they become mainstream news.</p>
              <div className="feature-stats">
                <div className="stat-item"><span className="stat-value">5,000+</span><span className="stat-label">Contracts/Year</span></div>
                <div className="stat-item"><span className="stat-value">$3.7B</span><span className="stat-label">Lobbying Tracked</span></div>
              </div>
              <Link href="/company-research" className="feature-cta"><span>Discover Market Intelligence</span><i className="bi bi-arrow-right" /></Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
