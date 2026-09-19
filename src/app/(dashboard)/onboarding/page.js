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
  const [completeError, setCompleteError] = useState(null);

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
    // Completion flags are written by POST /api/onboarding/complete (service-role
    // client, immune to the browser auth-lock hangs documented in
    // supabase-browser.js). v2: navigation is gated on VERIFIED persistence —
    // routing to /home on an unpersisted flag only feeds the middleware bounce
    // loop, which is exactly how users got stuck after question 7.
    setCompleteError(null);

    let ok = false;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      // Send BOTH cookie credentials and the bearer token so the route
      // authenticates even if one auth path is stale.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({}),
        signal: controller.signal,
        keepalive: true,
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => null);
      ok = res.ok && data?.completed === true;
      if (!ok) console.error('[onboarding] complete API:', res.status, data);
    } catch (err) {
      console.error('[onboarding] complete API failed:', err);
    }

    // Fallback: one browser-client attempt, hard-capped at 4s so a wedged
    // auth lock can never trap the user on this screen. Both completion flags
    // are set here as well as in the route: marking onboarding complete
    // without investor_questionnaire_completed left users (notably org members
    // routed through OrgQuestionnaire) in a redirect loop back to /onboarding.
    // The race resolves on timeout without telling us whether the write
    // landed, so a verification read decides, not the absence of a throw.
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

      try {
        const { data: check } = await Promise.race([
          supabase
            .from('profiles')
            .select('investor_questionnaire_completed')
            .eq('id', userId)
            .maybeSingle(),
          new Promise((resolve) => {
            setTimeout(() => resolve({ data: null }), 3000);
          }),
        ]);
        ok = check?.investor_questionnaire_completed === true;
      } catch {
        /* stays not-ok */
      }
    }

    if (ok) {
      router.replace(isPartner ? '/partner-home' : '/home');
    } else {
      setCompleteError(
        'We could not save your completion. Check your connection and press Continue again; if it keeps failing, contact support@ezana.world.',
      );
    }
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
    return (
      <PartnerQuestionnaire
        userId={userId}
        onComplete={handleComplete}
        completeError={completeError}
      />
    );
  }

  /* Org users get role-specific questionnaire */
  if (orgRole) {
    return (
      <OrgQuestionnaire
        userId={userId}
        role={orgRole}
        onComplete={handleComplete}
        completeError={completeError}
      />
    );
  }

  /* Regular users get the standard investor questionnaire */
  return (
    <InvestorQuestionnaire
      userId={userId}
      onComplete={handleComplete}
      completeError={completeError}
    />
  );
}
