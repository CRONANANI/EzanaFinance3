'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import PortfolioDashboard from '@/components/dashboard/PortfolioDashboard';
import { PortfolioChart } from '@/components/dashboard/PortfolioChart';
import { PortfolioNews } from '@/components/dashboard/PortfolioNews';
import { PortfolioSummaryCard } from '@/components/portfolio/PortfolioSummaryCard';
import { usePortfolio } from '@/contexts/PortfolioContext';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/components/learning/learning-opportunities.css';
import '../../../../app-legacy/pages/home-dashboard.css';

const CAROUSEL_METRICS = [
  { label: 'Portfolio Value', value: '$158,420', change: '+24.5% YTD' },
  { label: "Today's P&L", value: '+$1,247', change: '+0.82% today' },
  { label: 'Top Performer', value: 'NVDA', change: '+12.4%' },
  { label: 'Risk Score', value: '6.2/10', change: '-0.3 vs last week' },
  { label: 'Monthly Dividends', value: '$847', change: '+12.0% MoM' },
  { label: 'Asset Allocation', value: 'Balanced', change: 'Stocks 65% • Bonds 20%' },
  { label: 'Volatility', value: '4.8/10', change: '-0.4 this month' },
  { label: 'Beta vs Market', value: '1.05', change: 'Near market sensitivity' },
  { label: 'Sector Exposure', value: 'Tech 35%', change: 'Top 3 sectors tracked' },
];

const formatCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v);

