'use client';

import { useEffect, useState, useCallback } from 'react';

const ROLES = [
  { v: 'analyst', l: 'Analyst' },
  { v: 'portfolio_manager', l: 'Portfolio Manager' },
  { v: 'executive', l: 'Executive' },
];

export function InviteOnboarding() {
  const [invites, setInvites] = useState([]);
  const [teams, setTeams] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [emailDomain, setEmailDomain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', role: 'analyst', sub_role: '', team_id: '', cohort_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);
  const [copied, setCopied] = useState(null);

  const load = useCallback(async () => {
    try {
      const [iRes, mRes, cRes] = await Promise.all([
        fetch('/api/org/invites', { cache: 'no-store' }),
        fetch('/api/org/members', { cache: 'no-store' }),
        fetch('/api/org/cohorts', { cache: 'no-store' }),
      ]);
      const iData = await iRes.json().catch(() => ({}));
      if (!iRes.ok) throw new Error(iData?.error || 'Failed to load invites');
      const mData = await mRes.json().catch(() => ({}));
      const cData = await cRes.json().catch(() => ({}));
      setInvites(iData.invites || []);
      setEmailDomain(iData.emailDomain || null);
      setTeams(mData.teams || []);
      setCohorts((cData.cohorts || []).filter((c) => !c.archived));
    } catch (e) {
      setMsg({ err: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch('/api/org/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          role: form.role,
          sub_role: form.sub_role || null,
          team_id: form.team_id || null,
          cohort_id: form.cohort_id || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Invite failed');
      setInvites((prev) => [data.invite, ...prev]);
      setForm({ email: '', role: 'analyst', sub_role: '', team_id: '', cohort_id: '' });
      setMsg({ ok: 'Invite created' });
    } catch (err) {
      setMsg({ err: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const revoke = async (id) => {
    setInvites((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'revoked' } : i)));
    await fetch(`/api/org/invites/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  const inviteLink = (token) =>
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/org-login?invite=${token}`
      : `/auth/org-login?invite=${token}`;

  const copy = (token) => {
    try {
      navigator.clipboard.writeText(inviteLink(token));
      setCopied(token);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };

  const pending = invites.filter((i) => i.status === 'pending');

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Invite &amp; Onboarding</h2>
        <p className="settings-panel-desc">
          Invite members to the council.{' '}
          {emailDomain ? (
            <>
              Emails must end in <strong>@{emailDomain}</strong>.
            </>
          ) : (
            'No email-domain restriction set for this organization.'
          )}
        </p>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">New invite</div>
        <form onSubmit={submit}>
          <div className="settings-row">
            <div className="settings-field">
              <label className="settings-label">Email</label>
              <input
                className="settings-input"
                type="email"
                required
                value={form.email}
                placeholder={emailDomain ? `name@${emailDomain}` : 'name@university.edu'}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="settings-field">
              <label className="settings-label">Role</label>
              <select
                className="settings-input"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                {ROLES.map((r) => (
                  <option key={r.v} value={r.v}>
                    {r.l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="settings-row">
            <div className="settings-field">
              <label className="settings-label">Sub-role (optional)</label>
              <input
                className="settings-input"
                value={form.sub_role}
                placeholder="e.g. Faculty Advisor"
                onChange={(e) => setForm((f) => ({ ...f, sub_role: e.target.value }))}
              />
            </div>
            <div className="settings-field">
              <label className="settings-label">Team (optional)</label>
              <select
                className="settings-input"
                value={form.team_id}
                onChange={(e) => setForm((f) => ({ ...f, team_id: e.target.value }))}
              >
                <option value="">— None</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-field">
              <label className="settings-label">Cohort (optional)</label>
              <select
                className="settings-input"
                value={form.cohort_id}
                onChange={(e) => setForm((f) => ({ ...f, cohort_id: e.target.value }))}
              >
                <option value="">— None</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <button
              type="submit"
              className="settings-btn-primary"
              disabled={submitting}
              style={{ opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Creating…' : 'Create invite'}
            </button>
            {msg?.ok && <span style={{ color: '#10b981', fontSize: '0.8rem' }}>✓ {msg.ok}</span>}
            {msg?.err && <span style={{ color: '#f87171', fontSize: '0.8rem' }}>{msg.err}</span>}
          </div>
        </form>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Pending invites ({pending.length})</div>
        {loading ? (
          <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Loading…</p>
        ) : pending.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>No pending invites.</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {pending.map((i) => (
              <div
                key={i.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: '#f0f6fc', fontWeight: 600, fontSize: '0.85rem' }}>{i.email}</div>
                  <div style={{ color: '#6b7280', fontSize: '0.7rem', textTransform: 'capitalize' }}>
                    {i.role.replace('_', ' ')}
                    {i.sub_role ? ` · ${i.sub_role}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copy(i.token)}
                  style={pillBtn('#818cf8', 'rgba(99,102,241,0.1)', 'rgba(99,102,241,0.3)')}
                >
                  {copied === i.token ? 'Copied!' : 'Copy link'}
                </button>
                <button
                  type="button"
                  onClick={() => revoke(i.id)}
                  style={pillBtn('#f87171', 'rgba(239,68,68,0.08)', 'rgba(239,68,68,0.25)')}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function pillBtn(fg, bg, border) {
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
