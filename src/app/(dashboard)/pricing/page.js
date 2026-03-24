'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PLANS } from '@/config/pricing';
import { supabase } from '@/lib/supabase';
import { hasActiveSubscription } from '@/lib/subscription';
import { getTrialStatus } from '@/lib/trial';
import './pricing.css';

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled');

  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [loading, setLoading] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [hasPaidSubscription, setHasPaidSubscription] = useState(false);
  const [trialStatus, setTrialStatus] = useState(null);

  const monthlyPlans = Object.entries(PLANS).filter(([, p]) => p.mode === 'subscription');
  const annualPlans = Object.entries(PLANS).filter(([, p]) => p.mode === 'payment');
  const displayPlans = billingPeriod === 'monthly' ? monthlyPlans : annualPlans;

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
      if (!session?.user?.id) {
        setHasPaidSubscription(false);
        setTrialStatus(null);
        return;
      }
      setTrialStatus(getTrialStatus(session.user.created_at));
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, one_time_plan, one_time_plan_purchased_at')
        .eq('id', session.user.id)
        .maybeSingle();
      if (cancelled) return;
      setHasPaidSubscription(hasActiveSubscription(profile));
    })();
    return () => {
      cancelled = true;
    };
  }, [getSession]);

  const handleCheckout = async (planKey) => {
    const plan = PLANS[planKey];
    if (!plan?.priceId) return;
    setLoading(planKey);
    setCheckoutError('');
    try {
      const session = await getSession();
      if (!session?.access_token) {
        window.location.href = `/auth/signin?redirect=${encodeURIComponent('/pricing')}`;
        return;
      }
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planKey }),
      });
      const data = await response.json();

      if (data.error) {
        if (response.status === 401) {
          router.push('/auth/signin?redirect=/pricing');
          return;
        }
        setCheckoutError(data.error);
        return;
      }

      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      setCheckoutError('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const showFreeBanner = signedIn && !hasPaidSubscription;

  return (
    <div className="pricing-page">
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
        <div className="pricing-free-banner" role="status" style={{ borderColor: 'rgba(234, 179, 8, 0.5)' }}>
          <i className="bi bi-exclamation-triangle" aria-hidden="true" />
          <span>Payment was canceled. Try again below.</span>
        </div>
      )}
      {showFreeBanner && (
        <div className="pricing-free-banner" role="status">
          <i className="bi bi-info-circle" aria-hidden="true" />
          <span>
            You&apos;re currently on free access with limited features. Choose a plan below to unlock the
            full platform.
          </span>
        </div>
      )}
      {signedIn && !hasPaidSubscription && trialStatus && (
        <div
          style={{
            background: trialStatus.trialExpired ? 'rgba(220, 38, 38, 0.1)' : 'rgba(16, 185, 129, 0.1)',
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
        <h1>Choose Your Plan</h1>
        <p>All paid plans include a 14-day trial where configured in Stripe. Cancel anytime.</p>
        {!signedIn && (
          <p className="pricing-auth-hint">
            <Link href={`/auth/signin?redirect=${encodeURIComponent('/pricing')}`}>Sign in</Link> to subscribe.
          </p>
        )}
        <div className="pricing-toggle">
          <button
            type="button"
            className={billingPeriod === 'monthly' ? 'active' : ''}
            onClick={() => setBillingPeriod('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={billingPeriod === 'annual' ? 'active' : ''}
            onClick={() => setBillingPeriod('annual')}
          >
            Annual <span className="pricing-save">(Save)</span>
          </button>
        </div>
      </div>

      <div className="pricing-grid">
        {displayPlans.map(([key, plan]) => {
          const isPopular = plan.popular === true;
          const isPro = key === 'professional_monthly' || key === 'professional_annual';
          const displayPrice = plan.price.toLocaleString('en-US');

          return (
            <div key={key} className={`pricing-card${isPopular ? ' popular' : ''}${isPro ? ' professional' : ''}`}>
              {isPopular && <span className="pricing-popular-badge">Most Popular</span>}
              <h3>{plan.name}</h3>
              <p className="pricing-desc">{plan.description || ''}</p>
              <div className="pricing-price">
                ${displayPrice}
                <span>{plan.mode === 'subscription' ? '/month' : '/year'}</span>
              </div>
              {isPro && <p className="pricing-partner-note">Verified partners receive a discounted rate</p>}
              {plan.mode === 'payment' && (
                <p className="pricing-annual">One-time payment (billed once per year)</p>
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
                disabled={loading === key || !plan.priceId}
              >
                {loading === key
                  ? 'Redirecting...'
                  : !plan.priceId
                    ? 'Coming soon'
                    : plan.mode === 'payment'
                      ? 'Pay annually'
                      : 'Get Started'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="pricing-page"><p style={{ padding: '2rem' }}>Loading…</p></div>}>
      <PricingContent />
    </Suspense>
  );
}
