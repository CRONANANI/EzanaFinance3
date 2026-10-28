'use client';

import { OrgRouteError } from '@/components/org/OrgRouteError';

export default function OrgTeamHubError({ error, reset }) {
  return (
    <OrgRouteError
      error={error}
      reset={reset}
      section="Team Hub"
      homeHref="/org-team-hub"
      homeLabel="Go to Command Center"
    />
  );
}
