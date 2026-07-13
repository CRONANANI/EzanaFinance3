import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadResearchBootstrap } from '../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/*
 * GET /api/org/research-notes/bootstrap — ONE batched response with everything
 * `ResearchLibrary` needs on its initial mount. Collapses the separate mount
 * fetch into a single round-trip and doubles as the client-side fallback when
 * the research-library page is not server-rendered. Interaction fetches (opening
 * a note, a new search query, ticker dossier, coverage lineage, summarize-set)
 * stay separate and on-demand — only the initial load is batched here.
 *
 * Member-scoped (RLS + explicit org_id inside the shared loader). Same auth gate
 * as the sibling search route: non-members get 403.
 */
export const GET = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const result = await loadResearchBootstrap(supabase, member, searchParams);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json(result);
  },
  { requireAuth: true },
);
