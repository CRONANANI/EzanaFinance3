'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PLANS } from '@/config/pricing';
import { supabase } from '@/lib/supabase';
import { hasActiveSubscription } from '@/lib/subscription';
import './pricing.css';

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled');

  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [loading, setLoading] = useState(null);
  const [signedIn, setSignedIn] = useState(false);
  const [hasPaidSubscription, setHasPaidSubscription] = useState(false);

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
        return;
      }
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
    if (!plan?.priceId) {
      alert('Set Stripe Price IDs in .env.local (NEXT_PUBLIC_STRIPE_PRICE_*).');
      return;
    }
    setLoading(planKey);
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
        alert(data.error);
        return;
      }

      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const showFreeBanner = signedIn && !hasPaidSubscription;

  return (
    <div className="pricing-page">
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
          const isPopular = key === 'personal_advanced_monthly' || key === 'personal_advanced_annual';
          const isPro = key === 'professional_monthly' || key === 'professional_annual';
          const displayPrice = plan.price.toLocaleString('en-US');

          return (
            <div key={key} className={`pricing-card${isPopular ? ' popular' : ''}${isPro ? ' professional' : ''}`}>
              {isPopular && <span className="pricing-popular-badge">Most Popular</span>}
              <h3>{plan.name}</h3>
              <p className="pricing-desc">
                {key === 'personal_monthly' || key === 'individual_annual'
                  ? 'For casual investors'
                  : key.includes('personal_advanced')
                    ? 'For active traders'
                    : key.startsWith('family')
                      ? 'Households & shared portfolios'
                      : key.startsWith('professional')
                        ? 'Full-time traders & family offices'
                        : ''}
              </p>
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
                disabled={loading === key}
              >
                {loading === key
                  ? 'Redirecting to checkout...'
                  : !plan.priceId
                    ? 'Configure price in Stripe'
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
