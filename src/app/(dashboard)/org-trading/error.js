'use client';

import { OrgRouteError } from '@/components/org/OrgRouteError';

export default function OrgTradingError({ error, reset }) {
  return (
    <OrgRouteError
      error={error}
      reset={reset}
      section="the Trading Desk"
      homeHref="/org-team-hub"
      homeLabel="Go to Command Center"
    />
  );
}
