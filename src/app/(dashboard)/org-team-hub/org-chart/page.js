import { Suspense } from 'react';
import { OrgDirectoryClient } from './OrgDirectoryClient';

export const metadata = {
  title: 'Organization | Ezana Finance',
  description:
    'Investment council directory — collapsible reporting tree, member profiles, desk stats, and hierarchical role management.',
};

export default function OrgChartPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading organization…</div>}>
      <OrgDirectoryClient />
    </Suspense>
  );
}
