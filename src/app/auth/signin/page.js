import AuthShell from '@/components/auth/AuthShell';
import SignInCard from '@/components/auth/SignInCard';
import { safeInternalPath } from '@/lib/sanitize';

export const metadata = {
  title: 'Sign In | Ezana Finance',
  description:
    'Sign in to your Ezana Finance account to access institutional-grade market intelligence.',
};

export default function SignInPage({ searchParams }) {
  /* ?redirect= is canonical; ?next= is accepted too (older links, the brief's
     /sign-in?next= form). */
  const requested = searchParams?.redirect ?? searchParams?.next;
  const redirectTo = safeInternalPath(requested, '') !== '' ? safeInternalPath(requested) : '/home';
  const oauthErrorMessage =
    typeof searchParams?.error === 'string' ? searchParams.error : undefined;

  return (
    <AuthShell>
      <SignInCard redirectTo={redirectTo} oauthErrorMessage={oauthErrorMessage} />
    </AuthShell>
  );
}
