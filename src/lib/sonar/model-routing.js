/**
 * Sonar model routing (Nov 28 2026). Pure; tested by scripts/check-sonar-model-routing.mjs.
 *
 * One place that decides which model each Sonar role calls, so a model change is a
 * configuration change, can be benchmarked side by side, and can be rolled out behind a
 * flag instead of globally.
 *
 * Roles
 *   quick                 quick-mode synthesis
 *   standard              standard-mode synthesis (the Research Director in standard)
 *   standard_specialist   specialists in standard mode (the "fast" analyst tier)
 *   deep_director         deep-mode director synthesis (the written assessment)
 *   deep_specialist       specialists in deep mode (the "strong" analyst tier)
 *   deep_red_team         deep critical review (red team)
 *   deep_resolve          the director pass that answers the red team
 *   deep_auditor          deep methodology auditor
 *   cross_domain_director when set, replaces deep_director on a cross-domain deep run
 *   legacy_standard       the older /api/sonar/query route's standard and summary synthesis
 *   legacy_deep           the older /api/sonar/query route's deep synthesis
 *
 * Profiles
 *   current  exactly today's behaviour, including the legacy environment variables
 *            (SONAR_FAST_MODEL, SONAR_DEEP_MODEL, SONAR_LANDING_MODEL,
 *            SONAR_ANALYST_FAST_MODEL, SONAR_ANALYST_STRONG_MODEL) and the legacy route's
 *            hardcoded Sonnet 5. The production default.
 *   A        Haiku 5.5 quick and standard, Sonnet 5.5 for all of deep
 *   B        Haiku 5.5 quick, Sonnet 5.5 standard, Opus 5.5 deep director
 *   C        Haiku 5.5 quick, Sonnet 5.5 standard and deep director; Opus 5.5 for
 *            cross-domain deep synthesis and for critical review (red team, auditor)
 *
 * Selection (feature flag, all environment variables, all optional)
 *   SONAR_MODEL_PROFILE          base profile for everyone (default current)
 *   SONAR_MODEL_CANARY_PROFILE   profile for the canary group
 *   SONAR_MODEL_CANARY_PERCENT   0 to 100: share of signed-in users in the canary, by a
 *                                stable hash of the user id (the same user always lands
 *                                on the same side)
 *   SONAR_MODEL_CANARY_USERS     comma-separated user ids always in the canary (admins)
 *   SONAR_MODEL_ROLE_<ROLE>      overrides one role's model on every profile, for example
 *                                SONAR_MODEL_ROLE_DEEP_SPECIALIST=claude-sonnet-5-5
 * Setting SONAR_MODEL_PROFILE=current and clearing the canary reverts everything at once.
 */

export const MODELS = {
  haiku45: 'claude-haiku-4-5-20251001',
  haiku55: 'claude-haiku-5-5',
  sonnet45: 'claude-sonnet-4-5',
  sonnet5: 'claude-sonnet-5',
  sonnet55: 'claude-sonnet-5-5',
  opus55: 'claude-opus-5-5',
};

const ROLES = [
  'quick',
  'standard',
  'standard_specialist',
  'deep_director',
  'deep_specialist',
  'deep_red_team',
  'deep_resolve',
  'deep_auditor',
  'cross_domain_director',
  'legacy_standard',
  'legacy_deep',
];

const M = MODELS;

/** The `current` profile, resolved from the legacy variables exactly as the code did. */
function currentProfile(env) {
  const fast = env.SONAR_FAST_MODEL || M.haiku45;
  const deep = env.SONAR_DEEP_MODEL || env.SONAR_LANDING_MODEL || M.sonnet45;
  const strong = env.SONAR_ANALYST_STRONG_MODEL || deep;
  return {
    quick: fast,
    standard: fast,
    standard_specialist: env.SONAR_ANALYST_FAST_MODEL || fast,
    deep_director: deep,
    deep_specialist: strong,
    deep_red_team: strong,
    deep_resolve: strong,
    deep_auditor: strong,
    cross_domain_director: null,
    legacy_standard: M.haiku45,
    legacy_deep: M.sonnet5,
  };
}

const FIXED = {
  A: {
    quick: M.haiku55,
    standard: M.haiku55,
    standard_specialist: M.haiku55,
    deep_director: M.sonnet55,
    deep_specialist: M.sonnet55,
    deep_red_team: M.sonnet55,
    deep_resolve: M.sonnet55,
    deep_auditor: M.sonnet55,
    cross_domain_director: null,
    legacy_standard: M.haiku55,
    legacy_deep: M.sonnet55,
  },
  B: {
    quick: M.haiku55,
    standard: M.sonnet55,
    standard_specialist: M.haiku55,
    deep_director: M.opus55,
    deep_specialist: M.sonnet55,
    deep_red_team: M.sonnet55,
    deep_resolve: M.opus55,
    deep_auditor: M.sonnet55,
    cross_domain_director: null,
    legacy_standard: M.sonnet55,
    legacy_deep: M.opus55,
  },
  C: {
    quick: M.haiku55,
    standard: M.sonnet55,
    standard_specialist: M.haiku55,
    deep_director: M.sonnet55,
    deep_specialist: M.sonnet55,
    deep_red_team: M.opus55,
    deep_resolve: M.sonnet55,
    deep_auditor: M.opus55,
    cross_domain_director: M.opus55,
    legacy_standard: M.sonnet55,
    legacy_deep: M.sonnet55,
  },
};

