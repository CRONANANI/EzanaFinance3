/**
 * Congressional trades ingest: members from the public-domain
 * unitedstates/congress-legislators dataset, trades from the primary-source
 * tables the repo already fills (House Clerk PTRs parsed into
 * public.house_trades; public.senate_trades when a Senate ingest lands) and,
 * behind FMP_CONGRESS_ENABLED, FMP's senate-latest / house-latest.
 *
 * Everything lands in public.congress_members / public.congress_trades, which
 * the Politician Tracker reads. Nothing here runs at request time.
 *
 * Shared by the cron (/api/cron/ingest-congress-trades) and the CLI
 * (npm run ingest:congress), so this file imports nothing through the `@/`
 * alias and takes its Supabase client and fetch as arguments. The pure
 * helpers are tested in scripts/check-congress-ingest.mjs.
 *
 * Rules: a trade is never inserted without a bioguide_id (unmatched rows go
 * to congress_ingest_issues as kind 'unmatched_member'); dedupe is
 * source_hash = sha256(bioguide|date|ticker|type|min|max|owner) with
 * ON CONFLICT DO NOTHING, so every run is idempotent.
 */
import { createHash } from 'node:crypto';

export const LEGISLATORS_URL =
  'https://unitedstates.github.io/congress-legislators/legislators-current.json';
export const PHOTO_BASE = 'https://theunitedstates.io/images/congress/225x275';
export const BIOGUIDE_PHOTO_BASE = 'https://bioguide.congress.gov/photo';
export const PHOTO_BUCKET = 'congress-photos';

const FMP_BASE = 'https://financialmodelingprep.com/stable';
const FMP_PAGE_LIMIT = 100;
const PAGE = 1000;
const WRITE_BATCH = 500;

/* ── names ─────────────────────────────────────────────────────────────── */

const SUFFIX = /\b(jr|sr|ii|iii|iv|md|phd)\b/g;
const HONORIFIC = /\b(hon|honorable|mr|mrs|ms|dr|rep|sen|senator|representative)\b/g;

