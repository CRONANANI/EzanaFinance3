'use client';

import { usePathname } from 'next/navigation';
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import { DatasetsSubnav } from '@/components/marketing/DatasetsSubnav';
import { DatasetComingSoon } from '@/components/marketing/DatasetComingSoon';
import '../marketing-explore.css';

// Datasets taken offline pending completion — the taxonomy marks them
// live:false (so nav renders them "Soon"); this gate stops direct-URL access.
// Reversal: remove the path here AND flip live:true in taxonomy.js.
const COMING_SOON_ROUTES = new Set([
  '/datasets/house-disclosures',
  '/datasets/institutional',
  '/datasets/activist',
  '/datasets/sec-filings',
  '/datasets/whale-moves',
]);

// Routes that opt OUT of the marketing shell + old DatasetsSubnav pill rows.
// The Government Contracts redesign (Option 1b) renders its own four-category
// dropdown bar and centered header, so it must not inherit the "Back to home /
// Get started" marketing bar or the old sub-tab rows (that produced 3 stacked
// navs). The global app nav still wraps everything at the root layout.
const STANDALONE_ROUTES = new Set([
  '/datasets',
  '/datasets/campaignfinancerecords',
  '/datasets/government/contracts',
  '/datasets/government/lobbying',
  '/datasets/political',
  '/datasets/house-disclosures',
  // DatasetDashboard now draws its own full-bleed CategoryBar + ticker (and the
  // bespoke sec-filings client draws the same chrome), so these opt out of the
  // marketing shell too — no "Back to home" bar, no old pill row, matching the
  // Government Contracts page.
  '/datasets/institutional',
  '/datasets/activist',
  '/datasets/sec-filings',
  '/datasets/whale-moves',
  '/datasets/alternative',
  '/datasets/global',
  '/datasets/oecd-macro',
  '/datasets/markets',
  '/datasets/prediction-markets',
]);

export default function DatasetsLayout({ children }) {
  const pathname = usePathname();

  // Coming-soon gate must run BEFORE the STANDALONE early-return, or gated
  // routes (several are in STANDALONE_ROUTES) would still render their page.
  if (COMING_SOON_ROUTES.has(pathname)) {
    return (
      <MarketingPageShell>
        <DatasetComingSoon pathname={pathname} />
      </MarketingPageShell>
    );
  }

  if (STANDALONE_ROUTES.has(pathname)) return children;

  return (
    <MarketingPageShell>
      <DatasetsSubnav />
      {children}
    </MarketingPageShell>
  );
}
