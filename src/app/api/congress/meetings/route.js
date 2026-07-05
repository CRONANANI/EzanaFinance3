import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

/**
 * GET /api/congress/meetings — Supabase-first recent committee meetings/hearings.
 * NO mock data — honest empty when nothing is ingested yet.
 */
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const rl = await checkRateLimit(`congress:meetings:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 30));

  if (supaConfigured()) {
    try {
      const { data, error } = await getAdminClient()
        .from('congress_meetings')
        .select('event_id,chamber,committee,meeting_date,title,related_bills')
        .order('meeting_date', { ascending: false })
        .limit(limit);
      if (!error && Array.isArray(data) && data.length) {
        return NextResponse.json({ ok: true, source: 'supabase', meetings: data });
      }
    } catch {
      /* fall through */
    }
  }
  return NextResponse.json({ ok: true, source: 'empty', meetings: [] });
}
