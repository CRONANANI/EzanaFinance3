'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { PLANS } from '@/lib/plans';
import { supabase } from '@/lib/supabase';
import './pricing.css';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(null);
  const [signedIn, setSignedIn] = useState(false);

  const getSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }, []);

  useEffect(() => {
    getSession().then((s) => setSignedIn(!!s));
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
  const famMonthly = PLANS.family_monthly;
  const famYearly = PLANS.family_yearly;
  const proMonthly = PLANS.professional_monthly;
  const proYearly = PLANS.professional_yearly;

  const individualPriceDisplay = billingCycle === 'yearly' ? '15' : '19';
  const familyPriceDisplay = billingCycle === 'yearly' ? '31' : '39';
  const proPriceDisplay = billingCycle === 'yearly' ? '79' : '99';

  const individualPriceId =
    billingCycle === 'yearly' ? indYearly.priceId : indMonthly.priceId;
  const familyPriceId = billingCycle === 'yearly' ? famYearly.priceId : famMonthly.priceId;
  const proPriceId = billingCycle === 'yearly' ? proYearly.priceId : proMonthly.priceId;

  return (
    <div className="pricing-page">
      <div className="pricing-header">
        <h1>Choose Your Plan</h1>
        <p>All paid plans include a 14-day trial where configured in Stripe. Cancel anytime.</p>
        {!signedIn && (
          <p className="pricing-auth-hint">
            <Link href={`/auth/login?redirect=${encodeURIComponent('/pricing')}`}>Sign in</Link>
            {' '}
            to subscribe.
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
          <h3>{PLANS.free.name}</h3>
          <div className="pricing-price">
            $0<span>/forever</span>
          </div>
          <p className="pricing-desc">For curious investors</p>
          <ul>
            {PLANS.free.features.map((f, i) => (
              <li key={i}>
                <i className="bi bi-check" /> {f}
              </li>
            ))}
          </ul>
          <button type="button" className="pricing-btn secondary" disabled>
            Current plan
          </button>
        </div>

        <div className="pricing-card popular">
          <span className="pricing-popular-badge">Most Popular</span>
          <h3>{indMonthly.name}</h3>
          <div className="pricing-price">
            ${individualPriceDisplay}
            <span>/month</span>
          </div>
          <p className="pricing-desc">For active traders</p>
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
            {loading === individualPriceId ? 'Loading…' : !individualPriceId ? 'Configure price in Stripe' : 'Start checkout'}
          </button>
        </div>

        <div className="pricing-card">
          <h3>{famMonthly.name}</h3>
          <div className="pricing-price">
            ${familyPriceDisplay}
            <span>/month</span>
          </div>
          <p className="pricing-desc">Households & shared portfolios</p>
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
            {loading === familyPriceId ? 'Loading…' : !familyPriceId ? 'Configure price in Stripe' : 'Start checkout'}
          </button>
        </div>

        <div className="pricing-card">
          <h3>{proMonthly.name}</h3>
          <div className="pricing-price">
            ${proPriceDisplay}
            <span>/month</span>
          </div>
          <p className="pricing-desc">For institutions & advisors</p>
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
