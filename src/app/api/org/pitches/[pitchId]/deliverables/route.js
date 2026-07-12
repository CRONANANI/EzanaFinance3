import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import {
  getPitchContext,
  fetchPitchRaw,
  fetchPitchDetail,
  addDeliverableDb,
} from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { supabase, orgId } = await getPitchContext();
    if (!orgId) return NextResponse.json({ deliverables: [] });

    const { data } = await supabase
      .from('org_pitch_deliverables')
      .select('*')
      .eq('pitch_id', params.pitchId)
      .order('uploaded_at');
    return NextResponse.json({ deliverables: data || [] });
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
    if (!body.kind || !body.title) {
      return NextResponse.json({ error: 'kind and title required' }, { status: 400 });
    }

    const result = await addDeliverableDb(supabase, orgId, pitch, {
      kind: body.kind,
      title: body.title,
      file_url: body.file_url,
      file_type: body.file_type,
      file_size: body.file_size,
      uploaded_by_member_id: viewer.id,
      pinned_attachment_ref: body.pinned_attachment_ref,
    });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

    const detail = await fetchPitchDetail(supabase, orgId, pitch.id);
    return NextResponse.json({ deliverables: detail.deliverables, pitch: detail });
  },
  { requireAuth: true },
);
