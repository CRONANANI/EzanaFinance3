/**
 * Sonar 6.3: the 13F ownership public-preview contract (Nov 28 2026).
 *
 * The Institutional Ownership Analysis reads the `13f` dataset, which entitlements.js
 * places in plan tier 2. Today the research route runs it for every reader, guests
 * included (see docs/SONAR_6_3.md, "13F entitlement audit"). Changing that is a commercial
 * decision, so this module only makes the options available; the mode is chosen by
 * SONAR_13F_UNENTITLED and defaults to 'full', which is today's behaviour.
 *
 *   full     unentitled readers get the full analysis (current behaviour)
 *   preview  unentitled readers get only the allow-listed aggregate fields below
 *   off      unentitled readers get no ownership analysis; a notice names the plan
 *
 * The preview is a projection of a computed result through an explicit allow list: a
 * field not named here never reaches an unentitled reader, the written answer included
 * (the writer reads `text`, which is rebuilt from the projected fields only).
 *
 * Pure: no I/O.
 */

export const OWNERSHIP_DATASET = '13f';
export const PREVIEW_TOP = 3;

/** Fields an unentitled reader may see. Everything else is dropped. */
export const PREVIEW_FIELDS = {
  result: ['period', 'metric'],
  universe: ['total', 'eligible'],
  row: ['rank', 'ticker', 'issuer', 'managers'],
};

export function unentitledOwnershipMode(env = process.env) {
  const v = String(env.SONAR_13F_UNENTITLED || 'full').toLowerCase();
  return v === 'preview' || v === 'off' ? v : 'full';
}

export function hasOwnershipEntitlement(entitlements) {
  /* Deep mode passes null: every dataset. */
  if (entitlements == null) return true;
  const list = Array.isArray(entitlements) ? entitlements : entitlements.datasets || [];
  return list.includes(OWNERSHIP_DATASET);
}

const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj && obj[k] !== undefined).map((k) => [k, obj[k]]));

/**
 * Project one ownership analysis result for an unentitled reader.
 * @param {object} analysis a composer result with `ownership` (execute.js runOwnership)
 * @returns {object} a result with only allow-listed fields, `preview: true`
 */
export function ownershipPreview(analysis) {
  const o = analysis?.ownership;
  if (!o) return { ...pick(analysis, ['key', 'capability', 'status', 'title']), preview: true };
  const rows = (o.rows || [])
    .filter((r) => r.rank != null)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, PREVIEW_TOP)
    .map((r) => pick(r, PREVIEW_FIELDS.row));
  const ranked = (o.rows || []).filter((r) => r.rank != null).length;
  const universe = pick(o.universe, PREVIEW_FIELDS.universe);
  const ownership = { ...pick(o, PREVIEW_FIELDS.result), universe, rows, ranked, preview: true };
  const text = [
    'Institutional Ownership Analysis, public preview (calculated from SEC Form 13F filings; findings, not advice).',
    `Universe: ${universe.eligible ?? 'N/A'} eligible common equities of ${universe.total ?? 'N/A'} disclosed holdings; ${ranked} ranked.`,
    `Reporting period: ${ownership.period || 'N/A'}. Ranked by the number of 13F reporting managers.`,
    ...rows.map(
      (r) => `Rank ${r.rank}: ${r.ticker || r.issuer} held by ${r.managers} 13F managers.`,
    ),
    'Preview only: the full ranking, values, weights and quarter-on-quarter changes need a plan that includes 13F institutional holdings.',
  ].join('\n');
  return {
    ...pick(analysis, ['key', 'capability', 'status', 'title', 'output']),
    coverage: analysis.coverage ? pick(analysis.coverage, ['selected', 'withData']) : undefined,
    ownership,
    preview: true,
    limitations: [
      'Public preview: the top three holdings by manager count only. The full analysis is in plans that include 13F institutional holdings.',
    ],
    text,
  };
}

/**
 * Apply the mode to a whole composition for one reader.
 * @returns {{ composition: object, notice: string|null, applied: string }}
 */
export function applyOwnershipAccess(composition, { entitlements, mode = 'full' } = {}) {
  if (!composition || hasOwnershipEntitlement(entitlements) || mode === 'full')
    return { composition, notice: null, applied: 'full' };
  const isOwn = (r) => r?.capability === 'institutional-ownership';
  if (!(composition.results || []).some(isOwn))
    return { composition, notice: null, applied: 'none' };
  if (mode === 'off') {
    return {
      composition: { ...composition, results: composition.results.filter((r) => !isOwn(r)) },
      notice:
        'The institutional ownership ranking reads 13F holdings, which your plan does not include, so it did not run.',
      applied: 'off',
    };
  }
  return {
    composition: {
      ...composition,
      results: composition.results.map((r) => (isOwn(r) ? ownershipPreview(r) : r)),
    },
    notice:
      'This is a preview of the institutional ownership ranking. The full ranking needs a plan that includes 13F institutional holdings.',
    applied: 'preview',
  };
}
