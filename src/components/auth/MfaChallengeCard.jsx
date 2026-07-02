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

      // Per-phase timeouts instead of a single 20s guard: challenge() and
      // verify() each call Supabase's own auth server directly (not our /api),
      // so a stall in either points at the auth server / network, not our code.
      // Splitting the ceilings lets us give a SPECIFIC message per phase and,
      // with the [mfa] timing logs below, pinpoint the stalling call from the
      // field. (Temporary diagnostic logs — safe to remove once the root cause
      // is confirmed.)
      const withTimeout = (promise, ms, label) =>
        Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`__timeout__:${label}`)), ms),
          ),
        ]);

      const t0 = performance.now();
      try {
        console.log('[mfa] challenge start');
        const { data: challenge, error: chErr } = await withTimeout(
          supabase.auth.mfa.challenge({ factorId }),
          8000,
          'challenge',
        );
        console.log('[mfa] challenge done', Math.round(performance.now() - t0), 'ms', {
          chErr: chErr?.message || null,
          challengeId: challenge?.id || null,
        });
        if (chErr) {
          setError(chErr.message || 'Could not start verification.');
          setLoading(false);
          return;
        }

        const t1 = performance.now();
        console.log('[mfa] verify start');
        const { data: vData, error: vErr } = await withTimeout(
          supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code }),
          12000,
          'verify',
        );
        console.log('[mfa] verify done', Math.round(performance.now() - t1), 'ms', {
          vErr: vErr?.message || null,
          session: vData?.access_token ? 'got session' : 'no session',
        });
        if (vErr) {
          setError(vErr.message || 'That code did not verify. Check the code and try again.');
          setLoading(false);
          return;
        }

        // verify() returned a valid aal2 session (access_token in vData) — the
        // login genuinely succeeded server-side (confirmed by a 200 Network
        // capture). Do NOT poll getAuthenticatorAssuranceLevel() to re-confirm:
        // that call serializes on the SAME in-process auth lock (processLock) as
        // GoTrue's post-verify onAuthStateChange work, so it can never resolve —
        // it hangs the flow until the guard fires ("Verification timed out")
        // despite the successful login. Instead, a short fixed delay lets the
        // @supabase/ssr cookie write flush; the full-page navigation then
        // re-reads that cookie and the middleware sees aal2. (Bump to ~500ms if
        // the middleware is ever observed to bounce back to /auth/mfa — but do
        // NOT reintroduce the AAL poll.)
        console.log('[mfa] verify succeeded — redirecting');
        await new Promise((r) => setTimeout(r, 250));
        window.location.assign(dest);
      } catch (err) {
        const msg = String(err?.message || '');
        if (msg === '__timeout__:challenge') {
          console.warn('[mfa] challenge timed out (>8s) — auth server/network unreachable');
          setError(
            "Couldn't reach the authentication server — check your connection and try again.",
          );
        } else if (msg === '__timeout__:verify') {
          // The verify HTTP call may have returned 200 with a valid aal2 session
          // even though the lock-wrapped promise didn't resolve in time. Check
          // the LOCAL session (reads storage, no network/lock) before failing —
          // if the session actually landed, the login succeeded, so redirect.
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (session?.access_token) {
              console.warn('[mfa] verify promise stranded but session is present — redirecting');
              window.location.assign(dest);
              return;
            }
          } catch {
            /* fall through to the timeout error */
          }
          console.warn('[mfa] verify timed out (>12s) and no session present');
          setError(
            'Verifying took too long. Please try again — if it keeps happening, re-add your authenticator in settings.',
          );
        } else {
          setError(err?.message || 'Something went wrong. Please try again.');
        }
        setLoading(false);
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
