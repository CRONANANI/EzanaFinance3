import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getChokepointDaily, getPatentCompany, getPortDaily } from '@/lib/eyes/store';

/**
 * GET /api/eyes/detail?kind=chokepoint|port|company&id=...
 * The Eyes Above detail charts: a chokepoint's or port's last 365 days, or a
 * company's monthly patent grants and latest grants. Public open data.
 */
export const dynamic = 'force-dynamic';

const LOADERS = {
  chokepoint: { load: getChokepointDaily, valid: (id) => /^[\w.-]{1,40}$/.test(id) },
  port: { load: getPortDaily, valid: (id) => /^[\w.-]{1,40}$/.test(id) },
  company: { load: getPatentCompany, valid: (id) => /^[A-Za-z0-9.-]{1,10}$/.test(id) },
};

export async function GET(request) {
  const rl = await checkRateLimit(`eyes:detail:${getClientIp(request)}`, { limit: 120 });
  if (!rl.success) return rateLimitResponse(rl);
  const params = new URL(request.url).searchParams;
  const kind = LOADERS[params.get('kind')];
  const id = (params.get('id') || '').trim();
  if (!kind || !kind.valid(id))
    return NextResponse.json({ ok: false, error: 'Unknown item.' }, { status: 400 });
  try {
    const data = await kind.load(id);
    return NextResponse.json(
      { ok: true, data },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=21600' } },
    );
  } catch (e) {
    console.error('[eyes] detail:', e?.message || e);
    return NextResponse.json({ ok: false, error: 'Could not load this series.' }, { status: 500 });
  }
}
