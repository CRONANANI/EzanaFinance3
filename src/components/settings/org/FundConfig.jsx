'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

const TERM_TYPES = [
  { v: 'semester', l: 'Semester' },
  { v: 'quarter', l: 'Quarter' },
  { v: 'year', l: 'Academic year' },
];

export function FundConfig() {
  const [cfg, setCfg] = useState(null);
  const [orgName, setOrgName] = useState('Organization');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/org/fund-config', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to load');
        if (!alive) return;
        setCfg(data.config);
        setOrgName(data.orgName || 'Organization');
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

  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));

  const save = useCallback(async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/org/fund-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Save failed');
      setCfg(data.config);
      setMsg({ ok: 'Saved' });
    } catch (e) {
      setMsg({ err: e.message });
    } finally {
      setSaving(false);
    }
  }, [cfg]);

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Fund Configuration</h2>
        <p className="settings-panel-desc">
          {orgName} — how the fund is named and benchmarked, and the academic term it runs on.
        </p>
      </div>

      {loading || !cfg ? (
        <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Loading…</p>
      ) : (
        <>
          <div className="settings-section">
            <div className="settings-section-title">Identity & benchmark</div>
            <div className="settings-row">
              <div className="settings-field">
                <label className="settings-label">Fund display name</label>
                <input
                  className="settings-input"
                  value={cfg.fund_display_name}
                  placeholder={`${orgName} Fund`}
                  onChange={(e) => set('fund_display_name', e.target.value)}
                />
              </div>
              <div className="settings-field">
                <label className="settings-label">Benchmark symbol</label>
                <input
                  className="settings-input"
                  value={cfg.benchmark_symbol}
                  placeholder="SPY"
                  onChange={(e) => set('benchmark_symbol', e.target.value.toUpperCase())}
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">Academic term</div>
            <div className="settings-row">
              <div className="settings-field">
                <label className="settings-label">Term type</label>
                <select
                  className="settings-input"
                  value={cfg.term_type}
                  onChange={(e) => set('term_type', e.target.value)}
                >
                  {TERM_TYPES.map((t) => (
                    <option key={t.v} value={t.v}>
                      {t.l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="settings-field">
                <label className="settings-label">Term start</label>
                <input
                  type="date"
                  className="settings-input"
                  value={cfg.term_start || ''}
                  onChange={(e) => set('term_start', e.target.value)}
                />
              </div>
              <div className="settings-field">
                <label className="settings-label">Term end</label>
                <input
                  type="date"
                  className="settings-input"
                  value={cfg.term_end || ''}
                  onChange={(e) => set('term_end', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">Investment policy</div>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
              The IPS defines the fund&apos;s mandate, constraints, and compliance rules.
            </p>
            <Link
              href="/org-team-hub/compliance"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#c7d2fe',
                textDecoration: 'none',
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid rgba(99,102,241,0.3)',
                background: 'rgba(99,102,241,0.08)',
              }}
            >
              <i className="bi bi-file-earmark-ruled" /> Open Investment Policy editor
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              className="settings-btn-primary"
              onClick={save}
              disabled={saving}
              style={{ opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving…' : 'Save fund configuration'}
            </button>
            {msg?.ok && <span style={{ color: '#10b981', fontSize: '0.8rem' }}>✓ {msg.ok}</span>}
            {msg?.err && <span style={{ color: '#f87171', fontSize: '0.8rem' }}>{msg.err}</span>}
          </div>
        </>
      )}
    </div>
  );
}
