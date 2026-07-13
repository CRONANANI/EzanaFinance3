import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadResearchBootstrap } from '@/app/api/org/research-notes/_shared';
import { ResearchLibrary } from '@/components/org/social2/ResearchLibrary';

export const dynamic = 'force-dynamic';

/**
 * Server component: builds the Research Library's initial-mount payload on the
 * server via the SAME loader the /bootstrap route uses, so the client paints
 * without a mount round-trip. When the caller isn't an org member (`member`
 * null) or the load errors, `initialData` stays null and ResearchLibrary falls
 * back to its client-side bootstrap fetch — the org-members-only gate (a 403
 * from that fetch) is preserved unchanged.
 */
export default async function ResearchLibraryPage() {
  const supabase = createServerSupabase();
  const member = await getCurrentOrgMember(supabase);

  let initialData = null;
  if (member) {
    const result = await loadResearchBootstrap(supabase, member, new URLSearchParams());
    initialData = result.error ? null : result;
  }

  return (
    <div className="dashboard-page-inset">
      <ResearchLibrary initialData={initialData} />
    </div>
  );
}
