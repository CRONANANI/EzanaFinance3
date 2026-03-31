'use client';

import Link from 'next/link';
import { useOrg } from '@/contexts/OrgContext';
import {
  MOCK_MEMBERS,
  MOCK_TEAMS,
  getMemberByEmail,
} from '@/lib/orgMockData';

// ── Mock interaction data: top colleagues by member ID ──
const MOCK_TOP_INTERACTIONS = {
  m1: ['m2', 'm3', 'm4'],
  m2: ['m1', 'm5', 'm6'],
  m25: ['m1', 'm3', 'm7'],
  m3: ['m10', 'm11', 'm12'],
  m10: ['m3', 'm11', 'm22'],
  m11: ['m3', 'm10', 'm12'],
  m12: ['m3', 'm10', 'm11'],
  m20: ['m3', 'm10', 'm22'],
  m21: ['m3', 'm22', 'm10'],
  m22: ['m3', 'm21', 'm20'],
  m23: ['m3', 'm24', 'm12'],
  m24: ['m3', 'm23', 'm11'],
  m4: ['m13', 'm14', 'm1'],
  m5: ['m15', 'm1', 'm2'],
  m6: ['m16', 'm1', 'm2'],
  m7: ['m17', 'm1', 'm2'],
  m8: ['m18', 'm1', 'm2'],
  m9: ['m19', 'm1', 'm2'],
  m13: ['m4', 'm14', 'm1'],
  m14: ['m4', 'm13', 'm1'],
  m15: ['m5', 'm1', 'm2'],
  m16: ['m6', 'm1', 'm2'],
  m17: ['m7', 'm1', 'm2'],
  m18: ['m8', 'm1', 'm2'],
  m19: ['m9', 'm1', 'm2'],
};

function getReportsTo(member) {
  if (!member) return null;
  if (member.role === 'analyst') {
    return (
      MOCK_MEMBERS.find((m) => m.role === 'portfolio_manager' && m.team_id === member.team_id) || null
    );
  }
  if (member.role === 'portfolio_manager') {
    return MOCK_MEMBERS.find((m) => m.role === 'executive' && m.sub_role === 'President') || null;
  }
  return null;
}

function getDirectReports(member) {
  if (!member) return [];
  if (member.role === 'executive') {
    return MOCK_MEMBERS.filter((m) => m.role === 'portfolio_manager');
  }
  if (member.role === 'portfolio_manager') {
    return MOCK_MEMBERS.filter((m) => m.role === 'analyst' && m.team_id === member.team_id);
  }
  return [];
}

function getTopColleagues(memberId) {
  const ids = MOCK_TOP_INTERACTIONS[memberId] || [];
  return ids
    .map((id) => MOCK_MEMBERS.find((m) => m.id === id))
    .filter(Boolean)
    .slice(0, 3);
}

function roleColor(role) {
  if (role === 'executive') return '#f59e0b';
  if (role === 'portfolio_manager') return '#6366f1';
  return '#10b981';
}

function roleBg(role) {
  if (role === 'executive') return 'rgba(245,158,11,0.12)';
  if (role === 'portfolio_manager') return 'rgba(99,102,241,0.12)';
  return 'rgba(16,185,129,0.12)';
}

