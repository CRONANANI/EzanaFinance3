'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { EzanaLogo } from './Avatar';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'bi-grid-1x2', href: '/home' },
  { label: 'Research', icon: 'bi-search', href: '/company-research' },
  { label: 'Trading', icon: 'bi-graph-up', href: '/trading' },
  { label: 'Watchlist', icon: 'bi-bookmark', href: '/watchlist' },
  { label: 'Community', icon: 'bi-people', href: '/community' },
  { label: 'Learning Center', icon: 'bi-mortarboard', href: '/learning-center' },
];

export function TopNav({ active = 'Community', onOpenNotifications, notifCount = 0 }) {
  const pathname = usePathname();
  const { signOut } = useAuth();

  const isActive = (item) => {
    if (item.label === active) return true;
    return pathname === item.href || pathname?.startsWith(`${item.href}/`);
  };

  return (
    <div className="ez-topnav">
      <div className="ez-topnav-logo">
        <EzanaLogo size={26} />
      </div>
      <button
        type="button"
        className="ez-iconbtn"
        onClick={onOpenNotifications}
        aria-label="Notifications"
        style={{ position: 'relative' }}
      >
        <i className="bi bi-bell" style={{ fontSize: 15 }} />
        {notifCount > 0 && <span className="ez-iconbtn-dot" />}
      </button>
      <div className="ez-topnav-items">
        {NAV_ITEMS.map((it) => (
          <Link
            key={it.label}
            href={it.href}
            className={`ez-topnav-item ${isActive(it) ? 'is-active' : ''}`}
          >
            <i className={`bi ${it.icon}`} style={{ fontSize: 13 }} />
            <span>{it.label}</span>
          </Link>
        ))}
      </div>
      <div className="ez-topnav-right">
        <button
          type="button"
          className="ez-iconbtn"
          onClick={() => signOut?.()}
          style={{
            color: 'var(--negative)',
            borderColor: 'rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.08)',
          }}
          aria-label="Sign out"
        >
          <i className="bi bi-box-arrow-right" style={{ fontSize: 14 }} />
        </button>
      </div>
    </div>
  );
}

export function PageTabs({ active, onChange, messageBadge }) {
  const tabs = [
    { id: 'Community', icon: 'bi-people', label: 'Community' },
    { id: 'My Profile', icon: 'bi-person-circle', label: 'My Profile' },
    { id: 'Messages', icon: 'bi-chat-dots', label: 'Messages', badge: messageBadge },
  ];
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: '4px',
        background: 'var(--surface-card)',
        borderRadius: 10,
        border: '1px solid var(--border-primary)',
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange?.(t.id)}
          style={{
            padding: '8px 14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            border: 'none',
            borderRadius: 7,
            fontSize: 13,
            fontWeight: 600,
            background: active === t.id ? 'var(--emerald)' : 'transparent',
            color: active === t.id ? 'white' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'background .15s, color .15s',
          }}
        >
          <i className={`bi ${t.icon}`} style={{ fontSize: 13 }} />
          <span>{t.label}</span>
          {t.badge > 0 && active !== t.id && (
            <span
              style={{
                minWidth: 16,
                height: 16,
                padding: '0 5px',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
                background: 'var(--negative)',
                color: 'white',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
