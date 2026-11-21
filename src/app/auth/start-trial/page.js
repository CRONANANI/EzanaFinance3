'use client';

/**
 * /auth/start-trial?billing=quarterly|yearly  (Nov 21, 2026)
 *
 * The Advanced plan's free one-month trial, open without a waitlist invite.
 * 1. The visitor enters their account details (POST /api/auth/trial-signup).
 * 2. We sign in with the new password.
 * 3. We open Stripe Checkout for Advanced with the trial
 *    (POST /api/stripe/create-checkout-session) and send them there.
 * Coming back from Stripe without finishing (?canceled=true on /pricing) leaves
 * a signed-in account that stays locked until a trial is started.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-browser';
import { PasswordStrengthField } from '@/components/ui/password-strength-field';
import { EMAIL_RE, validatePassword } from '@/lib/auth/password-rules';
import { AGE_CONFIRM_TEXT } from '@/lib/legal/consent';
import { PLANS } from '@/config/pricing';
import { priceAndPeriod } from '@/lib/billing/renewal-terms';
import '@/components/auth/auth-shell.css';
import '../signup/signup.css';
import './start-trial.css';

const PLAN_KEY = { quarterly: 'personal_advanced_quarterly', yearly: 'personal_advanced_annual' };

function Field({ id, label, required, error, hint, children }) {
  return (
    <div className="wl-field">
      <label className="wl-label" htmlFor={id}>
        {label}
        {required ? <span className="wl-req"> *</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="wl-hint">{hint}</p> : null}
      {error ? (
        <p className="wl-err" id={`${id}-err`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Opens Stripe Checkout for Advanced. Resolves to { msg, code } on failure,
 * or navigates. code 'price_unavailable' means that billing period has no
 * Stripe price yet; the page then offers the other period.
 */
async function openCheckout(billing) {
  try {
    const res = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ planKey: PLAN_KEY[billing], cancelPath: '/auth/start-trial' }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.url) {
      window.location.assign(d.url);
      return null;
    }
    if (res.ok && (d.alreadySubscribed || d.switched)) {
      window.location.assign(d.url || '/home');
      return null;
    }
    return { msg: d.error || 'Could not open Stripe. Please try again.', code: d.code || null };
  } catch {
    return { msg: 'Could not reach Stripe. Please try again.', code: null };
  }
}

