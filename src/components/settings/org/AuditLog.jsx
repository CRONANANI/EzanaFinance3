'use client';

import { useEffect, useState, useCallback } from 'react';

const PAGE = 50;

function summarize(detail) {
  if (!detail || typeof detail !== 'object') return '';
  return Object.entries(detail)
    .filter(([k]) => !['org_id', 'updated_at'].includes(k))
    .slice(0, 4)
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' · ');
}

export function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [actionTypes, setActionTypes] = useState([]);
  const [action, setAction] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async (act, off) => {
    setLoading(true);
    setErr('');
    try {
      const qs = new URLSearchParams({ limit: String(PAGE), offset: String(off) });
      if (act) qs.set('action', act);
      const res = await fetch(`/api/org/audit-log?${qs}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load');
      setEntries(data.entries || []);
      setActionTypes(data.actionTypes || []);
      setHasMore(!!data.hasMore);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(action, offset);
  }, [load, action, offset]);

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Audit Log</h2>
        <p className="settings-panel-desc">
          Every privileged action in the council — role changes, invites, cohort archival, IPS
          edits, grading, branding, and exports.
        </p>
      </div>

      <div className="settings-section">
        <div className="settings-row single" style={{ marginBottom: '0.75rem' }}>
          <div className="settings-field">
            <label className="settings-label">Filter by action</label>
            <select
              className="settings-input"
              value={action}
              onChange={(e) => {
                setOffset(0);
                setAction(e.target.value);
              }}
            >
              <option value="">All actions</option>
              {actionTypes.map((a) => (
                <option key={a} value={a}>
                  {a.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {err ? (
          <p style={{ color: '#f87171', fontSize: '0.85rem' }}>{err}</p>
        ) : loading ? (
          <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Loading…</p>
        ) : entries.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>No audit entries yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {['TIME', 'ACTOR', 'ACTION', 'TARGET', 'DETAIL'].map((h) => (
                    <th
                      key={h}
                      style={{ textAlign: 'left', padding: '0.5rem', color: '#9ca3af', fontSize: '0.6875rem' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.5rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.5rem', color: '#f0f6fc' }}>{e.actor_name}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: 'rgba(99,102,241,0.12)',
                          color: '#a5b4fc',
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                        }}
                      >
                        {e.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem', color: '#9ca3af' }}>{e.target_type || '—'}</td>
                    <td style={{ padding: '0.5rem', color: '#6b7280', maxWidth: 280 }}>
                      {summarize(e.detail)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button
            type="button"
            className="settings-btn-secondary"
            disabled={offset === 0 || loading}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE))}
            style={{ opacity: offset === 0 ? 0.4 : 1 }}
          >
            ← Newer
          </button>
          <button
            type="button"
            className="settings-btn-secondary"
            disabled={!hasMore || loading}
            onClick={() => setOffset((o) => o + PAGE)}
            style={{ opacity: !hasMore ? 0.4 : 1 }}
          >
            Older →
          </button>
        </div>
      </div>
    </div>
  );
}
