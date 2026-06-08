/**
 * Standard pagination for list endpoints.
 *
 * Supports offset pagination via `?limit` + (`?offset` or `?page`). Returns
 * clamped values plus Supabase-style inclusive range bounds (`from`/`to`) for
 * use with `.range(from, to)`. Keeping this centralized means every list
 * endpoint bounds its result set the same way — no accidental unbounded scans.
 */

/**
 * @param {URLSearchParams|string} searchParams
 * @param {{ defaultLimit?: number, maxLimit?: number }} [opts]
 * @returns {{ limit: number, offset: number, from: number, to: number }}
 */
export function parsePagination(searchParams, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const sp =
    searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams);

  let limit = parseInt(sp.get('limit') ?? '', 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = defaultLimit;
  limit = Math.min(maxLimit, Math.max(1, limit));

  let offset = parseInt(sp.get('offset') ?? '', 10);
  if (!Number.isFinite(offset) || offset < 0) {
    const page = parseInt(sp.get('page') ?? '', 10);
    offset = Number.isFinite(page) && page > 1 ? (page - 1) * limit : 0;
  }

  return { limit, offset, from: offset, to: offset + limit - 1 };
}

/**
 * Wrap a page of rows with pagination metadata for the client. When `total` is
 * unknown, `hasMore` is inferred from whether a full page was returned.
 *
 * @param {any[]} items
 * @param {{ limit: number, offset: number, total?: number|null }} meta
 */
export function paginatedResponse(items, { limit, offset, total = null }) {
  const hasMore = total != null ? offset + items.length < total : items.length >= limit;
  return {
    items,
    pagination: {
      limit,
      offset,
      count: items.length,
      total,
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
    },
  };
}
