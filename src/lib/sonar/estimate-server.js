/**
 * The reads behind POST /api/sonar/estimate (Nov 2026). Server only: every
 * read goes through the admin client the route takes from @/lib/supabase
 * and carries its own ownership filter (the caller's user_id, salted
 * ip_hash or org_id), because the service role bypasses RLS.
 *
 * Usage comes from the same functions and rules the reservation uses:
 * countPingsToday / countDeepToday (quota.js), the plan's entitlements
 * (resolveResearchAccess, the research route's resolver) and the org pool as
 * reserve_sonar_ping_org_deep counts it. Nothing is reserved or charged.
 */
import { countPingsToday, countDeepToday } from '@/lib/sonar/quota';
import { defaultOrgPool, DEEP_PREFIX, monthStartUtc, resetLabel } from '@/lib/org-sonar/budget';
import { withTimeout } from '@/lib/with-timeout';
import {
  assembleUsage,
  ESTIMATE_WINDOW_DAYS,
  guestIpDailyCap,
  memberDailyPingCap,
} from '@/lib/sonar/estimate';

const READ_MS = 1200;
const DURATIONS_TTL_MS = 5 * 60_000;
const durationsCache = new Map();

const valueOr = (r, fallback) => (r?.ok ? r.value : fallback);

/**
 * duration_ms of the last ESTIMATE_WINDOW_DAYS of ledger rows for a mode,
 * newest first, cached per instance for five minutes. An error (for example
 * the column missing on an older database) reads as no samples, so the plan
 * estimate is used.
 */
export async function readRecentDurations(
  admin,
  mode,
  { now = Date.now(), limit = 2000, cache = durationsCache } = {},
) {
  const hit = cache.get(mode);
  if (hit && now - hit.at < DURATIONS_TTL_MS) return hit.values;
  let values = [];
  try {
    const since = new Date(now - ESTIMATE_WINDOW_DAYS * 86_400_000).toISOString();
    const { data, error } = await Promise.resolve(
      admin
        .from('sonar_queries')
        .select('duration_ms')
        .eq('mode', mode)
        .gte('created_at', since)
        .not('duration_ms', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit),
    );
    if (!error) values = (data || []).map((r) => Number(r.duration_ms)).filter(Number.isFinite);
  } catch {
    values = [];
  }
  cache.set(mode, { at: now, values });
  return values;
}

/**
 * The org's pooled deep research budget this month, counted the way
 * reserve_sonar_ping_org_deep counts it: the pool (org_sonar_budget, or the
 * app default), the org's deep runs since the month began, and the
 * member's allocation and own runs when an executive set one. Null when the
 * org tables are not there (the reservation then falls back to the
 * member's daily deep cap, and so does the card).
 */
export async function readOrgPool(admin, { orgId, userId, now = new Date() }) {
  if (!orgId || !userId) return null;
  try {
    const since = monthStartUtc(now).toISOString();
    const deepRuns = () =>
      admin
        .from('sonar_queries')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('created_at', since)
        .like('version', `${DEEP_PREFIX}%`);
    const [budget, alloc, used, mine] = await Promise.all([
      Promise.resolve(
        admin
          .from('org_sonar_budget')
          .select('monthly_deep_runs')
          .eq('org_id', orgId)
          .maybeSingle(),
      ),
      Promise.resolve(
        admin
          .from('org_sonar_allocations')
          .select('monthly_deep_runs')
          .eq('org_id', orgId)
          .eq('user_id', userId)
          .maybeSingle(),
      ),
      Promise.resolve(deepRuns()),
      Promise.resolve(deepRuns().eq('user_id', userId)),
    ]);
    if (used?.error || budget?.error) return null;
    const allocation = alloc?.data?.monthly_deep_runs;
    return {
      used: used?.count || 0,
      total: budget?.data?.monthly_deep_runs ?? defaultOrgPool(),
      resetsOn: resetLabel(now),
      allocation:
        allocation == null || alloc?.error ? null : { used: mine?.count || 0, total: allocation },
    };
  } catch {
    return null;
  }
}

/**
 * The usage block for the caller. `access` is resolveResearchAccess()'s
 * result (the research route's own resolver), `guestCount` the signed
 * cookie's count, `ipHash` the salted IP hash the reservation uses.
 */
export async function readUsage(
  admin,
  { access, ipHash = null, guestCount = 0, guestLimit = 5, guestNeedsAccount = true },
) {
  const isGuest = !access?.user;
  if (isGuest) {
    const ipUsed = await withTimeout(countPingsToday(admin, { ipHash }), READ_MS, 'est-ip');
    return assembleUsage({
      isGuest: true,
      guestNeedsAccount,
      guestCount,
      guestLimit,
      guestIpUsed: valueOr(ipUsed, null),
      guestIpCap: guestIpDailyCap(guestLimit),
    });
  }
  const userId = access.user.id;
  const orgId = access.scope?.orgId || null;
  const [pings, deep, org] = await Promise.all([
    withTimeout(countPingsToday(admin, { userId }), READ_MS, 'est-pings'),
    withTimeout(countDeepToday(admin, userId), READ_MS, 'est-deep'),
    orgId
      ? withTimeout(readOrgPool(admin, { orgId, userId }), READ_MS, 'est-org')
      : Promise.resolve({ ok: true, value: null }),
  ]);
  return assembleUsage({
    isGuest: false,
    pingsUsedToday: valueOr(pings, null),
    memberPingCap: memberDailyPingCap(),
    dailyQueries: access.entitlements?.dailyQueries ?? null,
    deepRunsUsedToday: valueOr(deep, null),
    deepRunsPerDay: access.entitlements?.deepRunsPerDay ?? 0,
    org: valueOr(org, null),
  });
}
