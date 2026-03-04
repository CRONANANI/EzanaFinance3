'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
const SAMPLE_NOTIFICATIONS = [
  { id: 1, type: 'congress', title: 'Senator Trade', content: 'Sen. Smith disclosed purchase of NVDA', time: new Date(), read: false },
  { id: 2, type: 'stocks', title: 'Price Alert', content: 'AAPL crossed $180', time: new Date(), read: false },
  { id: 3, type: 'community', title: 'New Follower', content: '@investor123 started following you', time: new Date(), read: false },
];

export function NotificationsSidebar() {
  const { notificationsOpen, toggleNotifications } = useSidebar();
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);
  const [filter, setFilter] = useState('all');

  const filtered = notifications.filter((n) => filter === 'all' || n.type === filter);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
              <button className="notifications-settings" title="Settings">
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
                <div key={n.id} className={`notification-item ${n.type} ${n.read ? 'read' : ''}`}>
                  <div className="notification-item-content">
                    <span className="notification-item-title">{n.title}</span>
                    <span className="notification-item-text">{n.content}</span>
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
