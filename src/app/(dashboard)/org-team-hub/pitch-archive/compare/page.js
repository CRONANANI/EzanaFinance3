'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useOrg } from '@/contexts/OrgContext';
import { ArchiveCompare } from '@/components/org/pitches/ArchiveCompare';
import { useSearchParams } from 'next/navigation';
import '../../team-hub.css';
import '../../org-pitches.css';

function CompareInner() {
  const searchParams = useSearchParams();
  const ids = searchParams.get('ids')?.split(',').filter(Boolean) || [];
  return <ArchiveCompare initialIds={ids} />;
}

export default function ArchiveComparePage() {
  const { isOrgUser, isLoading } = useOrg();

  if (isLoading) return <div style={{ padding: '2rem', color: '#888' }}>Loading…</div>;
  if (!isOrgUser) {
    return <div style={{ padding: '2rem', color: '#888' }}>Org members only.</div>;
  }

  return (
    <div className="dashboard-page-inset th-page op-page">
      <Link href="/org-team-hub/pitch-archive" className="op-back">
        <i className="bi bi-arrow-left" /> Archive
      </Link>
      <h1>Compare Pitches</h1>
      <Suspense fallback={<div className="op-loading">Loading…</div>}>
        <CompareInner />
      </Suspense>
    </div>
  );
}
