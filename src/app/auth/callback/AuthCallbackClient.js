'use client';

/**
 * Google and GitHub sign-in completes here: exchange code → session, pass the
 * invite gate (/api/auth/oauth-complete), then route by profile.
 * Sign-up is invite-only: an account with no invite is signed out and sent to
 * the waitlist; an invited one confirms 18+ here and is finished server side.
 * Unverified email → /auth/verify-email; else the intended page or /home.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { safeInternalPath } from '@/lib/sanitize';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { isActivePartner } from '@/lib/partner-access';
import AuthShell from '@/components/auth/AuthShell';
import { OAUTH_INTENT_KEY } from '@/components/auth/OAuthButtons';
import { isValidCodeFormat } from '@/lib/referrals';
import { AGE_CONFIRM_TEXT } from '@/lib/legal/consent';

function authErrorPath(flow, type) {
  if (type === 'partner') return '/auth/partner/signin';
  if (flow === 'signup') return '/auth/signup';
  return '/auth/signin';
}

async function routeAfterSession(supabase, router, type, redirectParam) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    router.replace(`/auth/signin?error=${encodeURIComponent('No user session after sign-in')}`);
    return;
  }

  let { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('onboarding_completed, email_verified')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr) {
    console.error('[auth/callback] profile fetch:', profileErr.message);
  }

  if (!profile) {
    const { error: insErr } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      onboarding_completed: true,
      /* email_verified defaults to false and is server-managed. */
      updated_at: new Date().toISOString(),
    });
    if (insErr) {
      console.error('[auth/callback] profile insert:', insErr.message);
      const createdAt = new Date(user.created_at).getTime();
      if (Date.now() - createdAt < 120000) {
        router.replace('/auth/verify-email');
        return;
      }
    } else {
      profile = { onboarding_completed: true, email_verified: false };
    }
  }

  if (!profile || profile.email_verified !== true) {
    router.replace('/auth/verify-email');
    return;
  }

  // ── Three-way post-login routing (destination = the door they came through,
  //    NOT mere membership; regular /home no longer bounces org members) ──
  //    1. Partner  → /partner-home         (partner_role / active partner row)
  //    2. Org      → /org-team-hub          (org login sets redirect=/org-team-hub,
  //                                          carried in redirectParam below)
  //    3. Regular  → redirectParam or /home (org members included — they stay in
  //                                          the regular app; a /home banner links
  //                                          to Team Hub opt-in)
  // Partner takes precedence: a partner who is also an org member lands in the
  // partner app. Resolved via the SHARED isActivePartner helper so the router and
  // the server-side partner route gate admit exactly the same users.
  const isPartner = await isActivePartner(supabase, user);

  if (type === 'partner' && !isPartner) {
    await supabase.auth.signOut();
    router.replace('/auth/partner-denied');
    return;
  }

  if (isPartner) {
    router.replace(profile.onboarding_completed === true ? '/partner-home' : '/onboarding');
    return;
  }

  const dest = safeInternalPath(redirectParam);
  router.replace(dest);
}

const INVITE_ONLY = 'Ezana is invite only. Join the waitlist and we will email your invite.';

/** What the visitor was doing when they left for the provider (OAuthButtons). */
function readIntent(searchParams) {
  let saved = {};
  try {
    const raw = window.sessionStorage.getItem(OAUTH_INTENT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Date.now() - Number(parsed.at) < 15 * 60 * 1000) saved = parsed;
    window.sessionStorage.removeItem(OAUTH_INTENT_KEY);
  } catch {
    saved = {};
  }
  const pick = (k) => (typeof saved[k] === 'string' && saved[k] ? saved[k] : searchParams.get(k));
  return {
    flow: pick('flow'),
    type: pick('type'),
    redirect: pick('redirect') || '/home',
  };
}

