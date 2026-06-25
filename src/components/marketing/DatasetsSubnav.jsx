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

// Drill-down sub-tabs shown only within the Government Activity context.
// Government Contracts is a child of Government Activity — NOT an 8th
// top-level dimension.
const GOVERNMENT_SUBTABS = [
  { href: '/datasets/government', label: 'Overview' },
  { href: '/datasets/government/contracts', label: 'Government contracts' },
];

export function DatasetsSubnav() {
  const pathname = usePathname();
  const inGovernment = pathname?.startsWith('/datasets/government');

  return (
    <>
      <nav className="mkt-datasets-subnav" aria-label="Dataset sections">
        {TABS.map((tab) => {
          // The top-level tab stays active for its drill-down routes too
          // (e.g. Government activity is active on /datasets/government/contracts).
          const active = pathname === tab.href || pathname?.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={active ? 'mkt-subnav-active' : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {inGovernment && (
        <nav
          className="mkt-datasets-subnav mkt-datasets-subnav-drill"
          aria-label="Government activity sections"
        >
          {GOVERNMENT_SUBTABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={pathname === tab.href ? 'mkt-subnav-active' : undefined}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
