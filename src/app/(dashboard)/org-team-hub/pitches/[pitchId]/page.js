import { redirect } from 'next/navigation';

/**
 * Deep-link fallback (spec Part 4.3). The pitch detail now opens as a modal on
 * the Pipeline page via the shallow `?pitch=<id>` route. This route is kept so
 * existing links, notifications, and emails still work — it redirects into the
 * modal rather than rendering a separate page.
 */
export default function OrgPitchDetailRedirect({ params }) {
  const pitchId = params?.pitchId;
  redirect(`/org-team-hub/pitches?pitch=${pitchId}`);
}
