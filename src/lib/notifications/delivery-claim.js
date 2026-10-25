/**
 * Batched, claim-first notification delivery (reliability audit P2-14).
 *
 * Instead of one "already delivered?" query per (event x user), the
 * generator claims every candidate in ONE upsert on the existing
 * UNIQUE(user_id, event_fingerprint) of notification_delivery_log with
 * ignoreDuplicates: the rows that come back are the ones this run may send.
 * Concurrent runs therefore cannot both send the same event to a user. A
 * send that fails releases its claim so a later run can retry it.
 */

export const pairKey = (userId, fp) => `${userId}|${fp}`;

/** @returns {Promise<Set<string>>} pairKey()s this run claimed */
export async function claimDeliveries(admin, pairs, { chunk = 500 } = {}) {
  const claimed = new Set();
  for (let i = 0; i < pairs.length; i += chunk) {
    const rows = pairs.slice(i, i + chunk).map((p) => ({
      user_id: p.user_id,
      event_fingerprint: p.event_fingerprint,
    }));
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('notification_delivery_log')
      .upsert(rows, { onConflict: 'user_id,event_fingerprint', ignoreDuplicates: true })
      .select('user_id, event_fingerprint');
    if (error) throw new Error(`delivery claim: ${error.message}`);
    for (const r of data || []) claimed.add(pairKey(r.user_id, r.event_fingerprint));
  }
  return claimed;
}

export async function releaseDelivery(admin, userId, fp) {
  const { error } = await admin
    .from('notification_delivery_log')
    .delete()
    .eq('user_id', userId)
    .eq('event_fingerprint', fp);
  if (error) console.warn('[notifications] release claim failed:', error.message);
}

/** Run `fn` over items with at most `limit` in flight. */
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      // eslint-disable-next-line no-await-in-loop
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}
