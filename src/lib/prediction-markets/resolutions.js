/**
 * Resolved outcomes for prediction markets (Nov 2026).
 *
 * The index crons (index-prediction-markets for Polymarket, index-kalshi)
 * delete a closed market from prediction_market_index about 30 days after
 * its end date. Before that delete, this module stores the market's
 * resolution in prediction_market_resolutions (market id, platform, question,
 * outcome, resolved price, resolved date), so the prediction analyst can
 * measure calibration (brierScore) on markets that have settled.
 *
 * The outcome comes from the platform when it answers (Gamma for Polymarket,
 * the Kalshi markets endpoint), else from the last price we stored when it
 * sits at a clear extreme, else it is recorded as unknown. `outcome_source`
 * says which, and `resolved_price` is set only for a platform resolution.
 *
 * Server only (service role). Fails soft: before the table exists the archive
 * is skipped quietly and the delete runs exactly as before. Once it exists,
 * only rows that were archived are deleted, so nothing is lost to a capped
 * read; the rest are archived and deleted on the next run.
 */

const GAMMA_BASE = 'https://gamma-api.polymarket.com';
const KALSHI_BASE = 'https://external-api.kalshi.com/trade-api/v2';

export const RESOLUTIONS_TABLE = 'prediction_market_resolutions';
export const OUTCOMES = ['yes', 'no', 'split', 'unknown'];
export const OUTCOME_SOURCES = ['platform', 'last_price', 'none'];

/* A last stored price at or beyond these reads as a settled market. */
export const LAST_PRICE_YES = 0.98;
export const LAST_PRICE_NO = 0.02;

const PAGE = 1000; // PostgREST max rows per read
const MAX_ROWS = 3000; // rows archived per run (the rest wait for the next run)
const LOOKUP_CHUNK = 50; // ids per platform request
const MAX_LOOKUPS = 6; // platform requests per run
const WRITE_CHUNK = 500;
const DELETE_CHUNK = 200;

const INDEX_COLS =
  'market_id, platform, question, event_key, event_title, outcome_label, category, probability, end_date';

const MISSING = new Set(['42P01', 'PGRST205']);
export const isMissingTable = (error) => Boolean(error && MISSING.has(error.code));

let warnedMissing = false;

