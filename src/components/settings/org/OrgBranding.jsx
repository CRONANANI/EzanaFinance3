'use client';

import { useEffect, useState, useCallback } from 'react';

export function OrgBranding() {
  const [b, setB] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/org/branding', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to load');
        if (alive) setB(data.branding);
      } catch (e) {
        if (alive) setMsg({ err: e.message });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/org/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: b.logo_url, accent_color: b.accent_color }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Save failed');
      setMsg({ ok: 'Saved' });
    } catch (e) {
      setMsg({ err: e.message });
    } finally {
      setSaving(false);
    }
  }, [b]);

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">University Co-Branding</h2>
        <p className="settings-panel-desc">
          Your university logo appears alongside Ezana on the org chart header and stakeholder
          reports.
        </p>
      </div>

      {loading || !b ? (
        <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Loading…</p>
      ) : (
        <>
          <div className="settings-section">
            <div className="settings-section-title">Logo</div>
            <div className="settings-row single">
              <div className="settings-field">
                <label className="settings-label">Logo image URL</label>
                <input
                  className="settings-input"
                  value={b.logo_url}
                  placeholder="https://…/logo.png"
                  onChange={(e) => setB((x) => ({ ...x, logo_url: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">Accent color</div>
            <div className="settings-row single">
              <div className="settings-field">
                <label className="settings-label">Hex accent (optional)</label>
                <input
                  className="settings-input"
                  value={b.accent_color}
                  placeholder="#6366f1"
                  onChange={(e) => setB((x) => ({ ...x, accent_color: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">Co-brand preview</div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 18px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              {b.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.logo_url}
                  alt="University logo"
                  style={{ height: 34, width: 'auto', objectFit: 'contain' }}
                />
              ) : (
                <span
                  style={{
                    height: 34,
                    minWidth: 34,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    border: '1px dashed rgba(255,255,255,0.2)',
                    color: '#6b7280',
                    fontSize: '0.6rem',
                    padding: '0 8px',
                  }}
                >
                  LOGO
                </span>
              )}
              <span style={{ color: '#4b5563' }}>×</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f0f6fc' }}>Ezana</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#6b7280' }}>
                {b.orgName}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              className="settings-btn-primary"
              onClick={save}
              disabled={saving}
              style={{ opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving…' : 'Save branding'}
            </button>
            {msg?.ok && <span style={{ color: '#10b981', fontSize: '0.8rem' }}>✓ {msg.ok}</span>}
            {msg?.err && <span style={{ color: '#f87171', fontSize: '0.8rem' }}>{msg.err}</span>}
          </div>
        </>
      )}
    </div>
  );
}
