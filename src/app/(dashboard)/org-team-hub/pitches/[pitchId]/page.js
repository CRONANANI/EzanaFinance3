'use client';

import { useOrg } from '@/contexts/OrgContext';
import { PitchDetailClient } from '@/components/org/pitches/PitchDetailClient';
import '../../team-hub.css';
import '../../org-pitches.css';

export default function OrgPitchDetailPage({ params }) {
  const { isOrgUser, isLoading } = useOrg();
  const pitchId = params?.pitchId;

  if (isLoading) return <div style={{ padding: '2rem', color: '#888' }}>Loading…</div>;
  if (!isOrgUser) {
    return (
      <div style={{ padding: '2rem', color: '#888' }}>
        This page is for organizational members only.
      </div>
    );
  }

  return (
    <div className="dashboard-page-inset th-page">
      <PitchDetailClient pitchId={pitchId} />
    </div>
  );
}
