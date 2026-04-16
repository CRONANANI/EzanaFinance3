'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

function mapDbNotification(row) {
  const t = row.type || 'general';
  const badge =
    t === 'community'
      ? 'Community'
      : t === 'portfolio_alerts'
        ? 'Portfolio'
        : t === 'market_news'
          ? 'Market'
          : t === 'congress'
            ? 'Congress'
            : t === 'learning'
              ? 'Learning'
              : 'Notification';
  const icon =
    t === 'community'
      ? 'bi-people'
      : t === 'portfolio_alerts'
        ? 'bi-graph-up'
        : t === 'market_news'
          ? 'bi-graph-up'
          : t === 'congress'
            ? 'bi-building'
            : t === 'learning'
              ? 'bi-mortarboard'
              : 'bi-bell';
  return {
    id: row.id,
    type: t,
    title: row.title,
    content: row.content || '',
    time: new Date(row.created_at).getTime(),
    read: !!row.read,
    icon,
    badge,
    priority: 'medium',
  };
}

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
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
    setExpandedId(null);
  }, []);

  const markAsRead = useCallback(
    async (id) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      if (String(id).startsWith('fr-')) return;
      try {
        await supabase.from('user_notifications').update({ read: true }).eq('id', id);
      } catch {
        /* table missing or RLS */
      }
    },
    [],
  );

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (!user?.id) return;
    try {
      await supabase.from('user_notifications').update({ read: true }).eq('user_id', user.id);
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  const dismissNotification = useCallback(
    async (id, e) => {
      e?.stopPropagation();
      if (!String(id).startsWith('fr-')) {
        try {
          await supabase.from('user_notifications').delete().eq('id', id);
        } catch {
          /* ignore */
        }
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (expandedId === id) setExpandedId(null);
    },
    [expandedId],
  );

  const toggleExpand = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
    markAsRead(id);
  }, [markAsRead]);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    setExpandedId(null);
  }, []);

  const respondFriendRequest = useCallback(async (requestId, status) => {
    try {
      await fetch('/api/community/friend-request', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId, status }),
      });
      setNotifications((prev) => prev.filter((n) => n.friendRequestId !== requestId));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [frRes, dbRes] = await Promise.all([
          fetch('/api/community/friend-request').then((r) => (r.ok ? r.json() : { requests: [] })),
          supabase
            .from('user_notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50),
        ]);
        if (cancelled) return;
        const requests = frRes.requests || [];
        const frNotifs = requests.map((r) => ({
          id: `fr-${r.id}`,
          type: 'community',
          title: `${r.sender_name} sent you a friend request`,
          content: 'Accept to connect and follow each other.',
          time: new Date(r.created_at).getTime(),
          read: false,
          icon: 'bi-person-plus',
          badge: 'Community',
          priority: 'medium',
          friendRequestId: r.id,
        }));
        const rows = dbRes.data;
        const err = dbRes.error;
        const dbNotifs = !err && Array.isArray(rows) ? rows.map(mapDbNotification) : [];
        setNotifications([...frNotifs, ...dbNotifs]);
      } catch {
        if (!cancelled) setNotifications([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);

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
        { key: 'congress', label: 'Congress' },
        { key: 'market_news', label: 'Market' },
        { key: 'portfolio_alerts', label: 'Portfolio' },
        { key: 'community', label: 'Community' },
        { key: 'learning', label: 'Learning' },
      ].map((f) => (
        <button
          key={f.key}
          className={`nn-filter ${filter === f.key ? 'nn-filter-active' : ''}`}
          onClick={() => setFilter(f.key)}
          type="button"
        >
          {f.label}
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
            onFriendRespond={respondFriendRequest}
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
function NotificationItem({ notification: n, expanded, onToggle, onDismiss, onFriendRespond }) {
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
          {expanded && n.friendRequestId && onFriendRespond && (
            <div className="nn-friend-actions" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="nn-friend-accept"
                onClick={() => onFriendRespond(n.friendRequestId, 'accepted')}
              >
                Accept
              </button>
              <button
                type="button"
                className="nn-friend-decline"
                onClick={() => onFriendRespond(n.friendRequestId, 'rejected')}
              >
                Decline
              </button>
            </div>
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
