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
import { Check, Minus, ArrowRight, ShieldCheck, Loader2, ChevronDown } from 'lucide-react';
import RenewalTerms from '@/components/billing/RenewalTerms';
import ApiPricingCalculator from '@/components/pricing/ApiPricingCalculator';
import PricingContents from '@/components/pricing/PricingContents';
import { PLANS as CATALOG } from '@/config/pricing';
import {
  EXCLUDED_FEATURES,
  FEATURE_GROUPS,
  PLAN_HIGHLIGHTS,
  RETAIL_PLANS,
  SONAR_SUMMARY,
  yearlySaving,
} from '@/config/plan-features';
import { RENEWAL_POLICY_TEXT, TRIAL_DAYS } from '@/lib/billing/renewal-terms';
import { trackFunnel } from '@/lib/analytics/funnel-client';
import './pricing-standalone.css';

/* ──────────────────────────────────────────────────────────────────────────
 *  Plan catalog for the marketing page.
 *
 *  `stripeKey` maps each marketing tier to the concrete Stripe plan key in
 *  `src/config/pricing.js` so /api/stripe/create-checkout-session can resolve
 *  a real Price ID. Enterprise routes to sales (no Stripe), and a null
 *  stripeKey means the button falls back to signup.
 * ────────────────────────────────────────────────────────────────────────── */
/* Nov 21, 2026: the previous card design, with the plan strategy from the
   plan registry (src/config/plan-features.js): who each plan is for, the
   benefits it actually includes (the same numbers the product enforces),
   its availability (Advanced open now, the rest by waitlist) and its prices.
   Nothing here promises a feature the registry lists as not included. */
const fromRegistry = (id, extra = {}) => {
  const r = RETAIL_PLANS[id];
  return {
    id,
    name: r.name,
    tagline: r.audience,
    monthlyPrice: r.price ? r.price.quarter.perMonth : 0,
    yearlyPrice: r.price ? r.price.year.perMonth : 0,
    highlight: false,
    stripeKey: r.stripeKey,
    cta: r.cta,
    waitlist: r.availability === 'waitlist',
    features: (PLAN_HIGHLIGHTS[id] || []).map((h) => h.text),
    ...extra,
  };
};

