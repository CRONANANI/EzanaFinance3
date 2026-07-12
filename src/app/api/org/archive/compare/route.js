import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { getPitchById } from '@/lib/org-pitches';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = withApiGuard(
  async (request, user) => {
    const body = await request.json();
    const ids = Array.isArray(body.pitch_ids) ? body.pitch_ids.slice(0, 5) : [];
    if (ids.length < 2) {
      return NextResponse.json({ error: 'Provide 2–5 pitch_ids' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ pitches: [] });

    const resolved = await Promise.all(ids.map((id) => getPitchById(supabase, member.org_id, id)));
    const pitches = resolved.filter(Boolean);
    return NextResponse.json({ pitches });
  },
  { requireAuth: true },
);
