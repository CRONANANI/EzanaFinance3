import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/assignments/[id]/comments — the review thread (RLS-scoped). */
export const GET = withApiGuard(
  async (_request, _user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await context.params;

    const { data: comments, error } = await supabase
      .from('org_assignment_comments')
      .select('id, author_id, body, is_return, created_at')
      .eq('org_id', member.org_id)
      .eq('assignment_id', id)
      .order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const authorIds = [...new Set((comments || []).map((c) => c.author_id))];
    const { data: members } = authorIds.length
      ? await supabase
          .from('org_members')
          .select('user_id, display_name')
          .eq('org_id', member.org_id)
          .in('user_id', authorIds)
      : { data: [] };
    const byUser = new Map((members || []).map((m) => [m.user_id, m.display_name]));

    return NextResponse.json({
      comments: (comments || []).map((c) => ({
        ...c,
        author_name: byUser.get(c.author_id) || 'Member',
      })),
    });
  },
  { requireAuth: true },
);

/* POST /api/org/assignments/[id]/comments — add to the thread. Any member who
   can see the assignment (assignee or manager per RLS) may comment. */
export const POST = withApiGuard(
  async (request, _user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await context.params;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const text = String(body?.body || '').trim();
    if (!text) return NextResponse.json({ error: 'Comment body required' }, { status: 400 });

    // Confirm the assignment is visible in this org before writing.
    const { data: assignment } = await supabase
      .from('org_assignments')
      .select('id')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data, error } = await supabase
      .from('org_assignment_comments')
      .insert({
        assignment_id: id,
        org_id: member.org_id,
        author_id: member.user_id,
        body: text.slice(0, 4000),
        is_return: false,
      })
      .select('id, author_id, body, is_return, created_at')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(
      { comment: { ...data, author_name: member.display_name || 'Member' } },
      { status: 201 },
    );
  },
  { requireAuth: true },
);
