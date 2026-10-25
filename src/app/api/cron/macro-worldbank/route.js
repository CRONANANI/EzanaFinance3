import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { MACRO_INDICATORS, fetchCountries, fetchIndicator } from '@/lib/ingest/macro/worldbank';
import { rebuild } from '@/lib/datasets/build-snapshots';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/**
 * Weekly: World Bank WDI GDP (nominal, PPP, per capita both ways), real
 * growth and population into macro_countries / macro_indicators, then the
 * 'macro:rankings' snapshot is rebuilt and the macro tag busted.
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://ezana.world/api/cron/macro-worldbank
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;
const CHUNK = 1000;

async function run(request) {
  const admin = getAdminClient();
  const stamp = new Date().toISOString();
  const errors = [];
  let countries = [];
  try {
    countries = await fetchCountries();
    for (let i = 0; i < countries.length; i += CHUNK) {
      // eslint-disable-next-line no-await-in-loop
      const { error } = await admin
        .from('macro_countries')
        .upsert(countries.slice(i, i + CHUNK), { onConflict: 'iso3' });
      if (error) throw new Error(error.message);
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `countries: ${e?.message || e}` },
      { status: 502 },
    );
  }
  const known = new Set(countries.map((c) => c.iso3));
  const perIndicator = {};
  for (const ind of MACRO_INDICATORS) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const rows = await fetchIndicator(ind, known, { stamp });
      for (let i = 0; i < rows.length; i += CHUNK) {
        // eslint-disable-next-line no-await-in-loop
        const { error } = await admin
          .from('macro_indicators')
          .upsert(rows.slice(i, i + CHUNK), { onConflict: 'iso3,indicator,year,source' });
        if (error) throw new Error(error.message);
      }
      perIndicator[ind] = rows.length;
    } catch (e) {
      errors.push(`${ind}: ${String(e?.message || e).slice(0, 200)}`);
    }
  }
  try {
    revalidateTag('macro');
  } catch {
    /* outside a request scope */
  }
  let snapshot = null;
  try {
    snapshot = await rebuild('macro:rankings', { warm: false });
  } catch (e) {
    errors.push(`snapshot: ${String(e?.message || e).slice(0, 200)}`);
  }
  return NextResponse.json({
    ok: !errors.length,
    countries: countries.length,
    aggregates: countries.filter((c) => c.is_aggregate).length,
    perIndicator,
    snapshot,
    errors,
  });
}

export const GET = cronRoute('macro-worldbank', run, { ttlSeconds: 360 });
