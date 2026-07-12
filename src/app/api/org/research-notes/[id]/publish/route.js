import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { embedViaSupabase, supaEmbedConfigured } from '@/lib/embeddings-gte';
import { MANAGER_ROLES, buildEmbedText } from '../../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

/*
 * POST /api/org/research-notes/[id]/publish — publish gate.
 * Rejects (409) when: abstract missing · a matching template's required_sections
 * are absent from the body · an unresolved review-block comment exists. The
 * response says exactly WHY so the UI can render the blocking reason.
 */
export const POST = withApiGuard(
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
    if (!isAuthor && !assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }

    const blockers = [];

    // 1) Abstract (TL;DR) is required.
    if (!note.abstract || !String(note.abstract).trim()) {
      blockers.push({
        code: 'abstract_missing',
        message: 'A TL;DR abstract is required before publishing.',
      });
    }

    // 2) Template compliance — if a template exists for this doc_type, every
    //    required section heading must appear in the body.
    const { data: templates } = await supabase
      .from('org_research_templates')
      .select('name, required_sections')
      .eq('org_id', member.org_id)
      .eq('doc_type', note.doc_type)
      .limit(1);
    const template = templates && templates[0];
    if (template && Array.isArray(template.required_sections)) {
      const haystack = String(note.body || '').toLowerCase();
      const missing = template.required_sections
        .map((s) => String(s))
        .filter((s) => s && !haystack.includes(s.toLowerCase()));
      if (missing.length) {
        blockers.push({
          code: 'sections_missing',
          message: `Template "${template.name}" requires these sections: ${missing.join(', ')}.`,
          sections: missing,
        });
      }
    }

    // 3) Unresolved review-block comments.
    const { data: openBlocks } = await supabase
      .from('org_research_comments')
      .select('id')
      .eq('note_id', id)
      .eq('is_review_block', true)
      .eq('resolved', false);
    if (openBlocks && openBlocks.length) {
      blockers.push({
        code: 'review_blocks_open',
        message: `${openBlocks.length} unresolved review block${openBlocks.length > 1 ? 's' : ''} must be resolved first.`,
        count: openBlocks.length,
      });
    }

    if (blockers.length) {
      return NextResponse.json({ error: 'Publish blocked', blockers }, { status: 409 });
    }

    // Refresh embedding at publish so the vector reflects the final text.
    const update = {
      status: 'published',
      published_at: note.published_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (supaEmbedConfigured()) {
      const vec = await embedViaSupabase(buildEmbedText(note));
      if (Array.isArray(vec) && vec.length === 384) update.embedding = JSON.stringify(vec);
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
