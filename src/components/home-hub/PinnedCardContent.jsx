'use client';

import Link from 'next/link';
import {
  CompanyOverview,
  StockQuote,
  KeyMetrics,
  AnalystRecommendations,
  CompanyNews,
  EarningsCard,
  CompetitorsCard,
} from '@/components/research';
import { StockHeatmap } from '@/components/company-research/StockHeatmap';

const DEFAULT_SYMBOL = 'AAPL';

export function PinnedCardContent({ cardId }) {
  switch (cardId) {
    case 'portfolio-value':
      return (
        <div className="metric-card active" data-metric="portfolio">
          <div className="metric-icon portfolio"><i className="bi bi-wallet2" /></div>
          <div className="metric-content">
            <span className="metric-label">Portfolio Value</span>
            <span className="metric-value">$158,420</span>
            <span className="metric-change positive">+24.5% YTD</span>
          </div>
        </div>
      );

    case 'recent-transactions':
      return (
        <section className="component-card transactions-card">
          <div className="card-header">
            <h3>Recent Transactions</h3>
            <button className="card-action-btn" type="button">View All</button>
          </div>
          <p className="card-description">Track your latest buys and sells with timestamps and amounts.</p>
          <div className="card-body">
            <div className="transaction-list">
              <div className="transaction-item buy">
                <div className="transaction-icon"><i className="bi bi-arrow-up-circle" /></div>
                <div className="transaction-details">
                  <div className="transaction-name">NVDA</div>
                  <div className="transaction-meta">Bought 10 shares</div>
                </div>
                <div className="transaction-amount">
                  <div className="amount">$4,850.00</div>
                  <div className="date">Today, 2:30 PM</div>
                </div>
              </div>
              <div className="transaction-item sell">
                <div className="transaction-icon"><i className="bi bi-arrow-down-circle" /></div>
                <div className="transaction-details">
                  <div className="transaction-name">TSLA</div>
                  <div className="transaction-meta">Sold 5 shares</div>
                </div>
                <div className="transaction-amount">
                  <div className="amount">$1,245.50</div>
                  <div className="date">Yesterday, 10:15 AM</div>
                </div>
              </div>
              <div className="transaction-item buy">
                <div className="transaction-icon"><i className="bi bi-arrow-up-circle" /></div>
                <div className="transaction-details">
                  <div className="transaction-name">AAPL</div>
                  <div className="transaction-meta">Bought 15 shares</div>
                </div>
                <div className="transaction-amount">
                  <div className="amount">$2,730.00</div>
                  <div className="date">2 days ago</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      );

    case 'congressional-trading':
      return (
        <div id="historicalCongressTradingCard" className="congressional-trading-card">
          <div className="congressional-trading-header">
            <h3 className="congressional-trading-title">Congressional Trading</h3>
            <div className="congressional-trading-controls">
              <button id="refreshCongressData" className="congressional-refresh-btn" title="Refresh data" type="button"><i className="bi bi-arrow-clockwise" /></button>
              <div id="congressApiStatus" className="congressional-api-status connected" title="API Connected" />
              <div className="congressional-toggle-icon"><i className="bi bi-chevron-down" /></div>
            </div>
          </div>
          <div className="congressional-stats-grid">
            <div className="congressional-stat-row"><span className="congressional-stat-label">Total Trades:</span><span id="congressTotalTrades" className="congressional-stat-value">-</span></div>
            <div className="congressional-stat-row"><span className="congressional-stat-label">Total Volume:</span><span id="congressTotalVolume" className="congressional-stat-value">-</span></div>
            <div className="congressional-stat-row"><span className="congressional-stat-label">Active Traders:</span><span id="congressActiveTraders" className="congressional-stat-value">-</span></div>
            <div className="congressional-last-updated">Last updated: <span id="congressLastUpdated">-</span></div>
          </div>
        </div>
      );

    case 'top-holdings':
      return (
        <section className="component-card holdings-card">
          <div className="card-header">
            <h3>Top Holdings</h3>
            <button className="card-action-btn" type="button">Manage</button>
          </div>
          <p className="card-description">Your largest positions ranked by portfolio allocation percentage.</p>
          <div className="card-body">
            <div className="holdings-list">
              <div className="holding-item" data-symbol="NVDA" data-shares="150">
                <div className="holding-rank">1</div>
                <div className="holding-info"><div className="holding-name">NVDA</div><div className="holding-shares">150 shares</div></div>
                <div className="holding-value"><div className="value holding-value-display">$72,850</div><div className="change holding-change-display positive">+12.4%</div></div>
                <div className="holding-allocation"><div className="allocation-bar"><div className="allocation-fill" style={{ width: '28%' }} /></div><span className="allocation-percent">28%</span></div>
              </div>
              <div className="holding-item" data-symbol="AAPL" data-shares="200">
                <div className="holding-rank">2</div>
                <div className="holding-info"><div className="holding-name">AAPL</div><div className="holding-shares">200 shares</div></div>
                <div className="holding-value"><div className="value holding-value-display">$36,400</div><div className="change holding-change-display positive">+5.2%</div></div>
                <div className="holding-allocation"><div className="allocation-bar"><div className="allocation-fill" style={{ width: '18%' }} /></div><span className="allocation-percent">18%</span></div>
              </div>
              <div className="holding-item" data-symbol="MSFT" data-shares="85">
                <div className="holding-rank">3</div>
                <div className="holding-info"><div className="holding-name">MSFT</div><div className="holding-shares">85 shares</div></div>
                <div className="holding-value"><div className="value holding-value-display">$32,045</div><div className="change holding-change-display positive">+3.8%</div></div>
                <div className="holding-allocation"><div className="allocation-bar"><div className="allocation-fill" style={{ width: '15%' }} /></div><span className="allocation-percent">15%</span></div>
              </div>
            </div>
          </div>
        </section>
      );

    case 'performance-summary':
      return (
        <section className="component-card performance-card">
          <div className="card-header">
            <h3>Performance Summary</h3>
            <select className="time-select"><option>This Month</option><option>This Quarter</option><option>This Year</option></select>
          </div>
          <p className="card-description">See how your portfolio performed over different time periods with key metrics.</p>
          <div className="card-body">
            <div className="performance-metrics">
              <div className="perf-metric"><div className="perf-label">Total Return</div><div className="perf-value positive">+8.4%</div><div className="perf-comparison">vs S&P 500: +6.2%</div></div>
              <div className="perf-metric"><div className="perf-label">Total Gain/Loss</div><div className="perf-value positive">+$12,847</div><div className="perf-comparison">+6.8% of initial investment</div></div>
              <div className="perf-metric"><div className="perf-label">Best Day</div><div className="perf-value">+$2,145</div><div className="perf-comparison">December 15, 2025</div></div>
              <div className="perf-metric"><div className="perf-label">Dividend Income</div><div className="perf-value">$2,541</div><div className="perf-comparison">+12% vs last period</div></div>
            </div>
          </div>
        </section>
      );

    case 'alerts-recommendations':
      return (
        <section className="component-card alerts-card">
          <div className="card-header"><h3>Alerts &amp; Recommendations</h3><span className="alert-count">3 New</span></div>
          <p className="card-description">Smart notifications for rebalancing, opportunities, and important events.</p>
          <div className="card-body">
            <div className="alerts-list">
              <div className="alert-item high">
                <div className="alert-priority"><i className="bi bi-exclamation-circle" /></div>
                <div className="alert-content">
                  <div className="alert-title">Rebalancing Suggested</div>
                  <div className="alert-message">Your tech allocation (35%) exceeds target (30%). Consider reducing exposure.</div>
                </div>
                <button className="alert-action" type="button">Review</button>
              </div>
              <div className="alert-item medium">
                <div className="alert-priority"><i className="bi bi-lightbulb" /></div>
                <div className="alert-content">
                  <div className="alert-title">Buy Opportunity</div>
                  <div className="alert-message">AAPL is down 3.2% today. Good entry point based on your strategy.</div>
                </div>
                <button className="alert-action" type="button">View</button>
              </div>
              <div className="alert-item low">
                <div className="alert-priority"><i className="bi bi-info-circle" /></div>
                <div className="alert-content">
                  <div className="alert-title">Dividend Payment</div>
                  <div className="alert-message">You&apos;ll receive $847 in dividends on October 15th from 5 holdings.</div>
                </div>
                <button className="alert-action" type="button">Details</button>
              </div>
            </div>
          </div>
        </section>
      );

    case 'government-contracts':
      return (
        <div id="governmentContractsCard" className="government-contracts-card">
          <div className="government-contracts-header">
            <h3 className="government-contracts-title">Government Contracts</h3>
            <div className="government-contracts-controls">
              <div id="contractsApiStatus" className="government-contracts-api-status connected" title="API Connected" />
              <div className="government-contracts-pulse-indicator" />
            </div>
          </div>
          <div className="government-contracts-stats-grid">
            <div className="government-contracts-stat-row"><span className="government-contracts-stat-label">Total Contracts:</span><span id="contractsTotal" className="government-contracts-stat-value">567</span></div>
            <div className="government-contracts-stat-row"><span className="government-contracts-stat-label">Total Value:</span><span id="contractsValue" className="government-contracts-stat-value">$1.2B</span></div>
            <div className="government-contracts-stat-row"><span className="government-contracts-stat-label">Active Companies:</span><span id="contractsCompanies" className="government-contracts-stat-value">234</span></div>
            <div className="government-contracts-last-updated">Last updated: <span id="contractsLastUpdated">Just now</span></div>
          </div>
        </div>
      );

    case 'house-trading':
      return (
        <div id="houseTradingCard" className="house-trading-card">
          <div className="house-trading-header">
            <h3 className="house-trading-title">House Trading</h3>
            <div className="house-trading-controls">
              <div id="houseApiStatus" className="house-trading-api-status connected" title="API Connected" />
              <div className="house-trading-pulse-indicator" />
            </div>
          </div>
          <div className="house-trading-stats-grid">
            <div className="house-trading-stat-row"><span className="house-trading-stat-label">Total Trades:</span><span id="houseTotalTrades" className="house-trading-stat-value">890</span></div>
            <div className="house-trading-stat-row"><span className="house-trading-stat-label">Total Volume:</span><span id="houseTotalVolume" className="house-trading-stat-value">$32M</span></div>
            <div className="house-trading-stat-row"><span className="house-trading-stat-label">Active Traders:</span><span id="houseActiveTraders" className="house-trading-stat-value">67</span></div>
            <div className="house-trading-last-updated">Last updated: <span id="houseLastUpdated">Just now</span></div>
          </div>
        </div>
      );

    case 'senator-trading':
      return (
        <div id="senatorTradingCard" className="senator-trading-card">
          <div className="senator-trading-header">
            <h3 className="senator-trading-title">Senator Trading</h3>
            <div className="senator-trading-controls">
              <div id="senatorApiStatus" className="senator-trading-api-status connected" title="API Connected" />
              <div className="senator-trading-pulse-indicator" />
            </div>
          </div>
          <div className="senator-trading-stats-grid">
            <div className="senator-trading-stat-row"><span className="senator-trading-stat-label">Total Trades:</span><span id="senatorTotalTrades" className="senator-trading-stat-value">456</span></div>
            <div className="senator-trading-stat-row"><span className="senator-trading-stat-label">Total Volume:</span><span id="senatorTotalVolume" className="senator-trading-stat-value">$18M</span></div>
            <div className="senator-trading-stat-row"><span className="senator-trading-stat-label">Active Traders:</span><span id="senatorActiveTraders" className="senator-trading-stat-value">23</span></div>
            <div className="senator-trading-last-updated">Last updated: <span id="senatorLastUpdated">Just now</span></div>
          </div>
        </div>
      );

    case 'lobbying-activity':
      return (
        <div id="lobbyingActivityCard" className="lobbying-activity-card">
          <div className="lobbying-activity-header">
            <h3 className="lobbying-activity-title">Lobbying Activity</h3>
            <div className="lobbying-activity-controls">
              <div id="lobbyingApiStatus" className="lobbying-activity-api-status connected" title="API Connected" />
              <div className="lobbying-activity-pulse-indicator" />
            </div>
          </div>
          <div className="lobbying-activity-stats-grid">
            <div className="lobbying-activity-stat-row"><span className="lobbying-activity-stat-label">Total Reports:</span><span id="lobbyingReports" className="lobbying-activity-stat-value">1,234</span></div>
            <div className="lobbying-activity-stat-row"><span className="lobbying-activity-stat-label">Total Spending:</span><span id="lobbyingSpending" className="lobbying-activity-stat-value">$89M</span></div>
            <div className="lobbying-activity-stat-row"><span className="lobbying-activity-stat-label">Active Firms:</span><span id="lobbyingFirms" className="lobbying-activity-stat-value">89</span></div>
            <div className="lobbying-activity-last-updated">Last updated: <span id="lobbyingLastUpdated">Just now</span></div>
          </div>
        </div>
      );

    case 'patent-momentum':
      return (
        <div id="patentMomentumCard" className="patent-momentum-card">
          <div className="patent-momentum-header">
            <h3 className="patent-momentum-title">Patent Momentum</h3>
            <div className="patent-momentum-controls">
              <div id="patentsApiStatus" className="patent-momentum-api-status connected" title="API Connected" />
              <div className="patent-momentum-pulse-indicator" />
            </div>
          </div>
          <div className="patent-momentum-stats-grid">
            <div className="patent-momentum-stat-row"><span className="patent-momentum-stat-label">Total Patents:</span><span id="patentsTotal" className="patent-momentum-stat-value">2,345</span></div>
            <div className="patent-momentum-stat-row"><span className="patent-momentum-stat-label">Active Patents:</span><span id="patentsActive" className="patent-momentum-stat-value">1,890</span></div>
            <div className="patent-momentum-stat-row"><span className="patent-momentum-stat-label">Pending Patents:</span><span id="patentsPending" className="patent-momentum-stat-value">455</span></div>
            <div className="patent-momentum-last-updated">Last updated: <span id="patentsLastUpdated">Just now</span></div>
          </div>
        </div>
      );

    case 'market-sentiment':
      return (
        <div id="marketSentimentCard" className="market-sentiment-card">
          <div className="market-sentiment-header">
            <h3 className="market-sentiment-title">Market Sentiment</h3>
            <div className="market-sentiment-controls">
              <div id="sentimentApiStatus" className="market-sentiment-api-status connected" title="API Connected" />
              <div className="market-sentiment-pulse-indicator" />
            </div>
          </div>
          <div className="market-sentiment-stats-grid">
            <div className="market-sentiment-stat-row"><span className="market-sentiment-stat-label">Overall Sentiment:</span><span id="sentimentOverall" className="market-sentiment-overall bullish">Bullish</span></div>
            <div className="market-sentiment-stat-row"><span className="market-sentiment-stat-label">Sentiment Score:</span><span id="sentimentScore" className="market-sentiment-stat-value">72/100</span></div>
            <div className="market-sentiment-stat-row"><span className="market-sentiment-stat-label">Market Indicators:</span><span id="sentimentIndicators" className="market-sentiment-stat-value">8</span></div>
            <div className="market-sentiment-last-updated">Last updated: <span id="sentimentLastUpdated">Just now</span></div>
          </div>
        </div>
      );

    case 'company-overview':
      return <CompanyOverview symbol={DEFAULT_SYMBOL} />;
    case 'stock-quote':
      return <StockQuote symbol={DEFAULT_SYMBOL} />;
    case 'key-metrics':
      return <KeyMetrics symbol={DEFAULT_SYMBOL} />;
    case 'analyst-recommendations':
      return <AnalystRecommendations symbol={DEFAULT_SYMBOL} />;
    case 'company-news':
      return <CompanyNews symbol={DEFAULT_SYMBOL} className="lg:col-span-2" />;
    case 'earnings-card':
      return <EarningsCard symbol={DEFAULT_SYMBOL} />;
    case 'competitors-card':
      return <CompetitorsCard symbol={DEFAULT_SYMBOL} onSelectPeer={() => {}} />;

    case 'stock-heatmap':
      return (
        <div>
          <div className="chart-header compact">
            <div className="chart-title-area">
              <h2 className="chart-title">Stock Market Heatmap</h2>
              <span className="heatmap-subtitle">S&amp;P 500 · Performance YTD % · Market Cap</span>
            </div>
          </div>
          <div className="heatmap-container" id="heatmapContainer">
            <StockHeatmap onSelectStock={() => {}} />
          </div>
        </div>
      );

    case 'global-capital-markets':
      return (
        <aside className="map-panel">
          <div className="map-header">
            <h2 className="map-title"><i className="bi bi-globe2" /> Global Capital Markets</h2>
            <div className="map-controls">
              <div className="map-layers">
                <span className="layer-label">Layers</span>
                {['Markets', 'Central Banks', 'Indices', 'Commodities'].map((l) => (
                  <button key={l} type="button" className="layer-btn">{l}</button>
                ))}
              </div>
              <div className="map-time-range">
                <select className="time-range-select"><option value="24h">24h</option><option value="7d">7d</option><option value="30d">30d</option></select>
              </div>
            </div>
          </div>
          <div className="map-container">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Equirectangular_projection_SW.jpg/1200px-Equirectangular_projection_SW.jpg" alt="World Map" className="world-map-img" />
          </div>
        </aside>
      );

    case 'quant-model':
      return (
        <div className="component-card full-width quant-model-card">
          <div className="card-header">
            <h3><i className="bi bi-graph-up" /> Quantitative Model Analysis</h3>
            <div className="model-controls">
              <select className="model-selector" id="quantModelSelect">
                <option value="momentum">Momentum Strategy</option>
                <option value="mean-reversion">Mean Reversion</option>
                <option value="statistical-arbitrage">Statistical Arbitrage</option>
              </select>
              <button className="card-action-btn" type="button"><i className="bi bi-play-circle" /> Run Backtest</button>
            </div>
          </div>
          <div className="card-body">
            <div className="model-chart-container">
              <div className="chart-placeholder">
                <div className="chart-header">
                  <div className="chart-title"><span className="model-name">Momentum Strategy</span><span className="model-status active">Active</span></div>
                  <div className="chart-metrics">
                    <div className="metric-pill"><span className="metric-label">Returns:</span><span className="metric-value positive">+32.4%</span></div>
                    <div className="metric-pill"><span className="metric-label">Sharpe:</span><span className="metric-value">2.1</span></div>
                    <div className="metric-pill"><span className="metric-label">Max DD:</span><span className="metric-value negative">-8.3%</span></div>
                  </div>
                </div>
                <div className="chart-area">
                  <svg viewBox="0 0 800 300" className="performance-chart">
                    <defs>
                      <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: 'var(--primary)', stopOpacity: 0.3 }} />
                        <stop offset="100%" style={{ stopColor: 'var(--primary)', stopOpacity: 0 }} />
                      </linearGradient>
                    </defs>
                    <path d="M 0 250 L 100 240 L 200 200 L 300 180 L 400 150 L 500 120 L 600 100 L 700 80 L 800 50" fill="url(#chartGradient)" stroke="var(--primary)" strokeWidth="2" />
                  </svg>
                </div>
                <div className="model-parameters">
                  <div className="param-group"><span className="param-label">Lookback Period:</span><span className="param-value">20 days</span></div>
                  <div className="param-group"><span className="param-label">Rebalance Frequency:</span><span className="param-value">Weekly</span></div>
                  <div className="param-group"><span className="param-label">Universe Size:</span><span className="param-value">500 stocks</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case 'backtesting-engine':
      return (
        <div className="component-card">
          <div className="card-header"><h3><i className="bi bi-clock-history" /> Backtesting Engine</h3></div>
          <div className="card-body">
            <p>Test your strategies on historical data with transaction costs and slippage.</p>
            <div className="tool-stats">
              <div className="tool-stat"><span className="stat-label">Tests Run:</span><span className="stat-value">847</span></div>
              <div className="tool-stat"><span className="stat-label">Avg Time:</span><span className="stat-value">2.3s</span></div>
            </div>
          </div>
          <div className="card-footer"><button className="card-action-btn" type="button">Launch Tool</button></div>
        </div>
      );

    case 'statistical-analysis':
      return (
        <div className="component-card">
          <div className="card-header"><h3><i className="bi bi-bar-chart" /> Statistical Analysis</h3></div>
          <div className="card-body">
            <p>Advanced statistical tests, correlation analysis, and time series modeling.</p>
            <div className="tool-stats">
              <div className="tool-stat"><span className="stat-label">Datasets:</span><span className="stat-value">12</span></div>
              <div className="tool-stat"><span className="stat-label">Variables:</span><span className="stat-value">48</span></div>
            </div>
          </div>
          <div className="card-footer"><button className="card-action-btn" type="button">Launch Tool</button></div>
        </div>
      );

    case 'ml-predictions':
      return (
        <div className="component-card">
          <div className="card-header"><h3><i className="bi bi-cpu" /> ML Predictions</h3></div>
          <div className="card-body">
            <p>Train machine learning models on market data for price predictions.</p>
            <div className="tool-stats">
              <div className="tool-stat"><span className="stat-label">Accuracy:</span><span className="stat-value">68.4%</span></div>
              <div className="tool-stat"><span className="stat-label">Models:</span><span className="stat-value">5</span></div>
            </div>
          </div>
          <div className="card-footer"><button className="card-action-btn" type="button">Launch Tool</button></div>
        </div>
      );

    case 'portfolio-optimization':
      return (
        <div className="component-card">
          <div className="card-header"><h3><i className="bi bi-pie-chart" /> Portfolio Optimization</h3></div>
          <div className="card-body">
            <p>Efficient frontier analysis, risk parity, and mean-variance optimization.</p>
            <table className="data-table compact">
              <thead><tr><th>Asset</th><th>Weight</th><th>Return</th><th>Risk</th></tr></thead>
              <tbody>
                <tr><td>SPY</td><td>35%</td><td className="positive">+12.3%</td><td>14.2%</td></tr>
                <tr><td>QQQ</td><td>30%</td><td className="positive">+18.7%</td><td>18.9%</td></tr>
                <tr><td>TLT</td><td>20%</td><td className="positive">+3.2%</td><td>8.1%</td></tr>
                <tr><td>GLD</td><td>15%</td><td className="positive">+7.8%</td><td>12.4%</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      );

    case 'risk-analytics':
      return (
        <div className="component-card">
          <div className="card-header"><h3><i className="bi bi-shield-check" /> Risk Analytics</h3></div>
          <div className="card-body">
            <p>VaR, CVaR, stress testing, and scenario analysis for portfolio risk management.</p>
            <div className="risk-metrics">
              <div className="risk-metric"><span className="metric-name">Value at Risk (95%):</span><span className="metric-value negative">-2.4%</span></div>
              <div className="risk-metric"><span className="metric-name">Conditional VaR:</span><span className="metric-value negative">-3.8%</span></div>
              <div className="risk-metric"><span className="metric-name">Beta:</span><span className="metric-value">0.92</span></div>
              <div className="risk-metric"><span className="metric-name">Correlation to S&amp;P:</span><span className="metric-value">0.87</span></div>
            </div>
          </div>
        </div>
      );

    case 'recent-activity':
      return (
        <div className="component-card recent-activity-card">
          <div className="card-header">
            <h3><i className="bi bi-activity" /> Recent Activity</h3>
            <button className="card-action-btn" id="addMemberBtn" type="button">Add Source</button>
          </div>
          <div className="card-body recent-activity-body">
            <aside className="filters-sidebar" id="filtersSidebar">
              <div className="filters-header"><span className="filters-title">Filters</span><button type="button" className="filters-clear-btn" title="Clear all">Clear all</button></div>
              <div className="filters-presets">
                <span className="filters-section-label">Presets</span>
                <button type="button" className="preset-btn" data-preset="congress">Congress Watch</button>
                <button type="button" className="preset-btn" data-preset="institutional">Institutional Moves</button>
                <button type="button" className="preset-btn" data-preset="insider">Insider Buying</button>
              </div>
            </aside>
            <div className="activity-content">
              <div className="members-list" id="activityList">
                <div className="member-item">
                  <div className="member-avatar">NP</div>
                  <div className="member-info"><div className="member-name">Nancy Pelosi</div><div className="member-meta">House · Democrat · CA · NVDA · 2d ago</div></div>
                  <div className="member-stats"><div className="stat-small"><span className="stat-value">$1.2M</span><span className="stat-label">buy</span></div><div className="stat-small"><span className="stat-value positive">+18%</span><span className="stat-label">return</span></div></div>
                </div>
                <div className="member-item">
                  <div className="member-avatar">DC</div>
                  <div className="member-info"><div className="member-name">Dan Crenshaw</div><div className="member-meta">House · Republican · TX · AAPL · 5d ago</div></div>
                  <div className="member-stats"><div className="stat-small"><span className="stat-value">$450K</span><span className="stat-label">buy</span></div><div className="stat-small"><span className="stat-value positive">+12%</span><span className="stat-label">return</span></div></div>
                </div>
                <div className="member-item">
                  <div className="member-avatar">CT</div>
                  <div className="member-info"><div className="member-name">Citadel Advisors</div><div className="member-meta">Hedge Fund · 13F · NVDA · New position</div></div>
                  <div className="member-stats"><div className="stat-small"><span className="stat-value">$42M</span><span className="stat-label">added</span></div><div className="stat-small"><span className="stat-value positive">+15%</span><span className="stat-label">return</span></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case 'stock-watchlist':
      return (
        <div className="component-card stock-watchlist-card stock-watchlist-template">
          <div className="stock-watchlist-header">
            <h3 className="stock-watchlist-title">Watchlist</h3>
            <div className="stock-watchlist-header-actions">
              <button className="stock-watchlist-dropdown-btn" type="button"><span>My Watchlist</span><i className="bi bi-chevron-down" /></button>
            </div>
          </div>
          <div className="stock-watchlist-body">
            <div className="watchlist-categories">
              <div className="watchlist-category expanded">
                <button type="button" className="watchlist-category-toggle"><span className="category-title">Top 10 hot</span><span className="category-count">6 items</span><i className="bi bi-chevron-up" /></button>
                <div className="watchlist-category-items">
                  <div className="watchlist-stock-item" data-symbol="NVDA">
                    <div className="stock-item-icon insight-icon positive"><i className="bi bi-graph-up-arrow" /></div>
                    <div className="stock-item-info"><span className="stock-item-symbol">NVDA</span></div>
                    <div className="stock-item-price"><span className="watchlist-price">$485.20</span><span className="watchlist-change positive">+$12.40</span></div>
                  </div>
                  <div className="watchlist-stock-item" data-symbol="AAPL">
                    <div className="stock-item-icon insight-icon positive"><i className="bi bi-graph-up-arrow" /></div>
                    <div className="stock-item-info"><span className="stock-item-symbol">AAPL</span></div>
                    <div className="stock-item-price"><span className="watchlist-price">$182.30</span><span className="watchlist-change positive">+$2.10</span></div>
                  </div>
                  <div className="watchlist-stock-item" data-symbol="TSLA">
                    <div className="stock-item-icon insight-icon negative"><i className="bi bi-graph-down-arrow" /></div>
                    <div className="stock-item-info"><span className="stock-item-symbol">TSLA</span></div>
                    <div className="stock-item-price"><span className="watchlist-price">$248.50</span><span className="watchlist-change negative">-$8.20</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );

    case 'price-alerts':
      return (
        <div className="component-card full-width price-alerts-card">
          <div className="card-header"><h3><i className="bi bi-bell-fill" /> Active Price Alerts</h3><button className="card-action-btn" type="button">New Alert</button></div>
          <div className="card-body">
            <div className="alerts-list">
              <div className="alert-item">
                <div className="alert-icon success"><i className="bi bi-check-circle" /></div>
                <div className="alert-content"><div className="alert-title">NVDA reached $485</div><div className="alert-meta">Target price hit · 2 hours ago</div></div>
                <button className="alert-dismiss" type="button"><i className="bi bi-x" /></button>
              </div>
              <div className="alert-item">
                <div className="alert-icon warning"><i className="bi bi-exclamation-triangle" /></div>
                <div className="alert-content"><div className="alert-title">TSLA dropped below $250</div><div className="alert-meta">Stop loss triggered · 4 hours ago</div></div>
                <button className="alert-dismiss" type="button"><i className="bi bi-x" /></button>
              </div>
              <div className="alert-item pending">
                <div className="alert-icon info"><i className="bi bi-clock" /></div>
                <div className="alert-content"><div className="alert-title">AAPL above $185</div><div className="alert-meta">Pending · Current: $182.30</div></div>
                <button className="alert-edit" type="button"><i className="bi bi-pencil" /></button>
              </div>
            </div>
          </div>
        </div>
      );

    case 'community-feed':
      return (
        <div className="component-card community-feed-card">
          <div className="card-header"><h3><i className="bi bi-chat-square-text" /> Community Feed</h3></div>
          <div className="card-body">
            <div className="community-feed-filters">
              <button type="button" className="feed-filter-btn active">Trending</button>
              <button type="button" className="feed-filter-btn">Followed</button>
              <button type="button" className="feed-filter-btn">Explore</button>
            </div>
            <div className="community-feed-threads">
              <article className="feed-thread-card">
                <div className="thread-meta-top"><div className="thread-author"><div className="thread-avatar">AS</div><span className="thread-author-name">Aakash Sharma</span></div><span className="thread-topic-tag">Portfolio Tips</span></div>
                <h4 className="thread-title">What are some effective strategies to stay productive with market research?</h4>
                <p className="thread-preview">I&apos;ve been struggling to keep up with sector rotations...</p>
                <div className="thread-engagement"><span className="thread-time">2 Hrs Ago</span><span className="thread-stat"><i className="bi bi-heart-fill" /> 20</span><span className="thread-stat"><i className="bi bi-chat" /> 8</span></div>
              </article>
              <article className="feed-thread-card">
                <div className="thread-meta-top"><div className="thread-author"><div className="thread-avatar">NR</div><span className="thread-author-name">Nidhi Rao</span></div><span className="thread-topic-tag">Congressional Trading</span></div>
                <h4 className="thread-title">Best practices for interpreting 13F filings</h4>
                <p className="thread-preview">New to following institutional moves...</p>
                <div className="thread-engagement"><span className="thread-time">3 Hrs Ago</span><span className="thread-stat"><i className="bi bi-heart-fill" /> 35</span><span className="thread-stat"><i className="bi bi-chat" /> 9</span></div>
              </article>
            </div>
          </div>
        </div>
      );

    case 'my-friends':
      return (
        <div className="component-card my-friends-card">
          <div className="card-header"><h3><i className="bi bi-people-fill" /> My Friends</h3><button type="button" className="add-friend-btn"><i className="bi bi-person-plus" /> Add a new friend</button></div>
          <div className="card-body">
            <div className="league-tiers">
              <div className="league-hexagon league-unlocked" title="Ruby League"><i className="bi bi-gem" /></div>
              <div className="league-hexagon league-current" title="Emerald League"><i className="bi bi-gem" /></div>
              <div className="league-hexagon league-locked" title="Locked"><i className="bi bi-lock" /></div>
            </div>
            <div className="league-title">Emerald League</div>
            <div className="user-stats-row">
              <div className="user-stat-card"><i className="bi bi-fire text-primary" /><span className="user-stat-value">354</span><span className="user-stat-label">days</span></div>
              <div className="user-stat-card"><i className="bi bi-gem" /><span className="user-stat-value">Emerald</span><span className="user-stat-label">League</span></div>
            </div>
            <div className="friends-ranked-list">
              <div className="friend-rank-item"><div className="friend-rank-badge rank-1"><i className="bi bi-trophy-fill" /></div><div className="friend-avatar">EM</div><div className="friend-info"><span className="friend-name">Eric Morrison</span><span className="friend-streak"><i className="bi bi-fire" /> 410 days</span></div></div>
              <div className="friend-rank-item"><div className="friend-rank-badge rank-2"><i className="bi bi-trophy-fill" /></div><div className="friend-avatar">JM</div><div className="friend-info"><span className="friend-name">Joseph Morrison</span><span className="friend-streak"><i className="bi bi-fire" /> 328 days</span></div></div>
            </div>
          </div>
        </div>
      );

    case 'friends-activity':
      return (
        <div className="component-card friends-activity-card">
          <div className="card-header"><h3><i className="bi bi-activity" /> Friends Activity</h3></div>
          <div className="card-body">
            <p className="text-muted-foreground mb-6">Track your friends&apos; investment activities and engagement</p>
            <div className="space-y-4 max-h-48 overflow-y-auto">
              <div className="flex items-start space-x-4 p-3 rounded-xl hover:bg-muted transition-colors">
                <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center flex-shrink-0"><i className="bi bi-graph-up text-primary-foreground text-sm" /></div>
                <div className="flex-1"><p className="text-sm text-foreground"><span className="font-medium">Alex Johnson</span> made a new investment in <span className="text-primary font-medium">TSLA</span></p><p className="text-xs text-muted-foreground">2 hours ago</p></div>
              </div>
              <div className="flex items-start space-x-4 p-3 rounded-xl hover:bg-muted transition-colors">
                <div className="w-8 h-8 bg-accent rounded-xl flex items-center justify-center flex-shrink-0"><i className="bi bi-heart text-accent-foreground text-sm" /></div>
                <div className="flex-1"><p className="text-sm text-foreground"><span className="font-medium">Sarah Chen</span> liked your post about <span className="text-accent font-medium">market analysis</span></p><p className="text-xs text-muted-foreground">4 hours ago</p></div>
              </div>
            </div>
            <Link href="/community" className="block w-full bg-chart-5 text-chart-2 py-3 rounded-xl hover:bg-opacity-90 transition-colors text-sm font-medium mt-4 text-center">View Full Activity</Link>
          </div>
        </div>
      );

    case 'active-discussions':
      return (
        <div className="component-card active-discussions-card">
          <div className="card-header"><h3><i className="bi bi-chat-dots" /> Active Discussions</h3></div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="p-4 border border-border rounded-lg hover:bg-muted transition-colors">
                <h4 className="font-semibold text-foreground">Q1 2024 Tech Stock Predictions</h4>
                <p className="text-sm text-muted-foreground">by Alex Johnson · 2 hours ago</p>
                <p className="text-muted-foreground text-sm">What are everyone&apos;s thoughts on the tech sector for Q1?</p>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-2"><i className="bi bi-chat" /><span>23</span><i className="bi bi-heart" /><span>45</span></div>
              </div>
              <div className="p-4 border border-border rounded-lg hover:bg-muted transition-colors">
                <h4 className="font-semibold text-foreground">Best Dividend Stocks for 2024</h4>
                <p className="text-sm text-muted-foreground">by Sarah Chen · 5 hours ago</p>
                <p className="text-muted-foreground text-sm">Looking for stable dividend-paying stocks.</p>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-2"><i className="bi bi-chat" /><span>18</span><i className="bi bi-heart" /><span>32</span></div>
              </div>
            </div>
          </div>
        </div>
      );

    case 'leaderboard':
      return (
        <div className="component-card leaderboard-card">
          <div className="card-header"><h3><i className="bi bi-trophy" /> Leaderboard</h3></div>
          <div className="card-body">
            <p className="text-muted-foreground mb-4 text-sm">Top performers this month</p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center"><i className="bi bi-trophy-fill text-white" /></div>
                <div className="flex-1"><div className="text-sm font-bold text-gray-900 dark:text-white">Emma Wilson</div><div className="text-xs text-gray-600 dark:text-gray-400">+34.5% return</div></div>
                <div className="text-right"><div className="text-xs font-bold text-yellow-600 dark:text-yellow-400">#1</div></div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center"><span className="text-foreground text-xs font-bold">2</span></div>
                <div className="flex-1"><div className="text-sm font-medium text-foreground">David Kim</div><div className="text-xs text-muted-foreground">+28.2% return</div></div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-accent/30 rounded-lg border border-primary/30">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center"><span className="text-primary-foreground text-xs font-bold">127</span></div>
                <div className="flex-1"><div className="text-sm font-medium text-foreground">You</div><div className="text-xs text-muted-foreground">+12.4% return</div></div>
              </div>
            </div>
          </div>
        </div>
      );

    case 'community-insights':
      return (
        <div className="component-card community-insights-card">
          <div className="card-header"><h3><i className="bi bi-bar-chart" /> Community Insights</h3></div>
          <div className="card-body">
            <div className="community-insights-grid">
              <div className="text-center insight-item">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3"><i className="bi bi-graph-up text-primary text-2xl" /></div>
                <h4 className="font-semibold text-foreground mb-2">Most Discussed Stock</h4>
                <div className="text-2xl font-bold text-primary">NVDA</div>
                <div className="text-sm text-muted-foreground">89 mentions this week</div>
              </div>
              <div className="text-center insight-item">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3"><i className="bi bi-trending-up text-primary text-2xl" /></div>
                <h4 className="font-semibold text-foreground mb-2">Trending Topic</h4>
                <div className="text-lg font-bold text-primary">AI Stocks</div>
                <div className="text-sm text-muted-foreground">156 discussions</div>
              </div>
            </div>
          </div>
        </div>
      );

    case 'learning-course-table':
      return (
        <div className="learning-course-table-card">
          <div className="course-table-wrap">
            <table className="learning-course-table">
              <thead>
                <tr><th>Course Name</th><th>Instructor</th><th>Progress</th><th>Level</th><th>Next Assignment</th><th>Action</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Portfolio Management Fundamentals</strong></td>
                  <td><div className="instructor-cell"><span className="instructor-avatar">WC</span> Warren Chen, CFA</div></td>
                  <td><div className="progress-cell"><div className="progress-bar-inline"><div className="progress-fill" style={{ width: '70%' }} /></div><span>70%</span></div></td>
                  <td><span className="level-badge beginner">Beginner</span></td>
                  <td>Lesson 9 · Apr 27, 2026</td>
                  <td><button className="btn-icon" title="Settings" type="button"><i className="bi bi-gear" /></button></td>
                </tr>
                <tr>
                  <td><strong>Risk Management Strategies</strong></td>
                  <td><div className="instructor-cell"><span className="instructor-avatar">SM</span> Sarah Miller, FRM</div></td>
                  <td><div className="progress-cell"><div className="progress-bar-inline"><div className="progress-fill" style={{ width: '40%' }} /></div><span>40%</span></div></td>
                  <td><span className="level-badge intermediate">Intermediate</span></td>
                  <td>Lesson 8 · Apr 28, 2026</td>
                  <td><button className="btn-icon" title="Settings" type="button"><i className="bi bi-gear" /></button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );

    case 'learning-achievements':
      return (
        <div className="learning-achievements-card">
          <div className="achievement-row"><div className="achievement-icon blue"><i className="bi bi-journal-bookmark" /></div><div className="achievement-content"><span className="achievement-value">15</span><span className="achievement-label">Courses Enrolled</span></div></div>
          <div className="achievement-row"><div className="achievement-icon green"><i className="bi bi-book" /></div><div className="achievement-content"><span className="achievement-value">28</span><span className="achievement-label">Hours Learned</span></div></div>
          <div className="achievement-row"><div className="achievement-icon orange"><i className="bi bi-star-fill" /></div><div className="achievement-content"><span className="achievement-value">12</span><span className="achievement-label">Reviews Earned</span></div></div>
          <div className="achievement-row"><div className="achievement-icon red"><i className="bi bi-fire" /></div><div className="achievement-content"><span className="achievement-value">5</span><span className="achievement-label">Day Streak</span></div></div>
        </div>
      );

    default:
      return <p className="text-muted p-4">Full content not available for this card. <Link href="/home-dashboard">View on source page</Link></p>;
  }
}
