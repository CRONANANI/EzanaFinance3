/**
 * Idempotent real-money writes to Alpaca (reliability audit P0, items 1-2).
 *
 * The pattern, for orders and ACH transfers alike:
 *   1. the client sends an `Idempotency-Key` (a UUID, one per submit);
 *   2. a local row is claimed FIRST, under a unique key derived from the user
 *      and that idempotency key; a second request with the same key finds the
 *      row and never reaches Alpaca;
 *   3. only the claimer calls Alpaca (orders carry `client_order_id`, so even
 *      a retry Alpaca already saw is refused there too);
 *   4. the row is updated with the outcome. A definite rejection (4xx) marks
 *      it `submit_failed`; anything ambiguous (timeout, network, 5xx) leaves it
 *      `pending_submit` for the reconcile cron, because the order may exist.
 *
 * No Next.js imports: route handlers pass in the admin client and the Alpaca
 * caller, so scripts/check-trading-idempotency.mjs drives this with mocks.
 */
import { createHash } from 'node:crypto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNIQUE_VIOLATION = '23505';

/** Alpaca's client_order_id limit is 128 chars on the current API and was 48
    on older docs; stay under the smaller one. */
export const CLIENT_ORDER_ID_MAX = 48;

export function readIdempotencyKey(request) {
  const raw = request?.headers?.get?.('idempotency-key');
  const key = raw ? String(raw).trim() : '';
  return UUID_RE.test(key) ? key.toLowerCase() : null;
}

/** Deterministic, opaque and short: "ez-" + 40 hex of sha256(user:key). */
export function clientOrderId(userId, key) {
  const h = createHash('sha256').update(`${userId}:${key}`).digest('hex').slice(0, 40);
  return `ez-${h}`;
}

/** 4xx (except 408/409/429) means Alpaca refused it; no order exists. */
export function isDefiniteRejection(err) {
  const s = Number(err?.status);
  return Number.isFinite(s) && s >= 400 && s < 500 && ![408, 409, 429].includes(s);
}

function dbError(error, what) {
  const e = new Error(`${what}: ${error.message || error.code || 'database error'}`);
  e.status = 500;
  e.cause = error;
  return e;
}

/**
 * Place an order once per idempotency key.
 * deps: { admin, alpaca: { post(path, body), get(path) } }
 * Returns { order, row, replay }.
 */
