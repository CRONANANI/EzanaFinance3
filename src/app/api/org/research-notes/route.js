import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';
import { librarySearch, buildEmbedText, sanitizeDocType, sanitizeStatus } from './_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/*
 * GET /api/org/research-notes
 *   ?q=&type[]=&sector[]=&status[]=&term[]=&author[]=&ticker[]=&sort=&include_drafts=
 * Hybrid library query: keyword + optional gte-small semantic re-rank, real
 * facet counts. Backwards compatible — the legacy `sector`/`pinned`/`tag`
 * single-value params still narrow the result, and the `notes` + `viewer` shape
 * is preserved for the existing consumer.
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

    // Legacy narrowing that predates the facet filters (single-value pills).
    let notes = result.notes;
    const legacyTicker = searchParams.get('ticker');
    const legacySector = searchParams.get('sector');
    const legacyTag = searchParams.get('tag');
    const pinnedOnly = searchParams.get('pinned') === '1';
    if (legacyTicker && !searchParams.getAll('ticker[]').length)
      notes = notes.filter((n) => (n.ticker || '').toUpperCase() === legacyTicker.toUpperCase());
    if (legacySector && !searchParams.getAll('sector[]').length)
      notes = notes.filter((n) => n.sector === legacySector);
    if (legacyTag) notes = notes.filter((n) => (n.tags || []).includes(legacyTag));
    if (pinnedOnly) notes = notes.filter((n) => n.pinned);

    return NextResponse.json({ ...result, notes });
  },
  { requireAuth: true },
);

/*
 * POST /api/org/research-notes — create a typed draft (or note). Embeds
 * title+abstract+body on write when Supabase embeddings are configured; falls
 * back to no vector (keyword-only search still works) otherwise.
 */
export const POST = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const title = (body?.title || '').trim();
    const noteBody = (body?.body || '').trim();
    if (!title || !noteBody) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
    }

    const visibility = ['org', 'team', 'private'].includes(body?.visibility)
      ? body.visibility
      : 'org';
    const tags = Array.isArray(body?.tags)
      ? body.tags
          .map((t) => String(t).trim())
          .filter(Boolean)
          .slice(0, 12)
      : [];
    const abstract = body?.abstract ? String(body.abstract).trim().slice(0, 800) : null;
    const status = sanitizeStatus(body?.status || 'draft');
    const docType = sanitizeDocType(body?.doc_type);

    // Author role snapshot — survives cohort rollover (analyst → alum, etc.).
    const roleSnapshot = member.role || null;

    const insert = {
      org_id: member.org_id,
      author_id: member.user_id,
      title: title.slice(0, 200),
      body: noteBody.slice(0, 20000),
      abstract,
      ticker: body?.ticker ? String(body.ticker).toUpperCase().slice(0, 12) : null,
      sector: body?.sector || null,
      tags,
      visibility,
      team_id: visibility === 'team' ? member.team_id || null : null,
      doc_type: docType,
      status,
      version: 1,
      term: body?.term ? String(body.term).slice(0, 40) : null,
      author_role_at_time: roleSnapshot,
      citations: body?.citations ? String(body.citations).slice(0, 4000) : null,
      pitch_id: body?.pitch_id || null,
      assignment_id: body?.assignment_id || null,
      position_id: body?.position_id || null,
      published_at: status === 'published' ? new Date().toISOString() : null,
    };

    // Embed on write (best-effort; degrade to null vector).
    if (supaEmbedConfigured()) {
      const vec = await embedViaSupabase(buildEmbedText(insert));
      if (Array.isArray(vec) && vec.length === 384) insert.embedding = JSON.stringify(vec);
    }

    const { data, error } = await supabase
      .from('org_research_notes')
      .insert(insert)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { embedding, ...clean } = data;
    return NextResponse.json({ note: clean });
  },
  { requireAuth: true },
);
