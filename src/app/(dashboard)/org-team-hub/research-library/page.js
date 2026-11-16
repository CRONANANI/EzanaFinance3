import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadResearchBootstrap } from '@/app/api/org/research-notes/_shared';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';
import { parseAddress, searchQuery } from '@/lib/org-research-library-model';
import { ResearchLibraryPage } from '@/components/org/research-library/ResearchLibraryPage';

export const dynamic = 'force-dynamic';

/**
 * /org-team-hub/research-library. Membership is checked on the server in
 * layout.js, which also provides the shared sidebar (TeamHubShell).
 *
 * The library (the same loader the /bootstrap and /search routes use, with
 * the search and filters from the page address) arrives with the page, so the
 * first paint has data. When it cannot be loaded the page fetches it and
 * shows its own error with Retry; a non-member still gets the members-only
 * line from that fetch.
 *
 * The view, search, filters and open document live in the page address
 * (?view=ticker&symbol=NVDA, ?type=pitch_memo&q=margin, ?d=<id>), so a view or
 * one document can be linked. `sampleViewer` only tells the page whether to
 * ask for sample content (master admin and demo accounts); the sample route
 * checks again.
 */
export default async function ResearchLibraryRoute({ searchParams }) {
  const params = (await searchParams) || {};
  const address = parseAddress((k) => params[k]);
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);

  let initialData = null;
  let sampleViewer = false;
  if (member) {
    const [result, auth] = await Promise.all([
      loadResearchBootstrap(
        supabase,
        member,
        new URLSearchParams(searchQuery(address.q, address.filters)),
      ),
      supabase.auth.getUser(),
    ]);
    initialData = result.error ? null : result;
    sampleViewer = isCommunityDemoViewer(auth?.data?.user || null);
  }

  return (
    <ResearchLibraryPage
      initialData={initialData}
      sampleViewer={sampleViewer}
      initialAddress={address}
    />
  );
}
