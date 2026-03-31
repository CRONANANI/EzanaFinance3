'use client';

import { useState } from 'react';
import { ORG_NAME, MOCK_TEAMS, MOCK_MEMBERS, PERMISSION_TIERS } from '@/lib/orgMockData';

export function OrgSettingsPanel() {
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [members, setMembers] = useState(MOCK_MEMBERS);

  const filtered = selectedTeam === 'all' ? members : members.filter((m) => m.team_id === selectedTeam);

  const updateSubRole = (memberId, newSubRole) => {
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, sub_role: newSubRole } : m)));
  };

  const getSubRoleOptions = (role) => {
    return PERMISSION_TIERS[role]?.sub_roles || [];
  };

  const getPermissionsForSubRole = (role, subRole) => {
    const tier = PERMISSION_TIERS[role];
    if (!tier) return [];
    if (typeof tier.permissions === 'object' && !Array.isArray(tier.permissions)) {
      return tier.permissions[subRole] || [];
    }
    return tier.permissions || [];
  };

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Organization Management</h2>
        <p className="settings-panel-desc">
          {ORG_NAME} — Manage member roles, permissions, and team structure.
        </p>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Member Permissions</div>
        <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '1rem' }}>
          Assign sub-roles to control what each member can access. Changes apply immediately.
        </p>

        <div className="settings-row single" style={{ marginBottom: '1rem' }}>
          <div className="settings-field">
            <label className="settings-label">Filter by team</label>
            <select className="settings-input" value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}>
              <option value="all">All Teams</option>
              {MOCK_TEAMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem', color: '#9ca3af', fontWeight: 600, fontSize: '0.6875rem' }}>
                  MEMBER
                </th>
                <th style={{ textAlign: 'left', padding: '0.5rem', color: '#9ca3af', fontWeight: 600, fontSize: '0.6875rem' }}>
                  ROLE
                </th>
                <th style={{ textAlign: 'left', padding: '0.5rem', color: '#9ca3af', fontWeight: 600, fontSize: '0.6875rem' }}>
                  SUB-ROLE
                </th>
                <th style={{ textAlign: 'left', padding: '0.5rem', color: '#9ca3af', fontWeight: 600, fontSize: '0.6875rem' }}>
                  TEAM
                </th>
                <th style={{ textAlign: 'left', padding: '0.5rem', color: '#9ca3af', fontWeight: 600, fontSize: '0.6875rem' }}>
                  PERMISSIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const team = MOCK_TEAMS.find((t) => t.id === m.team_id);
                const perms = getPermissionsForSubRole(m.role, m.sub_role);
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                    <td style={{ padding: '0.6rem 0.5rem', color: '#f0f6fc', fontWeight: 600 }}>
                      {m.name}
                      <br />
                      <span style={{ color: '#6b7280', fontSize: '0.625rem', fontWeight: 400 }}>{m.email}</span>
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background:
                            m.role === 'executive'
                              ? 'rgba(245,158,11,0.12)'
                              : m.role === 'portfolio_manager'
                                ? 'rgba(99,102,241,0.12)'
                                : 'rgba(16,185,129,0.12)',
                          color: m.role === 'executive' ? '#f59e0b' : m.role === 'portfolio_manager' ? '#818cf8' : '#10b981',
                        }}
                      >
                        {PERMISSION_TIERS[m.role]?.label || m.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>
                      <select
                        style={{
                          background: 'rgba(99,102,241,0.06)',
                          border: '1px solid rgba(99,102,241,0.15)',
                          borderRadius: '6px',
                          color: '#f0f6fc',
                          fontSize: '0.75rem',
                          padding: '4px 8px',
                          fontFamily: 'inherit',
                        }}
                        value={m.sub_role}
                        onChange={(e) => updateSubRole(m.id, e.target.value)}
                      >
                        {getSubRoleOptions(m.role).map((sr) => (
                          <option key={sr} value={sr}>
                            {sr}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem', color: '#9ca3af', fontSize: '0.75rem' }}>
                      {team?.name || (m.role === 'executive' ? 'All Teams' : '—')}
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {perms.slice(0, 3).map((p) => (
                          <span
                            key={p}
                            style={{
                              fontSize: '0.5625rem',
                              padding: '1px 4px',
                              borderRadius: '3px',
                              background: 'rgba(99,102,241,0.08)',
                              color: '#818cf8',
                            }}
                          >
                            {p.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {perms.length > 3 && <span style={{ fontSize: '0.5625rem', color: '#6b7280' }}>+{perms.length - 3} more</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

