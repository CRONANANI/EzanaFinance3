'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/datasets/political', label: 'Congressional & Political' },
  { href: '/datasets/government', label: 'Government activity' },
  { href: '/datasets/sec-filings', label: 'SEC filings' },
  { href: '/datasets/markets', label: 'Markets & equities' },
  { href: '/datasets/alternative', label: 'Alternative signals' },
  { href: '/datasets/prediction-markets', label: 'Prediction markets' },
  { href: '/datasets/global', label: 'Global & macro' },
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
