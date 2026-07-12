import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';
import { MANAGER_ROLES, buildEmbedText, sanitizeDocType, attachAuthors } from '../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const { data, error } = await supabase
      .from('org_research_notes')
      .select('*')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { embedding, ...clean } = data;
    const [withAuthor] = await attachAuthors(supabase, member.org_id, [clean]);

    // Resolve the doc this one was superseded by (stays readable — never hidden).
    let supersededBy = null;
    if (data.superseded_by) {
      const { data: sup } = await supabase
        .from('org_research_notes')
        .select('id, title, version, created_at')
        .eq('id', data.superseded_by)
        .maybeSingle();
      supersededBy = sup || null;
    }

    return NextResponse.json({
      note: withAuthor,
      supersededBy,
      viewer: {
        userId: member.user_id,
        role: member.role,
        canManage: assertOrgRole(member, MANAGER_ROLES),
      },
    });
  },
  { requireAuth: true },
);

export const PATCH = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const { data: note } = await supabase
      .from('org_research_notes')
      .select('*')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isAuthor = note.author_id === member.user_id;
    const isManager = assertOrgRole(member, MANAGER_ROLES);
    if (!isAuthor && !isManager) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const update = { updated_at: new Date().toISOString() };
    // Managers may pin/unpin any note; exemplar flag is manager-only (→ Learning Center).
    if ('pinned' in body) update.pinned = !!body.pinned;
    if ('is_exemplar' in body && isManager) update.is_exemplar = !!body.is_exemplar;
    // Review-workflow transitions only. Publishing goes through /publish (gated);
    // superseding through /supersede. Here we only allow the draft↔review hop.
    if ('status' in body && ['draft', 'under_review'].includes(body.status)) {
      update.status = body.status;
    }

    let contentChanged = false;
    if (isAuthor || isManager) {
      if ('title' in body) {
        update.title = String(body.title).slice(0, 200);
        contentChanged = true;
      }
      if ('body' in body) {
        update.body = String(body.body).slice(0, 20000);
        contentChanged = true;
      }
      if ('abstract' in body) {
        update.abstract = body.abstract ? String(body.abstract).trim().slice(0, 800) : null;
        contentChanged = true;
      }
      if ('ticker' in body)
        update.ticker = body.ticker ? String(body.ticker).toUpperCase().slice(0, 12) : null;
      if ('sector' in body) update.sector = body.sector || null;
      if ('term' in body) update.term = body.term ? String(body.term).slice(0, 40) : null;
      if ('citations' in body)
        update.citations = body.citations ? String(body.citations).slice(0, 4000) : null;
      if ('doc_type' in body) update.doc_type = sanitizeDocType(body.doc_type);
      if ('tags' in body && Array.isArray(body.tags))
        update.tags = body.tags
          .map((t) => String(t).trim())
          .filter(Boolean)
          .slice(0, 12);
      if ('visibility' in body && ['org', 'team', 'private'].includes(body.visibility))
        update.visibility = body.visibility;
    }

    // Snapshot the pre-edit version before mutating content, then bump version.
    if (contentChanged) {
      await supabase.from('org_research_versions').insert({
        note_id: note.id,
        org_id: note.org_id,
        version: note.version || 1,
        title: note.title,
        body: note.body,
        abstract: note.abstract,
        edited_by: member.user_id,
      });
      update.version = (note.version || 1) + 1;

      // Re-embed on content change (best-effort).
      if (supaEmbedConfigured()) {
        const merged = {
          title: update.title ?? note.title,
          abstract: update.abstract ?? note.abstract,
          body: update.body ?? note.body,
        };
        const vec = await embedViaSupabase(buildEmbedText(merged));
        if (Array.isArray(vec) && vec.length === 384) update.embedding = JSON.stringify(vec);
      }
    }

    const { data, error } = await supabase
      .from('org_research_notes')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { embedding, ...clean } = data;
    return NextResponse.json({ note: clean });
  },
  { requireAuth: true },
);

export const DELETE = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const { data: note } = await supabase
      .from('org_research_notes')
      .select('id, author_id, status')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (note.author_id !== member.user_id && !assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }

    // Published/superseded docs are institutional memory — archive, never delete.
    if (note.status === 'published' || note.status === 'superseded') {
      const { error } = await supabase
        .from('org_research_notes')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, archived: true });
    }

    const { error } = await supabase.from('org_research_notes').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);
