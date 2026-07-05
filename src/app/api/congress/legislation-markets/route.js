import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { matchBillsToMarkets, LEGISLATION_EDGE_DISCLAIMER } from '@/lib/congress/legislation-edge';

/**
 * GET /api/congress/legislation-markets  — pairs tracked bills (Supabase) with
 * live Polymarket legislation/politics markets and returns the model-vs-implied
 * edge for each pair. Supabase-first for bills, live Polymarket for prices;
 * honest empty ({ pairs: [] }) when either side is unavailable. NO mock data.
 *
 * Informational market analysis only — never investment or betting advice.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supaConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchPoliticsMarkets() {
  const params = new URLSearchParams({
    limit: '80',
    active: 'true',
    closed: 'false',
    order: 'volume24hr',
    ascending: 'false',
    tag: 'politics',
  });
  const res = await fetch(`https://gamma-api.polymarket.com/markets?${params.toString()}`, {
    next: { revalidate: 120 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map((m) => ({
    id: m.id,
    question: m.question || m.title || '',
    slug: m.slug || '',
    outcomes: m.outcomes || [],
    outcomePrices: m.outcomePrices || m.outcome_prices || [],
    volume: parseFloat(m.volume) || 0,
    endDate: m.endDate || m.end_date_iso || '',
    icon: m.icon || '',
  }));
}

export async function GET(request) {
  const rl = await checkRateLimit(`congress:legmarkets:${getClientIp(request)}`, { limit: 40 });
  if (!rl.success) return rateLimitResponse(rl);

  const disclaimer = LEGISLATION_EDGE_DISCLAIMER;

  if (!supaConfigured()) {
    return NextResponse.json({ ok: true, source: 'empty', pairs: [], disclaimer });
  }

  try {
    const admin = getAdminClient();
    const { data: bills, error } = await admin
      .from('congress_bills')
      .select('id,congress,type,number,title,stage,model_probability,latest_action_date')
      .not('model_probability', 'is', null)
      .order('latest_action_date', { ascending: false })
      .limit(400);
    if (error || !Array.isArray(bills) || !bills.length) {
      return NextResponse.json({ ok: true, source: 'empty', pairs: [], disclaimer });
    }

    const markets = await fetchPoliticsMarkets();
    if (!markets.length) {
      return NextResponse.json({ ok: true, source: 'empty', pairs: [], disclaimer });
    }

    const pairs = matchBillsToMarkets(bills, markets).map((p) => ({
      billId: p.bill.id,
      billTitle: p.bill.title,
      congress: p.bill.congress,
      type: p.bill.type,
      number: p.bill.number,
      stage: p.bill.stage,
      market: { question: p.market.question, slug: p.market.slug, icon: p.market.icon },
      matchScore: p.matchScore,
      implied: p.implied,
      model: p.model,
      edge: p.edge,
      evPct: p.evPct,
    }));

    return NextResponse.json({ ok: true, source: 'supabase+polymarket', pairs, disclaimer });
  } catch {
    return NextResponse.json({ ok: true, source: 'empty', pairs: [], disclaimer });
  }
}
