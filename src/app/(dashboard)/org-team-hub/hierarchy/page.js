import { redirect } from 'next/navigation';

/* The legacy mock-data hierarchy page is superseded by the live
   Organization directory. Old links (org cards, mobile nav, settings)
   land on the real page. */
export default function HierarchyRedirect() {
  redirect('/org-team-hub/org-chart');
}
