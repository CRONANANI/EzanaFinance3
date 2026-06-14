'use client';

import { useEffect, useState, useCallback } from 'react';

export function CohortSettings() {
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/org/cohorts', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load cohorts');
      setCohorts(data.cohorts || []);
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
      const res = await fetch('/api/org/cohorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Create failed');
      setNewName('');
      setMsg({ ok: 'Cohort created' });
      load();
    } catch (err) {
      setMsg({ err: err.message });
    } finally {
      setBusy(false);
    }
  };

  const setCurrent = async (cohort) => {
    setMsg(null);
    const res = await fetch('/api/org/cohorts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cohort_id: cohort.id, is_current: true }),
    });
    if (res.ok) {
      setCohorts((prev) => prev.map((c) => ({ ...c, is_current: c.id === cohort.id })));
    } else {
      const d = await res.json().catch(() => ({}));
      setMsg({ err: d?.error || 'Update failed' });
    }
  };

  const archive = async (cohort) => {
    if (!window.confirm(`Archive "${cohort.name}"? This snapshots its track record and graduates members.`))
      return;
    const res = await fetch(`/api/org/cohorts/${cohort.id}/archive`, { method: 'POST' });
    if (res.ok) {
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      setMsg({ err: d?.error || 'Archive failed' });
    }
  };

  const active = cohorts.filter((c) => !c.archived);
  const archived = cohorts.filter((c) => c.archived);

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Cohorts</h2>
        <p className="settings-panel-desc">
          Academic terms for the fund. The current cohort scopes assignments, grading, and the
          leaderboard.
        </p>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Create a cohort</div>
        <form onSubmit={create} className="settings-row">
          <div className="settings-field" style={{ flex: 1 }}>
            <label className="settings-label">Cohort name</label>
            <input
              className="settings-input"
              value={newName}
              placeholder="e.g. Fall 2026"
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
              Add cohort
            </button>
          </div>
        </form>
        {msg?.ok && <span style={{ color: '#10b981', fontSize: '0.8rem' }}>✓ {msg.ok}</span>}
        {msg?.err && <span style={{ color: '#f87171', fontSize: '0.8rem' }}>{msg.err}</span>}
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Active cohorts</div>
        {loading ? (
          <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Loading…</p>
        ) : active.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>No active cohorts.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {active.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: c.is_current
                    ? '1px solid rgba(16,185,129,0.35)'
                    : '1px solid rgba(255,255,255,0.07)',
                  background: c.is_current ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: '#f0f6fc', fontWeight: 600, fontSize: '0.85rem' }}>{c.name}</span>
                  {c.is_current && (
                    <span style={{ color: '#10b981', fontSize: '0.65rem', fontWeight: 700, marginLeft: 8 }}>
                      CURRENT
                    </span>
                  )}
                </div>
                {!c.is_current && (
                  <button
                    type="button"
                    onClick={() => setCurrent(c)}
                    style={pill('#10b981', 'rgba(16,185,129,0.08)', 'rgba(16,185,129,0.25)')}
                  >
                    Set current
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => archive(c)}
                  style={pill('#9ca3af', 'rgba(107,114,128,0.1)', 'rgba(255,255,255,0.12)')}
                >
                  Archive
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {archived.length > 0 && (
        <div className="settings-section">
          <div className="settings-section-title">Archived ({archived.length})</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {archived.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.05)',
                  color: '#6b7280',
                  fontSize: '0.8rem',
                }}
              >
                <i className="bi bi-archive" />
                {c.name}
                <span style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>
                  {c.archived_at ? new Date(c.archived_at).toLocaleDateString() : 'archived'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function pill(fg, bg, border) {
  return {
    cursor: 'pointer',
    fontSize: '0.72rem',
    fontWeight: 600,
    padding: '5px 11px',
    borderRadius: 999,
    color: fg,
    background: bg,
    border: `1px solid ${border}`,
    flexShrink: 0,
  };
}
