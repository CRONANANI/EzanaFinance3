/**
 * POST /api/org/community/events   { title, event_type, event_date, team_id?, description? }
 *
 * A council event for the Community page's Coming up list. Executives and
 * portfolio managers only, checked here and by the database's own rule for
 * council events.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { createEvent } from '@/lib/org-community-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const r = await createEvent(supabase, member, body);
    return NextResponse.json(r.body, { status: r.status });
  },
  { requireAuth: true },
);
