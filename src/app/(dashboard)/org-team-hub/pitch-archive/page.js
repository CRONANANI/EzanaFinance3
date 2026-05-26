'use client';

import Link from 'next/link';
import { useOrg } from '@/contexts/OrgContext';
import { ArchivePitchList } from '@/components/org/pitches/ArchivePitchList';
import '../team-hub.css';
import '../org-pitches.css';

export default function OrgPitchArchivePage() {
  const { isOrgUser, isLoading } = useOrg();

  if (isLoading) return <div style={{ padding: '2rem', color: '#888' }}>Loading…</div>;
  if (!isOrgUser) {
    return (
      <div style={{ padding: '2rem', color: '#888' }}>
        This page is for organizational members only.
      </div>
    );
  }

  return (
    <div className="dashboard-page-inset th-page op-page">
      <div className="op-hero">
        <div>
          <h1>Pitch Archive</h1>
          <p className="op-hero-sub">
            Searchable history of every pitch the council has reviewed — decisions, votes, and
            hindsight performance.
          </p>
        </div>
        <div className="op-hero-actions">
          <Link href="/org-team-hub/pitches" className="op-btn op-btn--ghost">
            <i className="bi bi-kanban" /> Active Pipeline
          </Link>
          <Link href="/org-team-hub" className="op-btn op-btn--ghost">
            <i className="bi bi-building" /> Team Hub
          </Link>
        </div>
      </div>

      <ArchivePitchList />
    </div>
  );
}
