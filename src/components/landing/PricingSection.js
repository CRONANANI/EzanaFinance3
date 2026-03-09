'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import Link from 'next/link';

const PRICING_PLANS = [
  {
    id: 'free',
    name: 'Free',
    subtitle: 'For curious investors',
    price: '$0',
    period: 'forever',
    overview: 'Basic access to congressional trading data and market insights.',
    features: [
      'Congressional trade alerts (delayed)',
      'Basic 13F filing access',
      'Community forum access',
      'Weekly market digest',
      'Limited watchlist (5 tickers)',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    id: 'individual',
    name: 'Individual',
    subtitle: 'For active traders',
    price: '$19',
    period: '/month',
    overview: 'Real-time data and advanced analytics for serious investors.',
    features: [
      'Real-time congressional alerts',
      'Full 13F filing database',
      'Legendary investor portfolios',
      'Advanced filtering & search',
      'Unlimited watchlists',
      'Email & push notifications',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    id: 'family',
    name: 'Family',
    subtitle: 'Households & Shared Portfolios',
    price: '$39',
    period: '/month',
    overview: 'Share premium access with up to 5 family members.',
    features: [
      'Everything in Individual',
      'Up to 5 user accounts',
      'Shared watchlists & alerts',
      'Family portfolio dashboard',
      'Consolidated reporting',
      'Joint investment tracking',
      'Dedicated family support',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    subtitle: 'For institutions & advisors',
    price: '$99',
    period: '/month',
    overview: 'Enterprise-grade tools for financial professionals.',
    features: [
      'Everything in Family',
      'API access (100K calls/mo)',
      'Custom data exports',
      'White-label reports',
      'Compliance & audit logs',
      'Team management',
      'Dedicated account manager',
      'SLA guarantees',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
];

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState('monthly');

  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-container">
        <div className="pricing-header">
          <h2>Simple, Transparent Pricing</h2>
          <p>Choose the plan that fits your investment journey. All plans include a 14-day free trial.</p>

          <div className="billing-toggle">
            <button
              type="button"
              className={`toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`toggle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
              onClick={() => setBillingCycle('yearly')}
            >
              Yearly <span className="save-badge">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="pricing-grid">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`pricing-card ${plan.popular ? 'popular' : ''}`}
            >
              {plan.popular && (
                <div className="popular-badge">Most Popular</div>
              )}

              <div className="card-header">
                <h3 className="plan-name">{plan.name}</h3>
                <p className="plan-subtitle">{plan.subtitle}</p>
                <div className="price">
                  <span className="price-amount">
                    {billingCycle === 'yearly' && plan.price !== '$0'
                      ? `$${Math.round(parseInt(plan.price.slice(1)) * 0.8)}`
                      : plan.price}
                  </span>
                  <span className="price-period">
                    {plan.price === '$0' ? plan.period : billingCycle === 'yearly' ? '/month, billed yearly' : plan.period}
                  </span>
                </div>
              </div>

              <div className="card-body">
                <p className="plan-overview">{plan.overview}</p>

                <ul className="features-list">
                  {plan.features.map((feature, index) => (
                    <li key={index}>
                      <Check className="feature-check" size={16} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/sign-up" className="get-started-btn">
                  {plan.cta}
                </Link>
                <p className="trial-note">14-day free trial • No credit card required</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