const PROFILES = ['current', 'A', 'B', 'C'];

/**
 * The model for every role under a profile, with SONAR_MODEL_ROLE_<ROLE> overrides and
 * explicit `overrides` (benchmarks) applied last. Unknown profiles fall back to current.
 */
export function resolveModelRouting({ profile = 'current', env = {}, overrides = null } = {}) {
  const base = FIXED[profile] ? { ...FIXED[profile] } : currentProfile(env);
  const name = FIXED[profile] ? profile : 'current';
  for (const role of ROLES) {
    const v = env[`SONAR_MODEL_ROLE_${role.toUpperCase()}`];
    if (v) base[role] = v;
  }
  if (overrides) for (const [k, v] of Object.entries(overrides)) if (ROLES.includes(k)) base[k] = v;
  return { profile: name, ...base };
}

/** Stable 0..99 bucket for a user id (FNV-1a), so canary membership never flips. */
function bucketOf(id) {
  let h = 0x811c9dc5;
  for (const ch of String(id)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % 100;
}

/** Which profile a run gets under the flag settings. Anonymous runs get the base. */
export function profileForUser({ userId = null, env = {} } = {}) {
  const base = PROFILES.includes(env.SONAR_MODEL_PROFILE) ? env.SONAR_MODEL_PROFILE : 'current';
  const canary = PROFILES.includes(env.SONAR_MODEL_CANARY_PROFILE)
    ? env.SONAR_MODEL_CANARY_PROFILE
    : null;
  if (!canary || !userId) return base;
  const users = String(env.SONAR_MODEL_CANARY_USERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (users.includes(String(userId))) return canary;
  const pct = Math.max(0, Math.min(100, Number(env.SONAR_MODEL_CANARY_PERCENT) || 0));
  return bucketOf(userId) < pct ? canary : base;
}

/** The routing for one run (what the engine and routes call). */
export function routingForRun({ userId = null, env = {}, overrides = null } = {}) {
  return resolveModelRouting({ profile: profileForUser({ userId, env }), env, overrides });
}

/**
 * Cross-domain: the routed team spans two or more analyst groups (corporate, government,
 * macro, alternative), not counting control roles (director, auditor, red team).
 */
export function isCrossDomain(teamRouting, analysts) {
  const ids = [teamRouting?.lead, ...(teamRouting?.supporting || [])]
    .map((x) => (typeof x === 'string' ? x : x?.id || x?.analyst))
    .filter(Boolean);
  const groups = new Set(
    ids.map((id) => analysts?.[id]?.group).filter((g) => g && g !== 'control'),
  );
  return groups.size >= 2;
}

/** The director model for a deep run: the cross-domain model when set and the run qualifies. */
export function deepDirectorFor(routing, { crossDomain = false } = {}) {
  return crossDomain && routing.cross_domain_director
    ? routing.cross_domain_director
    : routing.deep_director;
}

/* ── Pricing (USD per million tokens), from Anthropic's pricing page on 2026-11-28 ── */

const PRICING = [
  /* [match, input, cacheRead, output, longPromptInput, longPromptOutput] */
  [/haiku-5-5/, 0.1, 0.01, 0.5, 0.5, 2.5],
  [/haiku-4-5/, 1, 0.1, 5],
  [/sonnet-5-5/, 2, 0.1, 10],
  [/sonnet-5(?!-)/, 2, 0.2, 10],
  [/sonnet-4/, 3, 0.3, 15],
  [/opus-5-5/, 4, 0.2, 20],
  [/opus-5(?!-)/, 5, 0.5, 25],
  [/opus-4-[5-8]/, 5, 0.5, 25],
];
const WEB_SEARCH_USD = 0.01;
const LONG_PROMPT_TOKENS = 100_000;

/** Price row for a model id, or null when unknown. */
export function priceOf(model) {
  const row = PRICING.find(([re]) => re.test(String(model || '')));
  return row
    ? { input: row[1], cacheRead: row[2], output: row[3], longInput: row[4], longOutput: row[5] }
    : null;
}

/**
 * Actual cost of one call from its usage: { model, inputTokens, outputTokens,
 * cacheReadTokens, cacheWriteTokens, webSearches }. Haiku 5.5 prices prompts over 100K
 * tokens (all input, cache included) at its long-prompt rate. Cache writes at 1.25x input.
 * Null when the model is unknown.
 */
export function callCostUsd(u) {
  const p = priceOf(u?.model);
  if (!p) return null;
  const inTok = Number(u.inputTokens) || 0;
  const read = Number(u.cacheReadTokens) || 0;
  const write = Number(u.cacheWriteTokens) || 0;
  const out = Number(u.outputTokens) || 0;
  const long = p.longInput != null && inTok + read + write > LONG_PROMPT_TOKENS;
  const pin = long ? p.longInput : p.input;
  const pout = long ? p.longOutput : p.output;
  const pread = long ? p.cacheRead * 5 : p.cacheRead;
  return (
    (inTok * pin + read * pread + write * pin * 1.25 + out * pout) / 1e6 +
    (Number(u.webSearches) || 0) * WEB_SEARCH_USD
  );
}
