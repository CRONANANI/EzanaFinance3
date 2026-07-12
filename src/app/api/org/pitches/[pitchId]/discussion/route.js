import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import {
  getPitchContext,
  fetchPitchRaw,
  fetchPitchDetail,
  addDiscussionDb,
} from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, orgId } = await getPitchContext();
    if (!orgId) return NextResponse.json({ messages: [] });

    const { data: members } = await supabase
      .from('org_members')
      .select('id, display_name')
      .eq('org_id', orgId);
    const nameMap = new Map((members || []).map((m) => [m.id, m.display_name]));

    const { data } = await supabase
      .from('org_pitch_discussion_messages')
      .select('*')
      .eq('pitch_id', params.pitchId)
      .order('created_at');
    const messages = (data || []).map((d) => ({
      ...d,
      author_name: nameMap.get(d.author_member_id) || 'Member',
    }));
    return NextResponse.json({ messages });
  },
  { requireAuth: true },
);

export const POST = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, viewer, orgId } = await getPitchContext();
    if (!orgId) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const pitch = await fetchPitchRaw(supabase, orgId, params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    const body = await request.json();
    if (!body.body?.trim()) {
      return NextResponse.json({ error: 'body required' }, { status: 400 });
    }

    const result = await addDiscussionDb(supabase, pitch, {
      author_member_id: viewer.id,
      parent_message_id: body.parent_message_id,
      body: body.body.trim(),
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

    const detail = await fetchPitchDetail(supabase, orgId, pitch.id);
    return NextResponse.json({
      message: { ...result.message, author_name: viewer.display_name },
      pitch: detail,
    });
  },
  { requireAuth: true },
);
