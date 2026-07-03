'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-browser';

/**
 * MFA step-up challenge. Shown when the session is at aal1 but the user has a
 * verified TOTP factor (middleware redirect target). Reuses the same
 * supabase.auth.mfa.* APIs as the settings MfaSetupPanel.
 */
export default function MfaChallengeCard({ redirectTo = '/home' }) {
  const [factorId, setFactorId] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const dest = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/home';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        window.location.assign(`/auth/signin?redirect=${encodeURIComponent(dest)}`);
        return;
      }
      const { data, error: listErr } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      const verified = data?.totp?.find((f) => f.status === 'verified');
      if (listErr || !verified) {
        // No verified factor — enrollment is required instead.
        window.location.assign(`/auth/mfa-setup?redirect=${encodeURIComponent(dest)}`);
        return;
      }
      setFactorId(verified.id);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [dest]);

  const submit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!factorId || code.length !== 6 || loading) return;
      setLoading(true);
      setError(null);

      // Challenge + verify now run SERVER-SIDE (/api/auth/mfa/*), off the browser
      // Supabase SDK whose auth-lock/promise layer caused the wedge. On success
      // the verify route writes the new aal2 session as Set-Cookie; a full reload
      // re-reads it and middleware sees aal2. A single AbortController caps both
      // calls; the real Supabase error is surfaced (never a generic timeout).
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const postJson = async (url, payload) => {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
        const json = await res.json().catch(() => ({}));
        return { res, json };
      };

      try {
        const { res: chRes, json: chJson } = await postJson('/api/auth/mfa/challenge', {
          factorId,
        });
        if (!chRes.ok || !chJson.challengeId) {
          setError(chJson.error || 'Could not start verification.');
          setLoading(false);
          return;
        }

        const { res: vRes, json: vJson } = await postJson('/api/auth/mfa/verify', {
          factorId,
          challengeId: chJson.challengeId,
          code,
        });
        if (!vRes.ok || !vJson.ok) {
          setError(vJson.error || 'That code did not verify. Check the code and try again.');
          setLoading(false);
          return;
        }

        // aal2 session is set on the verify response (Set-Cookie). A full reload
        // makes the browser re-read it so middleware sees aal2.
        window.location.assign(dest);
      } catch (err) {
        if (err?.name === 'AbortError') {
          setError('Verifying took too long — please check your connection and try again.');
        } else {
          setError('Something went wrong. Please try again.');
        }
        setLoading(false);
      } finally {
        clearTimeout(timer);
      }
    },
    [factorId, code, loading, dest],
  );

  async function signOut() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const isPartner = !!user?.user_metadata?.partner_role;
    await supabase.auth.signOut();
    window.location.assign(isPartner ? '/auth/partner-login' : '/auth/signin');
  }

  return (
    <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
      <div className="mb-5 flex flex-col items-center text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <i className="bi bi-shield-lock text-xl" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold text-slate-900">Verify it&rsquo;s you</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter the 6-digit code from your authenticator app to finish signing in.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete="one-time-code"
          autoFocus
          placeholder="••••••"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          disabled={!ready || loading}
          aria-label="6-digit authentication code"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-lg tracking-[0.4em] text-slate-900 outline-none focus:border-emerald-500"
        />

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!ready || code.length !== 6 || loading}
          className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Verifying…' : 'Verify and continue'}
        </button>
      </form>

      <button
        type="button"
        onClick={signOut}
        className="mt-5 w-full text-center text-sm text-slate-500 transition hover:text-slate-700"
      >
        Sign out
      </button>
    </div>
  );
}
