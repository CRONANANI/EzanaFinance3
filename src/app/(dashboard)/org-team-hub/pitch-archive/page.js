'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useOrg } from '@/contexts/OrgContext';
import { orgRequest } from '@/lib/org-request';
import { ArchivePitchList } from '@/components/org/pitches/ArchivePitchList';

function ArchiveAnalyticsStrip() {
  const [a, setA] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    orgRequest('/api/org/archive/report/inception')
      .then((d) => {
        if (alive) setA(d.analytics);
      })
      .catch((err) => {
        if (alive) setError(err.message || 'Could not load archive analytics.');
      });
    return () => {
      alive = false;
    };
  }, []);
  if (error)
    return (
      <p className="org-inline-error" role="alert">
        {error}
      </p>
    );
  if (!a) return null;
  return (
    <div className="op-analytics-strip">
      <span>{a.total_decided} decided</span>
      <span>{a.accepted_count} accepted</span>
      <span>{a.rejected_count} rejected</span>
      <span>Hit rate {a.hit_rate_pct}%</span>
      <span>Miss rate {a.miss_rate_pct}%</span>
    </div>
  );
}
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
          <Link href="/org-team-hub/pitch-archive/compare" className="op-btn op-btn--ghost">
            <i className="bi bi-columns-gap" /> Compare
          </Link>
          <Link href="/org-team-hub/pitch-archive/report" className="op-btn op-btn--ghost">
            <i className="bi bi-file-earmark-bar-graph" /> Report
          </Link>
          <Link href="/org-team-hub/pitches" className="op-btn op-btn--ghost">
            <i className="bi bi-kanban" /> Pipeline
          </Link>
        </div>
      </div>

      <ArchiveAnalyticsStrip />
      <ArchivePitchList />
    </div>
  );
}
