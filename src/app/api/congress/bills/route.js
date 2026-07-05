import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { hasCongressKey, listBills } from '@/lib/congress/client';
import { deriveStage } from '@/lib/congress/stage';

/**
 * GET /api/congress/bills — Supabase-first list of tracked bills.
 * Query: ?policyArea=&stage=&congress=&limit=  → { ok, bills:[...] }.
 * Reads ingested rows from public.congress_bills; if empty and the key is set,
 * does one bounded live fallback. NO mock data — honest empty when neither
 * source has anything yet.
 */
const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const rl = await checkRateLimit(`congress:bills:${getClientIp(request)}`, { limit: 60 });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const policyArea = searchParams.get('policyArea');
  const stage = searchParams.get('stage');
  const congress = Number(searchParams.get('congress')) || null;
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit')) || 50));

  if (supaConfigured()) {
    try {
      let q = getAdminClient()
        .from('congress_bills')
        .select(
          'id,congress,type,number,title,policy_area,latest_action_text,latest_action_date,sponsor_party,cosponsor_count,stage,model_probability,introduced_date,update_date',
        )
        .order('update_date', { ascending: false })
        .limit(limit);
      if (policyArea) q = q.eq('policy_area', policyArea);
      if (stage) q = q.eq('stage', stage);
      if (congress) q = q.eq('congress', congress);
      const { data, error } = await q;
      if (!error && Array.isArray(data) && data.length) {
        return NextResponse.json({ ok: true, source: 'supabase', bills: data });
      }
    } catch {
      /* fall through to live / empty */
    }
  }

  // bounded live fallback (only if a key is configured)
  if (hasCongressKey()) {
    try {
      const res = await listBills({ congress: congress || 119, limit: Math.min(limit, 100) });
      const raw = Array.isArray(res.data?.bills) ? res.data.bills : [];
      const bills = raw.map((b) => ({
        id: `${b.congress}-${String(b.type).toLowerCase()}-${b.number}`,
        congress: b.congress,
        type: String(b.type || '').toLowerCase(),
        number: b.number,
        title: b.title || null,
        policy_area: b.policyArea?.name || null,
        latest_action_text: b.latestAction?.text || null,
        latest_action_date: b.latestAction?.actionDate || null,
        sponsor_party: null,
        cosponsor_count: null,
        stage: deriveStage({ latestActionText: b.latestAction?.text }),
        model_probability: null,
        introduced_date: b.introducedDate || null,
        update_date: b.updateDate || null,
      }));
      const filtered = bills.filter(
        (b) => (!policyArea || b.policy_area === policyArea) && (!stage || b.stage === stage),
      );
      if (filtered.length) return NextResponse.json({ ok: true, source: 'live', bills: filtered });
    } catch {
      /* fall through to empty */
    }
  }

  return NextResponse.json({ ok: true, source: 'empty', bills: [] });
}
