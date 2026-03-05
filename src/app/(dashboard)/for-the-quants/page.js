'use client';

import Link from 'next/link';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/components/learning/learning-opportunities.css';
import '../../../../app-legacy/pages/home-dashboard.css';
import '../../../../app-legacy/pages/for-the-quants.css';

export default function ForTheQuantsPage() {
  return (
    <div className="for-the-quants-container">
      <div className="stats-grid condensed">
        <div className="stat-card">
          <div className="stat-icon quants"><i className="bi bi-calculator" /></div>
          <div className="stat-content">
            <div className="stat-value">12</div>
            <div className="stat-label">Active Models</div>
            <div className="stat-change">Running</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon performance"><i className="bi bi-graph-up-arrow" /></div>
          <div className="stat-content">
            <div className="stat-value">+24.3%</div>
            <div className="stat-label">Avg Returns</div>
            <div className="stat-change positive">vs +12% Market</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon volume"><i className="bi bi-lightning" /></div>
          <div className="stat-content">
            <div className="stat-value">1.8</div>
            <div className="stat-label">Sharpe Ratio</div>
            <div className="stat-change positive">Excellent</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon trades"><i className="bi bi-arrow-repeat" /></div>
          <div className="stat-content">
            <div className="stat-value">847</div>
            <div className="stat-label">Backtests Run</div>
            <div className="stat-change">This Month</div>
          </div>
        </div>
      </div>

      <div className="component-card full-width quant-model-card">
        <div className="card-header">
          <h3><i className="bi bi-graph-up" /> Quantitative Model Analysis</h3>
          <div className="model-controls">
            <select className="model-selector" id="quantModelSelect">
              <option value="momentum">Momentum Strategy</option>
              <option value="mean-reversion">Mean Reversion</option>
              <option value="statistical-arbitrage">Statistical Arbitrage</option>
              <option value="machine-learning">Machine Learning Model</option>
              <option value="pairs-trading">Pairs Trading</option>
              <option value="factor-investing">Multi-Factor Model</option>
              <option value="volatility">Volatility Trading</option>
              <option value="sentiment">Sentiment Analysis</option>
            </select>
            <button className="card-action-btn" type="button"><i className="bi bi-play-circle" /> Run Backtest</button>
          </div>
        </div>
        <div className="card-body">
          <div className="model-chart-container">
            <div className="chart-placeholder">
              <div className="chart-header">
                <div className="chart-title">
                  <span className="model-name">Momentum Strategy</span>
                  <span className="model-status active">Active</span>
                </div>
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
                <div className="param-group"><span className="param-label">Position Size:</span><span className="param-value">Equal Weight</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-grid-3">
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
      </div>

      <div className="page-grid-2">
        <div className="component-card">
          <div className="card-header"><h3><i className="bi bi-pie-chart" /> Portfolio Optimization</h3></div>
          <div className="card-body">
            <p>Efficient frontier analysis, risk parity, and mean-variance optimization.</p>
            <table className="data-table compact">
              <thead>
                <tr><th>Asset</th><th>Weight</th><th>Return</th><th>Risk</th></tr>
              </thead>
              <tbody>
                <tr><td>SPY</td><td>35%</td><td className="positive">+12.3%</td><td>14.2%</td></tr>
                <tr><td>QQQ</td><td>30%</td><td className="positive">+18.7%</td><td>18.9%</td></tr>
                <tr><td>TLT</td><td>20%</td><td className="positive">+3.2%</td><td>8.1%</td></tr>
                <tr><td>GLD</td><td>15%</td><td className="positive">+7.8%</td><td>12.4%</td></tr>
              </tbody>
            </table>
          </div>
        </div>
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
      </div>

      <section className="learning-opportunities">
        <div className="learning-header">
          <div className="learning-title-area">
            <div className="learning-icon"><i className="bi bi-mortarboard-fill" /></div>
            <div className="learning-title-text">
              <h3>Quantitative Finance Courses</h3>
              <p>Master mathematical models and algorithmic trading strategies</p>
            </div>
          </div>
          <Link href="/learning-center" className="view-all-btn">View All Courses</Link>
        </div>
        <div className="courses-grid">
          <div className="course-card">
            <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 10 hours</span></div>
            <h4 className="course-title">Python for Financial Analysis</h4>
            <p className="course-description">Learn to use Python, pandas, and NumPy for quantitative finance and data analysis.</p>
            <div className="course-meta"><div className="meta-item"><i className="bi bi-book" /> 32 lessons</div><div className="meta-item"><i className="bi bi-people" /> 5,234 enrolled</div></div>
            <div className="course-footer"><span className="course-level intermediate">Intermediate</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
          <div className="course-card">
            <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 8 hours</span></div>
            <h4 className="course-title">Statistical Arbitrage Strategies</h4>
            <p className="course-description">Master pairs trading, mean reversion, and cointegration-based strategies.</p>
            <div className="course-meta"><div className="meta-item"><i className="bi bi-book" /> 28 lessons</div><div className="meta-item"><i className="bi bi-people" /> 2,847 enrolled</div></div>
            <div className="course-footer"><span className="course-level advanced">Advanced</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
          <div className="course-card">
            <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 12 hours</span></div>
            <h4 className="course-title">Machine Learning for Trading</h4>
            <p className="course-description">Build predictive models using regression, neural networks, and ensemble methods.</p>
            <div className="course-meta"><div className="meta-item"><i className="bi bi-book" /> 40 lessons</div><div className="meta-item"><i className="bi bi-people" /> 3,912 enrolled</div></div>
            <div className="course-footer"><span className="course-level advanced">Advanced</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
          <div className="course-card">
            <div className="course-header"><span className="course-type">Skill</span><span className="course-duration"><i className="bi bi-clock" /> 6 hours</span></div>
            <h4 className="course-title">Options Pricing Models</h4>
            <p className="course-description">Deep dive into Black-Scholes, binomial trees, and Monte Carlo simulations.</p>
            <div className="course-meta"><div className="meta-item"><i className="bi bi-book" /> 22 lessons</div><div className="meta-item"><i className="bi bi-people" /> 1,847 enrolled</div></div>
            <div className="course-footer"><span className="course-level advanced">Advanced</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
        </div>
      </section>
    </div>
  );
}
