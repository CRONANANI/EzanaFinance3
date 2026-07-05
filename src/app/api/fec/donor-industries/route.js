import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

/**
 * GET /api/fec/donor-industries?cycle=&by=occupation|employer  — a cross-member
 * view: aggregate Schedule A by_occupation / by_employer across ALL tracked
 * members to rank the occupations/employers funding Congress this cycle. Reads
 * the fec_candidate_donors cache (Supabase-first, cache-only — the cron writes
 * it). Honest empty ({ industries: [] }) pre-ingestion. NO mock data.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SOURCE = 'FEC (api.open.fec.gov)';
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const rl = await checkRateLimit(`fec:donor-industries:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const cycle = Number(searchParams.get('cycle')) || 2026;
  const by = searchParams.get('by') === 'employer' ? 'employer' : 'occupation';
  const column = by === 'employer' ? 'by_employer' : 'by_occupation';
  const keyField = by; // each row object has { occupation|employer, total, count }

  const empty = { ok: true, source: SOURCE, cycle, by, industries: [] };
  if (!supaConfigured()) return NextResponse.json(empty);

  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from('fec_candidate_donors')
      .select(`bioguide_id,${column}`)
      .eq('cycle', cycle)
      .limit(600);
    if (error || !Array.isArray(data) || !data.length) return NextResponse.json(empty);

    // key → { total, members:Set }
    const acc = new Map();
    for (const row of data) {
      const list = row[column];
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        const name = item?.[keyField];
        if (!name) continue;
        if (!acc.has(name)) acc.set(name, { total: 0, members: new Set() });
        const e = acc.get(name);
        e.total += Number(item.total) || 0;
        e.members.add(row.bioguide_id);
      }
    }

    const industries = [...acc.entries()]
      .map(([name, e]) => ({ name, total: e.total, members: e.members.size }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);

    return NextResponse.json({ ok: true, source: SOURCE, cycle, by, industries });
  } catch {
    return NextResponse.json(empty);
  }
}
