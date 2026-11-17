/**
 * When an exemplary brief stops being served.
 *
 * A brief is a dated answer. It is withdrawn automatically, with no deploy, when:
 *   - a scheduled event that changes the answer has passed (`expiresAt`, an ISO instant, with
 *     `expiryReason` naming the event), or
 *   - its review date has arrived (`reviewAfter`, a YYYY-MM-DD day, from 00:00 UTC), when no
 *     exact instant is given, or
 *   - an operator has retired it by slug (SONAR_EXEMPLARY_RETIRED, comma-separated), for news
 *     nobody scheduled.
 *
 * A withdrawn brief is never shown with a warning on it: the ping falls through to adaptive
 * and standard research, which read today's evidence. A brief with no usable date is treated
 * as stale, so a typo cannot keep an old answer alive.
 */

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function instant(value) {
  if (!value) return null;
  const ms = Date.parse(DAY.test(value) ? `${value}T00:00:00Z` : value);
  return Number.isFinite(ms) ? ms : null;
}

/** Slugs retired by configuration. */
export function retiredSlugs(env = process.env) {
  return new Set(
    String(env?.SONAR_EXEMPLARY_RETIRED || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/**
 * @param {object} brief
 * @param {object} [opts]
 * @param {number|Date} [opts.now]
 * @param {Set<string>} [opts.retired]
 * @returns {{ fresh: boolean, reason: null|'retired'|'event'|'review'|'undated', expiresAt: string|null }}
 */
export function briefFreshness(brief, { now = Date.now(), retired = retiredSlugs() } = {}) {
  const at = now instanceof Date ? now.getTime() : Number(now);
  if (retired.has(brief?.slug)) return { fresh: false, reason: 'retired', expiresAt: null };
  const event = instant(brief?.expiresAt);
  const review = instant(brief?.reviewAfter);
  const limit = event ?? review;
  if (limit == null) return { fresh: false, reason: 'undated', expiresAt: null };
  const expiresAt = new Date(limit).toISOString();
  if (at >= limit) return { fresh: false, reason: event != null ? 'event' : 'review', expiresAt };
  return { fresh: true, reason: null, expiresAt };
}
