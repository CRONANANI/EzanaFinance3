'use client';

/**
 * /auth/signup. Sign-up is invite-only, so this page has two modes:
 *
 *   default         Join the waitlist (POST /api/waitlist). Every existing
 *                   "Sign up" link and ?ref= share link lands here.
 *   ?invite=TOKEN   Create your account from a one-time invite. The token is
 *                   checked (GET /api/waitlist/invite), the account is created
 *                   server side (POST /api/auth/accept-invite), then we sign
 *                   in with the new password. No client-side signUp exists.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { PasswordStrengthField } from '@/components/ui/password-strength-field';
import { SpiralPasswordField } from '@/components/ui/spiral-password-field';
import ReferralCodeField from '@/components/auth/ReferralCodeField';
import OAuthButtons from '@/components/auth/OAuthButtons';
import '@/components/auth/auth-shell.css';
import { isValidCodeFormat, normalizeCode } from '@/lib/referrals';
import { safeInternalPath } from '@/lib/sanitize';
import { EMAIL_RE, validatePassword } from '@/lib/auth/password-rules';
import { AGE_CONFIRM_TEXT, WAITLIST_MARKETING_CONSENT_TEXT } from '@/lib/legal/consent';
import { WAITLIST_HEARD_FROM, WAITLIST_ROLES, WAITLIST_USE_CASE_MAX } from '@/lib/waitlist/options';
import './signup.css';

function readParams() {
  const p = new URLSearchParams(window.location.search);
  const dest = p.get('redirect') || p.get('next') || '';
  let error = p.get('error') || '';
  try {
    error = decodeURIComponent(error);
  } catch {
    /* keep raw */
  }
  return {
    invite: p.get('invite') || '',
    redirect: dest ? safeInternalPath(dest, '') : '',
    plan: (p.get('plan') || '').slice(0, 20),
    billing: ['monthly', 'quarterly'].includes(p.get('billing')) ? p.get('billing') : 'yearly',
    /* Back from Stripe's card step: card-saved or card-skipped. */
    waitlist: (p.get('waitlist') || '').slice(0, 20),
    ref: p.get('ref') ? normalizeCode(p.get('ref')).slice(0, 8) : '',
    error,
  };
}

function Brand() {
  return (
    <div className="wl-brand">
      <span className="wl-brand-mark" aria-hidden="true">
        <i className="bi bi-graph-up-arrow" />
      </span>
      <span className="wl-brand-name">Ezana Finance</span>
    </div>
  );
}

