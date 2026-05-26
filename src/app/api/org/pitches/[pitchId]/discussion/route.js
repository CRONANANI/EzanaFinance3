import { NextResponse } from 'next/server';
import { addDiscussionMessage, getDiscussionForPitch, getPitchRaw } from '@/lib/org-pitch-store';
import { getPitchById } from '@/lib/org-pitches';
import { getPitchApiContext } from '@/lib/org-pitch-api-helpers';
import { MOCK_MEMBERS } from '@/lib/orgMockData';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const rows = getDiscussionForPitch(params.pitchId).map((d) => ({
    ...d,
    author_name: MOCK_MEMBERS.find((m) => m.id === d.author_member_id)?.name || 'Member',
  }));
  return NextResponse.json({ messages: rows });
}

export async function POST(request, { params }) {
  const { viewer } = await getPitchApiContext();
  const pitch = getPitchRaw(params.pitchId);
  if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

  const body = await request.json();
  if (!body.body?.trim()) {
    return NextResponse.json({ error: 'body required' }, { status: 400 });
  }

  const msg = addDiscussionMessage(pitch.id, {
    author_member_id: viewer.id,
    parent_message_id: body.parent_message_id,
    body: body.body.trim(),
  });

  return NextResponse.json({
    message: {
      ...msg,
      author_name: MOCK_MEMBERS.find((m) => m.id === viewer.id)?.name,
    },
    pitch: getPitchById(pitch.id),
  });
}
