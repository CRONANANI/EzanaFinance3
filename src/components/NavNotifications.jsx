'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

/* ═══════════════════════════════════════════════════════════
   SAMPLE DATA — replace with real subscription-based
   notifications when backend is ready
   ═══════════════════════════════════════════════════════════ */
const SAMPLE_NOTIFICATIONS = [
  { id: '1', type: 'congress', title: 'Nancy Pelosi Trade Alert', content: 'Rep. Nancy Pelosi disclosed new NVIDIA stock purchases worth $1.2M — filed 45 days after execution date.', time: Date.now() - 2 * 60 * 1000, read: false, icon: 'bi-building', badge: 'Congress', priority: 'high' },
  { id: '2', type: 'market_news', title: 'AAPL Breaking News', content: 'Apple announces record Q4 earnings beating estimates by 12%, stock up 5% in after-hours trading.', time: Date.now() - 8 * 60 * 1000, read: false, icon: 'bi-graph-up', badge: 'Earnings', priority: 'high' },
  { id: '3', type: 'portfolio_alerts', title: 'Portfolio Alert', content: 'Your portfolio gained $2,847.31 today (+2.26%). Top movers: NVDA +4.1%, MSFT +2.8%, AAPL +1.9%.', time: Date.now() - 60 * 60 * 1000, read: true, icon: 'bi-graph-up', badge: 'Portfolio', priority: 'medium' },
  { id: '4', type: 'community', title: 'Community Discussion', content: 'Alex commented on your Tesla discussion thread: "Great analysis on the delivery numbers..."', time: Date.now() - 2 * 60 * 60 * 1000, read: false, icon: 'bi-people', badge: 'Community', priority: 'low' },
  { id: '5', type: 'congress', title: 'Dan Crenshaw Trade Alert', content: 'Rep. Dan Crenshaw sold $500K–$1M in defense stocks 3 days before committee vote on procurement bill.', time: Date.now() - 4 * 60 * 60 * 1000, read: true, icon: 'bi-building', badge: 'Congress', priority: 'high' },
  { id: '6', type: 'market_news', title: 'Market Analysis Update', content: 'New quantitative research report on your TSLA position shows strong buy signals across 4 of 6 models.', time: Date.now() - 6 * 60 * 60 * 1000, read: true, icon: 'bi-graph-up', badge: 'Research', priority: 'medium' },
  { id: '7', type: 'portfolio_alerts', title: 'Dividend Payment', content: 'Received $127.50 quarterly dividend payment from MSFT (Microsoft Corp). DRIP reinvested at $428.30/share.', time: Date.now() - 24 * 60 * 60 * 1000, read: true, icon: 'bi-cash-coin', badge: 'Payment', priority: 'low' },
  { id: '8', type: 'congress', title: 'Senate Trading Activity', content: 'Sen. Richard Burr sold $1.8M in airline stocks ahead of pandemic briefing. SEC investigation ongoing.', time: Date.now() - 2 * 24 * 60 * 60 * 1000, read: true, icon: 'bi-building', badge: 'Congress', priority: 'high' },
];

function getTimeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

/**
 * NavNotifications
 *
 * DESKTOP  →  Bell icon sits to the LEFT of the logo in the
 *             dashboard navbar. Click opens a dropdown panel that
 *             appears below the bell. Shows filter tabs, notification
 *             cards with expand-on-click for full detail.
 *
 * MOBILE   →  Vibrating bell icon in the top-left. Click opens a
 *             fullscreen overlay with all notifications. User taps
 *             a notification to expand it, taps X to close overlay.
 *
 * Completely replaces the old NotificationsSidebar + SidebarContext.
 */
