import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { isBigQueryConfigured } from '@/lib/bigquery-client';
import { getOecdSeriesCoverage, getOecdSeriesObservations } from '@/lib/bigquery-oecd';
import { OECD_CURATED_SLUGS } from '@/lib/oecd-curated';

/**
 * Sync OECD rollups BigQuery → Supabase (the page reads the small rollups,
 * never raw BigQuery). Coverage is upserted for ALL 282 EO measures; observation
 * rows are synced ONLY for the curated whitelist (~20 series → roughly 55K rows),
 * chunked so it stays inside maxDuration. `?slug=` targets one curated series.
 * Idempotent — upserts on the rollup PKs, so a re-run does not grow the tables.
 * CRON_SECRET bearer (or ?key=). NOT registered in vercel.json crons.
 *   GET /api/cron/sync-oecd-rollups[?slug=eo-sratio]
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const UPSERT_CHUNK = 500;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if ((request.headers.get('authorization') || '') === `Bearer ${secret}`) return true;
  try {
    return new URL(request.url).searchParams.get('key') === secret;
  } catch {
    return false;
  }
}

/** BigQuery numeric/int cells come back as number | string | {value}. */
function num(v) {
  if (v == null) return null;
  if (typeof v === 'object' && 'value' in v) {
    const n = Number(v.value);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function upsertChunked(admin, table, rows, onConflict) {
  let count = 0;
  const errors = [];
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    // eslint-disable-next-line no-await-in-loop
    const { error } = await admin.from(table).upsert(chunk, { onConflict });
    if (error) errors.push(`${table}@${i}: ${error.message}`);
    else count += chunk.length;
  }
  return { count, errors };
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isBigQueryConfigured()) {
    return NextResponse.json({ ok: false, error: 'BigQuery not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const oneSlug = searchParams.get('slug');
  const slugs =
    oneSlug && OECD_CURATED_SLUGS.includes(oneSlug) ? [oneSlug] : OECD_CURATED_SLUGS;

  const admin = getAdminClient();
  const syncedAt = new Date().toISOString();
  const errors = [];
  let bytesBilled = 0;

  // 1) Coverage catalog for every measure (cheap grouped scan) → upsert all.
  const cov = await getOecdSeriesCoverage();
  bytesBilled += cov.bytesBilled || 0;
  let coverageRows = 0;
  if (cov.error) {
    errors.push(`coverage: ${cov.error}`);
  } else {
    const rows = cov.rows
      .filter((r) => r.ezana_slug)
      .map((r) => ({
        ezana_slug: String(r.ezana_slug),
        measure_name: r.measure_name ?? null,
        unit_name: r.unit_name ?? null,
        country_count: num(r.country_count) ?? 0,
        year_min: num(r.year_min),
        year_max: num(r.year_max),
        obs_count: num(r.obs_count) ?? 0,
        synced_at: syncedAt,
      }));
    const res = await upsertChunked(admin, 'oecd_series_coverage', rows, 'ezana_slug');
    coverageRows = res.count;
    errors.push(...res.errors);
  }

  // 2) Observations for the curated whitelist only.
  const obs = await getOecdSeriesObservations({ slugs });
  bytesBilled += obs.bytesBilled || 0;
  let observationRows = 0;
  const syncedSlugs = new Set();
  if (obs.error) {
    errors.push(`observations: ${obs.error}`);
  } else {
    const rows = obs.rows
      .filter((r) => r.ezana_slug && r.ref_area && num(r.year) != null)
      .map((r) => {
        syncedSlugs.add(String(r.ezana_slug));
        return {
          ezana_slug: String(r.ezana_slug),
          ref_area: String(r.ref_area),
          ref_area_name: r.ref_area_name ?? null,
          year: num(r.year),
          obs_value: num(r.obs_value),
          obs_status: r.obs_status ?? null,
          unit_label: r.unit_name ?? null,
          synced_at: syncedAt,
        };
      });
    const res = await upsertChunked(
      admin,
      'oecd_series_observations',
      rows,
      'ezana_slug,ref_area,year',
    );
    observationRows = res.count;
    errors.push(...res.errors);
  }

  return NextResponse.json({
    ok: errors.length === 0,
    coverage: coverageRows,
    synced: [...syncedSlugs].sort(),
    observation_rows: observationRows,
    bytes_billed: bytesBilled,
    errors: errors.slice(0, 20),
  });
}
