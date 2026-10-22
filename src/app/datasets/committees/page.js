import { Suspense } from 'react';
import CommitteesClient from './CommitteesClient';

/**
 * Committee Assignments dataset page (Capitol Watch). Standalone route: the
 * datasets layout draws the category bar and ticker above it.
 *
 * Oct 2026 redesign (docs/design/committees-handoff): ten cards under one
 * sticky control bar. Data: /api/committees* (synced daily from the
 * public-domain congress-legislators project), congress_trades for the
 * overseen-sector views, and hub_committee_ticker_stats for the holdings
 * matrix. No mock data.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Committee assignments | Ezana',
  description:
    'Who sits on each committee in Congress, who holds the gavel, which markets each committee oversees, and where members trade in the sectors they oversee.',
};

export default function CommitteesPage() {
  return (
    <Suspense fallback={null}>
      <CommitteesClient />
    </Suspense>
  );
}
