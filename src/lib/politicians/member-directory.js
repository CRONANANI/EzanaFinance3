/**
 * Member directory: attaches party (and authoritative chamber/state) to a
 * canonical trade, and supplies every current member to the FEC and committee
 * joins.
 *
 * Source of truth: the public-domain unitedstates/congress-legislators dataset,
 * vendored as `legislators-current.json` (bioguide, name, party, chamber,
 * state, district, FEC IDs) and refreshed by scripts/vendor-legislators.mjs.
 * The small DIRECTORY seed below only covers members missing from that file.
 * Unknown members render a neutral party, never a guessed one.
 *
 * Enrichment priority: vendored-by-bioguideId, seed, name match, FMP partyHint
 * (real when present), then null (neutral "?").
 */

import LEGISLATORS from './legislators-current.json';

const normName = (n) =>
  (n || '')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .trim();

/** party string → 'D' | 'R' | 'I' | null */
export function normalizeParty(p) {
  const s = String(p || '').toLowerCase();
  if (!s) return null;
  if (s.startsWith('d') || s.includes('democrat')) return 'D';
  if (s.startsWith('r') || s.includes('republican')) return 'R';
  if (s.startsWith('i') || s.includes('independent')) return 'I';
  return null;
}

/**
 * Seed directory (keyed by BioGuideID) for members MISSING from the vendored
 * legislators file only. The vendored record always wins: it carries the
 * `id.fec` list and the authoritative name, chamber, state and party.
 *
 * Oct 2026 audit: all six former seed entries were already in the vendored
 * file, and two were wrong (H001077 is Clay Higgins, House LA-3, not John
 * Hickenlooper, who is H000273; Tuberville's FEC ID is S0AL00230, not
 * S0AL00214). They were removed. Add an entry here only for someone the
 * vendored file does not know.
 */
export const DIRECTORY = {};

function vendoredMember(bioguideId) {
  return (bioguideId && V_BY_ID.get(bioguideId)) || null;
}

function seedMember(bioguideId) {
  const m = bioguideId && DIRECTORY[bioguideId];
  return m ? { bioguideId, district: null, fecIds: [], ...m } : null;
}

/**
 * FEC candidate IDs filed by a member: the vendored `fecIds` when the member is
 * in the vendored file, else the seed's. May be empty; callers then fall back
 * to the cached name+state candidate search.
 * @returns {string[]}
 */
export function fecIdsForMember(bioguideId) {
  const m = vendoredMember(bioguideId) || seedMember(bioguideId);
  return Array.isArray(m?.fecIds) ? m.fecIds : [];
}

/** Member by bioguideId -> { bioguideId, fullName, party, chamber, state, district, fecIds }. */
export function memberByBioguide(bioguideId) {
  return vendoredMember(bioguideId) || seedMember(bioguideId);
}

/** Every current member of Congress (vendored set, plus any seed-only entries). */
export function allCurrentMembers() {
  const out = [...V_BY_ID.values()];
  for (const id of Object.keys(DIRECTORY)) if (!V_BY_ID.has(id)) out.push(seedMember(id));
  return out;
}

// Secondary index by normalized name (built from the seed above).
const BY_NAME = Object.entries(DIRECTORY).reduce((acc, [bioguideId, m]) => {
  acc[normName(m.fullName)] = { bioguideId, ...m };
  return acc;
}, {});

/* Vendored index over the public-domain legislators set
   (legislators-current.json, refreshed by scripts/vendor-legislators.mjs).
   The hand seed (DIRECTORY) still wins; this only fills what the seed does
   not know. */
const SUFFIX = /\b(jr|sr|ii|iii|iv)\b/g;
const cleanName = (n) =>
  normName(n)
    .replace(SUFFIX, '')
    .replace(/\b[a-z]\b/g, '') // middle initials
    .replace(/\s+/g, ' ')
    .trim();

const V_BY_ID = new Map();
const V_BY_NAME = new Map();
const V_LAST_STATE = new Map(); // `${last}|${state}` -> entry, or null when ambiguous
for (const l of LEGISLATORS) {
  const entry = {
    bioguideId: l.bioguide,
    fullName: l.full,
    party: l.party,
    chamber: l.chamber,
    state: l.state,
    district: l.district ?? null,
    fecIds: Array.isArray(l.fecIds) ? l.fecIds : [],
  };
  V_BY_ID.set(l.bioguide, entry);
  for (const n of [l.full, `${l.first} ${l.last}`, l.nick ? `${l.nick} ${l.last}` : null]) {
    if (n) V_BY_NAME.set(cleanName(n), entry);
  }
  const ls = `${cleanName(l.last)}|${l.state}`;
  V_LAST_STATE.set(ls, V_LAST_STATE.has(ls) ? null : entry);
}

function vendoredLookup(trade) {
  if (trade.bioguideId && V_BY_ID.has(trade.bioguideId)) return V_BY_ID.get(trade.bioguideId);
  const byName = V_BY_NAME.get(cleanName(trade.name));
  if (byName) return byName;
  const last = cleanName(trade.name).split(' ').pop();
  if (last && trade.state) return V_LAST_STATE.get(`${last}|${trade.state}`) || null;
  return null;
}

/**
 * Attach party/chamber/state to a canonical trade (from normalizeFmpTrade).
 * Never guesses party — unknown → party: null (UI renders a neutral gray "?").
 * @returns the same trade with { party, partySource } and authoritative
 *   chamber/state filled in when the directory knows better.
 */
export function enrichTrade(trade) {
  let dir = null;
  let partySource = null;

  if (trade.bioguideId && V_BY_ID.has(trade.bioguideId)) {
    dir = V_BY_ID.get(trade.bioguideId);
    partySource = 'directory';
  } else if (trade.bioguideId && DIRECTORY[trade.bioguideId]) {
    dir = { bioguideId: trade.bioguideId, ...DIRECTORY[trade.bioguideId] };
    partySource = 'directory';
  } else if (trade.name && BY_NAME[normName(trade.name)]) {
    dir = BY_NAME[normName(trade.name)];
    partySource = 'directory';
  } else {
    dir = vendoredLookup(trade);
    if (dir) partySource = 'directory';
  }

  let party = dir?.party ?? null;
  if (!party) {
    const hint = normalizeParty(trade.partyHint);
    if (hint) {
      party = hint;
      partySource = 'fmp';
    }
  }

  return {
    ...trade,
    bioguideId: trade.bioguideId || dir?.bioguideId || null,
    party, // 'D' | 'R' | 'I' | null
    partySource, // 'directory' | 'fmp' | null
    chamber: trade.chamber || dir?.chamber || null,
    state: trade.state || dir?.state || null,
  };
}

/** Count of current members known (for a "Members tracked" reference). */
export const DIRECTORY_SIZE = allCurrentMembers().length;
