/**
 * @fileoverview
 * Read endpoint for the Empire Rankings dimension-scoring backbone.
 *
 * GET /api/empire/scores?year=2023&dimension=economic_output&countries=USA,CHN
 *
 * Query params (all optional):
 *   year        – integer; defaults to latest year with any data
 *   dimension   – empire_dimensions.id; omit to return all 18
 *   countries   – comma-separated ISO-3 list; omit to return all included
 *   limit       – int, defaults to 5000 (safety cap)
 *
 * Response shape:
 *   {
 *     year: 2023,
 *     scores: [
 *       { country_iso3, dimension_id, year, score, contributing_metrics }
 *     ],
 *     dimensions: [
 *       { id, name, description, higher_is_better, category, display_order,
 *         has_data: boolean }
 *     ],
 *     countries: [
 *       { code, name, flag, region, iso2, economic_rank }
 *     ]
 *   }
 *
 * `dimensions[].has_data` is `true` iff at least one country has a score
 * for that dimension in the returned year — this is what the UI uses to
 * render a "data source pending" state for placeholder-only dimensions.
 */

import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 5000;

function parseInteger(value, fallback) {
  if (value == null) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseIso3List(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length === 3);
}

export async function GET(request) {
  const supabase = getServerSupabase();
  const sp = new URL(request.url).searchParams;

  const requestedYear = parseInteger(sp.get('year'), null);
  const dimensionId = sp.get('dimension') || null;
  const countries = parseIso3List(sp.get('countries'));
  const limit = Math.min(parseInteger(sp.get('limit'), DEFAULT_LIMIT), 20000);

  try {
    // ─── 1. Resolve year ──────────────────────────────────────────────────────
    // If the caller didn't specify, find the most recent year with any
    // score. This avoids returning empty payloads when the matview is
    // sparse for the current calendar year.
    let year = requestedYear;
    if (year == null) {
      const { data: latest } = await supabase
        .from('country_dimension_scores_mat')
        .select('year')
        .order('year', { ascending: false })
        .limit(1);
      year = latest?.[0]?.year ?? new Date().getFullYear() - 1;
    }

    // ─── 2. Fetch scores for the resolved year ────────────────────────────────
    let scoreQuery = supabase
      .from('country_dimension_scores_mat')
      .select('country_iso3, dimension_id, year, score, contributing_metrics')
      .eq('year', year)
      .limit(limit);

    if (dimensionId) scoreQuery = scoreQuery.eq('dimension_id', dimensionId);
    if (countries.length) scoreQuery = scoreQuery.in('country_iso3', countries);

    const { data: scoreRows, error: scoreErr } = await scoreQuery;
    if (scoreErr) {
      console.error('[api/empire/scores] score query failed:', scoreErr.message);
      return NextResponse.json(
        { error: scoreErr.message, year, scores: [], dimensions: [], countries: [] },
        { status: 500 },
      );
    }

    // ─── 3. Fetch dimension + country catalogs in parallel ────────────────────
    const [{ data: dimRows }, { data: countryRows }] = await Promise.all([
      supabase
        .from('empire_dimensions')
        .select('id, name, description, higher_is_better, category, display_order')
        .order('display_order', { ascending: true }),
      supabase
        .from('empire_countries')
        .select('code, name, flag, region, iso2, economic_rank')
        .eq('included', true)
        .order('economic_rank', { ascending: true }),
    ]);

    // ─── 4. Mark which dimensions have real data for this year ────────────────
    const dimensionsWithData = new Set((scoreRows ?? []).map((r) => r.dimension_id));
    const dimensions = (dimRows ?? []).map((d) => ({
      ...d,
      has_data: dimensionsWithData.has(d.id),
    }));

    return NextResponse.json(
      {
        year,
        scores: scoreRows ?? [],
        dimensions,
        countries: countryRows ?? [],
      },
      {
        headers: {
          // Aggregates refresh weekly — a few minutes of CDN caching is fine.
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (err) {
    console.error('[api/empire/scores] unexpected:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
