'use client';

/**
 * AdvancedWelcome (Nov 21, 2026): the first screen after an Advanced trial
 * checkout (/home?checkout=success&welcome=advanced, set by
 * create-checkout-session). One question, three working starting points, and
 * a skip. Every link goes to a real workflow; nothing is pre-filled with
 * sample findings.
 *
 *   Research a stock          -> Company research, the DCF workbench
 *   Follow the money          -> Sonar, the institutional and policy datasets
 *   Explore a strategy        -> Quant Lab Strategy Lab
 *
 * The choice is recorded as a funnel event (goal only, no query text). The
 * trial's status itself comes from the Stripe webhook, not from this page.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackFunnel } from '@/lib/analytics/funnel-client';
import { TRIAL_DAYS } from '@/lib/billing/renewal-terms';
import './advanced-welcome.css';

const GOALS = [
  {
    id: 'research',
    icon: 'bi-building',
    title: 'Research a stock',
    body: 'Search a ticker, read the company overview, then run a DCF on reported numbers and read the AI model report.',
    href: '/company-research?tool=dcf',
  },
  {
    id: 'money',
    icon: 'bi-bank',
    title: 'Follow the money',
    body: 'Ask Sonar about congressional trades, 13F holdings, lobbying and government contracts, with every source cited.',
    href: '/sonar',
  },
  {
    id: 'quant',
    icon: 'bi-graph-up',
    title: 'Explore a strategy',
    body: 'Build a rule in Strategy Lab, backtest it on daily prices and check its risk. Research, not a validated strategy.',
    href: '/for-the-quants/strategy-lab',
  },
];

export function AdvancedWelcome() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('welcome') === 'advanced') setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    dialogRef.current?.querySelector('a, button')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') close('skip');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* Drop the query so a reload does not reopen it. */
  const clearQuery = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('welcome');
    url.searchParams.delete('checkout');
    window.history.replaceState(null, '', url.pathname + (url.search || ''));
  };

  function close(reason) {
    if (reason === 'skip') trackFunnel('onboarding_skip', { plan: 'advanced' });
    clearQuery();
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="aw-scrim" role="presentation" onClick={() => close('skip')}>
      <div
        ref={dialogRef}
        className="aw-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="aw-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="aw-eyebrow">
          <i className="bi bi-stars" aria-hidden="true" /> Your {TRIAL_DAYS}-day Advanced trial
        </p>
        <h2 id="aw-title" className="aw-title">
          Where would you like to start?
        </h2>
        <p className="aw-sub">
          Pick one. Everything else stays a click away, and you can change course anytime.
        </p>
        <ul className="aw-goals">
          {GOALS.map((g) => (
            <li key={g.id}>
              <a
                href={g.href}
                className="aw-goal"
                onClick={(e) => {
                  e.preventDefault();
                  trackFunnel('onboarding_goal', { plan: 'advanced', goal: g.id });
                  clearQuery();
                  router.push(g.href);
                }}
              >
                <span className="aw-goal-ic" aria-hidden="true">
                  <i className={`bi ${g.icon}`} />
                </span>
                <span className="aw-goal-text">
                  <span className="aw-goal-title">{g.title}</span>
                  <span className="aw-goal-body">{g.body}</span>
                </span>
                <i className="bi bi-arrow-right aw-goal-go" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        <div className="aw-foot">
          <p className="aw-help">
            Questions? The <a href="/help-center">Help Center</a> or{' '}
            <a href="mailto:support@ezana.world">support@ezana.world</a>. Manage or cancel the trial
            in <a href="/settings?tab=billing">Settings, Billing</a>.
          </p>
          <button type="button" className="aw-skip" onClick={() => close('skip')}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdvancedWelcome;
