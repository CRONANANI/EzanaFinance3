'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useOrg } from '@/contexts/OrgContext';
import { PitchWorkspace } from '@/components/org/pitches/PitchWorkspace';
import { PitchComposer } from '@/components/org/pitches/PitchComposer';
import '../team-hub.css';
import '../org-pitches.css';
import './pitch-workspace.css';

export default function OrgPitchPipelinePage() {
  const { isOrgUser, isLoading } = useOrg();
  const [composerOpen, setComposerOpen] = useState(false);
  const [boardKey, setBoardKey] = useState(0);

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
          <h1>Stock Pitch Pipeline</h1>
          <p className="op-hero-sub">
            Track every pitch from idea through committee decision — stage gates with role-based
            approvals.
          </p>
        </div>
        <div className="op-hero-actions">
          <Link href="/org-team-hub/pitch-archive" className="op-btn op-btn--ghost">
            <i className="bi bi-archive" /> Pitch Archive
          </Link>
          <Link href="/org-team-hub" className="op-btn op-btn--ghost">
            <i className="bi bi-building" /> Team Hub
          </Link>
          <button type="button" className="op-btn" onClick={() => setComposerOpen(true)}>
            <i className="bi bi-plus-lg" /> Submit New Pitch
          </button>
        </div>
      </div>

      <PitchComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={() => setBoardKey((k) => k + 1)}
      />
      <PitchWorkspace refreshKey={boardKey} />
    </div>
  );
}
