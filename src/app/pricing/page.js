'use client';

/* ============================================================================
 *  /pricing (Nov 21, 2026 redesign: Advanced first)
 *  ----------------------------------------------------------------------------
 *  Advanced is the only plan open today (30-day trial); Free and Starter join
 *  by waitlist; Family, Organizations, the API and the Partner program are
 *  secondary. Every plan benefit and every comparison cell is read from the
 *  plan registry (src/config/plan-features.js), which also drives the
 *  server-side gates, so the page cannot promise more than the product does.
 *  Product direction: docs/pricing/PRICING_AUDIT_2026-11.md.
 *
 *  Layout: hero (headline, availability, primary CTA, four outcomes), the
 *  billing switch and three plan cards, the four-step workflow, the
 *  comparison table, how the trial works, the waitlist, secondary offers,
 *  FAQ. Styles: pricing-standalone.css (shared pieces) + pricing-advanced.css.
 * ==========================================================================*/

import { Fragment, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Loader2, Minus } from 'lucide-react';
import RenewalTerms from '@/components/billing/RenewalTerms';
import ApiPricingCalculator from '@/components/pricing/ApiPricingCalculator';
import PricingContents from '@/components/pricing/PricingContents';
import { PLANS as CATALOG } from '@/config/pricing';
import {
  EXCLUDED_FEATURES,
  FEATURE_GROUPS,
  PLAN_HIGHLIGHTS,
  PRIMARY_PLAN_IDS,
  RETAIL_PLANS,
  WORKFLOW_STEPS,
  yearlySaving,
} from '@/config/plan-features';
import { RENEWAL_POLICY_TEXT, TRIAL_DAYS } from '@/lib/billing/renewal-terms';
import { trackFunnel } from '@/lib/analytics/funnel-client';
import './pricing-standalone.css';
import './pricing-advanced.css';

const BILLING_KEY = { quarterly: 'quarter', yearly: 'year' };

/* Sections the top-left contents menu jumps to, in page order. */
const CONTENTS_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'plans', label: 'Plans and prices' },
  { id: 'workflow', label: 'How Ezana works' },
  { id: 'compare', label: 'Compare plans' },
  { id: 'trial', label: 'The Advanced trial' },
  { id: 'waitlist', label: 'The waitlist' },
  { id: 'more', label: 'Households, teams, API, partners' },
  { id: 'faq', label: 'Frequently asked' },
];

/* The four outcomes under the hero. */
const OUTCOMES = [
  { icon: 'bi-chat-square-quote', text: 'Ask Sonar, get cited answers' },
  { icon: 'bi-calculator', text: 'Run valuation scenarios' },
  { icon: 'bi-bank', text: 'Track institutional and government signals' },
  { icon: 'bi-eye', text: 'Monitor a thesis' },
];

/** Price display for a plan and billing period: the amount actually charged first. */
function priceView(planId, billing) {
  const plan = RETAIL_PLANS[planId];
  if (!plan.price) return { amount: '$0', unit: '', note: 'No card needed', perMonth: null };
  const p = plan.price[BILLING_KEY[billing]];
  return billing === 'yearly'
    ? {
        amount: `$${p.amount}`,
        unit: '/year',
        note: `Equal to $${p.perMonth} a month, billed once a year`,
        perMonth: p.perMonth,
      }
    : {
        amount: `$${p.amount}`,
        unit: '/quarter',
        note: `Equal to $${p.perMonth} a month, billed every 3 months`,
        perMonth: p.perMonth,
      };
}

/** The Stripe catalog plan (price and interval actually charged) for the renewal terms. */
const catalogPlan = (planId, billing) => {
  const key = RETAIL_PLANS[planId]?.stripeKey?.[BILLING_KEY[billing]];
  return key ? CATALOG[key] : null;
};

const ADV_SAVING = yearlySaving('advanced');

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
    q: 'How do the Free and Starter waitlists work?',
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
];

