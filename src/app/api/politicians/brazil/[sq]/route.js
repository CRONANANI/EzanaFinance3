/**
 * GET /api/politicians/brazil/:sq?year=2022
 *
 * One Brazilian officeholder's filing: the candidate, every declared asset
 * as filed with the TSE, and the totals of the same person's other filings.
 *
 * { ok, candidate, assets: [{ order, typeCode, type, description, value,
 *   updated }], history: [{ year, office, uf, total, count, elected }] }
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const rl = await checkRateLimit(`pol:brazil:one:${getClientIp(request)}`, {
    window: '60 s',
    limit: 120,
  });
  if (!rl.success) return rateLimitResponse(rl);

  const sq = String(params?.sq || '')
    .replace(/[^0-9]/g, '')
    .slice(0, 20);
  const year = Number(new URL(request.url).searchParams.get('year'));
  if (!sq || !Number.isInteger(year)) {
    return NextResponse.json({ ok: false, error: 'Unknown filing.' }, { status: 400 });
  }
  try {
    const admin = getAdminClient();
    const { data: c, error } = await admin
      .from('br_candidates_v')
      .select(
        'ano_eleicao, sq_candidato, person_key, nm_candidato, nm_urna, nr_candidato, cargo, sg_uf, nm_ue, sg_partido, nm_partido, situacao, elected, total_assets, asset_count, prev_ano, prev_total_assets, change_pct',
      )
      .eq('ano_eleicao', year)
      .eq('sq_candidato', sq)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) return NextResponse.json({ ok: false, error: 'Unknown filing.' }, { status: 404 });

    const [assets, history] = await Promise.all([
      admin
        .from('br_candidate_assets')
        .select('nr_ordem, cd_tipo, ds_tipo, ds_bem, valor, dt_atualizacao')
        .eq('ano_eleicao', year)
        .eq('sq_candidato', sq)
        .order('valor', { ascending: false, nullsFirst: false })
        .limit(1000),
      admin
        .from('br_candidates')
        .select('ano_eleicao, cargo, sg_uf, total_assets, asset_count, elected')
        .eq('person_key', c.person_key)
        .order('ano_eleicao', { ascending: false }),
    ]);
    if (assets.error) throw new Error(assets.error.message);
    if (history.error) throw new Error(history.error.message);

    const { person_key: _omit, ...candidate } = c;
    return NextResponse.json(
      {
        ok: true,
        candidate,
        assets: (assets.data || []).map((a) => ({
          order: a.nr_ordem,
          typeCode: a.cd_tipo,
          type: a.ds_tipo,
          description: a.ds_bem,
          value: a.valor == null ? null : Number(a.valor),
          updated: a.dt_atualizacao,
        })),
        history: (history.data || []).map((h) => ({
          year: h.ano_eleicao,
          office: h.cargo,
          uf: h.sg_uf,
          total: Number(h.total_assets) || 0,
          count: h.asset_count || 0,
          elected: h.elected,
        })),
      },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    );
  } catch (e) {
    console.error('[politicians/brazil/:sq]', e?.message || e);
    return NextResponse.json({ ok: false, error: 'Could not load this filing.' }, { status: 503 });
  }
}
