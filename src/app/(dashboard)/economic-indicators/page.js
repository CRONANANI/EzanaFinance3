'use client';

import Link from 'next/link';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/components/learning/learning-opportunities.css';
import '../../../../app-legacy/components/research-tools/economic-indicators-cards.css';
import '../../../../app-legacy/pages/home-dashboard.css';
import '../../../../app-legacy/pages/economic-indicators.css';

export default function EconomicIndicatorsPage() {
  return (
    <div className="economic-indicators-container">
      <div className="stats-grid condensed">
        <div className="stat-card">
          <div className="stat-icon market"><i className="bi bi-graph-up-arrow" /></div>
          <div className="stat-content">
            <div className="stat-value">3.2%</div>
            <div className="stat-label">GDP Growth</div>
            <div className="stat-change positive">Q4 2024</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon performance"><i className="bi bi-currency-dollar" /></div>
          <div className="stat-content">
            <div className="stat-value">5.25%</div>
            <div className="stat-label">Fed Funds Rate</div>
            <div className="stat-change">Current</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon volume"><i className="bi bi-percent" /></div>
          <div className="stat-content">
            <div className="stat-value">3.4%</div>
            <div className="stat-label">CPI YoY</div>
            <div className="stat-change">Latest</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon trades"><i className="bi bi-people" /></div>
          <div className="stat-content">
            <div className="stat-value">3.7%</div>
            <div className="stat-label">Unemployment</div>
            <div className="stat-change positive">Low</div>
          </div>
        </div>
      </div>

      <div className="economic-indicators-grid">
        <div className="economic-indicator-card">
          <div className="indicator-icon"><i className="bi bi-graph-up" /></div>
          <h3>GDP &amp; Growth</h3>
          <p>Track GDP, growth rates, and economic output metrics.</p>
        </div>
        <div className="economic-indicator-card">
          <div className="indicator-icon"><i className="bi bi-bank" /></div>
          <h3>Interest Rates</h3>
          <p>Fed funds rate, treasury yields, and central bank policy.</p>
        </div>
        <div className="economic-indicator-card">
          <div className="indicator-icon"><i className="bi bi-inflation" /></div>
          <h3>Inflation</h3>
          <p>CPI, PPI, PCE and inflation expectations.</p>
        </div>
        <div className="economic-indicator-card">
          <div className="indicator-icon"><i className="bi bi-briefcase" /></div>
          <h3>Employment</h3>
          <p>Unemployment, jobless claims, and labor market data.</p>
        </div>
        <div className="economic-indicator-card">
          <div className="indicator-icon"><i className="bi bi-house" /></div>
          <h3>Housing</h3>
          <p>Home sales, building permits, and housing starts.</p>
        </div>
        <div className="economic-indicator-card">
          <div className="indicator-icon"><i className="bi bi-globe2" /></div>
          <h3>Consumer Sentiment</h3>
          <p>Consumer confidence and sentiment indices.</p>
        </div>
      </div>

      <section className="learning-opportunities">
        <div className="learning-header">
          <div className="learning-title-area">
            <div className="learning-icon"><i className="bi bi-mortarboard-fill" /></div>
            <div className="learning-title-text">
              <h3>Economic Data Courses</h3>
              <p>Learn to interpret and use economic indicators</p>
            </div>
          </div>
          <Link href="/learning-center" className="view-all-btn">View All Courses</Link>
        </div>
        <div className="courses-grid">
          <div className="course-card">
            <div className="course-header"><span className="course-type">Course</span><span className="course-duration"><i className="bi bi-clock" /> 6 hours</span></div>
            <h4 className="course-title">Understanding Economic Indicators</h4>
            <p className="course-description">Learn how GDP, CPI, and employment data impact markets.</p>
            <div className="course-footer"><span className="course-level intermediate">Intermediate</span><button className="enroll-btn" type="button">Enroll Now</button></div>
          </div>
        </div>
      </section>
    </div>
  );
}
