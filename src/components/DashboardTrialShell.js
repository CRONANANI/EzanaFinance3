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
  if (pathname === '/select-plan') return true;
  if (pathname === '/onboarding') return true;
  if (pathname.startsWith('/payment/')) return true;
  if (pathname.startsWith('/auth')) return true;
  const partnerPrefixes = ['/partner-home', '/partner-dashboard', '/partner-community', '/partner-learning'];
  return partnerPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function DashboardTrialShell({ children }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(() => shouldSkipTrialCheck(pathname ?? ''));
  const [blocked, setBlocked] = useState(false);
  const [bannerMode, setBannerMode] = useState('none');
  const [bannerDays, setBannerDays] = useState(0);

  useEffect(() => {
    if (shouldSkipTrialCheck(pathname ?? '')) {
      setReady(true);
      setBlocked(false);
      setBannerMode('none');
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
        setBannerMode('none');
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
        if (profile?.subscription_status === 'trialing' && trial.daysRemaining > 0) {
          setBannerMode('stripe');
          setBannerDays(trial.daysRemaining);
        } else {
          setBannerMode('none');
        }
        setReady(true);
        return;
      }

      if (trial.trialExpired && trial.source === 'account') {
        setBlocked(true);
        setBannerMode('none');
        setReady(true);
        return;
      }

      setBlocked(false);
      if (trial.source === 'account' && trial.daysRemaining <= 3 && trial.daysRemaining > 0) {
        setBannerMode('account');
        setBannerDays(trial.daysRemaining);
      } else {
        setBannerMode('none');
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!ready && !shouldSkipTrialCheck(pathname ?? '')) {
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

  return (
    <>
      {bannerMode === 'stripe' && (
        <TrialBanner variant="stripe" daysRemaining={bannerDays} trialExpired={false} />
      )}
      {bannerMode === 'account' && (
        <TrialBanner variant="account" daysRemaining={bannerDays} trialExpired={false} />
      )}
      {children}
    </>
  );
}
