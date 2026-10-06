/**
 * GET /api/waitlist/invite?token=...  checks a waitlist invite link.
 * 200 { ok, email, firstName, lastName } for a live invite; otherwise one
 * generic 404, never saying whether the token was unknown, used or expired.
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { findInvite, inviteNames } from '@/lib/waitlist/invite';

export const dynamic = 'force-dynamic';

const DEAD = { ok: false, error: 'This invite link is invalid or has expired.' };

export async function GET(request) {
  const rl = await checkRateLimit(`waitlist:invite:${getClientIp(request)}`, { limit: 20 });
  if (!rl.success) return rateLimitResponse(rl);
  const token = new URL(request.url).searchParams.get('token') || '';
  try {
    const invite = await findInvite(getAdminClient(), token);
    if (!invite) return NextResponse.json(DEAD, { status: 404 });
    const { firstName, lastName } = inviteNames(invite);
    return NextResponse.json(
      { ok: true, email: invite.email, firstName, lastName },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[waitlist/invite] lookup failed:', err?.message || err);
    return NextResponse.json(DEAD, { status: 404 });
  }
}
