import Link from 'next/link';

export const metadata = {
  title: 'Login | Ezana Finance',
  description: 'Sign in to your Ezana Finance account as a user or partner.',
};

export default function LoginChoicePage() {
  return (
    <div className="signin-dark-lock relative min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0e13] px-4 py-10 text-[#f0f6fc]">
      {/* Ambient glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-emerald-500/12 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-teal-500/8 blur-3xl" />
      </div>

      <Link
        href="/"
        className="relative z-10 mb-6 text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:underline"
      >
        ← Back to home
      </Link>

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-emerald-500/15 bg-[#0d1117] p-8 shadow-2xl shadow-black/40">
        <h1 className="mb-2 text-2xl font-bold text-[#f0f6fc]">Login</h1>
        <p className="mb-8 text-[#8b949e]">Choose how you would like to sign in to your account.</p>

        <div className="flex flex-col gap-4">
          <Link
            href="/auth/signin"
            className="portal-login-choice group flex min-h-[6.5rem] items-center gap-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 transition-all hover:border-emerald-400/50 hover:bg-emerald-500/10"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 transition-colors group-hover:bg-emerald-500/25">
              <i className="bi bi-person text-xl text-emerald-400" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-[#f0f6fc]">Login as User</h2>
              <p className="text-sm text-[#8b949e]">Access your portfolio and market intelligence</p>
            </div>
            <i className="bi bi-chevron-right text-emerald-400 opacity-70 transition-opacity group-hover:opacity-100" />
          </Link>

          <Link
            href="/auth/partner-login"
            className="portal-login-choice group flex min-h-[6.5rem] items-center gap-4 rounded-xl border border-amber-400/25 bg-amber-500/5 p-4 transition-all hover:border-amber-400/50 hover:bg-amber-500/10"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/15 transition-colors group-hover:bg-amber-500/25">
              <i className="bi bi-patch-check-fill text-xl text-amber-400" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-[#f0f6fc]">Login as Partner</h2>
              <p className="text-sm text-[#8b949e]">Partner, creator, or professional money manager</p>
            </div>
            <i className="bi bi-chevron-right text-amber-400 opacity-70 transition-opacity group-hover:opacity-100" />
          </Link>

          <Link
            href="/auth/org-login"
            className="portal-login-choice group flex min-h-[6.5rem] items-center gap-4 rounded-xl border border-indigo-400/25 bg-indigo-500/5 p-4 transition-all hover:border-indigo-400/50 hover:bg-indigo-500/10"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 transition-colors group-hover:bg-indigo-500/25">
              <i className="bi bi-mortarboard-fill text-xl text-indigo-400" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-[#f0f6fc]">Organizational Login</h2>
              <p className="text-sm text-[#8b949e]">University investment council member</p>
            </div>
            <i className="bi bi-chevron-right text-indigo-400 opacity-70 transition-opacity group-hover:opacity-100" />
          </Link>
        </div>

        <p className="mt-6 text-center text-sm text-[#8b949e]">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="font-medium text-emerald-400 hover:text-emerald-300 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