/** Lowercase letters and single spaces; suffixes, honorifics and initials dropped. */
export function cleanName(n) {
  return String(n || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(SUFFIX, ' ')
    .replace(HONORIFIC, ' ')
    .replace(/\b[a-z]\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trigrams(s) {
  const padded = `  ${s} `;
  const out = new Set();
  for (let i = 0; i < padded.length - 2; i += 1) out.add(padded.slice(i, i + 3));
  return out;
}

/** pg_trgm-style similarity of two cleaned names, 0..1. */
export function trigramSimilarity(a, b) {
  const x = trigrams(cleanName(a));
  const y = trigrams(cleanName(b));
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const g of x) if (y.has(g)) shared += 1;
  return shared / (x.size + y.size - shared);
}

export const FUZZY_THRESHOLD = 0.55;

/* ── members ───────────────────────────────────────────────────────────── */

const partyLetter = (p) => {
  const s = String(p || '')
    .trim()
    .toUpperCase();
  if (s.startsWith('D')) return 'D';
  if (s.startsWith('R')) return 'R';
  if (s.startsWith('I')) return 'I';
  return null;
};

export const photoUrlFor = (bioguideId) => `${PHOTO_BASE}/${bioguideId}.jpg`;

/**
 * congress_members rows from either the raw legislators-current.json
 * (id/name/terms) or the trimmed vendored copy (bioguide/first/last/...).
 */
export function legislatorsToMembers(list) {
  const out = [];
  for (const p of Array.isArray(list) ? list : []) {
    let row;
    if (p?.id?.bioguide) {
      const t = Array.isArray(p.terms) ? p.terms[p.terms.length - 1] : null;
      if (!t) continue;
      row = {
        bioguide_id: p.id.bioguide,
        first_name: p.name?.first || '',
        last_name: p.name?.last || '',
        nickname: p.name?.nickname || null,
        full_name: p.name?.official_full || `${p.name?.first || ''} ${p.name?.last || ''}`.trim(),
        chamber: t.type === 'sen' ? 'senate' : 'house',
        party: partyLetter(t.party),
        state: t.state || null,
        district: Number.isInteger(t.district) ? t.district : null,
      };
    } else if (p?.bioguide) {
      row = {
        bioguide_id: p.bioguide,
        first_name: p.first || '',
        last_name: p.last || '',
        nickname: p.nick || null,
        full_name: p.full || `${p.first || ''} ${p.last || ''}`.trim(),
        chamber: String(p.chamber || '').toLowerCase() === 'senate' ? 'senate' : 'house',
        party: partyLetter(p.party),
        state: p.state || null,
        district: Number.isInteger(p.district) ? p.district : null,
      };
    } else continue;
    if (!row.first_name || !row.last_name) continue;
    out.push(row);
  }
  return out;
}

/** The DB row (drops the matcher-only nickname). */
export function memberRow(m, photoUrl) {
  return {
    bioguide_id: m.bioguide_id,
    first_name: m.first_name,
    last_name: m.last_name,
    full_name: m.full_name,
    chamber: m.chamber,
    party: m.party,
    state: m.state,
    district: m.district,
    in_office: true,
    photo_url: photoUrl || photoUrlFor(m.bioguide_id),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Name → bioguide matcher. Order (the brief's): exact last name + chamber +
 * state when that is unique; exact full name (official, first+last, or
 * nickname+last) within the chamber; then trigram similarity on the full
 * name within the chamber, preferring the same state, at FUZZY_THRESHOLD.
 */
export function buildMemberIndex(members) {
  const lastChamberState = new Map(); // key -> member | null (ambiguous)
  const nameChamber = new Map();
  const byChamber = { house: [], senate: [] };
  for (const m of members) {
    const lk = `${cleanName(m.last_name).split(' ').pop()}|${m.chamber}|${m.state}`;
    lastChamberState.set(lk, lastChamberState.has(lk) ? null : m);
    for (const n of [
      m.full_name,
      `${m.first_name} ${m.last_name}`,
      m.nickname ? `${m.nickname} ${m.last_name}` : null,
    ]) {
      if (n) nameChamber.set(`${cleanName(n)}|${m.chamber}`, m);
    }
    byChamber[m.chamber]?.push(m);
  }
  return { lastChamberState, nameChamber, byChamber };
}

/**
 * @param {{ first?: string, last?: string, full?: string, chamber: 'house'|'senate', state?: string|null }} who
 * @returns {{ member: object, how: 'last_state'|'exact'|'fuzzy' } | null}
 */
export function matchMember(index, who) {
  const chamber = who.chamber;
  const state = who.state ? String(who.state).slice(0, 2).toUpperCase() : null;
  const full = who.full || `${who.first || ''} ${who.last || ''}`;
  const last = cleanName(who.last || full)
    .split(' ')
    .pop();
  if (last && state) {
    const m = index.lastChamberState.get(`${last}|${chamber}|${state}`);
    if (m) return { member: m, how: 'last_state' };
  }
  const exact = index.nameChamber.get(`${cleanName(full)}|${chamber}`);
  if (exact && (!state || !exact.state || exact.state === state)) {
    return { member: exact, how: 'exact' };
  }
  let best = null;
  for (const m of index.byChamber[chamber] || []) {
    const score = Math.max(
      trigramSimilarity(full, m.full_name),
      trigramSimilarity(full, `${m.first_name} ${m.last_name}`),
    );
    const adj = state && m.state === state ? score + 0.05 : state ? score - 0.1 : score;
    if (!best || adj > best.adj) best = { member: m, adj };
  }
  if (best && best.adj >= FUZZY_THRESHOLD) return { member: best.member, how: 'fuzzy' };
  return null;
}

/* ── trades ────────────────────────────────────────────────────────────── */

/** House/Senate 'P'|'S'|'E' codes and FMP type strings → the table's type. */
export function normalizeType(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (s === 'p' || s.includes('purchase') || s === 'buy') return 'purchase';
  if (s === 'e' || s.includes('exchange')) return 'exchange';
  if (s.includes('partial')) return 'sale_partial';
  if (s === 's' || s.includes('sale') || s.includes('sell')) return 'sale';
  return null;
}

/** '$1,001 - $15,000' | '$50,000,000 +' → { min, max } (max null when open-ended). */
export function parseBand(raw) {
  const s = String(raw || '');
  const nums = (s.match(/[\d,]+/g) || [])
    .map((x) => Number(x.replace(/,/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!nums.length) return { min: null, max: null };
  if (nums.length >= 2 && !/\+\s*$/.test(s)) return { min: nums[0], max: nums[1] };
  return { min: nums[0], max: /\+\s*$/.test(s) ? null : nums[0] };
}

const isoDate = (v) => {
  const s = String(v || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};
const numOrNull = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

export function sourceHash(r) {
  const parts = [
    r.bioguide_id,
    r.transaction_date,
    r.ticker || '',
    r.type,
    r.amount_min ?? '',
    r.amount_max ?? '',
    (r.owner || '').toLowerCase(),
  ];
  return createHash('sha256').update(parts.join('|')).digest('hex');
}

/**
 * Candidate from a public.house_trades row (+ its filing). `who` feeds the
 * matcher; `row` is the congress_trades row minus bioguide_id/source_hash.
 */
export function candidateFromHouse(ht) {
  const filing = ht.house_disclosure_filings || {};
  return {
    who: {
      first: ht.first_name,
      last: ht.last_name,
      chamber: 'house',
      state: String(ht.state_dst || filing.state_dst || '').slice(0, 2) || null,
    },
    row: {
      chamber: 'house',
      transaction_date: isoDate(ht.tx_date),
      disclosure_date: isoDate(ht.notification_date) || isoDate(filing.filing_date),
      ticker: ht.ticker ? String(ht.ticker).toUpperCase() : null,
      asset_name: ht.asset_name || null,
      type: normalizeType(ht.tx_type),
      amount_min: numOrNull(ht.amount_low),
      amount_max: numOrNull(ht.amount_high),
      owner: null,
      source: 'house_clerk',
      source_url: filing.pdf_url || null,
    },
  };
}

export function candidateFromSenate(st) {
  const filing = st.senate_disclosure_filings || {};
  return {
    who: {
      first: st.first_name,
      last: st.last_name,
      chamber: 'senate',
      state: st.state || filing.state || null,
    },
    row: {
      chamber: 'senate',
      transaction_date: isoDate(st.tx_date),
      disclosure_date: isoDate(st.notification_date) || isoDate(filing.filing_date),
      ticker: st.ticker ? String(st.ticker).toUpperCase() : null,
      asset_name: st.asset_name || null,
      type: normalizeType(st.tx_type),
      amount_min: numOrNull(st.amount_low),
      amount_max: numOrNull(st.amount_high),
      owner: null,
      source: 'senate_efd',
      source_url: filing.report_url || null,
    },
  };
}

/** Candidate from a raw FMP senate-latest / house-latest row. */
export function candidateFromFmp(raw, chamber) {
  const band = parseBand(raw.amount);
  const districtRaw = raw.district || raw.state || '';
  const bioguide = raw.senateID || raw.houseID || raw.bioguideId || raw.bioguideID || null;
  return {
    bioguideHint: bioguide,
    who: {
      first: raw.firstName,
      last: raw.lastName,
      full: [raw.firstName, raw.lastName].filter(Boolean).join(' ') || raw.office || '',
      chamber,
      state: /^[A-Za-z]{2}/.test(districtRaw) ? districtRaw.slice(0, 2).toUpperCase() : null,
    },
    row: {
      chamber,
      transaction_date: isoDate(raw.transactionDate),
      disclosure_date: isoDate(raw.disclosureDate),
      ticker: raw.symbol ? String(raw.symbol).toUpperCase() : null,
      asset_name: raw.assetDescription || null,
      type: normalizeType(raw.type),
      amount_min: band.min,
      amount_max: band.max,
      owner: raw.owner || null,
      source: 'fmp',
      source_url: raw.link || null,
    },
  };
}

/**
 * Resolve candidates into insertable rows. Pure.
 * @returns {{ rows: object[], unmatched: Map<string, object>, skipped: number, matchedBy: object }}
 */
export function resolveCandidates(candidates, index, knownIds) {
  const rows = [];
  const unmatched = new Map();
  const matchedBy = { bioguide: 0, last_state: 0, exact: 0, fuzzy: 0 };
  const seen = new Set();
  let skipped = 0;
  /* A trade dated after today, or after the day it was disclosed, is a
     parser misread (house_trades holds rows dated as late as 2027-12-15,
     mostly untickered lines with no notification date). Landing them would
     put a future "last trade" on a member's row and float them to the top
     of Latest trade, so they are skipped, not repaired. One day of grace
     covers time-zone edges. */
  const latestOk = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  for (const c of candidates) {
    if (!c.row.transaction_date || !c.row.type) {
      skipped += 1;
      continue;
    }
    if (
      c.row.transaction_date > latestOk ||
      (c.row.disclosure_date && c.row.transaction_date > c.row.disclosure_date)
    ) {
      skipped += 1;
      continue;
    }
    let id = null;
    if (c.bioguideHint && knownIds.has(c.bioguideHint)) {
      id = c.bioguideHint;
      matchedBy.bioguide += 1;
    } else {
      const hit = matchMember(index, c.who);
      if (hit) {
        id = hit.member.bioguide_id;
        matchedBy[hit.how] += 1;
      }
    }
    if (!id) {
      const name = c.who.full || `${c.who.first || ''} ${c.who.last || ''}`.trim();
      const k = `${c.row.source}|${c.who.chamber}|${cleanName(name)}|${c.who.state || ''}`;
      const u = unmatched.get(k) || {
        source: c.row.source,
        chamber: c.who.chamber,
        name,
        state: c.who.state || null,
        rows: 0,
      };
      u.rows += 1;
      unmatched.set(k, u);
      continue;
    }
    const row = { ...c.row, bioguide_id: id };
    row.source_hash = sourceHash(row);
    if (seen.has(row.source_hash)) continue;
    seen.add(row.source_hash);
    rows.push(row);
  }
  return { rows, unmatched, skipped, matchedBy };
}

/* ── orchestration ─────────────────────────────────────────────────────── */

async function pageAll(db, table, select, sinceCol, since, log) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from(table)
      .select(select)
      .gte(sinceCol, since)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      log(`[congress-ingest] ${table}: ${error.message}`);
      return { rows: out, error: error.message };
    }
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return { rows: out, error: null };
}

async function fetchFmp(fetchImpl, key, chamber, maxPages) {
  const endpoint = chamber === 'senate' ? 'senate-latest' : 'house-latest';
  const rows = [];
  let status = 200;
  for (let page = 0; page < maxPages; page += 1) {
    const url = `${FMP_BASE}/${endpoint}?page=${page}&limit=${FMP_PAGE_LIMIT}&apikey=${encodeURIComponent(key)}`;
    let res;
    try {
      res = await fetchImpl(url, { cache: 'no-store' });
    } catch {
      status = 0;
      break;
    }
    if (!res.ok) {
      status = res.status;
      break;
    }
    const data = await res.json().catch(() => []);
    if (!Array.isArray(data) || !data.length) break;
    rows.push(...data);
    if (data.length < FMP_PAGE_LIMIT) break;
  }
  return { rows, status };
}

/**
 * Run the ingest. Idempotent; safe to re-run.
 * @param {object} opts
 * @param {object} opts.db  Supabase service-role client.
 * @param {Function} [opts.fetchImpl]
 * @param {object[]} [opts.fallbackLegislators]  vendored copy for when the fetch fails.
 * @param {string} [opts.fmpKey]
 * @param {boolean} [opts.fmpEnabled]
 * @param {'all'|'house'|'senate'} [opts.chamber]  limit the trade sources.
 * @param {number} [opts.windowDays]
 * @param {number} [opts.fmpPages]
 * @param {boolean} [opts.skipMembers]
 */
export async function runCongressIngest({
  db,
  fetchImpl = fetch,
  fallbackLegislators = [],
  fmpKey = '',
  fmpEnabled = true,
  chamber = 'all',
  windowDays = 400,
  fmpPages = 10,
  skipMembers = false,
  log = console.log,
}) {
  const summary = {
    members: { source: null, upserted: 0, leftOffice: 0 },
    sources: {},
    candidates: 0,
    inserted: 0,
    duplicates: 0,
    skipped: 0,
    unmatched: 0,
    unmatchedNames: 0,
    matchedBy: null,
    warnings: [],
    errors: [],
  };

  /* 1. members */
  let list = null;
  try {
    const res = await fetchImpl(LEGISLATORS_URL, { cache: 'no-store' });
    if (res.ok) list = await res.json();
    else summary.warnings.push(`legislators HTTP ${res.status}; used the vendored copy`);
  } catch (err) {
    summary.warnings.push(`legislators: ${err?.message}; used the vendored copy`);
  }
  summary.members.source = list ? 'unitedstates' : 'vendored';
  const members = legislatorsToMembers(list || fallbackLegislators);
  if (!members.length) throw new Error('no legislators to ingest');

  if (!skipMembers) {
    /* Keep a portrait already mirrored to Storage; everyone else points at
       the public-domain image set until the photo pass mirrors them. */
    const existing = new Map();
    const { data: prior } = await db.from('congress_members').select('bioguide_id, photo_url');
    for (const p of prior || []) existing.set(p.bioguide_id, p.photo_url);
    const rows = members.map((m) => {
      const prev = existing.get(m.bioguide_id);
      const keep = prev && prev.includes(`/${PHOTO_BUCKET}/`) ? prev : null;
      return memberRow(m, keep);
    });
    for (let i = 0; i < rows.length; i += WRITE_BATCH) {
      const { error } = await db
        .from('congress_members')
        .upsert(rows.slice(i, i + WRITE_BATCH), { onConflict: 'bioguide_id' });
      if (error) throw new Error(`congress_members upsert: ${error.message}`);
    }
    summary.members.upserted = rows.length;
    const current = new Set(rows.map((r) => r.bioguide_id));
    const gone = [...existing.keys()].filter((id) => !current.has(id));
    if (gone.length) {
      const { error } = await db
        .from('congress_members')
        .update({ in_office: false, updated_at: new Date().toISOString() })
        .in('bioguide_id', gone);
      if (error) summary.errors.push(`in_office update: ${error.message}`);
      else summary.members.leftOffice = gone.length;
    }
  }

  /* Trades may only reference members in the table; former members already
     there (in_office = false) still match by id. */
  const { data: known } = await db.from('congress_members').select('bioguide_id');
  const knownIds = new Set((known || []).map((k) => k.bioguide_id));
  const index = buildMemberIndex(members.filter((m) => knownIds.has(m.bioguide_id)));

  /* 2. trade candidates */
  const since = new Date(Date.now() - windowDays * 86400000).toISOString().slice(0, 10);
  const candidates = [];
  const wantHouse = chamber === 'all' || chamber === 'house';
  const wantSenate = chamber === 'all' || chamber === 'senate';

  if (wantHouse) {
    const r = await pageAll(
      db,
      'house_trades',
      'id, first_name, last_name, state_dst, ticker, asset_name, tx_type, tx_date, notification_date, amount_low, amount_high, house_disclosure_filings(pdf_url, filing_date, state_dst)',
      'tx_date',
      since,
      log,
    );
    summary.sources.house_clerk = { rows: r.rows.length, error: r.error };
    for (const ht of r.rows) candidates.push(candidateFromHouse(ht));
  }
  if (wantSenate) {
    const r = await pageAll(
      db,
      'senate_trades',
      'id, first_name, last_name, state, ticker, asset_name, tx_type, tx_date, notification_date, amount_low, amount_high, senate_disclosure_filings(report_url, filing_date, state)',
      'tx_date',
      since,
      log,
    );
    summary.sources.senate_efd = { rows: r.rows.length, error: r.error };
    for (const st of r.rows) candidates.push(candidateFromSenate(st));
  }
  if (fmpEnabled && fmpKey) {
    for (const ch of ['senate', 'house']) {
      if ((ch === 'house' && !wantHouse) || (ch === 'senate' && !wantSenate)) continue;
      const r = await fetchFmp(fetchImpl, fmpKey, ch, fmpPages);
      summary.sources[`fmp_${ch}`] = { rows: r.rows.length, status: r.status };
      for (const raw of r.rows) {
        const c = candidateFromFmp(raw, ch);
        if (c.row.transaction_date && c.row.transaction_date >= since) candidates.push(c);
      }
    }
    const failed = ['fmp_senate', 'fmp_house'].filter(
      (k) => summary.sources[k] && summary.sources[k].status !== 200,
    );
    if (failed.length) {
      const detail = Object.fromEntries(failed.map((k) => [k, summary.sources[k].status]));
      log(`[congress-ingest] FMP upstream ${JSON.stringify(detail)}`);
      await db.from('congress_ingest_issues').insert({ kind: 'upstream_error', detail });
    }
  } else {
    summary.sources.fmp = { skipped: fmpEnabled ? 'no key' : 'FMP_CONGRESS_ENABLED=false' };
  }
  summary.candidates = candidates.length;

  /* 3. resolve + write */
  const { rows, unmatched, skipped, matchedBy } = resolveCandidates(candidates, index, knownIds);
  summary.skipped = skipped;
  summary.matchedBy = matchedBy;
  summary.unmatchedNames = unmatched.size;
  summary.unmatched = [...unmatched.values()].reduce((s, u) => s + u.rows, 0);

  for (let i = 0; i < rows.length; i += WRITE_BATCH) {
    const batch = rows.slice(i, i + WRITE_BATCH);
    const { data, error } = await db
      .from('congress_trades')
      .upsert(batch, { onConflict: 'source_hash', ignoreDuplicates: true })
      .select('id');
    if (error) {
      summary.errors.push(`congress_trades upsert: ${error.message}`);
      break;
    }
    summary.inserted += data?.length || 0;
    summary.duplicates += batch.length - (data?.length || 0);
  }

  if (unmatched.size) {
    const issues = [...unmatched.values()]
      .sort((a, b) => b.rows - a.rows)
      .slice(0, 200)
      .map((detail) => ({ kind: 'unmatched_member', detail }));
    const { error } = await db.from('congress_ingest_issues').insert(issues);
    if (error) summary.errors.push(`issues insert: ${error.message}`);
  }

  log(
    `[congress-ingest] candidates ${summary.candidates} · inserted ${summary.inserted} · ` +
      `duplicates ${summary.duplicates} · skipped ${summary.skipped} · ` +
      `unmatched ${summary.unmatched} rows / ${summary.unmatchedNames} names`,
  );
  return summary;
}

/**
 * Mirror portraits into the public Storage bucket, a bounded number per run.
 * Members whose upstream image 404s on both sources are left as they are
 * (the avatar falls back to initials).
 */
export async function mirrorPhotos({ db, fetchImpl = fetch, max = 80, log = console.log }) {
  const { data: rows, error } = await db
    .from('congress_members')
    .select('bioguide_id, photo_url')
    .eq('in_office', true)
    .order('bioguide_id');
  if (error) throw new Error(`congress_members read: ${error.message}`);
  const todo = (rows || []).filter((r) => !String(r.photo_url || '').includes(`/${PHOTO_BUCKET}/`));
  const out = { pending: todo.length, mirrored: 0, missing: 0, errors: 0 };
  for (const r of todo.slice(0, max)) {
    let buf = null;
    for (const src of [photoUrlFor(r.bioguide_id), `${BIOGUIDE_PHOTO_BASE}/${r.bioguide_id}.jpg`]) {
      try {
        const res = await fetchImpl(src, { cache: 'no-store' });
        const type = res.headers.get('content-type') || '';
        if (res.ok && type.startsWith('image/')) {
          buf = Buffer.from(await res.arrayBuffer());
          break;
        }
      } catch {
        /* try the next source */
      }
    }
    if (!buf) {
      out.missing += 1;
      continue;
    }
    const path = `${r.bioguide_id}.jpg`;
    const { error: upErr } = await db.storage
      .from(PHOTO_BUCKET)
      .upload(path, buf, { contentType: 'image/jpeg', upsert: true });
    if (upErr) {
      out.errors += 1;
      continue;
    }
    const { data: pub } = db.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    await db
      .from('congress_members')
      .update({ photo_url: pub.publicUrl })
      .eq('bioguide_id', r.bioguide_id);
    out.mirrored += 1;
  }
  out.pending -= out.mirrored;
  log(`[congress-photos] mirrored ${out.mirrored} · missing ${out.missing} · left ${out.pending}`);
  return out;
}
