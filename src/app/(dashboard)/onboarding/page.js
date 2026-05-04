'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { InvestorQuestionnaire } from '@/components/onboarding/InvestorQuestionnaire';
import './onboarding.css';

export default function OnboardingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      /* Check if questionnaire is already completed */
      const { data: profile } = await supabase
        .from('profiles')
        .select('investor_questionnaire_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.investor_questionnaire_completed) {
        /* Already done — skip to dashboard */
        router.replace('/home');
        return;
      }

      setUserId(user.id);
      setChecking(false);
    })();
  }, [router]);

  const handleComplete = async () => {
    /* Mark onboarding as completed too (for the old flag) */
    if (userId) {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_step: 99,
          has_seen_tutorial: false,
        })
        .eq('id', userId);
    }
    router.replace('/home');
  };

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0e13',
        color: '#8b949e',
        fontSize: '0.875rem',
      }}>
        Loading…
      </div>
    );
  }

  return <InvestorQuestionnaire userId={userId} onComplete={handleComplete} />;
}
