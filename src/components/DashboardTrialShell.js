'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { getTrialStatus } from '@/lib/trial';
import { hasActiveSubscription } from '@/lib/subscription';
import { TrialExpiredGate } from '@/components/TrialExpiredGate';
import { usePartner } from '@/contexts/PartnerContext';
import { useAuth } from '@/components/AuthProvider';

function shouldSkipTrialCheck(pathname, isPartner) {
  if (isPartner) return true;
  if (!pathname) return false;
  if (pathname === '/pricing' || pathname === '/subscribe') return true;
  if (pathname === '/select-plan') return true;
  if (pathname === '/onboarding') return true;
  if (pathname.startsWith('/payment/')) return true;
  if (pathname.startsWith('/auth')) return true;
  /* Ezana Echo is public reading; the trial gate never applies, and waiting
     on it put a spinner where the server-rendered page should be. */
  if (pathname === '/ezana-echo' || pathname.startsWith('/ezana-echo/')) return true;
  const partnerPrefixes = [
    '/partner-home',
    '/partner-dashboard',
    '/partner-community',
    '/partner-learning',
  ];
  return partnerPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/* The trial verdict (user → org membership → profile → trial state) does not
   depend on the route, so one resolution is valid for the whole SPA session.
   Cached at module level so client-side navigations apply it synchronously
   instead of unmounting the page behind a spinner while three network calls
   re-run — that re-check on every hop, with no error handling, was what made
   page-to-page navigation hang in a permanent loading state whenever one of
   the calls failed or stalled. */
let trialVerdictCache = null; // { userId, blocked, needsOnboarding }

/* Perf (Nov 2026): the verdict is also kept in sessionStorage, so a full page
   load (refresh, new tab, typed URL) applies the last verdict straight after
   hydration instead of holding the whole page behind a spinner for three
   database round trips. It is still re-resolved in the background on every
   load, exactly as on a client-side navigation, so a stale or edited value
   lasts for one request. This is a display gate; RLS protects the data. */
const VERDICT_STORAGE_KEY = 'ezana.trial-verdict.v1';

function readStoredVerdict() {
  try {
    const raw = window.sessionStorage.getItem(VERDICT_STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object') return null;
    return {
      userId: typeof v.userId === 'string' ? v.userId : null,
      blocked: v.blocked === true,
      needsOnboarding: v.needsOnboarding === true,
    };
  } catch {
    return null;
  }
}

function setVerdictCache(verdict) {
  trialVerdictCache = verdict;
  try {
    if (verdict) window.sessionStorage.setItem(VERDICT_STORAGE_KEY, JSON.stringify(verdict));
    else window.sessionStorage.removeItem(VERDICT_STORAGE_KEY);
  } catch {
    /* sessionStorage unavailable: the in-memory cache still works */
  }
}

const VERDICT_TIMEOUT_MS = 8000;

function verdictTimeout() {
  // Resolves null rather than rejecting: a timed-out check fails open and is
  // NOT cached, so the next navigation retries it in the background.
  return new Promise((resolve) => {
    setTimeout(() => resolve(null), VERDICT_TIMEOUT_MS);
  });
}

async function resolveTrialVerdict() {
  // getSession() reads the local session (same source AuthProvider uses) —
  // unlike getUser() it makes no network round trip and can't stall behind an
  // in-flight token refresh. The follow-up queries are RLS-authenticated, so
  // a revoked token still can't read anything it shouldn't.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    return { userId: null, blocked: false, needsOnboarding: false };
  }

  /* Perf (Nov 2026): the three reads below are independent, so they run
     together (one wait, not three in a row). The decisions that follow are
     unchanged and in the same order. The profile select is the superset the
     org and consumer branches used. A failed rewards read still just means
     "no reward". */
  const nowIso = new Date().toISOString();
  const [{ data: orgMember }, { data: profile }, rewardsRes] = await Promise.all([
    // Source of truth: org_members. Never apply the consumer trial/plan gate to council users.
    supabase
      .from('org_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select(
        'subscription_status, one_time_plan, one_time_plan_purchased_at, current_period_end, onboarding_completed, investor_questionnaire_completed',
      )
      .eq('id', user.id)
      .maybeSingle(),
    /* An active referral reward (a month of Personal, or a year of Personal
       Advanced) is access too. RLS lets a user read their own rewards; any
       error (for example before the referrals migration) just means none. */
    Promise.resolve(
      supabase
        .from('referral_rewards')
        .select('id')
        .eq('user_id', user.id)
        .lte('starts_at', nowIso)
        .gt('ends_at', nowIso)
        .limit(1),
    ).catch(() => ({ data: null, error: true })),
  ]);

  const needsOnboarding =
    profile?.onboarding_completed === true && profile?.investor_questionnaire_completed !== true;

  if (orgMember) {
    return { userId: user.id, blocked: false, needsOnboarding };
  }

  if (hasActiveSubscription(profile)) {
    return { userId: user.id, blocked: false, needsOnboarding };
  }

  if (!rewardsRes?.error && rewardsRes?.data?.length) {
    return { userId: user.id, blocked: false, needsOnboarding };
  }

  const trial = getTrialStatus(profile, user.created_at);
  return {
    userId: user.id,
    blocked: trial.trialExpired && trial.source === 'account',
    needsOnboarding,
  };
}

export function DashboardTrialShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isPartner } = usePartner();
  const { user: authUser, loading: authLoading } = useAuth();
  const authUserId = authUser?.id ?? null;
  const prevPathnameRef = useRef(null);
  const [ready, setReady] = useState(
    () => shouldSkipTrialCheck(pathname ?? '', isPartner) || trialVerdictCache !== null,
  );
  const [blocked, setBlocked] = useState(() => trialVerdictCache?.blocked ?? false);

  useEffect(() => {
    const path = pathname ?? '';
    const onOnboarding = path === '/onboarding' || path.startsWith('/onboarding');

    // Returning from the onboarding flow means the questionnaire may have just
    // been completed — drop the cached verdict so a stale needsOnboarding flag
    // can't bounce the user straight back to /onboarding.
    const cameFromOnboarding = prevPathnameRef.current?.startsWith('/onboarding') && !onOnboarding;
    prevPathnameRef.current = path;
    if (cameFromOnboarding) setVerdictCache(null);

    // Full page load: pick up the verdict stored earlier in this tab.
    if (!trialVerdictCache && !cameFromOnboarding) trialVerdictCache = readStoredVerdict();

    // Sign-out / account switch invalidates the cached verdict. While auth is
    // still resolving, authUserId is null and says nothing yet.
    if (!authLoading && trialVerdictCache && trialVerdictCache.userId !== authUserId) {
      setVerdictCache(null);
    }

    if (shouldSkipTrialCheck(path, isPartner)) {
      setReady(true);
      setBlocked(false);
      return;
    }

    // Stale-while-revalidate: apply the cached verdict immediately so the page
    // renders without a spinner, then refresh the verdict in the background.
    if (trialVerdictCache) {
      if (trialVerdictCache.needsOnboarding && !onOnboarding) {
        router.replace('/onboarding');
        return;
      }
      setBlocked(trialVerdictCache.blocked);
      setReady(true);
    }

    let cancelled = false;

    (async () => {
      try {
        const verdict = await Promise.race([resolveTrialVerdict(), verdictTimeout()]);
        if (cancelled) return;

        if (verdict) setVerdictCache(verdict);

        // Timed out → fail open for this navigation; the uncached verdict is
        // re-resolved on the next one.
        const v = verdict ?? { blocked: false, needsOnboarding: false };

        if (v.needsOnboarding && !onOnboarding) {
          router.replace('/onboarding');
          return;
        }
        setBlocked(v.blocked);
      } catch (err) {
        // Fall back to the cached verdict if we have one; otherwise fail
        // open — this is a soft display gate (RLS protects the data
        // server-side), and leaving the page wedged on a spinner because
        // one network call rejected is strictly worse.
        console.error('[DashboardTrialShell] trial check failed; failing open:', err);
        if (!cancelled) setBlocked(trialVerdictCache?.blocked ?? false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, isPartner, authUserId, authLoading, router]);

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
