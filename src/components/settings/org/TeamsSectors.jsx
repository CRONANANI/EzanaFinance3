'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

const GICS_SECTORS = [
  'Energy',
  'Materials',
  'Industrials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Health Care',
  'Financials',
  'Information Technology',
  'Communication Services',
  'Utilities',
  'Real Estate',
];

export function TeamsSectors() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/org/teams', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load teams');
      setTeams(data.teams || []);
    } catch (e) {
      setMsg({ err: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/org/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Create failed');
      setTeams((prev) => [...prev, data.team].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      setMsg({ ok: 'Team created' });
    } catch (err) {
      setMsg({ err: err.message });
    } finally {
      setBusy(false);
    }
  };

  const rename = async (team, name) => {
    if (!name.trim() || name === team.name) return;
    setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, name } : t)));
    const res = await fetch('/api/org/teams', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: team.id, name }),
    });
    if (!res.ok) {
      setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, name: team.name } : t)));
      const d = await res.json().catch(() => ({}));
      setMsg({ err: d?.error || 'Rename failed' });
    }
  };

  const remove = async (team) => {
    if (!window.confirm(`Delete team "${team.name}"? Members are detached, not removed.`)) return;
    setTeams((prev) => prev.filter((t) => t.id !== team.id));
    await fetch(`/api/org/teams?id=${team.id}`, { method: 'DELETE' }).catch(() => {});
  };

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Teams &amp; Sectors</h2>
        <p className="settings-panel-desc">
          Sector desks for the fund. Per-member sector coverage is assigned on the org chart.
        </p>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Create a team</div>
        <form onSubmit={create} className="settings-row">
          <div className="settings-field" style={{ flex: 1 }}>
            <label className="settings-label">Team name</label>
            <input
              className="settings-input"
              value={newName}
              placeholder="e.g. Technology, Media & Telecom"
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className="settings-field" style={{ alignSelf: 'flex-end' }}>
            <button
              type="submit"
              className="settings-btn-primary"
              disabled={busy}
              style={{ opacity: busy ? 0.7 : 1 }}
            >
              Add team
            </button>
          </div>
        </form>
        {msg?.ok && <span style={{ color: '#10b981', fontSize: '0.8rem' }}>✓ {msg.ok}</span>}
        {msg?.err && <span style={{ color: '#f87171', fontSize: '0.8rem' }}>{msg.err}</span>}
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Teams ({teams.length})</div>
        {loading ? (
          <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Loading…</p>
        ) : teams.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>No teams yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {teams.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <input
                  defaultValue={t.name}
                  onBlur={(e) => rename(t, e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: 'transparent',
                    border: 'none',
                    color: '#f0f6fc',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}
                />
                <span style={{ color: '#6b7280', fontSize: '0.7rem', flexShrink: 0 }}>
                  {t.memberCount} member{t.memberCount === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  onClick={() => remove(t)}
                  style={{
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '5px 11px',
                    borderRadius: 999,
                    color: '#f87171',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    flexShrink: 0,
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Sector coverage (GICS)</div>
        <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
          The 11 GICS sectors the council can cover. Assign analysts to sectors on the org chart to
          close coverage gaps.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '0.75rem' }}>
          {GICS_SECTORS.map((s) => (
            <span
              key={s}
              style={{
                fontSize: '0.7rem',
                padding: '3px 9px',
                borderRadius: 999,
                background: 'rgba(99,102,241,0.08)',
                color: '#a5b4fc',
                border: '1px solid rgba(99,102,241,0.18)',
              }}
            >
              {s}
            </span>
          ))}
        </div>
        <Link
          href="/org-team-hub/org-chart"
          style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#c7d2fe',
            textDecoration: 'none',
          }}
        >
          Manage sector coverage on the org chart →
        </Link>
      </div>
    </div>
  );
}