async function callGate(ageConfirmed) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch('/api/auth/oauth-complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ ageConfirmed: ageConfirmed === true }),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

export default function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Completing sign-in');
  /* Set when an invited visitor still has to confirm they are 18 or older. */
  const [ageStep, setAgeStep] = useState(null);
  const [ageOk, setAgeOk] = useState(false);
  const [ageBusy, setAgeBusy] = useState(false);
  const [ageError, setAgeError] = useState('');
  const intentRef = useRef(null);

  /* The invite gate, then routing. Returns false when it showed the 18+ step. */
  const passGateAndRoute = useCallback(
    async (ageConfirmed) => {
      const intent = intentRef.current || { type: null, redirect: '/home' };
      let gate = null;
      try {
        gate = await callGate(ageConfirmed);
      } catch {
        gate = null;
      }
      if (gate?.data?.uninvited) {
        await supabase.auth.signOut().catch(() => {});
        router.replace(`/auth/signup?error=${encodeURIComponent(INVITE_ONLY)}`);
        return true;
      }
      if (gate?.data?.needsAge) {
        setAgeStep({ firstName: gate.data.firstName || '' });
        return false;
      }
      let redirect = intent.redirect;
      if (gate?.data?.state === 'joined') {
        if (gate.data.referralCode && isValidCodeFormat(gate.data.referralCode)) {
          try {
            await fetch('/api/referrals/apply', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: gate.data.referralCode }),
            });
          } catch {
            /* the account already exists; a referral never blocks it */
          }
        }
        if (gate.data.redirect) redirect = gate.data.redirect;
      }
      /* A gate that could not be reached does not strand an existing member:
         routing goes on, and an account that has not come through an invite
         still cannot verify itself (/api/auth/send-verification refuses it). */
      await routeAfterSession(supabase, router, intent.type, redirect);
      return true;
    },
    [router],
  );

  useEffect(() => {
    const run = async () => {
      const intent = readIntent(searchParams);
      intentRef.current = intent;
      const { flow, type } = intent;
      const oauthError = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      const errBase = authErrorPath(flow, type);

      if (oauthError) {
        const msg = errorDescription || oauthError;
        /* New accounts are closed at the auth service: same answer as the gate. */
        if (/signups? not allowed/i.test(msg)) {
          router.replace(`/auth/signup?error=${encodeURIComponent(INVITE_ONLY)}`);
          return;
        }
        router.replace(`${errBase}?error=${encodeURIComponent(msg)}`);
        return;
      }

      let code = searchParams.get('code');

      /** Implicit / fragment flow — tokens in hash (not sent to server) */
      if (!code && typeof window !== 'undefined' && window.location.hash?.length > 1) {
        const hp = new URLSearchParams(window.location.hash.substring(1));
        const access_token = hp.get('access_token');
        const refresh_token = hp.get('refresh_token');
        if (access_token && refresh_token) {
          setMessage('Saving session');
          const { error: sErr } = await supabase.auth.setSession({ access_token, refresh_token });
          if (sErr) {
            console.error('[auth/callback] setSession from hash failed:', sErr.message);
            router.replace(`${errBase}?error=${encodeURIComponent(sErr.message)}`);
            return;
          }
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          await passGateAndRoute(false);
          return;
        }
      }

      if (!code) {
        console.error(
          '[auth/callback] Missing code. Full URL:',
          typeof window !== 'undefined' ? window.location.href : '',
        );
        router.replace(
          `${errBase}?error=${encodeURIComponent('Missing authorization code. Try signing in again.')}`,
        );
        return;
      }

      setMessage('Verifying with Ezana');
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('[auth/callback] exchangeCodeForSession failed:', exchangeError.message);
        router.replace(`${errBase}?error=${encodeURIComponent(exchangeError.message)}`);
        return;
      }

      await passGateAndRoute(false);
    };

    run();
    /* Runs once per landing: the code in the URL is single-use. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmAge = async (e) => {
    e.preventDefault();
    if (!ageOk) {
      setAgeError('You must be 18 or older to use Ezana.');
      return;
    }
    setAgeError('');
    setAgeBusy(true);
    const done = await passGateAndRoute(true);
    if (!done) {
      setAgeBusy(false);
      setAgeError('Could not finish creating the account. Please try again.');
    }
  };

  if (ageStep) {
    return (
      <AuthShell>
        <div className="as-panel">
          <h1 className="as-title">You&apos;re in</h1>
          <p className="as-sub">
            Welcome{ageStep.firstName ? `, ${ageStep.firstName}` : ''}. One confirmation and your
            account is ready.
          </p>
          {ageError ? (
            <div className="as-alert" role="alert">
              {ageError}
            </div>
          ) : null}
          <form className="as-form" onSubmit={confirmAge}>
            <label className="as-check" htmlFor="as-age">
              <input
                id="as-age"
                type="checkbox"
                checked={ageOk}
                onChange={(e) => setAgeOk(e.target.checked)}
              />
              {AGE_CONFIRM_TEXT}
            </label>
            <button type="submit" className="as-btn as-btn--primary" disabled={ageBusy}>
              {ageBusy ? 'Creating account' : 'Create account'}
            </button>
          </form>
        </div>
      </AuthShell>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafb] px-4">
      <div className="h-10 w-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin mb-4" />
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  );
}
