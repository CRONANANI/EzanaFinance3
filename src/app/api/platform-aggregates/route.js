/**
 * @fileoverview
 * Read API for the "Performance vs. Platform" chart on the My Profile page.
 *
 *   GET /api/platform-aggregates?window=1W|1M|3M|YTD
 *
 * Returns the precomputed platform typical (p50) and top-25% (p75) series
 * for the requested window. Values come straight from
 * `public.platform_return_aggregates` — no aggregation happens on the
 * request path.
 *
 * Response shape:
 *   {
 *     window: '1M',
 *     points: [
 *       { date: 'YYYY-MM-DD', platform: <p50 %>, cohort: <p75 %>, sampleSize }
 *     ]
 *   }
 *
 * When the table is empty (nightly job hasn't run yet) we return
 * `points: []` with a 200 — the chart renders a "not yet available" note
 * in that case rather than an error state.
 */

import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const VALID_WINDOWS = new Set(['1W', '1M', '3M', 'YTD']);

/**
 * @param {Date} d
 * @returns {Date}
 */
function startOfUtcDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * @param {Date} d
 * @returns {Date}
 */
function startOfUtcYear(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

/**
 * @param {Date} d
 * @param {number} n
 * @returns {Date}
 */
function addDays(d, n) {
  const r = new Date(d.getTime());
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

/** @param {Date} d */
function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

export async function GET(request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get('window') ?? '1M';
  const window = VALID_WINDOWS.has(raw) ? raw : '1M';

  const today = startOfUtcDay(new Date());
  const windowStart =
    window === '1W'
      ? addDays(today, -7)
      : window === '1M'
        ? addDays(today, -30)
        : window === '3M'
          ? addDays(today, -90)
          : startOfUtcYear(today);

  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('platform_return_aggregates')
      .select('date, sample_size, p50, p75')
      .eq('window_key', window)
      .gte('date', isoDate(windowStart))
      .lte('date', isoDate(today))
      .order('date', { ascending: true });

    if (error) {
      const code = /** @type {any} */ (error).code;
      if (code === 'PGRST205' || code === '42P01') {
        return NextResponse.json(
          { window, points: [] },
          { headers: { 'Cache-Control': 'no-store' } },
        );
      }
      return NextResponse.json(
        { error: error.message, window, points: [] },
        { status: 500 },
      );
    }

    const points = (data ?? []).map((r) => ({
      date: r.date,
      platform: Number(r.p50),
      cohort: Number(r.p75),
      sampleSize: r.sample_size,
    }));

    return NextResponse.json(
      { window, points },
      {
        headers: {
          // Aggregates only change once per day when the nightly job runs,
          // so a short public cache is safe and keeps the profile page snappy.
          'Cache-Control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=3600',
        },
      },
    );
  } catch (err) {
    console.error('[platform-aggregates] GET failed:', err);
    return NextResponse.json(
      { error: 'internal_error', window, points: [] },
      { status: 500 },
    );
  }
}
