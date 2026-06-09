'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
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
  const partnerPrefixes = [
    '/partner-home',
    '/partner-dashboard',
    '/partner-community',
    '/partner-learning',
  ];
  return partnerPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/* The gate result rarely changes mid-session, so a passing check is cached
   per user (module scope = lifetime of the SPA session). Navigations render
   instantly from the cache and only revalidate in the background once the
   TTL lapses. Only the PASS outcome is cached — blocked / needs-onboarding
   outcomes always re-check so completing payment or the questionnaire
   unblocks the user immediately. */
const GATE_CACHE_TTL_MS = 5 * 60 * 1000;
let gatePassCache = null; // { userId, checkedAt }

/* Every awaited call is raced against this timeout so a dropped connection
   or a wedged auth lock can never strand the route behind the spinner. */
const GATE_STEP_TIMEOUT_MS = 8000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label || 'gate-check'} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/**
 * Resolves the gate outcome for a signed-in user:
 *   'pass'       — render the page
 *   'onboarding' — investor questionnaire incomplete, send to /onboarding
 *   'blocked'    — account trial expired with no active subscription
 */
async function checkGate(user) {
  // Source of truth: org_members — never apply consumer trial/plan gate to council users
  const { data: orgMember } = await withTimeout(
    supabase
      .from('org_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
    GATE_STEP_TIMEOUT_MS,
    'org_members lookup',
  );

  if (orgMember) {
    const { data: orgProfile } = await withTimeout(
      supabase
        .from('profiles')
        .select('onboarding_completed, investor_questionnaire_completed')
        .eq('id', user.id)
        .maybeSingle(),
      GATE_STEP_TIMEOUT_MS,
      'org profile lookup',
    );

    if (
      orgProfile?.onboarding_completed === true &&
      orgProfile?.investor_questionnaire_completed !== true
    ) {
      return 'onboarding';
    }
    return 'pass';
  }

  const { data: profile } = await withTimeout(
    supabase
      .from('profiles')
      .select(
        'subscription_status, one_time_plan, one_time_plan_purchased_at, current_period_end, onboarding_completed, investor_questionnaire_completed',
      )
      .eq('id', user.id)
      .maybeSingle(),
    GATE_STEP_TIMEOUT_MS,
    'profile lookup',
  );

  if (
    profile?.onboarding_completed === true &&
    profile?.investor_questionnaire_completed !== true
  ) {
    return 'onboarding';
  }

  if (hasActiveSubscription(profile)) {
    return 'pass';
  }

  const trial = getTrialStatus(profile, user.created_at);
  if (trial.trialExpired && trial.source === 'account') {
    return 'blocked';
  }

  return 'pass';
}

export function DashboardTrialShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isPartner } = usePartner();
  /* A still-valid pass from earlier in the session renders immediately —
     the blocking spinner only ever appears on the first check. */
  const [ready, setReady] = useState(
    () => shouldSkipTrialCheck(pathname ?? '', isPartner) || gatePassCache !== null,
  );
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (shouldSkipTrialCheck(pathname ?? '', isPartner)) {
      setReady(true);
      setBlocked(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // getSession() reads the local cookie/storage session — no network
        // round-trip per navigation. Server-side enforcement (middleware,
        // API routes) still validates the JWT with getUser().
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), GATE_STEP_TIMEOUT_MS, 'getSession');
        if (cancelled) return;

        const user = session?.user ?? null;
        if (!user) {
          gatePassCache = null;
          setBlocked(false);
          setReady(true);
          return;
        }

        const cached = gatePassCache && gatePassCache.userId === user.id ? gatePassCache : null;
        if (cached) {
          // Render from the last known-good pass; revalidate in the
          // background only once the cache goes stale.
          setBlocked(false);
          setReady(true);
          if (Date.now() - cached.checkedAt < GATE_CACHE_TTL_MS) return;
        } else {
          setReady(false);
        }

        const outcome = await checkGate(user);
        if (cancelled) return;

        if (outcome === 'onboarding') {
          gatePassCache = null;
          if (!(pathname ?? '').startsWith('/onboarding')) {
            router.replace('/onboarding');
            return;
          }
          setBlocked(false);
          setReady(true);
          return;
        }

        if (outcome === 'blocked') {
          gatePassCache = null;
          setBlocked(true);
          setReady(true);
          return;
        }

        gatePassCache = { userId: user.id, checkedAt: Date.now() };
        setBlocked(false);
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        /* Fail OPEN: this gate is a UX layer — access control is enforced
           server-side by the middleware and API routes. A transient network
           failure must never strand the user on an infinite spinner. */
        console.warn('[DashboardTrialShell] gate check failed, failing open:', err?.message || err);
        setBlocked(false);
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, isPartner, router]);

  if (!ready && !shouldSkipTrialCheck(pathname ?? '', isPartner)) {
    return (
      <div
        className="dashboard-trial-loading"
        style={{
          minHeight: '40vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
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
