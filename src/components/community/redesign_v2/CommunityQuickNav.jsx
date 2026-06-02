'use client';

import Link from 'next/link';

const QUICK_NAV = [
  { id: 'profile', label: 'My Profile', icon: 'bi-person-circle' },
  { id: 'messages', label: 'Messages', icon: 'bi-chat-dots', href: '/community/messages' },
  { id: 'badges', label: 'Badges', icon: 'bi-award', href: '/badges' },
];

export function CommunityQuickNav({ profileHref }) {
  return (
    <nav className="quicknav" aria-label="Community quick links">
      {QUICK_NAV.map((item) => {
        const href = item.href || profileHref;
        if (!href) return null;
        return (
          <Link key={item.id} href={href} className="qn">
            <i className={`bi ${item.icon}`} style={{ fontSize: 13 }} aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