function AvatarCircle({ name, role, size = 36 }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${roleColor(role)}33, ${roleColor(role)}66)`,
        border: `1.5px solid ${roleColor(role)}55`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.32,
        fontWeight: 700,
        color: roleColor(role),
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function PersonRow({ member, label, compact = false }) {
  if (!member) return null;
  const team = MOCK_TEAMS.find((t) => t.id === member.team_id);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: compact ? '0.35rem 0' : '0.5rem 0',
        borderBottom: '1px solid rgba(99,102,241,0.06)',
      }}
    >
      <AvatarCircle name={member.name} role={member.role} size={compact ? 30 : 36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#f0f6fc', fontSize: '0.8125rem', fontWeight: 600, margin: 0, lineHeight: 1.3 }}>
          {member.name}
        </p>
        <p style={{ color: '#6b7280', fontSize: '0.625rem', margin: '1px 0 0', lineHeight: 1.3 }}>
          {member.sub_role || member.role.replace('_', ' ')}
          {team ? ` · ${team.name}` : ''}
        </p>
      </div>
      {label && (
        <span
          style={{
            fontSize: '0.5625rem',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            background: roleBg(member.role),
            color: roleColor(member.role),
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export function OrgHierarchyCard() {
  const { isOrgUser, orgRole, orgData } = useOrg();
  if (!isOrgUser || !orgData) return null;

  const emailMatch = getMemberByEmail(orgData?.member?.email);
  const currentMember = emailMatch || MOCK_MEMBERS.find((m) => m.role === orgRole) || MOCK_MEMBERS[0];

  const reportsTo = getReportsTo(currentMember);
  const directReports = getDirectReports(currentMember);
  const topColleagues = getTopColleagues(currentMember.id);
  const currentTeam = MOCK_TEAMS.find((t) => t.id === currentMember.team_id);

  const isExec = orgRole === 'executive';
  const isPM = orgRole === 'portfolio_manager';

  return (
    <div className="db-card">
      <div className="db-card-header">
        <h3>Organization Hierarchy</h3>
      </div>
      <div style={{ padding: '1rem' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(99,102,241,0.12))',
            border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: '8px',
            padding: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <p
            style={{
              color: '#9ca3af',
              fontSize: '0.5625rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              margin: '0 0 0.4rem',
            }}
          >
            Your Position
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AvatarCircle name={currentMember.name} role={currentMember.role} size={40} />
            <div>
              <p style={{ color: '#f0f6fc', fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>
                {currentMember.name}
              </p>
              <p style={{ color: '#818cf8', fontSize: '0.6875rem', fontWeight: 600, margin: '2px 0 0' }}>
                {currentMember.sub_role || currentMember.role.replace('_', ' ')}
                {currentTeam ? ` · ${currentTeam.name}` : ''}
              </p>
            </div>
          </div>
        </div>

        {reportsTo && (
          <div style={{ marginBottom: '0.75rem' }}>
            <p
              style={{
                color: '#9ca3af',
                fontSize: '0.5625rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: '0 0 0.3rem',
              }}
            >
              Reports To
            </p>
            <PersonRow member={reportsTo} label={reportsTo.sub_role} />
          </div>
        )}

        {isExec && directReports.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <p
              style={{
                color: '#9ca3af',
                fontSize: '0.5625rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: '0 0 0.3rem',
              }}
            >
              Portfolio Managers You Oversee
            </p>
            {directReports.slice(0, 4).map((m) => {
              const team = MOCK_TEAMS.find((t) => t.id === m.team_id);
              return <PersonRow key={m.id} member={m} label={team?.name} compact />;
            })}
            {directReports.length > 4 && (
              <p style={{ color: '#6b7280', fontSize: '0.625rem', margin: '0.3rem 0 0' }}>
                +{directReports.length - 4} more
              </p>
            )}
          </div>
        )}

        {isPM && directReports.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <p
              style={{
                color: '#9ca3af',
                fontSize: '0.5625rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: '0 0 0.3rem',
              }}
            >
              Analysts You Manage
            </p>
            {directReports.slice(0, 3).map((m) => (
              <PersonRow key={m.id} member={m} label={m.sub_role} compact />
            ))}
            {directReports.length > 3 && (
              <p style={{ color: '#6b7280', fontSize: '0.625rem', margin: '0.3rem 0 0' }}>
                +{directReports.length - 3} more
              </p>
            )}
          </div>
        )}

        <div style={{ marginBottom: '0.75rem' }}>
          <p
            style={{
              color: '#9ca3af',
              fontSize: '0.5625rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              margin: '0 0 0.3rem',
            }}
          >
            Top Collaborators
          </p>
          {topColleagues.map((m, i) => (
            <PersonRow key={m.id} member={m} label={`#${i + 1}`} compact />
          ))}
        </div>

        <Link
          href="/org-team-hub/hierarchy"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            width: '100%',
            padding: '0.6rem',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.2))',
            border: '1px solid rgba(99,102,241,0.25)',
            color: '#818cf8',
            fontSize: '0.8125rem',
            fontWeight: 600,
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.3))';
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.2))';
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)';
          }}
        >
          <i className="bi bi-diagram-3" style={{ fontSize: '0.875rem' }} />
          View Full Hierarchy
        </Link>
      </div>
    </div>
  );
}
