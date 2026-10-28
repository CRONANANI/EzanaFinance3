'use client';

import { useEffect, useState, useCallback } from 'react';

import { PERMISSION_TIERS } from '@/lib/org-permissions-config';

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
  const EMPTY = {
    email: '',
    role: 'analyst',
    sub_role: '',
    team_id: '',
    cohort_id: '',
    can_invite: false,
  };
  const [form, setForm] = useState(EMPTY);
  // Executives can create links whose acceptor may invite others; delegated
  // inviters cannot pass that on, nor invite executives.
  const [canGrantInvite, setCanGrantInvite] = useState(false);
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
      setCanGrantInvite(iData.canGrantInvite === true);
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
          can_invite: canGrantInvite && form.can_invite,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Invite failed');
      setInvites((prev) => [data.invite, ...prev]);
      setForm(EMPTY);
      setMsg(
        data.emailSent === false
          ? {
              err: "Invite created, but the email couldn't be sent. Copy the link below and share it.",
            }
          : {
              ok: `Invite emailed to ${data.invite?.email || 'the invitee'}. You can also copy the link below.`,
            },
      );
    } catch (err) {
      setMsg({ err: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const revoke = async (id) => {
    setMsg(null);
    try {
      const res = await fetch(`/api/org/invites/${id}`, { method: 'DELETE' });
      // 404: already accepted, revoked or gone. Either way it is no longer pending.
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Could not revoke the invite');
      }
      setInvites((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'revoked' } : i)));
    } catch (err) {
      setMsg({ err: err.message });
    }
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
              <label className="settings-label" htmlFor="invite-email">
                Email
              </label>
              <input
                id="invite-email"
                className="settings-input"
                type="email"
                required
                value={form.email}
                placeholder={emailDomain ? `name@${emailDomain}` : 'name@university.edu'}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="settings-field">
              <label className="settings-label" htmlFor="invite-role">
                Role
              </label>
              <select
                id="invite-role"
                className="settings-input"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value, sub_role: '' }))}
              >
                {ROLES.filter((r) => canGrantInvite || r.v !== 'executive').map((r) => (
                  <option key={r.v} value={r.v}>
                    {r.l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="settings-row">
            <div className="settings-field">
              <label className="settings-label" htmlFor="invite-sub-role">
                Sub-role (optional)
              </label>
              {form.role === 'executive' ? (
                <input
                  id="invite-sub-role"
                  className="settings-input"
                  value={form.sub_role}
                  placeholder="e.g. Faculty Advisor"
                  onChange={(e) => setForm((f) => ({ ...f, sub_role: e.target.value }))}
                />
              ) : (
                <select
                  id="invite-sub-role"
                  className="settings-input"
                  value={form.sub_role}
                  onChange={(e) => setForm((f) => ({ ...f, sub_role: e.target.value }))}
                >
                  <option value="">Default for tier</option>
                  {PERMISSION_TIERS[form.role].sub_roles.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="settings-field">
              <label className="settings-label" htmlFor="invite-team">
                Team (optional)
              </label>
              <select
                id="invite-team"
                className="settings-input"
                value={form.team_id}
                onChange={(e) => setForm((f) => ({ ...f, team_id: e.target.value }))}
              >
                <option value="">None</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="settings-field">
              <label className="settings-label" htmlFor="invite-cohort">
                Cohort (optional)
              </label>
              <select
                id="invite-cohort"
                className="settings-input"
                value={form.cohort_id}
                onChange={(e) => setForm((f) => ({ ...f, cohort_id: e.target.value }))}
              >
                <option value="">None</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {canGrantInvite ? (
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                margin: '4px 0 12px',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={form.can_invite}
                onChange={(e) => setForm((f) => ({ ...f, can_invite: e.target.checked }))}
                style={{ marginTop: 2 }}
              />
              <span>
                <strong>Can invite other members.</strong> Whoever accepts this link can create
                their own invite links (not for executives, and they cannot pass this right on).
              </span>
            </label>
          ) : null}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <button
              type="submit"
              className="settings-btn-primary"
              disabled={submitting}
              style={{ opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Creating…' : 'Create invite'}
            </button>
            {msg?.ok && <span className="sorg-msg-ok">✓ {msg.ok}</span>}
            {msg?.err && <span className="sorg-msg-err">{msg.err}</span>}
          </div>
        </form>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Pending invites ({pending.length})</div>
        {loading ? (
          <p className="sorg-fg-muted" style={{ fontSize: '0.85rem' }}>
            Loading…
          </p>
        ) : pending.length === 0 ? (
          <p className="sorg-fg-muted" style={{ fontSize: '0.85rem' }}>
            No pending invites.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {pending.map((i) => (
              <div
                key={i.id}
                className="sorg-row-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="sorg-fg-primary" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    {i.email}
                  </div>
                  <div
                    className="sorg-fg-muted"
                    style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}
                  >
                    {i.role.replace('_', ' ')}
                    {i.sub_role ? ` · ${i.sub_role}` : ''}
                    {i.can_invite ? ' · can invite others' : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copy(i.token)}
                  className="sorg-pill sorg-pill--emerald"
                >
                  {copied === i.token ? 'Copied!' : 'Copy link'}
                </button>
                <button
                  type="button"
                  onClick={() => revoke(i.id)}
                  className="sorg-pill sorg-pill--danger"
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
