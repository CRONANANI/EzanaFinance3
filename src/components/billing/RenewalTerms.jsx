'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BILLING_SETTINGS_PATH,
  TRIAL_DAYS,
  TRIAL_LABEL,
  priceAndPeriod,
  trialEndDate,
} from '@/lib/billing/renewal-terms';
import './renewal-terms.css';

/**
 * The automatic-renewal terms for one plan and billing period. Sits in the
 * same block as the subscribe button, never in a footnote. The trial end date
 * is computed in the visitor's time zone after mount (the server does not know
 * it), with a date-free wording until then. `fromInvite` (the pricing page,
 * where paid plans join the waitlist): the trial starts when the invite is
 * accepted, so no date is shown.
 */
export default function RenewalTerms({ plan, trial = true, fromInvite = false, className = '' }) {
  const [endDate, setEndDate] = useState('');
  useEffect(() => {
    if (trial && !fromInvite) setEndDate(trialEndDate());
  }, [trial, fromInvite]);

  if (!plan || !plan.price || !plan.interval) return null;
  const price = <strong>{priceAndPeriod(plan)}</strong>;
  const settings = <Link href={BILLING_SETTINGS_PATH}>Settings, Billing</Link>;

  return (
    <p className={`renewal-terms ${className}`.trim()}>
      {trial ? (
        <>
          Free for {TRIAL_DAYS} days{fromInvite ? ' from your invite' : ''}, then {price}, billed
          automatically until you cancel. You can cancel anytime in {settings}{' '}
          {endDate ? `before ${endDate}` : `before the ${TRIAL_LABEL} trial ends`} and you
          won&apos;t be charged.
        </>
      ) : (
        <>
          {price}, billed automatically until you cancel. You can cancel anytime in {settings}.
        </>
      )}
    </p>
  );
}
