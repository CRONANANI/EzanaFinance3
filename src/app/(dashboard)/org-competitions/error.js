'use client';

import { OrgRouteError } from '@/components/org/OrgRouteError';

export default function OrgCompetitionsError({ error, reset }) {
  return (
    <OrgRouteError
      error={error}
      reset={reset}
      section="competitions"
      homeHref="/org-competitions"
      homeLabel="All competitions"
    />
  );
}
