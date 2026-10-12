import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { WB_INDICATORS, WB_FROM_YEAR } from '@/lib/lighthouse/indicators';

/**
 * World Bank Indicators API (v2, no key, CC BY 4.0) into
 * lighthouse_observations (source=worldbank). Countries only: regional and
 * income-group aggregates are dropped. Annual values from WB_FROM_YEAR, one
 * request per indicator. Null values are not stored.
 *   GET /api/cron/ingest-worldbank
 * Auth: CRON_SECRET as a Bearer header or ?key=.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const WB_BASE = 'https://api.worldbank.org/v2';
const UPSERT_CHUNK = 1000;
const HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'EzanaFinance/1.0 (+https://ezana.world)',
};

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

async function getJson(url) {
  const res = await fetch(url, {
    headers: HEADERS,
    cache: 'no-store',
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

/** ISO3 -> country name, real countries only (no aggregates). */
async function countries() {
  const json = await getJson(`${WB_BASE}/country?format=json&per_page=400`);
  const rows = Array.isArray(json) ? json[1] || [] : [];
  const map = new Map();
  for (const c of rows) {
    if (!c?.id || c?.region?.value === 'Aggregates') continue;
    map.set(String(c.id).toUpperCase(), c.name || c.id);
  }
  return map;
}

async function indicatorRows(ind, names, stamp) {
  const year = new Date().getUTCFullYear();
  const url = `${WB_BASE}/country/all/indicator/${encodeURIComponent(ind.id)}?format=json&date=${WB_FROM_YEAR}:${year}&per_page=20000`;
  const json = await getJson(url);
  const meta = Array.isArray(json) ? json[0] : null;
  if (meta?.pages > 1)
    throw new Error(`${ind.id}: more than one page (${meta.pages}); raise per_page`);
  const rows = Array.isArray(json) ? json[1] || [] : [];
  const out = [];
  for (const r of rows) {
    const iso3 = String(r?.countryiso3code || '').toUpperCase();
    if (!iso3 || !names.has(iso3)) continue;
    const v = r?.value;
    if (v == null || !Number.isFinite(Number(v))) continue;
    const y = Number(r?.date);
    if (!Number.isInteger(y)) continue;
    out.push({
      source: 'worldbank',
      indicator: ind.id,
      ref_area: iso3,
      ref_area_name: names.get(iso3),
      period: `${y}-01-01`,
      frequency: 'annual',
      value: Number(v),
      unit: ind.unit,
      synced_at: stamp,
    });
  }
  return out;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const admin = getAdminClient();
  const stamp = new Date().toISOString();
  const errors = [];
  const perIndicator = {};

  let names;
  try {
    names = await countries();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `country list: ${e?.message || e}` },
      { status: 502 },
    );
  }

  let upserted = 0;
  for (const ind of WB_INDICATORS) {
    let rows = [];
    try {
      // eslint-disable-next-line no-await-in-loop
      rows = await indicatorRows(ind, names, stamp);
    } catch (e) {
      errors.push(`${ind.id}: ${e?.message || e}`);
      continue;
    }
    for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
      // eslint-disable-next-line no-await-in-loop
      const { error } = await admin
        .from('lighthouse_observations')
        .upsert(rows.slice(i, i + UPSERT_CHUNK), {
          onConflict: 'source,indicator,ref_area,period',
        });
      if (error) errors.push(`${ind.id} upsert @${i}: ${error.message}`);
      else upserted += Math.min(UPSERT_CHUNK, rows.length - i);
    }
    perIndicator[ind.id] = rows.length;
  }

  if (upserted) revalidateTag('hubs');
  return NextResponse.json({
    ok: upserted > 0,
    countries: names.size,
    upserted,
    perIndicator,
    errors: errors.slice(0, 10),
  });
}
