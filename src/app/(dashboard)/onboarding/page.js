'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const finishOnboarding = async () => {
    setLoading(true);
    setError('');
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/signin?redirect=/onboarding');
        return;
      }

      const { error: upErr } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (upErr) {
        setError(upErr.message);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing') {
        router.replace('/home');
      } else {
        router.replace('/select-plan');
      }
    } catch (e) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full rounded-2xl border border-emerald-500/20 bg-[#0d1117]/90 p-8 text-center shadow-xl shadow-emerald-500/5">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700">
          <TrendingUp className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Welcome to Ezana Finance</h1>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          Your account is ready. Next, choose a plan and start your 7-day free trial — you won&apos;t be
          charged until the trial ends.
        </p>
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={finishOnboarding}
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 font-semibold text-white hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Continue'}
        </button>
        <p className="mt-6 text-xs text-gray-500">
          Need help?{' '}
          <Link href="/help-center" className="text-emerald-500 hover:underline">
            Visit the Help Center
          </Link>
        </p>
      </div>
    </div>
  );
}
