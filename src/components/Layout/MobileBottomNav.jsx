'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function MobileBottomNav() {
  const pathname = usePathname();
  const isPartnerRoute = pathname?.startsWith('/partner-');

  const userNavItems = [
    { href: '/home-dashboard', icon: 'bi-house', label: 'Home' },
    { href: '/home-dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
    { href: '/trading', icon: 'bi-lightning-charge', label: 'Trade', center: true },
    { href: '/community', icon: 'bi-people', label: 'Community' },
    { href: '#more', icon: 'bi-grid', label: 'More' },
  ];

  const partnerNavItems = [
    { href: '/partner-home', icon: 'bi-house', label: 'Home' },
    { href: '/partner-dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
    { href: '/partner-community', icon: 'bi-people', label: 'Community', center: true },
    { href: '/partner-learning', icon: 'bi-mortarboard', label: 'Creator' },
    { href: '#more', icon: 'bi-grid', label: 'More' },
  ];

  const items = isPartnerRoute ? partnerNavItems : userNavItems;

  return (
    <nav
      className={`mobile-bottom-nav ${isPartnerRoute ? 'partner-nav' : ''}`}
      role="navigation"
      aria-label="Mobile navigation"
    >
      {items.map((item) => {
        const isCenter = item.center;
        const isActive = pathname === item.href || (item.href !== '#more' && pathname?.startsWith(item.href));
        return (
          <Link
            key={item.label}
            href={item.href}
            className={`mobile-bottom-nav-item ${isCenter ? 'mobile-bottom-nav-center' : ''} ${isActive ? 'active' : ''}`}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <i className={`bi ${item.icon}`} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
