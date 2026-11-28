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
 *   D        Haiku 4.5 quick, Sonnet 5.5 standard writer and specialists, Opus 5.5 deep
 *            writer and resolve, Sonnet 5.5 deep specialists, red team and auditor
 *   D-efficient  D with Haiku 5.5 standard specialists (proposed; disabled by default)
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
  /* D (Nov 28 2026, from the model benchmark): Haiku 4.5 keeps quick (Haiku 5.5 lost every
     quick comparison); Sonnet 5.5 writes and specializes at standard; Opus 5.5 writes deep
     reports (won 22 of 24 paired judgments over a Sonnet 5.5 writer on the same evidence)
     while Sonnet 5.5 runs the deep specialists and review. Not served unless selected. */
  D: {
    quick: M.haiku45,
    standard: M.sonnet55,
    standard_specialist: M.sonnet55,
    deep_director: M.opus55,
    deep_specialist: M.sonnet55,
    deep_red_team: M.sonnet55,
    deep_resolve: M.opus55,
    deep_auditor: M.sonnet55,
    cross_domain_director: null,
    legacy_standard: M.sonnet55,
    legacy_deep: M.opus55,
  },
  /* D-efficient (proposed Nov 28 2026, not authorized for any traffic): D with Haiku 5.5
     standard specialists. On the d4 benchmark it scored 60.4 against D's 61.1 at $0.041 a
     standard run against $0.065 (pairwise D 32-20, order consistency 0.69). Deep is
     unchanged from D: Opus 5.5 writes and resolves (final synthesis), Sonnet 5.5 runs the
     specialists, red team and audit. Served only when a flag names it. */
  'D-efficient': {
    quick: M.haiku45,
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
};

/** Every selectable profile. Only `current` is served unless a flag names another. */
export const PROFILES = ['current', 'A', 'B', 'C', 'D', 'D-efficient'];

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
export function profileForUser({ userId = null, isStaff = false, env = {} } = {}) {
  const base = PROFILES.includes(env.SONAR_MODEL_PROFILE) ? env.SONAR_MODEL_PROFILE : 'current';
  const canary = PROFILES.includes(env.SONAR_MODEL_CANARY_PROFILE)
    ? env.SONAR_MODEL_CANARY_PROFILE
    : null;
  if (!canary || !userId) return base;
  /* Nov 28 2026: SONAR_MODEL_CANARY_STAFF=1 sends every admin (isAdminUser) to the canary:
     a staff-only canary without listing user ids. */
  const staffOn = env.SONAR_MODEL_CANARY_STAFF === '1' || env.SONAR_MODEL_CANARY_STAFF === 'true';
  if (staffOn && isStaff) return canary;
  const users = String(env.SONAR_MODEL_CANARY_USERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (users.includes(String(userId))) return canary;
  const pct = Math.max(0, Math.min(100, Number(env.SONAR_MODEL_CANARY_PERCENT) || 0));
  return bucketOf(userId) < pct ? canary : base;
}

/** The routing for one run (what the engine and routes call). */
export function routingForRun({ userId = null, isStaff = false, env = {}, overrides = null } = {}) {
  return resolveModelRouting({ profile: profileForUser({ userId, isStaff, env }), env, overrides });
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

/* ── Request traits per model (Nov 28 2026, from Anthropic's model migration guides) ──
   The 5.x models think by default and max_tokens covers thinking plus text, so a request
   that does not set thinking and effort spends part of its cap thinking (Sonnet 5.5 at
   high effort, Opus 5.5 and Haiku 5.5 at medium). The benchmark found Sonnet 5.5
   specialists and reviewers cut at their caps before writing any text.
     Opus 5.5    thinking always on (disabled is a 400); effort is the only control
     Sonnet 5.5  thinking on; the lowest setting is thinking {type: "between_tools"}
                 (no up-front thinking without tools), accepted at effort high or below
     Haiku 5.5   thinking on; thinking {type: "disabled"} allowed at effort high or below
     Sonnet 5    thinking on; disabled allowed
     4.x models  no thinking unless asked; no effort parameter sent
   The 5.x tokenizer uses about 30% more tokens for the same text, so caps written for
   4.x models are scaled by 1.3 on 5.x models. */
const TRAITS = [
  [/opus-5-5/, { thinks: true, off: null, effort: true, tokenFactor: 1.3 }],
  [/sonnet-5-5/, { thinks: true, off: { type: 'between_tools' }, effort: true, tokenFactor: 1.3 }],
  [/haiku-5-5/, { thinks: true, off: { type: 'disabled' }, effort: true, tokenFactor: 1.3 }],
  [
    /(?:sonnet|opus)-5(?:$|-\d{8}$)/,
    { thinks: true, off: { type: 'disabled' }, effort: true, tokenFactor: 1.3 },
  ],
];
const NO_THINK = { thinks: false, off: null, effort: false, tokenFactor: 1 };

export function modelTraits(model) {
  const row = TRAITS.find(([re]) => re.test(String(model || '')));
  return row ? row[1] : NO_THINK;
}

/**
 * The request fields for one call of a role on a model:
 *   think: 'off' (no up-front thinking where the model allows it), 'adaptive', or null
 *          (the model's default, which older callers keep)
 *   effort: low | medium | high (sent only to models that take it)
 *   reserveTokens: extra output room when thinking runs (thinking is billed as output)
 * Returns { fields, maxTokens, thinking } with maxTokens = the text cap scaled for the
 * model's tokenizer plus the reserve when the model will think.
 */
export function requestShape(
  model,
  { maxTokens, think = null, effort = null, reserveTokens = 0 } = {},
) {
  const t = modelTraits(model);
  const fields = {};
  let thinking = t.thinks;
  if (think === 'off' && t.off) {
    fields.thinking = t.off;
    thinking = false;
  } else if (think === 'adaptive' && t.thinks) fields.thinking = { type: 'adaptive' };
  if (t.effort && effort) fields.output_config = { effort };
  const text = Math.round((Number(maxTokens) || 0) * t.tokenFactor);
  /* A model that cannot stop thinking (Opus 5.5) asked for no thinking still gets a small
     reserve; at low effort it thinks little. */
  const reserve = !thinking
    ? 0
    : think === 'off'
      ? Math.min(reserveTokens || 1500, 1500)
      : reserveTokens || 0;
  return { fields, maxTokens: text + reserve, thinking };
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
