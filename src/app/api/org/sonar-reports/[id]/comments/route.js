import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { cleanComment } from '@/lib/org-sonar/reports';
import { attachNames, loadOrgViewer } from '@/lib/org-sonar/server';
import { withNoEmDash } from '@/lib/text/no-em-dash-response';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID = /^[0-9a-f-]{36}$/i;
const COLS =
  'id, report_id, author_id, version, anchor, body, parent_id, resolved, resolved_by, resolved_at, created_at';

/** GET /api/org/sonar-reports/:id/comments: every comment, oldest first. */
const GET_HANDLER = withApiGuard(
  async (_request, _user, { params }) => {
    const supabase = getUserClient();
    const viewer = await loadOrgViewer(supabase);
    if (!viewer) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!UUID.test(String(params?.id || '')))
      return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    const { data, error } = await supabase
      .from('org_sonar_report_comments')
      .select(COLS)
      .eq('report_id', params.id)
      .order('created_at', { ascending: true })
      .limit(500);
    if (error)
      return NextResponse.json({ error: 'Comments could not be loaded.' }, { status: 500 });
    const comments = await attachNames(supabase, viewer.org_id, data || []);
    return NextResponse.json({ comments, viewer: { userId: viewer.user_id } });
  },
  { requireAuth: true },
);

/**
 * POST /api/org/sonar-reports/:id/comments { body, anchor?, version?, parentId? }
 * Anyone who can read the report comments on it (RLS decides).
 */
const POST_HANDLER = withApiGuard(
  async (request, _user, { params }) => {
    const supabase = getUserClient();
    const viewer = await loadOrgViewer(supabase);
    if (!viewer) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!UUID.test(String(params?.id || '')))
      return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    const c = cleanComment((await request.json().catch(() => null)) || {});
    if (c.error) return NextResponse.json({ error: c.error }, { status: 400 });
    const { data, error } = await supabase
      .from('org_sonar_report_comments')
      .insert({ ...c.row, report_id: params.id, org_id: viewer.org_id, author_id: viewer.user_id })
      .select(COLS)
      .single();
    if (error) return NextResponse.json({ error: 'The comment was not posted.' }, { status: 403 });
    const [comment] = await attachNames(supabase, viewer.org_id, [data]);
    return NextResponse.json({ comment });
  },
  { requireAuth: true },
);

/** PATCH /api/org/sonar-reports/:id/comments { commentId, resolved } */
const PATCH_HANDLER = withApiGuard(
  async (request, _user, { params }) => {
    const supabase = getUserClient();
    const viewer = await loadOrgViewer(supabase);
    if (!viewer) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const body = (await request.json().catch(() => null)) || {};
    if (!UUID.test(String(body.commentId || '')) || !UUID.test(String(params?.id || '')))
      return NextResponse.json({ error: 'Unknown comment.' }, { status: 400 });
    const { data, error } = await supabase
      .from('org_sonar_report_comments')
      .update({ resolved: body.resolved !== false })
      .eq('id', body.commentId)
      .eq('report_id', params.id)
      .select(COLS)
      .maybeSingle();
    if (error || !data)
      return NextResponse.json({ error: 'You cannot resolve that comment.' }, { status: 403 });
    return NextResponse.json({ comment: data });
  },
  { requireAuth: true },
);

export const GET = withNoEmDash(GET_HANDLER);
export const POST = withNoEmDash(POST_HANDLER);
export const PATCH = withNoEmDash(PATCH_HANDLER);
