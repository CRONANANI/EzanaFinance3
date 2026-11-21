'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PLANS } from '@/config/pricing';
import { supabase } from '@/lib/supabase-browser';
import { hasActiveSubscription } from '@/lib/subscription';
import { getTrialStatus } from '@/lib/trial';
import RenewalTerms from '@/components/billing/RenewalTerms';
import { TRIAL_LABEL } from '@/lib/billing/renewal-terms';
import { PLAN_HIGHLIGHTS, RETAIL_PLANS } from '@/config/plan-features';
import '../pricing/pricing.css';

function SelectPlanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled');

  const [billingPeriod, setBillingPeriod] = useState('quarterly');
  const [loading, setLoading] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutNotice, setCheckoutNotice] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [hasPaidSubscription, setHasPaidSubscription] = useState(false);
  const [trialStatus, setTrialStatus] = useState(null);
  /* An account made by the Advanced trial signup can only start Advanced:
     Free and Starter stay waitlist-only for it (the server enforces this). */
  const [advancedOnly, setAdvancedOnly] = useState(false);

  /* Nov 21, 2026: the same plans, prices and benefits as /pricing, from the
     plan registry. Quarterly and yearly only; legacy monthly and
     Professional keys stay in the catalog for existing subscribers. */
  const period = billingPeriod === 'yearly' ? 'year' : 'quarter';
  const registryPlans = ['starter', 'advanced', 'family'].map((id) => {
    const key = RETAIL_PLANS[id].stripeKey[period];
    return [
      key,
      {
        ...PLANS[key],
        name: RETAIL_PLANS[id].name,
        description: RETAIL_PLANS[id].promise,
        features: (PLAN_HIGHLIGHTS[id] || PLAN_HIGHLIGHTS.advanced).map((h) => h.text),
        open: RETAIL_PLANS[id].availability === 'available',
      },
    ];
  });
  const freeEntry = [
    'free',
    {
      ...PLANS.free,
      description: RETAIL_PLANS.free.promise,
      features: PLAN_HIGHLIGHTS.free.map((h) => h.text),
    },
  ];
  const displayPlans = advancedOnly
    ? registryPlans.filter(([, p]) => p.open)
    : [freeEntry, ...registryPlans];

  const getSession = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await getSession();
      if (cancelled) return;
      setSignedIn(!!session);
      const meta = session?.user?.user_metadata || {};
      const app = session?.user?.app_metadata || {};
      setAdvancedOnly(
        app.signup_source === 'advanced_trial' ||
          meta.signup_source === 'advanced_trial' ||
          meta.requires_checkout === true,
      );
      if (!session?.user?.id) {
        setHasPaidSubscription(false);
        setTrialStatus(null);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select(
          'subscription_status, one_time_plan, one_time_plan_purchased_at, current_period_end',
        )
        .eq('id', session.user.id)
        .maybeSingle();
      if (cancelled) return;
      setHasPaidSubscription(hasActiveSubscription(profile));
      setTrialStatus(getTrialStatus(profile, session.user.created_at));
    })();
    return () => {
      cancelled = true;
    };
  }, [getSession]);

  const handleActivateFree = async () => {
    setLoading('free');
    setCheckoutError('');
    setCheckoutNotice('');
    try {
      const session = await getSession();
      if (!session?.access_token) {
        window.location.href = '/auth/signup?plan=free';
        return;
      }
      const res = await fetch('/api/auth/activate-free', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        window.location.href = '/home';
        return;
      }
      setCheckoutError(data?.error || 'Could not activate free plan. Please try again.');
    } catch (err) {
      console.error('[select-plan] activateFree error:', err);
      setCheckoutError('Could not connect. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleCheckout = async (planKey) => {
    const plan = PLANS[planKey];
    if (planKey === 'free') {
      await handleActivateFree();
      return;
    }
    if (!plan) return;
    setLoading(planKey);
    setCheckoutError('');
    setCheckoutNotice('');
    try {
      const session = await getSession();
      if (!session?.access_token) {
        window.location.href = `/auth/signin?redirect=${encodeURIComponent('/select-plan')}`;
        return;
      }
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planKey, cancelPath: '/select-plan' }),
      });
      const data = await response.json();

      if (data.error) {
        if (response.status === 401) {
          router.push('/auth/signin?redirect=/select-plan');
          return;
        }
        if (response.status === 503) {
          setCheckoutError(
            'Billing is temporarily unavailable. Please try again in a few minutes.',
          );
          return;
        }
        if (
          response.status === 500 &&
          typeof data.error === 'string' &&
          data.error.includes('configuration')
        ) {
          setCheckoutError('Billing setup error, please contact support.');
          return;
        }
        setCheckoutError(data.error);
        return;
      }

      /* A live subscription is switched in place, never a second Checkout. */
      if (data.alreadySubscribed) {
        setCheckoutNotice("You're already on this plan.");
        return;
      }
      if (data.switched) {
        window.location.href = data.url || '/home?checkout=switched';
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      setCheckoutError(
        err?.message
          ? `Couldn't start checkout: ${err.message}`
          : 'Could not connect to billing. Please try again.',
      );
    } finally {
      setLoading(null);
    }
  };

  const showFreeBanner = signedIn && !hasPaidSubscription;

  return (
    <div className="pricing-page">
      {checkoutNotice && (
        <div className="pricing-free-banner" role="status">
          <i className="bi bi-check-circle" aria-hidden="true" />
          <span>{checkoutNotice}</span>
        </div>
      )}
      {checkoutError && (
        <div
          className="pricing-free-banner"
          role="alert"
          style={{
            borderColor: 'rgba(239, 68, 68, 0.45)',
            background: 'rgba(239, 68, 68, 0.08)',
            color: '#fecaca',
          }}
        >
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          <span>{checkoutError}</span>
        </div>
      )}
      {canceled && (
        <div
          className="pricing-free-banner"
          role="status"
          style={{ borderColor: 'rgba(234, 179, 8, 0.5)' }}
        >
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          <span>Checkout was canceled. Pick a plan below when you&apos;re ready.</span>
        </div>
      )}
      {showFreeBanner && (
        <div className="pricing-free-banner" role="status">
          <i className="bi bi-info-circle" aria-hidden="true" />
          <span>
            Start your {TRIAL_LABEL} free trial. Enter payment on the next screen. You won&apos;t be
            charged until the trial ends.
          </span>
        </div>
      )}
      {signedIn && !hasPaidSubscription && trialStatus && (
        <div
          style={{
            background: trialStatus.trialExpired
              ? 'rgba(220, 38, 38, 0.1)'
              : 'rgba(16, 185, 129, 0.1)',
            border: `1px solid ${trialStatus.trialExpired ? 'rgba(220, 38, 38, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            borderRadius: '8px',
            padding: '12px 20px',
            marginBottom: '2rem',
            textAlign: 'center',
            fontSize: '0.9rem',
            color: trialStatus.trialExpired ? '#fca5a5' : '#6ee7b7',
          }}
        >
          {trialStatus.trialExpired
            ? 'Your free trial has ended. Choose a plan to continue.'
            : `You have ${trialStatus.daysRemaining} day${trialStatus.daysRemaining !== 1 ? 's' : ''} left on your free trial.`}
        </div>
      )}
      <div className="pricing-header">
        <h1>Choose your plan</h1>
        <p>
          {TRIAL_LABEL} free trial on every paid plan. Your card won&apos;t be charged until the
          trial ends. Cancel anytime before then and you won&apos;t be charged.
        </p>
        {!signedIn && (
          <p className="pricing-auth-hint">
            <Link href={`/auth/signin?redirect=${encodeURIComponent('/select-plan')}`}>
              Sign in
            </Link>{' '}
            to continue.
          </p>
        )}
        <div className="pricing-toggle">
          <button
            type="button"
            className={billingPeriod === 'quarterly' ? 'active' : ''}
            onClick={() => setBillingPeriod('quarterly')}
          >
            Quarterly
          </button>
          <button
            type="button"
            className={billingPeriod === 'yearly' ? 'active' : ''}
            onClick={() => setBillingPeriod('yearly')}
          >
            Yearly <span className="pricing-save">(Save about 20%)</span>
          </button>
        </div>
      </div>

      <div className="pricing-grid">
        {displayPlans.map(([key, plan]) => {
          const isFree = key === 'free';
          const isPopular = plan.open === true;
          const isPro = false;
          const displayPrice = plan.price.toLocaleString('en-US');
          const periodLabel =
            plan.interval === 'quarter' ? '/quarter' : plan.interval === 'year' ? '/year' : '';

          return (
            <div
              key={key}
              className={`pricing-card${isPopular ? ' popular' : ''}${isPro ? ' professional' : ''}`}
            >
              {isPopular && <span className="pricing-popular-badge">Available now</span>}
              <h3>{plan.name}</h3>
              <p className="pricing-desc">{plan.description || ''}</p>
              <div className="pricing-price">
                {isFree ? (
                  <>
                    Free<span> forever</span>
                  </>
                ) : (
                  <>
                    ${displayPrice}
                    <span>{periodLabel}</span>
                  </>
                )}
              </div>
              {isPro && (
                <p className="pricing-partner-note">Verified partners receive a discounted rate</p>
              )}
              <ul>
                {(plan.features || []).map((f, i) => (
                  <li key={i}>
                    <i className="bi bi-check" /> {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="pricing-btn primary"
                onClick={() => handleCheckout(key)}
                disabled={loading === key}
              >
                {loading === key
                  ? isFree
                    ? 'Activating…'
                    : 'Redirecting…'
                  : isFree
                    ? 'Get Started Free'
                    : hasPaidSubscription
                      ? 'Switch to this plan'
                      : 'Start free trial'}
              </button>
              {!isFree ? <RenewalTerms plan={plan} trial={!hasPaidSubscription} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SelectPlanPage() {
  return (
    <Suspense
      fallback={
        <div className="pricing-page">
          <p style={{ padding: '2rem' }}>Loading…</p>
        </div>
      }
    >
      <SelectPlanContent />
    </Suspense>
  );
}
