/**
 * Sonar research engine: shared cache (engine v3, Section 12).
 *
 * Two tiers. L1 is a small in-process map (free, per instance, gone on a cold
 * start). L2 is the Supabase table `sonar_cache` (key, value jsonb,
 * expires_at), shared by every serverless instance, so a market-data call or
 * a resolver answer made by one instance serves the next. No new
 * infrastructure: it is one table in the database Sonar already uses. If
 * latency on L2 ever matters more than cost, the same two functions can be
 * pointed at Upstash Redis without touching a caller.
 *
 * Fail-soft: any L2 error reads as a miss and a skipped write. Values must be
 * JSON. Never cache user-specific data here: keys are global.
 */
import { BoundedMap } from '@/lib/bounded-map';

const L1 = new BoundedMap(500);
const L2_TIMEOUT_MS = 250;

let adminFactory = null;
/** Injected by the engine (and stubbed by tests): () => supabase admin client. */
export function setCacheClient(factory) {
  adminFactory = factory;
}

/** True once a caller has injected the admin client factory. */
export function hasCacheClient() {
  return Boolean(adminFactory);
}

const race = (p, ms) =>
  Promise.race([p, new Promise((resolve) => setTimeout(() => resolve({ timedOut: true }), ms))]);

/** The cached value, or undefined on a miss. */
export async function cacheGet(key) {
  const hit = L1.get(key);
  if (hit && hit.exp > Date.now()) return hit.value;
  if (!adminFactory) return undefined;
  try {
    const r = await race(
      adminFactory()
        .from('sonar_cache')
        .select('value, expires_at')
        .eq('key', key)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle(),
      L2_TIMEOUT_MS,
    );
    if (r?.timedOut || r?.error || !r?.data) return undefined;
    L1.set(key, { value: r.data.value, exp: new Date(r.data.expires_at).getTime() });
    return r.data.value;
  } catch {
    return undefined;
  }
}

/** Store a value for ttlSeconds. Fire-and-forget on L2. */
export async function cacheSet(key, value, ttlSeconds) {
  const exp = Date.now() + ttlSeconds * 1000;
  L1.set(key, { value, exp });
  if (!adminFactory || value == null) return;
  try {
    await race(
      adminFactory()
        .from('sonar_cache')
        .upsert({ key, value, expires_at: new Date(exp).toISOString() }, { onConflict: 'key' }),
      L2_TIMEOUT_MS,
    );
  } catch {
    /* a failed write is a future miss, nothing more */
  }
}
