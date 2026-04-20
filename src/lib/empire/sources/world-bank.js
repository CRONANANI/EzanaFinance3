/**
 * @fileoverview
 * World Bank Indicators API fetcher. Source #1 for the Empire Rankings
 * scoring backbone; implements the shared `SourceFetcher` interface from
 * `./types.js`.
 *
 * API basics:
 *   • Endpoint: https://api.worldbank.org/v2/country/{codes}/indicator/{id}
 *   • Accepts semicolon-joined ISO-3 codes, returns [ metadata, [ obs... ] ].
 *   • Paginated: metadata.pages tells us how many pages exist — we walk them
 *     so long windows (e.g. 25y × 60 countries) don't silently truncate.
 *   • Rate: the public API is free-tier; we sleep 150ms between indicator
 *     calls and 120ms between pages to stay comfortably under their
 *     informal cap. Weekly-cadence sync keeps total volume small.
 *
 * Adding a new World Bank metric = add a row to METRIC_REGISTRY here AND a
 * row to `dimension_metric_map` in the database. No other code changes.
 */

/** @typedef {import('./types.js').SourceFetcher} SourceFetcher */
/** @typedef {import('./types.js').FetchRequest} FetchRequest */
/** @typedef {import('./types.js').FetchedObservation} FetchedObservation */
/** @typedef {import('./types.js').MetricRegistryEntry} MetricRegistryEntry */

const WB_BASE = 'https://api.worldbank.org/v2';
const PER_PAGE = 32500;

// Inter-request delays are defensive, not mandated — the WB API has no
// published rate limit but friendliness costs us nothing on a weekly cron.
const INDICATOR_DELAY_MS = 150;
const PAGE_DELAY_MS = 120;

/** @type {Record<string, MetricRegistryEntry>} */
const METRIC_REGISTRY = {
  // ─── Economic Output ───────────────────────────────────────────────
  gdp_current_usd: { seriesId: 'NY.GDP.MKTP.CD', unit: 'USD' },
  gdp_ppp_current: { seriesId: 'NY.GDP.MKTP.PP.CD', unit: 'USD' },
  gdp_per_capita_ppp: { seriesId: 'NY.GDP.PCAP.PP.CD', unit: 'USD' },

  // ─── Growth ────────────────────────────────────────────────────────
  gdp_growth_annual: { seriesId: 'NY.GDP.MKTP.KD.ZG', unit: 'percent' },

  // ─── Debt ──────────────────────────────────────────────────────────
  central_gov_debt_pct_gdp: { seriesId: 'GC.DOD.TOTL.GD.ZS', unit: 'percent' },
  external_debt_stocks_pct_gni: { seriesId: 'DT.DOD.DECT.GN.ZS', unit: 'percent' },

  // ─── Trade ─────────────────────────────────────────────────────────
  exports_pct_gdp: { seriesId: 'NE.EXP.GNFS.ZS', unit: 'percent' },
  merchandise_exports_usd: { seriesId: 'TX.VAL.MRCH.CD.WT', unit: 'USD' },

  // ─── Education ─────────────────────────────────────────────────────
  school_enrollment_tertiary: { seriesId: 'SE.TER.ENRR', unit: 'percent' },
  adult_literacy_rate: { seriesId: 'SE.ADT.LITR.ZS', unit: 'percent' },
  expenditure_on_education_pct_gdp: { seriesId: 'SE.XPD.TOTL.GD.ZS', unit: 'percent' },

  // ─── Innovation & Technology ───────────────────────────────────────
  rd_expenditure_pct_gdp: { seriesId: 'GB.XPD.RSDV.GD.ZS', unit: 'percent' },
  researchers_per_million: { seriesId: 'SP.POP.SCIE.RD.P6', unit: 'per_million' },
  high_tech_exports_pct: { seriesId: 'TX.VAL.TECH.MF.ZS', unit: 'percent' },

  // ─── Infrastructure ────────────────────────────────────────────────
  access_to_electricity: { seriesId: 'EG.ELC.ACCS.ZS', unit: 'percent' },
  internet_users_pct: { seriesId: 'IT.NET.USER.ZS', unit: 'percent' },
  mobile_subscriptions_per_100: { seriesId: 'IT.CEL.SETS.P2', unit: 'per_100' },

  // ─── Military Strength (baseline; SIPRI will augment later) ────────
  military_expenditure_pct_gdp: { seriesId: 'MS.MIL.XPND.GD.ZS', unit: 'percent' },
  armed_forces_personnel: { seriesId: 'MS.MIL.TOTL.P1', unit: 'count' },

  // ─── Wealth Gaps ───────────────────────────────────────────────────
  gini_index: { seriesId: 'SI.POV.GINI', unit: 'index' },

  // ─── Cost Competition (proxy stack) ────────────────────────────────
  labor_force_participation: { seriesId: 'SL.TLF.CACT.ZS', unit: 'percent' },
  inflation_cpi: { seriesId: 'FP.CPI.TOTL.ZG', unit: 'percent' },

  // ─── Resource Efficiency ───────────────────────────────────────────
  energy_use_per_gdp: { seriesId: 'EG.USE.COMM.GD.PP.KD', unit: 'kg_oil_per_gdp' },
  co2_emissions_per_gdp: { seriesId: 'EN.ATM.CO2E.PP.GD', unit: 'kg_per_gdp' },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Walk a paginated WB Indicators API response. Returns the concatenated
 * observation array across all pages.
 *
 * @param {string} baseUrl URL without `&page=` — we append it here.
 * @returns {Promise<Array<Record<string, any>>>}
 */
async function fetchAllPages(baseUrl) {
  /** @type {Array<Record<string, any>>} */
  const all = [];
  let page = 1;
  let totalPages = 1;

  // The WB Indicators API always returns [ meta, data ]. `meta.pages` tells
  // us how many total pages exist; we walk them in order.
  do {
    const url = `${baseUrl}&page=${page}`;
    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      // Tag this for Next.js's fetch cache — these are weekly-refresh
      // datasets, so a 1-day revalidate is fine even if multiple dev hits
      // happen in a row.
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      console.warn(`[world_bank] ${res.status} for ${url}`);
      return all;
    }

    let body;
    try {
      body = await res.json();
    } catch (err) {
      console.warn('[world_bank] non-JSON response:', err);
      return all;
    }

    if (!Array.isArray(body) || body.length < 2) return all;
    const [meta, rows] = body;
    if (!Array.isArray(rows)) return all;

    all.push(...rows);
    totalPages = Number(meta?.pages ?? 1);
    page += 1;
    if (page <= totalPages) await sleep(PAGE_DELAY_MS);
  } while (page <= totalPages);

  return all;
}