const PLANS = [
  fromRegistry('free', { isFree: true }),
  fromRegistry('starter'),
  fromRegistry('advanced', { highlight: true, trialNow: true, badge: 'Available now' }),
  fromRegistry('family', {
    features: [
      'Everything in Advanced',
      `${SONAR_SUMMARY[3].dailyQueries} Sonar answers and ${SONAR_SUMMARY[3].deepRunsPerDay} deep research runs a day`,
      'Built for a household',
      'Join the waitlist to hear when it opens',
    ],
  }),
  {
    id: 'organizations',
    name: 'Organizations',
    tagline: 'For investment councils, student funds and teams.',
    monthlyPrice: null,
    yearlyPrice: null,
    highlight: false,
    contactSales: true,
    cta: 'Contact us',
    ctaHref: 'mailto:enterprise@ezana.world',
    features: [
      'Team Hub for your organization',
      'Roles and permissions',
      'Pitch pipeline and shared research',
      'Fund analytics',
      'Scoped and priced with each organization',
      'Ezana API billed separately',
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

/* Compare plans: the registry's feature groups, one column per retail plan
   (the values are the limits the product enforces). */
const COMPARE_PLANS = PLANS.filter((p) => RETAIL_PLANS[p.id]);
const COMPARE_TIER = { free: 0, starter: 1, advanced: 2, family: 3 };
const ADV_SAVING = yearlySaving('advanced');

/** The Stripe catalog plan (price and period actually charged) for a card. */
const catalogPlan = (plan, billing) =>
  CATALOG[plan.stripeKey?.[billing === 'yearly' ? 'year' : 'quarter']] || null;

/**
 * Pure: everything a plan shows about its price for one billing interval.
 * Shared by the desktop cards and the mobile price list so the two can never
 * disagree. Annual: per-month equivalent up front, the yearly total and the
 * saving underneath, and the monthly price struck through.
 */
function planPricing(plan, billing) {
  if (plan.contactSales) {
    return {
      kind: 'custom',
      main: 'Custom',
      unit: '',
      note: 'Priced with each organization',
      was: null,
    };
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
  /* Quarterly (Nov 21, second pass): the amount invoiced every three months
     is the headline figure, with the monthly rate underneath. */
  const quarter = plan.monthlyPrice * 3;
  return {
    kind: 'paid',
    main: `$${quarter}`,
    unit: '/qtr',
    note: `$${plan.monthlyPrice}/mo · billed quarterly`,
    was: null,
    total: quarter,
  };
}

/* Nov 21 (second pass): Advanced starts its free month straight away;
   Free, Starter and Family join the waitlist. */
function ctaLabelFor(plan, isPending) {
  if (isPending) return 'Opening…';
  return plan.cta;
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
    body: 'Free asks only for your details. Starter and Family also save a card on Stripe; nothing is charged while you wait.',
  },
  {
    icon: 'bi-envelope-check',
    title: 'Get your invite',
    body: `When your wave opens we email your invite to a free ${TRIAL_DAYS}-day Starter trial.`,
  },
  {
    icon: 'bi-arrow-up-right-circle',
    title: 'Choose your plan',
    body: 'Keep Starter, or move to Advanced at any time, during the trial or after it.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Why is Advanced the only plan open right now?',
    a: 'Ezana is opening in focused cohorts so every new member gets a working account and real support. Advanced is the full research workflow, and it is the plan we can support well today. Free and Starter open by waitlist, and we email your invite when your wave opens. We have not set dates for those waves.',
  },
  {
    q: `Is Advanced really free for ${TRIAL_DAYS} days?`,
    a: `Yes. You create an account, add a card on Stripe and get ${TRIAL_DAYS} days of Advanced with nothing charged. If you cancel before the trial ends, you are not charged at all. One free trial per customer.`,
  },
  {
    q: 'Why is a card required for the trial?',
    a: 'So Advanced can continue without interruption if you keep it. Stripe stores the card and Ezana never sees the full number. Nothing is charged until the trial ends.',
  },
  {
    q: 'What gets charged, and when?',
    a: `When the trial ends, the billing period you picked is charged: $${RETAIL_PLANS.advanced.price.quarter.amount} every 3 months on Quarterly, or $${RETAIL_PLANS.advanced.price.year.amount} once a year on Yearly (about ${ADV_SAVING.pct}% less than four quarters). Prices are in US dollars. It renews automatically on the same schedule until you cancel.`,
  },
  {
    q: 'How do I cancel or change plans?',
    a: `Anytime in Settings, Billing, online, without calling or emailing us. ${RENEWAL_POLICY_TEXT}`,
  },
  {
    q: 'How do the Free, Starter and Family waitlists work?',
    a: `Join from the plan card. Free asks only for your details, never a card. Starter and Family also save a card on Stripe so the trial can start as soon as you are invited; nothing is charged while you wait. When your wave opens you get an invite to a free ${TRIAL_DAYS}-day Starter trial, and you can move to Advanced at any time.`,
  },
  {
    q: 'How current are congressional trades and stock quotes?',
    a: 'Members of Congress can report a trade up to 45 days after it happens, so Ezana shows each trade when its disclosure is published, never at trade time. 13F holdings are filed up to 45 days after each quarter. Stock quotes come from market data providers and every view shows when it was last updated; they are not exchange-direct real-time quotes.',
  },
  {
    q: 'What can Sonar and Quant Lab do today?',
    a: 'Sonar answers questions in plain language from Ezana’s datasets and the web, with citations and a list of what it searched; the plan sets how many answers and deep research runs you get each day and which datasets it searches. On Advanced, Quant Lab runs Strategy Lab, backtests on daily prices, factor studies, pairs and correlation, portfolio risk and GARCH, PCA and Markov models. Paper deployment of strategies, a universe-wide pairs scanner, saved factor studies and stress tests are planned and not included yet.',
  },
  {
    q: 'Is advanced modelling included?',
    a: 'The DCF and reverse DCF, three-statement forecast, comparable companies and earnings call analyzer are open on every plan. Advanced adds AI model reports: the GRPV score and an AI read of each model. AI reports are a structured opinion, not a priced valuation.',
  },
  {
    q: 'What is not included in any retail plan?',
    a: 'Live brokerage order entry, copy trading, automated strategy deployment, Sonar report exports, household sharing features and API access are not part of Free, Starter or Advanced. The Ezana API is priced separately. Ezana is research and education, not financial advice.',
  },
  {
    q: 'How does the Partner program pay?',
    a: 'Partners join free. You keep 70% of course revenue, earn $25 for each referral that activates a paid plan, and can publish on Ezana Echo to grow subscribers. Copy-trading profit share is coming soon.',
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

/** Data-freshness note beside a comparison row (keyboard and hover). */
function Tip({ text }) {
  if (!text) return null;
  return (
    <span className="comp-tip" tabIndex={0} role="button" aria-label={text}>
      <i className="bi bi-info-circle" aria-hidden="true" />
      <span className="comp-tip-body" role="tooltip">
        {text}
      </span>
    </span>
  );
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
                  fromInvite={!plan.trialNow}
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
/* Nov 21: the sections the top-left contents menu jumps to, in page order. */
const CONTENTS_SECTIONS = [
  { id: 'overview', label: 'Simple pricing' },
  { id: 'waitlist', label: 'How the waitlist works' },
  { id: 'plans', label: 'Plans and prices' },
  { id: 'partner-program', label: 'Partner program' },
  { id: 'api-pricing', label: 'API pricing' },
  { id: 'compare', label: 'Compare plans' },
  { id: 'faq', label: 'Frequently asked' },
];

function useNavHeight(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    const nav = document.querySelector('.navbar-sticky') || document.querySelector('.navbar');
    if (!root || !nav) return undefined;
    const write = () => {
      root.style.setProperty(
        '--pricing-nav-h',
        `${Math.round(nav.getBoundingClientRect().height)}px`,
      );
      /* Classic scrollbar width, for the full-bleed Partner band's 100vw maths. */
      root.style.setProperty(
        '--pricing-sbw',
        `${Math.max(0, window.innerWidth - document.documentElement.clientWidth)}px`,
      );
    };
    write();
    const ro = new ResizeObserver(write);
    ro.observe(nav);
    window.addEventListener('resize', write);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', write);
    };
  }, [rootRef]);
}

export default function PricingPage() {
  const [billing, setBillingState] = useState('quarterly'); // Nov 21: quarterly invoicing shown by default
  const setBilling = (next) => {
    if (next === billing) return;
    setBillingState(next);
    trackFunnel('billing_toggle', { billing: next });
  };
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
    try {
      if (new URL(window.location.href).searchParams.get('billing') === 'yearly') {
        setBillingState('yearly');
      }
    } catch {
      /* ignore */
    }
    trackFunnel('pricing_view', id && RETAIL_PLANS[id] ? { plan: id } : undefined);
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

  const billingKey = billing === 'yearly' ? 'year' : 'quarter';

  /**
   * One handler for every plan button (Nov 21 strategy):
   *  - Advanced: signed-in accounts go straight to Stripe Checkout; signed-out
   *    visitors go to the trial signup with the billing period.
   *  - Free, Starter, Family: the waitlist (with the billing period for paid
   *    plans). They never open Checkout from here.
   *  - Organizations: email us.
   */
  async function selectPlan(plan) {
    if (plan.contactSales) {
      trackFunnel('plan_cta', { plan: 'enterprise' });
      window.location.href = plan.ctaHref;
      return;
    }
    trackFunnel('plan_cta', { plan: plan.id, ...(plan.isFree ? {} : { billing }) });
    if (!plan.trialNow) {
      window.location.href = `/auth/signup?plan=${plan.id}${plan.isFree ? '' : `&billing=${billing}`}`;
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
        body: JSON.stringify({ planKey: plan.stripeKey[billingKey], cancelPath: '/pricing' }),
      });
      if (res.status === 401) {
        trackFunnel('trial_signup_started', { plan: plan.id, billing });
        window.location.href = `/auth/start-trial?billing=${billing}`;
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.alreadySubscribed) {
        setNoticeMsg("You're already on this plan.");
        setPendingPlan(null);
        return;
      }
      if (res.ok && (data?.url || data?.switched)) {
        window.location.assign(data.url || '/home?checkout=switched');
        return;
      }
      setErrorMsg(
        res.status === 503
          ? 'Billing is temporarily unavailable. Please try again in a few minutes.'
          : data?.error || `Checkout could not start (HTTP ${res.status}). Please try again.`,
      );
    } catch {
      setErrorMsg('Could not reach billing. Check your connection and try again.');
    }
    setPendingPlan(null);
  }

  return (
    <div className="pricing-page--standalone" ref={rootRef}>
      <PricingContents sections={CONTENTS_SECTIONS} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header className="pricing-hero" id="overview" data-contents-section>
        <h1 className="pricing-h1">
          Simple pricing. <span className="pricing-h1-accent">Serious investing.</span>
        </h1>
        <p className="pricing-subtitle">
          <span className="pricing-subtitle-long">
            Advanced is open now with a free {TRIAL_DAYS}-day trial. Free, Starter and Family are
            joining by waitlist. No charge until a trial ends, cancel anytime.
          </span>
          <span className="pricing-subtitle-short">
            Advanced is free for {TRIAL_DAYS} days. Cancel anytime.
          </span>
        </p>
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
      <section
        className="pricing-waitlist"
        id="waitlist"
        data-contents-section
        aria-labelledby="pricing-waitlist-h"
      >
        <h2 id="pricing-waitlist-h" className="pricing-waitlist-h">
          How the waitlist works
        </h2>
        <ol className="pricing-waitlist-steps">
          {WAITLIST_STEPS.map((step, i) => (
            <li key={step.title} className="pricing-waitlist-step">
              <span className="pricing-waitlist-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="pricing-waitlist-ic" aria-hidden="true">
                <i className={`bi ${step.icon}`} />
              </span>
              <span className="pricing-waitlist-title">{step.title}</span>
              <span className="pricing-waitlist-body">{step.body}</span>
            </li>
          ))}
        </ol>
        <p className="pricing-waitlist-skip">
          Want in now? <strong>Advanced</strong> skips the waitlist and starts a free {TRIAL_DAYS}
          -day trial today.
        </p>
      </section>

      {/* Nov 21: the billing switch sits directly above the plan cards, below
          the three waitlist steps, so the choice is made next to the prices it
          changes. */}
      <div className="pricing-billing-row">
        {/* Nov 19: the switch pill (Quarterly, switch, Yearly) in the landing Sonar
            band's glossy emerald metal finish. */}
        <div className="billing-switch-pill" role="group" aria-label="Billing interval">
          <button
            type="button"
            className={`billing-switch-label${billing === 'quarterly' ? ' is-on' : ''}`}
            aria-pressed={billing === 'quarterly'}
            onClick={() => setBilling('quarterly')}
          >
            Quarterly
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={billing === 'yearly'}
            aria-label="Bill yearly"
            className="billing-switch"
            onClick={() => setBilling(billing === 'yearly' ? 'quarterly' : 'yearly')}
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
      </div>

      {/* ── Plan Cards ──────────────────────────────────────────────── */}
      <section
        className="pricing-cards-section"
        id="plans"
        data-contents-section
        aria-label="Plans"
      >
        <PlanList
          billing={billing}
          openPlan={openPlan}
          setOpenPlan={setOpenPlan}
          pendingPlan={pendingPlan}
          onSelect={selectPlan}
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
                  onClick={() => selectPlan(plan)}
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
                      fromInvite={!plan.trialNow}
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
        <section
          className="pricing-partner"
          id="partner-program"
          data-contents-section
          aria-labelledby="pricing-partner-h"
        >
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
      <section
        className="pricing-comparison-section"
        id="compare"
        data-contents-section
        aria-labelledby="compare-heading"
      >
        <h2 id="compare-heading">Compare plans</h2>
        <p className="comp-lede">
          Numbers are the limits the product enforces. A dash means not included.
        </p>
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            {/* Fixed column widths so every body cell shares a centerline with
                the plan-name header directly above it. Without this, long row
                labels can make one column wider than its neighbors and shift
                the visual center of the checkmarks. */}
            <colgroup>
              <col className="comp-col-feature" />
              {COMPARE_PLANS.map((p) => (
                <col key={p.id} className="comp-col-plan" />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="comp-feature-col">Features</th>
                {COMPARE_PLANS.map((p) => {
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
              {FEATURE_GROUPS.map((group) => (
                <Fragment key={group.id}>
                  <tr className="comp-category-row">
                    <td colSpan={COMPARE_PLANS.length + 1}>{group.label}</td>
                  </tr>
                  {group.features.map((f) => (
                    <tr key={f.id}>
                      <td className="comp-feature-name">
                        {f.label}
                        <Tip text={f.latency} />
                      </td>
                      {COMPARE_PLANS.map((p) => (
                        <td key={p.id} className={p.highlight ? 'comp-highlight-col' : ''}>
                          <CellValue value={f.values[COMPARE_TIER[p.id]] ?? false} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <details className="comp-excluded">
          <summary>Built but not included in any plan yet</summary>
          <ul>
            {EXCLUDED_FEATURES.map((e) => (
              <li key={e.label}>
                {e.label} <span className="comp-excluded-status">{e.status}</span>
              </li>
            ))}
          </ul>
        </details>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section
        className="pricing-faq-section"
        id="faq"
        data-contents-section
        aria-labelledby="faq-heading"
      >
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
