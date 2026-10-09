'use client';

/**
 * /admin/waitlist: review the waitlist and send invites. The page is shown
 * only to admins (asked of /api/auth/is-admin), but the /api/admin/waitlist routes
 * are the real gate (ADMIN_EMAILS, server side).
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useIsAdmin } from '@/lib/admin-helpers-client';
import { supabase } from '@/lib/supabase-browser';
import { WAITLIST_HEARD_FROM, WAITLIST_ROLES } from '@/lib/waitlist/options';
import './waitlist-admin.css';

const TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'joined', label: 'Joined' },
  { id: 'rejected', label: 'Rejected' },
];
const ROLE_LABEL = Object.fromEntries(WAITLIST_ROLES.map((o) => [o.value, o.label]));
const HEARD_LABEL = Object.fromEntries(WAITLIST_HEARD_FROM.map((o) => [o.value, o.label]));

const fmtDate = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '';
};

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function WaitlistAdminPage() {
  const { user, loading } = useAuth() || {};
  const { isAdmin: allowed, checking: adminChecking } = useIsAdmin(user);
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [state, setState] = useState('idle'); // idle | loading | error
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null); // { text, url? }

  const load = useCallback(async (s) => {
    setState('loading');
    try {
      const res = await fetch(`/api/admin/waitlist?status=${s}`, { headers: await authHeaders() });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error(d.error || 'load failed');
      setRows(d.rows || []);
      setCounts(d.counts || {});
      setState('idle');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (allowed) load(status);
  }, [allowed, status, load]);

  const act = async (row, action) => {
    setBusyId(row.id);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/waitlist/${row.id}/${action}`, {
        method: 'POST',
        headers: await authHeaders(),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error(d.error || `${action} failed`);
      if (action === 'approve') {
        setToast(
          d.emailed
            ? { text: `Invite emailed to ${row.email}.` }
            : {
                text: `Email is not configured. Send ${row.email} this invite link by hand:`,
                url: d.inviteUrl,
              },
        );
      } else {
        setToast({ text: `${row.email} rejected.` });
      }
      load(status);
    } catch (e) {
      setToast({ text: e.message || 'That did not work.' });
    } finally {
      setBusyId(null);
    }
  };

  if (loading || adminChecking) return <main className="wla-page" aria-busy="true" />;
  if (!allowed) {
    return (
      <main className="wla-page">
        <p className="wla-empty">Not available.</p>
      </main>
    );
  }

  return (
    <main className="wla-page">
      <header className="wla-head">
        <h1 className="wla-title">Waitlist</h1>
        <p className="wla-sub">Approve an entry to email a one-time invite, valid for 14 days.</p>
      </header>

      <div className="wla-tabs" role="tablist" aria-label="Waitlist status">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={status === t.id}
            className={`wla-tab${status === t.id ? ' is-on' : ''}`}
            onClick={() => setStatus(t.id)}
          >
            {t.label}
            <span className="wla-count">{counts[t.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {toast ? (
        <div className="wla-toast" role="status">
          <span>{toast.text}</span>
          {toast.url ? <code className="wla-url">{toast.url}</code> : null}
          <button
            type="button"
            className="wla-toast-x"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {state === 'error' ? (
        <p className="wla-empty">The waitlist could not be loaded.</p>
      ) : state === 'loading' && !rows.length ? (
        <p className="wla-empty">Loading</p>
      ) : !rows.length ? (
        <p className="wla-empty">Nobody here.</p>
      ) : (
        <div className="wla-scroll">
          <table className="wla-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Organization</th>
                <th>Use case</th>
                <th>Heard from</th>
                <th>Joined waitlist</th>
                <th className="wla-num">Legacy #</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const m = r.metadata || {};
                const busy = busyId === r.id;
                return (
                  <tr key={r.id}>
                    <td>{r.full_name || ''}</td>
                    <td className="wla-email">{r.email}</td>
                    <td>{ROLE_LABEL[m.role] || m.role || ''}</td>
                    <td>{m.organization || ''}</td>
                    <td className="wla-use" title={m.use_case || ''}>
                      {m.use_case || ''}
                    </td>
                    <td>{HEARD_LABEL[m.heard_from] || m.heard_from || ''}</td>
                    <td className="wla-mono">{fmtDate(r.created_at)}</td>
                    <td className="wla-mono wla-num">{r.legacy_number ?? ''}</td>
                    <td className="wla-acts">
                      {r.status === 'pending' || r.status === 'approved' ? (
                        <button
                          type="button"
                          className="wla-btn wla-btn--primary"
                          disabled={busy}
                          onClick={() => act(r, 'approve')}
                        >
                          {r.status === 'approved' ? 'Resend invite' : 'Approve'}
                        </button>
                      ) : null}
                      {r.status !== 'joined' && r.status !== 'rejected' ? (
                        <button
                          type="button"
                          className="wla-btn"
                          disabled={busy}
                          onClick={() => act(r, 'reject')}
                        >
                          Reject
                        </button>
                      ) : null}
                      {r.status === 'approved' && r.invite_expires_at ? (
                        <span className="wla-meta">expires {fmtDate(r.invite_expires_at)}</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
