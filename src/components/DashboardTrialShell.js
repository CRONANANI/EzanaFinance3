'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getTrialStatus } from '@/lib/trial';
import { hasActiveSubscription } from '@/lib/subscription';
import { TrialBanner } from '@/components/TrialBanner';
import { TrialExpiredGate } from '@/components/TrialExpiredGate';

function shouldSkipTrialCheck(pathname) {
  if (!pathname) return false;
  if (pathname === '/pricing') return true;
  if (pathname.startsWith('/auth')) return true;
  const partnerPrefixes = ['/partner-home', '/partner-dashboard', '/partner-community', '/partner-learning'];
  return partnerPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function DashboardTrialShell({ children }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(() => shouldSkipTrialCheck(pathname ?? ''));
  const [blocked, setBlocked] = useState(false);
  const [showUrgentBanner, setShowUrgentBanner] = useState(false);
  const [bannerDays, setBannerDays] = useState(0);

  useEffect(() => {
    if (shouldSkipTrialCheck(pathname ?? '')) {
      setReady(true);
      setBlocked(false);
      setShowUrgentBanner(false);
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
        setShowUrgentBanner(false);
        setReady(true);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, one_time_plan, one_time_plan_purchased_at')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      const paid = hasActiveSubscription(profile);
      const trial = getTrialStatus(user.created_at);

      if (paid) {
        setBlocked(false);
        setShowUrgentBanner(false);
        setReady(true);
        return;
      }

      if (trial.trialExpired) {
        setBlocked(true);
        setShowUrgentBanner(false);
        setReady(true);
        return;
      }

      setBlocked(false);
      setShowUrgentBanner(trial.daysRemaining <= 3 && trial.daysRemaining > 0);
      setBannerDays(trial.daysRemaining);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!ready && !shouldSkipTrialCheck(pathname ?? '')) {
    return (
      <div className="dashboard-trial-loading" style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

  return (
    <>
      {showUrgentBanner && <TrialBanner daysRemaining={bannerDays} trialExpired={false} />}
      {children}
    </>
  );
}
