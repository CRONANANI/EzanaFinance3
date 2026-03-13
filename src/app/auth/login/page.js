import Link from 'next/link';

export const metadata = {
  title: 'Login | Ezana Finance',
  description: 'Sign in to your Ezana Finance account as a user or partner.',
};

export default function LoginChoicePage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0f0a]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4 p-8 rounded-2xl border border-[#10b981]/20 bg-[#0f1419]/95 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-white mb-2">Login</h1>
        <p className="text-[#9ca3af] mb-8">
          Choose how you would like to sign in to your account.
        </p>

        <div className="flex flex-col gap-4">
          <Link
            href="/auth/signin"
            className="flex items-center gap-4 p-4 rounded-xl border border-[#10b981]/30 bg-[#0d1117]/80 hover:bg-[#10b981]/10 hover:border-[#10b981]/50 transition-all group"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#10b981]/20 flex items-center justify-center group-hover:bg-[#10b981]/30 transition-colors">
              <i className="bi bi-person text-[#10b981] text-xl" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-white">Login as User</h2>
              <p className="text-sm text-[#9ca3af]">Access your portfolio and market intelligence</p>
            </div>
            <i className="bi bi-chevron-right text-[#10b981] opacity-70 group-hover:opacity-100 transition-opacity" />
          </Link>

          <Link
            href="/auth/partner/signin"
            className="flex items-center gap-4 p-4 rounded-xl border border-[#10b981]/30 bg-[#0d1117]/80 hover:bg-[#10b981]/10 hover:border-[#10b981]/50 transition-all group"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#10b981]/20 flex items-center justify-center group-hover:bg-[#10b981]/30 transition-colors">
              <i className="bi bi-briefcase text-[#10b981] text-xl" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-white">Login as Partner</h2>
              <p className="text-sm text-[#9ca3af]">Partner, creator, or professional money manager</p>
            </div>
            <i className="bi bi-chevron-right text-[#10b981] opacity-70 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>

        <p className="mt-6 text-center text-sm text-[#9ca3af]">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-[#10b981] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
