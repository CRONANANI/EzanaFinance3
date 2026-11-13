'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase-browser';
import NavIcon from '@/components/nav/NavIcon';
import NotificationFilterMenu from '@/components/nav/NotificationFilterMenu';
import { IconButton, Skeleton } from '@/components/ds';
import { notificationDestination, notificationSummary } from '@/lib/notifications/destination';

/* Notification type → display category (label, Bootstrap icon). Oct 29: one
   accent (emerald, in nav-notifications.css) for every category tile instead
   of six unrelated hues, so the panel reads as one Ezana surface. */
const CATEGORY_META = {
  market_news: { label: 'Market', icon: 'bi-graph-up' },
  'inside-the-capitol': { label: 'Inside the Capitol', icon: 'bi-bank' },
  portfolio_alerts: { label: 'Portfolio', icon: 'bi-briefcase' },
  watchlist: { label: 'Watchlist', icon: 'bi-eye' },
  community: { label: 'Community', icon: 'bi-people' },
  learning: { label: 'Learning', icon: 'bi-mortarboard' },
};
const NEUTRAL_CATEGORY = { label: 'Notification', icon: 'bi-bell' };
function categoryMeta(type) {
  return CATEGORY_META[type] || NEUTRAL_CATEGORY;
}

/* priority (from mapDbNotification) → severity chip. */
function severityMeta(priority) {
  if (priority === 'critical') return { key: 'high', label: 'High' };
  if (priority === 'high') return { key: 'watch', label: 'Watch' };
  return { key: 'fyi', label: 'FYI' };
}

/* Presentation only: stored titles carry 🔴/🟡-style emoji that encode the
   priority (mapDbNotification still reads them, unchanged). The panel shows
   the priority as one chip per card instead, so the emoji is stripped from
   the DISPLAYED title only. */
function displayTitle(title) {
  return String(title || '')
    .replace(/[\u{1F534}\u{1F7E1}\u{1F7E2}\u{1F7E0}\u{26AA}\u{26AB}]️?\s*/gu, '')
    .trim();
}

function isToday(ts) {
  const d = new Date(ts);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// Filter keys reuse the real notification `type` values so filtering stays wired
// to the existing feed.
const FILTER_SESSION_KEY = 'ezana.notifications.filter';
/* All / Unread view of the desktop panel (Nov 2026), kept for the session. */
const VIEW_SESSION_KEY = 'ezana.notifications.view';
const VIEWS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
];
const MAX_TICKERS = 3;

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'watchlist', label: 'Watchlist' },
  { key: 'inside-the-capitol', label: 'Inside the Capitol' },
  { key: 'market_news', label: 'Market' },
  { key: 'portfolio_alerts', label: 'Portfolio' },
  { key: 'community', label: 'Community' },
  { key: 'learning', label: 'Learning' },
];

/* Notification row (desktop panel, Nov 12 2026 redesign). A flat ledger row
   in the /home idiom: no tile, no fill, no border, a hairline between rows.
   Line one is the meta (category, priority when it is not routine, tickers,
   time), line two the title, line three the summary. The title is a real
   link stretched over the whole row, so a click, Enter, middle click or
   "open in new tab" all open the page the notification is about. On hover or
   keyboard focus the time gives way to Mark as read (unread only) and
   Dismiss, which sit above the link. */
