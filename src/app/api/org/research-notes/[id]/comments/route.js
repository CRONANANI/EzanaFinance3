import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { MANAGER_ROLES } from '../../_shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

async function withNames(supabase, orgId, comments) {
  const ids = [...new Set((comments || []).map((c) => c.author_id).filter(Boolean))];
  let nameBy = new Map();
  if (ids.length) {
    const { data: mem } = await supabase
      .from('org_members')
      .select('user_id, display_name, role')
      .eq('org_id', orgId)
      .in('user_id', ids);
    nameBy = new Map((mem || []).map((m) => [m.user_id, m]));
  }
  return (comments || []).map((c) => ({
    ...c,
    author_name: nameBy.get(c.author_id)?.display_name || 'Member',
    author_role: nameBy.get(c.author_id)?.role || null,
  }));
}

/* GET /api/org/research-notes/[id]/comments — review / annotation thread. */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const { data, error } = await supabase
      .from('org_research_comments')
      .select('*')
      .eq('note_id', id)
      .order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const comments = await withNames(supabase, member.org_id, data);
    const openBlocks = comments.filter((c) => c.is_review_block && !c.resolved).length;
    return NextResponse.json({ comments, openBlocks });
  },
  { requireAuth: true },
);

/* POST /api/org/research-notes/[id]/comments — add a review comment / block. */
export const POST = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const { data: note } = await supabase
      .from('org_research_notes')
      .select('id, org_id')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const text = (body?.body || '').trim();
    if (!text) return NextResponse.json({ error: 'Comment body required' }, { status: 400 });

    // Only reviewers (managers) can raise a publish-blocking comment.
    const isManager = assertOrgRole(member, MANAGER_ROLES);
    const isReviewBlock = !!body?.is_review_block && isManager;

    const { data, error } = await supabase
      .from('org_research_comments')
      .insert({
        note_id: id,
        org_id: member.org_id,
        author_id: member.user_id,
        body: text.slice(0, 4000),
        anchor: body?.anchor ? String(body.anchor).slice(0, 200) : null,
        is_review_block: isReviewBlock,
        resolved: false,
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const [withName] = await withNames(supabase, member.org_id, [data]);
    return NextResponse.json({ comment: withName });
  },
  { requireAuth: true },
);

/* PATCH /api/org/research-notes/[id]/comments — resolve / reopen a comment. */
export const PATCH = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const commentId = body?.comment_id;
    if (!commentId) return NextResponse.json({ error: 'comment_id required' }, { status: 400 });

    // RLS: comment author or a manager may resolve. Update returns [] if blocked.
    const { data, error } = await supabase
      .from('org_research_comments')
      .update({ resolved: !!body.resolved })
      .eq('id', commentId)
      .eq('org_id', member.org_id)
      .select('*');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || !data.length) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    return NextResponse.json({ comment: data[0] });
  },
  { requireAuth: true },
);
