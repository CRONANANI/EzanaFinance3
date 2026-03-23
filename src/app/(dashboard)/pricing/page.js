'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { PLANS } from '@/lib/plans';
import { supabase } from '@/lib/supabase';
import './pricing.css';

const PAID_STATUSES = new Set(['active', 'trialing']);

export default function PricingPage() {
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
        .select('subscription_status')
        .eq('id', session.user.id)
        .maybeSingle();
      if (cancelled) return;
      const status = profile?.subscription_status;
      setHasPaidSubscription(!!status && PAID_STATUSES.has(status));
    })();
    return () => {
      cancelled = true;
    };
  }, [getSession]);

  const handleSubscribe = async (priceId) => {
    if (!priceId) {
      alert('Set Stripe Price IDs in your environment (NEXT_PUBLIC_STRIPE_PRICE_*).');
      return;
    }
    setLoading(priceId);
    try {
      const session = await getSession();
      if (!session?.access_token) {
        window.location.href = `/auth/login?redirect=${encodeURIComponent('/pricing')}`;
        return;
      }
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      alert(err.message || 'Could not start checkout');
    } finally {
      setLoading(null);
    }
  };

  const indMonthly = PLANS.individual_monthly;
  const indYearly = PLANS.individual_yearly;
  const advMonthly = PLANS.advanced_monthly;
  const advYearly = PLANS.advanced_yearly;
  const famMonthly = PLANS.family_monthly;
  const famYearly = PLANS.family_yearly;
  const proMonthly = PLANS.professional_monthly;
  const proYearly = PLANS.professional_yearly;

  const individualDisplay = billingCycle === 'yearly' ? '4' : '5';
  const advancedDisplay = billingCycle === 'yearly' ? '15' : '19';
  const familyDisplay = billingCycle === 'yearly' ? '39' : '49';
  const proDisplay = billingCycle === 'yearly' ? '95' : '119';

  const individualPriceId = billingCycle === 'yearly' ? indYearly.priceId : indMonthly.priceId;
  const advancedPriceId = billingCycle === 'yearly' ? advYearly.priceId : advMonthly.priceId;
  const familyPriceId = billingCycle === 'yearly' ? famYearly.priceId : famMonthly.priceId;
  const proPriceId = billingCycle === 'yearly' ? proYearly.priceId : proMonthly.priceId;

  const showFreeBanner = signedIn && !hasPaidSubscription;

  return (
    <div className="pricing-page">
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
            <Link href={`/auth/login?redirect=${encodeURIComponent('/pricing')}`}>Sign in</Link> to subscribe.
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
            Yearly <span className="pricing-save">Save 20%</span>
          </button>
        </div>
      </div>

      <div className="pricing-grid">
        <div className="pricing-card">
          <h3>{indMonthly.name}</h3>
          <p className="pricing-desc">For casual investors</p>
          <div className="pricing-price">
            ${individualDisplay}
            <span>/month</span>
          </div>
          {billingCycle === 'yearly' && <p className="pricing-annual">$48/year — save 20%</p>}
          <ul>
            {indMonthly.features.map((f, i) => (
              <li key={i}>
                <i className="bi bi-check" /> {f}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="pricing-btn primary"
            onClick={() => handleSubscribe(individualPriceId)}
            disabled={!!loading || !individualPriceId}
          >
            {loading === individualPriceId
              ? 'Loading…'
              : !individualPriceId
                ? 'Configure price in Stripe'
                : 'Start checkout'}
          </button>
        </div>

        <div className="pricing-card popular">
          <span className="pricing-popular-badge">Most Popular</span>
          <h3>{advMonthly.name}</h3>
          <p className="pricing-desc">For active traders</p>
          <div className="pricing-price">
            ${advancedDisplay}
            <span>/month</span>
          </div>
          {billingCycle === 'yearly' && <p className="pricing-annual">$180/year — save 20%</p>}
          <ul>
            {advMonthly.features.map((f, i) => (
              <li key={i}>
                <i className="bi bi-check" /> {f}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="pricing-btn primary"
            onClick={() => handleSubscribe(advancedPriceId)}
            disabled={!!loading || !advancedPriceId}
          >
            {loading === advancedPriceId
              ? 'Loading…'
              : !advancedPriceId
                ? 'Configure price in Stripe'
                : 'Start checkout'}
          </button>
        </div>

        <div className="pricing-card">
          <h3>{famMonthly.name}</h3>
          <p className="pricing-desc">Households & shared portfolios</p>
          <div className="pricing-price">
            ${familyDisplay}
            <span>/month</span>
          </div>
          {billingCycle === 'yearly' && <p className="pricing-annual">$468/year — save 20%</p>}
          <ul>
            {famMonthly.features.map((f, i) => (
              <li key={i}>
                <i className="bi bi-check" /> {f}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="pricing-btn primary"
            onClick={() => handleSubscribe(familyPriceId)}
            disabled={!!loading || !familyPriceId}
          >
            {loading === familyPriceId
              ? 'Loading…'
              : !familyPriceId
                ? 'Configure price in Stripe'
                : 'Start checkout'}
          </button>
        </div>

        <div className="pricing-card professional">
          <h3>{proMonthly.name}</h3>
          <p className="pricing-desc">Full-time traders & family offices</p>
          <div className="pricing-price">
            ${proDisplay}
            <span>/month</span>
          </div>
          {billingCycle === 'yearly' && <p className="pricing-annual">$1,140/year — save 20%</p>}
          <p className="pricing-partner-note">Verified partners receive a discounted rate</p>
          <ul>
            {proMonthly.features.map((f, i) => (
              <li key={i}>
                <i className="bi bi-check" /> {f}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="pricing-btn primary"
            onClick={() => handleSubscribe(proPriceId)}
            disabled={!!loading || !proPriceId}
          >
            {loading === proPriceId ? 'Loading…' : !proPriceId ? 'Configure price in Stripe' : 'Start checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}