export default function HomeDashboardPage() {
  const scriptLoadedRef = useRef(false);
  const [brokerageOpen, setBrokerageOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const { portfolio } = usePortfolio();
  const transactions = portfolio?.recentTransactions ?? [];

  const exportReport = useCallback(() => {
    const rows = CAROUSEL_METRICS.map((m) => [m.label, m.value, m.change].join(','));
    const csv = ['Metric,Value,Change', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    if (scriptLoadedRef.current) return;
    scriptLoadedRef.current = true;
    let mounted = true;

    const loadScript = (src) => new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(s);
    });

    const init = async () => {
      try {
        if (!document.getElementById('mainChart')) return;
        await loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js');
        if (!mounted) return;
        await loadScript('/app-legacy/pages/home-dashboard.js');
        if (mounted && typeof window !== 'undefined' && window.initHomeDashboard) {
          window.initHomeDashboard();
        }
      } catch (e) {
        console.warn('Home dashboard init:', e);
      }
    };
    init();
    return () => {
      mounted = false;
      if (typeof window !== 'undefined' && window.portfolioDashboard) {
        window.portfolioDashboard.stopMarketQuotesPolling?.();
        window.portfolioDashboard = null;
      }
    };
  }, []);

  return (
    <>
      {/* Quick Actions Bar */}
      <section className="quick-actions-bar compact" data-react-controlled>
        <button className="quick-action-btn quick-action-brokerage" id="connectBrokerageBtn" data-action="brokerage" onClick={() => setBrokerageOpen(true)}>
          <i className="bi bi-bank" />
          <span>Connect Brokerage</span>
        </button>
        <button className="quick-action-btn" data-action="refresh" onClick={() => window.portfolioDashboard?.updateChart?.('portfolio')}>
          <i className="bi bi-arrow-clockwise" />
          <span>Refresh</span>
        </button>
        <button className="quick-action-btn" data-action="report" onClick={exportReport}>
          <i className="bi bi-file-earmark-text" />
          <span>Report</span>
        </button>
        <button className="quick-action-btn" data-action="analysis" onClick={() => setAnalysisOpen(true)}>
          <i className="bi bi-graph-up" />
          <span>Analysis</span>
        </button>
        <button className="quick-action-btn" data-action="alerts" onClick={() => setAlertsOpen(true)}>
          <i className="bi bi-bell" />
          <span>Alerts</span>
        </button>
      </section>

      {brokerageOpen && createPortal(
        <div className="modal-overlay" onClick={() => setBrokerageOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Connect Brokerage Account</h3>
              <button type="button" className="modal-close" onClick={() => setBrokerageOpen(false)}><i className="bi bi-x-lg" /></button>
            </div>
            <p>Connect your brokerage via Plaid to sync your portfolio automatically. You&apos;ll be redirected to a secure Plaid flow.</p>
            <button type="button" className="btn-primary" onClick={() => { setBrokerageOpen(false); if (typeof window !== 'undefined' && window.portfolioDashboard?.openPlaidLink) window.portfolioDashboard.openPlaidLink(); }}>
              <i className="bi bi-bank" /> Connect with Plaid
            </button>
          </div>
        </div>,
        document.body
      )}

      {alertsOpen && createPortal(
        <div className="modal-overlay" onClick={() => setAlertsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Portfolio Alerts</h3>
              <button type="button" className="modal-close" onClick={() => setAlertsOpen(false)}><i className="bi bi-x-lg" /></button>
            </div>
            <p>Configure alerts for your portfolio. Toggle the options below.</p>
            <div className="alerts-config">
              <label><input type="checkbox" defaultChecked /> Portfolio value changes</label>
              <label><input type="checkbox" defaultChecked /> Rebalancing suggestions</label>
              <label><input type="checkbox" /> Dividend payments</label>
              <label><input type="checkbox" defaultChecked /> Price alerts for holdings</label>
            </div>
            <button type="button" className="btn-primary" onClick={() => setAlertsOpen(false)}>Save</button>
          </div>
        </div>,
        document.body
      )}

      {analysisOpen && createPortal(
        <div className="modal-overlay" onClick={() => setAnalysisOpen(false)}>
          <div className="modal-content modal-content-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Portfolio vs Market Indices</h3>
              <button type="button" className="modal-close" onClick={() => setAnalysisOpen(false)}><i className="bi bi-x-lg" /></button>
            </div>
            <p>Compare your portfolio performance against S&P 500, NASDAQ, and Dow Jones.</p>
            <div className="comparison-index-legend">
              <span><i className="bi bi-circle-fill" style={{ color: '#10b981' }} /> Your Portfolio</span>
              <span><i className="bi bi-circle-fill" style={{ color: '#3b82f6' }} /> S&P 500</span>
              <span><i className="bi bi-circle-fill" style={{ color: '#8b5cf6' }} /> NASDAQ</span>
              <span><i className="bi bi-circle-fill" style={{ color: '#f59e0b' }} /> Dow Jones</span>
            </div>
            <p className="text-muted">Chart will display when market data is available.</p>
          </div>
        </div>,
        document.body
      )}

      {/* Portfolio Dashboard (Plaid/Supabase) */}
      <section className="portfolio-dashboard-section" style={{ marginBottom: '2rem' }}>
        <PortfolioDashboard />
      </section>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Portfolio Summary Card */}
        <PortfolioSummaryCard />
        {/* Main Chart Section */}
        <section className="main-chart-section">
          <div id="lineChartContainer">
            <PortfolioChart />
          </div>
          <select
            className="filter-select allocation-timeframe-select"
            id="allocationTimeframe"
            style={{ display: 'none' }}
          />
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

        {/* Portfolio News - real data from holdings */}
        <PortfolioNews />
      </div>

      {/* Recent Transactions - full width, real data */}
      <div className="recent-transactions-full-width">
        <section className="component-card transactions-card transactions-card-full">
          <div className="card-header card-header-tight">
            <h3>Recent Transactions</h3>
            <button className="card-action-btn" type="button">View All</button>
          </div>
          <div className="card-body card-body-tight">
            <div className="transaction-list">
              {transactions.length === 0 ? (
                <div className="transaction-empty text-gray-500 py-4 text-center">
                  No recent transactions. Connect your brokerage to sync your activity.
                </div>
              ) : (
                transactions.slice(0, 10).map((tx) => {
                  const typeStr = (tx.type || tx.subtype || '').toLowerCase();
                  const isBuy = typeStr.includes('buy') || typeStr.includes('purchase');
                  const amount = Math.abs(Number(tx.amount) || 0);
                  const qty = tx.quantity ? ` ${Number(tx.quantity)} shares` : '';
                  const desc = (tx.subtype || tx.type || (isBuy ? 'Buy' : 'Sell')).replace(/_/g, ' ');
                  const dateStr = tx.date ? new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                  const displayName = tx.metadata?.ticker || tx.name || tx.security_id || 'Transaction';
                  return (
                    <div key={tx.id || tx.transaction_id || `${tx.date}-${tx.name}-${tx.amount}`} className={`transaction-item ${isBuy ? 'buy' : 'sell'}`}>
                      <div className="transaction-icon">
                        <i className={isBuy ? 'bi bi-arrow-up-circle' : 'bi bi-arrow-down-circle'} />
                      </div>
                      <div className="transaction-details">
                        <div className="transaction-name">{displayName}</div>
                        <div className="transaction-meta">{desc}{qty}</div>
                      </div>
                      <div className="transaction-amount">
                        <div className="amount">{formatCurrency(amount)}</div>
                        <div className="date">{dateStr}</div>
                      </div>
                    </div>
                  );
                })
              )}
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
