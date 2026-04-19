'use client';

/* ============================================================================
 *  PRICING PAGE — Design tokens inherited from the landing page (`/`)
 *  ----------------------------------------------------------------------------
 *  The landing route force-mounts light mode via ThemeProvider, so this page
 *  does the same to stay visually consistent. Tokens (see theme-variables.css
 *  and landing-light-mode.css) used here:
 *
 *    Background:      var(--bg-primary)        → #ffffff (page), #f8fafb (nav)
 *    Surface:         var(--surface-card)      → #ffffff
 *    Surface hover:   var(--surface-card-hover)→ #f3f4f6
 *    Text primary:    var(--text-primary)      → #0f172a
 *    Text muted:      var(--text-muted)        → #64748b
 *    Text faint:      var(--text-faint)        → #94a3b8
 *    Accent:          var(--emerald-text)      → #059669 (light) / #10b981 (dark)
 *    Border:          var(--border-primary)    → rgba(0,0,0,0.08)
 *    Border hover:    var(--border-hover)      → rgba(16,185,129,0.25)
 *    Shadow sm/md:    landing uses var(--shadow-sm) and var(--shadow-md)
 *    Heading gradient: linear-gradient(135deg,#0f172a 0%,#059669 100%)
 *                     (matches FeaturesSection h2 on landing)
 *    Typography:      same font stack as `body` (system UI + Inter fallback)
 * ==========================================================================*/

import { Fragment, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Minus, ArrowRight, Sparkles, ShieldCheck, Loader2 } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import './pricing-standalone.css';

/* ──────────────────────────────────────────────────────────────────────────
 *  Plan catalog for the marketing page.
 *
 *  `stripeKey` maps each marketing tier to the concrete Stripe plan key in
 *  `src/config/pricing.js` so /api/stripe/create-checkout-session can resolve
 *  a real Price ID. Enterprise routes to sales (no Stripe), and a null
 *  stripeKey means the button falls back to signup.
 * ────────────────────────────────────────────────────────────────────────── */
const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Everything you need to start investing with confidence.',
    monthlyPrice: 5,
    yearlyPrice: 4, // effective /mo when billed yearly ($48/yr)
    highlight: false,
    stripeKey: { month: 'personal_monthly', year: 'individual_annual' },
    features: [
      'Congressional trade alerts (24hr delay)',
      'Basic portfolio dashboard',
      'Market news feed',
      '5 watchlist slots',
      'Weekly market digest',
      'Community access (read only)',
      'Mobile app access',
    ],
  },
  {
    id: 'advanced',
    name: 'Advanced',
    tagline: 'Serious tools for the everyday investor.',
    monthlyPrice: 19,
    yearlyPrice: 15, // effective /mo when billed yearly ($180/yr)
    highlight: true,
    badge: 'Most Popular',
    stripeKey: { month: 'personal_advanced_monthly', year: 'personal_advanced_annual' },
    features: [
      'Real-time congressional trade alerts',
      'Advanced portfolio analytics',
      'Unlimited watchlists',
      'Risk & volatility scoring',
      'Dividend tracking',
      'Sector exposure analysis',
      'Earnings & IPO alerts',
      'Priority email support',
    ],
  },
  {
    id: 'family',
    name: 'Family',
    tagline: 'Pro-tier tools shared across your household.',
    monthlyPrice: 49,
    yearlyPrice: 39, // effective /mo when billed yearly ($468/yr)
    highlight: false,
    stripeKey: { month: 'family_monthly', year: 'family_annual' },
    features: [
      'Everything in Advanced',
      'Up to 5 household accounts',
      'Shared watchlists & portfolios',
      'Consolidated household view',
      'Parental controls',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For teams, RIAs, and institutions.',
    monthlyPrice: null,
    yearlyPrice: null,
    highlight: false,
    contactSales: true,
    ctaHref: 'mailto:enterprise@ezana.world',
    features: [
      'Everything in Family',
      'Custom team size',
      'Full API access',
      'SSO / SAML authentication',
      'Team Hub organization management',
      'Dedicated account manager',
      'Compliance & data export tools',
      'Custom integrations',
    ],
  },
];

