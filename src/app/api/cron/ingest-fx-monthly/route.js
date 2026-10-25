import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { getFmpKey } from '@/lib/fmp/upcoming-events';
import { floatingCurrencies, monthEnds } from '@/lib/sanctions/fx';
import { cronRoute } from '@/lib/cron/with-cron-lock';

/**
 * Month-end FX rates against the dollar, into fx_monthly, for the Sanctions
 * page's sanctions-versus-currency card. One FMP end-of-day series per
 * floating currency (pair USD{CCY}, units per dollar), reduced to the last
 * close of each month over the past 26 months. A pair FMP does not quote is
 * skipped and reported; the card then shows "no FX data" for it. Pegged and
 * non-market currencies are not fetched (see src/lib/sanctions/fx.js).
 *   GET /api/cron/ingest-fx-monthly
 * Auth: Bearer cron secret, checked by cronRoute.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const FMP = 'https://financialmodelingprep.com/stable/historical-price-eod/light';
const MONTHS = 26;

async function handler(request) {
  const key = getFmpKey();
  if (!key) return NextResponse.json({ ok: false, error: 'no FMP key' }, { status: 500 });
  const admin = getAdminClient();
  const from = new Date();
  from.setUTCMonth(from.getUTCMonth() - MONTHS, 1);
  const fromIso = from.toISOString().slice(0, 10);
  const stamp = new Date().toISOString();

  const missing = [];
  let written = 0;
  for (const ccy of floatingCurrencies()) {
    let rows = [];
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(
        `${FMP}?symbol=USD${ccy}&from=${fromIso}&apikey=${encodeURIComponent(key)}`,
        { cache: 'no-store', signal: AbortSignal.timeout(15_000) },
      );
      // eslint-disable-next-line no-await-in-loop
      const json = res.ok ? await res.json().catch(() => null) : null;
      rows = Array.isArray(json) ? json : Array.isArray(json?.historical) ? json.historical : [];
    } catch {
      rows = [];
    }
    const months = monthEnds(rows);
    if (!months.length) {
      missing.push(ccy);
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const { error } = await admin.from('fx_monthly').upsert(
      months.map((m) => ({
        currency: ccy,
        month: m.month,
        usd_rate: m.rate,
        source: 'fmp',
        updated_at: stamp,
      })),
      { onConflict: 'currency,month' },
    );
    if (error) missing.push(`${ccy} (write)`);
    else written += months.length;
  }
  revalidateTag('sanctions');
  return NextResponse.json({ ok: true, written, missing });
}

/* Every run is logged to ingest_runs from this route's own JSON body. */
export const GET = cronRoute('fx-monthly', handler, { ttlSeconds: 360 });
