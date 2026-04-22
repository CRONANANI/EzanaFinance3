import Link from 'next/link';
import { PageContainer } from '@/components/Layout/PageContainer';

export const metadata = {
  title: 'Login | Ezana Finance',
  description: 'Sign in to your Ezana Finance account as a user or partner.',
};

export default function LoginChoicePage() {
  return (
    <div className="min-h-[100svh] w-full bg-[#f4f7f5]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl" />
      </div>

      <PageContainer
        maxWidth="md"
        className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center"
      >
      <Link
        href="/"
        className="mb-6 text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
      >
        ← Back to home
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-gray-200/90 bg-white p-6 shadow-lg shadow-gray-200/40 sm:p-8">
        <h1 className="text-page-title mb-2 text-gray-900">Login</h1>
        <p className="mb-8 text-gray-600">Choose how you would like to sign in to your account.</p>

        <div className="flex flex-col gap-4">
          <Link
            href="/auth/signin"
            className="portal-login-choice group flex min-h-[6.5rem] items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 transition-all hover:border-emerald-400 hover:bg-emerald-50"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 transition-colors group-hover:bg-emerald-200">
              <i className="bi bi-person text-xl text-emerald-700" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">Login as User</h2>
              <p className="text-sm text-gray-600">Access your portfolio and market intelligence</p>
            </div>
            <i className="bi bi-chevron-right text-emerald-600 opacity-70 transition-opacity group-hover:opacity-100" />
          </Link>

          <Link
            href="/auth/partner-login"
            className="portal-login-choice group flex min-h-[6.5rem] items-center gap-4 rounded-xl border border-amber-200 bg-amber-50/40 p-4 transition-all hover:border-amber-300 hover:bg-amber-50/80"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 transition-colors group-hover:bg-amber-200">
              <i className="bi bi-patch-check-fill text-xl text-amber-800" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">Login as Partner</h2>
              <p className="text-sm text-gray-600">Partner, creator, or professional money manager</p>
            </div>
            <i className="bi bi-chevron-right text-amber-700 opacity-70 transition-opacity group-hover:opacity-100" />
          </Link>

          <Link
            href="/auth/org-login"
            className="portal-login-choice group flex min-h-[6.5rem] items-center gap-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 transition-all hover:border-indigo-300 hover:bg-indigo-50/80"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100 transition-colors group-hover:bg-indigo-200">
              <i className="bi bi-mortarboard-fill text-xl text-indigo-700" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">Organizational Login</h2>
              <p className="text-sm text-gray-600">University investment council member</p>
            </div>
            <i className="bi bi-chevron-right text-indigo-600 opacity-70 transition-opacity group-hover:opacity-100" />
          </Link>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
      </PageContainer>
    </div>
  );
}
