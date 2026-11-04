/**
 * EU, UK and UN consolidated sanctions lists into public.sanctions_intl_entries (the OFAC list
 * stays in sanctions_entries). Same model as /api/cron/ingest-ofac: every listed entry is
 * upserted with last_seen = today; first_seen comes from the column default on insert only;
 * entries absent from today's file get removed_on = today, but only when the whole list
 * parsed above its minimum size and every chunk landed. A re-listed entry clears removed_on.
 */
import { parseEuXml, parseUkCsv, parseUnXml } from './parsers.js';

const UA = { 'User-Agent': 'EzanaFinance/1.0 (+https://ezana.world)' };

export const LISTS = {
  eu: {
    label: 'EU consolidated financial sanctions',
    urls: [
      'https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw',
    ],
    parse: parseEuXml,
    min: 1500,
  },
  uk: {
    label: 'UK Sanctions List (FCDO)',
    urls: ['https://sanctionslist.fcdo.gov.uk/docs/UK-Sanctions-List.csv'],
    parse: parseUkCsv,
    min: 1500,
  },
  un: {
    label: 'UN Security Council Consolidated List',
    urls: ['https://scsanctions.un.org/resources/xml/en/consolidated.xml'],
    parse: parseUnXml,
    min: 500,
  },
};

const CHUNK = 500;

async function download(urls) {
  let last;
  for (const url of urls) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(url, {
        headers: UA,
        cache: 'no-store',
        redirect: 'follow',
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) throw new Error(`${res.status} ${new URL(url).host}`);
      // eslint-disable-next-line no-await-in-loop
      return await res.text();
    } catch (e) {
      last = e;
    }
  }
  throw last || new Error('no source reachable');
}

/** Sync one list. Returns a summary; never throws for a bad download. */
export async function syncList(db, key, { fetchText = download } = {}) {
  const def = LISTS[key];
  const today = new Date().toISOString().slice(0, 10);
  const stamp = new Date().toISOString();
  let rows;
  try {
    rows = def.parse(await fetchText(def.urls));
  } catch (e) {
    return { list: key, ok: false, error: String(e?.message || e) };
  }
  /* Duplicate ids in one file would make a single upsert statement fail. */
  rows = [...new Map(rows.map((r) => [r.source_id, r])).values()];
  if (rows.length < def.min) {
    return {
      list: key,
      ok: false,
      parsed: rows.length,
      error: `only ${rows.length} entries (minimum ${def.min}); refusing to update`,
    };
  }
  const errors = [];
  let upserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows
      .slice(i, i + CHUNK)
      .map((r) => ({ ...r, last_seen: today, removed_on: null, synced_at: stamp }));
    // eslint-disable-next-line no-await-in-loop
    const { error } = await db
      .from('sanctions_intl_entries')
      .upsert(chunk, { onConflict: 'list_source,source_id' });
    if (error) errors.push(`upsert @${i}: ${error.message}`);
    else upserted += chunk.length;
  }
  let removed = 0;
  if (upserted === rows.length) {
    const { count, error } = await db
      .from('sanctions_intl_entries')
      .update({ removed_on: today }, { count: 'exact' })
      .eq('list_source', key)
      .lt('last_seen', today)
      .is('removed_on', null);
    if (error) errors.push(`removals: ${error.message}`);
    else removed = count || 0;
  }
  return {
    list: key,
    ok: upserted === rows.length && !errors.length,
    parsed: rows.length,
    upserted,
    removed,
    errors,
  };
}

export async function syncAll(db, keys = Object.keys(LISTS), opts) {
  const out = [];
  // eslint-disable-next-line no-await-in-loop
  for (const k of keys) out.push(await syncList(db, k, opts));
  return out;
}
