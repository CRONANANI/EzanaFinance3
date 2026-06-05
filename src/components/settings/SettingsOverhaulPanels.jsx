'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ManageBillingButton } from '@/components/ManageBillingButton';
import { PLANS } from '@/lib/pricing-plans';
import { API_ENDPOINTS } from '@/lib/api-endpoint-catalog';
import { AddPaymentMethodModal } from './AddPaymentMethodModal';
import { MfaSetupPanel } from './MfaSetupPanel';

function passwordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', pct: 0 };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const pcts = [0, 20, 40, 60, 80, 100];
  return { score, label: labels[score], pct: pcts[score] };
}

function formatLastActive(iso) {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

function formatLocation(s) {
  const parts = [s.city, s.region, s.country].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Unknown';
}

function formatBrand(b) {
  if (!b) return 'Card';
  return b.charAt(0).toUpperCase() + b.slice(1);
}

export function PasswordPanel({ onSave, settings, updateSetting }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const strength = passwordStrength(newPassword);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/sessions/list', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setSessions(Array.isArray(data?.sessions) ? data.sessions : []);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePasswordChange() {
    setPwError('');
    setPwSuccess(false);
    if (!currentPassword || !newPassword) {
      setPwError('Both current and new password required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New password and confirmation do not match.');
      return;
    }
    if (strength.pct < 40) {
      setPwError('Password is too weak. Use 8+ chars with a mix of cases, numbers, and symbols.');
      return;
    }
    setPwSaving(true);
    try {
      const { supabase } = await import('@/lib/supabase-browser');
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthErr) {
        setPwError('Current password is incorrect.');
        setPwSaving(false);
        return;
      }
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) {
        setPwError(updateErr.message || 'Failed to update password.');
        setPwSaving(false);
        return;
      }
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSave?.();
    } catch (err) {
      setPwError(err.message || 'Unexpected error.');
    } finally {
      setPwSaving(false);
    }
  }

  async function handleRevoke(sessionId) {
    if (!sessionId) return;
    if (!confirm('Revoke this session? The device will be signed out.')) return;
    try {
      const res = await fetch('/api/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.auth_session_id !== sessionId));
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Password &amp; Security</h2>
        <p className="settings-panel-desc">Manage your password and security settings.</p>
      </div>
      <div className="settings-section">
        <h3 className="settings-section-title">
          <i className="bi bi-key" />
          Change password
        </h3>
        <div className="settings-row single">
          <div className="settings-field">
            <label className="settings-label">Current password</label>
            <input
              type="password"
              className="settings-input"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">New password</label>
            <input
              type="password"
              className="settings-input"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            {newPassword && (
              <div className="settings-password-strength">
                <div className="settings-strength-bar">
                  <div
                    className="settings-strength-fill"
                    style={{
                      width: `${strength.pct}%`,
                      background:
                        strength.pct < 40 ? '#ef4444' : strength.pct < 70 ? '#f59e0b' : '#10b981',
                    }}
                  />
                </div>
                <span className="settings-strength-label">{strength.label}</span>
              </div>
            )}
          </div>
          <div className="settings-field">
            <label className="settings-label">Confirm new password</label>
            <input
              type="password"
              className="settings-input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        {pwError && (
          <div className="settings-alert settings-alert--error" role="alert">
            {pwError}
          </div>
        )}
        {pwSuccess && (
          <div className="settings-alert settings-alert--success" role="status">
            Password updated successfully.
          </div>
        )}
        <div className="settings-btn-row">
          <button
            type="button"
            className="settings-btn-primary"
            onClick={handlePasswordChange}
            disabled={pwSaving}
          >
            {pwSaving ? 'Updating…' : 'Update password'}
          </button>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <MfaSetupPanel />
        </div>
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <span className="settings-toggle-label">Login alerts</span>
            <span className="settings-toggle-desc">Email when a new device signs in</span>
          </div>
          <button
            type="button"
            className={`settings-switch ${settings?.security_login_alerts ? 'on' : ''}`}
            onClick={() => updateSetting('security_login_alerts', !settings?.security_login_alerts)}
            aria-label="Toggle login alerts"
          />
        </div>

        <h3 className="settings-section-title">
          <i className="bi bi-laptop" />
          Active sessions
        </h3>
        {sessionsLoading ? (
          <p className="settings-loading">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <p className="settings-empty">
            No active sessions tracked yet. Sign out and back in to populate this list.
          </p>
        ) : (
          <table className="settings-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Location</th>
                <th>Last active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.browser || 'Unknown browser'} on {s.os || 'unknown OS'}
                  </td>
                  <td>{formatLocation(s)}</td>
                  <td>{formatLastActive(s.last_seen_at)}</td>
                  <td>
                    <button
                      type="button"
                      className="settings-btn-danger"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                      onClick={() => handleRevoke(s.auth_session_id)}
                      disabled={!s.auth_session_id}
                      title={
                        !s.auth_session_id
                          ? 'This session predates the session-tracking system'
                          : ''
                      }
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function FamilyPanel({ onSave }) {
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function load() {
    try {
      const res = await fetch('/api/family/group', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setGroupData(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleInvite() {
    if (!inviteEmail) {
      setMessage({ kind: 'error', text: 'Email required' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/family/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ kind: 'error', text: data?.error || 'Failed to send invite.' });
      } else {
        setMessage({
          kind: 'success',
          text: data.switchedToFamily
            ? `Invite sent. You're now on the Family plan — your subscription will update on your next billing cycle.`
            : `Invite sent to ${inviteEmail}.`,
        });
        setInviteEmail('');
        load();
      }
    } catch (err) {
      setMessage({ kind: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(memberId, memberEmail) {
    if (!confirm(`Remove ${memberEmail} from your family group?`)) return;
    try {
      const res = await fetch(`/api/family/member?id=${encodeURIComponent(memberId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) load();
    } catch {
      /* ignore */
    }
  }

  async function toggleShare(field, value) {
    try {
      await fetch('/api/family/group', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [field]: value }),
      });
      load();
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <div className="settings-panel">
        <div className="settings-panel-header">
          <h2 className="settings-panel-title">Family</h2>
        </div>
        <p className="settings-loading">Loading family group…</p>
      </div>
    );
  }

  const isOwner = groupData?.role === 'owner';
  const group = groupData?.group;
  const members = groupData?.members || [];

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Family</h2>
        <p className="settings-panel-desc">
          {isOwner
            ? 'Manage your Family plan members and shared content.'
            : group
              ? `You're a member of the ${group.name || 'Family'} plan.`
              : 'Invite family members to start a Family plan (up to 5 additional users).'}
        </p>
      </div>
      <div className="settings-section">
        {isOwner && (
          <div className="settings-info-card">
            <strong>Member slots:</strong> {groupData.slotsUsed} of {groupData.slotsTotal} used
          </div>
        )}

        {message && (
          <div className={`settings-alert settings-alert--${message.kind}`} role="alert">
            {message.text}
          </div>
        )}

        {isOwner && (
          <>
            <h3 className="settings-section-title">
              <i className="bi bi-people" />
              Family members
            </h3>
            {members.length === 0 ? (
              <p className="settings-empty">No members yet. Invite someone below to get started.</p>
            ) : (
              <table className="settings-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Role</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td>{m.email}</td>
                      <td>{m.accepted_at ? 'Active' : 'Pending'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{m.role}</td>
                      <td>
                        <button
                          type="button"
                          className="settings-btn-danger"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                          onClick={() => handleRemove(m.id, m.email)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h3 className="settings-section-title">
              <i className="bi bi-person-plus" />
              Invite member
            </h3>
            <div className="settings-row">
              <div className="settings-field">
                <label className="settings-label">Email</label>
                <input
                  type="email"
                  className="settings-input"
                  placeholder="family@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="settings-field">
                <label className="settings-label">Role</label>
                <select
                  className="settings-input"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
            </div>

            <h3 className="settings-section-title">
              <i className="bi bi-share" />
              Sharing
            </h3>
            <div className="settings-toggle-row">
              <div className="settings-toggle-info">
                <span className="settings-toggle-label">Share watchlists</span>
                <span className="settings-toggle-desc">
                  Family members can view your watchlists
                </span>
              </div>
              <button
                type="button"
                className={`settings-switch ${group?.share_watchlists ? 'on' : ''}`}
                onClick={() => toggleShare('share_watchlists', !group?.share_watchlists)}
                aria-label="Toggle share watchlists"
              />
            </div>
            <div className="settings-toggle-row">
              <div className="settings-toggle-info">
                <span className="settings-toggle-label">Share portfolio</span>
                <span className="settings-toggle-desc">Family members can view your holdings</span>
              </div>
              <button
                type="button"
                className={`settings-switch ${group?.share_portfolio ? 'on' : ''}`}
                onClick={() => toggleShare('share_portfolio', !group?.share_portfolio)}
                aria-label="Toggle share portfolio"
              />
            </div>
            <div className="settings-toggle-row">
              <div className="settings-toggle-info">
                <span className="settings-toggle-label">Share backtests</span>
                <span className="settings-toggle-desc">
                  Family members can view your backtest results
                </span>
              </div>
              <button
                type="button"
                className={`settings-switch ${group?.share_backtests ? 'on' : ''}`}
                onClick={() => toggleShare('share_backtests', !group?.share_backtests)}
                aria-label="Toggle share backtests"
              />
            </div>

            <div className="settings-btn-row">
              <button
                type="button"
                className="settings-btn-primary"
                onClick={handleInvite}
                disabled={busy}
              >
                {busy ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </>
        )}

        {!isOwner && !group && (
          <>
            <h3 className="settings-section-title">
              <i className="bi bi-person-plus" />
              Start a family plan
            </h3>
            <p className="settings-help-text">
              Invite your first family member below. You&apos;ll automatically become the admin of
              your Family plan, and your subscription will switch to the $49/month Family tier on
              your next billing cycle (up to 5 additional users).
            </p>
            <div className="settings-row">
              <div className="settings-field">
                <label className="settings-label">Email</label>
                <input
                  type="email"
                  className="settings-input"
                  placeholder="family@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="settings-field">
                <label className="settings-label">Role</label>
                <select
                  className="settings-input"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
            </div>
            <div className="settings-btn-row">
              <button
                type="button"
                className="settings-btn-primary"
                onClick={handleInvite}
                disabled={busy}
              >
                {busy ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function PlanPanel({ onSave }) {
  const [profile, setProfile] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [apiQuotaDraft, setApiQuotaDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/user/profile', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setProfile(data?.profile || data);
        setApiQuotaDraft(data?.profile?.api_quota_monthly ?? data?.api_quota_monthly ?? 0);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentPlanKey = profile?.subscription_plan || 'individual';
  const currentPlan = PLANS.find((p) => p.key === currentPlanKey) || PLANS[0];

  async function saveApiQuota() {
    setSaving(true);
    try {
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ api_quota_monthly: apiQuotaDraft }),
      });
      onSave?.();
    } finally {
      setSaving(false);
    }
  }

  const apiCalls = profile?.api_calls_this_month ?? 0;
  const apiQuota = currentPlan.apiQuota || 0;
  const apiUsedPct = apiQuota ? Math.min(100, (apiCalls / apiQuota) * 100) : 0;

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Plan</h2>
        <p className="settings-panel-desc">Manage your subscription and API quota.</p>
      </div>
      <div className="settings-section">
        <div className="settings-info-card">
          <span className="settings-badge green">Current plan</span>
          <strong style={{ marginLeft: '0.5rem' }}>{currentPlan.name}</strong>
          <span style={{ marginLeft: '0.5rem', color: 'var(--muted-foreground, #6b7280)' }}>
            · ${currentPlan.monthly}/mo
          </span>
        </div>

        {apiQuota > 0 && (
          <>
            <h3 className="settings-section-title">
              <i className="bi bi-pie-chart" />
              API usage
            </h3>
            <div className="settings-field">
              <span className="settings-label">API calls this month</span>
              <div className="settings-usage-bar">
                <div className="settings-usage-fill" style={{ width: `${apiUsedPct}%` }} />
              </div>
              <div className="settings-usage-text">
                <span>{apiCalls.toLocaleString()}</span>
                <span>{apiQuota.toLocaleString()} limit</span>
              </div>
            </div>

            {currentPlan.apiCustomizable && (
              <div className="settings-field" style={{ marginTop: '1.5rem' }}>
                <label className="settings-label">
                  Adjust API quota (up to {currentPlan.apiMax.toLocaleString()}/mo)
                </label>
                <input
                  type="range"
                  min={currentPlan.apiQuota}
                  max={currentPlan.apiMax}
                  step={1000}
                  value={apiQuotaDraft ?? currentPlan.apiQuota}
                  onChange={(e) => setApiQuotaDraft(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div className="settings-usage-text">
                  <span>{currentPlan.apiQuota.toLocaleString()}</span>
                  <span>{(apiQuotaDraft ?? currentPlan.apiQuota).toLocaleString()}</span>
                  <span>{currentPlan.apiMax.toLocaleString()}</span>
                </div>
                <button
                  type="button"
                  className="settings-btn-secondary"
                  style={{ marginTop: '0.5rem' }}
                  onClick={saveApiQuota}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save quota'}
                </button>
              </div>
            )}
          </>
        )}

        <h3 className="settings-section-title">
          <i className="bi bi-tag" />
          All plans
        </h3>
        <div className="settings-billing-toggle">
          <button
            type="button"
            className={`settings-billing-toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`settings-billing-toggle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly (save 20%)
          </button>
        </div>

        <div className="settings-plan-cards">
          {PLANS.map((p) => (
            <div
              key={p.key}
              className={`settings-plan-card ${p.key === currentPlanKey ? 'current' : ''} ${p.badge ? 'popular' : ''}`}
            >
              {p.badge && <span className="settings-plan-badge">{p.badge}</span>}
              <div className="settings-plan-name">{p.name}</div>
              <div className="settings-plan-tagline">{p.tagline}</div>
              <div className="settings-plan-price">
                ${billingCycle === 'yearly' ? p.yearly : p.monthly}
                <span>/month</span>
              </div>
              {billingCycle === 'yearly' && (
                <div className="settings-plan-annual">${p.yearlyTotal}/year</div>
              )}
              <ul className="settings-plan-features">
                {p.features.map((f, i) => (
                  <li key={i} className="settings-plan-feature">
                    <i className="bi bi-check" />
                    {f}
                  </li>
                ))}
              </ul>
              {p.key === currentPlanKey ? (
                <button type="button" className="settings-btn-secondary" disabled>
                  Current plan
                </button>
              ) : (
                <Link
                  href={`/subscribe?plan=${p.key}&cycle=${billingCycle}`}
                  className="settings-btn-primary"
                  style={{
                    display: 'inline-flex',
                    justifyContent: 'center',
                    textDecoration: 'none',
                  }}
                >
                  Switch to {p.name}
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="settings-btn-row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <ManageBillingButton className="settings-btn-secondary" label="Manage subscription" />
        </div>
      </div>
    </div>
  );
}

export function BillingPanel({ onSave }) {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  async function loadMethods() {
    try {
      const res = await fetch('/api/billing/payment-methods', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setMethods(Array.isArray(data?.methods) ? data.methods : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMethods();
  }, []);

  async function setPrimary(id) {
    await fetch('/api/billing/payment-methods', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ methodId: id }),
    });
    loadMethods();
  }

  async function detach(id) {
    if (!confirm('Remove this card?')) return;
    await fetch(`/api/billing/payment-methods?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    loadMethods();
  }

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">Billing</h2>
        <p className="settings-panel-desc">Payment methods and billing history.</p>
      </div>
      <div className="settings-section">
        <h3 className="settings-section-title">
          <i className="bi bi-credit-card" />
          Payment methods
        </h3>
        {loading ? (
          <p className="settings-loading">Loading payment methods…</p>
        ) : methods.length === 0 ? (
          <p className="settings-empty">No payment methods on file yet.</p>
        ) : (
          <table className="settings-table">
            <thead>
              <tr>
                <th>Card</th>
                <th>Expires</th>
                <th>Primary</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {methods.map((m) => (
                <tr key={m.id}>
                  <td>
                    {formatBrand(m.brand)} •••• {m.last4}
                  </td>
                  <td>
                    {String(m.exp_month).padStart(2, '0')}/{String(m.exp_year).slice(-2)}
                  </td>
                  <td>
                    {m.is_primary ? (
                      <span className="settings-badge green">Primary</span>
                    ) : (
                      <button
                        type="button"
                        className="settings-btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
                        onClick={() => setPrimary(m.id)}
                      >
                        Set primary
                      </button>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="settings-btn-danger"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                      onClick={() => detach(m.id)}
                      disabled={m.is_primary && methods.length > 1}
                      title={
                        m.is_primary && methods.length > 1
                          ? 'Promote another card to primary before removing'
                          : ''
                      }
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="settings-btn-row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" className="settings-btn-primary" onClick={() => setAddOpen(true)}>
            <i className="bi bi-plus" /> Add payment method
          </button>
          <ManageBillingButton className="settings-btn-secondary" label="Open Stripe portal" />
        </div>

        <h3 className="settings-section-title">
          <i className="bi bi-receipt" />
          Billing history
        </h3>
        <p className="settings-help-text">
          View your full billing history (invoices, refunds, receipts) in the Stripe billing portal
          via the button above.
        </p>
      </div>

      <AddPaymentMethodModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={loadMethods}
      />
    </div>
  );
}

export function ApiPanel({ onSave }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState(null);
  const [creating, setCreating] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [savingWebhook, setSavingWebhook] = useState(false);

  async function loadKeys() {
    try {
      const res = await fetch('/api/user/api-keys', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setKeys(Array.isArray(data?.keys) ? data.keys : []);
    } finally {
      setLoading(false);
    }
  }

  async function loadProfile() {
    try {
      const res = await fetch('/api/user/profile', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const wb = data?.profile?.webhook_url ?? data?.webhook_url ?? '';
      setWebhookUrl(wb || '');
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadKeys();
    loadProfile();
  }, []);

  async function createKey() {
    setCreating(true);
    setNewKey(null);
    try {
      const res = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: 'Default key' }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewKey(data.key);
        loadKeys();
      } else {
        alert(data?.error || 'Failed to create key');
      }
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id) {
    if (!confirm('Revoke this API key? Any application using it will lose access.')) return;
    await fetch(`/api/user/api-keys?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    loadKeys();
  }

  async function saveWebhook() {
    setSavingWebhook(true);
    try {
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ webhook_url: webhookUrl }),
      });
      onSave?.();
    } finally {
      setSavingWebhook(false);
    }
  }

  const endpointsByCategory = useMemo(() => {
    const groups = {};
    for (const e of API_ENDPOINTS) {
      if (!groups[e.category]) groups[e.category] = [];
      groups[e.category].push(e);
    }
    return groups;
  }, []);

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <h2 className="settings-panel-title">API</h2>
        <p className="settings-panel-desc">Your API keys, endpoints, and webhook configuration.</p>
      </div>
      <div className="settings-section">
        <h3 className="settings-section-title">
          <i className="bi bi-key" />
          API keys
        </h3>

        {newKey && (
          <div className="settings-alert settings-alert--success">
            <strong>Save this key — it will not be shown again:</strong>
            <code
              style={{
                display: 'block',
                marginTop: 4,
                padding: 6,
                background: '#0a0e13',
                color: '#10b981',
                borderRadius: 4,
                wordBreak: 'break-all',
              }}
            >
              {newKey}
            </code>
            <button
              type="button"
              className="settings-btn-secondary"
              style={{ marginTop: 8, padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
              onClick={() => navigator.clipboard.writeText(newKey)}
            >
              Copy
            </button>
          </div>
        )}

        {loading ? (
          <p className="settings-loading">Loading keys…</p>
        ) : keys.length === 0 ? (
          <p className="settings-empty">No API keys yet.</p>
        ) : (
          <table className="settings-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key</th>
                <th>Last used</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td>{k.name}</td>
                  <td>
                    <code>{k.key_prefix}…</code>
                  </td>
                  <td>
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="settings-btn-danger"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                      onClick={() => revokeKey(k.id)}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="settings-btn-row">
          <button
            type="button"
            className="settings-btn-primary"
            onClick={createKey}
            disabled={creating}
          >
            <i className="bi bi-plus" /> {creating ? 'Generating…' : 'Generate new key'}
          </button>
        </div>

        <h3 className="settings-section-title">
          <i className="bi bi-link" />
          Available endpoints
        </h3>
        {Object.entries(endpointsByCategory).map(([category, endpoints]) => (
          <div key={category} style={{ marginBottom: '1rem' }}>
            <div className="settings-endpoint-category">{category}</div>
            <table className="settings-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Method</th>
                  <th>Endpoint</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((e, i) => (
                  <tr key={i}>
                    <td>
                      <span
                        className={`settings-api-method settings-api-method--${e.method.toLowerCase()}`}
                      >
                        {e.method}
                      </span>
                    </td>
                    <td>
                      <code>{e.path}</code>
                    </td>
                    <td>
                      {e.desc}
                      {e.plan ? ` · ${e.plan.replace('_', ' ')}+` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <h3 className="settings-section-title">
          <i className="bi bi-broadcast" />
          Webhook
        </h3>
        <div className="settings-row single">
          <div className="settings-field">
            <label className="settings-label">Webhook URL</label>
            <input
              type="url"
              className="settings-input"
              placeholder="https://your-server.com/webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <p className="settings-help-text">
              We&apos;ll POST events to this URL when your watchlist tickers move, congressional
              trades hit your holdings, or backtests complete.
            </p>
          </div>
        </div>
        <div className="settings-btn-row">
          <button
            type="button"
            className="settings-btn-primary"
            onClick={saveWebhook}
            disabled={savingWebhook}
          >
            {savingWebhook ? 'Saving…' : 'Save webhook'}
          </button>
        </div>
      </div>
    </div>
  );
}
