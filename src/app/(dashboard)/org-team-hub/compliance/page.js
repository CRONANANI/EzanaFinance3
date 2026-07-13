import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadIpsRules } from '@/app/api/org/ips/rules/_loader';
import { loadIpsViolations } from '@/app/api/org/ips/violations/_loader';
import { ComplianceClient } from './ComplianceClient';

export const dynamic = 'force-dynamic';

/* Server component: seed the initial rules + violations payloads (same shapes
   the client mount fetches produce) so first paint has data. The 5-tab
   interactive shell — including the best-effort positions fetch, the pre-trade
   gate, resolve action, and the exec-gated rule editor / audit views — stays
   client-side in ComplianceClient, which keeps its own mount fetch as the
   fallback when initialData is null (non-member / load failure). */
export default async function CompliancePage() {
  const supabase = createServerSupabase();
  const member = await getCurrentOrgMember(supabase);

  let initialData = null;
  if (member) {
    const [rulesRes, violationsRes] = await Promise.all([
      loadIpsRules(supabase, member),
      loadIpsViolations(supabase, member),
    ]);
    // Seed only when BOTH primary reads succeed; otherwise fall back to the
    // client load so its error handling (incl. the member-only gate) is intact.
    if (!rulesRes.error && !violationsRes.error) {
      initialData = {
        rules: rulesRes.payload.rules,
        ruleTypes: rulesRes.payload.ruleTypes,
        canEdit: rulesRes.payload.viewer.canEdit,
        violations: violationsRes.payload.violations,
        canResolve: violationsRes.payload.viewer.canResolve,
      };
    }
  }

  return <ComplianceClient initialData={initialData} />;
}
