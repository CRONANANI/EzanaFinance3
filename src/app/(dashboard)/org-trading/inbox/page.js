'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useOrg } from '@/contexts/OrgContext';
import { FlagInboxList } from '@/components/org-trading/FlagInboxList';
import { FlagDetailPanel } from '@/components/org-trading/FlagDetailPanel';
import '../org-trading.css';

export default function FlagInboxPage() {
  const { isOrgUser, orgData, isLoading } = useOrg();
  const [flags, setFlags] = useState([]);
  const [selectedFlagId, setSelectedFlagId] = useState(null);
  const [filter, setFilter] = useState('inbox');

  useEffect(() => {
    if (!isOrgUser) return;
    let url = '/api/org-trading/flags?';
    if (filter === 'inbox') url += 'asRecipient=true&status=open';
    else if (filter === 'sent') url += 'asRaiser=true';
    else if (filter === 'resolved') url += 'asRaiser=true&asRecipient=true&status=resolved';

    fetch(url)
      .then((r) => (r.ok ? r.json() : { flags: [] }))
      .then((d) => setFlags(d.flags || []))
      .catch(() => setFlags([]));
  }, [isOrgUser, filter, selectedFlagId]);

  if (isLoading) return <div style={{ padding: '2rem' }}>Loading…</div>;
  if (!isOrgUser)
    return <div style={{ padding: '2rem' }}>This page is for organizational members only.</div>;

  return (
    <div className="dashboard-page-inset org-trading-page">
      <div className="ot-hero">
        <div className="ot-hero-left">
          <div className="ot-hero-icon">
            <i className="bi bi-flag-fill" />
          </div>
          <div>
            <h1>Flag Inbox</h1>
            <p className="ot-hero-sub">Review and respond to position flags</p>
          </div>
        </div>
        <Link href="/org-trading" className="ot-inbox-link">
          <i className="bi bi-arrow-left" />
          <span>Back to Trading</span>
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {['inbox', 'sent', 'resolved'].map((f) => (
          <button
            key={f}
            type="button"
            className="ot-btn-secondary"
            style={
              filter === f
                ? { background: 'rgba(99,102,241,0.18)', borderColor: 'rgba(99,102,241,0.4)', color: '#f0f6fc' }
                : {}
            }
            onClick={() => {
              setFilter(f);
              setSelectedFlagId(null);
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectedFlagId ? '1fr 1.4fr' : '1fr',
          gap: '1rem',
        }}
      >
        <FlagInboxList
          flags={flags}
          selectedFlagId={selectedFlagId}
          onSelect={setSelectedFlagId}
          mode={filter}
        />
        {selectedFlagId && (
          <FlagDetailPanel
            flagId={selectedFlagId}
            currentMemberId={orgData?.member?.id}
            onClose={() => setSelectedFlagId(null)}
            onChange={() => setSelectedFlagId(selectedFlagId)}
          />
        )}
      </div>
    </div>
  );
}