export function NavNotifications() {
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return n.type === filter;
  });

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
    setExpandedId(null);
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismissNotification = useCallback((id, e) => {
    e?.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (expandedId === id) setExpandedId(null);
  }, [expandedId]);

  const toggleExpand = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
    markAsRead(id);
  }, [markAsRead]);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    setExpandedId(null);
  }, []);

  /* Close dropdown on outside click (desktop) */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        bellRef.current && !bellRef.current.contains(e.target)
      ) {
        closePanel();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, closePanel]);

  /* Lock body scroll on mobile when overlay is open */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = window.innerWidth <= 768;
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') closePanel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, closePanel]);

  /* ── Shared filter bar ── */
  const FilterBar = ({ extraClass }) => (
    <div className={`nn-filters ${extraClass || ''}`}>
      {[
        { key: 'all', label: 'All' },
        { key: 'unread', label: 'Unread' },
        { key: 'congress', label: 'Congress' },
        { key: 'market_news', label: 'Market' },
        { key: 'portfolio_alerts', label: 'Portfolio' },
        { key: 'community', label: 'Community' },
      ].map((f) => (
        <button
          key={f.key}
          className={`nn-filter ${filter === f.key ? 'nn-filter-active' : ''}`}
          onClick={() => setFilter(f.key)}
          type="button"
        >
          {f.label}
          {f.key === 'unread' && unreadCount > 0 && (
            <span className="nn-filter-count">{unreadCount}</span>
          )}
        </button>
      ))}
    </div>
  );

  /* ── Shared notification list ── */
  const NotifList = ({ className }) => (
    <div className={className}>
      {filtered.length === 0 ? (
        <div className="nn-empty">
          <i className="bi bi-bell-slash" />
          <p>No notifications</p>
        </div>
      ) : (
        filtered.map((n) => (
          <NotificationItem
            key={n.id}
            notification={n}
            expanded={expandedId === n.id}
            onToggle={() => toggleExpand(n.id)}
            onDismiss={(e) => dismissNotification(n.id, e)}
          />
        ))
      )}
    </div>
  );

  return (
    <>
      {/* ════ BELL BUTTON ════ */}
      <button
        ref={bellRef}
        className={`nn-bell-btn ${unreadCount > 0 ? 'nn-has-unread' : ''} ${isOpen ? 'nn-bell-active' : ''}`}
        onClick={toggleOpen}
        title="Notifications"
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
      >
        <i className={`bi bi-bell${isOpen ? '-fill' : ''}`} />
        {unreadCount > 0 && (
          <span className="nn-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {/* ════ DESKTOP DROPDOWN (hidden on mobile via CSS) ════ */}
      {isOpen && (
        <div ref={dropdownRef} className="nn-dropdown">
          <div className="nn-dropdown-header">
            <h3 className="nn-dropdown-title">
              <i className="bi bi-bell-fill" style={{ color: '#10b981', marginRight: '0.5rem', fontSize: '0.875rem' }} />
              Notifications
            </h3>
            <div className="nn-dropdown-actions">
              {unreadCount > 0 && (
                <button className="nn-mark-all" onClick={markAllRead} type="button">
                  Mark all read
                </button>
              )}
            </div>
          </div>
          <FilterBar />
          <NotifList className="nn-list" />
        </div>
      )}

      {/* ════ MOBILE FULLSCREEN OVERLAY (hidden on desktop via CSS) ════ */}
      {isOpen && typeof document !== 'undefined' &&
        createPortal(
          <div className="nn-mobile-overlay" onClick={closePanel}>
            <div className="nn-mobile-panel" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="nn-mobile-header">
                <div className="nn-mobile-header-left">
                  <i className="bi bi-bell-fill nn-mobile-header-icon" />
                  <h3>Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="nn-mobile-unread-count">{unreadCount}</span>
                  )}
                </div>
                <div className="nn-mobile-header-right">
                  {unreadCount > 0 && (
                    <button className="nn-mark-all" onClick={markAllRead} type="button">
                      Mark all read
                    </button>
                  )}
                  <button
                    className="nn-mobile-x"
                    onClick={closePanel}
                    type="button"
                    aria-label="Close notifications"
                  >
                    <i className="bi bi-x-lg" />
                  </button>
                </div>
              </div>

              <FilterBar extraClass="nn-mobile-filters" />
              <NotifList className="nn-mobile-list" />
            </div>
          </div>,
          document.body
        )
      }
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   SINGLE NOTIFICATION CARD
   Used identically in desktop dropdown and mobile overlay.
   Click to expand/collapse. Shows dismiss X when expanded.
   ═══════════════════════════════════════════════════════════ */
function NotificationItem({ notification: n, expanded, onToggle, onDismiss }) {
  return (
    <button
      type="button"
      className={`nn-item ${n.read ? 'nn-read' : 'nn-unread'} ${expanded ? 'nn-expanded' : ''}`}
      onClick={onToggle}
    >
      <div className="nn-item-row">
        <div className={`nn-item-icon nn-icon-${n.type}`}>
          <i className={`bi ${n.icon || 'bi-bell'}`} />
        </div>
        <div className="nn-item-body">
          <div className="nn-item-top">
            <span className="nn-item-badge">{n.badge}</span>
            <span className="nn-item-time">{getTimeAgo(n.time)}</span>
          </div>
          <span className="nn-item-title">{n.title}</span>
          {expanded && (
            <p className="nn-item-content">{n.content}</p>
          )}
        </div>
        <div className="nn-item-right">
          {!n.read && <span className={`nn-unread-dot nn-priority-${n.priority}`} />}
          {expanded && (
            <button
              className="nn-item-dismiss"
              onClick={onDismiss}
              type="button"
              aria-label="Dismiss"
            >
              <i className="bi bi-x" />
            </button>
          )}
        </div>
      </div>
    </button>
  );
}

export default NavNotifications;