export async function placeOrderOnce(
  { admin, alpaca },
  { userId, accountId, idempotencyKey, orderBody },
) {
  const coid = clientOrderId(userId, idempotencyKey);
  const claim = await admin
    .from('trade_history')
    .insert({
      user_id: userId,
      client_order_id: coid,
      alpaca_account_id: accountId,
      symbol: orderBody.symbol,
      side: orderBody.side,
      qty: orderBody.qty ?? null,
      notional: orderBody.notional ?? null,
      order_type: orderBody.type,
      status: 'pending_submit',
    })
    .select('id')
    .single();

  if (claim.error) {
    if (claim.error.code !== UNIQUE_VIOLATION) throw dbError(claim.error, 'trade_history claim');
    const { data: existing, error } = await admin
      .from('trade_history')
      .select('*')
      .eq('client_order_id', coid)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw dbError(error, 'trade_history lookup');
    return { order: null, row: existing, replay: true };
  }

  const rowId = claim.data.id;
  let order;
  try {
    order = await alpaca.post(`/v1/trading/accounts/${accountId}/orders`, {
      ...orderBody,
      client_order_id: coid,
    });
  } catch (err) {
    if (isDefiniteRejection(err)) {
      const { error } = await admin
        .from('trade_history')
        .update({
          status: 'submit_failed',
          error_message: String(err.message || 'rejected').slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('id', rowId);
      if (error) console.error('[trading] submit_failed update:', error.message);
    }
    /* Ambiguous failures stay pending_submit; reconcile-alpaca-orders
       looks the order up by client_order_id. */
    throw err;
  }

  const { data: row, error } = await admin
    .from('trade_history')
    .update({
      alpaca_order_id: order.id,
      status: order.status || 'accepted',
      qty: order.qty != null ? String(order.qty) : (orderBody.qty ?? null),
      notional: order.notional != null ? String(order.notional) : (orderBody.notional ?? null),
      submitted_at: order.submitted_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', rowId)
    .select('*')
    .single();
  /* The order exists at Alpaca. A failed local update must not report the
     order as failed (the user would retry); reconcile repairs the row. */
  if (error) console.error('[trading] order row update failed; reconcile will repair:', error);
  return { order, row: row || null, replay: false };
}

/**
 * Start an ACH transfer once per idempotency key (alpaca_transfers).
 * Alpaca's transfer API has no idempotency key, so the local claim row is
 * the guard and reconcile matches stuck rows by amount and direction.
 */
export async function createTransferOnce(
  { admin, alpaca },
  { userId, accountId, idempotencyKey, relationshipId, amount, direction },
) {
  const claim = await admin
    .from('alpaca_transfers')
    .insert({
      user_id: userId,
      idempotency_key: `${userId}:${idempotencyKey}`,
      alpaca_account_id: accountId,
      relationship_id: relationshipId,
      amount,
      direction,
      status: 'pending_submit',
    })
    .select('id')
    .single();

  if (claim.error) {
    if (claim.error.code !== UNIQUE_VIOLATION) throw dbError(claim.error, 'alpaca_transfers claim');
    const { data: existing, error } = await admin
      .from('alpaca_transfers')
      .select('*')
      .eq('idempotency_key', `${userId}:${idempotencyKey}`)
      .maybeSingle();
    if (error) throw dbError(error, 'alpaca_transfers lookup');
    return { transfer: null, row: existing, replay: true };
  }

  const rowId = claim.data.id;
  let transfer;
  try {
    transfer = await alpaca.post(`/v1/accounts/${accountId}/transfers`, {
      transfer_type: 'ach',
      relationship_id: relationshipId,
      amount: String(amount),
      direction,
    });
  } catch (err) {
    if (isDefiniteRejection(err)) {
      const { error } = await admin
        .from('alpaca_transfers')
        .update({
          status: 'submit_failed',
          error_message: String(err.message || 'rejected').slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('id', rowId);
      if (error) console.error('[funding] submit_failed update:', error.message);
    }
    throw err;
  }

  const { data: row, error } = await admin
    .from('alpaca_transfers')
    .update({
      alpaca_transfer_id: transfer.id,
      status: transfer.status || 'QUEUED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', rowId)
    .select('*')
    .single();
  if (error) console.error('[funding] transfer row update failed; reconcile will repair:', error);
  return { transfer, row: row || null, replay: false };
}

/* ── reconcile (cron) ─────────────────────────────────────────────────── */

/**
 * Rows stuck in pending_submit for over `olderThanMs`: look each order up by
 * client_order_id. Found -> record it. Alpaca 404 -> it was never placed ->
 * submit_failed. Anything else -> leave it for the next run.
 */
export async function reconcilePendingOrders(
  { admin, alpaca },
  { olderThanMs = 120_000, limit = 100, now = Date.now() } = {},
) {
  const cutoff = new Date(now - olderThanMs).toISOString();
  const { data: rows, error } = await admin
    .from('trade_history')
    .select('id, client_order_id, alpaca_account_id, user_id')
    .eq('status', 'pending_submit')
    .lt('created_at', cutoff)
    .limit(limit);
  if (error) throw dbError(error, 'pending orders');
  const out = { checked: 0, found: 0, failed: 0, skipped: 0 };
  for (const r of rows || []) {
    out.checked += 1;
    if (!r.client_order_id || !r.alpaca_account_id) {
      out.skipped += 1;
      continue;
    }
    let order = null;
    let missing = false;
    try {
      // eslint-disable-next-line no-await-in-loop
      order = await alpaca.get(
        `/v1/trading/accounts/${r.alpaca_account_id}/orders:by_client_order_id?client_order_id=${encodeURIComponent(r.client_order_id)}`,
      );
    } catch (e) {
      if (Number(e?.status) === 404) missing = true;
      else {
        out.skipped += 1;
        continue;
      }
    }
    const patch = missing
      ? { status: 'submit_failed', error_message: 'Not found at Alpaca after submit' }
      : {
          alpaca_order_id: order.id,
          status: order.status || 'accepted',
          submitted_at: order.submitted_at || null,
        };
    // eslint-disable-next-line no-await-in-loop
    const { error: upErr } = await admin
      .from('trade_history')
      .update({ ...patch, updated_at: new Date(now).toISOString() })
      .eq('id', r.id)
      .eq('status', 'pending_submit');
    if (upErr) {
      out.skipped += 1;
      continue;
    }
    if (missing) out.failed += 1;
    else out.found += 1;
  }
  return out;
}

/**
 * Transfers stuck in pending_submit: list the account's transfers and adopt
 * the one with the same relationship, amount and direction created after the
 * claim and not already recorded. None after `giveUpMs` -> submit_failed.
 */
export async function reconcilePendingTransfers(
  { admin, alpaca },
  { olderThanMs = 120_000, giveUpMs = 3_600_000, limit = 50, now = Date.now() } = {},
) {
  const cutoff = new Date(now - olderThanMs).toISOString();
  const { data: rows, error } = await admin
    .from('alpaca_transfers')
    .select('id, alpaca_account_id, relationship_id, amount, direction, created_at')
    .eq('status', 'pending_submit')
    .lt('created_at', cutoff)
    .limit(limit);
  if (error) throw dbError(error, 'pending transfers');
  const out = { checked: 0, found: 0, failed: 0, skipped: 0 };
  for (const r of rows || []) {
    out.checked += 1;
    let list;
    try {
      // eslint-disable-next-line no-await-in-loop
      list = await alpaca.get(`/v1/accounts/${r.alpaca_account_id}/transfers`);
    } catch {
      out.skipped += 1;
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const { data: known } = await admin
      .from('alpaca_transfers')
      .select('alpaca_transfer_id')
      .eq('alpaca_account_id', r.alpaca_account_id)
      .not('alpaca_transfer_id', 'is', null);
    const taken = new Set((known || []).map((k) => k.alpaca_transfer_id));
    const claimedAt = Date.parse(r.created_at) - 5_000;
    const match = (Array.isArray(list) ? list : []).find(
      (t) =>
        !taken.has(t.id) &&
        t.relationship_id === r.relationship_id &&
        String(t.direction).toUpperCase() === String(r.direction).toUpperCase() &&
        Math.abs(Number(t.amount) - Number(r.amount)) < 0.005 &&
        Date.parse(t.created_at) >= claimedAt,
    );
    let patch = null;
    if (match) patch = { alpaca_transfer_id: match.id, status: match.status || 'QUEUED' };
    else if (now - Date.parse(r.created_at) > giveUpMs)
      patch = { status: 'submit_failed', error_message: 'Not found at Alpaca after submit' };
    if (!patch) {
      out.skipped += 1;
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const { error: upErr } = await admin
      .from('alpaca_transfers')
      .update({ ...patch, updated_at: new Date(now).toISOString() })
      .eq('id', r.id)
      .eq('status', 'pending_submit');
    if (upErr) out.skipped += 1;
    else if (match) out.found += 1;
    else out.failed += 1;
  }
  return out;
}

/* ── account creation claim ───────────────────────────────────────────── */

/**
 * Claim the user's brokerage account row before calling Alpaca. Returns
 * { claimed: true, id } for the one request that may create the account, or
 * { claimed: false, existing } for everyone else.
 */
export async function claimBrokerageAccount(admin, userId) {
  const { data, error } = await admin.rpc('claim_brokerage_account', { p_user: userId });
  if (error) throw dbError(error, 'claim_brokerage_account');
  const id = Array.isArray(data) ? data[0]?.id || data[0] : data;
  if (id) return { claimed: true, id: typeof id === 'object' ? id.id : id };
  const { data: existing, error: e2 } = await admin
    .from('brokerage_accounts')
    .select('id, account_status, alpaca_account_number')
    .eq('user_id', userId)
    .maybeSingle();
  if (e2) throw dbError(e2, 'brokerage_accounts lookup');
  return { claimed: false, existing };
}
