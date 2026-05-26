import { NextResponse } from 'next/server';
import { getPitchById } from '@/lib/org-pitches';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const pitchId = params?.pitchId;
  const pitch = getPitchById(pitchId);
  if (!pitch) {
    return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });
  }
  return NextResponse.json({ pitch });
}
