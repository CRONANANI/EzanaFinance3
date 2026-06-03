'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/datasets/political', label: 'Congressional trading' },
  { href: '/datasets/government', label: 'Government activity' },
];

export function DatasetsSubnav() {
  const pathname = usePathname();

  return (
    <nav className="mkt-datasets-subnav" aria-label="Dataset sections">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={pathname === tab.href ? 'mkt-subnav-active' : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
