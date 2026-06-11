'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useOrg } from '@/contexts/OrgContext';
import { OrgChartTree } from '@/components/org/orgchart2/OrgChartTree';
import { SectorCoverageMap } from '@/components/org/orgchart2/SectorCoverageMap';
import { OrgMemberProfileModal } from '@/components/org/OrgMemberProfileModal';
import '@/components/org/orgchart2/org-chart.css';

const ROLE_LABEL = {
  executive: 'Executive',
  portfolio_manager: 'Portfolio Manager',
  analyst: 'Analyst',
};

/** Map a chart member (DB shape) to the shape OrgMemberProfileModal expects. */
function toModalMember(m) {
  if (!m) return null;
  return {
    id: m.id,
    name: m.display_name || 'Unnamed',
    role: m.role,
    sub_role: m.sub_role || null,
    email: m.email || null,
    team_id: m.team_id || null,
    title: m.title || null,
  };
}

export function OrgChartClient() {
  const { isOrgUser, isLoading: orgLoading } = useOrg();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('hierarchy');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/org/chart', { cache: 'no-store', credentials: 'include' });
      if (res.status === 403) {
        setError('This page is for organizational members only.');
        setData(null);
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Failed to load the org chart.');
        return;
      }
      setError('');
      setData(json);
    } catch {
      setError('Could not connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const members = data?.members || [];
  const viewer = data?.viewer || { canManage: false, role: null, memberId: null };

  // Assign a member to a sector (manager-only path; the route re-checks the role).
  const handleAssignSector = useCallback(
    async (sector, memberId) => {
      const member = members.find((m) => m.id === memberId);
      if (!member) return;
      const current = (member.sectors || []).map((s) => s.sector);
      const next = [...new Set([...current, sector])];
      try {
        const res = await fetch('/api/org/chart', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ member_id: memberId, sectors: next }),
        });
        if (res.ok) await load();
      } catch {
        /* surfaced on next load; non-fatal */
      }
    },
    [members, load],
  );

  // Term & succession summary — graduating members and the seats they vacate.
  const succession = useMemo(() => {
    const graduating = members.filter((m) => m.is_graduating);
    const vacantSeats = graduating.map(
      (m) => m.title || ROLE_LABEL[m.role] || m.role || 'Member',
    );
    return { count: graduating.length, vacantSeats };
  }, [members]);

  // The succession strip is for leadership (executives, incl. faculty advisors).
  const showSuccession = viewer.role === 'executive';

  if (orgLoading || loading) {
    return <div className="oc2-state">Loading organization chart…</div>;
  }
  if (error) {
    return <div className="oc2-state oc2-error">{error}</div>;
  }
  if (!isOrgUser || !data) {
    return <div className="oc2-state">This page is for organizational members only.</div>;
  }

  return (
    <div className="dashboard-page-inset oc2-root">
      <div className="oc2-header">
        <div>
          <p className="oc2-eyebrow">Organization</p>
          <h1 className="oc2-title">{data.universityName} — Organization Chart</h1>
        </div>
        <Link href="/org-team-hub" className="oc2-assign-btn" style={{ textDecoration: 'none' }}>
          <i className="bi bi-arrow-left" aria-hidden /> Team Hub
        </Link>
      </div>

      {showSuccession && (
        <div className="oc2-term-strip">
          <div className="oc2-term-stat">
            <span className={`oc2-term-stat-value${succession.count > 0 ? ' is-amber' : ''}`}>
              {succession.count}
            </span>
            <span className="oc2-term-stat-label">Graduating this term</span>
          </div>
          <div className="oc2-term-stat" style={{ flex: '1 1 auto' }}>
            <span className="oc2-term-stat-label">Seats becoming vacant</span>
            {succession.vacantSeats.length === 0 ? (
              <span className="oc2-sector-empty">None — succession is covered.</span>
            ) : (
              <div className="oc2-term-vacant" style={{ marginTop: 4 }}>
                {succession.vacantSeats.map((seat, i) => (
                  <span key={`${seat}-${i}`} className="oc2-vacant-chip">
                    {seat}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="oc2-tabs" role="tablist" aria-label="Org chart views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'hierarchy'}
          className={`oc2-tab${tab === 'hierarchy' ? ' is-active' : ''}`}
          onClick={() => setTab('hierarchy')}
        >
          Hierarchy
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'coverage'}
          className={`oc2-tab${tab === 'coverage' ? ' is-active' : ''}`}
          onClick={() => setTab('coverage')}
        >
          Sector Coverage
        </button>
      </div>

      {tab === 'hierarchy' ? (
        <OrgChartTree members={members} onSelectMember={setSelected} />
      ) : (
        <SectorCoverageMap
          sectors={data.sectors || []}
          members={members}
          canManage={viewer.canManage}
          onAssignSector={handleAssignSector}
        />
      )}

      <OrgMemberProfileModal
        member={toModalMember(selected)}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        viewerMemberId={viewer.memberId}
      />
    </div>
  );
}
