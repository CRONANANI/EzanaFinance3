import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import Papa from 'papaparse';
import { getAdminClient } from '@/lib/supabase';
import { withIngestRun } from '@/lib/ingest-runs';
import {
  PARSER_VERSION,
  disambiguators,
  joinOverflow,
  normName,
  parseRemarks,
} from '@/lib/sanctions/remarks';

/**
 * OFAC research details for the Sanctions page, after /api/cron/ingest-ofac
 * has loaded the list itself:
 *   ALT.CSV           alternate names            -> sanctions_aliases (source 'alt')
 *   ADD.CSV           address localities         -> sanctions_entries.localities
 *   SDN_COMMENTS.CSV  remarks past 1000 chars    -> sanctions_entries.remarks_full
 * and parses each active entry's remarks (src/lib/sanctions/remarks.js) into
 *   sanctions_identifiers, sanctions_links, remarks a.k.a. aliases, and
 *   sanctions_entries.secondary_risk / remarks_unparsed / parser_version.
 * The original remarks column is never changed.
 *
 * Idempotent: every row written carries this run's synced_at; rows a table
 * did not receive this run are pruned ONLY when every chunk for that table
 * landed, so a partial run never deletes good data. A file that fails to
 * download leaves its table as it was.
 *   GET /api/cron/ingest-ofac-details
 * Auth: CRON_SECRET as a Bearer header or ?key=.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const EXPORTS = 'https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports';
const LEGACY = 'https://www.treasury.gov/ofac/downloads';
const SOURCES = {
  alt: [`${EXPORTS}/ALT.CSV`, `${LEGACY}/alt.csv`],
  add: [`${EXPORTS}/ADD.CSV`, `${LEGACY}/add.csv`],
  comments: [`${EXPORTS}/SDN_COMMENTS.CSV`, `${LEGACY}/sdn_comments.csv`],
};
const MIN_ACTIVE = 5000;
const MIN_ALT = 1000;
const CHUNK = 1000;
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
      return new TextDecoder('utf-8').decode(await res.arrayBuffer());
    } catch (e) {
      last = e;
    }
  }
  throw last || new Error('no source reachable');
}

const parseCsv = (text) =>
  Papa.parse(text.replace(/\u001a/g, ''), { skipEmptyLines: true }).data.filter(
    (r) => Array.isArray(r) && /^\d+$/.test(String(r[0]).trim()),
  );

async function readActive(admin) {
  const out = [];
  for (let from = 0; ; from += CHUNK) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('sanctions_entries')
      .select('ent_num, name, remarks')
      .is('removed_on', null)
      .order('ent_num', { ascending: true })
      .range(from, from + CHUNK - 1);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < CHUNK) break;
  }
  return out;
}

/** Upsert in chunks; returns { written, failed } so pruning can be gated. */
async function upsertAll(admin, table, rows, onConflict, errors) {
  let written = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    // eslint-disable-next-line no-await-in-loop
    const { error } = await admin.from(table).upsert(chunk, { onConflict });
    if (error) {
      failed += chunk.length;
      errors.push(`${table} @${i}: ${error.message}`);
    } else {
      written += chunk.length;
    }
  }
  return { written, failed };
}

async function prune(admin, table, stamp, errors, filter) {
  let q = admin.from(table).delete({ count: 'exact' }).lt('synced_at', stamp);
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) errors.push(`prune ${table}: ${error.message}`);
  return count || 0;
}

