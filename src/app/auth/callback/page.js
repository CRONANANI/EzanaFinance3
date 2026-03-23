import { Suspense } from 'react';
import AuthCallbackClient from './AuthCallbackClient';

export const metadata = {
  title: 'Signing in | Ezana Finance',
  description: 'Completing your sign-in',
};

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0f0a]">
          <div className="h-10 w-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin mb-4" />
          <p className="text-sm text-gray-400">Loading…</p>
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
