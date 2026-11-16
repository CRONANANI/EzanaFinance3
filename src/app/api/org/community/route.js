/**
 * GET /api/org/community?section=feed|events|mentions|inbox|recognition|pitches|notes|council|across
 *
 * One section of the council Community page, read as the signed-in member
 * with their own client (row level security decides what comes back). Each
 * section loads and fails on its own; a failed section answers 500 with a
 * short error and the page shows Retry for that section only.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { SECTIONS } from '@/lib/org-community-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PRIVATE = { 'Cache-Control': 'private, no-store' };

export const GET = withApiGuard(
  async (request) => {
    const section = new URL(request.url).searchParams.get('section') || '';
    const load = Object.prototype.hasOwnProperty.call(SECTIONS, section) ? SECTIONS[section] : null;
    if (!load) return NextResponse.json({ error: 'Unknown section' }, { status: 400 });

    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const result = await load(supabase, member);
    if (result.error) {
      return NextResponse.json(
        { error: 'Could not load this section' },
        { status: 500, headers: PRIVATE },
      );
    }
    return NextResponse.json(result.payload, { headers: PRIVATE });
  },
  { requireAuth: true },
);
