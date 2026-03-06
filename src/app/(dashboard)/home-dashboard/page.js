'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

// Legacy CSS imports (relative from src)
// theme-variables, component-cards, universal-card-standards, page-layout are in globals.css
import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/components/learning/learning-opportunities.css';
import '../../../../app-legacy/pages/home-dashboard.css';

export default function HomeDashboardPage() {
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (scriptLoadedRef.current) return;
    scriptLoadedRef.current = true;

    const loadScript = (src) => new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });

    const init = async () => {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js');
        await loadScript('/app-legacy/pages/home-dashboard.js');
        if (typeof window !== 'undefined' && window.initHomeDashboard) {
          window.initHomeDashboard();
        }
      } catch (e) {
        console.warn('Home dashboard init:', e);
      }
    };
    init();

    return () => {
      script.remove();
      if (typeof window !== 'undefined' && window.portfolioDashboard) {
        window.portfolioDashboard.stopMarketQuotesPolling?.();
        window.portfolioDashboard = null;
      }
    };
  }, []);

  return (
    <>
      {/* Quick Actions Bar */}
      <section className="quick-actions-bar compact">
        <button
          className="quick-action-btn quick-action-brokerage"
          id="connectBrokerageBtn"
          data-action="brokerage"
        >
          <i className="bi bi-bank" />
          <span>Connect Brokerage</span>
        </button>
        <button className="quick-action-btn" data-action="refresh">
          <i className="bi bi-arrow-clockwise" />
          <span>Refresh</span>
        </button>
        <button className="quick-action-btn" data-action="report">
          <i className="bi bi-file-earmark-text" />
          <span>Report</span>
        </button>
        <button className="quick-action-btn" data-action="analysis">
          <i className="bi bi-graph-up" />
          <span>Analysis</span>
        </button>
        <button className="quick-action-btn" data-action="alerts">
          <i className="bi bi-bell" />
          <span>Alerts</span>
        </button>
        <button className="quick-action-btn" data-action="watchlist">
          <i className="bi bi-bookmark" />
          <span>Watchlist</span>
        </button>
      </section>

      {/* Metrics Carousel */}
      <section className="metrics-carousel-section compact">
        <button className="carousel-nav prev" id="carouselPrev" type="button">
          <i className="bi bi-chevron-left" />
        </button>
        <div className="metrics-carousel-container">
          <div className="metrics-carousel-track" id="metricsCarousel">
            <div className="metric-card active" data-metric="portfolio">
              <div className="metric-icon portfolio">
                <i className="bi bi-wallet2" />
              </div>
              <div className="metric-content">
                <span className="metric-label">Portfolio Value</span>
                <span className="metric-value">$158,420</span>
                <span className="metric-change positive">+24.5% YTD</span>
              </div>
            </div>
            <div className="metric-card" data-metric="pnl">
              <div className="metric-icon pnl">
                <i className="bi bi-graph-up" />
              </div>
              <div className="metric-content">
                <span className="metric-label">Today&apos;s P&L</span>
                <span className="metric-value">+$1,247</span>
                <span className="metric-change positive">+0.82% today</span>
              </div>
            </div>
            <div className="metric-card" data-metric="performer" data-symbol="NVDA">
              <div className="metric-icon performer">
                <i className="bi bi-star" />
              </div>
              <div className="metric-content">
                <span className="metric-label">Top Performer</span>
                <span className="metric-value performer-value">NVDA</span>
                <span className="metric-change performer-change positive">—</span>
              </div>
            </div>
            <div className="metric-card" data-metric="risk">
              <div className="metric-icon risk">
                <i className="bi bi-shield-exclamation" />
              </div>
              <div className="metric-content">
                <span className="metric-label">Risk Score</span>
                <span className="metric-value">6.2/10</span>
                <span className="metric-change negative">-0.3 vs last week</span>
              </div>
            </div>
            <div className="metric-card" data-metric="dividends">
              <div className="metric-icon dividends">
                <i className="bi bi-cash-coin" />
              </div>
              <div className="metric-content">
                <span className="metric-label">Monthly Dividends</span>
                <span className="metric-value">$847</span>
                <span className="metric-change positive">+12.0% MoM</span>
              </div>
            </div>
            <div className="metric-card" data-metric="allocation">
              <div className="metric-icon allocation">
                <i className="bi bi-pie-chart" />
              </div>
              <div className="metric-content">
                <span className="metric-label">Asset Allocation</span>
                <span className="metric-value">Balanced</span>
                <span className="metric-change positive">Stocks 65% • Bonds 20%</span>
              </div>
            </div>
            <div className="metric-card" data-metric="volatility">
              <div className="metric-icon volatility">
                <i className="bi bi-activity" />
              </div>
              <div className="metric-content">
                <span className="metric-label">Volatility</span>
                <span className="metric-value">4.8/10</span>
                <span className="metric-change positive">-0.4 this month</span>
              </div>
            </div>
            <div className="metric-card" data-metric="beta">
              <div className="metric-icon beta">
                <i className="bi bi-arrow-down-up" />
              </div>
              <div className="metric-content">
                <span className="metric-label">Beta vs Market</span>
                <span className="metric-value">1.05</span>
                <span className="metric-change">Near market sensitivity</span>
              </div>
            </div>
            <div className="metric-card" data-metric="sector">
              <div className="metric-icon sector">
                <i className="bi bi-building" />
              </div>
              <div className="metric-content">
                <span className="metric-label">Sector Exposure</span>
                <span className="metric-value">Tech 35%</span>
                <span className="metric-change">Top 3 sectors tracked</span>
              </div>
            </div>
          </div>
        </div>
        <button className="carousel-nav next" id="carouselNext" type="button">
          <i className="bi bi-chevron-right" />
        </button>
      </section>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Main Chart Section */}
        <section className="main-chart-section">
          <div className="chart-header compact">
            <div className="chart-title-area">
              <h2 className="chart-title" id="chartTitle">
                Total Portfolio Value
              </h2>
            </div>
            <div className="chart-controls" id="chartControls">
              <div className="time-range-selector compact" id="timeRangeSelector">
                <button className="time-btn" type="button" data-range="1D">
                  1D
                </button>
                <button className="time-btn" type="button" data-range="1W">
                  1W
                </button>
                <button className="time-btn" type="button" data-range="1M">
                  1M
                </button>
                <button className="time-btn active" type="button" data-range="3M">
                  3M
                </button>
                <button className="time-btn" type="button" data-range="6M">
                  6M
                </button>
                <button className="time-btn" type="button" data-range="1Y">
                  1Y
                </button>
              </div>
              <select
                className="filter-select allocation-timeframe-select"
                id="allocationTimeframe"
                style={{ display: 'none' }}
              >
                <option value="current">Current</option>
                <option value="1m">1 Month Ago</option>
                <option value="3m">3 Months Ago</option>
                <option value="1y">1 Year Ago</option>
              </select>
            </div>
          </div>
          <div className="chart-container compact" id="lineChartContainer">
            <canvas id="mainChart" />
          </div>
          {/* Asset Allocation pie chart */}
          <div
            className="allocation-chart-view"
            id="allocationChartView"
            style={{ display: 'none' }}
          >
            <div className="allocation-chart-container">
              <svg
                id="allocationPieChart"
                viewBox="0 0 400 400"
                className="allocation-pie-chart"
              />
              <div className="chart-center-label">
                <div className="total-label">Total Portfolio</div>
                <div className="total-value">$158,420</div>
              </div>
              <div className="sector-tooltip" id="sectorTooltip">
                <div className="tooltip-header">
                  <div className="sector-name" />
                  <div className="sector-percentage" />
                </div>
                <div className="tooltip-body">
                  <div className="sector-value" />
                  <div className="holdings-title">Top 5 Holdings:</div>
                  <div className="holdings-list" />
                </div>
              </div>
            </div>
            <div className="allocation-legend" id="allocationLegend" />
          </div>
        </section>

        {/* Portfolio News Sidebar */}
        <section className="portfolio-news-sidebar">
          <div className="news-header">
            <h3>Relevant Portfolio News</h3>
            <i className="bi bi-newspaper" />
          </div>
          <div className="news-ticker-wrapper">
            <div className="news-ticker" id="newsTicker">
              <div className="news-insight">
                <div className="insight-icon positive">
                  <i className="bi bi-arrow-up-circle" />
                </div>
                <div className="insight-content">
                  <p className="insight-text">
                    Yesterday your portfolio jumped by 0.45%. That&apos;s the 10th
                    highest one-day jump ever.
                  </p>
                  <span className="insight-time">Yesterday</span>
                </div>
              </div>
              <div className="news-insight">
                <div className="insight-icon warning">
                  <i className="bi bi-exclamation-triangle" />
                </div>
                <div className="insight-content">
                  <p className="insight-text">
                    Your portfolio&apos;s tech exposure increased to 35% this
                    week. Consider rebalancing.
                  </p>
                  <span className="insight-time">2 days ago</span>
                </div>
              </div>
              <div className="news-insight">
                <div className="insight-icon info">
                  <i className="bi bi-lightbulb" />
                </div>
                <div className="insight-content">
                  <p className="insight-text">
                    NVDA has gained 12.4% this week. It&apos;s now your top
                    performer for Q4.
                  </p>
                  <span className="insight-time">3 days ago</span>
                </div>
              </div>
              <div className="news-insight">
                <div className="insight-icon positive">
                  <i className="bi bi-trophy" />
                </div>
                <div className="insight-content">
                  <p className="insight-text">
                    Your portfolio beat the S&P 500 by 2.2% this quarter. Great
                    job!
                  </p>
                  <span className="insight-time">1 week ago</span>
                </div>
              </div>
              <div className="news-insight">
                <div className="insight-icon warning">
                  <i className="bi bi-cash-stack" />
                </div>
                <div className="insight-content">
                  <p className="insight-text">
                    You&apos;ll receive $847 in dividend payments next week from
                    5 holdings.
                  </p>
                  <span className="insight-time">1 week ago</span>
                </div>
              </div>
              <div className="news-insight">
                <div className="insight-icon info">
                  <i className="bi bi-graph-down" />
                </div>
                <div className="insight-content">
                  <p className="insight-text">
                    Your portfolio volatility decreased to 4.8. You&apos;re below
                    market average.
                  </p>
                  <span className="insight-time">2 weeks ago</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Additional Component Cards */}
      <div className="additional-components-grid">
        <section className="component-card transactions-card">
          <div className="card-header">
            <h3>Recent Transactions</h3>
            <button className="card-action-btn" type="button">
              View All
            </button>
          </div>
          <p className="card-description">
            Track your latest buys and sells with timestamps and amounts.
          </p>
          <div className="card-body">
            <div className="transaction-list">
              <div className="transaction-item buy">
                <div className="transaction-icon">
                  <i className="bi bi-arrow-up-circle" />
                </div>
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
                <div className="transaction-icon">
                  <i className="bi bi-arrow-down-circle" />
                </div>
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
                <div className="transaction-icon">
                  <i className="bi bi-arrow-up-circle" />
                </div>
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
        <section className="component-card holdings-card">
          <div className="card-header">
            <h3>Top Holdings</h3>
            <button className="card-action-btn" type="button">
              Manage
            </button>
          </div>
          <p className="card-description">
            Your largest positions ranked by portfolio allocation percentage.
          </p>
          <div className="card-body">
            <div className="holdings-list">
              <div
                className="holding-item"
                data-symbol="NVDA"
                data-shares="150"
              >
                <div className="holding-rank">1</div>
                <div className="holding-info">
                  <div className="holding-name">NVDA</div>
                  <div className="holding-shares">150 shares</div>
                </div>
                <div className="holding-value">
                  <div className="value holding-value-display">$72,850</div>
                  <div className="change holding-change-display positive">
                    +12.4%
                  </div>
                </div>
                <div className="holding-allocation">
                  <div className="allocation-bar">
                    <div
                      className="allocation-fill"
                      style={{ width: '28%' }}
                    />
                  </div>
                  <span className="allocation-percent">28%</span>
                </div>
              </div>
              <div
                className="holding-item"
                data-symbol="AAPL"
                data-shares="200"
              >
                <div className="holding-rank">2</div>
                <div className="holding-info">
                  <div className="holding-name">AAPL</div>
                  <div className="holding-shares">200 shares</div>
                </div>
                <div className="holding-value">
                  <div className="value holding-value-display">$36,400</div>
                  <div className="change holding-change-display positive">
                    +5.2%
                  </div>
                </div>
                <div className="holding-allocation">
                  <div className="allocation-bar">
                    <div
                      className="allocation-fill"
                      style={{ width: '18%' }}
                    />
                  </div>
                  <span className="allocation-percent">18%</span>
                </div>
              </div>
              <div
                className="holding-item"
                data-symbol="MSFT"
                data-shares="85"
              >
                <div className="holding-rank">3</div>
                <div className="holding-info">
                  <div className="holding-name">MSFT</div>
                  <div className="holding-shares">85 shares</div>
                </div>
                <div className="holding-value">
                  <div className="value holding-value-display">$32,045</div>
                  <div className="change holding-change-display positive">
                    +3.8%
                  </div>
                </div>
                <div className="holding-allocation">
                  <div className="allocation-bar">
                    <div
                      className="allocation-fill"
                      style={{ width: '15%' }}
                    />
                  </div>
                  <span className="allocation-percent">15%</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="component-card performance-card">
          <div className="card-header">
            <h3>Performance Summary</h3>
            <select className="time-select">
              <option>This Month</option>
              <option>This Quarter</option>
              <option>This Year</option>
            </select>
          </div>
          <p className="card-description">
            See how your portfolio performed over different time periods with
            key metrics.
          </p>
          <div className="card-body">
            <div className="performance-metrics">
              <div className="perf-metric">
                <div className="perf-label">Total Return</div>
                <div className="perf-value positive">+8.4%</div>
                <div className="perf-comparison">vs S&P 500: +6.2%</div>
              </div>
              <div className="perf-metric">
                <div className="perf-label">Total Gain/Loss</div>
                <div className="perf-value positive">+$12,847</div>
                <div className="perf-comparison">+6.8% of initial investment</div>
              </div>
              <div className="perf-metric">
                <div className="perf-label">Best Day</div>
                <div className="perf-value">+$2,145</div>
                <div className="perf-comparison">December 15, 2025</div>
              </div>
              <div className="perf-metric">
                <div className="perf-label">Dividend Income</div>
                <div className="perf-value">$2,541</div>
                <div className="perf-comparison">+12% vs last period</div>
              </div>
            </div>
          </div>
        </section>
        <section className="component-card alerts-card">
          <div className="card-header">
            <h3>Alerts &amp; Recommendations</h3>
            <span className="alert-count">3 New</span>
          </div>
          <p className="card-description">
            Smart notifications for rebalancing, opportunities, and important
            events.
          </p>
          <div className="card-body">
            <div className="alerts-list">
              <div className="alert-item high">
                <div className="alert-priority">
                  <i className="bi bi-exclamation-circle" />
                </div>
                <div className="alert-content">
                  <div className="alert-title">Rebalancing Suggested</div>
                  <div className="alert-message">
                    Your tech allocation (35%) exceeds target (30%). Consider
                    reducing exposure.
                  </div>
                </div>
                <button className="alert-action" type="button">
                  Review
                </button>
              </div>
              <div className="alert-item medium">
                <div className="alert-priority">
                  <i className="bi bi-lightbulb" />
                </div>
                <div className="alert-content">
                  <div className="alert-title">Buy Opportunity</div>
                  <div className="alert-message">
                    AAPL is down 3.2% today. Good entry point based on your
                    strategy.
                  </div>
                </div>
                <button className="alert-action" type="button">
                  View
                </button>
              </div>
              <div className="alert-item low">
                <div className="alert-priority">
                  <i className="bi bi-info-circle" />
                </div>
                <div className="alert-content">
                  <div className="alert-title">Dividend Payment</div>
                  <div className="alert-message">
                    You&apos;ll receive $847 in dividends on October 15th from
                    5 holdings.
                  </div>
                </div>
                <button className="alert-action" type="button">
                  Details
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Market Movers Section */}
      <div
        className="additional-components-grid"
        id="marketMoversSection"
        style={{ display: 'none' }}
      >
        <section className="component-card">
          <div className="card-header">
            <h3>
              <i className="bi bi-graph-up-arrow" /> Top Gainers
            </h3>
            <span className="badge-live">LIVE</span>
          </div>
          <div className="card-body">
            <div className="movers-list" id="topGainersList">
              <div className="loading-placeholder">Loading market data...</div>
            </div>
          </div>
        </section>
        <section className="component-card">
          <div className="card-header">
            <h3>
              <i className="bi bi-graph-down-arrow" /> Top Losers
            </h3>
            <span className="badge-live">LIVE</span>
          </div>
          <div className="card-body">
            <div className="movers-list" id="topLosersList">
              <div className="loading-placeholder">Loading market data...</div>
            </div>
          </div>
        </section>
        <section className="component-card">
          <div className="card-header">
            <h3>
              <i className="bi bi-lightning-charge" /> Most Active
            </h3>
            <span className="badge-live">LIVE</span>
          </div>
          <div className="card-body">
            <div className="movers-list" id="mostActiveList">
              <div className="loading-placeholder">Loading market data...</div>
            </div>
          </div>
        </section>
        <section className="component-card" style={{ gridColumn: 'span 1' }}>
          <div className="card-header">
            <h3>
              <i className="bi bi-newspaper" /> Market News
            </h3>
            <button
              className="card-action-btn"
              id="refreshNewsBtn"
              type="button"
            >
              Refresh
            </button>
          </div>
          <div className="card-body">
            <div className="live-news-list" id="liveNewsList">
              <div className="loading-placeholder">Loading news...</div>
            </div>
          </div>
        </section>
      </div>

      {/* Learning Opportunities */}
      <section className="learning-opportunities">
        <div className="learning-header">
          <div className="learning-title-area">
            <div className="learning-icon">
              <i className="bi bi-mortarboard-fill" />
            </div>
            <div className="learning-title-text">
              <h3>Portfolio Management Courses</h3>
              <p>
                Master the skills to optimize your portfolio performance
              </p>
            </div>
          </div>
          <Link
            href="/learning-center"
            className="view-all-btn"
          >
            View All Courses <i className="bi bi-arrow-right" />
          </Link>
        </div>
        <div className="courses-grid">
          <div className="course-card">
            <div className="course-header">
              <span className="course-type">Course</span>
              <span className="course-duration">
                <i className="bi bi-clock" /> 4 hours
              </span>
            </div>
            <h4 className="course-title">
              Portfolio Management Fundamentals
            </h4>
            <p className="course-description">
              Learn the core principles of portfolio construction, asset
              allocation, and rebalancing strategies.
            </p>
            <div className="course-meta">
              <div className="meta-item">
                <i className="bi bi-book" /> <span>12 lessons</span>
              </div>
              <div className="meta-item">
                <i className="bi bi-people" /> <span>2,341 enrolled</span>
              </div>
            </div>
            <div className="course-footer">
              <span className="course-level beginner">Beginner</span>
              <button className="enroll-btn" type="button">
                Enroll Now
              </button>
            </div>
          </div>
          <div className="course-card">
            <div className="course-header">
              <span className="course-type">Course</span>
              <span className="course-duration">
                <i className="bi bi-clock" /> 6 hours
              </span>
            </div>
            <h4 className="course-title">Risk Management Strategies</h4>
            <p className="course-description">
              Master advanced risk management techniques including hedging,
              stop-losses, and portfolio insurance.
            </p>
            <div className="course-meta">
              <div className="meta-item">
                <i className="bi bi-book" /> <span>18 lessons</span>
              </div>
              <div className="meta-item">
                <i className="bi bi-people" /> <span>1,847 enrolled</span>
              </div>
            </div>
            <div className="course-footer">
              <span className="course-level intermediate">Intermediate</span>
              <button className="enroll-btn" type="button">
                Enroll Now
              </button>
            </div>
          </div>
          <div className="course-card">
            <div className="course-header">
              <span className="course-type">Skill</span>
              <span className="course-duration">
                <i className="bi bi-clock" /> 3 hours
              </span>
            </div>
            <h4 className="course-title">Understanding Volatility</h4>
            <p className="course-description">
              Deep dive into market volatility, VIX analysis, and how to profit
              from volatile markets.
            </p>
            <div className="course-meta">
              <div className="meta-item">
                <i className="bi bi-book" /> <span>8 lessons</span>
              </div>
              <div className="meta-item">
                <i className="bi bi-people" /> <span>1,523 enrolled</span>
              </div>
            </div>
            <div className="course-footer">
              <span className="course-level intermediate">Intermediate</span>
              <button className="enroll-btn" type="button">
                Enroll Now
              </button>
            </div>
          </div>
          <div className="course-card">
            <div className="course-header">
              <span className="course-type">Skill</span>
              <span className="course-duration">
                <i className="bi bi-clock" /> 5 hours
              </span>
            </div>
            <h4 className="course-title">Sector Rotation &amp; Allocation</h4>
            <p className="course-description">
              Learn how to rotate between sectors based on economic cycles and
              market conditions.
            </p>
            <div className="course-meta">
              <div className="meta-item">
                <i className="bi bi-book" /> <span>15 lessons</span>
              </div>
              <div className="meta-item">
                <i className="bi bi-people" /> <span>1,289 enrolled</span>
              </div>
            </div>
            <div className="course-footer">
              <span className="course-level advanced">Advanced</span>
              <button className="enroll-btn" type="button">
                Enroll Now
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
