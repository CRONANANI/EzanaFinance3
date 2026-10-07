'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BILLING_SETTINGS_PATH,
  TRIAL_DAYS,
  priceAndPeriod,
  trialEndDate,
} from '@/lib/billing/renewal-terms';
import './renewal-terms.css';

/**
 * The automatic-renewal terms for one plan and billing period. Sits in the
 * same block as the subscribe button, never in a footnote. The trial end date
 * is computed in the visitor's time zone after mount (the server does not know
 * it), with a date-free wording until then.
 */
export default function RenewalTerms({ plan, trial = true, className = '' }) {
  const [endDate, setEndDate] = useState('');
  useEffect(() => {
    if (trial) setEndDate(trialEndDate());
  }, [trial]);

  if (!plan || !plan.price || !plan.interval) return null;
  const price = <strong>{priceAndPeriod(plan)}</strong>;
  const settings = <Link href={BILLING_SETTINGS_PATH}>Settings, Billing</Link>;

  return (
    <p className={`renewal-terms ${className}`.trim()}>
      {trial ? (
        <>
          Free for {TRIAL_DAYS} days, then {price}, billed automatically until you cancel. You can
          cancel anytime in {settings}{' '}
          {endDate ? `before ${endDate}` : `before the ${TRIAL_DAYS}-day trial ends`} and you
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
