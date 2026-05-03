'use client';

import Link from 'next/link';
import { useOrg } from '@/contexts/OrgContext';
import { useTheme } from '@/components/ThemeProvider';
import {
  MOCK_MEMBERS,
  MOCK_TEAMS,
  getMemberByEmail,
  getOrgMemberReportsTo,
  getOrgMemberDirectReports,
  getOrgMemberTopInteractions,
} from '@/lib/orgMockData';

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

function PersonRow({ member, label, compact = false, isDark }) {
  if (!member) return null;
  const team = MOCK_TEAMS.find((t) => t.id === member.team_id);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: compact ? '0.35rem 0' : '0.5rem 0',
        borderBottom: isDark ? '1px solid rgba(99,102,241,0.06)' : '1px solid #f3f4f6',
      }}
    >
      <AvatarCircle name={member.name} role={member.role} size={compact ? 30 : 36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: isDark ? '#f0f6fc' : '#111827', fontSize: '0.8125rem', fontWeight: 600, margin: 0, lineHeight: 1.3 }}>
          {member.name}
        </p>
        <p style={{ color: isDark ? '#6b7280' : '#9ca3af', fontSize: '0.625rem', margin: '1px 0 0', lineHeight: 1.3 }}>
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  if (!isOrgUser || !orgData) return null;

  const emailMatch = getMemberByEmail(orgData?.member?.email);
  const currentMember = emailMatch || MOCK_MEMBERS.find((m) => m.role === orgRole) || MOCK_MEMBERS[0];

  const reportsTo = getOrgMemberReportsTo(currentMember);
  const directReports = getOrgMemberDirectReports(currentMember);
  const topColleagues = getOrgMemberTopInteractions(currentMember.id);
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
              color: isDark ? '#9ca3af' : '#64748b',
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
              <p style={{ color: isDark ? '#f0f6fc' : '#111827', fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>
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
                color: isDark ? '#9ca3af' : '#64748b',
                fontSize: '0.5625rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: '0 0 0.3rem',
              }}
            >
              Reports To
            </p>
            <PersonRow member={reportsTo} label={reportsTo.sub_role} isDark={isDark} />
          </div>
        )}

        {isExec && directReports.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <p
              style={{
                color: isDark ? '#9ca3af' : '#64748b',
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
              return <PersonRow key={m.id} member={m} label={team?.name} compact isDark={isDark} />;
            })}
            {directReports.length > 4 && (
              <p style={{ color: isDark ? '#6b7280' : '#9ca3af', fontSize: '0.625rem', margin: '0.3rem 0 0' }}>
                +{directReports.length - 4} more
              </p>
            )}
          </div>
        )}

        {isPM && directReports.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <p
              style={{
                color: isDark ? '#9ca3af' : '#64748b',
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
              <PersonRow key={m.id} member={m} label={m.sub_role} compact isDark={isDark} />
            ))}
            {directReports.length > 3 && (
              <p style={{ color: isDark ? '#6b7280' : '#9ca3af', fontSize: '0.625rem', margin: '0.3rem 0 0' }}>
                +{directReports.length - 3} more
              </p>
            )}
          </div>
        )}

        <div style={{ marginBottom: '0.75rem' }}>
          <p
            style={{
              color: isDark ? '#9ca3af' : '#64748b',
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
            <PersonRow key={m.id} member={m} label={`#${i + 1}`} compact isDark={isDark} />
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
