'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Check, X, ArrowRight } from 'lucide-react';
import './pricing-standalone.css';

const PLANS = [
  {
    name: 'Free',
    tagline: 'Explore the platform',
    monthlyPrice: 0,
    yearlyPrice: 0,
    cta: 'Get Started',
    ctaHref: '/auth/signup',
    highlight: false,
    features: [
      'Congressional trade alerts (48hr delay)',
      'Basic portfolio dashboard',
      'Market news feed',
      'Community access (read only)',
      '3 watchlist slots',
      'Weekly market digest email',
    ],
  },
  {
    name: 'Pro',
    tagline: 'For serious investors',
    monthlyPrice: 15,
    yearlyPrice: 10,
    cta: 'Start 14-Day Free Trial',
    ctaHref: '/auth/signup?plan=pro',
    highlight: true,
    badge: 'Most Popular',
    features: [
      'Real-time congressional trade alerts',
      'Advanced portfolio analytics',
      'Full market intelligence suite',
      'Community posting & discussion',
      'Unlimited watchlists',
      'Risk & volatility scoring',
      'Dividend tracking',
      'Sector exposure analysis',
      'Contract & lobbying data',
      'Email & push notifications',
    ],
  },
  {
    name: 'Enterprise',
    tagline: 'For teams & institutions',
    monthlyPrice: 49,
    yearlyPrice: 35,
    cta: 'Contact Sales',
    ctaHref: 'mailto:enterprise@ezana.world',
    highlight: false,
    external: true,
    features: [
      'Everything in Pro',
      'Team dashboards & shared watchlists',
      'API access',
      'Custom alerts & reports',
      'Priority support',
      'Organization management (Team Hub)',
      'Dedicated account manager',
      'SSO / SAML authentication',
      'Data export & compliance tools',
      'Custom integrations',
    ],
  },
];

