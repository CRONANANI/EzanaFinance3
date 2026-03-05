'use client';

import Link from 'next/link';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/summary-stats-cards/summary-stats-cards.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/congressional-trading-card/congressional-trading-card.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/government-contracts-card/government-contracts-card.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/house-trading-card/house-trading-card.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/lobbying-activity-card/lobbying-activity-card.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/senator-trading-card/senator-trading-card.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/patent-momentum-card/patent-momentum-card.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/market-sentiment-card/market-sentiment-card.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/insights-section/insights-section.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/inside-the-capitol-dashboard-cards.css';
import '../../../../app-legacy/components/learning/learning-opportunities.css';

export default function InsideTheCapitolPage() {
  return (
    <div className="page-content">
      <div className="component-cards-grid">
        {/* Congressional Trading Card */}
        <div id="historicalCongressTradingCard" className="congressional-trading-card">
          <div className="congressional-trading-header">
            <h3 className="congressional-trading-title">Congressional Trading</h3>
            <div className="congressional-trading-controls">
              <button id="refreshCongressData" className="congressional-refresh-btn" title="Refresh data" type="button">
                <i className="bi bi-arrow-clockwise" />
              </button>
              <div id="congressApiStatus" className="congressional-api-status connected" title="API Connected" />
              <div className="congressional-toggle-icon">
                <i className="bi bi-chevron-down" />
              </div>
            </div>
          </div>
          <div className="congressional-stats-grid">
            <div className="congressional-stat-row">
              <span className="congressional-stat-label">Total Trades:</span>
              <span id="congressTotalTrades" className="congressional-stat-value">-</span>
            </div>
            <div className="congressional-stat-row">
              <span className="congressional-stat-label">Total Volume:</span>
              <span id="congressTotalVolume" className="congressional-stat-value">-</span>
            </div>
            <div className="congressional-stat-row">
              <span className="congressional-stat-label">Active Traders:</span>
              <span id="congressActiveTraders" className="congressional-stat-value">-</span>
            </div>
            <div className="congressional-last-updated">
              Last updated: <span id="congressLastUpdated">-</span>
            </div>
          </div>
          <div id="congressTradingExpandedContent" className="congressional-expanded-content hidden">
            <div className="congressional-trading-history">
              <h4 className="congressional-trading-history-title">Congressional Trading History</h4>
              <div className="congressional-filters">
                <button id="filter-all" className="congressional-filter-btn active" type="button">All Trades</button>
                <button id="filter-buy" className="congressional-filter-btn inactive" type="button">Buy</button>
                <button id="filter-sell" className="congressional-filter-btn inactive" type="button">Sell</button>
              </div>
            </div>
            <div className="congressional-trading-table-container">
              <table className="congressional-trading-table">
                <thead className="congressional-table-header">
                  <tr>
                    <th>Date</th>
                    <th>Follow</th>
                    <th>Congress Person</th>
                    <th>Party</th>
                    <th>Company</th>
                    <th>Ticker</th>
                    <th>Trade Type</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody id="congressTradingTableBody" className="congressional-table-body" />
              </table>
            </div>
            <div className="congressional-pagination">
              <div className="congressional-pagination-info">
                Showing <span id="congressTradesStart">1</span> to <span id="congressTradesEnd">10</span> of <span id="congressTradesTotal">0</span> trades
              </div>
              <div className="congressional-pagination-controls">
                <button id="congressPrevPage" className="congressional-pagination-btn primary" type="button">Previous</button>
                <button id="congressNextPage" className="congressional-pagination-btn primary" type="button">Next</button>
              </div>
            </div>
          </div>
        </div>

        {/* Government Contracts Card */}
        <div id="governmentContractsCard" className="government-contracts-card">
          <div className="government-contracts-header">
            <h3 className="government-contracts-title">Government Contracts</h3>
            <div className="government-contracts-controls">
              <div id="contractsApiStatus" className="government-contracts-api-status connected" title="API Connected" />
              <div className="government-contracts-pulse-indicator" />
            </div>
          </div>
          <div className="government-contracts-stats-grid">
            <div className="government-contracts-stat-row">
              <span className="government-contracts-stat-label">Total Contracts:</span>
              <span id="contractsTotal" className="government-contracts-stat-value">567</span>
            </div>
            <div className="government-contracts-stat-row">
              <span className="government-contracts-stat-label">Total Value:</span>
              <span id="contractsValue" className="government-contracts-stat-value">$1.2B</span>
            </div>
            <div className="government-contracts-stat-row">
              <span className="government-contracts-stat-label">Active Companies:</span>
              <span id="contractsCompanies" className="government-contracts-stat-value">234</span>
            </div>
            <div className="government-contracts-last-updated">
              Last updated: <span id="contractsLastUpdated">Just now</span>
            </div>
          </div>
        </div>

        {/* House Trading Card */}
        <div id="houseTradingCard" className="house-trading-card">
          <div className="house-trading-header">
            <h3 className="house-trading-title">House Trading</h3>
            <div className="house-trading-controls">
              <div id="houseApiStatus" className="house-trading-api-status connected" title="API Connected" />
              <div className="house-trading-pulse-indicator" />
            </div>
          </div>
          <div className="house-trading-stats-grid">
            <div className="house-trading-stat-row">
              <span className="house-trading-stat-label">Total Trades:</span>
              <span id="houseTotalTrades" className="house-trading-stat-value">890</span>
            </div>
            <div className="house-trading-stat-row">
              <span className="house-trading-stat-label">Total Volume:</span>
              <span id="houseTotalVolume" className="house-trading-stat-value">$32M</span>
            </div>
            <div className="house-trading-stat-row">
              <span className="house-trading-stat-label">Active Traders:</span>
              <span id="houseActiveTraders" className="house-trading-stat-value">67</span>
            </div>
            <div className="house-trading-last-updated">
              Last updated: <span id="houseLastUpdated">Just now</span>
            </div>
          </div>
        </div>

        {/* Lobbying Activity Card */}
        <div id="lobbyingActivityCard" className="lobbying-activity-card">
          <div className="lobbying-activity-header">
            <h3 className="lobbying-activity-title">Lobbying Activity</h3>
            <div className="lobbying-activity-controls">
              <div id="lobbyingApiStatus" className="lobbying-activity-api-status connected" title="API Connected" />
              <div className="lobbying-activity-pulse-indicator" />
            </div>
          </div>
          <div className="lobbying-activity-stats-grid">
            <div className="lobbying-activity-stat-row">
              <span className="lobbying-activity-stat-label">Total Reports:</span>
              <span id="lobbyingReports" className="lobbying-activity-stat-value">1,234</span>
            </div>
            <div className="lobbying-activity-stat-row">
              <span className="lobbying-activity-stat-label">Total Spending:</span>
              <span id="lobbyingSpending" className="lobbying-activity-stat-value">$89M</span>
            </div>
            <div className="lobbying-activity-stat-row">
              <span className="lobbying-activity-stat-label">Active Firms:</span>
              <span id="lobbyingFirms" className="lobbying-activity-stat-value">89</span>
            </div>
            <div className="lobbying-activity-last-updated">
              Last updated: <span id="lobbyingLastUpdated">Just now</span>
            </div>
          </div>
        </div>

        {/* Senator Trading Card */}
        <div id="senatorTradingCard" className="senator-trading-card">
          <div className="senator-trading-header">
            <h3 className="senator-trading-title">Senator Trading</h3>
            <div className="senator-trading-controls">
              <div id="senatorApiStatus" className="senator-trading-api-status connected" title="API Connected" />
              <div className="senator-trading-pulse-indicator" />
            </div>
          </div>
          <div className="senator-trading-stats-grid">
            <div className="senator-trading-stat-row">
              <span className="senator-trading-stat-label">Total Trades:</span>
              <span id="senatorTotalTrades" className="senator-trading-stat-value">456</span>
            </div>
            <div className="senator-trading-stat-row">
              <span className="senator-trading-stat-label">Total Volume:</span>
              <span id="senatorTotalVolume" className="senator-trading-stat-value">$18M</span>
            </div>
            <div className="senator-trading-stat-row">
              <span className="senator-trading-stat-label">Active Traders:</span>
              <span id="senatorActiveTraders" className="senator-trading-stat-value">23</span>
            </div>
            <div className="senator-trading-last-updated">
              Last updated: <span id="senatorLastUpdated">Just now</span>
            </div>
          </div>
        </div>

        {/* Patent Momentum Card */}
        <div id="patentMomentumCard" className="patent-momentum-card">
          <div className="patent-momentum-header">
            <h3 className="patent-momentum-title">Patent Momentum</h3>
            <div className="patent-momentum-controls">
              <div id="patentsApiStatus" className="patent-momentum-api-status connected" title="API Connected" />
              <div className="patent-momentum-pulse-indicator" />
            </div>
          </div>
          <div className="patent-momentum-stats-grid">
            <div className="patent-momentum-stat-row">
              <span className="patent-momentum-stat-label">Total Patents:</span>
              <span id="patentsTotal" className="patent-momentum-stat-value">2,345</span>
            </div>
            <div className="patent-momentum-stat-row">
              <span className="patent-momentum-stat-label">Active Patents:</span>
              <span id="patentsActive" className="patent-momentum-stat-value">1,890</span>
            </div>
            <div className="patent-momentum-stat-row">
              <span className="patent-momentum-stat-label">Pending Patents:</span>
              <span id="patentsPending" className="patent-momentum-stat-value">455</span>
            </div>
            <div className="patent-momentum-last-updated">
              Last updated: <span id="patentsLastUpdated">Just now</span>
            </div>
          </div>
        </div>

        {/* Market Sentiment Card */}
        <div id="marketSentimentCard" className="market-sentiment-card">
          <div className="market-sentiment-header">
            <h3 className="market-sentiment-title">Market Sentiment</h3>
            <div className="market-sentiment-controls">
              <div id="sentimentApiStatus" className="market-sentiment-api-status connected" title="API Connected" />
              <div className="market-sentiment-pulse-indicator" />
            </div>
          </div>
          <div className="market-sentiment-stats-grid">
            <div className="market-sentiment-stat-row">
              <span className="market-sentiment-stat-label">Overall Sentiment:</span>
              <span id="sentimentOverall" className="market-sentiment-overall bullish">Bullish</span>
            </div>
            <div className="market-sentiment-stat-row">
              <span className="market-sentiment-stat-label">Sentiment Score:</span>
              <span id="sentimentScore" className="market-sentiment-stat-value">72/100</span>
            </div>
            <div className="market-sentiment-stat-row">
              <span className="market-sentiment-stat-label">Market Indicators:</span>
              <span id="sentimentIndicators" className="market-sentiment-stat-value">8</span>
            </div>
            <div className="market-sentiment-last-updated">
              Last updated: <span id="sentimentLastUpdated">Just now</span>
            </div>
          </div>
        </div>
      </div>

      <div className="insights-section">
        <div className="insights-summary-grid">
          <div className="insights-summary-item">
            <div className="insights-summary-value primary" id="totalDataPoints">7,890</div>
            <div className="insights-summary-label">Total Data Points</div>
          </div>
          <div className="insights-summary-item">
            <div className="insights-summary-value accent" id="complianceScore">87.5%</div>
            <div className="insights-summary-label">Compliance Score</div>
          </div>
          <div className="insights-summary-item">
            <div className="insights-summary-value chart-4" id="riskLevel">Medium</div>
            <div className="insights-summary-label">Risk Level</div>
          </div>
        </div>
        <div className="insights-list" id="insightsList">
          <div className="insight-item primary">
            <div className="insight-title primary">High Trading Volume Detected</div>
            <div className="insight-description">Unusual trading activity in tech sector stocks by congressional members</div>
          </div>
          <div className="insight-item accent">
            <div className="insight-title accent">Contract Award Trends</div>
            <div className="insight-description">Defense contractors showing increased government contract wins</div>
          </div>
          <div className="insight-item chart-4">
            <div className="insight-title chart-4">Lobbying Spending Increase</div>
            <div className="insight-description">Healthcare and tech industries increasing lobbying expenditures</div>
          </div>
        </div>
      </div>

      <section className="learning-opportunities">
        <div className="learning-header">
          <div className="learning-title-area">
            <div className="learning-icon"><i className="bi bi-mortarboard-fill" /></div>
            <div className="learning-title-text">
              <h3>Political Trading Analysis</h3>
              <p>Learn to analyze and track congressional trading patterns</p>
            </div>
          </div>
          <Link href="/learning-center" className="view-all-btn">View All Courses</Link>
        </div>
        <div className="courses-grid">
          <div className="course-card">
            <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 3 hours</span></div>
            <h4 className="course-title">Congressional Trading 101</h4>
            <p className="course-description">Understand how to track, analyze, and interpret congressional stock trades for investment insights.</p>
            <div className="course-meta">
              <div className="meta-item"><i className="bi bi-book" /> 10 lessons</div>
              <div className="meta-item"><i className="bi bi-people" /> 3,124 enrolled</div>
            </div>
            <div className="course-footer"><span className="course-level beginner">Beginner</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
          <div className="course-card">
            <div className="course-header"><span className="course-type">Skill</span><span className="course-duration"><i className="bi bi-clock" /> 4 hours</span></div>
            <h4 className="course-title">Lobbying Data Analysis</h4>
            <p className="course-description">Learn to analyze lobbying expenditures and connect them to stock market movements.</p>
            <div className="course-meta">
              <div className="meta-item"><i className="bi bi-book" /> 12 lessons</div>
              <div className="meta-item"><i className="bi bi-people" /> 1,847 enrolled</div>
            </div>
            <div className="course-footer"><span className="course-level intermediate">Intermediate</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
          <div className="course-card">
            <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 5 hours</span></div>
            <h4 className="course-title">Policy Impact on Markets</h4>
            <p className="course-description">Master the art of predicting market movements based on legislative proposals and policy changes.</p>
            <div className="course-meta">
              <div className="meta-item"><i className="bi bi-book" /> 16 lessons</div>
              <div className="meta-item"><i className="bi bi-people" /> 2,456 enrolled</div>
            </div>
            <div className="course-footer"><span className="course-level advanced">Advanced</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
        </div>
      </section>
    </div>
  );
}
