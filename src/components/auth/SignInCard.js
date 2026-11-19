'use client';

import React, { useState, useEffect } from 'react';
import { safeInternalPath } from '@/lib/sanitize';
import Link from 'next/link';
import OAuthButtons from './OAuthButtons';
import { supabase } from '@/lib/supabase-browser';

/**
 * Bound a promise so a hung backend call can never stick the sign-in button.
 * Used for the partner/profile lookups that decide where to route the user.
 */
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timed out`)), ms)),
  ]);
}

const SignInCard = ({ variant = 'user', redirectTo, oauthErrorMessage }) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const destination = safeInternalPath(redirectTo);

  useEffect(() => {
    if (oauthErrorMessage) {
      try {
        setError(decodeURIComponent(oauthErrorMessage));
      } catch {
        setError(oauthErrorMessage);
      }
    }
  }, [oauthErrorMessage]);

  // Decide where to send the user after a successful login, given the `user`
  // returned by signInWithPassword. Only DB lookups (partners/profiles) happen
  // here — no Supabase *auth* calls — so it is safe to run both on the password
  // step (before the MFA prompt) and on the non-MFA path. Returns either
  // { path } to navigate to, or { reject: true } for a non-partner trying to
  // use the dedicated partner login form.
  const resolveDestination = async (user) => {
    // Partner status: app_metadata fast-path (user_metadata is user-writable),
    // then the partners table. The table
    // lookup is best-effort: on timeout/error treat as non-partner and proceed
    // rather than letting a hung query block the login.
    let isPartner = !!user?.app_metadata?.partner_role;
    if (!isPartner && user?.id) {
      try {
        const { data: partner } = await withTimeout(
          supabase
            .from('partners')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle(),
          10000,
          'partners lookup',
        );
        isPartner = !!partner;
      } catch {
        isPartner = false;
      }
    }

    // The dedicated partner login form rejects non-partner accounts.
    if (variant === 'partner' && !isPartner) {
      return { reject: true };
    }

    // Partners always land in the partner experience — even when they sign in
    // through the standard login form — so they're never dropped into the
    // consumer dashboard. First-login partners (onboarding unfinished) see the
    // partner onboarding questionnaire first.
    if (isPartner) {
      let onboarded = false;
      if (user?.id) {
        try {
          const { data: prof } = await withTimeout(
            supabase
              .from('profiles')
              .select('onboarding_completed')
              .eq('id', user.id)
              .maybeSingle(),
            10000,
            'profile lookup',
          );
          onboarded = prof?.onboarding_completed === true;
        } catch {
          onboarded = false;
        }
      }
      if (!onboarded) return { path: '/onboarding' };
      // The partner form honours ?redirect= (QA PAR-9), sanitized above.
      return { path: variant === 'partner' && redirectTo ? destination : '/partner-home' };
    }

    return { path: destination };
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    let navigating = false;
    try {
      /* No app-level lockout (QA RET-9): brute force is limited by Supabase
         Auth's own rate limits. Only a successful sign-in is recorded, by the
         now-authenticated session; failures are never client-reported. */
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInError) {
        await fetch('/api/auth/record-attempt', {
          method: 'POST',
          headers: signInData?.session?.access_token
            ? { Authorization: `Bearer ${signInData.session.access_token}` }
            : {},
        }).catch(() => {});
      }

      if (signInError) {
        if (signInError.message?.toLowerCase().includes('disabled')) {
          setError('This account has been locked. Contact support if you need help.');
        } else {
          setError('Invalid credentials. Please try again.');
        }
        return;
      }

      // Resolve where the user should land (partner routing) using the user
      // from the sign-in response — no extra getUser().
      const user = signInData?.user;
      const dest = await resolveDestination(user);
      if (dest.reject) {
        await supabase.auth.signOut();
        setError(
          'This account is not registered as a partner. Contact partnersupport@ezana.world or apply to become a partner.',
        );
        return;
      }

      // Hard-navigate to the destination with a full document load. We do NOT
      // do MFA inline here: if this account needs a second factor, the
      // middleware redirects this request to /auth/mfa (or /auth/mfa-setup),
      // where the dedicated step-up page handles it on a fresh page load. Doing
      // the challenge/verify in this same page session deadlocks the shared
      // Supabase auth Web Lock and hangs the button on "Signing in…".
      navigating = true;
      window.location.assign(dest.path);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      // Keep the spinner only while the full-load navigation is in flight.
      if (!navigating) setIsLoading(false);
    }
  };

  /* One centred, rounded card (Nov 2026). The email and password pills carry
     no visible label: the placeholder and icon say what they are, and the
     label stays in the markup for screen readers. */
  return (
    <div className="as-panel">
      <h1 className="as-title">Welcome back</h1>
      <p className="as-sub">
        {variant === 'partner' ? 'Sign in to your partner account' : 'Sign in to your account'}
      </p>

      {error ? (
        <div className="as-alert" role="alert">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSignIn} className="as-form">
        <div className="as-pill">
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <i className="bi bi-envelope" aria-hidden="true" />
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="as-input"
          />
        </div>

        <div className="as-pill">
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <i className="bi bi-lock" aria-hidden="true" />
          <input
            id="password"
            type={isPasswordVisible ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="as-input"
          />
          <button
            type="button"
            className="as-eye"
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            <i
              className={`bi ${isPasswordVisible ? 'bi-eye-slash' : 'bi-eye'}`}
              aria-hidden="true"
            />
          </button>
        </div>

        <p className="as-center">
          <Link href="/auth/forgot-password" className="as-link">
            Forgot password?
          </Link>
        </p>

        <button type="submit" disabled={isLoading} className="as-btn as-btn--primary">
          {isLoading ? (
            <>
              <span className="as-spin" aria-hidden="true" />
              Signing in
            </>
          ) : (
            <>
              Sign in
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <OAuthButtons
        flow="signin"
        type={variant === 'partner' ? 'partner' : undefined}
        redirect={redirectTo ? destination : undefined}
        onError={setError}
      />

      <div className="as-foot">
        {variant === 'partner' ? (
          <p>
            Not a partner yet? Reach out to{' '}
            <a href="mailto:partnersupport@ezana.world" className="as-link">
              partnersupport@ezana.world
            </a>
          </p>
        ) : (
          <>
            <p>
              New to Ezana?{' '}
              <Link href="/auth/signup" className="as-link">
                Join the waitlist
              </Link>
            </p>
            <p>
              Partner or creator?{' '}
              <Link href="/auth/partner/signin" className="as-link">
                Login as Partner
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default SignInCard;