async function handler(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const admin = getAdminClient();
  const stamp = new Date().toISOString();
  const errors = [];

  /* Files. Each is optional on its own; a missing one only skips its part. */
  const files = {};
  for (const [k, urls] of Object.entries(SOURCES)) {
    try {
      // eslint-disable-next-line no-await-in-loop
      files[k] = parseCsv(await download(urls));
    } catch (e) {
      files[k] = null;
      errors.push(`${k}: ${e?.message || e}`);
    }
  }
  if (files.alt && files.alt.length < MIN_ALT) {
    errors.push(`alt: only ${files.alt.length} rows; treated as broken`);
    files.alt = null;
  }

  let active;
  try {
    active = await readActive(admin);
  } catch (e) {
    return NextResponse.json({ ok: false, error: `read: ${e?.message || e}` }, { status: 500 });
  }
  if (active.length < MIN_ACTIVE) {
    return NextResponse.json(
      { ok: false, error: `only ${active.length} active entries; run ingest-ofac first` },
      { status: 502 },
    );
  }
  const activeSet = new Set(active.map((r) => r.ent_num));

  /* ADD.CSV: ent_num, add_num, address, city/state/province/postal, country, remarks */
  const localities = new Map();
  for (const r of files.add || []) {
    const ent = Number(r[0]);
    const loc = clean(r[3]);
    if (!activeSet.has(ent) || !loc) continue;
    if (!localities.has(ent)) localities.set(ent, new Set());
    localities.get(ent).add(loc);
  }

  /* SDN_COMMENTS.CSV: ent_num, remarks_extended */
  const overflow = new Map();
  for (const r of files.comments || []) {
    const ent = Number(r[0]);
    if (activeSet.has(ent) && clean(r[1])) overflow.set(ent, r[1]);
  }

  const entryRows = [];
  const identifierRows = new Map();
  const linkRows = new Map();
  const aliasRows = new Map();
  let truncated = 0;
  let restored = 0;

  for (const e of active) {
    const full = joinOverflow(e.remarks, overflow.get(e.ent_num));
    if ((e.remarks || '').length >= 1000) {
      truncated += 1;
      if (full) restored += 1;
    }
    const p = parseRemarks(full || e.remarks);
    entryRows.push({
      ent_num: e.ent_num,
      name: e.name,
      localities: files.add ? [...(localities.get(e.ent_num) || [])] : undefined,
      remarks_full: full,
      secondary_risk: p.secondaryRisk.length ? p.secondaryRisk.join(' | ') : null,
      remarks_unparsed: p.unparsed.length ? p.unparsed.join('; ') : null,
      parser_version: PARSER_VERSION,
      parsed_at: stamp,
    });
    for (const id of [...p.identifiers, ...disambiguators(p)]) {
      const key = `${e.ent_num}|${id.kind}|${id.valueNorm}`;
      if (identifierRows.has(key)) continue;
      identifierRows.set(key, {
        ent_num: e.ent_num,
        kind: id.kind,
        label: id.label,
        value: id.value.slice(0, 200),
        value_norm: id.valueNorm.slice(0, 200),
        issuer: id.issuer,
        is_alt: id.isAlt,
        raw: id.raw.slice(0, 500),
        parser_version: PARSER_VERSION,
        synced_at: stamp,
      });
    }
    for (const name of p.linkedTo) {
      const key = `${e.ent_num}|${name}`;
      if (!linkRows.has(key)) {
        linkRows.set(key, {
          ent_num: e.ent_num,
          linked_name: name.slice(0, 400),
          synced_at: stamp,
        });
      }
    }
    for (const name of p.aliases) {
      const n = normName(name);
      if (!n) continue;
      const key = `rem:${e.ent_num}:${n}`;
      if (!aliasRows.has(key)) {
        aliasRows.set(key, {
          key,
          ent_num: e.ent_num,
          alt_num: null,
          alt_type: 'a.k.a. (remarks)',
          alt_name: name.slice(0, 400),
          alt_remarks: null,
          source: 'remarks',
          synced_at: stamp,
        });
      }
    }
  }

  /* ALT.CSV: ent_num, alt_num, alt_type, alt_name, alt_remarks */
  for (const r of files.alt || []) {
    const ent = Number(r[0]);
    const alt = Number(r[1]);
    const name = clean(r[3]);
    if (!activeSet.has(ent) || !Number.isInteger(alt) || !name) continue;
    const key = `alt:${alt}`;
    aliasRows.set(key, {
      key,
      ent_num: ent,
      alt_num: alt,
      alt_type: clean(r[2]),
      alt_name: name.slice(0, 400),
      alt_remarks: clean(r[4]),
      source: 'alt',
      synced_at: stamp,
    });
  }

  /* localities is left out of the update when ADD.CSV did not download, so
     yesterday's values stay. */
  const entries = entryRows.map((r) => {
    if (r.localities === undefined) {
      const { localities: _drop, ...rest } = r;
      return rest;
    }
    return r;
  });
  const wEntries = await upsertAll(admin, 'sanctions_entries', entries, 'ent_num', errors);
  const wIds = await upsertAll(
    admin,
    'sanctions_identifiers',
    [...identifierRows.values()],
    'ent_num,kind,value_norm',
    errors,
  );
  const wLinks = await upsertAll(
    admin,
    'sanctions_links',
    [...linkRows.values()],
    'ent_num,linked_name',
    errors,
  );
  const wAliases = await upsertAll(
    admin,
    'sanctions_aliases',
    [...aliasRows.values()],
    'key',
    errors,
  );

  const pruned = {};
  if (!wIds.failed) pruned.identifiers = await prune(admin, 'sanctions_identifiers', stamp, errors);
  if (!wLinks.failed) pruned.links = await prune(admin, 'sanctions_links', stamp, errors);
  if (!wAliases.failed) {
    pruned.aliases = await prune(admin, 'sanctions_aliases', stamp, errors, (q) =>
      files.alt ? q : q.eq('source', 'remarks'),
    );
  }

  const written = wEntries.written + wIds.written + wLinks.written + wAliases.written;
  const failed = wEntries.failed + wIds.failed + wLinks.failed + wAliases.failed;
  if (written) revalidateTag('sanctions');
  return NextResponse.json({
    ok: failed === 0 && Boolean(files.alt) && Boolean(files.add),
    rowsRead: active.length,
    written,
    entries: wEntries.written,
    identifiers: wIds.written,
    links: wLinks.written,
    aliases: wAliases.written,
    pruned,
    truncatedRemarks: truncated,
    restoredRemarks: restored,
    validation: `${active.length} active entries parsed (parser v${PARSER_VERSION}); ${restored} of ${truncated} truncated remarks restored`,
    errors: errors.slice(0, 10),
  });
}

/* Every run is logged to ingest_runs from this route's own JSON body. */
export const GET = withIngestRun('ofac-details', handler);
