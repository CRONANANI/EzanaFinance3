/**
 * Government-entity + issue-area bucketing for the Lobbying "Influence Ledger".
 * Pure helpers (safe in server or client). Maps the raw LDA entity/issue strings
 * to a small, stable palette of buckets used for the leaderboard bar segments,
 * the issue-mix donut, chips, and the rail's Gov-entity group filter.
 *
 * Colors are NOT hardcoded here — the UI resolves each bucket key to a CSS
 * variable (see lobbying.css `--lbx-ent-*` / `--lbx-iss-*`), tokens only.
 */

/* ── Government entities ─────────────────────────────────────────────────── */
export const ENTITY_ORDER = [
  'house',
  'senate',
  'dod',
  'hhs',
  'epa',
  'doe',
  'whitehouse',
  'treasury',
  'other',
];
export const ENTITY_LABEL = {
  house: 'House',
  senate: 'Senate',
  dod: 'DoD',
  hhs: 'HHS',
  epa: 'EPA',
  doe: 'DoE',
  whitehouse: 'White House',
  treasury: 'Treasury',
  other: 'Other',
};

/** Rail group filter → the entity buckets it covers. */
export const ENTITY_GROUPS = {
  congress: ['house', 'senate'],
  agencies: ['dod', 'hhs', 'epa', 'doe', 'treasury', 'other'],
  whitehouse: ['whitehouse'],
};

/** Map ONE raw LDA government-entity name → a bucket key. Order matters
 *  (White House before House; chambers before agencies). */
export function entityBucket(name) {
  const s = String(name || '').toLowerCase();
  if (!s) return 'other';
  if (
    /white house|executive office|office of the president|office of management|\bomb\b|national security council/.test(
      s,
    )
  )
    return 'whitehouse';
  if (/senate/.test(s)) return 'senate';
  if (/house of representatives|u\.?s\.? house|\bhouse\b/.test(s)) return 'house';
  if (/defense|army|navy|air force|marine|\bdod\b|pentagon/.test(s)) return 'dod';
  if (
    /health|human services|\bhhs\b|medicare|medicaid|food and drug|\bfda\b|\bnih\b|\bcms\b|disease control/.test(
      s,
    )
  )
    return 'hhs';
  if (/environmental protection|\bepa\b/.test(s)) return 'epa';
  if (/energy|\bdoe\b|nuclear/.test(s)) return 'doe';
  if (/treasury|internal revenue|\birs\b/.test(s)) return 'treasury';
  return 'other';
}

/** Unique entity buckets cited by a filing's entities[] (raw names or objects). */
export function bucketsForFiling(entities = []) {
  const set = new Set();
  for (const e of Array.isArray(entities) ? entities : []) {
    const name = typeof e === 'string' ? e : e?.name || e?.government_entity;
    if (name) set.add(entityBucket(name));
  }
  return [...set];
}

/* ── Issue areas ─────────────────────────────────────────────────────────── */
export const ISSUE_ORDER = ['defense', 'health', 'tax', 'energy', 'tech', 'trade', 'other'];
export const ISSUE_LABEL = {
  defense: 'Defense',
  health: 'Health',
  tax: 'Tax & Budget',
  energy: 'Energy & Env.',
  tech: 'Tech & Telecom',
  trade: 'Trade',
  other: 'Other',
};

/** Map ONE raw LDA issue-area display → a palette bucket (for chip/donut color). */
export function issueBucket(issue) {
  const s = String(issue || '').toLowerCase();
  if (!s) return 'other';
  if (/defense|homeland|intelligence|military|veteran|arms|firearms/.test(s)) return 'defense';
  if (/health|medicare|medicaid|food|drug|disease|pharma/.test(s)) return 'health';
  if (/tax|budget|accounting|appropriat|financ|banking/.test(s)) return 'tax';
  if (/energy|nuclear|environment|clean air|natural resources|fuel/.test(s)) return 'energy';
  if (/science|technolog|telecom|computer|internet|communications|media/.test(s)) return 'tech';
  if (/trade|tariff|import|export|commerce|customs/.test(s)) return 'trade';
  return 'other';
}
