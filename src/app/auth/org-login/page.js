import AuthShell from '@/components/auth/AuthShell';
import OrgSignInCard from '@/components/auth/OrgSignInCard';
import OrgInviteAccept from '@/components/auth/OrgInviteAccept';
import { safeInternalPath } from '@/lib/sanitize';

export const metadata = {
  title: 'Organizational Login | Ezana Finance',
  description: 'Sign in with your university investment council credentials.',
};

export default function OrgLoginPage({ searchParams }) {
  const redirectTo =
    safeInternalPath(searchParams?.redirect, '') !== ''
      ? safeInternalPath(searchParams?.redirect)
      : '/org-team-hub';
  // Invite links (copied from Settings > Organization > Invite & Onboarding)
  // land here as ?invite=TOKEN and get the accept screen instead of sign-in.
  const invite = typeof searchParams?.invite === 'string' ? searchParams.invite : '';

  return (
    <AuthShell>
      {invite ? <OrgInviteAccept token={invite} /> : <OrgSignInCard redirectTo={redirectTo} />}
    </AuthShell>
  );
}
