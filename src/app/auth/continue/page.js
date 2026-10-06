import Link from 'next/link';
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
    <div className="signin-dark-lock relative flex min-h-screen w-full flex-col items-center justify-center bg-[#f8fafb] px-4 py-10 text-[#0f172a]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-emerald-500/12 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-teal-500/8 blur-3xl" />
      </div>

      <Link
        href="/"
        className="relative z-10 mb-6 inline-flex min-h-11 items-center text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
      >
        <i className="bi bi-arrow-left mr-1.5" aria-hidden="true" />
        Back to home
      </Link>

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-emerald-500/20 bg-white p-8 shadow-xl shadow-slate-200/60">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">You&apos;re already signed in</h1>
        <p className="mb-8 text-slate-600">Choose how you&apos;d like to continue.</p>

        <div className="flex flex-col gap-3">
          <Link
            href={dest}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Continue as <span className="truncate font-bold">{who}</span>
          </Link>

          <form action={switchAccount}>
            <input type="hidden" name="next" value={dest} />
            <button
              type="submit"
              className="flex min-h-12 w-full items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 font-semibold text-slate-900 transition-colors hover:bg-emerald-500/10"
            >
              Use a different account
            </button>
          </form>

          <form action={startNewAccount}>
            <input type="hidden" name="next" value={dest} />
            <input type="hidden" name="ref" value={ref} />
            <button
              type="submit"
              className="flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Join the waitlist
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link href={loginChoiceHref} className="font-medium text-emerald-600 hover:underline">
            Partner or organization login
          </Link>
        </p>
      </div>
    </div>
  );
}
