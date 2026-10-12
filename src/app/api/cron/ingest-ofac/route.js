import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import Papa from 'papaparse';
import { getAdminClient } from '@/lib/supabase';

/**
 * OFAC Specially Designated Nationals list (US Treasury, public domain) into
 * sanctions_entries. Every listed entry is upserted with last_seen = today;
 * first_seen is set by the table default on insert only, so the first run is
 * the baseline and later runs reveal additions. Entries that drop off the list
 * get removed_on = today. A download with fewer than MIN_ENTRIES rows is treated
 * as broken and nothing is marked removed.
 *   GET /api/cron/ingest-ofac
 * Auth: CRON_SECRET as a Bearer header or ?key=.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const SOURCES = {
  sdn: [
    'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.CSV',
    'https://www.treasury.gov/ofac/downloads/sdn.csv',
  ],
  add: [
    'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/ADD.CSV',
    'https://www.treasury.gov/ofac/downloads/add.csv',
  ],
};
const MIN_ENTRIES = 5000;
const UPSERT_CHUNK = 1000;
const EMPTY = '-0-';

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

const clean = (v) => {
  const s = String(v ?? '').trim();
  return !s || s === EMPTY ? null : s;
};

/** "SDGT] [IRGC" or "[SDGT] [IRGC]" -> ['SDGT', 'IRGC']. */
function programs(raw) {
  const s = clean(raw);
  if (!s) return [];
  return s
    .replace(/^\[|\]$/g, '')
    .split(/\]\s*\[/)
    .map((p) => p.trim())
    .filter(Boolean);
}

async function download(urls) {
  let last = null;
  for (const url of urls) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(url, {
        headers: { 'User-Agent': 'EzanaFinance/1.0 (+https://ezana.world)' },
        cache: 'no-store',
        redirect: 'follow',
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      // eslint-disable-next-line no-await-in-loop
      const buf = await res.arrayBuffer();
      // Step 0 confirms the encoding; switch to 'windows-1252' if names garble.
      return new TextDecoder('utf-8').decode(buf);
    } catch (e) {
      last = e;
    }
  }
  throw last || new Error('no source reachable');
}

const parse = (text) =>
  Papa.parse(text.replace(/\u001a/g, ''), { skipEmptyLines: true }).data.filter(
    (r) => Array.isArray(r) && /^\d+$/.test(String(r[0]).trim()),
  );

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const admin = getAdminClient();
  const errors = [];
  const today = new Date().toISOString().slice(0, 10);
  const stamp = new Date().toISOString();

  let sdn;
  let add = [];
  try {
    sdn = parse(await download(SOURCES.sdn));
  } catch (e) {
    return NextResponse.json({ ok: false, error: `sdn: ${e?.message || e}` }, { status: 502 });
  }
  try {
    add = parse(await download(SOURCES.add));
  } catch (e) {
    errors.push(`add: ${e?.message || e}`); // countries are optional
  }

  const countriesByEnt = new Map();
  for (const r of add) {
    const ent = Number(r[0]);
    const country = clean(r[4]);
    if (!country) continue;
    if (!countriesByEnt.has(ent)) countriesByEnt.set(ent, new Set());
    countriesByEnt.get(ent).add(country);
  }

  const rows = [];
  for (const r of sdn) {
    const ent = Number(r[0]);
    const name = clean(r[1]);
    if (!Number.isInteger(ent) || !name) continue;
    rows.push({
      ent_num: ent,
      name,
      entry_type: (clean(r[2]) || 'entity').toLowerCase(),
      programs: programs(r[3]),
      countries: [...(countriesByEnt.get(ent) || [])],
      remarks: clean(r[11]),
      last_seen: today,
      removed_on: null,
      synced_at: stamp,
    });
  }
  if (rows.length < MIN_ENTRIES) {
    return NextResponse.json(
      { ok: false, error: `only ${rows.length} entries parsed; refusing to update` },
      { status: 502 },
    );
  }

  let upserted = 0;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    // eslint-disable-next-line no-await-in-loop
    const { error } = await admin
      .from('sanctions_entries')
      .upsert(chunk, { onConflict: 'ent_num' });
    if (error) errors.push(`upsert @${i}: ${error.message}`);
    else upserted += chunk.length;
  }

  // Only mark removals when every chunk landed, so a partial run never
  // reports entries as delisted.
  let removed = 0;
  if (upserted === rows.length) {
    const { count, error } = await admin
      .from('sanctions_entries')
      .update({ removed_on: today }, { count: 'exact' })
      .lt('last_seen', today)
      .is('removed_on', null);
    if (error) errors.push(`removals: ${error.message}`);
    else removed = count || 0;
  }

  if (upserted || removed) revalidateTag('hubs');
  return NextResponse.json({
    ok: upserted === rows.length,
    parsed: rows.length,
    upserted,
    removed,
    withCountry: countriesByEnt.size,
    errors: errors.slice(0, 10),
  });
}
