/**
 * GET /api/empire/data?kind=rankings
 * GET /api/empire/data?kind=dimensions&country=USA&year=2024
 * GET /api/empire/data?kind=history&country=USA&start=1500&end=2030
 * GET /api/empire/data?kind=indicators&code=GDP&countries=USA,CHN&start=1990&end=2025
 *
 * Empire Ranking reads for the browser. The tables are server-only; this route
 * validates every parameter, is rate-limited and cacheable (the data changes
 * only when the ranking job runs).
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import {
  getEmpireRankings,
  getDimensionScores,
  getBigCycleHistory,
  getIndicatorTimeSeries,
} from '@/lib/empire-db-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COUNTRY = /^[A-Z]{2,3}$/;
const INDICATOR = /^[A-Za-z0-9_.-]{1,64}$/;

function year(v, fallback) {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n >= 1000 && n <= 2100 ? n : fallback;
}

function bad(msg) {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 });
}

export async function GET(request) {
  const rl = await checkRateLimit(`empire-data:${getClientIp(request)}`, {
    limit: 60,
    window: '60 s',
  });
  if (!rl.success) return rateLimitResponse(rl);

  const sp = new URL(request.url).searchParams;
  const kind = sp.get('kind');
  let data;

  if (kind === 'rankings') {
    data = await getEmpireRankings();
  } else if (kind === 'dimensions') {
    const country = (sp.get('country') || '').toUpperCase();
    if (!COUNTRY.test(country)) return bad('Unknown country');
    const y = year(sp.get('year'), null);
    if (y == null) return bad('Unknown year');
    data = await getDimensionScores(country, y);
  } else if (kind === 'history') {
    const country = (sp.get('country') || '').toUpperCase();
    if (!COUNTRY.test(country)) return bad('Unknown country');
    data = await getBigCycleHistory(
      country,
      year(sp.get('start'), 1500),
      year(sp.get('end'), 2030),
    );
  } else if (kind === 'indicators') {
    const code = sp.get('code') || '';
    if (!INDICATOR.test(code)) return bad('Unknown indicator');
    const countries = (sp.get('countries') || '')
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter((c) => COUNTRY.test(c))
      .slice(0, 40);
    if (!countries.length) return bad('No countries');
    data = await getIndicatorTimeSeries(
      code,
      countries,
      year(sp.get('start'), 1900),
      year(sp.get('end'), 2100),
    );
  } else {
    return bad('Unknown kind');
  }

  const empty = Array.isArray(data) ? data.length === 0 : Object.keys(data || {}).length === 0;
  return NextResponse.json(
    { ok: true, data },
    {
      headers: {
        'Cache-Control': empty ? 'no-store' : 'public, s-maxage=3600, stale-while-revalidate=600',
      },
    },
  );
}
