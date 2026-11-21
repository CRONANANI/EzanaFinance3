'use client';

/* ============================================================================
 *  PRICING PAGE — Design tokens inherited from the landing page (`/`)
 *  ----------------------------------------------------------------------------
 *  Marketing routes are brand-locked dark via ThemeProvider (see pathname
 *  logic there). Tokens for this standalone layout live in pricing-standalone.css.
 *  Historical reference (light marketing): theme-variables.css +
 *  landing-light-mode.css once targeted light landing; those still apply only
 *  when body.light-mode is set (dashboard).
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
import {
  Check,
  Minus,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import RenewalTerms from '@/components/billing/RenewalTerms';
import ApiPricingCalculator from '@/components/pricing/ApiPricingCalculator';
import { PLANS as CATALOG } from '@/config/pricing';
import { RENEWAL_POLICY_TEXT, TRIAL_LABEL } from '@/lib/billing/renewal-terms';
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
    id: 'free',
    name: 'Free',
    tagline: 'Explore the platform, no credit card needed.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    highlight: false,
    isFree: true,
    stripeKey: null,
    features: [
      'Real-time market data',
      '5 watchlists',
      'Community (read-only)',
      'Learning center basics',
      'Mock portfolio ($10K)',
      'Basic market overview',
      'Limited earnings data',
    ],
  },
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
      'Real-time market data',
      'Unlimited watchlists',
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

/* The four ways a partner earns (figures from the Partner program terms). */
const PARTNER_RATES = [
  {
    icon: 'bi-mortarboard',
    label: 'Courses',
    value: '70%',
    note: 'of revenue from every course you sell',
  },
  {
    icon: 'bi-people',
    label: 'Referrals',
    value: '$25',
    note: 'for each referral that activates a paid plan',
  },
  {
    icon: 'bi-arrow-left-right',
    label: 'Copy trading',
    value: '10%',
    note: 'profit share from members who copy you',
    soon: true,
  },
  {
    icon: 'bi-newspaper',
    label: 'Ezana Echo',
    value: 'Publish',
    note: 'write for Echo and grow your subscribers',
  },
];

const COMPARISON_FEATURES = [
  {
    category: 'Core Platform',
    rows: [
      {
        name: 'Portfolio dashboard',
        free: 'Basic',
        starter: true,
        advanced: true,
        family: true,
        enterprise: true,
      },
      {
        name: 'Real-time market data',
        free: true,
        starter: true,
        advanced: true,
        family: true,
        enterprise: true,
      },
      {
        name: 'Watchlists',
        free: '5',
        starter: 'Unlimited',
        advanced: 'Unlimited',
        family: 'Unlimited',
        enterprise: 'Unlimited',
      },
      {
        name: 'Mobile app',
        free: true,
        starter: true,
        advanced: true,
        family: true,
        enterprise: true,
      },
    ],
  },
  {
    category: 'Congressional Trading',
    rows: [
      {
        name: 'Trade alerts',
        free: false,
        starter: '24hr delay',
        advanced: 'Real-time',
        family: 'Real-time',
        enterprise: 'Real-time',
      },
      {
        name: 'Politician filtering',
        free: false,
        starter: false,
        advanced: true,
        family: true,
        enterprise: true,
      },
      {
        name: 'Historical trade database',
        free: false,
        starter: '90 days',
        advanced: 'Full history',
        family: 'Full history',
        enterprise: 'Full history',
      },
      {
        name: 'Trade pattern analysis',
        free: false,
        starter: false,
        advanced: true,
        family: true,
        enterprise: true,
      },
    ],
  },
  {
    category: 'Analytics & Intelligence',
    rows: [
      {
        name: 'Portfolio risk scoring',
        free: false,
        starter: false,
        advanced: true,
        family: true,
        enterprise: true,
      },
      {
        name: 'Sector exposure analysis',
        free: false,
        starter: false,
        advanced: true,
        family: true,
        enterprise: true,
      },
      {
        name: 'Government contracts & lobbying',
        free: false,
        starter: false,
        advanced: true,
        family: true,
        enterprise: true,
      },
      {
        name: 'Patent filing intelligence',
        free: false,
        starter: false,
        advanced: true,
        family: true,
        enterprise: true,
      },
      {
        name: 'Custom reports & export',
        free: false,
        starter: false,
        advanced: false,
        family: true,
        enterprise: true,
      },
    ],
  },
  {
    category: 'Household & Team',
    rows: [
      {
        name: 'Accounts included',
        free: '1',
        starter: '1',
        advanced: '1',
        family: 'Up to 5',
        enterprise: 'Unlimited',
      },
      {
        name: 'Shared watchlists',
        free: false,
        starter: false,
        advanced: false,
        family: true,
        enterprise: true,
      },
      {
        name: 'Team management',
        free: false,
        starter: false,
        advanced: false,
        family: false,
        enterprise: true,
      },
      {
        name: 'Organization Hub',
        free: false,
        starter: false,
        advanced: false,
        family: false,
        enterprise: true,
      },
    ],
  },
  {
    category: 'Support & Integrations',
    rows: [
      {
        name: 'Community access',
        free: 'Read only',
        starter: 'Read only',
        advanced: 'Full',
        family: 'Full',
        enterprise: 'Full',
      },
      {
        name: 'Notifications',
        free: false,
        starter: 'Email',
        advanced: 'Email + Push',
        family: 'Email + Push',
        enterprise: 'Email + Push + API',
      },
      {
        name: 'Support',
        free: 'Help center',
        starter: 'Help center',
        advanced: 'Priority email',
        family: 'Priority',
        enterprise: 'Dedicated manager',
      },
      {
        name: 'API access',
        free: false,
        starter: 'Limited access',
        advanced: 'Customized access',
        family: 'Full',
        enterprise: 'Full + custom',
      },
    ],
  },
];

