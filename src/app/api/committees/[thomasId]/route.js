import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getCommittee } from '@/lib/congress/committee-data';
import { COMMITTEE_SECTOR_NOTE } from '@/lib/congress/committee-sectors';

/**
 * GET /api/committees/[thomasId]: one committee or subcommittee with its
 * members (name, party, side, rank, title, headshot) and subcommittees.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE = { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' };
const ID_RE = /^[A-Z]{4}\d{0,2}$/;

export async function GET(request, { params }) {
  const rl = await checkRateLimit(`committees:one:${getClientIp(request)}`, { limit: 120 });
  if (!rl.success) return rateLimitResponse(rl);

  const thomasId = String(params?.thomasId || '').toUpperCase();
  if (!ID_RE.test(thomasId)) {
    return NextResponse.json({ ok: false, error: 'Unknown committee.' }, { status: 400 });
  }
  try {
    const committee = await getCommittee(getAdminClient(), thomasId);
    if (!committee) {
      return NextResponse.json({ ok: false, error: 'Unknown committee.' }, { status: 404 });
    }
    return NextResponse.json(
      { ok: true, note: COMMITTEE_SECTOR_NOTE, committee },
      { headers: CACHE },
    );
  } catch (e) {
    console.error('[committees] one:', e?.message || e);
    return NextResponse.json({ ok: false, error: 'Could not load committee.' }, { status: 500 });
  }
}
