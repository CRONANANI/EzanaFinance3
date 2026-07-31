/**
 * Ezana Sonar — entitlement matrix (the single source of truth for "what can this
 * user do in Sonar"). Capabilities are derived from plan tier × version so that
 * datasets, synthesis depth, daily quota, exports, and user-lookup are all gated
 * in ONE place, enforced server-side before any dataset is touched.
 *
 * Sonar is a research/intelligence surface — it cross-references Ezana's datasets
 * and returns a cited briefing. (Never described as "AGI" anywhere user-facing.)
 */

/**
 * Registry of every dataset Sonar can search, with a display label and the
 * source it cites. Used to render the "what Sonar searched" manifest and to show
 * which datasets a user's plan gates out (the upgrade surface).
 */
export const SONAR_DATASETS = {
  echo: { id: 'echo', label: 'Ezana Echo archive', source: 'Echo editorial' },
  congress: { id: 'congress', label: 'Congressional trading', source: 'House/Senate disclosures' },
  'gov-contracts': {
    id: 'gov-contracts',
    label: 'Government contracts',
    source: 'USAspending.gov',
  },
  'prediction-markets': {
    id: 'prediction-markets',
    label: 'Prediction markets',
    source: 'Market odds',
  },
  'sec-filings': { id: 'sec-filings', label: 'SEC filings', source: 'EDGAR' },
  '13f': { id: '13f', label: '13F institutional holdings', source: 'SEC 13F' },
  lobbying: { id: 'lobbying', label: 'Lobbying disclosures', source: 'Senate LDA' },
  'org-internal': {
    id: 'org-internal',
    label: 'Your council (internal)',
    source: 'Org — members only',
  },
  'partner-analytics': {
    id: 'partner-analytics',
    label: 'Partner analytics',
    source: 'Partner scope',
  },
};

/** Every dataset id, in display order. */
export const ALL_DATASET_IDS = Object.keys(SONAR_DATASETS);

/**
 * Returns the Sonar capabilities for a given user context.
 *
 * @param {object} ctx
 * @param {number} ctx.planTier  0 (free) … 4 (professional), from getPlanTier()
 * @param {'regular'|'partner'|'org'} ctx.version
 * @param {boolean} [ctx.isPartner]
 * @param {string|null} [ctx.orgRole]
 * @returns {{ datasets: string[], depth: 'summary'|'standard'|'deep', dailyQueries: number,
 *   exportsEnabled: boolean, userLookup: boolean, savedReports: number,
 *   webSearch: { enabled: boolean, maxUses: number }, planTier: number,
 *   version: string, orgRole: string|null }}
 */
export function getSonarEntitlements({ planTier = 0, version = 'regular', isPartner = false, orgRole = null } = {}) {
  // Free tier — the public-ish datasets, shallow synthesis, small quota, and light
  // live web search (Anthropic's native tool is billed PER SEARCH on top of tokens,
  // so `maxUses` is a real cost control — it rises with plan so cost tracks revenue).
  const base = {
    datasets: ['echo', 'congress', 'gov-contracts'],
    depth: 'summary', // summary | standard | deep
    dailyQueries: 5,
    exportsEnabled: false,
    userLookup: false, // can you Sonar another *user*?
    savedReports: 0,
    webSearch: { enabled: true, maxUses: 2 }, // light web search even on free
  };

  // Plan tiers unlock datasets + depth + quota (+ exports/saved reports/web depth).
  if (planTier >= 1) {
    base.depth = 'standard';
    base.dailyQueries = 30;
    base.datasets = [...base.datasets, 'prediction-markets', 'sec-filings'];
    base.webSearch = { enabled: true, maxUses: 4 };
  }
  if (planTier >= 2) {
    base.depth = 'deep';
    base.dailyQueries = 100;
    base.exportsEnabled = true;
    base.savedReports = 25;
    base.datasets = [...base.datasets, '13f', 'lobbying'];
    base.webSearch = { enabled: true, maxUses: 6 };
  }
  if (planTier >= 4) {
    base.dailyQueries = 500;
    base.savedReports = 200;
    base.webSearch = { enabled: true, maxUses: 8 };
  }

  // Version scopes (additive, and never cross-tenant — org data stays in-org and
  // is enforced by the existing org RLS at query time).
  if (version === 'org') {
    base.datasets = [...base.datasets, 'org-internal'];
    base.userLookup = true; // within their own org only
  }
  if (version === 'partner' || isPartner) {
    base.datasets = [...base.datasets, 'partner-analytics'];
    base.exportsEnabled = true;
  }

  // De-dupe while preserving order.
  base.datasets = ALL_DATASET_IDS.filter((id) => base.datasets.includes(id));

  return { ...base, planTier, version, orgRole: orgRole || null };
}

/**
 * Split the full dataset registry into what this user can query vs. what their
 * plan/version gates out — for the "what Sonar searched" manifest and the
 * upgrade prompt. Org/partner-only sets are only "locked" for users of that
 * version (a regular user never sees `org-internal` as an upsell).
 */
export function describeDatasetAccess(entitlements) {
  const entitled = new Set(entitlements.datasets);
  const versionOnly = new Set(['org-internal', 'partner-analytics']);
  const available = [];
  const locked = [];
  for (const id of ALL_DATASET_IDS) {
    const meta = SONAR_DATASETS[id];
    if (entitled.has(id)) {
      available.push(meta);
    } else if (!versionOnly.has(id)) {
      // Only surface plan-gated (not version-gated) datasets as upgrade prompts.
      locked.push(meta);
    }
  }
  return { available, locked };
}
