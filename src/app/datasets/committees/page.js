import { Suspense } from 'react';
import CommitteesClient from './CommitteesClient';

/**
 * Committee Assignments dataset page (Capitol Watch). Standalone route: the
 * datasets layout draws the category bar and ticker above it.
 *
 * Data: /api/committees* (congress_committees and congress_committee_members,
 * synced daily from the public-domain congress-legislators project) plus
 * congress_trades for the overseen-sector view. No mock data.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Committee assignments | Ezana',
  description:
    'Every House, Senate and joint committee, who sits on it, who leads it, and the disclosed trades members make in the sectors their committees oversee.',
};

export default function CommitteesPage() {
  return (
    <Suspense fallback={null}>
      <CommitteesClient />
    </Suspense>
  );
}