export default function StartTrialPage() {
  const [billing, setBilling] = useState('yearly');
  const [canceled, setCanceled] = useState(false);
  const [session, setSession] = useState(null);
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', username: '' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ageOk, setAgeOk] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('billing') === 'quarterly') setBilling('quarterly');
    setCanceled(p.get('canceled') === 'true');
    supabase.auth.getSession().then(({ data }) => setSession(data?.session || null));
  }, []);

  const plan = PLANS[PLAN_KEY[billing]];

  /* Checkout failures land here; a period without a Stripe price yet keeps
     its code so the page can offer the other period in one click. */
  const fail = (out) => {
    setError(out.msg);
    setErrorCode(out.code);
    setBusy(false);
  };
  const checkout = async (period = billing) => {
    setBusy(true);
    setError('');
    setErrorCode(null);
    const out = await openCheckout(period);
    if (out) fail(out);
  };
  const switchToYearly = () => {
    setBilling('yearly');
    checkout('yearly');
  };
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = {};
    if (!f.firstName.trim()) errs.firstName = 'Enter your first name.';
    if (!f.lastName.trim()) errs.lastName = 'Enter your last name.';
    if (!EMAIL_RE.test(f.email.trim())) errs.email = 'Enter a valid email address.';
    if (!/^[a-z0-9_]{3,30}$/.test(f.username)) {
      errs.username = 'Usernames are 3 to 30 lowercase letters, numbers or underscores.';
    }
    const pwdErrors = validatePassword(password);
    if (pwdErrors.length) errs.password = `Password must contain: ${pwdErrors.join(', ')}`;
    if (password !== confirm) errs.confirm = 'Passwords do not match.';
    if (!ageOk) errs.ageConfirmed = 'You must be 18 or older to use Ezana.';
    setErrors(errs);
    /* Nov 21: every failure also shows directly above the button, so a
       problem further up the form is never silent. */
    const errList = Object.values(errs);
    if (errList.length) {
      setErrorCode(null);
      setError(
        errList.length === 1
          ? errList[0]
          : `${errList[0]} Please also check the ${errList.length - 1} other highlighted field${errList.length > 2 ? 's' : ''}.`,
      );
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/auth/trial-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...f,
          email: f.email.trim(),
          password,
          ageConfirmed: ageOk,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) {
        if (d.field) setErrors({ [d.field]: d.error });
        setError(
          res.status === 429
            ? 'Too many attempts. Try again in a few minutes.'
            : d.error || 'Could not create the account. Please try again.',
        );
        setBusy(false);
        return;
      }
      const { data: signedIn, error: signInErr } = await supabase.auth.signInWithPassword({
        email: d.email,
        password,
      });
      /* The account now exists: if Stripe fails below, the page switches to
         the signed-in view so a retry reopens Stripe instead of trying to
         create the account again ("already exists"). */
      if (signedIn?.session) setSession(signedIn.session);
      if (signInErr) {
        setError('Your account was created. Sign in to finish starting your trial.');
        setBusy(false);
        return;
      }
      const out = await openCheckout(billing);
      if (out) fail(out);
    } catch {
      setError('Could not reach Ezana. Please try again.');
      setBusy(false);
    }
  };

  const terms = plan?.price ? (
    <p className="wl-sub">
      Free for 1 month, then {priceAndPeriod(plan)}, billed automatically until you cancel. Cancel
      anytime in Settings, Billing before the trial ends and you won&apos;t be charged.
    </p>
  ) : null;

  const alertBlock = error ? (
    <div className="wl-alert st-alert" role="alert">
      <i className="bi bi-exclamation-circle" aria-hidden="true" />
      <span>
        {error}
        {errorCode === 'price_unavailable' && billing === 'quarterly' ? (
          <>
            {' '}
            <button
              type="button"
              className="st-inline-link"
              onClick={switchToYearly}
              disabled={busy}
            >
              Start with yearly billing
            </button>
          </>
        ) : null}
      </span>
    </div>
  ) : null;

  /* Quarterly or yearly, text only: the selected period in emerald. */
  const periodToggle = (
    <div className="st-period" role="group" aria-label="Billing after the trial">
      {['quarterly', 'yearly'].map((p) => (
        <button
          key={p}
          type="button"
          className={`st-period-opt${billing === p ? ' is-on' : ''}`}
          aria-pressed={billing === p}
          onClick={() => {
            setBilling(p);
            setError('');
            setErrorCode(null);
          }}
        >
          {p === 'quarterly' ? 'Quarterly' : 'Yearly'}
          {p === 'yearly' ? <span className="st-period-save">Save 20%</span> : null}
        </button>
      ))}
    </div>
  );

  /* Signed in already (e.g. back from Stripe without finishing): one button. */
  if (session) {
    return (
      <div className="signin-dark-lock wl-page st-page">
        <main className="wl-card st-card">
          <h1 className="wl-title">
            {canceled ? (
              'Your trial has not started yet'
            ) : (
              <>
                Start your free <span className="st-accent">Advanced</span> trial
              </>
            )}
          </h1>
          {periodToggle}
          {terms}
          {alertBlock}
          <button type="button" className="wl-submit" disabled={busy} onClick={() => checkout()}>
            {busy ? 'Opening Stripe' : 'Continue to Stripe'}
          </button>
          <p className="wl-foot">
            <Link href="/pricing" className="wl-link">
              Back to plans
            </Link>
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="signin-dark-lock wl-page st-page">
      <main className="wl-card st-card">
        <h1 className="wl-title">
          Start your free <span className="st-accent">Advanced</span> trial
        </h1>
        <p className="wl-sub">
          Create your account, then add a card on Stripe. Advanced is free for 1 month, then billed{' '}
          {billing === 'quarterly' ? 'quarterly' : 'yearly'}.
        </p>
        {periodToggle}
        <form className="wl-form" onSubmit={submit} noValidate>
          <div className="wl-row">
            <Field id="st-first" label="First name" required error={errors.firstName}>
              <input
                id="st-first"
                className="wl-input"
                autoComplete="given-name"
                maxLength={60}
                value={f.firstName}
                onChange={set('firstName')}
                aria-invalid={!!errors.firstName || undefined}
              />
            </Field>
            <Field id="st-last" label="Last name" required error={errors.lastName}>
              <input
                id="st-last"
                className="wl-input"
                autoComplete="family-name"
                maxLength={60}
                value={f.lastName}
                onChange={set('lastName')}
                aria-invalid={!!errors.lastName || undefined}
              />
            </Field>
          </div>
          <Field id="st-email" label="Email" required error={errors.email}>
            <input
              id="st-email"
              type="email"
              className="wl-input"
              autoComplete="email"
              value={f.email}
              onChange={set('email')}
              aria-invalid={!!errors.email || undefined}
            />
          </Field>
          <Field
            id="st-username"
            label="Username"
            required
            error={errors.username}
            hint="Letters, numbers and underscores only"
          >
            <input
              id="st-username"
              className="wl-input"
              autoComplete="username"
              maxLength={30}
              value={f.username}
              onChange={(e) =>
                setF((s) => ({
                  ...s,
                  username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                }))
              }
              aria-invalid={!!errors.username || undefined}
            />
          </Field>
          <div className="wl-pwd">
            <PasswordStrengthField
              id="password"
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="Create a password"
              showRequirements
            />
          </div>
          {errors.password ? (
            <p className="wl-err" role="alert">
              {errors.password}
            </p>
          ) : null}
          <div className="wl-pwd">
            <PasswordStrengthField
              id="confirm-password"
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              placeholder="Confirm your password"
              showRequirements={false}
            />
          </div>
          {errors.confirm ? (
            <p className="wl-err" role="alert">
              {errors.confirm}
            </p>
          ) : null}
          <div className="wl-field">
            <label className="wl-check" htmlFor="st-age">
              <input
                id="st-age"
                type="checkbox"
                checked={ageOk}
                onChange={(e) => setAgeOk(e.target.checked)}
                required
                aria-invalid={!!errors.ageConfirmed || undefined}
              />
              <span>
                {AGE_CONFIRM_TEXT}
                <span className="wl-req"> *</span>
              </span>
            </label>
            {errors.ageConfirmed ? (
              <p className="wl-err" role="alert">
                {errors.ageConfirmed}
              </p>
            ) : null}
          </div>
          {terms}
          {alertBlock}
          <button type="submit" className="wl-submit" disabled={busy}>
            {busy ? 'Opening Stripe' : 'Continue to add a card'}
          </button>
        </form>
        <p className="wl-foot">
          Already have an account?{' '}
          <Link href="/auth/signin?redirect=/pricing" className="wl-link">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
