'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PLANS } from '@/config/pricing';
import { supabase } from '@/lib/supabase';
import { hasActiveSubscription } from '@/lib/subscription';
import { getTrialStatus } from '@/lib/trial';
import './subscribe.css';

function SubscribeCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled');

  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [loading, setLoading] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [hasPaidSubscription, setHasPaidSubscription] = useState(false);
  const [trialStatus, setTrialStatus] = useState(null);

  const monthlyPlans = Object.entries(PLANS).filter(([, p]) => p.interval === 'month');
  const annualPlans = Object.entries(PLANS).filter(([, p]) => p.interval === 'year');
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
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, one_time_plan, one_time_plan_purchased_at, current_period_end')
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

  const handleCheckout = async (planKey) => {
    const plan = PLANS[planKey];
    if (!plan?.priceId) return;
    setLoading(planKey);
    setCheckoutError('');
    try {
      const session = await getSession();
      if (!session?.access_token) {
        window.location.href = `/auth/signin?redirect=${encodeURIComponent('/subscribe')}`;
        return;
      }
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planKey, cancelPath: '/subscribe' }),
      });
      const data = await response.json();

      if (data.error) {
        if (response.status === 401) {
          router.push('/auth/signin?redirect=/subscribe');
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
      <p style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '0.8125rem' }}>
        <Link href="/pricing" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
          ← Back to plans overview
        </Link>
      </p>
      <div className="pricing-header">
        <h1>Choose Your Plan</h1>
        <p>
          7-day free trial on every plan. Your card won&apos;t be charged until the trial ends. Cancel
          anytime before then.
        </p>
        {!signedIn && (
          <p className="pricing-auth-hint">
            <Link href={`/auth/signin?redirect=${encodeURIComponent('/subscribe')}`}>Sign in</Link> to subscribe.
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
          const periodLabel = plan.interval === 'month' ? '/month' : '/year';

          return (
            <div key={key} className={`pricing-card${isPopular ? ' popular' : ''}${isPro ? ' professional' : ''}`}>
              {isPopular && <span className="pricing-popular-badge">Most Popular</span>}
              <h3>{plan.name}</h3>
              <p className="pricing-desc">{plan.description || ''}</p>
              <div className="pricing-price">
                ${displayPrice}
                <span>{periodLabel}</span>
              </div>
              {isPro && <p className="pricing-partner-note">Verified partners receive a discounted rate</p>}
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
                  ? 'Redirecting…'
                  : !plan.priceId
                    ? 'Coming soon'
                    : 'Start free trial'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <div className="subscribe-checkout-page">
      <Suspense fallback={<div className="pricing-page"><p style={{ padding: '2rem' }}>Loading…</p></div>}>
        <SubscribeCheckoutContent />
      </Suspense>
    </div>
  );
}
