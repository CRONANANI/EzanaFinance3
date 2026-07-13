import { OrgFinalClient } from './OrgFinalClient';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadChart } from '@/app/api/org/chart/_loader';
import { loadTeamHubSummary } from '@/app/api/org/team-hub/summary/_loader';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Organization | Ezana Finance',
  description:
    'Investment council — chain of command and the full member roster, grouped by leadership and sector desk.',
};

/* Server component: seed the initial payloads OrgFinalClient fetches on mount
   (GET /api/org/chart + GET /api/org/team-hub/summary) so first paint has data.
   All interactivity — layout/committee/filter toggles, role edits, the profile
   modal — stays client-side. OrgFinalClient keeps its own mount fetch as the
   fallback when initialData is null (non-member / SSR unavailable). */
export default async function OrgChartPage() {
  const supabase = createServerSupabase();
  const member = await getCurrentOrgMember(supabase);

  let initialData = null;
  if (member) {
    // Mirror the client's Promise.allSettled: a failure of either read seeds
    // null for that slice, not a broken page.
    const [chartRes, summaryRes] = await Promise.allSettled([
      loadChart(supabase, member),
      loadTeamHubSummary(supabase, member),
    ]);
    const chart =
      chartRes.status === 'fulfilled' && !chartRes.value.error ? chartRes.value.payload : null;
    const summary = summaryRes.status === 'fulfilled' ? summaryRes.value : null;
    initialData = { chart, summary };
  }

  return <OrgFinalClient initialData={initialData} />;
}
