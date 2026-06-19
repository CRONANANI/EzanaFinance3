'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { InvestorQuestionnaire } from '@/components/onboarding/InvestorQuestionnaire';
import { OrgQuestionnaire } from '@/components/onboarding/OrgQuestionnaire';
import { PartnerQuestionnaire } from '@/components/onboarding/PartnerQuestionnaire';
import './onboarding.css';

export default function OnboardingPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [orgRole, setOrgRole] = useState(null); /* null = regular user, string = org role */
  const [isPartner, setIsPartner] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) {
          router.replace('/auth/login');
          return;
        }

        /* Partner detection (mirrors PartnerContext): an active partners row. */
        const { data: partnerRow } = await supabase
          .from('partners')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
        if (cancelled) return;
        const partner = !!partnerRow;
        setIsPartner(partner);

        /* Check if already completed */
        const { data: profile } = await supabase
          .from('profiles')
          .select('investor_questionnaire_completed')
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled) return;
        if (profile?.investor_questionnaire_completed) {
          router.replace(partner ? '/partner-home' : '/home');
          return;
        }

        /* Org membership only matters for non-partners. */
        if (!partner) {
          const { data: orgMember } = await supabase
            .from('org_members')
            .select('role')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

          if (cancelled) return;
          if (orgMember?.role) {
            setOrgRole(orgMember.role);
          }
        }

        setUserId(user.id);
        setChecking(false);
      } catch (err) {
        console.error('[onboarding] setup failed:', err);
        if (!cancelled) {
          router.replace('/auth/login');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleComplete = async () => {
    if (userId) {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          // Set the questionnaire flag too: this is the flag the access gate
          // (DashboardTrialShell + this page's own guard) checks. Marking
          // onboarding complete without it left users — notably org members
          // routed through OrgQuestionnaire — stuck in a redirect loop back to
          // /onboarding, so their dashboard/org pages never loaded.
          investor_questionnaire_completed: true,
          onboarding_step: 99,
          has_seen_tutorial: false,
        })
        .eq('id', userId);
    }
    router.replace(isPartner ? '/partner-home' : '/home');
  };

  if (checking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          color: '#6b7280',
          fontSize: '0.875rem',
        }}
      >
        Loading…
      </div>
    );
  }

  /* Partners get the partner onboarding questionnaire (investing interests +
     content direction — no overlap with the partner application). */
  if (isPartner) {
    return <PartnerQuestionnaire userId={userId} onComplete={handleComplete} />;
  }

  /* Org users get role-specific questionnaire */
  if (orgRole) {
    return <OrgQuestionnaire userId={userId} role={orgRole} onComplete={handleComplete} />;
  }

  /* Regular users get the standard investor questionnaire */
  return <InvestorQuestionnaire userId={userId} onComplete={handleComplete} />;
}
