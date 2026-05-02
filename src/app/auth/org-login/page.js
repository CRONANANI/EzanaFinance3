import OrgSignInCard from '@/components/auth/OrgSignInCard';

export const metadata = {
  title: 'Organizational Login | Ezana Finance',
  description: 'Sign in with your university investment council credentials.',
};

export default function OrgLoginPage({ searchParams }) {
  const redirectTo =
    typeof searchParams?.redirect === 'string' && searchParams.redirect.startsWith('/')
      ? searchParams.redirect
      : '/home';

  return (
    <div className="signin-dark-lock flex min-h-screen w-full items-center justify-center bg-[#0a0e13]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>
      <OrgSignInCard redirectTo={redirectTo} />
    </div>
  );
}