/** @type {SourceFetcher} */
export const worldBankFetcher = {
  sourceId: 'world_bank',
  metricRegistry: METRIC_REGISTRY,

  async fetch(req) {
    /** @type {FetchedObservation[]} */
    const observations = [];

    // The WB API accepts up to ~60 countries in a single URL path joined by
    // ';'. Our catalog is 60 → well within limits for a single call per
    // indicator.
    const countryParam = req.iso3List.join(';');
    const dateRange = `${req.yearStart}:${req.yearEnd}`;

    for (const metricId of req.metricIds) {
      const meta = METRIC_REGISTRY[metricId];
      if (!meta) {
        console.warn(`[world_bank] unknown metric_id '${metricId}' — skipping`);
        continue;
      }

      const baseUrl =
        `${WB_BASE}/country/${countryParam}/indicator/${meta.seriesId}` +
        `?date=${dateRange}&format=json&per_page=${PER_PAGE}`;

      try {
        const rows = await fetchAllPages(baseUrl);
        for (const obs of rows) {
          if (obs?.value == null) continue;
          const iso3 = obs.countryiso3code || obs.country?.id || '';
          if (!iso3 || iso3.length !== 3) continue;
          const year = Number.parseInt(obs.date, 10);
          if (!Number.isFinite(year)) continue;
          observations.push({
            countryIso3: iso3,
            metricId,
            year,
            rawValue: Number(obs.value),
            unit: meta.unit,
            sourceSeriesId: meta.seriesId,
          });
        }
      } catch (err) {
        console.error(`[world_bank] fetch failed for ${meta.seriesId}:`, err);
      }

      // Gentle inter-indicator pacing.
      await sleep(INDICATOR_DELAY_MS);
    }

    return observations;
  },
};
