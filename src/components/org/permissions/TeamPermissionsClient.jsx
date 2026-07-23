'use client';

import { useEffect, useState, useCallback } from 'react';
import { KeyRound, Check, Loader2, Lock } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import './team-permissions.css';

const PERMISSION_LABELS = {
  flag_positions: 'Flag positions',
  manage_positions: 'Manage positions',
  upload_deliverables: 'Upload deliverables',
  view_team_analytics: 'View team analytics',
  view_analytics: 'View fund analytics',
  create_events: 'Create events',
  approve_deliverables: 'Approve deliverables',
  send_to_team: 'Send to team',
  mentor_juniors: 'Mentor juniors',
};

export function TeamPermissionsClient({ initialData }) {
  const { universityName } = useOrg();
  const [data, setData] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [savingKey, setSavingKey] = useState(null); // `${memberId}:${key}`
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/org/permissions');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialData) load();
  }, [initialData, load]);

  const toggle = async (memberId, key, currentlyOn) => {
    if (!data?.viewer?.canGrant) return;
    const cellKey = `${memberId}:${key}`;
    setSavingKey(cellKey);
    setError('');
    // Optimistic
    setData((d) => ({
      ...d,
      reports: d.reports.map((m) =>
        m.id === memberId
          ? {
              ...m,
              permissions: m.permissions.map((p) =>
                p.key === key ? { ...p, on: !currentlyOn, overridden: !currentlyOn } : p,
              ),
            }
          : m,
      ),
    }));
    try {
      const res = await fetch('/api/org/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          permissionKey: key,
          action: currentlyOn ? 'revoke' : 'grant',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
    } catch (e) {
      setError(e.message);
      await load(); // rollback to server truth
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <div className="tpm-empty">Loading permissions…</div>;
  if (error && !data) return <div className="tpm-empty">{error}</div>;
  if (!data) return null;

  const { viewer, reports } = data;

  return (
    <div className="tpm-root">
      <header className="tpm-header">
        <span className="tpm-eyebrow tpm-num">PERMISSIONS · {universityName || 'COUNCIL'}</span>
        <h1 className="tpm-title">
          Team Permissions
          <span className="tpm-role-pill">
            <KeyRound size={12} aria-hidden />
            {viewer.canGrant ? 'You can grant permissions' : 'View only'}
          </span>
        </h1>
        <p className="tpm-sub">
          Control what your direct reports can do. Role defaults are always on; toggle the extras.
        </p>
      </header>

      {error && <div className="tpm-error">{error}</div>}

      {reports.length === 0 ? (
        <div className="tpm-empty">
          You have no direct reports. Permissions for your subordinates appear here once your
          council’s reporting structure is set up.
        </div>
      ) : (
        <div className="tpm-grid">
          {reports.map((m) => (
            <section key={m.id} className="tpm-card">
              <div className="tpm-card-head">
                <div className="tpm-member">
                  <span className="tpm-member-name">{m.name}</span>
                  <span className="tpm-member-title">{m.title || m.subRole || m.role}</span>
                </div>
              </div>
              <div className="tpm-perms">
                {m.permissions.map((p) => {
                  const locked = p.isDefault;
                  const cellKey = `${m.id}:${p.key}`;
                  const saving = savingKey === cellKey;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      className={`tpm-perm ${p.on ? 'is-on' : ''} ${locked ? 'is-locked' : ''}`}
                      disabled={locked || saving || !viewer.canGrant}
                      onClick={() => toggle(m.id, p.key, p.on)}
                      aria-pressed={p.on}
                      title={locked ? 'Role default — always granted' : undefined}
                    >
                      <span className="tpm-perm-check" aria-hidden>
                        {saving ? (
                          <Loader2 size={13} className="tpm-spin" />
                        ) : locked ? (
                          <Lock size={12} />
                        ) : p.on ? (
                          <Check size={13} />
                        ) : null}
                      </span>
                      <span className="tpm-perm-label">{PERMISSION_LABELS[p.key] || p.key}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