const COMPARISON_FEATURES = [
  {
    category: 'Core Platform',
    features: [
      { name: 'Portfolio Dashboard', free: true, pro: true, enterprise: true },
      { name: 'Real-Time Market Data', free: 'Delayed', pro: true, enterprise: true },
      { name: 'Watchlists', free: '3 slots', pro: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Market News Feed', free: true, pro: true, enterprise: true },
    ],
  },
  {
    category: 'Congressional Trading',
    features: [
      { name: 'Trade Alerts', free: '48hr delay', pro: 'Real-time', enterprise: 'Real-time' },
      { name: 'Politician Filtering', free: false, pro: true, enterprise: true },
      { name: 'Historical Trade Database', free: '90 days', pro: 'Full history', enterprise: 'Full history' },
      { name: 'Trade Pattern Analysis', free: false, pro: true, enterprise: true },
    ],
  },
  {
    category: 'Analytics & Intelligence',
    features: [
      { name: 'Portfolio Risk Scoring', free: false, pro: true, enterprise: true },
      { name: 'Sector Exposure Analysis', free: false, pro: true, enterprise: true },
      { name: 'Government Contract Data', free: false, pro: true, enterprise: true },
      { name: 'Lobbying Expenditure Tracking', free: false, pro: true, enterprise: true },
      { name: 'Patent Filing Intelligence', free: false, pro: true, enterprise: true },
      { name: 'Custom Reports & Export', free: false, pro: false, enterprise: true },
    ],
  },
  {
    category: 'Community & Support',
    features: [
      { name: 'Community Access', free: 'Read only', pro: 'Full access', enterprise: 'Full access' },
      { name: 'Notifications', free: 'Email only', pro: 'Email + Push', enterprise: 'Email + Push + API' },
      { name: 'Support', free: 'Help center', pro: 'Email support', enterprise: 'Priority + dedicated' },
      { name: 'API Access', free: false, pro: false, enterprise: true },
      { name: 'Team Management', free: false, pro: false, enterprise: true },
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: 'Is there a free trial on paid plans?',
    a: 'Yes. When you subscribe through our checkout, you get a trial period before your card is charged. You can cancel anytime during the trial from your account settings.',
  },
  {
    q: 'What is the difference between this page and checkout?',
    a: 'This page summarizes plans and features. When you are ready to pay with a card, use Subscribe & checkout to complete purchase through our secure Stripe billing.',
  },
  {
    q: 'Can I switch between monthly and annual billing?',
    a: 'You can choose monthly or annual before checkout. Annual billing is shown as an effective monthly rate with savings compared to paying month-to-month.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Contact support for billing questions. Enterprise contracts are customized and may include separate terms.',
  },
];

function CellValue({ value }) {
  if (value === true) return <Check className="cell-check" size={18} aria-hidden />;
  if (value === false) return <X className="cell-x" size={18} aria-hidden />;
  return <span className="cell-text">{value}</span>;
}

function PlanCta({ plan }) {
  const className = `plan-cta ${plan.highlight ? 'plan-cta--primary' : ''}`;

  if (plan.external) {
    return (
      <a href={plan.ctaHref} className={className}>
        {plan.cta} <ArrowRight size={16} aria-hidden />
      </a>
    );
  }

  return (
    <Link href={plan.ctaHref} className={className}>
      {plan.cta} <ArrowRight size={16} aria-hidden />
    </Link>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState('monthly');

  return (
    <div className="pricing-page--standalone">
      <nav className="pricing-nav" aria-label="Pricing page">
        <Link href="/" className="pricing-nav-brand">
          <Image src="/ezana-nav-logo.png" alt="Ezana Finance" width={60} height={28} style={{ height: 28, width: 'auto' }} />
        </Link>
        <div className="pricing-nav-links">
          <Link href="/#features" className="nav-indigo">
            Features
          </Link>
          <Link href="/pricing" className="active">
            Pricing
          </Link>
          <Link href="/subscribe" className="nav-indigo">
            Subscribe
          </Link>
          <Link href="/auth/login" className="pricing-nav-cta">
            Sign In
          </Link>
        </div>
      </nav>

      <header className="pricing-hero">
        <p className="pricing-eyebrow">Pricing</p>
        <h1>Explore which plan fits you best</h1>
        <p className="pricing-subtitle">
          Start free. Upgrade when you need more power. Paid subscriptions use a free trial where configured.{' '}
          <Link href="/subscribe">Open Stripe checkout</Link> when you are ready to bill a card.
        </p>

        <div className="billing-toggle-wrap">
          <button
            type="button"
            className={`billing-btn ${billing === 'monthly' ? 'active' : ''}`}
            onClick={() => setBilling('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`billing-btn ${billing === 'yearly' ? 'active' : ''}`}
            onClick={() => setBilling('yearly')}
          >
            Annual <span className="save-pill">Save 33%</span>
          </button>
        </div>
      </header>

      <section className="pricing-cards-section" aria-label="Plans">
        <div className="pricing-cards-grid">
          {PLANS.map((plan) => {
            const price = billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
            return (
              <div key={plan.name} className={`plan-card ${plan.highlight ? 'plan-card--highlight' : ''}`}>
                {plan.badge ? <span className="plan-badge">{plan.badge}</span> : null}
                <h3 className="plan-name">{plan.name}</h3>
                <p className="plan-tagline">{plan.tagline}</p>
                <div className="plan-price">
                  <span className="plan-price-amount">{price === 0 ? 'Free' : `$${price}`}</span>
                  {price > 0 ? <span className="plan-price-interval">/month</span> : null}
                </div>
                {billing === 'yearly' && price > 0 ? (
                  <p className="plan-annual-note">${price * 12}/year billed annually</p>
                ) : null}
                <PlanCta plan={plan} />
                {plan.highlight ? (
                  <p className="plan-checkout-note">
                    Already decided? <Link href="/subscribe">Go to live plan checkout</Link>
                  </p>
                ) : null}
                <ul className="plan-features">
                  {plan.features.map((f) => (
                    <li key={f}>
                      <Check size={15} className="plan-feature-check" aria-hidden />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="pricing-comparison-section" aria-labelledby="compare-heading">
        <h2 id="compare-heading">Compare plans in detail</h2>
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="comp-feature-col">Feature</th>
                <th>Free</th>
                <th className="comp-highlight-col">Pro</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_FEATURES.map((category) => (
                <Fragment key={category.category}>
                  <tr className="comp-category-row">
                    <td colSpan={4}>{category.category}</td>
                  </tr>
                  {category.features.map((f) => (
                    <tr key={f.name}>
                      <td className="comp-feature-name">{f.name}</td>
                      <td>
                        <CellValue value={f.free} />
                      </td>
                      <td className="comp-highlight-col">
                        <CellValue value={f.pro} />
                      </td>
                      <td>
                        <CellValue value={f.enterprise} />
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="pricing-faq-section" aria-labelledby="faq-heading">
        <h2 id="faq-heading">Frequently asked questions</h2>
        <div className="pricing-faq-list">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="pricing-faq-item">
              <summary>{item.q}</summary>
              <p className="pricing-faq-answer">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="pricing-bottom-cta">
        <h2>Start making smarter investment decisions today</h2>
        <p>Join thousands of investors using Ezana Finance for institutional-grade insights.</p>
        <Link href="/auth/signup" className="pricing-bottom-btn">
          Get Started Free <ArrowRight size={18} aria-hidden />
        </Link>
      </section>

      <footer className="pricing-footer">
        <p>© {new Date().getFullYear()} Ezana Finance. All rights reserved.</p>
        <div className="pricing-footer-links">
          <Link href="/">Home</Link>
          <Link href="/#features">Features</Link>
          <Link href="/subscribe">Subscribe</Link>
          <Link href="/auth/login">Sign In</Link>
        </div>
      </footer>
    </div>
  );
}
