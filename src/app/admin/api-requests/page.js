'use client';

/**
 * /admin/api-requests: review Ezana API access requests and the keys issued.
 * Approve (tier, scopes, rate limit for Institution, optional expiry) creates
 * a pending key and emails a one-time claim link; Decline records a note.
 * Shown only to admins; the /api/admin routes are the real gate.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { isAdminUserClient } from '@/lib/admin-helpers-client';
import { supabase } from '@/lib/supabase-browser';
import { TIERS, TIER_ORDER, tierForRole } from '@/lib/ezana-api/tiers';
import './api-requests-admin.css';

const TABS = ['pending', 'approved', 'declined', 'all'];

async function headers() {
  const { data } = await supabase.auth.getSession();
  const t = data?.session?.access_token;
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

const fmt = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

function ApproveForm({ req, onDone }) {
  const [tier, setTier] = useState(tierForRole(req.role));
  const allowed = TIERS[tier].scopes;
  const asked = (req.datasets || []).filter((d) => allowed.includes(d));
  const [scopes, setScopes] = useState(asked.length ? asked : allowed);
  const [rate, setRate] = useState(3000);
  const [expires, setExpires] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const a = (req.datasets || []).filter((d) => TIERS[tier].scopes.includes(d));
    setScopes(a.length ? a : TIERS[tier].scopes);
  }, [tier, req.datasets]);

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/api-requests/${req.id}`, {
      method: 'POST',
      headers: await headers(),
      body: JSON.stringify({
        action: 'approve',
        tier,
        scopes,
        rateLimitPerMin: tier === 'institution' ? Number(rate) : undefined,
        expiresAt: expires || undefined,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !d.ok) {
      setMsg({ error: d.error || 'Could not approve.' });
      return;
    }
    setMsg(
      d.emailed
        ? { ok: 'Approved. The claim link was emailed.' }
        : {
            ok: 'Approved. Email is not configured; send this claim link yourself (shown once):',
            link: d.claimUrl,
          },
    );
    onDone?.();
  };

  return (
    <div className="aar-form">
      <label>
        Tier
        <select value={tier} onChange={(e) => setTier(e.target.value)}>
          {TIER_ORDER.map((t) => (
            <option key={t} value={t}>
              {TIERS[t].name}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Scopes</legend>
        {allowed.map((s) => (
          <label key={s} className="aar-check">
            <input
              type="checkbox"
              checked={scopes.includes(s)}
              onChange={(e) =>
                setScopes((cur) => (e.target.checked ? [...cur, s] : cur.filter((x) => x !== s)))
              }
            />
            {s}
          </label>
        ))}
      </fieldset>
      {tier === 'institution' ? (
        <label>
          Rate limit per minute
          <input
            type="number"
            min={1}
            max={100000}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </label>
      ) : (
        <p className="aar-meta">
          {TIERS[tier].ratePerMin} requests per minute,{' '}
          {TIERS[tier].delayDays ? `${TIERS[tier].delayDays}-day delay` : 'no delay'}
        </p>
      )}
      <label>
        Expires (optional)
        <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
      </label>
      <button
        type="button"
        className="aar-primary"
        disabled={busy || !scopes.length}
        onClick={submit}
      >
        {busy ? 'Approving' : 'Approve and send claim link'}
      </button>
      {msg?.error ? <p className="aar-error">{msg.error}</p> : null}
      {msg?.ok ? (
        <p className="aar-ok">
          {msg.ok}
          {msg.link ? <code className="aar-link">{msg.link}</code> : null}
        </p>
      ) : null}
    </div>
  );
}

export default function ApiRequestsAdminPage() {
  const { user, loading } = useAuth() || {};
  const allowed = isAdminUserClient(user);
  const [tab, setTab] = useState('pending');
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/admin/api-requests?status=${tab}`, { headers: await headers() });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.ok) {
      setError(d.error || 'Could not load.');
      return;
    }
    setData(d);
  }, [tab]);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  const decline = async (req) => {
    const note = window.prompt('Note for the record (optional)') ?? null;
    if (note === null) return;
    const notify = window.confirm('Email the requester that the request was declined?');
    await fetch(`/api/admin/api-requests/${req.id}`, {
      method: 'POST',
      headers: await headers(),
      body: JSON.stringify({ action: 'decline', note, notify }),
    });
    load();
  };

  const revoke = async (key) => {
    if (!window.confirm(`Revoke ${key.name}? Requests with it fail immediately.`)) return;
    await fetch(`/api/admin/api-keys/${key.id}/revoke`, {
      method: 'POST',
      headers: await headers(),
    });
    load();
  };

  if (loading) return <main className="aar-page">Loading</main>;
  if (!allowed) return <main className="aar-page">Admins only.</main>;

  return (
    <main id="main-content" className="aar-page">
      <h1 className="aar-title">API access requests</h1>
      <div className="aar-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? 'is-on' : ''}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {error ? <p className="aar-error">{error}</p> : null}
      {data && !data.requests.length ? <p className="aar-meta">No requests.</p> : null}
      <ul className="aar-list">
        {(data?.requests || []).map((r) => (
          <li key={r.id} className="aar-item">
            <div className="aar-head">
              <strong>{r.name}</strong>
              <span className="aar-meta">
                {r.email}
                {r.company ? ` · ${r.company}` : ''} · {r.role || 'role not given'} ·{' '}
                {fmt(r.created_at)}
              </span>
              <span className="aar-status">{r.status || 'pending'}</span>
            </div>
            <p className="aar-use">{r.use_case}</p>
            <p className="aar-meta">
              Datasets: {(r.datasets || []).join(', ') || 'none'} · Volume:{' '}
              {r.volume || 'not given'}
              {r.reviewed_by ? ` · reviewed by ${r.reviewed_by} ${fmt(r.reviewed_at)}` : ''}
              {r.review_note ? ` · note: ${r.review_note}` : ''}
            </p>
            {!r.status || r.status === 'pending' || r.status === 'new' ? (
              <div className="aar-actions">
                <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)}>
                  {open === r.id ? 'Close' : 'Approve'}
                </button>
                <button type="button" onClick={() => decline(r)}>
                  Decline
                </button>
              </div>
            ) : null}
            {open === r.id ? <ApproveForm req={r} onDone={load} /> : null}
          </li>
        ))}
      </ul>

      <h2 className="aar-h2">Issued keys</h2>
      <table className="aar-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Owner</th>
            <th>Tier</th>
            <th>Status</th>
            <th>Prefix</th>
            <th>Last used</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {(data?.keys || []).map((k) => (
            <tr key={k.id}>
              <td>{k.name}</td>
              <td>{k.owner_email}</td>
              <td>{TIERS[k.tier]?.name || k.tier}</td>
              <td>{k.status}</td>
              <td className="aar-mono">{k.key_prefix || 'unclaimed'}</td>
              <td className="aar-mono">{fmt(k.last_used_at) || 'never'}</td>
              <td>
                {k.status !== 'revoked' ? (
                  <button type="button" onClick={() => revoke(k)}>
                    Revoke
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
