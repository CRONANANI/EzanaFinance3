'use client';

import { useOrg } from '@/contexts/OrgContext';
import Link from 'next/link';

function ExecutiveHomeCards({ orgData }) {
  const teams = orgData?.teams || [];
  return (
    <>
      <div className="db-card hts-card">
        <div className="db-card-header">
          <h3>Organization Overview</h3>
        </div>
        <div className="hts-card-body">
          <p style={{ color: '#6366f1', fontWeight: 700, marginBottom: '0.5rem' }}>{orgData?.org?.name}</p>
          <p className="hts-label">{teams.length} Active Teams</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.5rem',
              marginTop: '0.75rem',
            }}
          >
            {teams.map((t) => (
              <Link key={t.id} href={`/org-team-hub?team=${t.slug}`} className="hts-card-link" style={{ fontSize: '0.75rem' }}>
                {t.name} <i className="bi bi-arrow-right" />
              </Link>
            ))}
          </div>
        </div>
      </div>
      {teams.map((team) => (
        <div key={team.id} className="db-card hts-card">
          <div className="db-card-header">
            <h3>{team.name}</h3>
          </div>
          <div className="hts-card-body">
            <p className="hts-label">Team Portfolio Performance</p>
            <div className="hts-stat-lg">—</div>
            <p className="hts-caption">Connect portfolio data to see live performance</p>
            <Link href={`/org-team-hub?team=${team.slug}`} className="hts-card-link">
              View Team <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      ))}
    </>
  );
}

function PMHomeCards({ orgData }) {
  const team = orgData?.team;
  return (
    <>
      <div className="db-card hts-card">
        <div className="db-card-header">
          <h3>{team?.name || 'Your Team'} Portfolio</h3>
        </div>
        <div className="hts-card-body">
          <p className="hts-label">Team Performance</p>
          <div className="hts-stat-lg">—</div>
          <p className="hts-caption">Top holdings and performance data</p>
          <Link href="/org-team-hub" className="hts-card-link">
            Team Hub <i className="bi bi-arrow-right" />
          </Link>
        </div>
      </div>
      <div className="db-card hts-card">
        <div className="db-card-header">
          <h3>Task Management</h3>
        </div>
        <div className="hts-card-body">
          <p className="hts-label">Assigned to your analysts</p>
          <p className="hts-caption">View and manage analyst tasks</p>
          <Link href="/org-team-hub" className="hts-card-link">
            Manage Tasks <i className="bi bi-arrow-right" />
          </Link>
        </div>
      </div>
    </>
  );
}

function AnalystHomeCards({ orgData }) {
  const team = orgData?.team;
  return (
    <>
      <div className="db-card hts-card">
        <div className="db-card-header">
          <h3>{team?.name || 'Your Team'} Portfolio</h3>
        </div>
        <div className="hts-card-body">
          <p className="hts-label">Your Team&apos;s Performance</p>
          <div className="hts-stat-lg">—</div>
          <Link href="/org-team-hub" className="hts-card-link">
            View Details <i className="bi bi-arrow-right" />
          </Link>
        </div>
      </div>
      <div className="db-card hts-card">
        <div className="db-card-header">
          <h3>My Tasks</h3>
        </div>
        <div className="hts-card-body">
          <p className="hts-label">Assigned by your Portfolio Manager</p>
          <p className="hts-caption">Check your pending assignments</p>
          <Link href="/org-team-hub" className="hts-card-link">
            View Tasks <i className="bi bi-arrow-right" />
          </Link>
        </div>
      </div>
      <div className="db-card hts-card">
        <div className="db-card-header">
          <h3>Upcoming Events</h3>
        </div>
        <div className="hts-card-body">
          <p className="hts-label">Presentations & deadlines</p>
          <p className="hts-caption">Stay on top of your schedule</p>
          <Link href="/org-team-hub" className="hts-card-link">
            View Calendar <i className="bi bi-arrow-right" />
          </Link>
        </div>
      </div>
    </>
  );
}

export function OrgHomeCards() {
  const { isOrgUser, orgRole, orgData, isLoading } = useOrg();
  if (!isOrgUser || isLoading) return null;

  return (
    <div
      className="hts-row"
      style={{
        gridTemplateColumns:
          orgRole === 'executive' ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'repeat(2, 1fr)',
        marginBottom: '1.25rem',
      }}
    >
      {orgRole === 'executive' && <ExecutiveHomeCards orgData={orgData} />}
      {orgRole === 'portfolio_manager' && <PMHomeCards orgData={orgData} />}
      {orgRole === 'analyst' && <AnalystHomeCards orgData={orgData} />}
    </div>
  );
}
