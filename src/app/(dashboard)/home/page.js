'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { usePin } from '@/contexts/PinContext';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/pages/home-dashboard.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/congressional-trading-card/congressional-trading-card.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/government-contracts-card/government-contracts-card.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/house-trading-card/house-trading-card.css';
import '../../../../app-legacy/components/pages/inside-the-capitol/senator-trading-card/senator-trading-card.css';

const CARD_PREVIEWS = {
  'portfolio-value': () => (
    <div className="metric-card active">
      <div className="metric-icon portfolio"><i className="bi bi-wallet2" /></div>
      <div className="metric-content">
        <span className="metric-label">Portfolio Value</span>
        <span className="metric-value">$158,420</span>
        <span className="metric-change positive">+24.5% YTD</span>
      </div>
    </div>
  ),
  'recent-transactions': () => (
    <div className="transaction-list">
      <div className="transaction-item buy">
        <div className="transaction-icon"><i className="bi bi-arrow-up-circle" /></div>
        <div className="transaction-details">
          <div className="transaction-name">NVDA</div>
          <div className="transaction-meta">Bought 10 shares</div>
        </div>
        <div className="transaction-amount">
          <div className="amount">$4,850.00</div>
          <div className="date">Today</div>
        </div>
      </div>
    </div>
  ),
  'congressional-trading': () => (
    <div className="congressional-stats-grid">
      <div className="congressional-stat-row">
        <span className="congressional-stat-label">Total Trades:</span>
        <span className="congressional-stat-value">-</span>
      </div>
    </div>
  ),
  'top-holdings': () => (
    <div className="holdings-list">
      <div className="holding-item">
        <div className="holding-rank">1</div>
        <div className="holding-info">
          <div className="holding-name">NVDA</div>
          <div className="holding-shares">150 shares</div>
        </div>
        <div className="holding-value">
          <div className="value">$72,850</div>
          <div className="change positive">+12.4%</div>
        </div>
      </div>
    </div>
  ),
  'performance-summary': () => (
    <div className="performance-metrics">
      <div className="perf-metric">
        <div className="perf-label">Total Return</div>
        <div className="perf-value positive">+8.4%</div>
      </div>
    </div>
  ),
  'alerts-recommendations': () => (
    <div className="alerts-list">
      <div className="alert-item high">
        <div className="alert-title">Rebalancing Suggested</div>
      </div>
    </div>
  ),
  'government-contracts': () => (
    <div className="government-contracts-stats-grid">
      <div className="government-contracts-stat-row">
        <span className="government-contracts-stat-label">Total Contracts:</span>
        <span className="government-contracts-stat-value">567</span>
      </div>
    </div>
  ),
  'house-trading': () => (
    <div className="house-trading-stats-grid">
      <div className="house-trading-stat-row">
        <span className="house-trading-stat-label">Total Trades:</span>
        <span className="house-trading-stat-value">890</span>
      </div>
    </div>
  ),
  'senator-trading': () => (
    <div className="senator-trading-stats-grid">
      <div className="senator-trading-stat-row">
        <span className="senator-trading-stat-label">Total Trades:</span>
        <span className="senator-trading-stat-value">456</span>
      </div>
    </div>
  ),
  'recent-activity': () => <p className="text-muted">Watchlist activity</p>,
  'quant-model': () => <p className="text-muted">Model analysis</p>,
  'company-overview': () => <p className="text-muted">Company overview</p>,
  'stock-quote': () => <p className="text-muted">Stock quote</p>,
  'key-metrics': () => <p className="text-muted">Key metrics</p>,
  'analyst-recommendations': () => <p className="text-muted">Analyst recommendations</p>,
  'company-news': () => <p className="text-muted">Company news</p>,
  'earnings-card': () => <p className="text-muted">Earnings</p>,
  'competitors-card': () => <p className="text-muted">Competitors</p>,
  'stock-heatmap': () => <p className="text-muted">Stock heatmap</p>,
  'global-capital-markets': () => <p className="text-muted">Global capital markets</p>,
  'backtesting-engine': () => <p className="text-muted">Backtesting engine</p>,
  'statistical-analysis': () => <p className="text-muted">Statistical analysis</p>,
  'ml-predictions': () => <p className="text-muted">ML predictions</p>,
  'portfolio-optimization': () => <p className="text-muted">Portfolio optimization</p>,
  'risk-analytics': () => <p className="text-muted">Risk analytics</p>,
  'stock-watchlist': () => <p className="text-muted">Watchlist</p>,
  'price-alerts': () => <p className="text-muted">Price alerts</p>,
  'community-feed': () => <p className="text-muted">Community feed</p>,
  'my-friends': () => <p className="text-muted">My friends</p>,
  'friends-activity': () => <p className="text-muted">Friends activity</p>,
  'active-discussions': () => <p className="text-muted">Active discussions</p>,
  'leaderboard': () => <p className="text-muted">Leaderboard</p>,
  'community-insights': () => <p className="text-muted">Community insights</p>,
  'learning-course-table': () => <p className="text-muted">My courses</p>,
  'learning-achievements': () => <p className="text-muted">Achievements</p>,
  'lobbying-activity': () => <p className="text-muted">Lobbying activity</p>,
  'patent-momentum': () => <p className="text-muted">Patent momentum</p>,
  'market-sentiment': () => <p className="text-muted">Market sentiment</p>,
};

