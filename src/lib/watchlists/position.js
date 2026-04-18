/**
 * Position / sort_order helpers for watchlists.
 *
 * Watchlists are ordered per-user by the `sort_order` column on
 * `public.user_watchlists`. This module owns the single point of truth for
 * computing the next sort_order when a new list is created.
 *
 * We use sparse positioning (step = 1024) so that future drag-to-reorder can
 * insert between rows by assigning `(prev + next) / 2` without renumbering the
 * entire table. All current read paths order by `sort_order ASC` then
 * `created_at ASC` so any step value works today — this is forward-looking.
 */

export const POSITION_STEP = 1024;

/**
 * Given the existing `sort_order` values for a user's watchlists, return the
 * next sort_order to assign to a freshly created list.
 *
 * Contract:
 *   - Empty / missing input → POSITION_STEP (never 0, so later rows don't
 *     collide on a (user_id, sort_order) unique index if one is ever added).
 *   - Non-numeric / NaN / Infinity entries are ignored (never propagated into
 *     the stored value).
 *   - Result is always a finite integer strictly greater than every existing
 *     valid position.
 *
 * @param {Array<number|null|undefined>} existingPositions
 * @returns {number}
 */
export function computeNextPosition(existingPositions) {
  if (!Array.isArray(existingPositions) || existingPositions.length === 0) {
    return POSITION_STEP;
  }

  let max = -Infinity;
  for (const p of existingPositions) {
    if (typeof p === 'number' && Number.isFinite(p) && p > max) {
      max = p;
    }
  }

  if (!Number.isFinite(max)) {
    // No valid numbers in the array — treat as empty.
    return POSITION_STEP;
  }

  return max + POSITION_STEP;
}
