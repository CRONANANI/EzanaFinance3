/**
 * Member directory — attaches PARTY (and authoritative chamber/state) to a
 * canonical trade, since FMP's trade rows don't reliably carry party.
 *
 * Source of truth: the public-domain unitedstates/congress-legislators dataset
 * (`legislators-current.json` — bioguide, party, chamber, state). The full set
 * should be VENDORED (a trimmed name/bioguide/party/chamber/state copy) or
 * refreshed via cron; it changes rarely. It is not vendored here yet (the build
 * sandbox can't fetch it), so this ships a seed of frequently-surfaced members
 * plus a robust fallback chain — unknown members render a NEUTRAL party (never
 * guessed). Drop the vendored JSON in and spread it into DIRECTORY to complete.
 *
 * Enrichment priority: directory-by-bioguideId → directory-by-name → FMP
 * partyHint (real when present) → null (neutral "?").
 */

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
 * Seed directory (keyed by BioGuideID). Trimmed to the fields the UI needs.
 * TODO(vendored data): replace/augment with the full legislators-current trim.
 *
 * `fecIds` mirrors the `id.fec` array in the unitedstates/congress-legislators
 * dataset (a member can have several FEC candidate IDs across cycles/offices).
 * It powers the campaign-finance (OpenFEC) join. Only a couple of well-known,
 * stable IDs are seeded here as worked examples; the rest resolve at runtime via
 * the cached `/candidates/search/` name+state fallback (see resolveFecCandidateId
 * in src/lib/fec/join.js). Dropping in the vendored JSON with `id.fec` populates
 * the full set and makes the direct join exhaustive.
 */
export const DIRECTORY = {
  T000278: {
    fullName: 'Tommy Tuberville',
    party: 'R',
    chamber: 'Senate',
    state: 'AL',
    fecIds: ['S0AL00214'],
  },
  P000197: {
    fullName: 'Nancy Pelosi',
    party: 'D',
    chamber: 'House',
    state: 'CA',
    fecIds: ['H8CA05035'],
  },
  C001120: { fullName: 'Dan Crenshaw', party: 'R', chamber: 'House', state: 'TX', fecIds: [] },
  G000583: { fullName: 'Josh Gottheimer', party: 'D', chamber: 'House', state: 'NJ', fecIds: [] },
  H001077: {
    fullName: 'John Hickenlooper',
    party: 'D',
    chamber: 'Senate',
    state: 'CO',
    fecIds: [],
  },
  C001047: {
    fullName: 'Shelley Moore Capito',
    party: 'R',
    chamber: 'Senate',
    state: 'WV',
    fecIds: [],
  },
};

/**
 * FEC candidate IDs known for a member from the vendored directory (may be
 * empty — callers then fall back to the cached name+state candidate search).
 * @returns {string[]}
 */
export function fecIdsForMember(bioguideId) {
  const m = bioguideId && DIRECTORY[bioguideId];
  return Array.isArray(m?.fecIds) ? m.fecIds : [];
}

/** Directory lookup by bioguideId → { fullName, party, chamber, state, fecIds }. */
export function memberByBioguide(bioguideId) {
  const m = bioguideId && DIRECTORY[bioguideId];
  return m ? { bioguideId, ...m } : null;
}

/** All seeded members (used to scope cross-member FEC aggregates to Congress). */
export function allDirectoryMembers() {
  return Object.entries(DIRECTORY).map(([bioguideId, m]) => ({ bioguideId, ...m }));
}

// Secondary index by normalized name (built from the seed above).
const BY_NAME = Object.entries(DIRECTORY).reduce((acc, [bioguideId, m]) => {
  acc[normName(m.fullName)] = { bioguideId, ...m };
  return acc;
}, {});

/**
 * Attach party/chamber/state to a canonical trade (from normalizeFmpTrade).
 * Never guesses party — unknown → party: null (UI renders a neutral gray "?").
 * @returns the same trade with { party, partySource } and authoritative
 *   chamber/state filled in when the directory knows better.
 */
export function enrichTrade(trade) {
  let dir = null;
  let partySource = null;

  if (trade.bioguideId && DIRECTORY[trade.bioguideId]) {
    dir = { bioguideId: trade.bioguideId, ...DIRECTORY[trade.bioguideId] };
    partySource = 'directory';
  } else if (trade.name && BY_NAME[normName(trade.name)]) {
    dir = BY_NAME[normName(trade.name)];
    partySource = 'directory';
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

/** Count of members in the directory (for a "Members tracked" reference). */
export const DIRECTORY_SIZE = Object.keys(DIRECTORY).length;