const num = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const unit = (v) => {
  const n = num(v);
  return n != null && n >= 0 && n <= 1 ? n : null;
};
const iso = (v) => {
  if (v == null || v === '') return null;
  const d = new Date(typeof v === 'number' && v < 1e12 ? v * 1000 : v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

function parsePrices(raw) {
  let arr = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(arr) || arr.length < 2) return null;
  const p = arr.map(Number);
  return p.every(Number.isFinite) ? p : null;
}

/**
 * A platform market -> { outcome, resolvedPrice, resolvedAt } when it has
 * settled, else null. YES is outcome 0 on Polymarket, as in the index.
 */
export function resolutionFromPlatform(platform, m) {
  if (!m || typeof m !== 'object') return null;
  if (platform === 'polymarket') {
    const settled =
      m.closed === true || String(m.umaResolutionStatus || '').toLowerCase() === 'resolved';
    const p = parsePrices(m.outcomePrices);
    if (!settled || !p) return null;
    const resolvedAt = iso(m.closedTime) || iso(m.umaEndDate) || iso(m.endDate);
    if (p[0] === 1 && p[1] === 0) return { outcome: 'yes', resolvedPrice: 1, resolvedAt };
    if (p[0] === 0 && p[1] === 1) return { outcome: 'no', resolvedPrice: 0, resolvedAt };
    if (p[0] === 0.5 && p[1] === 0.5) return { outcome: 'split', resolvedPrice: 0.5, resolvedAt };
    return null;
  }
  if (platform === 'kalshi') {
    const result = String(m.result || '').toLowerCase();
    const resolvedAt = iso(m.settlement_ts) || iso(m.expiration_time) || iso(m.close_time) || null;
    if (result === 'yes') return { outcome: 'yes', resolvedPrice: 1, resolvedAt };
    if (result === 'no') return { outcome: 'no', resolvedPrice: 0, resolvedAt };
    if (result === 'scalar') {
      const v = unit(m.settlement_value_dollars);
      return v == null ? null : { outcome: 'split', resolvedPrice: v, resolvedAt };
    }
    return null;
  }
  return null;
}

/** The resolution row for one index row, given the platform's answer (or null). */
export function buildResolution(row, platformResolution = null, now = new Date()) {
  const last = unit(row?.probability);
  let outcome = 'unknown';
  let source = 'none';
  let resolvedPrice = null;
  let resolvedAt = null;
  if (platformResolution) {
    outcome = platformResolution.outcome;
    source = 'platform';
    resolvedPrice = platformResolution.resolvedPrice;
    resolvedAt = platformResolution.resolvedAt;
  } else if (last != null && last >= LAST_PRICE_YES) {
    outcome = 'yes';
    source = 'last_price';
  } else if (last != null && last <= LAST_PRICE_NO) {
    outcome = 'no';
    source = 'last_price';
  }
  return {
    market_id: String(row.market_id),
    platform: String(row.platform),
    question: String(row.question || '').slice(0, 1000),
    event_key: row.event_key || null,
    event_title: row.event_title || null,
    outcome_label: row.outcome_label || null,
    category: row.category || null,
    outcome,
    outcome_source: source,
    resolved_price: resolvedPrice,
    last_price: last,
    end_date: iso(row.end_date),
    resolved_at: resolvedAt || iso(row.end_date),
    recorded_at: now.toISOString(),
  };
}

const chunks = (list, n) => {
  const out = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
};

async function getJson(fetchImpl, url) {
  const res = await fetchImpl(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

/**
 * Ask the platform how the markets settled. Returns Map(market_id ->
 * resolution). Bounded (MAX_LOOKUPS requests); a failed request only means
 * those markets fall back to the last price.
 */
export async function fetchPlatformResolutions(platform, marketIds, fetchImpl = fetch) {
  const out = new Map();
  if (typeof fetchImpl !== 'function' || !marketIds.length) return out;
  const groups = chunks(marketIds, LOOKUP_CHUNK).slice(0, MAX_LOOKUPS);
  for (const ids of groups) {
    try {
      if (platform === 'polymarket') {
        const params = new URLSearchParams({ closed: 'true', limit: String(ids.length) });
        for (const id of ids) params.append('id', id);
        // eslint-disable-next-line no-await-in-loop
        const json = await getJson(fetchImpl, `${GAMMA_BASE}/markets?${params}`);
        const list = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
        for (const m of list) {
          const id = String(m?.id ?? '');
          const r = resolutionFromPlatform('polymarket', m);
          if (id && r && ids.includes(id)) out.set(id, r);
        }
      } else if (platform === 'kalshi') {
        const tickers = ids.map((id) => id.replace(/^kalshi:/, ''));
        const params = new URLSearchParams({
          tickers: tickers.join(','),
          limit: String(tickers.length),
        });
        // eslint-disable-next-line no-await-in-loop
        const json = await getJson(fetchImpl, `${KALSHI_BASE}/markets?${params}`);
        for (const m of Array.isArray(json?.markets) ? json.markets : []) {
          const id = `kalshi:${m?.ticker || ''}`;
          const r = resolutionFromPlatform('kalshi', m);
          if (m?.ticker && r && ids.includes(id)) out.set(id, r);
        }
      }
    } catch {
      /* fall back to the last stored price for this group */
    }
  }
  return out;
}

/**
 * Archive, then prune, the platform's markets that ended before `cutoffIso`.
 * Replaces the crons' bare delete. Returns { pruned, archived, skipped, errors }.
 *   skipped: 'table_missing' when the resolutions table is not there yet
 *            (the delete then runs as before).
 */
export async function archiveAndPrune(admin, platform, cutoffIso, opts = {}) {
  const { fetchImpl = fetch, now = new Date() } = opts;
  const errors = [];

  /* 1) the rows about to be pruned, newest first, capped per run */
  const rows = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('prediction_market_index')
      .select(INDEX_COLS)
      .eq('platform', platform)
      .lt('end_date', cutoffIso)
      .order('end_date', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) {
      errors.push(`resolutions read: ${error.message}`);
      return { pruned: 0, archived: 0, skipped: 'read_failed', errors };
    }
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  if (!rows.length) return { pruned: 0, archived: 0, skipped: null, errors };

  /* 2) is the table there? A one-row read answers without writing. */
  const probe = await admin.from(RESOLUTIONS_TABLE).select('market_id').limit(1);
  if (probe.error && isMissingTable(probe.error)) {
    if (!warnedMissing) {
      warnedMissing = true;
      console.warn(
        `[prediction-markets] ${RESOLUTIONS_TABLE} is not installed yet; pruning without archiving`,
      );
    }
    const { count, error } = await admin
      .from('prediction_market_index')
      .delete({ count: 'exact' })
      .eq('platform', platform)
      .lt('end_date', cutoffIso);
    if (error) errors.push(`prune: ${error.message}`);
    return { pruned: count || 0, archived: 0, skipped: 'table_missing', errors };
  }

  /* 3) resolutions: the platform's answer, else the last stored price */
  const platformRes = await fetchPlatformResolutions(
    platform,
    rows.map((r) => String(r.market_id)),
    fetchImpl,
  ).catch(() => new Map());
  const out = rows.map((r) => buildResolution(r, platformRes.get(String(r.market_id)), now));

  /* 4) write; a failed write keeps the index rows for the next run */
  const archivedIds = [];
  for (const part of chunks(out, WRITE_CHUNK)) {
    // eslint-disable-next-line no-await-in-loop
    const { error } = await admin.from(RESOLUTIONS_TABLE).upsert(part, { onConflict: 'market_id' });
    if (error) {
      errors.push(`resolutions write: ${error.message}`);
      continue;
    }
    archivedIds.push(...part.map((r) => r.market_id));
  }

  /* 5) delete only what was archived */
  let pruned = 0;
  for (const ids of chunks(archivedIds, DELETE_CHUNK)) {
    // eslint-disable-next-line no-await-in-loop
    const { count, error } = await admin
      .from('prediction_market_index')
      .delete({ count: 'exact' })
      .eq('platform', platform)
      .in('market_id', ids);
    if (error) errors.push(`prune: ${error.message}`);
    else pruned += count || 0;
  }
  return { pruned, archived: archivedIds.length, skipped: null, errors };
}
