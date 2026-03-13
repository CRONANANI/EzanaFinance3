'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SignInCard from '@/components/auth/SignInCard';
import { useAuth } from '@/components/AuthProvider';

export function BacktestSignInClient() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/for-the-quants');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0f0a]">
        <div className="text-emerald-500">Redirecting...</div>
      </div>
    );
  }

  return <SignInCard redirectTo="/for-the-quants" />;
}
