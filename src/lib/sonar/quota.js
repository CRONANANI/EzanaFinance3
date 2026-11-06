/**
 * Sonar ping quota: reserve BEFORE the model call (reliability audit P1-8).
 *
 * reserve_sonar_ping() takes a per-user (or per-IP-hash for guests) advisory
 * lock, counts today's pings against the user's limit
 * and the global daily cap, and inserts a 'reserved' row in one transaction.
 * Parallel pings therefore cannot all pass a count that none of them has
 * written yet, and a ping is counted even if the final log write fails.
 *
 *   const r = await reservePing(admin, { userId, limit, ... });
 *   if (!r.ok) -> quota or global-cap response (r.reason)
 *   ... retrieval + model ...
 *   await completePing(admin, r, { classification, datasets_searched, grounded })
 *   on any failure: await failPing(admin, r)   (row deleted: not counted)
 *
 * Until the migration is applied (no RPC), reservePing falls back to the old
 * count-then-log behaviour, so deploying the code first changes nothing.
 */

/* Every row in sonar_queries counts (reserved or completed); a failed ping's
   reservation is deleted. */
const MISSING_FN = new Set(['PGRST202', '42883']);

export function startOfUtcDayISO(now = new Date()) {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export function globalDailyCap() {
  return Math.max(0, Number(process.env.SONAR_GLOBAL_DAILY_CAP) || 500);
}

async function legacyReserve(admin, { userId, limit, globalLimit, ipHash, ipLimit }) {
  const since = startOfUtcDayISO();
  const { count: g } = await admin
    .from('sonar_queries')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since);
  if (globalLimit != null && (g || 0) >= globalLimit)
    return { ok: false, reason: 'global', used: 0 };
  let used = 0;
  if (userId) {
    used = await countPingsToday(admin, { userId }).catch(() => 0);
  } else if (ipHash && ipLimit != null) {
    used = await countPingsToday(admin, { ipHash }).catch(() => 0);
  }
  const cap = userId ? limit : ipLimit;
  if (cap != null && used >= cap) return { ok: false, reason: 'quota', used };
  return { ok: true, id: null, used, legacy: true };
}

/* Deep research runs are ledgered with version 'research:deep:<version>'. */
export const DEEP_VERSION_PREFIX = 'research:deep:';

/**
 * Today's pings for a member (user_id) or a guest (salted ip_hash), counted
 * the way reserve_sonar_ping counts them: every ledger row since midnight
 * UTC, reserved or completed (a released reservation is deleted). Read-only;
 * the estimate route (lib/sonar/estimate-server.js) shows it, the
 * reservation enforces it.
 */
export async function countPingsToday(admin, { userId = null, ipHash = null } = {}) {
  if (!userId && !ipHash) return 0;
  const since = startOfUtcDayISO();
  const base = admin.from('sonar_queries').select('id', { count: 'exact', head: true });
  const { count, error } = await (
    userId ? base.eq('user_id', userId) : base.eq('ip_hash', ipHash)
  ).gte('created_at', since);
  if (error) throw error;
  return count || 0;
}

