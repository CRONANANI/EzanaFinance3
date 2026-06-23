'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-browser';

/**
 * Mandatory MFA enrollment gate. Shown when the session is at aal1 and the user
 * has no verified factor (middleware redirect target). Reuses the enrollment
 * flow from the settings MfaSetupPanel, but framed as required-to-continue.
 */
export default function MfaSetupGateCard({ redirectTo = '/home' }) {
  const [step, setStep] = useState('loading'); // loading | verify | error
  const [factorId, setFactorId] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const dest = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/home';

  const startEnroll = useCallback(async () => {
    setError(null);
    // Remove any stale unverified factor so re-enrollment doesn't collide.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    const stale = existing?.totp?.find((f) => f.status !== 'verified');
    if (stale) {
      await supabase.auth.mfa.unenroll({ factorId: stale.id }).catch(() => {});
    }
    const { data, error: enErr } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Ezana Finance',
    });
    if (enErr) {
      setError(enErr.message);
      setStep('error');
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStep('verify');
  }, []);

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
      const { data } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      const verified = data?.totp?.find((f) => f.status === 'verified');
      if (verified) {
        // Already enrolled — step up instead of enrolling again.
        window.location.assign(`/auth/mfa?redirect=${encodeURIComponent(dest)}`);
        return;
      }
      await startEnroll();
    })();
    return () => {
      cancelled = true;
    };
  }, [dest, startEnroll]);

  const submit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!factorId || code.length !== 6 || loading) return;
      setLoading(true);
      setError(null);
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr) {
        setError(chErr.message);
        setLoading(false);
        return;
      }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (vErr) {
        setError(vErr.message);
        setLoading(false);
        return;
      }
      // First verification elevates the session to aal2 — full reload onward.
      window.location.assign(dest);
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
    <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
      <div className="mb-5 flex flex-col items-center text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
          <i className="bi bi-shield-lock text-xl" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold text-white">Set up two-factor authentication</h1>
        <p className="mt-2 text-sm text-white/60">
          Two-factor authentication is required to continue. Scan the QR code with an authenticator
          app (Google Authenticator, Authy, 1Password), then enter the 6-digit code.
        </p>
      </div>

      {step === 'loading' && <p className="text-center text-sm text-white/50">Preparing setup…</p>}

      {step === 'error' && (
        <div className="flex flex-col gap-4 text-center">
          <p className="text-sm text-red-400" role="alert">
            {error || 'Could not start MFA setup.'}
          </p>
          <button
            type="button"
            onClick={startEnroll}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700"
          >
            Try again
          </button>
        </div>
      )}

      {step === 'verify' && (
        <form onSubmit={submit} className="flex flex-col gap-4">
          {qrCode && (
            <div className="flex flex-col items-center gap-2">
              <img
                src={qrCode}
                alt="Two-factor authentication QR code"
                className="h-44 w-44 rounded-lg bg-white p-2"
              />
              {secret && (
                <p className="text-center text-xs text-white/50">
                  Or enter this key manually:
                  <br />
                  <code className="break-all font-mono text-white/70">{secret}</code>
                </p>
              )}
            </div>
          )}

          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            disabled={loading}
            aria-label="6-digit authentication code"
            className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-center text-lg tracking-[0.4em] text-white outline-none focus:border-emerald-500"
          />

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={code.length !== 6 || loading}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Verifying…' : 'Verify and continue'}
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={signOut}
        className="mt-5 w-full text-center text-sm text-white/50 transition hover:text-white"
      >
        Sign out
      </button>
    </div>
  );
}