function CardPreview({ card }) {
  const render = CARD_PREVIEWS[card.id];
  if (!render) {
    return <p className="text-muted">Preview not available</p>;
  }
  return render();
}

export default function HomeHubPage() {
  const { pinned, updateLayout } = usePin();
  const [width, setWidth] = useState(1200);

  useEffect(() => {
    const updateWidth = () => setWidth(typeof window !== 'undefined' ? window.innerWidth - 80 : 1200);
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const layoutFromPinned = useCallback(() => {
    return pinned.map((p) => ({
      i: p.id,
      x: p.x,
      y: p.y,
      w: p.w,
      h: p.h,
    }));
  }, [pinned]);

  const onLayoutChange = (newLayout) => {
    updateLayout(newLayout);
  };

  if (pinned.length === 0) {
    return (
      <div className="page-content">
        <div className="home-hub-empty">
          <h1 className="text-2xl font-bold text-white mb-2">Your Home Hub</h1>
          <p className="text-muted-foreground mb-6">
            Pin component cards from any page to build your custom dashboard. Click the pin icon on any card to add it here.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/home-dashboard" className="btn-primary">
              <i className="bi bi-speedometer2" /> Go to Dashboard
            </Link>
            <Link href="/inside-the-capitol" className="btn-secondary">
              <i className="bi bi-building" /> Inside The Capitol
            </Link>
            <Link href="/company-research" className="btn-secondary">
              <i className="bi bi-bar-chart-line" /> Company Research
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="home-hub-header mb-6">
        <h1 className="text-2xl font-bold text-white">Your Home Hub</h1>
        <p className="text-muted-foreground mb-0">
          Drag cards to rearrange. Pin more cards from any page.
        </p>
      </div>
      <GridLayout
        className="layout"
        layout={layoutFromPinned()}
        onLayoutChange={onLayoutChange}
        cols={12}
        rowHeight={120}
        width={width}
        draggableHandle=".home-hub-card-header"
        isDraggable
        isResizable
      >
        {pinned.map((card) => (
          <div key={card.id} className="home-hub-card component-card">
            <div className="home-hub-card-header card-header flex justify-between items-center cursor-move">
              <span className="font-semibold">{card.title}</span>
              <Link
                href={card.sourcePage}
                className="text-sm text-emerald-500 hover:text-emerald-400"
                onClick={(e) => e.stopPropagation()}
              >
                View full <i className="bi bi-arrow-right" />
              </Link>
            </div>
            <div className="card-body overflow-auto">
              <CardPreview card={card} />
            </div>
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
