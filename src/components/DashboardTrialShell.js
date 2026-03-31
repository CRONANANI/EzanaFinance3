'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getTrialStatus } from '@/lib/trial';
import { hasActiveSubscription } from '@/lib/subscription';
import { TrialExpiredGate } from '@/components/TrialExpiredGate';
import { usePartner } from '@/contexts/PartnerContext';
import { useOrg } from '@/contexts/OrgContext';

function shouldSkipTrialCheck(pathname, isPartner) {
  if (isPartner) return true;
  if (!pathname) return false;
  if (pathname === '/pricing') return true;
  if (pathname === '/select-plan') return true;
  if (pathname === '/onboarding') return true;
  if (pathname.startsWith('/payment/')) return true;
  if (pathname.startsWith('/auth')) return true;
  const partnerPrefixes = ['/partner-home', '/partner-dashboard', '/partner-community', '/partner-learning'];
  return partnerPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function DashboardTrialShell({ children }) {
  const pathname = usePathname();
  const { isPartner } = usePartner();
  const { isOrgUser, isLoading: orgLoading } = useOrg();
  const [ready, setReady] = useState(() => shouldSkipTrialCheck(pathname ?? '', isPartner));
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (shouldSkipTrialCheck(pathname ?? '', isPartner)) {
      setReady(true);
      setBlocked(false);
      return;
    }

    // Org members (university investment council) are licensed at the org level — never gate on consumer trial/plan
    if (orgLoading) {
      setReady(false);
      setBlocked(false);
      return;
    }
    if (isOrgUser) {
      setBlocked(false);
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!user) {
        setBlocked(false);
        setReady(true);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, one_time_plan, one_time_plan_purchased_at, current_period_end')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      const trial = getTrialStatus(profile, user.created_at);

      if (hasActiveSubscription(profile)) {
        setBlocked(false);
        setReady(true);
        return;
      }

      if (trial.trialExpired && trial.source === 'account') {
        setBlocked(true);
        setReady(true);
        return;
      }

      setBlocked(false);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, isPartner, orgLoading, isOrgUser]);

  if (!ready && !shouldSkipTrialCheck(pathname ?? '', isPartner)) {
    return (
      <div
        className="dashboard-trial-loading"
        style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div
          className="h-10 w-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin"
          aria-hidden
        />
      </div>
    );
  }

  if (blocked) {
    return <TrialExpiredGate />;
  }

  return <>{children}</>;
}
