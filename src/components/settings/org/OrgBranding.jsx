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
        <p className="sorg-fg-muted" style={{ fontSize: '0.85rem' }}>
          Loading…
        </p>
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
                  placeholder="e.g. your brand hex"
                  onChange={(e) => setB((x) => ({ ...x, accent_color: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">Co-brand preview</div>
            <div
              className="sorg-row-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 18px',
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
                  className="sorg-logo-ph"
                  style={{
                    height: 34,
                    minWidth: 34,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6rem',
                    padding: '0 8px',
                  }}
                >
                  LOGO
                </span>
              )}
              <span className="sorg-fg-ghost">×</span>
              <span className="sorg-fg-primary" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                Ezana
              </span>
              <span className="sorg-fg-muted" style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>
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
            {msg?.ok && <span className="sorg-msg-ok">✓ {msg.ok}</span>}
            {msg?.err && <span className="sorg-msg-err">{msg.err}</span>}
          </div>
        </>
      )}
    </div>
  );
}
