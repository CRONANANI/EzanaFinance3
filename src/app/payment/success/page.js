'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PaymentSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    async function completeOnboarding() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          onboarding_completed: true,
          has_seen_tutorial: false,
        }).eq('id', user.id);
      }
      setTimeout(() => router.push('/home'), 3000);
    }
    completeOnboarding();
  }, [router]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', textAlign: 'center', padding: '2rem' }}>
      <div>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h1 style={{ color: '#fff', fontSize: '1.8rem', marginBottom: '0.5rem' }}>Welcome to Ezana Finance!</h1>
        <p style={{ color: '#10b981', marginBottom: '0.5rem' }}>Your 7-day free trial has started.</p>
        <p style={{ color: '#888', marginBottom: '2rem', maxWidth: '28rem', margin: '0 auto 2rem' }}>You won&apos;t be charged until your trial ends. Cancel anytime.</p>
        <p style={{ color: '#555', fontSize: '0.85rem' }}>Redirecting to your dashboard…</p>
      </div>
    </div>
  );
}
