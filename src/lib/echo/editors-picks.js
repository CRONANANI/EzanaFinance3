/**
 * Ezana Echo home: Editors' Picks, the horizontal rail under the hero.
 *
 * There is no editor-pick field in echo_articles, so this list IS the
 * editorial source of truth: article ids in the order editors want them shown.
 * Edit it by hand when the picks change. An id that does not resolve to a
 * published, non-archived story is skipped.
 *
 * Selection (pickEditorsPicks):
 *   1. EDITORS_PICKS ids, in order;
 *   2. then earlier Articles of the Month (AOTM_HISTORY after the current pick),
 *      which are editor-chosen by definition;
 *   3. then the newest published stories, only if 1 and 2 leave the rail short.
 * Never the hero, never a story already shown as a hero teaser, never a
 * duplicate. No popularity signal is used, so the rail is never a disguised
 * Most read.
 *
 * Pure (no React, no `@/` imports).
 */

export const EDITORS_PICKS = [
  'bitcoin-institutional-holders-13f-2026',
  'the-ai-stack-is-upside-down-what-market-caps-say',
  'stablecoin-settlement-layer-2026',
  'empire-rankings-1500-2026',
  'central-bank-gold-cycle-2026',
  'yen-carry-trade-unwind-2026',
  'datacenter-power-crunch-2026',
];

/** How many picks the rail holds (three show at a time on desktop). */
export const EDITORS_PICKS_MAX = 6;

/**
 * @param {Array} stories       published, non-archived stories (toStory shape), newest first
 * @param {object} opts
 * @param {Set<string>} [opts.exclude]  ids never to pick (hero, teasers)
 * @param {Array<{articleId: string}>} [opts.history]  AOTM_HISTORY
 * @param {string[]} [opts.ids]  override for EDITORS_PICKS (tests)
 * @param {number} [opts.max]
 */
export function pickEditorsPicks(stories, opts = {}) {
  const exclude = opts.exclude || new Set();
  const ids = opts.ids || EDITORS_PICKS;
  const max = opts.max || EDITORS_PICKS_MAX;
  const byId = new Map(stories.map((s) => [s.id, s]));
  const out = [];
  const seen = new Set(exclude);
  const take = (s, source) => {
    if (!s || seen.has(s.id) || out.length >= max) return;
    seen.add(s.id);
    out.push({ ...s, pickSource: source });
  };
  ids.forEach((id) => take(byId.get(id), 'editors'));
  (opts.history || []).slice(1).forEach((h) => take(byId.get(h.articleId), 'aotm'));
  if (out.length < 3) stories.forEach((s) => take(s, 'latest'));
  return out;
}

/**
 * The two stories anchored along the bottom of the hero: the two newest
 * published stories with a photo, excluding the hero. Deterministic (hub
 * order is newest first), no popularity signal.
 */
export function pickHeroTeasers(stories, heroId, n = 2) {
  return stories.filter((s) => s.id !== heroId && s.image).slice(0, n);
}
