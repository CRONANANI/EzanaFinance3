import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { CouncilFundClient } from '@/components/org/competitions/CouncilFundClient';

export const dynamic = 'force-dynamic';

export default async function CouncilRankingPage() {
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);
  if (!member) {
    return (
      <div className="dashboard-page-inset">
        <div className="pcx-empty-page">This page is for organizational members only.</div>
      </div>
    );
  }
  return (
    <div className="dashboard-page-inset">
      <CouncilFundClient />
    </div>
  );
}
