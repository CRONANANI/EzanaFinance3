'use client';

import { useEffect, useState, useCallback } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { PERMISSION_TIERS, getMemberPermissions } from '@/lib/orgMockData';

const ROLE_LABEL = {
  executive: 'Executive',
  portfolio_manager: 'Portfolio Manager',
  analyst: 'Analyst',
};
const ROLE_TONE = {
  executive: { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b' },
  portfolio_manager: { bg: 'rgba(99,102,241,0.12)', fg: '#818cf8' },
  analyst: { bg: 'rgba(16,185,129,0.12)', fg: '#10b981' },
};

const subRoleOptions = (role) => PERMISSION_TIERS[role]?.sub_roles || [];
const permsFor = (m) => getMemberPermissions({ role: m.role, sub_role: m.sub_role });

export function OrgSettingsPanel() {
  const { isExecutive } = useOrg();
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [orgName, setOrgName] = useState('Organization');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [rowMsg, setRowMsg] = useState({}); // memberId -> { ok?: string, err?: string }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/org/members', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to load members');
        if (!alive) return;
        setMembers(data.members || []);
        setTeams(data.teams || []);
        setOrgName(data.orgName || 'Organization');
      } catch (e) {
        if (alive) setLoadErr(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Optimistic field update with rollback + per-row status.
  const patchMember = useCallback(
    async (memberId, patch) => {
      const prev = members.find((m) => m.id === memberId);
      if (!prev) return;
      setSavingId(memberId);
      setRowMsg((s) => ({ ...s, [memberId]: undefined }));
      setMembers((list) => list.map((m) => (m.id === memberId ? { ...m, ...patch } : m)));
      try {
        const res = await fetch('/api/org/members', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member_id: memberId, ...patch }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Update failed');
        setMembers((list) => list.map((m) => (m.id === memberId ? { ...m, ...data.member } : m)));
        setRowMsg((s) => ({ ...s, [memberId]: { ok: 'Saved' } }));
        setTimeout(() => setRowMsg((s) => ({ ...s, [memberId]: undefined })), 2000);
      } catch (e) {
        // Roll back to the prior values.
        setMembers((list) => list.map((m) => (m.id === memberId ? prev : m)));
        setRowMsg((s) => ({ ...s, [memberId]: { err: e.message } }));
      } finally {
        setSavingId(null);
      }
    },
    [members],
  );

  const filtered =
    selectedTeam === 'all' ? members : members.filter((m) => m.team_id === selectedTeam);

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Organization Management</h2>
        <p className="settings-panel-desc">
          {orgName} — manage member roles, sub-roles, teams, and access. Changes are saved
          immediately.
        </p>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Members &amp; Roles</div>

        {loadErr ? (
          <p style={{ color: '#f87171', fontSize: '0.85rem' }}>{loadErr}</p>
        ) : loading ? (
          <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Loading members…</p>
        ) : (
          <>
            {!isExecutive && (
              <p style={{ color: '#fbbf24', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                Read-only — executive role required to edit members.
              </p>
            )}

            <div className="settings-row single" style={{ marginBottom: '1rem' }}>
              <div className="settings-field">
                <label className="settings-label">Filter by team</label>
                <select
                  className="settings-input"
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                >
                  <option value="all">All teams</option>
                  {teams.map((t) => (
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
                    {['MEMBER', 'ROLE', 'SUB-ROLE', 'TEAM', 'ACTIVE', 'PERMISSIONS'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '0.5rem',
                          color: '#9ca3af',
                          fontWeight: 600,
                          fontSize: '0.6875rem',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '1rem 0.5rem', color: '#6b7280' }}>
                        No members in this team.
                      </td>
                    </tr>
                  )}
                  {filtered.map((m) => {
                    const tone = ROLE_TONE[m.role] || ROLE_TONE.analyst;
                    const perms = permsFor(m);
                    const busy = savingId === m.id;
                    const msg = rowMsg[m.id];
                    const ctl = {
                      background: 'rgba(99,102,241,0.06)',
                      border: '1px solid rgba(99,102,241,0.15)',
                      borderRadius: 6,
                      color: '#f0f6fc',
                      fontSize: '0.75rem',
                      padding: '4px 8px',
                      fontFamily: 'inherit',
                      opacity: busy ? 0.6 : 1,
                    };
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                        <td style={{ padding: '0.6rem 0.5rem', color: '#f0f6fc', fontWeight: 600 }}>
                          {m.display_name || 'Member'}
                          {msg?.ok && (
                            <span style={{ color: '#10b981', fontSize: '0.6rem', marginLeft: 6 }}>
                              ✓ {msg.ok}
                            </span>
                          )}
                          {msg?.err && (
                            <>
                              <br />
                              <span style={{ color: '#f87171', fontSize: '0.6rem', fontWeight: 400 }}>
                                {msg.err}
                              </span>
                            </>
                          )}
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem' }}>
                          {isExecutive ? (
                            <select
                              style={ctl}
                              disabled={busy}
                              value={m.role}
                              onChange={(e) => patchMember(m.id, { role: e.target.value })}
                            >
                              {Object.keys(ROLE_LABEL).map((r) => (
                                <option key={r} value={r}>
                                  {ROLE_LABEL[r]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.625rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: 4,
                                background: tone.bg,
                                color: tone.fg,
                              }}
                            >
                              {ROLE_LABEL[m.role] || m.role}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem' }}>
                          {isExecutive ? (
                            <select
                              style={ctl}
                              disabled={busy}
                              value={m.sub_role || ''}
                              onChange={(e) => patchMember(m.id, { sub_role: e.target.value })}
                            >
                              <option value="">—</option>
                              {subRoleOptions(m.role).map((sr) => (
                                <option key={sr} value={sr}>
                                  {sr}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                              {m.sub_role || '—'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem' }}>
                          {isExecutive ? (
                            <select
                              style={ctl}
                              disabled={busy}
                              value={m.team_id || ''}
                              onChange={(e) => patchMember(m.id, { team_id: e.target.value || null })}
                            >
                              <option value="">— No team</option>
                              {teams.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                              {teams.find((t) => t.id === m.team_id)?.name || '—'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem' }}>
                          {isExecutive ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => patchMember(m.id, { is_active: !m.is_active })}
                              style={{
                                cursor: 'pointer',
                                fontSize: '0.625rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 999,
                                border: '1px solid transparent',
                                background: m.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.15)',
                                color: m.is_active ? '#10b981' : '#9ca3af',
                                opacity: busy ? 0.6 : 1,
                              }}
                            >
                              {m.is_active ? 'ACTIVE' : 'INACTIVE'}
                            </button>
                          ) : (
                            <span style={{ color: m.is_active ? '#10b981' : '#9ca3af', fontSize: '0.7rem' }}>
                              {m.is_active ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.6rem 0.5rem' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                            {perms.slice(0, 3).map((p) => (
                              <span
                                key={p}
                                style={{
                                  fontSize: '0.5625rem',
                                  padding: '1px 4px',
                                  borderRadius: 3,
                                  background: 'rgba(99,102,241,0.08)',
                                  color: '#818cf8',
                                }}
                              >
                                {p.replace(/_/g, ' ')}
                              </span>
                            ))}
                            {perms.length > 3 && (
                              <span style={{ fontSize: '0.5625rem', color: '#6b7280' }}>
                                +{perms.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
