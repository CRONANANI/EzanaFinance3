import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';
import { GlowButton } from '@/components/ui/glow-button';
import { redirect } from 'next/navigation';
import { getUserClient } from '@/lib/supabase';
import { safeInternalPath } from '@/lib/sanitize';
import { switchAccount, startNewAccount } from './actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Continue | Ezana Finance',
  description: 'Continue to Ezana Finance with your account, or switch accounts.',
  robots: { index: false },
};

/**
 * /auth/continue: the one door every marketing Log in / Sign up button uses.
 *
 * Signed out: straight to the auth page (sign-up for ?intent=signup, sign-in
 * when a destination was named, otherwise the account-type chooser at
 * /auth/login), carrying ?next= as ?redirect=.
 * Signed in: never a silent drop into the app. The visitor chooses to continue
 * as the signed-in account, use a different one, or create a new one (both of
 * which sign out on the server first). Renders under /auth, so no app nav.
 */
export default async function ContinuePage({ searchParams }) {
  const next = safeInternalPath(searchParams?.next ?? searchParams?.redirect, '');
  const intent = searchParams?.intent === 'signup' ? 'signup' : 'login';
  const ref = typeof searchParams?.ref === 'string' ? searchParams.ref.slice(0, 16) : '';

  let user = null;
  try {
    const { data } = await getUserClient().auth.getUser();
    user = data?.user ?? null;
  } catch {
    user = null;
  }

  if (!user) {
    const params = new URLSearchParams();
    if (next) params.set('redirect', next);
    if (intent === 'signup') {
      if (ref) params.set('ref', ref);
      redirect(`/auth/signup${params.size ? `?${params}` : ''}`);
    }
    redirect(next ? `/auth/signin?${params}` : '/auth/login');
  }

  const dest = next || '/home';
  const who = user.email || user.user_metadata?.username || 'your account';
  const loginChoiceHref = `/auth/login${next ? `?redirect=${encodeURIComponent(next)}` : ''}`;

  return (
    <AuthShell>
      <div className="as-panel as-panel--wide">
        <h1 className="as-title">You&apos;re already signed in</h1>
        <p className="as-sub">Choose how you&apos;d like to continue.</p>

        <div className="as-stack">
          <Link href={dest} className="as-btn as-btn--primary">
            Continue as <strong className="truncate">{who}</strong>
          </Link>

          <form action={switchAccount}>
            <input type="hidden" name="next" value={dest} />
            <GlowButton type="submit" tone="light" className="as-btn as-btn--glow">
              Use a different account
            </GlowButton>
          </form>

          <form action={startNewAccount}>
            <input type="hidden" name="next" value={dest} />
            <input type="hidden" name="ref" value={ref} />
            <GlowButton type="submit" tone="light" className="as-btn as-btn--glow">
              Join the waitlist
            </GlowButton>
          </form>
        </div>

        <div className="as-foot">
          <p>
            <Link href={loginChoiceHref} className="as-link">
              Partner or organization login
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
