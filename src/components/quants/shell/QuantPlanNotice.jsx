'use client';

import { usePlanAccess } from '@/hooks/usePlanAccess';

/**
 * Nov 21: Quant Lab compute (backtests, factor studies, pairs, risk and the
 * statistical models) is an Advanced feature, refused below it by the API.
 * This says so up front instead of letting each run fail.
 */
export function QuantPlanNotice() {
  const access = usePlanAccess();
  if (!access || access.features?.['quant-lab'] !== false) return null;
  return (
    <div className="qlx-toolbar" role="note" aria-label="Plan notice">
      <p className="qlx-notice">
        <i className="bi bi-lock" aria-hidden />
        You can browse every workspace. Running backtests, factor studies, pairs, portfolio risk and
        the statistical models is part of Advanced, free for 30 days.{' '}
        <a href="/pricing#plans">See Advanced</a>
      </p>
    </div>
  );
}
