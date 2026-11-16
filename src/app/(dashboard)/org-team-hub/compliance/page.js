import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadIpsRules } from '@/app/api/org/ips/rules/_loader';
import { loadIpsViolations } from '@/app/api/org/ips/violations/_loader';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';
import { CompliancePage } from '@/components/org/compliance/CompliancePage';

export const dynamic = 'force-dynamic';

/**
 * /org-team-hub/compliance. Membership is checked on the server in layout.js,
 * which also provides the shared sidebar (TeamHubShell).
 *
 * The rules and open breaches (the same payloads as the two GET routes)
 * arrive with the page, so the first paint has data. When either cannot be
 * loaded the page fetches them itself and shows its own error with Retry.
 * Holdings readings, the resolved list and the activity log load on the
 * client. `sampleViewer` only tells the page whether to ask for sample
 * content (master admin and demo accounts); the sample route checks again.
 */
export default async function ComplianceRoute() {
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);

  let initialData = null;
  let sampleViewer = false;
  let viewerRole = null;
  if (member) {
    viewerRole = member.role;
    const [rulesRes, violationsRes, auth] = await Promise.all([
      loadIpsRules(supabase, member),
      loadIpsViolations(supabase, member),
      supabase.auth.getUser(),
    ]);
    sampleViewer = isCommunityDemoViewer(auth?.data?.user || null);
    if (!rulesRes.error && !violationsRes.error) {
      initialData = {
        rules: rulesRes.payload.rules,
        canEdit: rulesRes.payload.viewer.canEdit,
        violations: violationsRes.payload.violations,
        canResolve: violationsRes.payload.viewer.canResolve,
        resolutionStorage: violationsRes.payload.viewer.resolutionStorage,
      };
    }
  }

  return (
    <CompliancePage initialData={initialData} sampleViewer={sampleViewer} viewerRole={viewerRole} />
  );
}
