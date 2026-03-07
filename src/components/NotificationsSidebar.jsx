'use client';

import { useState, useCallback } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';

const SAMPLE_NOTIFICATIONS = [
  { id: '1', type: 'congress', title: 'Nancy Pelosi Trade Alert', content: 'Rep. Nancy Pelosi disclosed new NVIDIA stock purchases worth $1.2M', time: Date.now() - 2 * 60 * 1000, read: false, icon: 'bi-building', badge: 'Congress', priority: 'high', sentiment: 'bullish', ticker: 'NVDA' },
  { id: '2', type: 'market_news', title: 'AAPL Breaking News', content: 'Apple announces record Q4 earnings, stock up 5% in after-hours trading', time: Date.now() - 8 * 60 * 1000, read: false, icon: 'bi-graph-up', badge: 'Earnings', priority: 'high', sentiment: 'bullish', ticker: 'AAPL' },
  { id: '3', type: 'portfolio_alerts', title: 'Portfolio Alert', content: 'Your portfolio gained $2,847.31 today (+2.26%)', time: Date.now() - 60 * 60 * 1000, read: true, icon: 'bi-graph-up', badge: 'Portfolio', priority: 'medium', sentiment: 'bullish' },
  { id: '4', type: 'community', title: 'Community Discussion', content: 'Alex commented on your Tesla discussion thread', time: Date.now() - 2 * 60 * 60 * 1000, read: false, icon: 'bi-people', badge: 'Community', priority: 'low' },
  { id: '5', type: 'congress', title: 'Dan Crenshaw Trade Alert', content: 'Rep. Dan Crenshaw sold defense stocks before committee vote', time: Date.now() - 4 * 60 * 60 * 1000, read: true, icon: 'bi-building', badge: 'Congress', priority: 'high', sentiment: 'bearish' },
  { id: '6', type: 'market_news', title: 'Market Analysis', content: 'New research report on your TSLA position shows strong buy signals', time: Date.now() - 6 * 60 * 60 * 1000, read: true, icon: 'bi-graph-up', badge: 'Research', priority: 'medium', sentiment: 'bullish', ticker: 'TSLA' },
  { id: '7', type: 'portfolio_alerts', title: 'Dividend Payment', content: 'Received $127.50 dividend payment from MSFT', time: Date.now() - 24 * 60 * 60 * 1000, read: true, icon: 'bi-graph-up', badge: 'Payment', priority: 'low', ticker: 'MSFT' },
  { id: '8', type: 'congress', title: 'Senate Trading Activity', content: 'Sen. Richard Burr sold $1.8M in airline stocks before market crash', time: Date.now() - 2 * 24 * 60 * 60 * 1000, read: true, icon: 'bi-building', badge: 'Congress', priority: 'high', sentiment: 'bearish' },
  { id: '9', type: 'market_news', title: 'Market Volatility Alert', content: 'S&P 500 dropped 2.3% - consider rebalancing your portfolio', time: Date.now() - 3 * 24 * 60 * 60 * 1000, read: true, icon: 'bi-graph-down', badge: 'Market', priority: 'high', sentiment: 'bearish' },
  { id: '10', type: 'community', title: 'New Discussion Thread', content: 'Sarah started a discussion about renewable energy stocks', time: Date.now() - 4 * 24 * 60 * 60 * 1000, read: true, icon: 'bi-people', badge: 'Community', priority: 'low' },
  { id: '11', type: 'congress', title: 'House Committee Vote', content: 'Financial Services Committee votes on banking regulations tomorrow', time: Date.now() - 5 * 24 * 60 * 60 * 1000, read: true, icon: 'bi-building', badge: 'Congress', priority: 'medium' },
  { id: '12', type: 'market_news', title: 'Earnings Report', content: 'Tesla Q4 earnings beat expectations, stock up 8% pre-market', time: Date.now() - 6 * 24 * 60 * 60 * 1000, read: true, icon: 'bi-graph-up', badge: 'Earnings', priority: 'high', sentiment: 'bullish', ticker: 'TSLA' },
];

function getTimeAgo(ts) {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function NotificationsSidebar() {
  const { notificationsOpen, toggleNotifications } = useSidebar();
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);
  const [filter, setFilter] = useState('all');

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'stocks') return ['market_news', 'portfolio_alerts', 'stocks'].includes(n.type);
    return n.type === filter;
  });

  const markAsRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  return (
    <>
      <div
        id="notifications-sidebar"
        className={`notifications-sidebar ${notificationsOpen ? 'open' : ''}`}
      >
        <button
          className="notifications-toggle"
          onClick={toggleNotifications}
          title="Toggle notifications"
        >
          <i className="bi bi-bell"></i>
        </button>
        <div className="notifications-content">
          <div className="notifications-header">
            <div className="notifications-title">
              <h3>Investment Feed</h3>
            </div>
            <div className="notifications-actions">
              <button className="notifications-settings" title="Notification settings">
                <i className="bi bi-gear"></i>
              </button>
            </div>
          </div>
          <div className="notifications-filters">
            {['all', 'congress', 'stocks', 'community'].map((f) => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="notifications-list">
            {filtered.length === 0 ? (
              <div className="notifications-empty">
                <i className="bi bi-bell-slash"></i>
                <p>No notifications yet</p>
                <small>We&apos;ll notify you when something important happens</small>
              </div>
            ) : (
              filtered.map((n) => (
                <div key={n.id} className={`notification-item ${n.type} ${n.read ? 'read' : ''}`} onClick={() => markAsRead(n.id)}>
                  <div className="notification-icon-wrap">
                    <div className={`notification-icon ${n.type}`}>
                      <i className={`bi ${n.icon || 'bi-bell'}`}></i>
                    </div>
                  </div>
                  <div className="notification-item-content">
                    <span className="notification-type-badge">{n.badge || n.type}</span>
                    <span className="notification-item-title">{n.title}</span>
                    <span className="notification-item-text">{n.content}</span>
                    <span className="notification-time">{getTimeAgo(n.time)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
