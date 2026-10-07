import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { ingestTseYear } from '@/lib/politicians/tse-ingest';

/**
 * GET /api/cron/ingest-tse-assets?year=2022[&dry=1]
 *
 * Loads one Brazilian general election's officeholder asset declarations
 * from the Superior Electoral Court (TSE) open data. Run the newest year
 * first (2022, then 2018): an older year keeps the filings of people elected
 * in a newer one, so the tracker can show the change. A year is a full
 * reload, so re-running is safe. Auth: CRON_SECRET as a Bearer header or
 * ?key=.
 *
 * Scheduled monthly for 2022 to pick up TSE corrections; run by hand for
 * other years.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const year = Number(params.get('year') || 2022);
  const dry = params.get('dry') === '1';
  if (!Number.isInteger(year) || year < 2006 || year % 2 !== 0) {
    return NextResponse.json({ error: 'year must be an even year from 2006' }, { status: 400 });
  }

  const started = Date.now();
  const log = [];
  try {
    const r = await ingestTseYear({
      db: dry ? null : getAdminClient(),
      year,
      dry,
      /* Unset in production (the TSE CDN); a mirror or fixture server otherwise. */
      base: process.env.TSE_CDN_BASE || undefined,
      log: (m) => log.push(m),
    });
    const { electedKeys: _keys, ...summary } = r;
    return NextResponse.json({ ok: true, ...summary, ms: Date.now() - started, log });
  } catch (e) {
    console.error('[cron/ingest-tse-assets]', e?.message || e);
    return NextResponse.json(
      { ok: false, year, error: String(e?.message || e), ms: Date.now() - started, log },
      { status: 500 },
    );
  }
}
