'use client';

/**
 * /admin/moderation: open reports grouped by content. Hide, Dismiss, or
 * Suspend the author (through /api/admin/lock-user). Shown only to admin
 * users; /api/admin/moderation is the real gate.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { isAdminUserClient } from '@/lib/admin-helpers-client';
import { supabase } from '@/lib/supabase-browser';
import { REPORT_REASONS } from '@/lib/moderation/core';
import './moderation-admin.css';

const REASON = Object.fromEntries(REPORT_REASONS.map((r) => [r.value, r.label]));
const TYPE = {
  community_post: 'Community post',
  echo_comment: 'Echo comment',
  message: 'Direct message',
  profile: 'Profile',
};

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

export default function ModerationAdminPage() {
  const { user, loading } = useAuth() || {};
  const allowed = isAdminUserClient(user);
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch('/api/admin/moderation', { headers: await authHeaders() });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error || 'Could not load reports.');
      return;
    }
    setGroups(d.groups || []);
  }, []);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  const act = async (g, action) => {
    const key = `${g.contentType}:${g.contentId}`;
    setBusy(key);
    setError(null);
    try {
      if (action === 'suspended') {
        if (!g.reportedEmail) throw new Error('No email on file for this member.');
        const r = await fetch('/api/admin/lock-user', {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify({
            email: g.reportedEmail,
            reason: 'Suspended for community guideline violations.',
          }),
        });
        if (!r.ok) throw new Error('Suspension failed.');
      }
      const res = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ contentType: g.contentType, contentId: g.contentId, action }),
      });
      if (!res.ok) throw new Error('Action failed.');
      setGroups((list) => list.filter((x) => `${x.contentType}:${x.contentId}` !== key));
    } catch (e) {
      setError(e.message || 'Action failed.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <main className="mod-page">Loading</main>;
  if (!allowed) return <main className="mod-page">Admins only.</main>;

  return (
    <main id="main-content" className="mod-page">
      <h1 className="mod-title">Moderation</h1>
      <p className="mod-sub">
        Open reports, most reported first. Content with three or more reporters is already hidden
        pending review.
      </p>
      {error ? <p className="mod-error">{error}</p> : null}
      {groups && !groups.length ? <p className="mod-empty">No open reports.</p> : null}
      <ul className="mod-list">
        {(groups || []).map((g) => {
          const key = `${g.contentType}:${g.contentId}`;
          return (
            <li key={key} className="mod-item">
              <div className="mod-head">
                <span className="mod-type">{TYPE[g.contentType]}</span>
                <span className="mod-count">
                  {g.reporters} {g.reporters === 1 ? 'reporter' : 'reporters'}
                </span>
                {g.hidden ? <span className="mod-tag">Hidden</span> : null}
              </div>
              <p className="mod-preview">{g.preview || 'Content no longer exists.'}</p>
              <p className="mod-meta">
                {Object.entries(g.reasons)
                  .map(([r, n]) => `${REASON[r] || r} (${n})`)
                  .join(', ')}
                {g.reportedEmail ? ` · author ${g.reportedEmail}` : ''}
              </p>
              {g.details.length ? (
                <ul className="mod-details">
                  {g.details.slice(0, 5).map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              ) : null}
              <div className="mod-actions">
                {g.contentType !== 'profile' ? (
                  <>
                    <button type="button" disabled={busy === key} onClick={() => act(g, 'hide')}>
                      Hide
                    </button>
                    <button
                      type="button"
                      disabled={busy === key}
                      onClick={() => act(g, 'copyright')}
                      title="Hide after a valid copyright notice and email the uploader how to counter-notify"
                    >
                      Remove for copyright
                    </button>
                  </>
                ) : null}
                <button type="button" disabled={busy === key} onClick={() => act(g, 'dismiss')}>
                  Dismiss
                </button>
                <button
                  type="button"
                  className="mod-danger"
                  disabled={busy === key || !g.reportedEmail}
                  onClick={() => act(g, 'suspended')}
                >
                  Suspend user
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
