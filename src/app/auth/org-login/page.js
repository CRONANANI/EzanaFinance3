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
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f4f7f5]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-violet-400/15 blur-3xl" />
      </div>
      <OrgSignInCard redirectTo={redirectTo} />
    </div>
  );
}
