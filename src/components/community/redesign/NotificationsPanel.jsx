'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase-browser';
import { formatRelativeTime } from '@/lib/community-utils';
import { Avatar } from './Avatar';

const ICON_MAP = {
  like: { icon: 'bi-heart-fill', color: 'var(--negative)' },
  follow: { icon: 'bi-person-plus-fill', color: 'var(--info)' },
  comment: { icon: 'bi-chat-fill', color: 'var(--emerald)' },
  copy: { icon: 'bi-arrow-repeat', color: 'var(--gold)' },
  mention: { icon: 'bi-at', color: 'var(--purple)' },
  badge: { icon: 'bi-award-fill', color: 'var(--warning)' },
  community: { icon: 'bi-people-fill', color: 'var(--emerald)' },
  default: { icon: 'bi-bell-fill', color: 'var(--text-muted)' },
};

function inferIconType(title, type) {
  const t = (title || '').toLowerCase();
  if (t.includes('liked')) return 'like';
  if (t.includes('comment')) return 'comment';
  if (t.includes('follow') || t.includes('friend')) return 'follow';
  if (t.includes('copy')) return 'copy';
  if (t.includes('mention') || t.includes('@')) return 'mention';
  if (t.includes('badge')) return 'badge';
  if (type === 'community') return 'community';
  return 'default';
}

function mapNotification(row) {
  const iconType = inferIconType(row.title, row.type);
  return {
    id: row.id,
    type: iconType,
    text: row.content || row.title || '',
    title: row.title || '',
    unread: !row.read,
    created_at: row.created_at,
    timeAgo: formatRelativeTime(row.created_at),
    isCopyRequest: (row.title || '').toLowerCase().includes('copy'),
    friendRequestId: row.friendRequestId || null,
  };
}

export function NotificationsPanel({ open, onClose }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      return;
    }
    try {
      const [frRes, dbRes] = await Promise.all([
        fetch('/api/community/friend-request').then((r) => (r.ok ? r.json() : { requests: [] })),
        supabase
          .from('user_notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30),
      ]);
      const requests = frRes.requests || [];
      const frNotifs = requests.map((r) => ({
        id: `fr-${r.id}`,
        type: 'follow',
        title: `${r.sender_name} sent you a friend request`,
        text: 'Accept to connect and follow each other.',
        unread: true,
        created_at: r.created_at,
        timeAgo: formatRelativeTime(r.created_at),
        isCopyRequest: false,
        friendRequestId: r.id,
        author: r.sender_name
          ? { display_name: r.sender_name, username: r.sender_username || '', id: r.sender_id }
          : null,
      }));
      const dbNotifs =
        !dbRes.error && Array.isArray(dbRes.data)
          ? dbRes.data.map((row) => ({
              ...mapNotification(row),
              author: null,
            }))
          : [];
      setNotifications([...frNotifs, ...dbNotifs]);
    } catch {
      setNotifications([]);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (open) loadNotifications();
  }, [open, loadNotifications]);

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    if (!user?.id) return;
    try {
      await supabase.from('user_notifications').update({ read: true }).eq('user_id', user.id);
    } catch {
      /* ignore */
    }
  };

  const respondFriendRequest = async (requestId, status) => {
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
  };

  if (!open) return null;

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'transparent',
          zIndex: 50,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 60,
          left: 70,
          width: 380,
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-primary)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-lg)',
          zIndex: 51,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-secondary)',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            Notifications
          </div>
          <button
            type="button"
            onClick={markAllRead}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Mark all read
          </button>
        </div>
        <div style={{ maxHeight: 460, overflow: 'auto' }}>
          {notifications.length === 0 && (
            <div
              style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}
            >
              No notifications yet
            </div>
          )}
          {notifications.map((n) => {
            const m = ICON_MAP[n.type] || ICON_MAP.default;
            return (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-secondary)',
                  background: n.unread ? 'var(--emerald-bg-subtle)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <div style={{ position: 'relative' }}>
                  {n.author ? (
                    <Avatar author={n.author} size={32} />
                  ) : (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        background: 'var(--warning-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <i className="bi bi-award-fill" style={{ color: 'var(--warning)' }} />
                    </div>
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 16,
                      height: 16,
                      borderRadius: 999,
                      background: 'var(--bg-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <i className={`bi ${m.icon}`} style={{ fontSize: 10, color: m.color }} />
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {n.title && <strong style={{ color: 'var(--text-primary)' }}>{n.title}</strong>}{' '}
                    {n.text !== n.title ? n.text : ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>
                    {n.timeAgo}
                  </div>
                  {n.friendRequestId && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button
                        type="button"
                        className="ez-btn ez-btn--primary"
                        style={{ padding: '4px 10px', fontSize: 11 }}
                        onClick={() => respondFriendRequest(n.friendRequestId, 'accepted')}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="ez-btn ez-btn--secondary"
                        style={{ padding: '4px 10px', fontSize: 11 }}
                        onClick={() => respondFriendRequest(n.friendRequestId, 'declined')}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
                {n.unread && (
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      background: 'var(--emerald)',
                      marginTop: 8,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function useNotificationCount() {
  const { user, isAuthenticated } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [frRes, dbRes] = await Promise.all([
          fetch('/api/community/friend-request').then((r) => (r.ok ? r.json() : { requests: [] })),
          supabase
            .from('user_notifications')
            .select('id, read')
            .eq('user_id', user.id)
            .eq('read', false)
            .limit(50),
        ]);
        if (cancelled) return;
        const frCount = (frRes.requests || []).length;
        const dbCount = !dbRes.error && Array.isArray(dbRes.data) ? dbRes.data.length : 0;
        setCount(frCount + dbCount);
      } catch {
        if (!cancelled) setCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);

  return count;
}
