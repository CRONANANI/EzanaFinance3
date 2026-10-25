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
    const { count } = await admin
      .from('sonar_queries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since);
    used = count || 0;
  } else if (ipHash && ipLimit != null) {
    const { count } = await admin
      .from('sonar_queries')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since);
    used = count || 0;
  }
  const cap = userId ? limit : ipLimit;
  if (cap != null && used >= cap) return { ok: false, reason: 'quota', used };
  return { ok: true, id: null, used, legacy: true };
}

/**
 * @returns {Promise<{ ok: boolean, id?: string|null, reason?: 'quota'|'global', used: number, legacy?: boolean, row?: object }>}
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
  },
) {
  const { data, error } = await admin.rpc('reserve_sonar_ping', {
    p_user: userId,
    p_limit: limit,
    p_global_limit: globalLimit,
    p_ip_hash: ipHash,
    p_ip_limit: ipLimit,
    p_query: String(query || '').slice(0, 300),
    p_version: version || null,
    p_plan_tier: planTier ?? 0,
    p_is_guest: Boolean(isGuest),
  });
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
