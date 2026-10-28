'use client';

import { OrgRouteError } from '@/components/org/OrgRouteError';

export default function CouncilRankingsError({ error, reset }) {
  return (
    <OrgRouteError
      error={error}
      reset={reset}
      section="Council Rankings"
      homeHref="/council-rankings"
      homeLabel="Back to rankings"
    />
  );
}
