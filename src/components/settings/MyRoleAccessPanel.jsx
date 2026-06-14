'use client';

import { useMemo } from 'react';
import { useOrg } from '@/contexts/OrgContext';

const ROLE_LABEL = {
  executive: 'Executive',
  portfolio_manager: 'Portfolio Manager',
  analyst: 'Analyst',
};

function RoleBadge({ role }) {
  const tone =
    role === 'executive'
      ? { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b' }
      : role === 'portfolio_manager'
        ? { bg: 'rgba(99,102,241,0.12)', fg: '#818cf8' }
        : { bg: 'rgba(16,185,129,0.12)', fg: '#10b981' };
  return (
    <span
      style={{
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        padding: '3px 9px',
        borderRadius: 999,
        background: tone.bg,
        color: tone.fg,
      }}
    >
      {ROLE_LABEL[role] || role}
    </span>
  );
}

export function MyRoleAccessPanel() {
  const {
    isOrgUser,
    orgRole,
    orgData,
    permissions,
    isExecutive,
    isPortfolioManager,
    isAnalyst,
  } = useOrg();

  const member = orgData?.member || null;
  const isAdvisor = isExecutive && member?.sub_role === 'Faculty Advisor';

  const { can, cant } = useMemo(() => {
    const grant = (key) => Array.isArray(permissions) && permissions.includes(key);
    // Universal council abilities + role/permission-gated ones. Each entry's
    // `on` decides which column (can / can't) it lands in — full transparency.
    const abilities = [
      { label: 'Submit stock pitches', on: true },
      { label: 'Publish research notes', on: true },
      { label: 'Vote in the investment committee', on: true },
      { label: 'Comment on positions & discussions', on: true },
      { label: 'View fund analytics', on: true },
      { label: 'View your own scorecard & grades', on: true },
      { label: 'Flag positions for compliance review', on: grant('flag_positions') },
      {
        label: 'Manage team tasks & assignments',
        on: grant('manage_team_tasks') || grant('manage_tasks'),
      },
      { label: 'Mentor / oversee junior analysts', on: grant('mentor_juniors') || grant('manage_analysts') },
      { label: 'Award recognition', on: isPortfolioManager || isExecutive },
      {
        label: 'Run investment-committee meetings',
        on: grant('manage_events') || grant('create_events') || isPortfolioManager || isExecutive,
      },
      { label: 'Manage members & roles', on: grant('manage_members') || isExecutive },
      {
        label: 'Edit the Investment Policy Statement (IPS)',
        on: grant('manage_org_settings') || isExecutive,
      },
      { label: 'Archive cohorts', on: isExecutive },
      { label: 'Grade assignments', on: isAdvisor },
      { label: 'Export stakeholder reports', on: isExecutive },
    ];
    return {
      can: abilities.filter((a) => a.on),
      cant: abilities.filter((a) => !a.on),
    };
  }, [permissions, isExecutive, isPortfolioManager, isAdvisor]);

  if (!isOrgUser) {
    return (
      <div className="settings-panel">
        <div className="settings-panel-header">
          <h2 className="settings-panel-title">My role &amp; access</h2>
          <p className="settings-panel-desc">This section is for organization members.</p>
        </div>
      </div>
    );
  }

  const teamName = orgData?.team?.name || null;
  const orgName = orgData?.org?.university_name || orgData?.org?.name || 'Investment Council';

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">My role &amp; access</h2>
        <p className="settings-panel-desc">
          Your seat in {orgName} and exactly what it lets you do. Roles are managed by your
          council&apos;s executives.
        </p>
      </div>

      {/* Identity card */}
      <div className="settings-section">
        <div className="settings-section-title">Your seat</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            marginTop: '0.5rem',
          }}
        >
          <Field label="Member">{member?.display_name || '—'}</Field>
          <Field label="Role">
            <RoleBadge role={orgRole} />
          </Field>
          <Field label="Sub-role">{member?.sub_role || '—'}</Field>
          <Field label="Team">{teamName || (isExecutive ? 'All teams' : '—')}</Field>
        </div>
        {isAdvisor && (
          <p
            style={{
              marginTop: '1rem',
              padding: '0.75rem 0.9rem',
              borderRadius: 8,
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)',
              color: '#fbbf24',
              fontSize: '0.8rem',
              lineHeight: 1.5,
            }}
          >
            <i className="bi bi-mortarboard-fill" style={{ marginRight: 6 }} />
            As <strong>Faculty Advisor</strong> you have oversight and grading authority across the
            council, including governance and compliance controls.
          </p>
        )}
      </div>

      {/* Permissions transparency */}
      <div className="settings-section">
        <div className="settings-section-title">What you can do</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0 0', display: 'grid', gap: '0.4rem' }}>
          {can.map((a) => (
            <li
              key={a.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#e2e8f0' }}
            >
              <i className="bi bi-check-circle-fill" style={{ color: '#10b981' }} />
              {a.label}
            </li>
          ))}
        </ul>
      </div>

      {cant.length > 0 && (
        <div className="settings-section">
          <div className="settings-section-title">Not available at your level</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0 0', display: 'grid', gap: '0.4rem' }}>
            {cant.map((a) => (
              <li
                key={a.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}
              >
                <i className="bi bi-dash-circle" style={{ color: '#4b5563' }} />
                {a.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div
        style={{
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#6b7280',
          marginBottom: '0.35rem',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '0.9rem', color: '#f0f6fc', fontWeight: 500 }}>{children}</div>
    </div>
  );
}
