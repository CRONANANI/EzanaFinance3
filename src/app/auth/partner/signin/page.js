import AuthShell from '@/components/auth/AuthShell';
import SignInCard from '@/components/auth/SignInCard';
import { safeInternalPath } from '@/lib/sanitize';

export const metadata = {
  title: 'Partner Login | Ezana Finance',
  description: 'Sign in to your Ezana Finance partner or creator account.',
};

export default function PartnerSignInPage({ searchParams }) {
  /* ?redirect= (set by the middleware and the legacy /auth/partner-login
     redirect) is honoured after sign-in; unsafe targets are dropped. */
  const requested = searchParams?.redirect ?? searchParams?.next;
  const redirectTo = safeInternalPath(requested, '') || undefined;
  const oauthErrorMessage =
    typeof searchParams?.error === 'string' ? searchParams.error : undefined;

  return (
    <AuthShell>
      <SignInCard variant="partner" redirectTo={redirectTo} oauthErrorMessage={oauthErrorMessage} />
    </AuthShell>
  );
}
