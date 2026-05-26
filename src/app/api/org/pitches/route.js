import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { getActivePitches, resolveViewerMember } from '@/lib/org-pitches';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const supabase = createServerSupabase();
  const member = await getCurrentOrgMember(supabase);
  const viewer = resolveViewerMember(member?.email, member?.role);

  const { searchParams } = new URL(request.url);
  const team_id = searchParams.get('team_id') || undefined;
  const stage = searchParams.get('stage') || undefined;

  const pitches = getActivePitches({ viewer, team_id, stage });
  return NextResponse.json({ pitches });
}
