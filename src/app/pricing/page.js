'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { Check, X, ArrowRight } from 'lucide-react';
import './pricing-standalone.css';

const PLANS = [
  {
    name: 'Starter',
    tagline: 'Perfect for beginners',
    monthlyPrice: 5,
    yearlyPrice: 4,
    cta: 'Get Started',
    ctaHref: '/auth/signup?plan=starter',
    highlight: false,
    features: [
      'Congressional trade alerts (24hr delay)',
      'Basic portfolio dashboard',
      'Market news feed',
      'Community access (read only)',
      '5 watchlist slots',
      'Weekly market digest email',
      'Mobile app access',
    ],
  },
  {
    name: 'Advanced',
    tagline: 'For serious investors',
    monthlyPrice: 20,
    yearlyPrice: 16,
    cta: 'Start 14-Day Free Trial',
    ctaHref: '/auth/signup?plan=advanced',
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
      'API access (limited)',
    ],
  },
  {
    name: 'Family',
    tagline: 'Share with your family',
    monthlyPrice: 60,
    yearlyPrice: 48,
    cta: 'Get Started',
    ctaHref: '/auth/signup?plan=family',
    highlight: false,
    features: [
      'Everything in Advanced',
      'Up to 5 family members',
      'Shared watchlists & portfolios',
      'Family dashboard',
      'Individual accounts per member',
      'Parental controls',
      'Family investment insights',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    tagline: 'For teams & institutions',
    monthlyPrice: null,
    yearlyPrice: null,
    cta: 'Contact Sales',
    ctaHref: 'mailto:enterprise@ezana.world',
    highlight: false,
    external: true,
    features: [
      'Everything in Family',
      'Custom team size',
      'Team dashboards & shared watchlists',
      'Full API access',
      'Custom alerts & reports',
      'Organization management (Team Hub)',
      'Dedicated account manager',
      'SSO / SAML authentication',
      'Data export & compliance tools',
      'Custom integrations',
      'White-label options',
    ],
  },
];

const COMPARISON_FEATURES = [
  {
    category: 'Core Platform',
    features: [
      { name: 'Portfolio Dashboard', starter: true, advanced: true, family: true, enterprise: true },
      { name: 'Real-Time Market Data', starter: 'Delayed', advanced: true, family: true, enterprise: true },
      { name: 'Watchlists', starter: '5 slots', advanced: 'Unlimited', family: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Market News Feed', starter: true, advanced: true, family: true, enterprise: true },
      { name: 'Mobile App Access', starter: true, advanced: true, family: true, enterprise: true },
    ],
  },
  {
    category: 'Congressional Trading',
    features: [
      { name: 'Trade Alerts', starter: '24hr delay', advanced: 'Real-time', family: 'Real-time', enterprise: 'Real-time' },
      { name: 'Politician Filtering', starter: false, advanced: true, family: true, enterprise: true },
      { name: 'Historical Trade Database', starter: '90 days', advanced: 'Full history', family: 'Full history', enterprise: 'Full history' },
      { name: 'Trade Pattern Analysis', starter: false, advanced: true, family: true, enterprise: true },
    ],
  },
  {
    category: 'Analytics & Intelligence',
    features: [
      { name: 'Portfolio Risk Scoring', starter: false, advanced: true, family: true, enterprise: true },
      { name: 'Sector Exposure Analysis', starter: false, advanced: true, family: true, enterprise: true },
      { name: 'Government Contract Data', starter: false, advanced: true, family: true, enterprise: true },
      { name: 'Lobbying Expenditure Tracking', starter: false, advanced: true, family: true, enterprise: true },
      { name: 'Patent Filing Intelligence', starter: false, advanced: true, family: true, enterprise: true },
      { name: 'Custom Reports & Export', starter: false, advanced: false, family: true, enterprise: true },
    ],
  },
  {
    category: 'Family & Team Features',
    features: [
      { name: 'Multiple User Accounts', starter: '1', advanced: '1', family: 'Up to 5', enterprise: 'Unlimited' },
      { name: 'Shared Watchlists', starter: false, advanced: false, family: true, enterprise: true },
      { name: 'Family Dashboard', starter: false, advanced: false, family: true, enterprise: true },
      { name: 'Team Management', starter: false, advanced: false, family: false, enterprise: true },
      { name: 'Organization Hub', starter: false, advanced: false, family: false, enterprise: true },
    ],
  },
  {
    category: 'Community & Support',
    features: [
      { name: 'Community Access', starter: 'Read only', advanced: 'Full access', family: 'Full access', enterprise: 'Full access' },
      { name: 'Notifications', starter: 'Email only', advanced: 'Email + Push', family: 'Email + Push', enterprise: 'Email + Push + API' },
      { name: 'Support', starter: 'Help center', advanced: 'Email support', family: 'Priority support', enterprise: 'Dedicated + Priority' },
      { name: 'API Access', starter: false, advanced: 'Limited', family: 'Full', enterprise: 'Full + Custom' },
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
  {
    q: 'How does the Family plan work?',
    a: 'The Family plan allows up to 5 family members to have their own individual accounts while sharing premium features. Each member gets their own login, personalized dashboard, and can collaborate through shared watchlists and portfolios.',
  },
  {
    q: 'What happens when I need more than the Family plan offers?',
    a: 'If you need more than 5 users or require advanced features like custom integrations, SSO, or white-label options, our Enterprise plan is perfect for you. Contact our sales team for a custom quote tailored to your needs.',
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
      <header className="pricing-hero">
        <p className="pricing-eyebrow">Pricing</p>
        <h1>Explore which plan fits you best</h1>
        <p className="pricing-subtitle">
          Start with our affordable plans. Upgrade when you need more power. Paid subscriptions include a free trial where configured.{' '}
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
            Annual <span className="save-pill">Save 20%</span>
          </button>
        </div>
      </header>

      <section className="pricing-cards-section" aria-label="Plans">
        <div className="pricing-cards-grid pricing-cards-grid--four">
          {PLANS.map((plan) => {
            const price = billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
            return (
              <div key={plan.name} className={`plan-card ${plan.highlight ? 'plan-card--highlight' : ''}`}>
                {plan.badge ? <span className="plan-badge">{plan.badge}</span> : null}
                <h3 className="plan-name">{plan.name}</h3>
                <p className="plan-tagline">{plan.tagline}</p>
                <div className="plan-price">
                  {price === null ? (
                    <span className="plan-price-amount">Custom</span>
                  ) : (
                    <>
                      <span className="plan-price-amount">${price}</span>
                      <span className="plan-price-interval">/month</span>
                    </>
                  )}
                </div>
                {billing === 'yearly' && price !== null ? (
                  <p className="plan-annual-note">${price * 12}/year billed annually</p>
                ) : price === null ? (
                  <p className="plan-annual-note">Contact us for pricing</p>
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
                <th>Starter</th>
                <th className="comp-highlight-col">Advanced</th>
                <th>Family</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_FEATURES.map((category) => (
                <Fragment key={category.category}>
                  <tr className="comp-category-row">
                    <td colSpan={5}>{category.category}</td>
                  </tr>
                  {category.features.map((f) => (
                    <tr key={f.name}>
                      <td className="comp-feature-name">{f.name}</td>
                      <td>
                        <CellValue value={f.starter} />
                      </td>
                      <td className="comp-highlight-col">
                        <CellValue value={f.advanced} />
                      </td>
                      <td>
                        <CellValue value={f.family} />
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
          Get Started <ArrowRight size={18} aria-hidden />
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
