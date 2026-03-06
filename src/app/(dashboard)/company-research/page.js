'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/components/learning/learning-opportunities.css';
import '../../../../app-legacy/pages/company-research.css';
import '../../../../app-legacy/components/grpv/snappy-slider.css';

export default function CompanyResearchPage() {
  const scriptLoadedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (scriptLoadedRef.current) return;
    scriptLoadedRef.current = true;

    const loadScript = (src) => new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(s);
    });

    const init = async () => {
      try {
        if (!mountedRef.current) return;
        await loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js');
        if (!mountedRef.current) return;
        await loadScript('/app-legacy/js/api-config.js');
        if (!mountedRef.current) return;
        await loadScript('/app-legacy/assets/js/alpha-vantage-api.js').catch(() => {});
        if (!mountedRef.current) return;
        if (!document.getElementById('heatmapContainer')) return;
        await loadScript('/app-legacy/pages/company-research.js');
        if (mountedRef.current && window.marketChartWidget?.renderHeatmap) {
          window.marketChartWidget.renderHeatmap();
        }
      } catch (e) {
        console.warn('Company research init:', e);
      }
    };

    init();
  }, []);

  return (
    <>
      <div className="company-search-wrapper">
        <div className="search-container">
          <i className="bi bi-search" />
          <input type="text" id="companySearchInput" placeholder="Search company or ticker (e.g., NVDA, Apple Inc.)" className="company-search-input" autoComplete="off" />
          <button className="search-btn" id="searchCompanyBtn" type="button"><i className="bi bi-arrow-right" /></button>
        </div>
        <div className="search-suggestions" id="searchSuggestions" />
      </div>

      <div className="stats-grid" id="companyStatsGrid">
        <div className="stat-card" id="stat-mcap">
          <div className="stat-icon market"><i className="bi bi-building" /></div>
          <div className="stat-content">
            <div className="stat-value" id="statMarketCap">--</div>
            <div className="stat-label">Market Cap</div>
            <div className="stat-change" id="statCapType">--</div>
          </div>
        </div>
        <div className="stat-card" id="stat-pe">
          <div className="stat-icon performance"><i className="bi bi-trophy" /></div>
          <div className="stat-content">
            <div className="stat-value" id="statPE">--</div>
            <div className="stat-label">P/E Ratio</div>
            <div className="stat-change" id="statPELabel">--</div>
          </div>
        </div>
        <div className="stat-card" id="stat-divyield">
          <div className="stat-icon stocks"><i className="bi bi-cash-coin" /></div>
          <div className="stat-content">
            <div className="stat-value" id="statDivYield">--</div>
            <div className="stat-label">Dividend Yield</div>
            <div className="stat-change" id="statDivYieldLabel">--</div>
          </div>
        </div>
        <div className="stat-card" id="stat-eps">
          <div className="stat-icon volume"><i className="bi bi-graph-up-arrow" /></div>
          <div className="stat-content">
            <div className="stat-value" id="statEPS">--</div>
            <div className="stat-label">EPS</div>
            <div className="stat-change" id="statEPSLabel">--</div>
          </div>
        </div>
      </div>

      <section className="market-chart-section" id="marketChartSection">
        <div id="heatmapView">
          <div className="chart-header compact">
            <div className="chart-title-area">
              <h2 className="chart-title">Stock Market Heatmap</h2>
              <span className="heatmap-subtitle">S&amp;P 500 · Performance YTD % · Market Cap</span>
            </div>
          </div>
          <div className="heatmap-container" id="heatmapContainer">
            <div className="chart-loading" id="heatmapLoading">
              <i className="bi bi-arrow-repeat spin" />
              <span>Loading heatmap...</span>
            </div>
          </div>
        </div>

        <div id="stockChartView" style={{ display: 'none' }}>
          <div className="chart-header compact">
            <div className="chart-title-area">
              <h2 className="chart-title" id="stockChartTitle">--</h2>
              <div className="market-chart-meta" id="stockChartMeta">
                <span className="market-price" id="stockPrice">--</span>
                <span className="market-change" id="stockChange">--</span>
              </div>
            </div>
            <div className="chart-controls">
              <button className="back-to-heatmap-btn" id="backToHeatmap" type="button"><i className="bi bi-grid-3x3-gap" /> Heatmap</button>
              <div className="time-range-selector compact" id="stockTimeRange">
                <button className="time-btn" type="button" data-range="1D">1D</button>
                <button className="time-btn" type="button" data-range="1W">1W</button>
                <button className="time-btn active" type="button" data-range="1M">1M</button>
                <button className="time-btn" type="button" data-range="3M">3M</button>
                <button className="time-btn" type="button" data-range="6M">6M</button>
                <button className="time-btn" type="button" data-range="1Y">1Y</button>
              </div>
            </div>
          </div>
          <div className="chart-container compact" id="stockChartContainer">
            <div className="chart-loading" id="stockChartLoading">
              <i className="bi bi-arrow-repeat spin" />
              <span>Loading stock data...</span>
            </div>
            <canvas id="stockChart" />
          </div>
          <div className="market-chart-footer" id="stockChartFooter">
            <div className="market-stat"><span className="market-stat-label">Open</span><span className="market-stat-value" id="mstatOpen">--</span></div>
            <div className="market-stat"><span className="market-stat-label">High</span><span className="market-stat-value" id="mstatHigh">--</span></div>
            <div className="market-stat"><span className="market-stat-label">Low</span><span className="market-stat-value" id="mstatLow">--</span></div>
            <div className="market-stat"><span className="market-stat-label">Volume</span><span className="market-stat-value" id="mstatVolume">--</span></div>
            <div className="market-stat"><span className="market-stat-label">Prev Close</span><span className="market-stat-value" id="mstatPrevClose">--</span></div>
          </div>
        </div>
      </section>

      <section className="models-carousel-section compact">
        <button className="carousel-nav prev" id="modelsCarouselPrev" type="button"><i className="bi bi-chevron-left" /></button>
        <div className="models-carousel-container">
          <div className="models-carousel-track" id="modelsCarouselTrack">
            <div className="model-metric-card model-card grpv-flagship" data-model="grpv">
              <div className="grpv-brand-logo">
                <img src="/app-legacy/assets/images/ezana-logo.png" alt="Ezana Finance" className="grpv-logo-img" />
              </div>
              <div className="model-metric-content">
                <span className="model-metric-label">GRPV Analysis</span>
                <span className="model-metric-value">Score out of 72</span>
                <span className="model-metric-change">Flagship · Select to run</span>
              </div>
            </div>
            <div className="model-metric-card model-card" data-model="dcf">
              <div className="model-metric-icon dcf"><i className="bi bi-cash-stack" /></div>
              <div className="model-metric-content">
                <span className="model-metric-label">DCF Valuation</span>
                <span className="model-metric-value">5-year projections</span>
                <span className="model-metric-change">Select to run</span>
              </div>
            </div>
            <div className="model-metric-card model-card" data-model="three-statement">
              <div className="model-metric-icon three-statement"><i className="bi bi-file-earmark-spreadsheet" /></div>
              <div className="model-metric-content">
                <span className="model-metric-label">Three-Statement</span>
                <span className="model-metric-value">Linked statements</span>
                <span className="model-metric-change">Select to run</span>
              </div>
            </div>
            <div className="model-metric-card model-card" data-model="comps">
              <div className="model-metric-icon comps"><i className="bi bi-list-check" /></div>
              <div className="model-metric-content">
                <span className="model-metric-label">Comparable Cos</span>
                <span className="model-metric-value">Trading multiples</span>
                <span className="model-metric-change">Select to run</span>
              </div>
            </div>
            <div className="model-metric-card model-card" data-model="lbo">
              <div className="model-metric-icon lbo"><i className="bi bi-diagram-3" /></div>
              <div className="model-metric-content">
                <span className="model-metric-label">LBO Model</span>
                <span className="model-metric-value">Leveraged buyout</span>
                <span className="model-metric-change">Select to run</span>
              </div>
            </div>
          </div>
        </div>
        <button className="carousel-nav next" id="modelsCarouselNext" type="button"><i className="bi bi-chevron-right" /></button>
      </section>

      <section className="model-detail-section" id="modelDetailSection" style={{ display: 'none' }}>
        <div className="component-card model-detail-card">
          <div className="card-header">
            <h3 id="modelDetailTitle">Financial Analysis Model</h3>
            <button className="card-action-btn" id="modelDetailClose" type="button"><i className="bi bi-x-lg" /> Close</button>
          </div>
          <div className="model-detail-body" id="modelDetailBody" />
        </div>
      </section>

      <div id="companyInfoPanel" style={{ display: 'none' }} className="company-info-panel">
        <div className="company-info-grid">
          <div className="company-info-main">
            <div className="company-header-row">
              <img id="companyLogo" src="" alt="" className="company-logo" style={{ display: 'none' }} />
              <div>
                <h2 id="companyName">--</h2>
                <span id="companySector" className="company-sector-badge">--</span>
                <span id="companyExchange" className="company-exchange-badge">--</span>
              </div>
            </div>
            <p id="companyDescription" className="company-description">Search for a company to see its details.</p>
          </div>
          <div className="company-info-sidebar">
            <div className="info-row"><span className="info-label">CEO</span><span id="companyCEO" className="info-value">--</span></div>
            <div className="info-row"><span className="info-label">Employees</span><span id="companyEmployees" className="info-value">--</span></div>
            <div className="info-row"><span className="info-label">IPO Date</span><span id="companyIPODate" className="info-value">--</span></div>
            <div className="info-row"><span className="info-label">52W High</span><span id="company52High" className="info-value">--</span></div>
            <div className="info-row"><span className="info-label">52W Low</span><span id="company52Low" className="info-value">--</span></div>
            <div className="info-row"><span className="info-label">Div Yield</span><span id="companyDivYield" className="info-value">--</span></div>
            <div className="info-row"><span className="info-label">DCF Value</span><span id="companyDCF" className="info-value">--</span></div>
            <div className="info-row"><span className="info-label">Analyst Rating</span><span id="companyRating" className="info-value">--</span></div>
          </div>
        </div>
        <div id="companyFinancials" className="company-financials-section" style={{ display: 'none' }}>
          <h3><i className="bi bi-table" /> Key Financial Metrics</h3>
          <div className="financials-table-wrap" id="financialsTableWrap" />
        </div>
        <div id="companyPeers" className="company-peers-section" style={{ display: 'none' }}>
          <h3><i className="bi bi-people" /> Peer Companies</h3>
          <div className="peers-list" id="peersList" />
        </div>
      </div>

      <section className="learning-opportunities">
        <div className="learning-header">
          <div className="learning-title-area">
            <div className="learning-icon"><i className="bi bi-mortarboard-fill" /></div>
            <div className="learning-title-text">
              <h3>Fundamental Analysis Mastery</h3>
              <p>Deep dive into financial statement analysis and valuation</p>
            </div>
          </div>
          <Link href="/learning-center" className="view-all-btn">View All Courses</Link>
        </div>
        <div className="courses-grid">
          <div className="course-card">
            <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 6 hours</span></div>
            <h4 className="course-title">Financial Statement Analysis</h4>
            <p className="course-description">Master reading and analyzing income statements, balance sheets, and cash flow statements.</p>
            <div className="course-meta"><div className="meta-item"><i className="bi bi-book" /> 20 lessons</div><div className="meta-item"><i className="bi bi-people" /> 3,241 enrolled</div></div>
            <div className="course-footer"><span className="course-level intermediate">Intermediate</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
          <div className="course-card">
            <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 8 hours</span></div>
            <h4 className="course-title">Valuation Methods &amp; DCF Modeling</h4>
            <p className="course-description">Learn to build discounted cash flow models and understand various valuation methodologies.</p>
            <div className="course-meta"><div className="meta-item"><i className="bi bi-book" /> 24 lessons</div><div className="meta-item"><i className="bi bi-people" /> 2,847 enrolled</div></div>
            <div className="course-footer"><span className="course-level advanced">Advanced</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
          <div className="course-card">
            <div className="course-header"><span className="course-type">Skill</span><span className="course-duration"><i className="bi bi-clock" /> 4 hours</span></div>
            <h4 className="course-title">Earnings Call Analysis</h4>
            <p className="course-description">Learn to extract insights from quarterly earnings calls and management guidance.</p>
            <div className="course-meta"><div className="meta-item"><i className="bi bi-book" /> 14 lessons</div><div className="meta-item"><i className="bi bi-people" /> 1,923 enrolled</div></div>
            <div className="course-footer"><span className="course-level intermediate">Intermediate</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
          <div className="course-card">
            <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 5 hours</span></div>
            <h4 className="course-title">Competitive Analysis Frameworks</h4>
            <p className="course-description">Master Porter&apos;s Five Forces, SWOT analysis, and competitive positioning strategies.</p>
            <div className="course-meta"><div className="meta-item"><i className="bi bi-book" /> 18 lessons</div><div className="meta-item"><i className="bi bi-people" /> 2,134 enrolled</div></div>
            <div className="course-footer"><span className="course-level beginner">Beginner</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
        </div>
      </section>
    </>
  );
}
