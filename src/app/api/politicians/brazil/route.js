/**
 * GET /api/politicians/brazil[?year=2022]
 *
 * Brazil's elected officeholders for one general election, with their
 * declared assets as filed with the Superior Electoral Court (TSE) and the
 * change since the same person's previous filing. About 1,600 rows; the
 * tracker filters and sorts them in the browser.
 *
 * { ok, year, years, rows: [{ sq, name, ballotName, office, uf, party,
 *   partyName, total, count, prevYear, prevTotal, changePct }] }
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const TTL = 6 * 60 * 60 * 1000;
const PAGE = 1000;
const cache = new Map();

const COLS =
  'sq_candidato, nm_candidato, nm_urna, cargo, sg_uf, sg_partido, nm_partido, total_assets, asset_count, prev_ano, prev_total_assets, change_pct';

async function years(admin) {
  const { data, error } = await admin
    .from('br_candidates')
    .select('ano_eleicao')
    .eq('elected', true)
    .order('ano_eleicao', { ascending: false })
    .limit(5000);
  if (error) throw new Error(error.message);
  return [...new Set((data || []).map((r) => r.ano_eleicao))];
}

async function build(year) {
  const admin = getAdminClient();
  const ys = await years(admin);
  const y = ys.includes(year) ? year : ys[0];
  if (!y) return { ok: true, year: null, years: [], rows: [] };
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('br_candidates_v')
      .select(COLS)
      .eq('ano_eleicao', y)
      .eq('elected', true)
      .order('total_assets', { ascending: false })
      .order('sq_candidato')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return {
    ok: true,
    year: y,
    years: ys,
    rows: rows.map((r) => ({
      sq: r.sq_candidato,
      name: r.nm_candidato,
      ballotName: r.nm_urna,
      office: r.cargo,
      uf: r.sg_uf,
      party: r.sg_partido,
      partyName: r.nm_partido,
      total: Number(r.total_assets) || 0,
      count: r.asset_count || 0,
      prevYear: r.prev_ano || null,
      prevTotal: r.prev_total_assets == null ? null : Number(r.prev_total_assets),
      changePct: r.change_pct == null ? null : Number(r.change_pct),
    })),
  };
}

export async function GET(request) {
  const rl = await checkRateLimit(`pol:brazil:${getClientIp(request)}`, {
    window: '60 s',
    limit: 60,
  });
  if (!rl.success) return rateLimitResponse(rl);

  const year = Number(new URL(request.url).searchParams.get('year')) || null;
  const hit = cache.get(year);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json(hit.body);
  try {
    const body = await build(year);
    /* An empty result (before the first ingest) is not kept, so data shows up
       as soon as it is loaded rather than after the cache expires. */
    if (body.rows.length) cache.set(year, { at: Date.now(), body });
    return NextResponse.json(body, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (e) {
    console.error('[politicians/brazil]', e?.message || e);
    return NextResponse.json({ ok: false, year: null, years: [], rows: [] }, { status: 503 });
  }
}
