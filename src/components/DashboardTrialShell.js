'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getTrialStatus } from '@/lib/trial';
import { hasActiveSubscription } from '@/lib/subscription';
import { TrialExpiredGate } from '@/components/TrialExpiredGate';
import { usePartner } from '@/contexts/PartnerContext';

function shouldSkipTrialCheck(pathname, isPartner) {
  if (isPartner) return true;
  if (!pathname) return false;
  if (pathname === '/pricing' || pathname === '/subscribe') return true;
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
  const [ready, setReady] = useState(() => shouldSkipTrialCheck(pathname ?? '', isPartner));
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (shouldSkipTrialCheck(pathname ?? '', isPartner)) {
      setReady(true);
      setBlocked(false);
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

      // Source of truth: org_members — never apply consumer trial/plan gate to council users
      const { data: orgMember } = await supabase
        .from('org_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (orgMember) {
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
  }, [pathname, isPartner]);

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
