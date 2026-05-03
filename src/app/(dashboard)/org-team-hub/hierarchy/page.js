'use client';

import { useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { useTheme } from '@/components/ThemeProvider';
import Link from 'next/link';
import {
  ORG_NAME,
  MOCK_MEMBERS,
  MOCK_TEAMS,
  getMemberByEmail,
} from '@/lib/orgMockData';
import { OrgMemberProfileModal } from '@/components/org/OrgMemberProfileModal';
import '../../../../../app-legacy/assets/css/theme.css';

function roleColor(role) {
  if (role === 'executive') return '#f59e0b';
  if (role === 'portfolio_manager') return '#6366f1';
  return '#10b981';
}

function AvatarCircle({ name, role, size = 40, highlight = false }) {
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
        background: highlight
          ? `linear-gradient(135deg, ${roleColor(role)}, ${roleColor(role)}cc)`
          : `linear-gradient(135deg, ${roleColor(role)}33, ${roleColor(role)}66)`,
        border: highlight
          ? `2px solid ${roleColor(role)}`
          : `1.5px solid ${roleColor(role)}55`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.3,
        fontWeight: 700,
        color: highlight ? '#fff' : roleColor(role),
        flexShrink: 0,
        boxShadow: highlight ? `0 0 12px ${roleColor(role)}44` : 'none',
      }}
    >
      {initials}
    </div>
  );
}

