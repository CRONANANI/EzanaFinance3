/**
 * Sonar 6.4: verified industry universes (Nov 28 2026).
 *
 * A screen on an industry ("semiconductor companies", "banks", "defense contractors") runs
 * on companies classified into that industry, never on the broader GICS sector. The
 * classification is the SEC Standard Industrial Classification code each registrant files
 * (EDGAR submissions, stored in public.company_industry by /api/cron/sync-company-industry).
 * Defense also admits companies the contract data defines: prime awards from the
 * Department of Defense of at least DEFENSE_MIN_DOD in the latest complete federal year,
 * at least half of their federal award value.
 *
 * A sector that GICS defines exactly (energy, utilities, real estate, health care,
 * technology) keeps the GICS universe. An industry that neither SIC nor the data define
 * (solar, cybersecurity, AI) is unsupported: the screen says so and does not run.
 *
 * Pure: no I/O.
 */

export const DEFENSE_MIN_DOD = 100e6;

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i));

/**
 * id: { label, sic: string[], data?: 'dod_awards', note }
 * SIC codes from the SEC's Standard Industrial Classification list.
 */
export const INDUSTRIES = {
  semiconductors: { label: 'Semiconductors (SIC 3674)', sic: ['3674'] },
  banks: {
    label: 'Banks (SIC 6021, 6022, 6029, 6035, 6036)',
    sic: ['6021', '6022', '6029', '6035', '6036'],
  },
  defense: {
    label: 'Defense contractors',
    sic: [
      '3812',
      '3721',
      '3724',
      '3728',
      '3761',
      '3764',
      '3769',
      '3795',
      '3482',
      '3483',
      '3484',
      '3489',
    ],
    data: 'dod_awards',
    note: `SIC codes for aircraft, guided missiles, ordnance, military vehicles and defense electronics, plus companies with at least $${DEFENSE_MIN_DOD / 1e6}M of Department of Defense prime awards in the latest complete federal year making up at least half of their federal award value.`,
  },
  software: { label: 'Software (SIC 7371 to 7374)', sic: ['7371', '7372', '7373', '7374'] },
  refiners: { label: 'Petroleum refiners (SIC 2911)', sic: ['2911'] },
  oil_producers: { label: 'Oil and gas producers (SIC 1311)', sic: ['1311'] },
  oilfield_services: {
    label: 'Oilfield services and drilling (SIC 1381, 1382, 1389)',
    sic: ['1381', '1382', '1389'],
  },
  airlines: { label: 'Airlines (SIC 4512)', sic: ['4512'] },
  pharma: { label: 'Pharmaceuticals (SIC 2834)', sic: ['2834'] },
  biotech: { label: 'Biotechnology (SIC 2836, 8731)', sic: ['2836', '8731'] },
  insurers: {
    label: 'Insurers (SIC 6311, 6321, 6324, 6331, 6351, 6361, 6399, 6411)',
    sic: ['6311', '6321', '6324', '6331', '6351', '6361', '6399', '6411'],
  },
  retail: { label: 'Retailers (SIC 5200 to 5999)', sic: range(5200, 5999) },
  reits: { label: 'Real estate investment trusts (SIC 6798)', sic: ['6798'] },
};

/** Sectors GICS defines exactly: the GICS sector is the universe. */
export const GICS_EXACT = {
  energy: 'Energy',
  utilities: 'Utilities',
  real_estate: 'Real Estate',
  healthcare: 'Health Care',
  technology: 'Information Technology',
};

/* The semantic layer's universe ids (compositional.js SECTORS) to industries. */
const ALIAS = {
  semiconductors: 'semiconductors',
  banks: 'banks',
  defense: 'defense',
  software: 'software',
  airlines: 'airlines',
  retail: 'retail',
  refiners: 'refiners',
  oil_producers: 'oil_producers',
  oilfield_services: 'oilfield_services',
  pharma: 'pharma',
  biotech: 'biotech',
  insurers: 'insurers',
  reits: 'reits',
};

/**
 * How a universe id is established.
 * @returns {{ kind: 'gics', sector } | { kind: 'industry', id, def } | { kind: 'unsupported', reason }}
 */
export function universeFor(id) {
  if (!id) return { kind: 'unsupported', reason: 'No universe was named.' };
  if (GICS_EXACT[id]) return { kind: 'gics', sector: GICS_EXACT[id] };
  const key = ALIAS[id];
  if (key && INDUSTRIES[key]) return { kind: 'industry', id: key, def: INDUSTRIES[key] };
  return {
    kind: 'unsupported',
    reason: `Ezana has no verified classification for "${String(id).replace(/_/g, ' ')}" companies, so that universe cannot be established; Sonar does not substitute a broader sector.`,
  };
}

/** Tickers in an industry from classification rows ({ ticker, sic }). */
export function industryMembers(def, rows = []) {
  const codes = new Set(def.sic || []);
  return [
    ...new Set(
      rows
        .filter((r) => r?.ticker && codes.has(String(r.sic || '').trim()))
        .map((r) => String(r.ticker).toUpperCase()),
    ),
  ];
}

/**
 * Companies the contract data defines as defense contractors.
 * @param {Array<{ticker, awarding_agency, total_amount}>} rows one federal fiscal year
 */
export function dodDefined(rows = [], { min = DEFENSE_MIN_DOD } = {}) {
  const by = {};
  for (const r of rows) {
    const t = String(r.ticker || '').toUpperCase();
    if (!t) continue;
    const v = Number(r.total_amount) || 0;
    by[t] ||= { dod: 0, all: 0 };
    by[t].all += v;
    if (/department of defense/i.test(String(r.awarding_agency || ''))) by[t].dod += v;
  }
  return Object.entries(by)
    .filter(([, x]) => x.dod >= min && x.all > 0 && x.dod / x.all >= 0.5)
    .map(([t]) => t);
}
