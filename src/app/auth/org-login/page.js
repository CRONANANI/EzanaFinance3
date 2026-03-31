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
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0f0a]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>
      <OrgSignInCard redirectTo={redirectTo} />
    </div>
  );
}
