import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';
import { librarySearch } from '../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/*
 * GET /api/org/research-notes/search — the typed-library query used by the 1a
 * view. Same engine as the base GET (hybrid keyword + optional gte-small
 * semantic re-rank) and returns real facet counts for every filter menu.
 */
export const GET = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const result = await librarySearch(supabase, member, searchParams, {
      embedFn: embedViaSupabase,
      embedConfigured: supaEmbedConfigured(),
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json(result);
  },
  { requireAuth: true },
);
