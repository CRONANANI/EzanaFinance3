import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { addDeliverable, getDeliverablesForPitch } from '@/lib/org-pitch-store';
import { getPitchRaw } from '@/lib/org-pitch-store';
import { getPitchById } from '@/lib/org-pitches';
import { getPitchApiContext } from '@/lib/org-pitch-api-helpers';

export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    return NextResponse.json({ deliverables: getDeliverablesForPitch(params.pitchId) });
  },
  { requireAuth: true },
);

export const POST = withApiGuard(
  async (request, user, context) => {
    const params = context?.params ?? {};
    const { viewer } = await getPitchApiContext();
    const pitch = getPitchRaw(params.pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    const body = await request.json();
    if (!body.kind || !body.title) {
      return NextResponse.json({ error: 'kind and title required' }, { status: 400 });
    }

    addDeliverable(pitch.id, {
      kind: body.kind,
      title: body.title,
      file_url: body.file_url,
      file_type: body.file_type,
      file_size: body.file_size,
      uploaded_by_member_id: viewer.id,
      pinned_attachment_ref: body.pinned_attachment_ref,
    });

    return NextResponse.json({
      deliverables: getDeliverablesForPitch(pitch.id),
      pitch: getPitchById(pitch.id),
    });
  },
  { requireAuth: true },
);
