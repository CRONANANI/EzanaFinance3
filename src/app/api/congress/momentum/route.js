import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { computeSectorMomentum } from '@/lib/congress/momentum';

/**
 * GET /api/congress/momentum?window=30|90[&sector=]  — Legislative Momentum by
 * sector, computed from ingested congress_bills (+ their subjects). Supabase-
 * first; honest empty ({ sectors: [] }) when nothing is ingested yet. NO mock.
 *
 * Informational only: "sectors with rising legislative activity", not advice.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request) {
  const rl = await checkRateLimit(`congress:momentum:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const windowDays = Number(searchParams.get('window')) === 30 ? 30 : 90;
  const sector = searchParams.get('sector');

  const methodology =
    'Weighted sum of mapped-bill activity; weight = stage advancement (introduced 1 → law 10), scaled by CBO magnitude and bipartisan cosponsor mix. Estimate, not advice.';

  if (!supaConfigured()) {
    return NextResponse.json({ ok: true, source: 'empty', windowDays, sectors: [], methodology });
  }

  try {
    const admin = getAdminClient();
    const { data: bills, error } = await admin
      .from('congress_bills')
      .select(
        'id,congress,type,number,title,policy_area,stage,latest_action_date,cbo_estimate,cosponsor_dem,cosponsor_rep,model_probability',
      )
      .order('latest_action_date', { ascending: false })
      .limit(1000);
    if (error || !Array.isArray(bills) || !bills.length) {
      return NextResponse.json({ ok: true, source: 'empty', windowDays, sectors: [], methodology });
    }

    // attach subjects (one round-trip) so subject-based mapping works
    const { data: subjRows } = await admin
      .from('congress_bill_subjects')
      .select('bill_id,subject')
      .in(
        'bill_id',
        bills.map((b) => b.id),
      );
    const subjectsByBill = new Map();
    for (const s of subjRows || []) {
      if (!subjectsByBill.has(s.bill_id)) subjectsByBill.set(s.bill_id, []);
      subjectsByBill.get(s.bill_id).push(s.subject);
    }
    const enriched = bills.map((b) => ({ ...b, subjects: subjectsByBill.get(b.id) || [] }));

    let sectors = computeSectorMomentum(enriched, { windowDays });
    if (sector) sectors = sectors.filter((s) => s.sector === sector);
    return NextResponse.json({ ok: true, source: 'supabase', windowDays, sectors, methodology });
  } catch {
    return NextResponse.json({ ok: true, source: 'empty', windowDays, sectors: [], methodology });
  }
}
