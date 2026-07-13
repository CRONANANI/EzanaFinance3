import { FundDashboard } from '@/components/org/analytics2/FundDashboard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadFundAnalytics } from '@/lib/org-fund-analytics';

export const dynamic = 'force-dynamic';

export default async function FundAnalyticsPage() {
  // Server-render the default-period analytics payload so first paint has data
  // (no post-hydration fetch waterfall). The client keeps its own fetch as the
  // fallback + period-change refetch path — see FundDashboard.
  const supabase = createServerSupabase();
  const member = await getCurrentOrgMember(supabase);
  let initialData = null;
  if (member) {
    const { payload } = await loadFundAnalytics(supabase, member, 'semester');
    initialData = payload;
  }

  return (
    <div className="dashboard-page-inset">
      <FundDashboard initialData={initialData} />
    </div>
  );
}
