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
    // Completion flags are written by POST /api/onboarding/complete (server
    // client, immune to the browser auth-lock hangs documented in
    // supabase-browser.js). The old implementation awaited an unbounded
    // browser-client update here, so a wedged lock made "Continue to Ezana"
    // do nothing at all.
    let ok = false;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: controller.signal,
        keepalive: true,
      });
      clearTimeout(timer);
      ok = res.ok;
      if (!res.ok) {
        console.error('[onboarding] complete API returned', res.status);
      }
    } catch (err) {
      console.error('[onboarding] complete API failed:', err);
    }

    // Fallback: one browser-client attempt, hard-capped at 4s so a wedged
    // auth lock can never trap the user on this screen. Both completion flags
    // are set here as well as in the route: marking onboarding complete
    // without investor_questionnaire_completed left users (notably org members
    // routed through OrgQuestionnaire) in a redirect loop back to /onboarding.
    // If both writes fail the middleware bounces back to /onboarding, where the
    // resume path re-finalizes; that is strictly better than a frozen button.
    if (!ok && userId) {
      try {
        await Promise.race([
          supabase
            .from('profiles')
            .update({
              onboarding_completed: true,
              investor_questionnaire_completed: true,
              onboarding_step: 99,
              has_seen_tutorial: false,
            })
            .eq('id', userId),
          new Promise((resolve) => {
            setTimeout(resolve, 4000);
          }),
        ]);
      } catch (err) {
        console.error('[onboarding] fallback update failed:', err);
      }
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