function Tip({ text }) {
  if (!text) return null;
  return (
    <span className="pr3-tip" tabIndex={0} role="button" aria-label={text}>
      <i className="bi bi-info-circle" aria-hidden="true" />
      <span className="pr3-tip-body" role="tooltip">
        {text}
      </span>
    </span>
  );
}

function Cell({ value }) {
  if (value === true) {
    return <Check className="pr3-yes" size={17} aria-label="Included" />;
  }
  if (value === false || value == null) {
    return <Minus className="pr3-no" size={17} aria-label="Not included" />;
  }
  return <span className="pr3-val">{value}</span>;
}

/* The classic scrollbar width, for the full-bleed bands' 100vw maths, and the
   sticky navbar height, for anchor offsets. */
function useNavHeight(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    const nav = document.querySelector('.navbar-sticky') || document.querySelector('.navbar');
    if (!root) return undefined;
    const write = () => {
      if (nav) {
        root.style.setProperty(
          '--pricing-nav-h',
          `${Math.round(nav.getBoundingClientRect().height)}px`,
        );
      }
      root.style.setProperty(
        '--pricing-sbw',
        `${Math.max(0, window.innerWidth - document.documentElement.clientWidth)}px`,
      );
    };
    write();
    const ro = nav ? new ResizeObserver(write) : null;
    ro?.observe(nav);
    window.addEventListener('resize', write);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', write);
    };
  }, [rootRef]);
}