/** The Stripe catalog plan (price and period actually charged) for a card. */
const catalogPlan = (plan, billing) =>
  CATALOG[plan.stripeKey?.[billing === 'yearly' ? 'year' : 'month']] || null;

/**
 * Pure: everything a plan shows about its price for one billing interval.
 * Shared by the desktop cards and the mobile price list so the two can never
 * disagree. Annual: per-month equivalent up front, the yearly total and the
 * saving underneath, and the monthly price struck through.
 */
function planPricing(plan, billing) {
  if (plan.contactSales) {
    return { kind: 'custom', main: 'Custom', unit: '', note: 'Talk to sales', was: null };
  }
  if (plan.isFree) {
    return { kind: 'free', main: '$0', unit: '', note: 'No card needed', was: null };
  }
  if (billing === 'yearly') {
    const total = plan.yearlyPrice * 12;
    const saved = plan.monthlyPrice * 12 - total;
    return {
      kind: 'paid',
      main: `$${plan.yearlyPrice}`,
      unit: '/mo',
      note: saved > 0 ? `$${total}/yr · save $${saved}` : `$${total} billed yearly`,
      was: plan.monthlyPrice > plan.yearlyPrice ? `$${plan.monthlyPrice}` : null,
      total,
    };
  }
  return {
    kind: 'paid',
    main: `$${plan.monthlyPrice}`,
    unit: '/mo',
    note: 'Billed monthly',
    was: null,
    total: plan.monthlyPrice,
  };
}

function ctaLabelFor(plan, isPending) {
  if (plan.isFree) return isPending ? 'Activating…' : 'Get Started Free';
  if (plan.contactSales) return 'Contact Sales';
  return isPending ? 'Opening…' : 'Join waitlist';
}

/* Nov 21: the four outside cards carry a solid emerald button; the
   recommended (emerald metal) card inverts it to white with emerald text. */
const ctaClass = (plan) => `plan-cta ${plan.highlight ? 'plan-cta--invert' : 'plan-cta--primary'}`;

/* How paid signups work while access opens in waves. Shown under the hero
   and repeated in the FAQ so nobody reaches Stripe surprised. */
