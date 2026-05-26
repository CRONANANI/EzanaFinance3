import { NextResponse } from 'next/server';
import { getPitchById } from '@/lib/org-pitches';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const body = await request.json();
  const ids = Array.isArray(body.pitch_ids) ? body.pitch_ids.slice(0, 5) : [];
  if (ids.length < 2) {
    return NextResponse.json({ error: 'Provide 2–5 pitch_ids' }, { status: 400 });
  }

  const pitches = ids.map((id) => getPitchById(id)).filter(Boolean);
  return NextResponse.json({ pitches });
}