const COMPARISON_FEATURES = [
  {
    category: 'Core Platform',
    rows: [
      { name: 'Portfolio dashboard', starter: true, advanced: true, family: true, enterprise: true },
      { name: 'Real-time market data', starter: 'Delayed', advanced: true, family: true, enterprise: true },
      { name: 'Watchlists', starter: '5 slots', advanced: 'Unlimited', family: 'Unlimited', enterprise: 'Unlimited' },
      { name: 'Mobile app', starter: true, advanced: true, family: true, enterprise: true },
    ],
  },
  {
    category: 'Congressional Trading',
    rows: [
      { name: 'Trade alerts', starter: '24hr delay', advanced: 'Real-time', family: 'Real-time', enterprise: 'Real-time' },
      { name: 'Politician filtering', starter: false, advanced: true, family: true, enterprise: true },
      { name: 'Historical trade database', starter: '90 days', advanced: 'Full history', family: 'Full history', enterprise: 'Full history' },
      { name: 'Trade pattern analysis', starter: false, advanced: true, family: true, enterprise: true },
    ],
  },
  {
    category: 'Analytics & Intelligence',
    rows: [
      { name: 'Portfolio risk scoring', starter: false, advanced: true, family: true, enterprise: true },
      { name: 'Sector exposure analysis', starter: false, advanced: true, family: true, enterprise: true },
      { name: 'Government contracts & lobbying', starter: false, advanced: true, family: true, enterprise: true },
      { name: 'Patent filing intelligence', starter: false, advanced: true, family: true, enterprise: true },
      { name: 'Custom reports & export', starter: false, advanced: false, family: true, enterprise: true },
    ],
  },
  {
    category: 'Household & Team',
    rows: [
      { name: 'Accounts included', starter: '1', advanced: '1', family: 'Up to 5', enterprise: 'Unlimited' },
      { name: 'Shared watchlists', starter: false, advanced: false, family: true, enterprise: true },
      { name: 'Team management', starter: false, advanced: false, family: false, enterprise: true },
      { name: 'Organization Hub', starter: false, advanced: false, family: false, enterprise: true },
    ],
  },
  {
    category: 'Support & Integrations',
    rows: [
      { name: 'Community access', starter: 'Read only', advanced: 'Full', family: 'Full', enterprise: 'Full' },
      { name: 'Notifications', starter: 'Email', advanced: 'Email + Push', family: 'Email + Push', enterprise: 'Email + Push + API' },
      { name: 'Support', starter: 'Help center', advanced: 'Priority email', family: 'Priority', enterprise: 'Dedicated manager' },
      { name: 'API access', starter: false, advanced: 'Limited', family: 'Full', enterprise: 'Full + custom' },
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: 'Do I need a credit card to start the free trial?',
    a: 'Yes, a card is required so your account can continue seamlessly once the trial ends — but you will not be charged for 14 days, and you can cancel anytime from your account settings during the trial with zero charge.',
  },
  {
    q: 'What happens when my 14-day trial ends?',
    a: 'On day 15 your card is charged for the plan and billing interval you selected. We send a reminder email 3 days before the trial ends so you can change your mind or switch plans.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel from your account settings at any time — during the trial, or after. If you cancel during a paid billing period, you keep access until the end of that period.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Any time. Upgrades take effect immediately with a prorated charge for the remainder of the billing cycle. Downgrades take effect at the end of the current period.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'If you forget to cancel and get charged, email support within 14 days of the charge and we will refund in full, no questions asked.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'All major credit and debit cards via Stripe. Apple Pay and Google Pay are supported on compatible devices. Enterprise customers can invoice ACH.',
  },
  {
    q: 'Is my financial data secure?',
    a: 'We never store your brokerage credentials. Live brokerage connections use read-only tokens through regulated aggregators, and everything in transit is encrypted (TLS 1.2+).',
  },
];

/* ────────────────────────────────────────────────────────────────────────── */

function CellValue({ value }) {
  /* Every cell variant renders inside a flex container so checkmarks, dashes,
     and string values all land on the same vertical centerline under the
     column's plan-name header. `text-align: center` on the <td> alone is not
     enough — some global resets flip <svg> to display:block, which kills
     inline text-align centering for the icon but not for text. */
  let content;
  if (value === true) {
    content = <Check className="cell-check" size={18} aria-label="Included" />;
  } else if (value === false) {
    content = <Minus className="cell-x" size={18} aria-label="Not included" />;
  } else {
    content = <span className="cell-text">{value}</span>;
  }
  return <div className="comp-cell">{content}</div>;
}

export default function PricingPage() {
  const [billing, setBilling] = useState('yearly'); // Annual default for higher conversion
  const [pendingPlan, setPendingPlan] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const { theme, setTheme } = useTheme();
  const prevThemeRef = useRef(null);

  /* Force light mode on this route to match the landing page's presentation.
     Restore the user's prior theme when they navigate away. */
  useEffect(() => {
    prevThemeRef.current = theme;
    if (theme !== 'light') setTheme('light');
    return () => {
      if (prevThemeRef.current && prevThemeRef.current !== 'light') {
        setTheme(prevThemeRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Auto-dismiss a transient error banner so it doesn't linger. */
  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(''), 6000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  /**
   * Silently kick off Stripe Checkout and redirect. No URL is ever rendered
   * to the user — the browser simply navigates to Stripe's hosted page.
   */
  async function startCheckout(plan) {
    if (plan.contactSales) {
      window.location.href = plan.ctaHref;
      return;
    }

    const planKey = plan.stripeKey?.[billing === 'yearly' ? 'year' : 'month'];
    if (!planKey) {
      window.location.href = `/auth/signup?plan=${plan.id}`;
      return;
    }

    setPendingPlan(plan.id);
    setErrorMsg('');
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planKey, cancelPath: '/pricing' }),
      });

      if (res.status === 401) {
        // Not signed in — send them to signup with the chosen plan preserved
        window.location.href = `/auth/signup?plan=${plan.id}&billing=${billing}`;
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || `Checkout failed (${res.status})`);
      }

      window.location.assign(data.url);
    } catch (err) {
      console.error('[pricing] startCheckout failed:', err);
      setErrorMsg("Couldn't start checkout — please try again in a moment.");
      setPendingPlan(null);
    }
  }

  return (
    <div className="pricing-page--standalone">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header className="pricing-hero">
        <div className="pricing-trial-pill" role="note">
          <Sparkles size={13} aria-hidden />
          14-day free trial on every paid plan
        </div>
        <h1 className="pricing-h1">
          Simple pricing. <span className="pricing-h1-accent">Serious investing.</span>
        </h1>
        <p className="pricing-subtitle">
          Start with the plan that fits where you are. Every paid plan includes a full
          14-day free trial — cancel anytime, no charge until the trial ends.
        </p>

        <div className="billing-toggle-wrap" role="tablist" aria-label="Billing interval">
          <button
            type="button"
            role="tab"
            aria-selected={billing === 'monthly'}
            className={`billing-btn ${billing === 'monthly' ? 'active' : ''}`}
            onClick={() => setBilling('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={billing === 'yearly'}
            className={`billing-btn ${billing === 'yearly' ? 'active' : ''}`}
            onClick={() => setBilling('yearly')}
          >
            Annual <span className="save-pill">Save 20%</span>
          </button>
        </div>
      </header>

      {errorMsg && (
        <div className="pricing-error-banner" role="alert">
          {errorMsg}
        </div>
      )}

      {/* ── Plan Cards ──────────────────────────────────────────────── */}
      <section className="pricing-cards-section" aria-label="Plans">
        <div className="pricing-cards-grid pricing-cards-grid--four">
          {PLANS.map((plan) => {
            const price = billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
            const isContact = plan.contactSales;
            const isPending = pendingPlan === plan.id;
            const ctaLabel = isContact
              ? 'Contact Sales'
              : isPending
                ? 'Starting checkout…'
                : 'Start 14-day free trial';

            return (
              <div
                key={plan.id}
                className={`plan-card ${plan.highlight ? 'plan-card--highlight' : ''}`}
              >
                {plan.badge ? <span className="plan-badge">{plan.badge}</span> : null}

                <h3 className="plan-name">{plan.name}</h3>
                <p className="plan-tagline">{plan.tagline}</p>

                {/* Consistent trial ribbon slot on every card */}
                <div className="plan-trial-row">
                  {isContact ? (
                    <span className="plan-trial-chip plan-trial-chip--neutral">
                      Custom pricing
                    </span>
                  ) : (
                    <span className="plan-trial-chip">14-day free trial</span>
                  )}
                </div>

                <div className="plan-price">
                  {price === null ? (
                    <span className="plan-price-amount">Custom</span>
                  ) : (
                    <>
                      <span className="plan-price-amount">${price}</span>
                      <span className="plan-price-interval">
                        /{billing === 'yearly' ? 'mo billed annually' : 'month'}
                      </span>
                    </>
                  )}
                </div>
                <p className="plan-annual-note">
                  {price === null
                    ? 'Tailored to your organization'
                    : billing === 'yearly'
                      ? `$${price * 12}/year billed annually`
                      : 'Billed monthly · cancel anytime'}
                </p>

                <button
                  type="button"
                  onClick={() => startCheckout(plan)}
                  disabled={isPending}
                  className={`plan-cta ${plan.highlight ? 'plan-cta--primary' : ''}`}
                  aria-busy={isPending}
                >
                  {isPending ? <Loader2 size={16} className="plan-cta-spin" aria-hidden /> : null}
                  <span>{ctaLabel}</span>
                  {!isPending ? <ArrowRight size={16} aria-hidden /> : null}
                </button>
                <p className="plan-finesub">
                  {isContact
                    ? 'We reply within 1 business day'
                    : 'Cancel anytime during trial · No charge'}
                </p>

                <div className="plan-features-divider" />
                <div className="plan-features-label">What's included</div>
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

        <div className="pricing-secure-row">
          <ShieldCheck size={14} aria-hidden />
          Secure checkout powered by Stripe · Cancel anytime from your account
        </div>
      </section>

      {/* ── Comparison Table ───────────────────────────────────────── */}
      <section className="pricing-comparison-section" aria-labelledby="compare-heading">
        <h2 id="compare-heading">Compare plans</h2>
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            {/* Fixed column widths so every body cell shares a centerline with
                the plan-name header directly above it. Without this, long row
                labels can make one column wider than its neighbors and shift
                the visual center of the checkmarks. */}
            <colgroup>
              <col className="comp-col-feature" />
              {PLANS.map((p) => (
                <col key={p.id} className="comp-col-plan" />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="comp-feature-col">Features</th>
                {PLANS.map((p) => {
                  const subPrice = billing === 'yearly' ? p.yearlyPrice : p.monthlyPrice;
                  const isHi = p.highlight;
                  return (
                    <th key={p.id} className={isHi ? 'comp-highlight-col' : ''}>
                      <div className="comp-plan-head">
                        <div className="comp-plan-name">{p.name}</div>
                        <div className="comp-plan-sub">
                          {subPrice === null ? 'Custom' : `$${subPrice}/mo`}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_FEATURES.map((group) => (
                <Fragment key={group.category}>
                  <tr className="comp-category-row">
                    <td colSpan={PLANS.length + 1}>{group.category}</td>
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={row.name}>
                      <td className="comp-feature-name">{row.name}</td>
                      <td><CellValue value={row.starter} /></td>
                      <td className="comp-highlight-col"><CellValue value={row.advanced} /></td>
                      <td><CellValue value={row.family} /></td>
                      <td><CellValue value={row.enterprise} /></td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section className="pricing-faq-section" aria-labelledby="faq-heading">
        <h2 id="faq-heading">Frequently asked</h2>
        <div className="pricing-faq-list">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="pricing-faq-item">
              <summary>
                <span>{item.q}</span>
                <span className="pricing-faq-marker" aria-hidden>+</span>
              </summary>
              <p className="pricing-faq-answer">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────── */}
      <section className="pricing-bottom-cta" aria-label="Get started">
        <div className="pricing-bottom-cta-card">
          <h2>Start investing smarter today</h2>
          <p>
            Try any paid plan free for 14 days. No charge until the trial ends,
            cancel whenever.
          </p>
          <button
            type="button"
            className="pricing-bottom-btn"
            onClick={() => startCheckout(PLANS.find((p) => p.highlight) || PLANS[1])}
          >
            Start 14-day free trial <ArrowRight size={18} aria-hidden />
          </button>
          <div className="pricing-bottom-finesub">
            No charge for 14 days · Cancel anytime
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="pricing-footer">
        <p>© {new Date().getFullYear()} Ezana Finance. All rights reserved.</p>
        <div className="pricing-footer-links">
          <Link href="/">Home</Link>
          <Link href="/#features">Features</Link>
          <Link href="/auth/login">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