/** Today's deep research runs for a user, counted from the ledger. */
export async function countDeepToday(admin, userId) {
  const { count, error } = await admin
    .from('sonar_queries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfUtcDayISO())
    .like('version', `${DEEP_VERSION_PREFIX}%`);
  if (error) throw error;
  return count || 0;
}

/**
 * @param {object} admin
 * @param {{ userId?: string|null, limit?: number|null, globalLimit?: number, ipHash?: string|null,
 *   ipLimit?: number|null, query: string, version: string, planTier?: number, isGuest?: boolean,
 *   deepLimit?: number|null }} opts
 *   deepLimit (Nov 2026): the member's daily cap on deep research runs. When
 *   set, the reservation uses reserve_sonar_ping_deep, which refuses with
 *   reason 'deep_quota' once the cap is reached.
 * @returns {Promise<{ ok: boolean, id?: string|null, reason?: 'quota'|'global'|'deep_quota'|'error', used: number, legacy?: boolean, row?: object }>}
 */
export async function reservePing(
  admin,
  {
    userId = null,
    limit = null,
    globalLimit = globalDailyCap(),
    ipHash = null,
    ipLimit = null,
    query,
    version,
    planTier = 0,
    isGuest = false,
    deepLimit = null,
  },
) {
  const args = {
    p_user: userId,
    p_limit: limit,
    p_global_limit: globalLimit,
    p_ip_hash: ipHash,
    p_ip_limit: ipLimit,
    p_query: String(query || '').slice(0, 600),
    p_version: version || null,
    p_plan_tier: planTier ?? 0,
    p_is_guest: Boolean(isGuest),
  };
  if (deepLimit != null) {
    const deep = await admin.rpc('reserve_sonar_ping_deep', { ...args, p_deep_limit: deepLimit });
    if (!deep.error) {
      const row = Array.isArray(deep.data) ? deep.data[0] : deep.data;
      if (!row?.id) return { ok: false, reason: row?.reason || 'quota', used: row?.used ?? 0 };
      return { ok: true, id: row.id, used: row.used ?? 0 };
    }
    if (!MISSING_FN.has(deep.error.code)) {
      console.error('[sonar-quota] deep reserve failed:', deep.error.message);
      return { ok: false, reason: 'error', used: 0 };
    }
    /* The deep function is not deployed yet: count today's deep runs, then
       reserve the ordinary way. */
    if (userId) {
      try {
        const n = await countDeepToday(admin, userId);
        if (n >= deepLimit) return { ok: false, reason: 'deep_quota', used: n };
      } catch (e) {
        console.error('[sonar-quota] deep count failed:', e?.message || e);
        return { ok: false, reason: 'error', used: 0 };
      }
    }
  }
  const { data, error } = await admin.rpc('reserve_sonar_ping', args);
  if (error) {
    if (MISSING_FN.has(error.code)) {
      const r = await legacyReserve(admin, { userId, limit, globalLimit, ipHash, ipLimit });
      return {
        ...r,
        row: {
          user_id: userId,
          is_guest: isGuest,
          ip_hash: ipHash,
          query_text: query,
          version,
          plan_tier: planTier,
        },
      };
    }
    /* The ledger is unreachable: refuse rather than spend unmetered. */
    console.error('[sonar-quota] reserve failed:', error.message);
    return { ok: false, reason: 'error', used: 0 };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) return { ok: false, reason: row?.reason || 'quota', used: row?.used ?? 0 };
  return { ok: true, id: row.id, used: row.used ?? 0 };
}

/** Mark a reservation completed with what the ping did. */
export async function completePing(admin, reservation, fields = {}) {
  if (!reservation?.ok) return;
  const patch = {
    classification: fields.classification ?? null,
    datasets_searched: fields.datasets_searched ?? [],
    grounded: Boolean(fields.grounded),
  };
  if (!reservation.id) {
    /* Legacy path (migration not applied): write the ledger row now. */
    const { error } = await admin
      .from('sonar_queries')
      .insert({ ...reservation.row, ...patch, is_guest: Boolean(reservation.row?.is_guest) });
    if (error) console.error('[sonar-quota] ledger insert failed:', error.message);
    return;
  }
  const { error } = await admin
    .from('sonar_queries')
    .update({ ...patch, status: 'completed' })
    .eq('id', reservation.id);
  /* The reserved row already counts against the quota, so a failed update
     never turns into a free ping; log it. */
  if (error) console.error('[sonar-quota] complete failed:', error.message);
}

/** A ping that failed before an answer: release it (deleted, so it is not
    counted by the quota, the global cap or the entitlements read). */
export async function failPing(admin, reservation) {
  if (!reservation?.ok || !reservation.id) return;
  const { error } = await admin
    .from('sonar_queries')
    .delete()
    .eq('id', reservation.id)
    .eq('status', 'reserved');
  if (error) console.error('[sonar-quota] release failed:', error.message);
}

/**
 * How a ping settles (pure): released (nothing charged) when the visitor
 * went away before it finished (aborted, for example by choosing deep
 * research) or when there is no answer; completed otherwise.
 * @returns {'complete'|'release'}
 */
export function settlementFor({ aborted = false, answered = false } = {}) {
  return !aborted && answered ? 'complete' : 'release';
}

/* PostgREST "column not in the schema cache" and Postgres undefined_column. */
const MISSING_COLUMN = new Set(['PGRST204', '42703']);

/**
 * Record which research mode ran and how long the route took on a reserved
 * ledger row (sonar_queries.mode, sonar_queries.duration_ms; the estimate
 * route reads them back for its p50/p90). Never throws and never fails a
 * ping: a missing column or any other error is skipped with at most a
 * warning carrying the error code.
 * @returns {Promise<{ ok: boolean, skipped?: boolean }>}
 */
export async function annotatePing(admin, reservation, { mode = null, durationMs = null } = {}) {
  if (!reservation?.ok || !reservation.id) return { ok: false, skipped: true };
  const patch = {};
  if (mode === 'quick' || mode === 'standard' || mode === 'deep') patch.mode = mode;
  const ms = durationMs == null ? Number.NaN : Number(durationMs);
  if (Number.isFinite(ms) && ms >= 0) patch.duration_ms = Math.min(2_147_483_647, Math.round(ms));
  if (!Object.keys(patch).length) return { ok: false, skipped: true };
  try {
    /* Query builders are thenables without .catch: wrap them. */
    const { error } = await Promise.resolve(
      admin.from('sonar_queries').update(patch).eq('id', reservation.id),
    );
    if (error) {
      if (!MISSING_COLUMN.has(error.code))
        console.warn('[sonar-quota] annotate skipped', error.code);
      return { ok: false, skipped: true };
    }
    return { ok: true };
  } catch {
    return { ok: false, skipped: true };
  }
}

/* The ledger versions a deep run may supersede: a landing ping (guest or
   member) and a standard research run. Never a deep run. */
const SUPERSEDABLE = (version) =>
  version === 'guest' ||
  version === 'member' ||
  String(version || '').startsWith('research:standard:');

/**
 * Choosing deep research while a standard answer is still running cancels
 * that answer, and it must cost nothing: release the caller's most recent
 * ledger row for the same question (landing ping or standard research run,
 * reserved or already completed by a server that had not seen the cancel
 * yet) from the last few minutes. Scoped to the caller's own rows (user_id,
 * or ip_hash for a guest) because this runs on the service role. At most one
 * row. Never throws.
 * @returns {Promise<{ released: boolean, id?: string, version?: string }>}
 */
export async function releaseSupersededPing(
  admin,
  { userId = null, ipHash = null, query, withinMs = 5 * 60_000, now = Date.now() } = {},
) {
  const text = String(query || '').slice(0, 600);
  if ((!userId && !ipHash) || text.length < 2) return { released: false };
  try {
    const scope = (q) =>
      userId ? q.eq('user_id', userId) : q.is('user_id', null).eq('ip_hash', ipHash);
    const { data, error } = await Promise.resolve(
      scope(admin.from('sonar_queries').select('id, version, status'))
        .eq('query_text', text)
        .gte('created_at', new Date(now - withinMs).toISOString())
        .order('created_at', { ascending: false })
        .limit(5),
    );
    if (error) return { released: false };
    const row = (data || []).find((r) => SUPERSEDABLE(r.version));
    if (!row) return { released: false };
    const del = await Promise.resolve(scope(admin.from('sonar_queries').delete()).eq('id', row.id));
    if (del?.error) return { released: false };
    return { released: true, id: row.id, version: row.version };
  } catch {
    return { released: false };
  }
}

/**
 * Sonar for organizations (Nov 2026): an org member's deep research run is
 * reserved against the org's pooled monthly budget
 * (reserve_sonar_ping_org_deep), not the member's own daily deep cap.
 * Refusals: 'org_pool' (the month's pool is used), 'org_allocation' (the
 * member's allocation is used), 'quota', 'global', 'not_member'.
 * Until the function is deployed, falls back to the member's own deep cap
 * (reservePing with deepLimit), so shipping the code first changes nothing.
 *
 * @param {object} admin
 * @param {{ userId: string, orgId: string, limit?: number|null, globalLimit?: number,
 *   query: string, version: string, planTier?: number, defaultPool: number,
 *   fallbackDeepLimit?: number|null }} opts
 * @returns {Promise<{ ok: boolean, id?: string|null, reason?: string, used: number,
 *   pool?: number|null, orgUsed?: number|null, allocation?: number|null, pooled?: boolean }>}
 */
export async function reserveOrgDeep(
  admin,
  {
    userId,
    orgId,
    limit = null,
    globalLimit = globalDailyCap(),
    query,
    version,
    planTier = 0,
    defaultPool,
    fallbackDeepLimit = null,
  },
) {
  const { data, error } = await admin.rpc('reserve_sonar_ping_org_deep', {
    p_user: userId,
    p_org: orgId,
    p_limit: limit,
    p_global_limit: globalLimit,
    p_query: String(query || '').slice(0, 600),
    p_version: version || null,
    p_plan_tier: planTier ?? 0,
    p_default_pool: defaultPool,
  });
  if (error) {
    if (MISSING_FN.has(error.code)) {
      const r = await reservePing(admin, {
        userId,
        limit,
        globalLimit,
        query,
        version,
        planTier,
        deepLimit: fallbackDeepLimit,
      });
      return { ...r, pooled: false };
    }
    console.error('[sonar-quota] org deep reserve failed:', error.message);
    return { ok: false, reason: 'error', used: 0 };
  }
  const row = Array.isArray(data) ? data[0] : data;
  const out = {
    used: row?.used ?? 0,
    pool: row?.pool ?? null,
    orgUsed: row?.org_used ?? null,
    allocation: row?.allocation ?? null,
    pooled: true,
  };
  if (!row?.id) return { ok: false, reason: row?.reason || 'quota', ...out };
  return { ok: true, id: row.id, ...out };
}
