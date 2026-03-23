'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PLANS } from '@/config/pricing';
import { supabase } from '@/lib/supabase';
import { hasActiveSubscription } from '@/lib/subscription';
import './pricing.css';

const TIERS = [
  { monthly: 'personal_monthly', annual: 'individual_annual' },
  { monthly: 'personal_advanced_monthly', annual: 'personal_advanced_annual' },
  { monthly: 'family_monthly', annual: 'family_annual' },
  { monthly: 'professional_monthly', annual: 'professional_annual' },
];

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get('canceled');

  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(null);
  const [signedIn, setSignedIn] = useState(false);
  const [hasPaidSubscription, setHasPaidSubscription] = useState(false);

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

  const handleSubscribe = async (planKey) => {
    const plan = PLANS[planKey];
    if (!plan?.priceId || plan.priceId.includes('REPLACE')) {
      alert('Set Stripe Price IDs in your environment (NEXT_PUBLIC_STRIPE_PRICE_*).');
      return;
    }
    setLoading(planKey);
    try {
      const session = await getSession();
      if (!session?.access_token) {
        window.location.href = `/auth/signin?redirect=${encodeURIComponent('/pricing')}`;
        return;
      }
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planKey }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push('/auth/signin?redirect=/pricing');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      alert(err.message || 'Could not start checkout');
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
          <span>Payment was canceled. You can try again below.</span>
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
            className={billingCycle === 'monthly' ? 'active' : ''}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={billingCycle === 'yearly' ? 'active' : ''}
            onClick={() => setBillingCycle('yearly')}
          >
            Annual <span className="pricing-save">One-time</span>
          </button>
        </div>
      </div>

      <div className="pricing-grid">
        {TIERS.map((tier, idx) => {
          const planKey = billingCycle === 'yearly' ? tier.annual : tier.monthly;
          const plan = PLANS[planKey];
          const isPopular = idx === 1;
          const isPro = idx === 3;

          const displayPrice = plan.price.toLocaleString('en-US');

          return (
            <div key={planKey} className={`pricing-card${isPopular ? ' popular' : ''}${isPro ? ' professional' : ''}`}>
              {isPopular && <span className="pricing-popular-badge">Most Popular</span>}
              <h3>{plan.name}</h3>
              <p className="pricing-desc">
                {idx === 0 && 'For casual investors'}
                {idx === 1 && 'For active traders'}
                {idx === 2 && 'Households & shared portfolios'}
                {idx === 3 && 'Full-time traders & family offices'}
              </p>
              <div className="pricing-price">
                ${displayPrice}
                <span>{billingCycle === 'yearly' ? '/year (one-time)' : '/month'}</span>
              </div>
              {isPro && <p className="pricing-partner-note">Verified partners receive a discounted rate</p>}
              {billingCycle === 'yearly' && <p className="pricing-annual">Billed once per year</p>}
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
                onClick={() => handleSubscribe(planKey)}
                disabled={!!loading}
              >
                {loading === planKey
                  ? 'Loading…'
                  : !plan.priceId || plan.priceId.includes('REPLACE')
                    ? 'Configure price in Stripe'
                    : billingCycle === 'yearly'
                      ? 'Pay annually'
                      : 'Start checkout'}
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
