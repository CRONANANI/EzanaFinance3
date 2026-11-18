/**
 * GET /api/politicians/sentiment?year=YYYY : congressional market sentiment.
 *
 *   years    every transaction year on file, oldest first, each with its
 *            breadth (share of leaning members who were net buyers), buy
 *            share of trades, dollar net flow and Bullish / Neutral / Bearish
 *   year     the year the sector rows are for (the asked year when on file,
 *            else the latest)
 *   sectors  that year by GICS sector, most traded first
 *   rotation and outlook (per year): money into bonds and defensive sectors
 *            against cyclicals, and the economic outlook that combines it
 *            with breadth (Expansion / Mixed / Slowdown risk)
 *
 * Computed in SQL over every stored disclosure (see
 * lib/politicians/sentiment.js for the rules). 503 when the functions or the
 * service key are unavailable.
 */
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { outlookFor, rotationFor, shapeRow } from '@/lib/politicians/sentiment';

export const revalidate = 900;

export async function GET(request) {
  const rl = await checkRateLimit(`pol:sentiment:${getClientIp(request)}`, {
    interval: 60000,
    limit: 60,
  });
  if (!rl.success) return rateLimitResponse(rl);
  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'Sentiment unavailable.' }, { status: 503 });
  }

  let client;
  try {
    client = getAdminClient();
  } catch {
    return NextResponse.json({ ok: false, error: 'Sentiment unavailable.' }, { status: 503 });
  }

  const [byYear, rot] = await Promise.all([
    client.rpc('congress_sentiment_by_year'),
    client.rpc('congress_rotation_by_year'),
  ]);
  if (rot.error) console.warn(`[politicians/sentiment] rotation: ${rot.error.message}`);
  const rotByYear = new Map((rot.data || []).map((r) => [Number(r.yr), rotationFor(r)]));
  if (byYear.error) {
    console.warn(`[politicians/sentiment] ${byYear.error.message}`);
    return NextResponse.json({ ok: false, error: 'Sentiment unavailable.' }, { status: 503 });
  }
  const years = (byYear.data || [])
    .map((r) => {
      const base = shapeRow(r);
      const rotation = rotByYear.get(Number(r.yr)) || null;
      return {
        year: Number(r.yr),
        ...base,
        rotation,
        outlook: outlookFor(base.breadth ?? NaN, rotation?.tilt ?? NaN),
      };
    })
    .filter((r) => Number.isInteger(r.year));
  if (!years.length) {
    return NextResponse.json({ ok: true, years: [], year: null, sectors: [] });
  }

  const asked = Number.parseInt(new URL(request.url).searchParams.get('year') || '', 10);
  const year = years.some((y) => y.year === asked) ? asked : years[years.length - 1].year;

  const bySector = await client.rpc('congress_sector_sentiment', { p_year: year });
  if (bySector.error) {
    console.warn(`[politicians/sentiment] sectors: ${bySector.error.message}`);
  }
  const sectors = (bySector.data || []).map((r) => ({ sector: r.sector, ...shapeRow(r) }));

  return NextResponse.json(
    { ok: true, years, year, sectors },
    { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } },
  );
}
