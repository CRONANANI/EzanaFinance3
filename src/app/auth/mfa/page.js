import MfaChallengeCard from '@/components/auth/MfaChallengeCard';

export const metadata = {
  title: "Verify it's you | Ezana Finance",
  description: 'Complete two-factor authentication to finish signing in.',
};

export default function MfaPage({ searchParams }) {
  const redirectTo =
    typeof searchParams?.redirect === 'string' && searchParams.redirect.startsWith('/')
      ? searchParams.redirect
      : '/home';

  return (
    <div className="signin-dark-lock flex min-h-screen w-full items-center justify-center p-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />
      </div>
      <MfaChallengeCard redirectTo={redirectTo} />
    </div>
  );
}