export default function PricingPage() {
  const [billing, setBilling] = useState('quarterly');
  const [pending, setPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorCode, setErrorCode] = useState(null);
  const [requested, setRequested] = useState(null);
  const rootRef = useRef(null);
  useNavHeight(rootRef);

  /* ?billing= and ?plan= survive a round trip (back from Stripe, a Sonar link). */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('billing') === 'yearly') setBilling('yearly');
    const plan = p.get('plan');
    if (plan && RETAIL_PLANS[plan]) {
      setRequested(plan);
      const t = setTimeout(() => {
        document
          .getElementById(PRIMARY_PLAN_IDS.includes(plan) ? `plan-${plan}` : 'more')
          ?.scrollIntoView({ block: 'center' });
      }, 150);
      trackFunnel('pricing_view', { plan });
      return () => clearTimeout(t);
    }
    trackFunnel('pricing_view');
    return undefined;
  }, []);

  const changeBilling = (next) => {
    if (next === billing) return;
    setBilling(next);
    setErrorMsg('');
    setErrorCode(null);
    trackFunnel('billing_toggle', { billing: next });
  };

  const waitlistHref = (planId) =>
    `/auth/signup?plan=${planId}${RETAIL_PLANS[planId].price ? `&billing=${billing}` : ''}`;

  /**
   * Advanced: signed-out visitors go to the trial signup with the billing
   * period; signed-in accounts go straight to Stripe Checkout. A billing
   * period with no Stripe price yet is reported, with the other period
   * offered, instead of failing silently.
   */
  async function startAdvanced(period = billing) {
    trackFunnel('plan_cta', { plan: 'advanced', billing: period });
    setPending(true);
    setErrorMsg('');
    setErrorCode(null);
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planKey: RETAIL_PLANS.advanced.stripeKey[BILLING_KEY[period]],
          cancelPath: '/pricing',
        }),
      });
      if (res.status === 401) {
        trackFunnel('trial_signup_started', { plan: 'advanced', billing: period });
        window.location.href = `/auth/start-trial?billing=${period}`;
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.url || data.switched || data.alreadySubscribed)) {
        if (data.alreadySubscribed) {
          setErrorMsg('You are already on Advanced.');
          setPending(false);
          return;
        }
        window.location.assign(data.url || '/home');
        return;
      }
      setErrorMsg(
        res.status === 503
          ? 'Billing is temporarily unavailable. Please try again in a few minutes.'
          : data.error || `Checkout could not start (HTTP ${res.status}). Please try again.`,
      );
      setErrorCode(data.code || null);
    } catch {
      setErrorMsg('Could not reach billing. Check your connection and try again.');
    }
    setPending(false);
  }

  const advPrice = priceView('advanced', billing);
  const advCatalog = catalogPlan('advanced', billing);

  return (
    <div className="pricing-page--standalone pr3" ref={rootRef}>
      <PricingContents sections={CONTENTS_SECTIONS} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header className="pr3-hero" id="overview" data-contents-section>
        <h1 className="pr3-h1">
          One place to investigate <span className="pr3-accent">what moves markets.</span>
        </h1>
        <p className="pr3-sub">
          Discover the signal. Verify the source. Model the decision. Track what changes.
        </p>
        <p className="pr3-availability">
          <span className="pr3-dot" aria-hidden="true" />
          Advanced is open now with a {TRIAL_DAYS}-day trial. Free and Starter are joining by
          waitlist.
        </p>
        <div className="pr3-hero-actions">
          <button
            type="button"
            className="pr3-btn pr3-btn--primary"
            onClick={() => startAdvanced()}
            disabled={pending}
          >
            {pending ? <Loader2 size={15} className="plan-cta-spin" aria-hidden /> : null}
            Start {TRIAL_DAYS}-day Advanced trial
            <ArrowRight size={15} aria-hidden />
          </button>
          <a href="#compare" className="pr3-btn pr3-btn--text">
            Compare plans
          </a>
        </div>
        <p className="pr3-hero-terms">
          Card required, nothing charged today. Then {advPrice.amount}{' '}
          {billing === 'yearly' ? 'every year' : 'every 3 months'} until you cancel.
        </p>
        <ul className="pr3-outcomes" aria-label="What you can do with Advanced">
          {OUTCOMES.map((o) => (
            <li key={o.text}>
              <i className={`bi ${o.icon}`} aria-hidden="true" />
              {o.text}
            </li>
          ))}
        </ul>
      </header>

      {/* ── Plans ────────────────────────────────────────────────────── */}
      <section
        className="pricing-cards-section pr3-plans"
        id="plans"
        data-contents-section
        aria-labelledby="pr3-plans-h"
      >
        <h2 id="pr3-plans-h" className="pr3-visually-hidden">
          Plans and prices
        </h2>

        <div className="pr3-billing">
          <div className="billing-switch-pill" role="group" aria-label="Billing period">
            <button
              type="button"
              className={`billing-switch-label${billing === 'quarterly' ? ' is-on' : ''}`}
              aria-pressed={billing === 'quarterly'}
              onClick={() => changeBilling('quarterly')}
            >
              Quarterly
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={billing === 'yearly'}
              aria-label="Bill yearly"
              className="billing-switch"
              onClick={() => changeBilling(billing === 'yearly' ? 'quarterly' : 'yearly')}
            >
              <span className="billing-switch-thumb" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`billing-switch-label${billing === 'yearly' ? ' is-on' : ''}`}
              aria-pressed={billing === 'yearly'}
              onClick={() => changeBilling('yearly')}
            >
              Yearly <span className="save-pill">Save {ADV_SAVING.pct}%</span>
            </button>
          </div>
          <p className="pr3-billing-note">
            Prices in US dollars. Quarterly and yearly billing only.
          </p>
        </div>

        {errorMsg ? (
          <div className="pr3-error" role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true" />
            <span>
              {errorMsg}
              {errorCode === 'price_unavailable' && billing === 'quarterly' ? (
                <>
                  {' '}
                  <button
                    type="button"
                    className="pr3-inline-link"
                    onClick={() => {
                      changeBilling('yearly');
                      startAdvanced('yearly');
                    }}
                  >
                    Start with yearly billing
                  </button>
                </>
              ) : null}
            </span>
          </div>
        ) : null}

        <div className="pr3-cards">
          {PRIMARY_PLAN_IDS.map((id) => {
            const plan = RETAIL_PLANS[id];
            const pv = priceView(id, billing);
            const isAdv = id === 'advanced';
            return (
              <article
                key={id}
                id={`plan-${id}`}
                className={`pr3-card${isAdv ? ' pr3-card--advanced' : ' pr3-card--waitlist'}${
                  requested === id ? ' is-requested' : ''
                }`}
                aria-labelledby={`pr3-${id}-name`}
              >
                <div className="pr3-card-top">
                  <span className={`pr3-status${isAdv ? ' pr3-status--open' : ''}`}>
                    {isAdv ? 'Available now' : 'Waitlist'}
                  </span>
                  <h3 id={`pr3-${id}-name`} className="pr3-card-name">
                    {plan.name}
                  </h3>
                  <p className="pr3-card-promise">{plan.promise}</p>
                  <p className="pr3-card-audience">{plan.audience}</p>
                </div>

                <div className="pr3-price">
                  <span className="pr3-price-amount">{pv.amount}</span>
                  {pv.unit ? <span className="pr3-price-unit">{pv.unit}</span> : null}
                </div>
                <p className="pr3-price-note">{pv.note}</p>

                {isAdv ? (
                  <>
                    <button
                      type="button"
                      className="plan-cta plan-cta--invert pr3-card-cta"
                      onClick={() => startAdvanced()}
                      disabled={pending}
                    >
                      {pending ? <Loader2 size={14} className="plan-cta-spin" aria-hidden /> : null}
                      <span>{plan.cta}</span>
                      <ArrowRight size={14} aria-hidden />
                    </button>
                    <div className="pr3-terms">
                      <p className="pr3-terms-lead">
                        <i className="bi bi-credit-card" aria-hidden="true" /> Card required.
                        Nothing is charged today.
                      </p>
                      {advCatalog ? <RenewalTerms plan={advCatalog} /> : null}
                    </div>
                  </>
                ) : (
                  <>
                    <a
                      href={waitlistHref(id)}
                      className="plan-cta plan-cta--primary pr3-card-cta"
                      onClick={() => trackFunnel('plan_cta', { plan: id, billing })}
                    >
                      <span>{plan.cta}</span>
                      <ArrowRight size={14} aria-hidden />
                    </a>
                    <p className="pr3-wait-note">
                      {plan.price
                        ? `Saves a card on Stripe, nothing charged. Invites open as a free ${TRIAL_DAYS}-day Starter trial.`
                        : 'No card, ever. We email your invite when your wave opens.'}
                    </p>
                  </>
                )}

                <ul className="pr3-highlights">
                  {PLAN_HIGHLIGHTS[id].map((h) => (
                    <li key={h.text}>
                      <i className="bi bi-check2" aria-hidden="true" />
                      <span>{h.text}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <p className="pr3-more-line">
          Also: <a href="#more">Household plans</a> · <a href="#more">Organizations</a> ·{' '}
          <Link href="/ezana-api">Ezana API</Link> ·{' '}
          <Link href="/auth/partner/apply">Partner program</Link>
        </p>
      </section>

      {/* ── Workflow ────────────────────────────────────────────────── */}
      <section
        className="pr3-section pr3-workflow"
        id="workflow"
        data-contents-section
        aria-labelledby="pr3-workflow-h"
      >
        <h2 id="pr3-workflow-h" className="pr3-h2">
          From a signal to a decision, in one place
        </h2>
        <p className="pr3-lede">
          What Advanced connects: the same workflow, start to finish, on public filings and reported
          numbers.
        </p>
        <ol className="pr3-steps">
          {WORKFLOW_STEPS.map((s, i) => (
            <li key={s.id} className="pr3-step">
              <span className="pr3-step-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="pr3-step-ic" aria-hidden="true">
                <i className={`bi ${s.icon}`} />
              </span>
              <h3 className="pr3-step-title">{s.title}</h3>
              <p className="pr3-step-body">{s.body}</p>
              <Link href={s.href} className="pr3-step-link">
                {s.linkLabel} <ArrowRight size={13} aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Comparison ──────────────────────────────────────────────── */}
      <section
        className="pr3-section pr3-compare"
        id="compare"
        data-contents-section
        aria-labelledby="pr3-compare-h"
      >
        <h2 id="pr3-compare-h" className="pr3-h2">
          Compare plans
        </h2>
        <p className="pr3-lede">
          Numbers are the limits the product enforces. A dash means not included.
        </p>
        <div className="pr3-table-wrap" role="region" aria-label="Plan comparison" tabIndex={0}>
          <table className="pr3-table">
            <colgroup>
              <col className="pr3-col-feature" />
              <col />
              <col />
              <col className="pr3-col-adv" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="pr3-th-feature">
                  <span className="pr3-visually-hidden">Feature</span>
                </th>
                {PRIMARY_PLAN_IDS.map((id) => (
                  <th key={id} scope="col" className={id === 'advanced' ? 'pr3-th-adv' : ''}>
                    <span className="pr3-th-name">{RETAIL_PLANS[id].name}</span>
                    <span className="pr3-th-price">
                      {RETAIL_PLANS[id].price
                        ? `$${RETAIL_PLANS[id].price[BILLING_KEY[billing]].amount}/${
                            billing === 'yearly' ? 'yr' : 'qtr'
                          }`
                        : '$0'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_GROUPS.map((g) => (
                <Fragment key={g.id}>
                  <tr className="pr3-group">
                    <th scope="colgroup" colSpan={4}>
                      {g.label}
                    </th>
                  </tr>
                  {g.features.map((f) => (
                    <tr key={f.id}>
                      <th scope="row" className="pr3-feature">
                        {f.label}
                        <Tip text={f.latency} />
                      </th>
                      {[0, 1, 2].map((t) => (
                        <td key={t} className={t === 2 ? 'pr3-td-adv' : ''}>
                          <Cell value={f.values[t]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <details className="pr3-excluded">
          <summary>Built but not included in any plan yet</summary>
          <ul>
            {EXCLUDED_FEATURES.map((e) => (
              <li key={e.label}>
                {e.label} <span className="pr3-excluded-status">{e.status}</span>
              </li>
            ))}
          </ul>
        </details>
      </section>

      {/* ── The Advanced trial ──────────────────────────────────────── */}
      <section
        className="pr3-section pr3-trial"
        id="trial"
        data-contents-section
        aria-labelledby="pr3-trial-h"
      >
        <h2 id="pr3-trial-h" className="pr3-h2">
          How the Advanced trial works
        </h2>
        <ol className="pr3-trial-steps">
          <li>
            <span className="pr3-step-num">01</span>
            <h3>Create your account and pick a billing period</h3>
            <p>
              Quarterly ({`$${RETAIL_PLANS.advanced.price.quarter.amount}`} every 3 months) or
              Yearly ({`$${RETAIL_PLANS.advanced.price.year.amount}`} a year). Your choice carries
              through to Stripe.
            </p>
          </li>
          <li>
            <span className="pr3-step-num">02</span>
            <h3>Add a card on Stripe</h3>
            <p>
              Nothing is charged today. Stripe shows the date your {TRIAL_DAYS}-day trial ends and
              the amount after it.
            </p>
          </li>
          <li>
            <span className="pr3-step-num">03</span>
            <h3>Choose where to start</h3>
            <p>
              Research a stock, follow institutional money or explore a strategy. Help is a click
              away at the <Link href="/help-center">Help Center</Link> or{' '}
              <a href="mailto:support@ezana.world">support@ezana.world</a>.
            </p>
          </li>
        </ol>
      </section>

      {/* ── Waitlist ────────────────────────────────────────────────── */}
      <section
        className="pr3-section pr3-waitlist"
        id="waitlist"
        data-contents-section
        aria-labelledby="pr3-waitlist-h"
      >
        <h2 id="pr3-waitlist-h" className="pr3-h2">
          Free and Starter open by waitlist
        </h2>
        <p className="pr3-lede">
          We open access in focused cohorts so every new member gets a working account and real
          support. Joining does not give access yet, and we have not set dates for each wave.
        </p>
        <div className="pr3-wait-grid">
          <div>
            <h3>Free</h3>
            <p>Your details only. No card, ever. We email your invite when your wave opens.</p>
          </div>
          <div>
            <h3>Starter and Family</h3>
            <p>
              Your details, then a card saved on Stripe. Nothing is charged while you wait. Your
              invite opens a free {TRIAL_DAYS}-day Starter trial, and you can move to Advanced any
              time.
            </p>
          </div>
          <div>
            <h3>Want in now?</h3>
            <p>
              Advanced skips the waitlist.{' '}
              <button type="button" className="pr3-inline-link" onClick={() => startAdvanced()}>
                Start your {TRIAL_DAYS}-day trial
              </button>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ── Secondary offers ────────────────────────────────────────── */}
      <section
        className="pr3-section pr3-more"
        id="more"
        data-contents-section
        aria-labelledby="pr3-more-h"
      >
        <h2 id="pr3-more-h" className="pr3-h2">
          Households, teams, developers and partners
        </h2>
        <div className="pr3-more-grid">
          <div className={`pr3-more-item${requested === 'family' ? ' is-requested' : ''}`}>
            <h3>
              Household plans <span className="pr3-status">Waitlist</span>
            </h3>
            <p>
              Family is ${RETAIL_PLANS.family.price.quarter.amount} every 3 months or $
              {RETAIL_PLANS.family.price.year.amount} a year and includes everything in Advanced.
              Shared household portfolios and parental controls are planned, not built yet.
            </p>
            <a
              href={waitlistHref('family')}
              className="pr3-text-link"
              onClick={() => trackFunnel('plan_cta', { plan: 'family', billing })}
            >
              Join Family waitlist <ArrowRight size={13} aria-hidden />
            </a>
          </div>
          <div className="pr3-more-item">
            <h3>Organizations and student funds</h3>
            <p>
              Team Hub for investment councils: roles and permissions, the pitch pipeline, shared
              research and fund analytics. Scoped and priced with each organization.
            </p>
            <a
              href="mailto:enterprise@ezana.world"
              className="pr3-text-link"
              onClick={() => trackFunnel('plan_cta', { plan: 'enterprise' })}
            >
              Contact us <ArrowRight size={13} aria-hidden />
            </a>
          </div>
          <div className="pr3-more-item">
            <h3>Ezana API</h3>
            <p>
              Metered access to Ezana data for your own tools, billed separately from every plan.
            </p>
            <Link href="/ezana-api" className="pr3-text-link">
              API docs and access <ArrowRight size={13} aria-hidden />
            </Link>
          </div>
          <div className="pr3-more-item">
            <h3>Partner program</h3>
            <p>
              For creators and financial professionals: 70% of course revenue and $25 per referral
              that activates a paid plan. Free to join.
            </p>
            <Link href="/auth/partner/apply" className="pr3-text-link">
              Apply to partner <ArrowRight size={13} aria-hidden />
            </Link>
          </div>
        </div>
        <details className="pr3-api-fold">
          <summary>Estimate API usage</summary>
          <ApiPricingCalculator />
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

      <footer className="pricing-footer">
        <p>
          © {new Date().getFullYear()} Ezana Finance. Research and education, not financial advice.
        </p>
        <div className="pricing-footer-links">
          <Link href="/">Home</Link>
          <Link href="/help-center">Help Center</Link>
          <Link href="/auth/signin">Sign in</Link>
          <Link href="/terms-of-service">Terms</Link>
          <Link href="/privacy-policy">Privacy</Link>
          <Link href="/copyright">Copyright</Link>
        </div>
      </footer>
    </div>
  );
}
