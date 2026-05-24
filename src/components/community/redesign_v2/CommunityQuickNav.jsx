'use client';

import Link from 'next/link';

const QUICK_NAV = [
  { id: 'profile', label: 'My Profile', icon: 'bi-person-circle' },
  { id: 'messages', label: 'Messages', icon: 'bi-chat-dots', href: '/community/messages' },
  { id: 'badges', label: 'Badges', icon: 'bi-award', href: '/badges' },
];

export function CommunityQuickNav({ profileHref }) {
  return (
    <div
      className="comm-quick-nav evo-quick-nav"
      style={{
        display: 'flex',
        gap: 4,
        padding: '4px',
        background: 'var(--surface-card)',
        borderRadius: 10,
        border: '1px solid var(--border-primary)',
        marginBottom: 18,
        width: 'fit-content',
        flexWrap: 'wrap',
      }}
    >
      {QUICK_NAV.map((item) => {
        const href = item.href || profileHref;
        if (!href) return null;
        return (
          <Link
            key={item.id}
            href={href}
            className="comm-quick-nav-link"
            style={{
              padding: '8px 14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 600,
              background: 'transparent',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              transition: 'background .15s, color .15s',
            }}
          >
            <i className={`bi ${item.icon}`} style={{ fontSize: 13 }} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
