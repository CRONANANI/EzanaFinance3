'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { InvestorQuestionnaire } from '@/components/onboarding/InvestorQuestionnaire';
import { OrgQuestionnaire } from '@/components/onboarding/OrgQuestionnaire';
import './onboarding.css';

export default function OnboardingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [orgRole, setOrgRole] = useState(null); /* null = regular user, string = org role */
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      /* Check if already completed */
      const { data: profile } = await supabase
        .from('profiles')
        .select('investor_questionnaire_completed')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.investor_questionnaire_completed) {
        router.replace('/home');
        return;
      }

      /* Check if org member */
      const { data: orgMember } = await supabase
        .from('org_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (orgMember?.role) {
        setOrgRole(orgMember.role);
      }

      setUserId(user.id);
      setChecking(false);
    })();
  }, [router]);

  const handleComplete = async () => {
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
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0e13',
          color: '#8b949e',
          fontSize: '0.875rem',
        }}
      >
        Loading…
      </div>
    );
  }

  /* Org users get role-specific questionnaire */
  if (orgRole) {
    return <OrgQuestionnaire userId={userId} role={orgRole} onComplete={handleComplete} />;
  }

  /* Regular users get the standard investor questionnaire */
  return <InvestorQuestionnaire userId={userId} onComplete={handleComplete} />;
}