function NotifRowNew({ n, onOpen, onFriendRespond, onMarkRead, onDismiss }) {
  const cat = categoryMeta(n.type);
  const sev = severityMeta(n.priority);
  const dest = notificationDestination(n);
  const title = displayTitle(n.title);
  const summary = notificationSummary(n.content);
  const unread = !n.read;
  const tickers = Array.isArray(n.tickers) ? n.tickers : [];
  const shown = tickers.slice(0, MAX_TICKERS);
  const more = tickers.length - shown.length;
  return (
    <div className={`nnx-row${unread ? ' nnx-row--unread' : ''}`}>
      <span className="nnx-udot" aria-hidden="true" />
      <div className="nnx-main">
        <div className="nnx-meta">
          <span className="nnx-cat">{cat.label}</span>
          {sev.key !== 'fyi' && <span className={`nnx-sev nnx-sev--${sev.key}`}>{sev.label}</span>}
          {shown.length > 0 && (
            <span className="nnx-tickers">
              {shown.join(' ')}
              {more > 0 && <span className="nnx-tmore"> +{more}</span>}
            </span>
          )}
          <span className="nnx-meta-r">
            <span className="nnx-time">{getTimeAgo(n.time)}</span>
            <span className="nnx-actions">
              {unread && onMarkRead && (
                <IconButton
                  icon="bi-check2"
                  label="Mark as read"
                  size="sm"
                  className="nnx-act"
                  onClick={() => onMarkRead(n.id)}
                />
              )}
              {onDismiss && (
                <IconButton
                  icon="bi-x-lg"
                  label="Dismiss notification"
                  size="sm"
                  className="nnx-act"
                  onClick={(e) => onDismiss(n, e)}
                />
              )}
            </span>
          </span>
        </div>
        <Link
          href={dest.href}
          className="nnx-title"
          aria-label={`${title}${unread ? ', unread' : ''}. Opens ${dest.label}.`}
          onClick={() => onOpen(n, dest)}
        >
          {title}
        </Link>
        {summary && <span className="nnx-desc">{summary}</span>}
        {n.friendRequestId && onFriendRespond && (
          <span className="nnx-friend">
            <button
              type="button"
              className="nnx-friend-accept"
              onClick={() => onFriendRespond(n.friendRequestId, 'accepted')}
            >
              Accept
            </button>
            <button
              type="button"
              className="nnx-friend-decline"
              onClick={() => onFriendRespond(n.friendRequestId, 'rejected')}
            >
              Decline
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

/* Four shimmer rows while the first fetch is in flight. */
function NotifSkeleton() {
  return (
    <div className="nnx-skel" aria-busy="true" aria-label="Loading notifications">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="nnx-skel-row">
          <Skeleton height={10} width="32%" />
          <Skeleton height={13} width="78%" />
          <Skeleton height={11} width="92%" />
        </div>
      ))}
    </div>
  );
}

/**
 * Normalize a notification row for the bell UI.
 *
 * Legacy migration: rows that were inserted with `type = 'congress'`
 * before the category rename are remapped on read to the canonical
 * `'inside-the-capitol'` bucket so old notifications aren't orphaned.
 * The SQL migration updates stored values in bulk; this fallback keeps
 * the UI correct even if the migration hasn't been run in a given env.
 */
function mapDbNotification(row) {
  const rawType = row.type || 'general';
  const t = rawType === 'congress' ? 'inside-the-capitol' : rawType;

  const badge =
    t === 'community'
      ? 'Community'
      : t === 'portfolio_alerts'
        ? 'Portfolio'
        : t === 'market_news'
          ? 'Market'
          : t === 'inside-the-capitol'
            ? 'Inside the Capitol'
            : t === 'watchlist'
              ? 'Watchlist'
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
          : t === 'inside-the-capitol'
            ? 'bi-bank'
            : t === 'watchlist'
              ? 'bi-star'
              : t === 'learning'
                ? 'bi-mortarboard'
                : 'bi-bell';
  let priority = 'medium';
  if (/\u{1F534}/u.test(row.title || '')) priority = 'critical';
  else if (/\u{1F7E1}/u.test(row.title || '')) priority = 'high';

  return {
    id: row.id,
    type: t,
    title: row.title,
    content: row.content || '',
    time: new Date(row.created_at).getTime(),
    read: !!row.read,
    icon,
    badge,
    priority,
    tickers: Array.isArray(row.tickers) ? row.tickers.filter(Boolean) : [],
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
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  /* The chosen filter survives reopening the panel and page changes for the
     session (Nov 2026). */
  const [filter, setFilterState] = useState('all');
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(FILTER_SESSION_KEY);
      if (saved && FILTER_TABS.some((f) => f.key === saved)) setFilterState(saved);
    } catch {
      /* storage unavailable: default to All */
    }
  }, []);
  const setFilter = (key) => {
    setFilterState(key);
    try {
      window.sessionStorage.setItem(FILTER_SESSION_KEY, key);
    } catch {
      /* per-session nicety only */
    }
  };
  /* All / Unread (desktop panel), kept for the session like the filter. */
  const [view, setViewState] = useState('all');
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(VIEW_SESSION_KEY);
      if (saved && VIEWS.some((v) => v.key === saved)) setViewState(saved);
    } catch {
      /* storage unavailable: default to All */
    }
  }, []);
  /* Ids read while the panel is open stay in the Unread view until it closes
     or the view changes, so a row never vanishes under the cursor. */
  const [readThisSession, setReadThisSession] = useState(() => new Set());
  const setView = (key) => {
    setViewState(key);
    setReadThisSession(new Set());
    try {
      window.sessionStorage.setItem(VIEW_SESSION_KEY, key);
    } catch {
      /* per-session nicety only */
    }
  };
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const dropdownRef = useRef(null);
  const viewTabRefs = useRef([]);
  const bellRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  /* One list for the desktop panel and the mobile sheet: the same keys and
     unread counts the pill row used. */
  const filterOptions = FILTER_TABS.map((f) => ({
    ...f,
    count:
      f.key === 'all'
        ? unreadCount
        : notifications.filter((n) => n.type === f.key && !n.read).length,
  }));

  /* Mobile overlay: category only (unchanged). */
  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    return n.type === filter;
  });
  /* Desktop panel: category and All / Unread combine. */
  const panelItems = filtered.filter((n) => view === 'all' || !n.read || readThisSession.has(n.id));

  // TODAY / EARLIER grouping for the redesigned desktop panel.
  const todayItems = panelItems.filter((n) => isToday(n.time));
  const earlierItems = panelItems.filter((n) => !isToday(n.time));

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
    setExpandedId(null);
    setReadThisSession(new Set());
  }, []);

  const markAsRead = useCallback(async (id) => {
    setReadThisSession((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (String(id).startsWith('fr-')) return;
    try {
      await supabase.from('user_notifications').update({ read: true }).eq('id', id);
    } catch {
      /* table missing or RLS */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => {
      setReadThisSession((ids) => {
        const next = new Set(ids);
        prev.forEach((n) => !n.read && next.add(n.id));
        return next;
      });
      return prev.map((n) => ({ ...n, read: true }));
    });
    if (!user?.id) return;
    try {
      await supabase.from('user_notifications').update({ read: true }).eq('user_id', user.id);
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  const dismissNotification = useCallback(
    async (n, e) => {
      e?.stopPropagation();
      if (!String(n.id).startsWith('fr-')) {
        fetch('/api/notifications/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'notification_dismiss',
            event_data: { notification_id: n.id, type: n.type },
          }),
        }).catch(() => {});
        try {
          await supabase.from('user_notifications').delete().eq('id', n.id);
        } catch {
          /* table missing or RLS */
        }
      }
      setNotifications((prev) => prev.filter((x) => x.id !== n.id));
      if (expandedId === n.id) setExpandedId(null);
    },
    [expandedId],
  );

  const toggleExpand = useCallback(
    (n) => {
      setExpandedId((prev) => (prev === n.id ? null : n.id));
      markAsRead(n.id);
      if (String(n.id).startsWith('fr-')) return;
      fetch('/api/notifications/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'notification_click',
          event_data: { notification_id: n.id, type: n.type },
        }),
      }).catch(() => {});
    },
    [markAsRead],
  );

  const closePanel = useCallback(() => {
    setIsOpen(false);
    setExpandedId(null);
    setReadThisSession(new Set());
  }, []);

  /* Opening a notification: mark it read, record the click with where it
     went, and close the panel. The desktop row is itself a link, so the
     browser (or the router) does the navigation; the mobile sheet has no
     link under the tap, so it asks for a push. */
  const openNotification = useCallback(
    (n, dest, { push = false } = {}) => {
      const target = dest || notificationDestination(n);
      markAsRead(n.id);
      if (!String(n.id).startsWith('fr-')) {
        fetch('/api/notifications/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            event_type: 'notification_click',
            event_data: { notification_id: n.id, type: n.type, href: target.href },
          }),
        }).catch(() => {});
      }
      closePanel();
      if (push) router.push(target.href);
    },
    [markAsRead, closePanel, router],
  );

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
      setLoading(false);
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
          tickers: [],
          friendRequestId: r.id,
        }));
        const rows = dbRes.data;
        const err = dbRes.error;
        const dbNotifs = !err && Array.isArray(rows) ? rows.map(mapDbNotification) : [];
        setNotifications([...frNotifs, ...dbNotifs]);
      } catch {
        if (!cancelled) setNotifications([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);

  /* ── Realtime: subscribe to new notifications ── */
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return undefined;

    const channel = supabase
      .channel(`user-notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload?.new;
          if (!row) return;
          setNotifications((prev) => {
            if (prev.some((n) => n.id === row.id)) return prev;
            return [mapDbNotification(row), ...prev];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.id]);

  /* Close dropdown on outside click (desktop) */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        bellRef.current &&
        !bellRef.current.contains(e.target)
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
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  /* Close on Escape. An Esc the filter dropdown already handled (it calls
     preventDefault) closes only the dropdown, not the whole panel. */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape' && !e.defaultPrevented) closePanel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, closePanel]);

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
            onToggle={() => toggleExpand(n)}
            onDismiss={(e) => dismissNotification(n, e)}
            onFriendRespond={respondFriendRequest}
            onOpen={() => openNotification(n, null, { push: true })}
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
        aria-haspopup="dialog"
        aria-controls={isOpen ? 'notifications-panel' : undefined}
      >
        <NavIcon name="bell" size={22} className="nn-bell-glyph" />
        {unreadCount > 0 && (
          <span className="nn-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {/* ════ DESKTOP DROPDOWN (hidden on mobile via CSS) — redesigned panel ════ */}
      {isOpen && (
        <div
          ref={dropdownRef}
          id="notifications-panel"
          className="nn-dropdown nnx-panel"
          role="dialog"
          aria-label="Notifications"
        >
          <span className="nnx-caret" aria-hidden />

          {/* One toolbar, no title: All / Unread, the category funnel, and
              Mark all as read. The bell that opened it names the panel. */}
          <div className="nnx-controls">
            <div className="nnx-seg" role="tablist" aria-label="Show notifications">
              {VIEWS.map((v, i) => (
                <button
                  key={v.key}
                  ref={(el) => {
                    viewTabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={view === v.key}
                  tabIndex={view === v.key ? 0 : -1}
                  className="nnx-seg-btn"
                  onClick={() => setView(v.key)}
                  onKeyDown={(e) => {
                    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                    e.preventDefault();
                    const next = VIEWS[(i + 1) % VIEWS.length];
                    setView(next.key);
                    viewTabRefs.current[VIEWS.indexOf(next)]?.focus();
                  }}
                >
                  {v.label}
                  {v.key === 'unread' && unreadCount > 0 && (
                    <span className="nnx-seg-count">{unreadCount}</span>
                  )}
                </button>
              ))}
            </div>
            <NotificationFilterMenu
              filters={filterOptions}
              value={filter}
              onChange={setFilter}
              compact
              className="nnx-funnel"
            />
            {unreadCount > 0 && (
              <IconButton
                icon="bi-check2-all"
                label="Mark all as read"
                size="sm"
                className="nnx-markall"
                onClick={markAllRead}
              />
            )}
          </div>

          {/* Scrolling body */}
          <div className="nnx-body">
            {loading ? (
              <NotifSkeleton />
            ) : panelItems.length === 0 ? (
              <div className="nnx-empty">
                <span className="nnx-empty-tile" aria-hidden="true">
                  <i className="bi bi-check2-all" />
                </span>
                <p className="nnx-empty-title">You&apos;re all caught up</p>
                <p className="nnx-empty-line">New alerts on your watchlist will appear here.</p>
              </div>
            ) : (
              <>
                {todayItems.length > 0 && (
                  <>
                    <div className="nnx-group">Today</div>
                    {todayItems.map((n) => (
                      <NotifRowNew
                        key={n.id}
                        n={n}
                        onOpen={openNotification}
                        onFriendRespond={respondFriendRequest}
                        onMarkRead={markAsRead}
                        onDismiss={dismissNotification}
                      />
                    ))}
                  </>
                )}
                {earlierItems.length > 0 && (
                  <>
                    <div className="nnx-group">Earlier</div>
                    {earlierItems.map((n) => (
                      <NotifRowNew
                        key={n.id}
                        n={n}
                        onOpen={openNotification}
                        onFriendRespond={respondFriendRequest}
                        onMarkRead={markAsRead}
                        onDismiss={dismissNotification}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          {/* Fixed footer */}
          <div className="nnx-footer">
            <a className="nnx-center-link" href="/settings?tab=notifications" onClick={closePanel}>
              Notification center <i className="bi bi-arrow-right" aria-hidden="true" />
            </a>
          </div>
        </div>
      )}

      {/* ════ MOBILE FULLSCREEN OVERLAY (hidden on desktop via CSS) ════ */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="nn-mobile-overlay" onClick={closePanel}>
            <div className="nn-mobile-panel" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="nn-mobile-header">
                <div className="nn-mobile-header-left">
                  <i className="bi bi-bell-fill nn-mobile-header-icon" />
                  <h3>Notifications</h3>
                  {unreadCount > 0 && <span className="nn-mobile-unread-count">{unreadCount}</span>}
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

              <NotificationFilterMenu
                filters={filterOptions}
                value={filter}
                onChange={setFilter}
                className="nn-mobile-filters"
              />
              <NotifList className="nn-mobile-list" />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   SINGLE NOTIFICATION CARD
   Used identically in desktop dropdown and mobile overlay.
   Click to expand/collapse. Shows dismiss X when expanded.
   ═══════════════════════════════════════════════════════════ */
function NotificationItem({
  notification: n,
  expanded,
  onToggle,
  onDismiss,
  onFriendRespond,
  onOpen,
}) {
  const dest = notificationDestination(n);
  const summary = notificationSummary(n.content);
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
          {expanded && summary && <p className="nn-item-content">{summary}</p>}
          {expanded && onOpen && (
            <span
              className="nn-item-open"
              role="link"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                e.stopPropagation();
                onOpen();
              }}
            >
              Open {dest.label} <i className="bi bi-arrow-right" aria-hidden="true" />
            </span>
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
