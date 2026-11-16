/**
 * POST /api/org/community/posts   { content, post_type, team_id?, title?, ticker?, parent_id?, pin? }
 *
 * A council post or reply, written as the signed-in member (the database's
 * own rule checks the council and the author). Every active member may post;
 * announcements are for executives and portfolio managers; pinning is for
 * executives, up to three. Titles, tickers, replies and pinning answer 409
 * "not available yet" until the database change in sql.md is applied.
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { createPost } from '@/lib/org-community-server';

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
    const r = await createPost(supabase, member, body);
    return NextResponse.json(r.body, { status: r.status });
  },
  { requireAuth: true },
);
