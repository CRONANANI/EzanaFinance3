'use client';

import Link from 'next/link';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/components/learning/learning-opportunities.css';
import '../../../../app-legacy/pages/home-dashboard.css';
import '../../../../app-legacy/pages/market-analysis.css';
import '../../../../app-legacy/components/pages/market-analysis/data-library/data-library-cards.css';

export default function MarketAnalysisPage() {
  return (
    <div className="market-analysis-container">
      <section className="market-analysis-hero">
        <div className="gdp-heatmap-card">
          <h2 className="gdp-heatmap-title">
            <i className="bi bi-globe2" /> Global GDP Distribution
          </h2>
          <div className="gdp-kpi-bar">
            <div className="gdp-kpi-item"><span className="gdp-kpi-label">Total GDP</span><span className="gdp-kpi-value">$142T</span></div>
            <div className="gdp-kpi-item"><span className="gdp-kpi-label">Top Economy</span><span className="gdp-kpi-value">USA 17.4T</span></div>
            <div className="gdp-kpi-item"><span className="gdp-kpi-label">Countries</span><span className="gdp-kpi-value">195</span></div>
          </div>
          <div className="gdp-heatmap-container">
            <div className="gdp-map-wrapper">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Equirectangular_projection_SW.jpg/1200px-Equirectangular_projection_SW.jpg" alt="World Map" className="gdp-world-map-img" />
              <div className="gdp-map-dots" id="gdpMapDots" />
            </div>
            <div className="gdp-heatmap-badges">
              <div className="gdp-badge gdp-badge-purple selected" data-country="USA">United States: 17,419</div>
              <div className="gdp-badge gdp-badge-green" data-country="Japan">Japan: 4,601</div>
              <div className="gdp-badge gdp-badge-red" data-country="China">China: 10,355</div>
              <div className="gdp-badge gdp-badge-blue" data-country="Germany">Germany: 3,868</div>
              <div className="gdp-badge gdp-badge-orange" data-country="UK">United Kingdom: 2,989</div>
            </div>
            <div className="gdp-selected-badge" id="selectedCountryBadge">United States</div>
          </div>
          <div id="gdpTooltip" className="gdp-tooltip" style={{ display: 'none' }} />
        </div>
        <div className="main-indicators-divider">
          <h2 className="main-indicators-title">Main economic indicators</h2>
        </div>
        <div className="main-indicators-table-wrap">
          <table className="main-indicators-table">
            <thead>
              <tr>
                <th>Country</th>
                <th>GDP</th>
                <th>GDP Growth</th>
                <th>Industrial Production</th>
                <th>Interest Rate</th>
                <th>Inflation</th>
                <th>Budget</th>
                <th>Debt</th>
                <th>Current Account</th>
              </tr>
            </thead>
            <tbody>
              <tr className="country-row selected" data-country="USA">
                <td><strong>USA</strong></td>
                <td>17,419</td>
                <td className="val-positive">2.39</td>
                <td>—</td>
                <td className="val-positive">1.77</td>
                <td className="val-positive">1.62</td>
                <td className="val-negative">-4.92</td>
                <td className="val-positive">96.14</td>
                <td className="val-negative">-2.24</td>
              </tr>
              <tr className="country-row" data-country="China">
                <td><strong>China</strong></td>
                <td>10,355</td>
                <td className="val-positive">7.27</td>
                <td className="val-positive">7.3</td>
                <td className="val-positive">4.71</td>
                <td className="val-positive">2</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
              </tr>
              <tr className="country-row" data-country="Japan">
                <td><strong>Japan</strong></td>
                <td>4,601</td>
                <td className="val-negative">-0.1</td>
                <td>—</td>
                <td className="val-negative">-10.73</td>
                <td className="val-positive">2.75</td>
                <td>—</td>
                <td>—</td>
                <td className="val-positive">0.52</td>
              </tr>
              <tr className="country-row country-row-highlight" data-country="Germany">
                <td><strong>Germany</strong></td>
                <td>3,868</td>
                <td className="val-positive">1.6</td>
                <td className="val-positive">1.76</td>
                <td>—</td>
                <td className="val-positive">0.91</td>
                <td>—</td>
                <td>—</td>
                <td className="val-positive">7.51</td>
              </tr>
              <tr className="country-row" data-country="UK">
                <td><strong>UK</strong></td>
                <td>2,989</td>
                <td className="val-positive">2.94</td>
                <td className="val-positive">2.9</td>
                <td className="val-negative">-1.19</td>
                <td className="val-positive">1.46</td>
                <td>—</td>
                <td>—</td>
                <td className="val-negative">-5.82</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="analysis-tabs">
        <button className="analysis-tab active" data-tab="economic" type="button">
          <i className="bi bi-currency-dollar" /> Economic Indicators
        </button>
        <button className="analysis-tab" data-tab="datalib" type="button">
          <i className="bi bi-database" /> Data Library
        </button>
      </div>

      <div className="tab-content active" data-content="economic">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon indicators"><i className="bi bi-currency-dollar" /></div>
            <div className="stat-content">
              <div className="stat-value">5.25%</div>
              <div className="stat-label">Fed Funds Rate</div>
              <div className="stat-change">Unchanged</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon performance"><i className="bi bi-graph-up" /></div>
            <div className="stat-content">
              <div className="stat-value">3.2%</div>
              <div className="stat-label">CPI (Inflation)</div>
              <div className="stat-change negative">+0.3% MoM</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon market"><i className="bi bi-briefcase" /></div>
            <div className="stat-content">
              <div className="stat-value">3.8%</div>
              <div className="stat-label">Unemployment</div>
              <div className="stat-change positive">-0.1% vs Last</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon volume"><i className="bi bi-bank" /></div>
            <div className="stat-content">
              <div className="stat-value">2.4%</div>
              <div className="stat-label">GDP Growth</div>
              <div className="stat-change positive">Q4 2025</div>
            </div>
          </div>
        </div>

        <div className="component-card full-width">
          <div className="card-header">
            <h3><i className="bi bi-bank2" /> Fed Watch - Interest Rate Probabilities</h3>
          </div>
          <div className="card-body">
            <div className="fed-watch-timeline">
              <div className="fed-meeting">
                <div className="meeting-date">Mar 2026</div>
                <div className="probability-bars">
                  <div className="prob-bar" style={{ width: '15%' }}><span>-25bp (15%)</span></div>
                  <div className="prob-bar active" style={{ width: '70%' }}><span>Hold (70%)</span></div>
                  <div className="prob-bar" style={{ width: '15%' }}><span>+25bp (15%)</span></div>
                </div>
              </div>
              <div className="fed-meeting">
                <div className="meeting-date">May 2026</div>
                <div className="probability-bars">
                  <div className="prob-bar" style={{ width: '25%' }}><span>-25bp (25%)</span></div>
                  <div className="prob-bar active" style={{ width: '55%' }}><span>Hold (55%)</span></div>
                  <div className="prob-bar" style={{ width: '20%' }}><span>+25bp (20%)</span></div>
                </div>
              </div>
              <div className="fed-meeting">
                <div className="meeting-date">Jun 2026</div>
                <div className="probability-bars">
                  <div className="prob-bar" style={{ width: '40%' }}><span>-25bp (40%)</span></div>
                  <div className="prob-bar active" style={{ width: '35%' }}><span>Hold (35%)</span></div>
                  <div className="prob-bar" style={{ width: '25%' }}><span>+25bp (25%)</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="page-grid-2">
          <div className="component-card">
            <div className="card-header">
              <h3><i className="bi bi-graph-up-arrow" /> Inflation Indicators</h3>
            </div>
            <div className="card-body">
              <div className="indicator-list">
                <div className="indicator-item">
                  <div className="indicator-info">
                    <div className="indicator-name">CPI (Consumer Price Index)</div>
                    <div className="indicator-meta">Year-over-Year</div>
                  </div>
                  <div className="indicator-value">
                    <div className="value">3.2%</div>
                    <div className="change negative">+0.3%</div>
                  </div>
                </div>
                <div className="indicator-item">
                  <div className="indicator-info">
                    <div className="indicator-name">Core CPI</div>
                    <div className="indicator-meta">Excluding Food &amp; Energy</div>
                  </div>
                  <div className="indicator-value">
                    <div className="value">3.8%</div>
                    <div className="change negative">+0.2%</div>
                  </div>
                </div>
                <div className="indicator-item">
                  <div className="indicator-info">
                    <div className="indicator-name">PPI (Producer Price Index)</div>
                    <div className="indicator-meta">Year-over-Year</div>
                  </div>
                  <div className="indicator-value">
                    <div className="value">2.7%</div>
                    <div className="change positive">-0.1%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="component-card">
            <div className="card-header">
              <h3><i className="bi bi-people" /> Employment Data</h3>
            </div>
            <div className="card-body">
              <div className="indicator-list">
                <div className="indicator-item">
                  <div className="indicator-info">
                    <div className="indicator-name">Unemployment Rate</div>
                    <div className="indicator-meta">U-3 Measure</div>
                  </div>
                  <div className="indicator-value">
                    <div className="value">3.8%</div>
                    <div className="change positive">-0.1%</div>
                  </div>
                </div>
                <div className="indicator-item">
                  <div className="indicator-info">
                    <div className="indicator-name">Non-Farm Payrolls</div>
                    <div className="indicator-meta">Monthly Change</div>
                  </div>
                  <div className="indicator-value">
                    <div className="value">+187K</div>
                    <div className="change positive">Above Est.</div>
                  </div>
                </div>
                <div className="indicator-item">
                  <div className="indicator-info">
                    <div className="indicator-name">Labor Force Participation</div>
                    <div className="indicator-meta">% of Population</div>
                  </div>
                  <div className="indicator-value">
                    <div className="value">63.4%</div>
                    <div className="change positive">+0.2%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="component-card full-width">
          <div className="card-header">
            <h3><i className="bi bi-calendar-event" /> Economic Calendar</h3>
            <div className="header-actions">
              <select className="filter-select">
                <option>This Week</option>
                <option>Next Week</option>
                <option>This Month</option>
              </select>
            </div>
          </div>
          <div className="card-body">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event</th>
                  <th>Importance</th>
                  <th>Previous</th>
                  <th>Forecast</th>
                  <th>Actual</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Feb 16</td>
                  <td>Retail Sales</td>
                  <td><span className="badge error">High</span></td>
                  <td>+0.6%</td>
                  <td>+0.4%</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>Feb 17</td>
                  <td>Housing Starts</td>
                  <td><span className="badge warning">Medium</span></td>
                  <td>1.56M</td>
                  <td>1.48M</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>Feb 18</td>
                  <td>Fed Minutes</td>
                  <td><span className="badge error">High</span></td>
                  <td>—</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="component-card">
          <div className="card-header">
            <h3><i className="bi bi-graph-up" /> GDP &amp; Economic Growth</h3>
          </div>
          <div className="card-body">
            <div className="indicator-list">
              <div className="indicator-item">
                <div className="indicator-info">
                  <div className="indicator-name">Real GDP Growth</div>
                  <div className="indicator-meta">Q4 2025 (Annualized)</div>
                </div>
                <div className="indicator-value">
                  <div className="value">2.4%</div>
                  <div className="change positive">+0.3%</div>
                </div>
              </div>
              <div className="indicator-item">
                <div className="indicator-info">
                  <div className="indicator-name">Consumer Spending</div>
                  <div className="indicator-meta">% of GDP</div>
                </div>
                <div className="indicator-value">
                  <div className="value">68.2%</div>
                  <div className="change positive">+1.2%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="tab-content" data-content="datalib">
        <div className="data-library-intro">
          <h2><i className="bi bi-database" /> Global Market Data Used by Investment Firms</h2>
          <p>Comprehensive data categories covering equity markets, fundamentals, macroeconomics, commodities, derivatives, and more.</p>
        </div>
        <div className="data-library-grid">
          <div className="data-category-card component-card" data-category="equity">
            <div className="data-category-header">
              <div className="data-category-icon equity"><i className="bi bi-graph-up-arrow" /></div>
              <div className="data-category-title-area">
                <h3 className="data-category-title">Equity Market Data</h3>
                <p className="data-category-desc">Price, volume, corporate actions, index data</p>
              </div>
              <i className="bi bi-chevron-down card-toggle-icon" />
            </div>
            <div className="data-category-body">
              <div className="data-category-content">
                <div className="data-subsection">
                  <div className="data-subsection-title">Price &amp; Volume</div>
                  <ul className="data-metric-list">
                    <li><span className="data-metric-name">Real-time quotes</span><span className="data-metric-value">Bid/Ask/Last</span></li>
                    <li><span className="data-metric-name">Historical OHLC</span><span className="data-metric-value">20+ years</span></li>
                    <li><span className="data-metric-name">Intraday data</span><span className="data-metric-value">Minute/tick</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="data-category-card component-card" data-category="fundamental">
            <div className="data-category-header">
              <div className="data-category-icon fundamental"><i className="bi bi-cash-stack" /></div>
              <div className="data-category-title-area">
                <h3 className="data-category-title">Fundamental Data</h3>
                <p className="data-category-desc">Financial statements, ratios, analyst estimates</p>
              </div>
              <i className="bi bi-chevron-down card-toggle-icon" />
            </div>
            <div className="data-category-body">
              <div className="data-category-content">
                <div className="data-subsection">
                  <div className="data-subsection-title">Financial Statements</div>
                  <ul className="data-metric-list">
                    <li><span className="data-metric-name">Income Statement</span><span className="data-metric-value">Revenue, EBITDA</span></li>
                    <li><span className="data-metric-name">Balance Sheet</span><span className="data-metric-value">Assets, equity</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="data-category-card component-card" data-category="macro">
            <div className="data-category-header">
              <div className="data-category-icon macro"><i className="bi bi-globe2" /></div>
              <div className="data-category-title-area">
                <h3 className="data-category-title">Macroeconomic Data</h3>
                <p className="data-category-desc">GDP, inflation, employment, consumer, housing</p>
              </div>
              <i className="bi bi-chevron-down card-toggle-icon" />
            </div>
          </div>
        </div>
      </div>

      <section className="market-stats-row">
        <div className="stats-grid condensed stats-row-3">
          <div className="stat-card" data-symbol="SPY">
            <div className="stat-icon market"><i className="bi bi-graph-up-arrow" /></div>
            <div className="stat-content">
              <div className="stat-value" id="marketSp500Value">4,783.45</div>
              <div className="stat-label">S&amp;P 500</div>
              <div className="stat-change positive" id="marketSp500Change">+1.2% Today</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon volume"><i className="bi bi-bar-chart" /></div>
            <div className="stat-content">
              <div className="stat-value" id="marketVolumeValue">$847B</div>
              <div className="stat-label">Daily Volume</div>
              <div className="stat-change positive" id="marketVolumeChange">+8% vs Avg</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon indicators"><i className="bi bi-speedometer2" /></div>
            <div className="stat-content">
              <div className="stat-value" id="marketSentimentValue">62</div>
              <div className="stat-label">Market Sentiment</div>
              <div className="stat-change" id="marketSentimentChange">Bullish</div>
            </div>
          </div>
        </div>
      </section>

      <section className="top-movers-section">
        <div className="component-card full-width">
          <div className="card-header">
            <h3><i className="bi bi-trophy" /> Top Movers — <span id="topMoversCountryLabel">United States</span></h3>
            <Link href="#" className="view-all">View All</Link>
          </div>
          <div className="card-body">
            <div className="movers-list">
              <div className="mover-item" data-symbol="NVDA">
                <div className="mover-info">
                  <div className="mover-symbol">NVDA</div>
                  <div className="mover-name">NVIDIA Corporation</div>
                </div>
                <div className="mover-stats">
                  <div className="mover-price">$485.20</div>
                  <div className="mover-change positive">+12.4%</div>
                </div>
              </div>
              <div className="mover-item" data-symbol="AMD">
                <div className="mover-info">
                  <div className="mover-symbol">AMD</div>
                  <div className="mover-name">Advanced Micro Devices</div>
                </div>
                <div className="mover-stats">
                  <div className="mover-price">$178.90</div>
                  <div className="mover-change positive">+8.7%</div>
                </div>
              </div>
              <div className="mover-item" data-symbol="TSLA">
                <div className="mover-info">
                  <div className="mover-symbol">TSLA</div>
                  <div className="mover-name">Tesla, Inc.</div>
                </div>
                <div className="mover-stats">
                  <div className="mover-price">$248.50</div>
                  <div className="mover-change positive">+6.2%</div>
                </div>
              </div>
              <div className="mover-item" data-symbol="META">
                <div className="mover-info">
                  <div className="mover-symbol">META</div>
                  <div className="mover-name">Meta Platforms</div>
                </div>
                <div className="mover-stats">
                  <div className="mover-price">$458.30</div>
                  <div className="mover-change positive">+5.8%</div>
                </div>
              </div>
              <div className="mover-item" data-symbol="AAPL">
                <div className="mover-info">
                  <div className="mover-symbol">AAPL</div>
                  <div className="mover-name">Apple Inc.</div>
                </div>
                <div className="mover-stats">
                  <div className="mover-price">$182.30</div>
                  <div className="mover-change positive">+4.3%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="learning-opportunities">
        <div className="learning-header">
          <div className="learning-title-area">
            <div className="learning-icon"><i className="bi bi-mortarboard-fill" /></div>
            <div className="learning-title-text">
              <h3>Market &amp; Economic Analysis Courses</h3>
              <p>Master technical analysis, macroeconomics, and market psychology</p>
            </div>
          </div>
          <Link href="/learning-center" className="view-all-btn">View All Courses</Link>
        </div>
        <div className="courses-grid">
          <div className="course-card">
            <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 5 hours</span></div>
            <h4 className="course-title">Technical Analysis Fundamentals</h4>
            <p className="course-description">Learn to read charts, identify patterns, and use technical indicators to time your trades.</p>
            <div className="course-meta">
              <div className="meta-item"><i className="bi bi-book" /> 16 lessons</div>
              <div className="meta-item"><i className="bi bi-people" /> 4,523 enrolled</div>
            </div>
            <div className="course-footer"><span className="course-level beginner">Beginner</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
          <div className="course-card">
            <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 6 hours</span></div>
            <h4 className="course-title">Advanced Chart Patterns</h4>
            <p className="course-description">Deep dive into head &amp; shoulders, triangles, flags, and other high-probability patterns.</p>
            <div className="course-meta">
              <div className="meta-item"><i className="bi bi-book" /> 20 lessons</div>
              <div className="meta-item"><i className="bi bi-people" /> 2,847 enrolled</div>
            </div>
            <div className="course-footer"><span className="course-level intermediate">Intermediate</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
          <div className="course-card">
            <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 4 hours</span></div>
            <h4 className="course-title">Understanding Economic Indicators</h4>
            <p className="course-description">Learn how GDP, inflation, and Fed policy drive market movements and investment decisions.</p>
            <div className="course-meta">
              <div className="meta-item"><i className="bi bi-book" /> 14 lessons</div>
              <div className="meta-item"><i className="bi bi-people" /> 3,124 enrolled</div>
            </div>
            <div className="course-footer"><span className="course-level beginner">Beginner</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
          <div className="course-card">
            <div className="course-header"><span className="course-type">Skill</span><span className="course-duration"><i className="bi bi-clock" /> 5 hours</span></div>
            <h4 className="course-title">Market Sentiment Analysis</h4>
            <p className="course-description">Master contrarian indicators, sentiment surveys, and behavioral finance principles.</p>
            <div className="course-meta">
              <div className="meta-item"><i className="bi bi-book" /> 18 lessons</div>
              <div className="meta-item"><i className="bi bi-people" /> 1,847 enrolled</div>
            </div>
            <div className="course-footer"><span className="course-level advanced">Advanced</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
        </div>
      </section>
    </div>
  );
}
