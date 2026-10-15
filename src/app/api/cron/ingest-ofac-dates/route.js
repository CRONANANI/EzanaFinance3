import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { createEntryDateReader } from '@/lib/sanctions/sdn-advanced';
import { withIngestRun } from '@/lib/ingest-runs';

/**
 * OFAC's own publication date for every SDN entry, into
 * sanctions_listing_dates, for the Sanctions page's trend card.
 * sanctions_entries.first_seen only says when Ezana first loaded a row, and
 * the baseline load put all of them on one day.
 *
 * Source: SDN_ADVANCED.XML (US Treasury, public domain), streamed and read
 * by createEntryDateReader, which keeps only <SanctionsEntry> blocks. Before
 * anything is written the run checks that the file's ProfileIDs actually are
 * ent_nums: if fewer than MIN_MATCH of the active entries in
 * sanctions_entries have a date, the file has changed shape and the run
 * stops without writing.
 *   GET /api/cron/ingest-ofac-dates
 * Auth: CRON_SECRET as a Bearer header or ?key=.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const SOURCES = [
  'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN_ADVANCED.XML',
  'https://www.treasury.gov/ofac/downloads/sanctions/1.0/sdn_advanced.xml',
];
const MIN_MATCH = 0.5;
const UPSERT_CHUNK = 1000;
const READ_CHUNK = 1000;

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

async function readDates() {
  let last = null;
  for (const url of SOURCES) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(url, {
        headers: { 'User-Agent': 'EzanaFinance/1.0 (+https://ezana.world)' },
        cache: 'no-store',
        redirect: 'follow',
        signal: AbortSignal.timeout(200_000),
      });
      if (!res.ok || !res.body) throw new Error(`${res.status} ${url}`);
      const reader = createEntryDateReader();
      const decoder = new TextDecoder('utf-8');
      const stream = res.body.getReader();
      for (;;) {
        // eslint-disable-next-line no-await-in-loop
        const { done, value } = await stream.read();
        if (done) break;
        reader.push(decoder.decode(value, { stream: true }));
      }
      reader.push(decoder.decode());
      return { dates: reader.dates, entries: reader.entries, url };
    } catch (e) {
      last = e;
    }
  }
  throw last || new Error('no source reachable');
}

async function activeEntNums(admin) {
  const out = [];
  for (let from = 0; ; from += READ_CHUNK) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('sanctions_entries')
      .select('ent_num')
      .is('removed_on', null)
      .order('ent_num', { ascending: true })
      .range(from, from + READ_CHUNK - 1);
    if (error) throw new Error(error.message);
    out.push(...(data || []).map((r) => r.ent_num));
    if (!data || data.length < READ_CHUNK) break;
  }
  return out;
}

async function handler(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const admin = getAdminClient();

  let parsed;
  try {
    parsed = await readDates();
  } catch (e) {
    return NextResponse.json({ ok: false, error: `download: ${e?.message || e}` }, { status: 502 });
  }

  let active;
  try {
    active = await activeEntNums(admin);
  } catch (e) {
    return NextResponse.json({ ok: false, error: `read: ${e?.message || e}` }, { status: 500 });
  }
  const matched = active.filter((n) => parsed.dates.has(n)).length;
  const rate = active.length ? matched / active.length : 0;
  if (rate < MIN_MATCH) {
    return NextResponse.json(
      {
        ok: false,
        error: `only ${matched} of ${active.length} active entries matched a date (${Math.round(rate * 100)}%); refusing to write`,
        entries: parsed.entries,
        dated: parsed.dates.size,
      },
      { status: 502 },
    );
  }

  const stamp = new Date().toISOString();
  const rows = [...parsed.dates.entries()].map(([ent_num, listed_on]) => ({
    ent_num,
    listed_on,
    synced_at: stamp,
  }));
  let written = 0;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    // eslint-disable-next-line no-await-in-loop
    const { error } = await admin
      .from('sanctions_listing_dates')
      .upsert(rows.slice(i, i + UPSERT_CHUNK), { onConflict: 'ent_num' });
    if (error) {
      return NextResponse.json(
        { ok: false, error: `upsert: ${error.message}`, written },
        { status: 500 },
      );
    }
    written += Math.min(UPSERT_CHUNK, rows.length - i);
  }
  revalidateTag('sanctions');
  return NextResponse.json({
    ok: true,
    entries: parsed.entries,
    dated: parsed.dates.size,
    matchedActive: matched,
    active: active.length,
    written,
    validation: `${matched} of ${active.length} active entries matched a date`,
  });
}

/* Every run is logged to ingest_runs from this route's own JSON body. */
export const GET = withIngestRun('ofac-dates', handler);
