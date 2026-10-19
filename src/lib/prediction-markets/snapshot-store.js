/**
 * Snapshot writes and window figures for the prediction market index crons.
 * Server only (service role). Both helpers fail soft: an error is returned in
 * the result and the cron carries on, because a missed snapshot costs one
 * point of history while a failed index run costs the whole page its odds.
 */
import { windowMetrics } from './window-metrics.js';

const RPC_CHUNK = 500;
const INSERT_CHUNK = 500;
export const SNAPSHOT_RETENTION_DAYS = 35;

const WINDOW_KEYS = ['change_7d', 'change_30d', 'volume_7d', 'volume_30d', 'volume_norm'];
/* Columns added by 20261019130000_prediction_market_snapshots.sql. */
export const PENDING_COLUMNS = ['tag_ids', ...WINDOW_KEYS];

/* PGRST202: PostgREST cannot find the function. 42883: Postgres undefined_function. */
function isMissingFunction(error) {
  return error?.code === 'PGRST202' || error?.code === '42883';
}

/**
 * Before the migration is applied the new columns do not exist, and PostgREST
 * rejects a whole batch for one unknown column. Strip them so the index keeps
 * updating; the next run after the migration writes them.
 */
function stripPendingColumns(rows) {
  for (const r of rows) for (const k of PENDING_COLUMNS) delete r[k];
}

/**
 * Sets change_7d, change_30d, volume_7d, volume_30d and volume_norm on each
 * row in place (null when the history does not reach back far enough).
 * Rows need market_id, probability and volume. Returns { ok, migrated, error }.
 * When the migration has not been applied yet (migrated: false) the new
 * columns, tag_ids included, are removed from the rows instead.
 */
export async function attachWindowMetrics(admin, rows, now = new Date()) {
  for (const r of rows) for (const k of WINDOW_KEYS) r[k] = null;
  const ids = rows.map((r) => r.market_id);
  const byId = new Map();
  try {
    for (let i = 0; i < ids.length; i += RPC_CHUNK) {
      // eslint-disable-next-line no-await-in-loop
      const { data, error } = await admin.rpc('pm_window_baselines', {
        p_ids: ids.slice(i, i + RPC_CHUNK),
        p_now: new Date(now).toISOString(),
      });
      if (error && isMissingFunction(error)) {
        stripPendingColumns(rows);
        return { ok: false, migrated: false, error: 'window baselines: migration not applied' };
      }
      if (error) throw new Error(error.message);
      for (const b of data || []) byId.set(b.market_id, b);
    }
  } catch (e) {
    return { ok: false, migrated: true, error: `window baselines: ${e?.message || e}` };
  }
  for (const r of rows) {
    const b = byId.get(r.market_id);
    if (!b) continue;
    Object.assign(
      r,
      windowMetrics(
        {
          current: { probability: r.probability, volume: r.volume },
          base7: b.b7_at
            ? { probability: b.b7_probability, volume: b.b7_volume, captured_at: b.b7_at }
            : null,
          base30: b.b30_at
            ? { probability: b.b30_probability, volume: b.b30_volume, captured_at: b.b30_at }
            : null,
          earliest: b.first_at ? { volume: b.first_volume, captured_at: b.first_at } : null,
        },
        now,
      ),
    );
  }
  return { ok: true, migrated: true, error: null };
}

/**
 * One snapshot per upserted market at `stamp`, then prune this platform's
 * snapshots older than the retention window. Returns { written, pruned, errors }.
 */
export async function writeSnapshots(admin, platform, rows, stamp) {
  const errors = [];
  let written = 0;
  let pruned = 0;
  const snaps = rows
    .filter((r) => r.market_id && r.platform === platform)
    .map((r) => ({
      market_id: r.market_id,
      platform,
      captured_at: stamp,
      probability: r.probability ?? null,
      volume: r.volume ?? null,
      volume_24h: r.volume_24h ?? null,
      best_bid: r.best_bid ?? null,
      best_ask: r.best_ask ?? null,
      liquidity: r.liquidity ?? null,
    }));
  for (let i = 0; i < snaps.length; i += INSERT_CHUNK) {
    // eslint-disable-next-line no-await-in-loop
    const { error } = await admin
      .from('prediction_market_snapshots')
      .upsert(snaps.slice(i, i + INSERT_CHUNK), {
        onConflict: 'market_id,captured_at',
        ignoreDuplicates: true,
      });
    if (error) errors.push(`snapshot insert @${i}: ${error.message}`);
    else written += Math.min(INSERT_CHUNK, snaps.length - i);
  }
  try {
    const cutoff = new Date(
      new Date(stamp).getTime() - SNAPSHOT_RETENTION_DAYS * 86400000,
    ).toISOString();
    const { count, error } = await admin
      .from('prediction_market_snapshots')
      .delete({ count: 'exact' })
      .eq('platform', platform)
      .lt('captured_at', cutoff);
    if (error) throw new Error(error.message);
    pruned = count || 0;
  } catch (e) {
    errors.push(`snapshot prune: ${e?.message || e}`);
  }
  return { written, pruned, errors };
}