function MemberNode({ member, isCurrentUser, onSelect, isDark }) {
  const team = MOCK_TEAMS.find((t) => t.id === member.team_id);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open profile for ${member.name}`}
      onClick={() => onSelect?.(member)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(member);
        }
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.6rem 0.8rem',
        borderRadius: '10px',
        background: isCurrentUser
          ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.2))'
          : isDark
            ? 'rgba(255,255,255,0.02)'
            : '#f9fafb',
        border: isCurrentUser
          ? '1.5px solid rgba(99,102,241,0.4)'
          : isDark
            ? '1px solid rgba(255,255,255,0.06)'
            : '1px solid #e5e7eb',
        minWidth: '110px',
        maxWidth: '140px',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.15s ease, border-color 0.15s ease, transform 0.12s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isCurrentUser
          ? 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(99,102,241,0.28))'
          : 'rgba(99,102,241,0.08)';
        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isCurrentUser
          ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.2))'
          : isDark
            ? 'rgba(255,255,255,0.02)'
            : '#f9fafb';
        e.currentTarget.style.borderColor = isCurrentUser ? 'rgba(99,102,241,0.4)' : isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb';
      }}
    >
      {isCurrentUser && (
        <span
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            fontSize: '0.5rem',
            fontWeight: 700,
            padding: '1px 5px',
            borderRadius: '4px',
            background: '#6366f1',
            color: '#fff',
            letterSpacing: '0.05em',
          }}
        >
          YOU
        </span>
      )}
      <AvatarCircle name={member.name} role={member.role} size={38} highlight={isCurrentUser} />
      <p style={{ color: isDark ? '#f0f6fc' : '#111827', fontSize: '0.6875rem', fontWeight: 600, margin: 0, textAlign: 'center', lineHeight: 1.3 }}>
        {member.name}
      </p>
      <p style={{ color: isDark ? '#6b7280' : '#9ca3af', fontSize: '0.5625rem', margin: 0, textAlign: 'center', lineHeight: 1.2 }}>
        {member.sub_role || member.role.replace('_', ' ')}
      </p>
      {team && (
        <p style={{ color: '#818cf8', fontSize: '0.5rem', margin: 0, textAlign: 'center' }}>
          {team.name}
        </p>
      )}
    </div>
  );
}

function ConnectorLine({ style: customStyle, isDark }) {
  return (
    <div
      style={{
        width: '1px',
        height: '24px',
        background: isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.2)',
        margin: '0 auto',
        ...customStyle,
      }}
    />
  );
}

function TierLabel({ label, isDark }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '0.75rem',
        marginTop: '1.5rem',
      }}
    >
      <div style={{ height: '1px', flex: 1, background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.15)' }} />
      <span
        style={{
          fontSize: '0.5625rem',
          fontWeight: 700,
          color: isDark ? '#6b7280' : '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div style={{ height: '1px', flex: 1, background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.15)' }} />
    </div>
  );
}

export default function OrgHierarchyPage() {
  const { isOrgUser, orgData, isLoading } = useOrg();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedMember, setSelectedMember] = useState(null);

  if (isLoading) return <div style={{ padding: '2rem', color: isDark ? '#888' : '#6b7280' }}>Loading...</div>;
  if (!isOrgUser) return <div style={{ padding: '2rem', color: isDark ? '#888' : '#6b7280' }}>This page is for organizational members only.</div>;

  const emailMatch = getMemberByEmail(orgData?.member?.email);
  const currentMemberId = emailMatch?.id || null;

  const executives = MOCK_MEMBERS.filter((m) => m.role === 'executive');
  const teams = MOCK_TEAMS.map((team) => {
    const pm = MOCK_MEMBERS.find((m) => m.role === 'portfolio_manager' && m.team_id === team.id);
    const analysts = MOCK_MEMBERS.filter((m) => m.role === 'analyst' && m.team_id === team.id);
    return { ...team, pm, analysts };
  });

  return (
    <div className="dashboard-page-inset">
      <OrgMemberProfileModal
        member={selectedMember}
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        viewerMemberId={currentMemberId}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}>
        <Link
          href="/org-team-hub"
          style={{ color: isDark ? '#6b7280' : '#4b5563', fontSize: '0.8125rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <i className="bi bi-arrow-left" /> Team Hub
        </Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <i className="bi bi-diagram-3" style={{ color: '#6366f1', fontSize: '1.5rem' }} />
        <div>
          <h1 style={{ color: isDark ? '#fff' : '#111827', fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Organization Hierarchy</h1>
          <p style={{ color: isDark ? '#888' : '#6b7280', fontSize: '0.8rem', margin: 0 }}>{ORG_NAME}</p>
        </div>
      </div>

      {/* Org chart */}
      <div className="db-card" style={{ padding: '1.5rem', overflow: 'auto' }}>

        {/* Executive Tier */}
        <TierLabel label="Executive Board" isDark={isDark} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          {executives.map((m) => (
            <MemberNode
              key={m.id}
              member={m}
              isCurrentUser={m.id === currentMemberId}
              onSelect={setSelectedMember}
              isDark={isDark}
            />
          ))}
        </div>

        <ConnectorLine style={{ height: '32px' }} isDark={isDark} />

        {/* PM + Analyst Tiers grouped by team */}
        <TierLabel label="Sector Teams" isDark={isDark} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {teams.map((team) => (
            <div
              key={team.id}
              style={{
                border: '1px solid rgba(99,102,241,0.1)',
                borderRadius: '10px',
                padding: '0.75rem',
                background: isDark ? 'rgba(99,102,241,0.02)' : '#fafafa',
              }}
            >
              {/* Team name */}
              <p
                style={{
                  color: '#818cf8',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  margin: '0 0 0.6rem',
                  textAlign: 'center',
                }}
              >
                {team.name}
              </p>

              {/* PM */}
              {team.pm && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  <MemberNode
                    member={team.pm}
                    isCurrentUser={team.pm.id === currentMemberId}
                    onSelect={setSelectedMember}
                    isDark={isDark}
                  />
                </div>
              )}

              {team.analysts.length > 0 && <ConnectorLine style={{ height: '16px' }} isDark={isDark} />}

              {/* Analysts */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  justifyContent: 'center',
                }}
              >
                {team.analysts.map((a) => (
                  <MemberNode
                    key={a.id}
                    member={a}
                    isCurrentUser={a.id === currentMemberId}
                    onSelect={setSelectedMember}
                    isDark={isDark}
                  />
                ))}
              </div>

              {!team.pm && team.analysts.length === 0 && (
                <p style={{ color: isDark ? '#4b5563' : '#9ca3af', fontSize: '0.6875rem', textAlign: 'center', margin: 0 }}>
                  No members assigned
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1.5rem',
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(99,102,241,0.08)',
          }}
        >
          {[
            { label: 'Executive', color: '#f59e0b' },
            { label: 'Portfolio Manager', color: '#6366f1' },
            { label: 'Analyst', color: '#10b981' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: item.color,
                  display: 'inline-block',
                }}
              />
              <span style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: '0.625rem', fontWeight: 500 }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
