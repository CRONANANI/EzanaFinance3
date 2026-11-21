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
import { SpiralPasswordField } from '@/components/ui/spiral-password-field';
import { EMAIL_RE, validatePassword } from '@/lib/auth/password-rules';
import { AGE_CONFIRM_TEXT } from '@/lib/legal/consent';
import { PLANS } from '@/config/pricing';
import { priceAndPeriod } from '@/lib/billing/renewal-terms';
import '@/components/auth/auth-shell.css';
import '../signup/signup.css';

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

/** Opens Stripe Checkout for Advanced. Resolves to an error message, or navigates. */
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
      return '';
    }
    if (res.ok && (d.alreadySubscribed || d.switched)) {
      window.location.assign(d.url || '/home');
      return '';
    }
    return d.error || 'Could not open Stripe. Please try again.';
  } catch {
    return 'Could not reach Stripe. Please try again.';
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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('billing') === 'quarterly') setBilling('quarterly');
    setCanceled(p.get('canceled') === 'true');
    supabase.auth.getSession().then(({ data }) => setSession(data?.session || null));
  }, []);

  const plan = PLANS[PLAN_KEY[billing]];
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
    if (Object.keys(errs).length) return;

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
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: d.email,
        password,
      });
      if (signInErr) {
        setError('Your account was created. Sign in to finish starting your trial.');
        setBusy(false);
        return;
      }
      const msg = await openCheckout(billing);
      if (msg) {
        setError(msg);
        setBusy(false);
      }
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

  /* Signed in already (e.g. back from Stripe without finishing): one button. */
  if (session) {
    return (
      <div className="signin-dark-lock wl-page">
        <main className="wl-card">
          <h1 className="wl-title">
            {canceled ? 'Your trial has not started yet' : 'Start your free Advanced trial'}
          </h1>
          {terms}
          {error ? (
            <div className="wl-alert" role="alert">
              {error}
            </div>
          ) : null}
          <button
            type="button"
            className="wl-submit"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const msg = await openCheckout(billing);
              if (msg) {
                setError(msg);
                setBusy(false);
              }
            }}
          >
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
    <div className="signin-dark-lock wl-page">
      <main className="wl-card">
        <h1 className="wl-title">Start your free Advanced trial</h1>
        <p className="wl-sub">
          Create your account, then add a card on Stripe. Advanced is free for 1 month (
          {billing === 'quarterly' ? 'billed quarterly' : 'billed yearly'} after that).
        </p>
        {error ? (
          <div className="wl-alert" role="alert">
            {error}
          </div>
        ) : null}
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
          <SpiralPasswordField>
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
          </SpiralPasswordField>
          {errors.password ? (
            <p className="wl-err" role="alert">
              {errors.password}
            </p>
          ) : null}
          <SpiralPasswordField>
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
          </SpiralPasswordField>
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