const WAITLIST_STEPS = [
  {
    icon: 'bi-person-plus',
    title: 'Join the waitlist',
    body: 'Create your account details, then add a card on Stripe. Nothing is charged.',
  },
  {
    icon: 'bi-envelope-check',
    title: 'Get your invite',
    body: `When your wave opens we email your invite to a free ${TRIAL_LABEL} Starter trial.`,
  },
  {
    icon: 'bi-arrow-up-right-circle',
    title: 'Choose your plan',
    body: 'Use Starter free for the month, move to Advanced right away, or decide when the trial ends.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Why is there a waitlist?',
    a: 'Ezana opens access in waves so every new member gets a working account and real support. Join the waitlist from any paid plan and we email your invite as soon as your wave opens.',
  },
  {
    q: 'What happens after I join the waitlist?',
    a: 'You enter your account details, then Stripe asks for a card. Nothing is charged at that point, the card is only saved. When you are accepted, you are invited to a free one-month trial of the Starter plan.',
  },
  {
    q: 'Can I start on Advanced instead of Starter?',
    a: `Yes. Your invite starts the free ${TRIAL_LABEL} Starter trial, and you can move to Advanced the moment you join. Or use Starter for the whole month and choose Starter or Advanced when the trial ends.`,
  },
  {
    q: 'Why do I need a card to join the waitlist?',
    a: 'So your trial can continue without interruption once it ends. Stripe saves the card and Ezana never sees the full number. You are not charged while you wait or during the free month, and you can cancel before the trial ends at no cost.',
  },
  {
    q: 'What happens when my free month ends?',
    a: 'The plan you are on (Starter, or Advanced if you switched) is charged to the saved card at the price shown, monthly or yearly depending on what you picked. We email a reminder 3 days before the trial ends.',
  },
  {
    q: 'How does automatic renewal work?',
    a: RENEWAL_POLICY_TEXT,
  },
  {
    q: 'Monthly or yearly: what is the difference?',
    a: 'Those are the two billing options. Yearly is billed once a year and costs about 20% less than paying monthly, for example Starter is $48 a year instead of $60.',
  },
  {
    q: 'Can I cancel or change plans later?',
    a: 'Yes, anytime from Settings, Billing. Upgrades take effect immediately with a prorated charge. Downgrades and cancellations take effect at the end of the period you already paid for.',
  },
  {
    q: 'Is the Free plan on the waitlist too?',
    a: 'No card is ever needed for Free. It includes real-time market data, watchlists, read-only community access and a $10K mock portfolio, and you can upgrade from it later.',
  },
  {
    q: 'How does the Partner program pay?',
    a: 'Partners join free. You keep 70% of course revenue, earn $25 for each referral that activates a paid plan, and can publish on Ezana Echo to grow subscribers. Copy-trading profit share is coming soon.',
  },
  {
    q: 'What payment methods do you accept, and is my data secure?',
    a: 'All major credit and debit cards through Stripe, plus Apple Pay and Google Pay on supported devices; Enterprise can pay by invoice. We never store brokerage credentials, and everything in transit is encrypted.',
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

/**
 * Mobile price list (≤768px): every plan's price in one compact row so the
 * whole lineup is visible on load, and the Monthly/Annual toggle visibly
 * changes every number. A row expands (one at a time) into the plan's
 * tagline, CTA, features and renewal terms. The desktop cards are unchanged.
 */
function PlanList({ billing, openPlan, setOpenPlan, pendingPlan, onSelect }) {
  return (
    <ul className="plan-list" aria-label="Plans">
      {PLANS.map((plan) => {
        const p = planPricing(plan, billing);
        const open = openPlan === plan.id;
        const isPending = pendingPlan === plan.id;
        const rowId = `plan-row-${plan.id}`;
        const panelId = `plan-panel-${plan.id}`;
        return (
          <li
            key={plan.id}
            data-plan={plan.id}
            className={['plan-row', plan.highlight && 'plan-row--highlight', open && 'is-open']
              .filter(Boolean)
              .join(' ')}
          >
            <h3 className="plan-row-h">
              <button
                type="button"
                id={rowId}
                className="plan-row-btn"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenPlan(open ? null : plan.id)}
              >
                <span className="plan-row-id">
                  <span className="plan-row-name">
                    {plan.name}
                    {plan.badge ? <span className="plan-row-badge">{plan.badge}</span> : null}
                  </span>
                </span>
                <span className="plan-row-price">
                  {/* Keyed on billing so the figure re-animates on every toggle. */}
                  <span key={`${plan.id}-${billing}`} className="plan-row-figure">
                    {p.was ? (
                      <s className="plan-row-was">
                        <span className="plan-row-sr">was </span>
                        {p.was}
                      </s>
                    ) : null}
                    <span className="plan-row-amount">{p.main}</span>
                    {p.unit ? <span className="plan-row-unit">{p.unit}</span> : null}
                  </span>
                  <span key={`${plan.id}-${billing}-note`} className="plan-row-note">
                    {p.note}
                  </span>
                </span>
                <ChevronDown size={18} className="plan-row-chev" aria-hidden />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={rowId}
              className="plan-row-panel"
              hidden={!open}
            >
              <p className="plan-row-tagline">{plan.tagline}</p>
              <button
                type="button"
                onClick={() => onSelect(plan)}
                disabled={isPending}
                className={ctaClass(plan)}
                aria-busy={isPending}
              >
                {isPending ? <Loader2 size={16} className="plan-cta-spin" aria-hidden /> : null}
                <span>{ctaLabelFor(plan, isPending)}</span>
                {!isPending ? <ArrowRight size={16} aria-hidden /> : null}
              </button>
              {plan.contactSales ? (
                <p className="plan-finesub">We reply within 1 business day</p>
              ) : null}
              <div className="plan-features-label">What&apos;s included</div>
              <ul className="plan-features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <Check size={15} className="plan-feature-check" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {!plan.isFree && !plan.contactSales ? (
                <RenewalTerms
                  plan={catalogPlan(plan, billing)}
                  fromInvite
                  className="plan-renewal"
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* The sticky marketing navbar changes height on scroll; the mobile comparison
   header sticks just under it, so the page keeps its live height in a var. */
function useNavHeight(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    const nav = document.querySelector('.navbar-sticky') || document.querySelector('.navbar');
    if (!root || !nav) return undefined;
    const write = () =>
      root.style.setProperty(
        '--pricing-nav-h',
        `${Math.round(nav.getBoundingClientRect().height)}px`,
      );
    write();
    const ro = new ResizeObserver(write);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [rootRef]);
}

export default function PricingPage() {
  const [billing, setBilling] = useState('yearly'); // Annual default for higher conversion
  const [pendingPlan, setPendingPlan] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');
  const [openPlan, setOpenPlan] = useState(null); // mobile price list: one row open at a time
  /* ?plan=<id> (Sonar's "Get the Starter plan" sends ?plan=starter): that plan's card is
     marked and scrolled into view, and its row opens in the mobile list. */
  const [requestedPlan, setRequestedPlan] = useState(null);
  const rootRef = useRef(null);
  useNavHeight(rootRef);

  useEffect(() => {
    let id = null;
    try {
      id = new URL(window.location.href).searchParams.get('plan');
    } catch {
      id = null;
    }
    if (!id || !PLANS.some((p) => p.id === id)) return undefined;
    setRequestedPlan(id);
    setOpenPlan(id);
    /* After the cards paint: the visible copy (desktop card or mobile row) comes into view. */
    const t = setTimeout(() => {
      const el = [...document.querySelectorAll(`[data-plan="${id}"]`)].find(
        (n) => n.getBoundingClientRect().height > 0,
      );
      if (!el) return;
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    }, 120);
    return () => clearTimeout(t);
  }, []);

  /* Auto-dismiss a transient error banner so it doesn't linger. */
  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(''), 6000);
    return () => clearTimeout(t);
  }, [errorMsg]);

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
    setNoticeMsg('');

    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planKey, cancelPath: '/pricing' }),
      });

      // 401 means user isn't signed in → send to signup, preserve plan choice
      if (res.status === 401) {
        window.location.href = `/auth/signup?plan=${plan.id}&billing=${billing}`;
        return;
      }

      const data = await res.json().catch(() => ({}));

      // Log everything so the actual cause is visible in the console
      console.log('[pricing] checkout response:', {
        status: res.status,
        ok: res.ok,
        url: data?.url,
        error: data?.error,
        planKey,
        billing,
      });

      /* A live subscription is switched in place, never a second Checkout. */
      if (res.ok && data?.alreadySubscribed) {
        setNoticeMsg("You're already on this plan.");
        setPendingPlan(null);
        return;
      }
      if (res.ok && data?.switched) {
        window.location.assign(data.url || '/home?checkout=switched');
        return;
      }

      if (res.ok && data?.url) {
        window.location.assign(data.url);
        return;
      }

      // Map the route's known error responses to user-friendly messages
      // while preserving the technical detail in the console.
      let userMessage;
      if (res.status === 503) {
        userMessage = 'Billing is temporarily unavailable. Please try again in a few minutes.';
      } else if (res.status === 400 && data?.error?.toLowerCase().includes('invalid plan')) {
        userMessage = `This plan isn't available right now. Please pick another or contact support. (${planKey})`;
      } else if (res.status === 500 && data?.error?.toLowerCase().includes('configuration')) {
        userMessage = 'Billing setup error, our team has been notified. Please contact support.';
      } else if (data?.error) {
        // Surface server's actual error message — this is what makes the bug debuggable
        userMessage = `Checkout failed: ${data.error}`;
      } else {
        userMessage = `Checkout failed (HTTP ${res.status}). Please try again.`;
      }

      setErrorMsg(userMessage);
      setPendingPlan(null);
    } catch (err) {
      console.error('[pricing] startCheckout exception:', err);
      setErrorMsg(
        err?.message
          ? `Couldn't start checkout: ${err.message}`
          : 'Could not connect to billing. Please check your connection and try again.',
      );
      setPendingPlan(null);
    }
  }

  async function activateFreePlan() {
    setPendingPlan('free');
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/activate-free', {
        method: 'POST',
        credentials: 'include',
      });

      if (res.status === 401) {
        window.location.href = '/auth/signup?plan=free';
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.ok) {
        window.location.href = '/home';
        return;
      }

      setErrorMsg(data?.error || 'Could not activate free plan. Please try again.');
      setPendingPlan(null);
    } catch (err) {
      console.error('[pricing] activateFreePlan error:', err);
      setErrorMsg('Could not connect. Please check your connection and try again.');
      setPendingPlan(null);
    }
  }

  return (
    <div className="pricing-page--standalone" ref={rootRef}>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header className="pricing-hero">
        <div className="pricing-trial-pill" role="note">
          <Sparkles size={13} aria-hidden />
          Free {TRIAL_LABEL} trial for waitlist members
        </div>
        <h1 className="pricing-h1">
          Simple pricing. <span className="pricing-h1-accent">Serious investing.</span>
        </h1>
        <p className="pricing-subtitle">
          <span className="pricing-subtitle-long">
            Start with the plan that fits where you are. Join the waitlist and your invite comes
            with a free {TRIAL_LABEL} trial. No charge until the trial ends, cancel anytime.
          </span>
          <span className="pricing-subtitle-short">
            Free {TRIAL_LABEL} trial with your invite. Cancel anytime.
          </span>
        </p>

        {/* Nov 19: the switch pill (Monthly, switch, Yearly) in the landing Sonar
            band's glossy emerald metal finish. */}
        <div className="billing-switch-pill" role="group" aria-label="Billing interval">
          <button
            type="button"
            className={`billing-switch-label${billing === 'monthly' ? ' is-on' : ''}`}
            aria-pressed={billing === 'monthly'}
            onClick={() => setBilling('monthly')}
          >
            Monthly
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={billing === 'yearly'}
            aria-label="Bill yearly"
            className="billing-switch"
            onClick={() => setBilling(billing === 'yearly' ? 'monthly' : 'yearly')}
          >
            <span className="billing-switch-thumb" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`billing-switch-label${billing === 'yearly' ? ' is-on' : ''}`}
            aria-pressed={billing === 'yearly'}
            onClick={() => setBilling('yearly')}
          >
            Yearly <span className="save-pill">Save 20%</span>
          </button>
        </div>
      </header>

      {noticeMsg && (
        <div className="pricing-notice-banner" role="status">
          {noticeMsg}
        </div>
      )}
      {errorMsg && (
        <div className="pricing-error-banner" role="alert">
          {errorMsg}
        </div>
      )}

      {/* ── How the waitlist works ───────────────────────────────────── */}
      <section className="pricing-waitlist" aria-labelledby="pricing-waitlist-h">
        <h2 id="pricing-waitlist-h" className="pricing-waitlist-h">
          How the waitlist works
        </h2>
        <ol className="pricing-waitlist-steps">
          {WAITLIST_STEPS.map((step, i) => (
            <li key={step.title} className="pricing-waitlist-step">
              <span className="pricing-waitlist-ic" aria-hidden="true">
                <i className={`bi ${step.icon}`} />
              </span>
              <span className="pricing-waitlist-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="pricing-waitlist-title">{step.title}</span>
              <span className="pricing-waitlist-body">{step.body}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Plan Cards ──────────────────────────────────────────────── */}
      <section className="pricing-cards-section" aria-label="Plans">
        <PlanList
          billing={billing}
          openPlan={openPlan}
          setOpenPlan={setOpenPlan}
          pendingPlan={pendingPlan}
          onSelect={(plan) => (plan.isFree ? activateFreePlan() : startCheckout(plan))}
        />
        <div className="pricing-cards-grid pricing-cards-grid--five">
          {PLANS.map((plan) => {
            const p = planPricing(plan, billing);
            const isContact = plan.contactSales;
            const isPending = pendingPlan === plan.id;
            const ctaLabel = ctaLabelFor(plan, isPending);

            return (
              <div
                key={plan.id}
                data-plan={plan.id}
                className={[
                  'plan-card',
                  plan.highlight && 'plan-card--highlight',
                  billing === 'yearly' && 'plan-card--yearly',
                  requestedPlan === plan.id && 'plan-card--requested',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {plan.badge ? <span className="plan-badge">{plan.badge}</span> : null}

                <h3 className="plan-name">{plan.name}</h3>
                <p className="plan-tagline">{plan.tagline}</p>

                {/* Price: muted $ and unit around a large figure that rolls in on
                    every toggle; the billing note (and the struck monthly
                    price on yearly) sits underneath. */}
                <div className="plan-price">
                  <div key={`${plan.id}-${billing}`} className="plan-price-row">
                    {p.kind === 'custom' ? (
                      <span className="plan-price-amount">Custom</span>
                    ) : (
                      <>
                        <span className="plan-price-currency">$</span>
                        <span className="plan-price-amount">{p.main.replace('$', '')}</span>
                        {p.unit ? <span className="plan-price-interval">{p.unit}</span> : null}
                      </>
                    )}
                  </div>
                  <div className="plan-price-note">
                    {p.was ? (
                      <s className="plan-price-was">
                        <span className="plan-row-sr">was </span>
                        {p.was}
                      </s>
                    ) : null}
                    <span>{p.note}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => (plan.isFree ? activateFreePlan() : startCheckout(plan))}
                  disabled={isPending}
                  className={ctaClass(plan)}
                  aria-busy={isPending}
                >
                  {isPending ? <Loader2 size={16} className="plan-cta-spin" aria-hidden /> : null}
                  <span>{ctaLabel}</span>
                  {!isPending ? <ArrowRight size={16} aria-hidden /> : null}
                </button>
                {/* Every card renders the same eight rows (an empty slot where a
                    plan has nothing to say), so the subgrid can line the
                    "What's included" headings up across all five cards. */}
                <div className="plan-sub-slot">
                  {isContact ? (
                    <p className="plan-finesub">We reply within 1 business day</p>
                  ) : null}
                </div>

                <div className="plan-features-head">
                  <div className="plan-features-divider" />
                  <div className="plan-features-label">What&apos;s included</div>
                </div>
                <ul className="plan-features">
                  {plan.features.map((f) => (
                    <li key={f}>
                      <Check size={15} className="plan-feature-check" aria-hidden />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* Trial and renewal terms: fine print at the foot of the card. */}
                <div className="plan-terms-slot">
                  {!plan.isFree && !isContact ? (
                    <RenewalTerms
                      plan={catalogPlan(plan, billing)}
                      fromInvite
                      className="plan-renewal"
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Partner program (Nov 21 redesign) ─────────────────────────────
            An emerald metal band: the pitch and CTA on the left, the four
            ways partners earn as a ruled 2x2 grid on the right. */}
        <section className="pricing-partner" aria-labelledby="pricing-partner-h">
          <div className="pricing-partner-copy">
            <span className="pricing-partner-eyebrow">Partner program</span>
            <h3 id="pricing-partner-h" className="pricing-partner-name">
              Earn with Ezana.
            </h3>
            <p className="pricing-partner-tagline">
              For creators, traders and financial professionals. Free to join: Ezana only takes a
              share when you earn, so the program grows with your audience.
            </p>
            <ul className="pricing-partner-points">
              <li>
                <i className="bi bi-check2" aria-hidden="true" /> No fee to join, ever
              </li>
              <li>
                <i className="bi bi-check2" aria-hidden="true" /> Paid monthly to your bank account
              </li>
              <li>
                <i className="bi bi-check2" aria-hidden="true" /> A partner dashboard for every
                stream
              </li>
            </ul>
            <Link href="/auth/partner/apply" className="pricing-partner-cta">
              Become a Partner <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <dl className="pricing-partner-rates">
            {PARTNER_RATES.map((r) => (
              <div key={r.label} className="pricing-partner-rate">
                <dt className="pricing-partner-rate-label">
                  <i className={`bi ${r.icon}`} aria-hidden="true" />
                  {r.label}
                  {r.soon ? <span className="pricing-partner-soon">Soon</span> : null}
                </dt>
                <dd className="pricing-partner-rate-value">{r.value}</dd>
                <dd className="pricing-partner-rate-note">{r.note}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="pricing-secure-row">
          <ShieldCheck size={14} aria-hidden />
          Card details are saved securely by Stripe · No charge until your free trial ends
        </div>
      </section>

      {/* ── API pricing: Individual and Enterprise calculator ─────────── */}
      <ApiPricingCalculator />

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
                        <div className="comp-plan-name">
                          {p.name}
                          {isHi ? <span className="comp-plan-tag">(Most valuable)</span> : null}
                        </div>
                        <div className="comp-plan-sub">
                          {subPrice === null ? 'Custom' : p.isFree ? 'Free' : `$${subPrice}/mo`}
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
                      <td>
                        <CellValue value={row.free} />
                      </td>
                      <td>
                        <CellValue value={row.starter} />
                      </td>
                      <td className="comp-highlight-col">
                        <CellValue value={row.advanced} />
                      </td>
                      <td>
                        <CellValue value={row.family} />
                      </td>
                      <td>
                        <CellValue value={row.enterprise} />
                      </td>
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
                <span className="pricing-faq-marker" aria-hidden />
              </summary>
              <p className="pricing-faq-answer">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="pricing-footer">
        <p>© {new Date().getFullYear()} Ezana Finance. All rights reserved.</p>
        <div className="pricing-footer-links">
          <Link href="/">Home</Link>
          <Link href="/#features">Features</Link>
          <Link href="/auth/login">Sign in</Link>
          <Link href="/terms-of-service">Terms</Link>
          <Link href="/privacy-policy">Privacy</Link>
          <Link href="/copyright">Copyright</Link>
        </div>
      </footer>
    </div>
  );
}
