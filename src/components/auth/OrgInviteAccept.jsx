'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import './org-invite-accept.css';

/*
 * Org invite link landing (/auth/org-login?invite=TOKEN).
 *
 * Shows which organization, role and team the invite is for, then:
 *   - signed in as the invited email: one "Join" button;
 *   - signed in as someone else: asks them to sign out first;
 *   - no account yet: name + password form that creates the account and
 *     joins in one step, then signs in;
 *   - account exists but signed out: a sign-in link that returns here.
 * After joining, the app's own gates take over: the 6-digit email check, then
 * the role questionnaire, then the Team Hub.
 */
export default function OrgInviteAccept({ token }) {
  const router = useRouter();
  const [state, setState] = useState({ loading: true });
  const [sessionEmail, setSessionEmail] = useState(null);
  const [form, setForm] = useState({ fullName: '', password: '', confirm: '', age: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [res, { data }] = await Promise.all([
          fetch(`/api/org/invites/accept?token=${encodeURIComponent(token)}`, {
            cache: 'no-store',
          }),
          supabase.auth.getSession(),
        ]);
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        setSessionEmail(data?.session?.user?.email?.toLowerCase() || null);
        if (!res.ok)
          setState({ loading: false, dead: body.error || 'This invite link is invalid.' });
        else setState({ loading: false, invite: body.invite, hasAccount: body.hasAccount });
      } catch {
        if (!cancelled) setState({ loading: false, dead: 'Could not load this invite.' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const accept = async (payload = {}) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/org/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, ...payload }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body.needsSignIn) setState((s) => ({ ...s, hasAccount: true }));
        setError(body.error || 'Could not accept the invite.');
        return;
      }
      if (body.newAccount) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: body.email,
          password: payload.password,
        });
        if (signInErr) {
          router.push('/auth/org-login');
          return;
        }
      }
      router.push('/org-team-hub');
    } catch {
      setError('Could not connect. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitNew = (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    accept({ fullName: form.fullName, password: form.password, ageConfirmed: form.age });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSessionEmail(null);
  };

  if (state.loading) {
    return (
      <div className="oia-card" aria-busy="true">
        <p className="oia-muted">Checking your invite…</p>
      </div>
    );
  }

  if (state.dead) {
    return (
      <div className="oia-card">
        <h1 className="oia-title">Invite unavailable</h1>
        <p className="oia-muted">{state.dead}</p>
        <Link className="oia-btn" href="/auth/org-login">
          Go to organizational login
        </Link>
      </div>
    );
  }

  const inv = state.invite;
  // The standard sign-in (not the org sign-in) because the invitee is not a
  // member yet; it returns here so they can press Join.
  const signInHref = `/auth/signin?redirect=${encodeURIComponent(
    `/auth/org-login?invite=${encodeURIComponent(token)}`,
  )}`;
  const matches = sessionEmail && sessionEmail === inv.email.toLowerCase();

  return (
    <div className="oia-card">
      <p className="oia-eyebrow">You&apos;re invited</p>
      <h1 className="oia-title">Join {inv.orgName} on Ezana</h1>
      <dl className="oia-facts">
        <div>
          <dt>Email</dt>
          <dd>{inv.email}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{inv.roleLabel}</dd>
        </div>
        {inv.teamName ? (
          <div>
            <dt>Team</dt>
            <dd>{inv.teamName}</dd>
          </div>
        ) : null}
        {inv.canInvite ? (
          <div>
            <dt>Access</dt>
            <dd>You can invite other members</dd>
          </div>
        ) : null}
      </dl>

      {matches ? (
        <button type="button" className="oia-btn" disabled={busy} onClick={() => accept()}>
          {busy ? 'Joining…' : `Join ${inv.orgName}`}
        </button>
      ) : sessionEmail ? (
        <>
          <p className="oia-muted">
            You&apos;re signed in as {sessionEmail}. This invite is for {inv.email}.
          </p>
          <button type="button" className="oia-btn" onClick={signOut}>
            Sign out and continue
          </button>
        </>
      ) : state.hasAccount ? (
        <>
          <p className="oia-muted">
            You already have an Ezana account. Sign in, and you&apos;ll come back here to join.
          </p>
          <Link className="oia-btn" href={signInHref}>
            Sign in to join
          </Link>
        </>
      ) : (
        <form className="oia-form" onSubmit={submitNew} noValidate>
          <label className="oia-label" htmlFor="oia-name">
            Full name
          </label>
          <input
            id="oia-name"
            className="oia-input"
            autoComplete="name"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
          />
          <label className="oia-label" htmlFor="oia-pw">
            Password
          </label>
          <input
            id="oia-pw"
            className="oia-input"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
          <p className="oia-hint">8+ characters with an uppercase letter, a number and a symbol.</p>
          <label className="oia-label" htmlFor="oia-pw2">
            Confirm password
          </label>
          <input
            id="oia-pw2"
            className="oia-input"
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
          />
          <label className="oia-check">
            <input
              type="checkbox"
              checked={form.age}
              onChange={(e) => setForm((f) => ({ ...f, age: e.target.checked }))}
            />
            I am 18 or older
          </label>
          <button type="submit" className="oia-btn" disabled={busy}>
            {busy ? 'Creating your account…' : 'Create account and join'}
          </button>
        </form>
      )}

      {error ? (
        <p className="oia-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
