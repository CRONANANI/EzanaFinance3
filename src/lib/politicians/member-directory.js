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
 */
export const DIRECTORY = {
  T000278: { fullName: 'Tommy Tuberville', party: 'R', chamber: 'Senate', state: 'AL' },
  P000197: { fullName: 'Nancy Pelosi', party: 'D', chamber: 'House', state: 'CA' },
  C001120: { fullName: 'Dan Crenshaw', party: 'R', chamber: 'House', state: 'TX' },
  G000583: { fullName: 'Josh Gottheimer', party: 'D', chamber: 'House', state: 'NJ' },
  H001077: { fullName: 'John Hickenlooper', party: 'D', chamber: 'Senate', state: 'CO' },
  C001047: { fullName: 'Shelley Moore Capito', party: 'R', chamber: 'Senate', state: 'WV' },
};

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