function Check({ id, checked, onChange, required, error, children }) {
  return (
    <div className="wl-field">
      <label className="wl-check" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        <span>
          {children}
          {required ? <span className="wl-req"> *</span> : null}
        </span>
      </label>
      {error ? (
        <p className="wl-err" id={`${id}-err`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

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

/* Paid plans on /pricing join the waitlist and then save a card on Stripe
   (Nov 21, 2026). The one-time token from /api/waitlist is kept in this tab's
   session storage so a visitor who backs out of Stripe can try again. */
const PAID_PLAN_NAMES = { starter: 'Starter', advanced: 'Advanced', family: 'Family' };
const CARD_TOKEN_KEY = 'ezana:waitlist-card-token';

function readCardToken() {
  try {
    return window.sessionStorage.getItem(CARD_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}
function writeCardToken(token) {
  try {
    if (token) window.sessionStorage.setItem(CARD_TOKEN_KEY, token);
    else window.sessionStorage.removeItem(CARD_TOKEN_KEY);
  } catch {
    /* storage is a convenience */
  }
}

/** Opens Stripe Checkout (setup mode) for a waitlist entry. Resolves to an error message, or navigates. */
async function openCardStep(token) {
  try {
    const res = await fetch('/api/stripe/waitlist-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.url) {
      window.location.assign(d.url);
      return '';
    }
    if (res.status === 404) writeCardToken('');
    return d.error || 'Could not open Stripe. Please try again.';
  } catch {
    return 'Could not reach Stripe. Please try again.';
  }
}

/** Shown when the visitor comes back from Stripe's card step. */
function CardStepResult({ outcome }) {
  const [token] = useState(() => readCardToken());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saved = outcome === 'card-saved';
  useEffect(() => {
    if (saved) writeCardToken('');
  }, [saved]);

  return (
    <div className="wl-done" role="status">
      <span className="wl-done-ic" aria-hidden="true">
        <i className={`bi ${saved ? 'bi-check2' : 'bi-credit-card'}`} />
      </span>
      <h1 className="wl-title">{saved ? "You're on the list." : 'Your card was not added.'}</h1>
      <p className="wl-sub">
        {saved
          ? "Your card is saved and nothing was charged. When you're accepted, we'll email your invite to a free 30-day Starter trial. Use Starter during the trial, move to Advanced right away, or choose when the trial ends."
          : "You're still on the waitlist. Add a card to be ready for your free 30-day trial the moment you're accepted."}
      </p>
      {!saved && token ? (
        <>
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
              const msg = await openCardStep(token);
              if (msg) {
                setError(msg);
                setBusy(false);
              }
            }}
          >
            {busy ? 'Opening Stripe' : 'Add a card on Stripe'}
          </button>
        </>
      ) : null}
      <div className="wl-links">
        <Link href="/" className="wl-link">
          Back to home
        </Link>
        <Link href="/pricing" className="wl-link">
          View plans
        </Link>
      </div>
    </div>
  );
}

/* ── Mode 1: join the waitlist ── */
function WaitlistForm({ params }) {
  const [f, setF] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    organization: '',
    useCase: '',
    heardFrom: '',
  });
  const [ageOk, setAgeOk] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [referralCode, setReferralCode] = useState(params.ref);
  const [referralOpen, setReferralOpen] = useState(!!params.ref);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(params.error);
  const [busy, setBusy] = useState(false);
  const [doneEmail, setDoneEmail] = useState('');

  const paidPlan = PAID_PLAN_NAMES[params.plan] ? params.plan : '';
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const signinHref = params.redirect
    ? `/auth/signin?redirect=${encodeURIComponent(params.redirect)}`
    : '/auth/signin';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = {};
    if (!f.firstName.trim()) errs.firstName = 'Enter your first name.';
    if (!f.lastName.trim()) errs.lastName = 'Enter your last name.';
    if (!EMAIL_RE.test(f.email.trim())) errs.email = 'Enter a valid email address.';
    if (!f.role) errs.role = 'Choose what describes you.';
    if (!ageOk) errs.ageConfirmed = 'You must be 18 or older to use Ezana.';
    if (referralCode && !isValidCodeFormat(referralCode)) {
      errs.referralCode = 'That referral code does not look right.';
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...f,
          email: f.email.trim(),
          referralCode: referralCode || undefined,
          ageConfirmed: ageOk,
          marketingConsent: marketing,
          marketingConsentText: WAITLIST_MARKETING_CONSENT_TEXT,
          plan: params.plan || undefined,
          billing: paidPlan ? params.billing : undefined,
          redirect: params.redirect || undefined,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.success) {
        /* Paid plan, new entry: straight on to Stripe to save a card. */
        if (paidPlan && d.checkoutToken) {
          writeCardToken(d.checkoutToken);
          const msg = await openCardStep(d.checkoutToken);
          if (!msg) return;
          setError(`You're on the waitlist, but ${msg.charAt(0).toLowerCase()}${msg.slice(1)}`);
        }
        setDoneEmail(f.email.trim());
        return;
      }
      if (d.errors) setErrors(d.errors);
      setError(
        res.status === 429
          ? 'Too many attempts. Try again in a minute.'
          : d.error || 'Could not join the waitlist. Please try again.',
      );
    } catch {
      setError('Could not reach Ezana. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (doneEmail) {
    return (
      <div className="wl-done" role="status">
        <span className="wl-done-ic" aria-hidden="true">
          <i className="bi bi-check2" />
        </span>
        <h1 className="wl-title">You&apos;re on the list.</h1>
        <p className="wl-sub">We&apos;ll email {doneEmail} when your invite is ready.</p>
        {error ? (
          <div className="wl-alert" role="alert">
            {error}
          </div>
        ) : null}
        <div className="wl-links">
          <Link href="/" className="wl-link">
            Back to home
          </Link>
          <span>
            Already have an account?{' '}
            <Link href={signinHref} className="wl-link">
              Sign in
            </Link>
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="wl-title">Join the Ezana waitlist</h1>
      {paidPlan ? (
        <p className="wl-sub">
          You picked {PAID_PLAN_NAMES[paidPlan]} ({params.billing}). Enter your details, then add a
          card on Stripe. Nothing is charged: when you&apos;re accepted you&apos;ll be invited to a
          free 30-day Starter trial, and you can move to Advanced at any time.
        </p>
      ) : (
        <p className="wl-sub">
          Ezana is opening access in waves. Tell us a little about you and we&apos;ll email you an
          invite.
        </p>
      )}
      {error ? (
        <div className="wl-alert" role="alert">
          {error}
        </div>
      ) : null}
      <form className="wl-form" onSubmit={submit} noValidate>
        <div className="wl-row">
          <Field id="wl-first" label="First name" required error={errors.firstName}>
            <input
              id="wl-first"
              className="wl-input"
              autoComplete="given-name"
              maxLength={60}
              value={f.firstName}
              onChange={set('firstName')}
              aria-invalid={!!errors.firstName || undefined}
            />
          </Field>
          <Field id="wl-last" label="Last name" required error={errors.lastName}>
            <input
              id="wl-last"
              className="wl-input"
              autoComplete="family-name"
              maxLength={60}
              value={f.lastName}
              onChange={set('lastName')}
              aria-invalid={!!errors.lastName || undefined}
            />
          </Field>
        </div>
        <Field id="wl-email" label="Email" required error={errors.email}>
          <input
            id="wl-email"
            type="email"
            className="wl-input"
            autoComplete="email"
            value={f.email}
            onChange={set('email')}
            aria-invalid={!!errors.email || undefined}
          />
        </Field>
        <Field id="wl-role" label="I am a" required error={errors.role}>
          <select
            id="wl-role"
            className="wl-input wl-select"
            value={f.role}
            onChange={set('role')}
            aria-invalid={!!errors.role || undefined}
          >
            <option value="">Choose one</option>
            {WAITLIST_ROLES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="wl-org" label="Organization or university" error={errors.organization}>
          <input
            id="wl-org"
            className="wl-input"
            autoComplete="organization"
            maxLength={120}
            value={f.organization}
            onChange={set('organization')}
          />
        </Field>
        <Field id="wl-use" label="What do you want to use Ezana for?" error={errors.useCase}>
          <textarea
            id="wl-use"
            className="wl-input wl-textarea"
            rows={3}
            maxLength={WAITLIST_USE_CASE_MAX}
            value={f.useCase}
            onChange={set('useCase')}
            aria-describedby="wl-use-count"
          />
          <span id="wl-use-count" className="wl-count">
            {f.useCase.length}/{WAITLIST_USE_CASE_MAX}
          </span>
        </Field>
        <Field id="wl-heard" label="How did you hear about us?" error={errors.heardFrom}>
          <select
            id="wl-heard"
            className="wl-input wl-select"
            value={f.heardFrom}
            onChange={set('heardFrom')}
          >
            <option value="">Choose one (optional)</option>
            {WAITLIST_HEARD_FROM.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <ReferralCodeField
          value={referralCode}
          onChange={setReferralCode}
          open={referralOpen}
          onOpenChange={setReferralOpen}
        />
        {errors.referralCode ? (
          <p className="wl-err" role="alert">
            {errors.referralCode}
          </p>
        ) : null}
        <Check id="wl-age" checked={ageOk} onChange={setAgeOk} required error={errors.ageConfirmed}>
          {AGE_CONFIRM_TEXT}
        </Check>
        <Check id="wl-news" checked={marketing} onChange={setMarketing}>
          {WAITLIST_MARKETING_CONSENT_TEXT}
        </Check>
        <button type="submit" className="wl-submit" disabled={busy}>
          {busy
            ? paidPlan
              ? 'Opening Stripe'
              : 'Joining'
            : paidPlan
              ? 'Continue to add a card'
              : 'Join the waitlist'}
        </button>
      </form>
      <p className="wl-foot">
        Already have an account?{' '}
        <Link href={signinHref} className="wl-link">
          Sign in
        </Link>
      </p>
    </>
  );
}

/* ── Mode 2: create the account from an invite ── */
function InviteForm({ token }) {
  const router = useRouter();
  const [invite, setInvite] = useState(null); // null while checking, false if dead
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ageOk, setAgeOk] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/waitlist/invite?token=${encodeURIComponent(token)}`)
      .then((r) => r.json().catch(() => ({})))
      .then((d) => alive && setInvite(d?.ok ? d : false))
      .catch(() => alive && setInvite(false));
    return () => {
      alive = false;
    };
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = {};
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      errs.username = 'Use 3 to 30 lowercase letters, numbers or underscores.';
    }
    const pwd = validatePassword(password);
    if (pwd.length) errs.password = `Password must contain: ${pwd.join(', ')}`;
    else if (password !== confirm) errs.confirm = 'Passwords do not match.';
    if (!ageOk) errs.ageConfirmed = 'You must be 18 or older to use Ezana.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, username, password, ageConfirmed: ageOk }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) {
        if (d.field) setErrors({ [d.field]: d.error });
        else if (res.status === 404) setInvite(false);
        else setError(d.error || 'Could not create the account. Please try again.');
        return;
      }
      const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({
        email: d.email,
        password,
      });
      if (signInErr) {
        router.push('/auth/signin');
        return;
      }
      if (d.referralCode && isValidCodeFormat(d.referralCode)) {
        try {
          await fetch('/api/referrals/apply', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(signIn?.session?.access_token
                ? { Authorization: `Bearer ${signIn.session.access_token}` }
                : {}),
            },
            body: JSON.stringify({ code: d.referralCode }),
          });
        } catch {
          /* the account already exists; a referral never blocks it */
        }
      }
      router.push(safeInternalPath(d.redirect || '', '/home'));
    } catch {
      setError('Could not reach Ezana. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (invite === null) {
    return (
      <div className="wl-skel" aria-busy="true" aria-label="Checking your invite">
        <span className="wl-skel-line wl-skel-line--title" />
        <span className="wl-skel-line" />
        <span className="wl-skel-line" />
      </div>
    );
  }

  if (invite === false) {
    return (
      <div className="wl-done" role="status">
        <span className="wl-done-ic wl-done-ic--warn" aria-hidden="true">
          <i className="bi bi-link-45deg" />
        </span>
        <h1 className="wl-title">This invite link is invalid or has expired.</h1>
        <p className="wl-sub">Invite links work once and last 14 days.</p>
        <div className="wl-links">
          <Link href="/auth/signup" className="wl-link">
            Join the waitlist
          </Link>
          <Link href="/auth/signin" className="wl-link">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="wl-title">You&apos;re in. Create your account</h1>
      <p className="wl-sub">
        Welcome{invite.firstName ? `, ${invite.firstName}` : ''}. Choose a username and password.
      </p>
      {error ? (
        <div className="wl-alert" role="alert">
          {error}
        </div>
      ) : null}
      <form className="wl-form" onSubmit={submit} noValidate>
        <Field id="wl-inv-email" label="Email">
          <input id="wl-inv-email" className="wl-input" value={invite.email} readOnly />
        </Field>
        <Field
          id="wl-username"
          label="Username"
          required
          error={errors.username}
          hint="Letters, numbers and underscores only"
        >
          <input
            id="wl-username"
            className="wl-input"
            autoComplete="username"
            maxLength={30}
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
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
        <Check
          id="wl-inv-age"
          checked={ageOk}
          onChange={setAgeOk}
          required
          error={errors.ageConfirmed}
        >
          {AGE_CONFIRM_TEXT}
        </Check>
        <button type="submit" className="wl-submit" disabled={busy}>
          {busy ? 'Creating account' : 'Create account'}
        </button>
      </form>
      {/* An invited email can also finish with Google or GitHub: the provider
          proves the same address the invite link does (/auth/callback). */}
      <div className="as-scope wl-oauth">
        <OAuthButtons flow="signup" onError={setError} />
      </div>
      <p className="wl-foot">
        Already have an account?{' '}
        <Link href="/auth/signin" className="wl-link">
          Sign in
        </Link>
      </p>
    </>
  );
}

export default function SignUpPage() {
  const [params, setParams] = useState(null);
  useEffect(() => setParams(readParams()), []);

  return (
    <div className="signin-dark-lock wl-page">
      <main className="wl-card">
        <Brand />
        {!params ? null : params.invite ? (
          <InviteForm token={params.invite} />
        ) : params.waitlist === 'card-saved' || params.waitlist === 'card-skipped' ? (
          <CardStepResult outcome={params.waitlist} />
        ) : (
          <WaitlistForm params={params} />
        )}
      </main>
    </div>
  );
}
