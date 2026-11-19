import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';
import { safeInternalPath } from '@/lib/sanitize';

export const metadata = {
  title: 'Login | Ezana Finance',
  description: 'Sign in to your Ezana Finance account as a user or partner.',
};

export default function LoginChoicePage({ searchParams }) {
  /* Carry a destination (e.g. from /auth/continue) through to each sign-in. */
  const target = safeInternalPath(searchParams?.redirect ?? searchParams?.next, '');
  const withRedirect = (href) => (target ? `${href}?redirect=${encodeURIComponent(target)}` : href);
  const choices = [
    {
      href: '/auth/signin',
      tone: '',
      icon: 'bi-person',
      title: 'Login as User',
      text: 'Access your portfolio and market intelligence',
    },
    {
      href: '/auth/partner/signin',
      tone: ' as-choice--gold',
      icon: 'bi-patch-check-fill',
      title: 'Login as Partner',
      text: 'Partner, creator, or professional money manager',
    },
    {
      href: '/auth/org-login',
      tone: ' as-choice--org',
      icon: 'bi-mortarboard-fill',
      title: 'Organizational Login',
      text: 'University investment council member',
    },
  ];
  return (
    <AuthShell>
      <div className="as-panel as-panel--wide">
        <h1 className="as-title">Login</h1>
        <p className="as-sub">Choose how you would like to sign in to your account.</p>

        <div className="as-choices">
          {choices.map((c) => (
            <Link
              key={c.href}
              href={withRedirect(c.href)}
              className={`portal-login-choice as-choice${c.tone}`}
            >
              <span className="as-choice-ic" aria-hidden="true">
                <i className={`bi ${c.icon}`} />
              </span>
              <span className="as-choice-body">
                <h2 className="as-choice-title">{c.title}</h2>
                <span className="as-choice-text">{c.text}</span>
              </span>
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </Link>
          ))}
        </div>

        <div className="as-foot">
          <p>
            Don&apos;t have an account?{' '}
            <Link href={withRedirect('/auth/signup')} className="as-link">
              Join the waitlist
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
