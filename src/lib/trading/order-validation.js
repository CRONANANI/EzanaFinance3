/**
 * Real-money order and transfer validation (security assessment F-17).
 *
 * Every route that places a live Alpaca order or moves money runs its input
 * through these before anything reaches the broker:
 *   - enums for side, type and time in force;
 *   - a symbol pattern;
 *   - exactly one of qty / notional, positive and finite, with per-order caps;
 *   - the prices each order type needs, positive and bounded;
 *   - per-transfer amount cap and two-decimal amounts;
 *   - per-user velocity caps (orders a minute and a day; transfers a day and
 *     total transfer dollars a day).
 *
 * Caps come from env so ops can tighten them without a deploy:
 *   TRADING_MAX_ORDER_NOTIONAL   (USD, default 25000)
 *   TRADING_MAX_ORDER_QTY        (shares, default 10000)
 *   TRADING_MAX_ORDERS_PER_MIN   (default 10)
 *   TRADING_MAX_ORDERS_PER_DAY   (default 200)
 *   TRADING_MAX_TRANSFER         (USD per transfer, default 50000)
 *   TRADING_MAX_TRANSFERS_PER_DAY (default 5)
 *   TRADING_MAX_TRANSFER_DAILY   (USD per user per day, default 100000)
 */

export const SIDES = ['buy', 'sell'];
export const ORDER_TYPES = ['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'];
export const TIME_IN_FORCE = ['day', 'gtc', 'opg', 'cls', 'ioc', 'fok'];
export const DIRECTIONS = ['INCOMING', 'OUTGOING'];
export const SYMBOL_RE = /^[A-Z][A-Z0-9.]{0,9}(\/[A-Z]{2,5})?$/;
const MAX_PRICE = 1_000_000;

function envNum(name, fallback) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export function tradingLimits() {
  return {
    maxOrderNotional: envNum('TRADING_MAX_ORDER_NOTIONAL', 25_000),
    maxOrderQty: envNum('TRADING_MAX_ORDER_QTY', 10_000),
    maxOrdersPerMin: envNum('TRADING_MAX_ORDERS_PER_MIN', 10),
    maxOrdersPerDay: envNum('TRADING_MAX_ORDERS_PER_DAY', 200),
    maxTransfer: envNum('TRADING_MAX_TRANSFER', 50_000),
    maxTransfersPerDay: envNum('TRADING_MAX_TRANSFERS_PER_DAY', 5),
    maxTransferDaily: envNum('TRADING_MAX_TRANSFER_DAILY', 100_000),
  };
}

const fail = (error) => ({ ok: false, error });

/** Positive finite number from a number or numeric string, else null. */
function positive(v) {
  if (v == null || v === '' || typeof v === 'boolean') return null;
  if (typeof v !== 'number' && !(typeof v === 'string' && /^\s*\d*\.?\d+\s*$/.test(v))) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const present = (v) => v != null && v !== '';

/**
 * Validate an order body. Accepts camelCase (TradeTicket) and snake_case.
 * @returns {{ok: true, order: object} | {ok: false, error: string}}
 */
export function validateOrder(body, limits = tradingLimits()) {
  if (!body || typeof body !== 'object') return fail('Invalid order');
  const symbol = typeof body.symbol === 'string' ? body.symbol.trim().toUpperCase() : '';
  if (!SYMBOL_RE.test(symbol)) return fail('Invalid symbol');

  const side = String(body.side ?? '').toLowerCase();
  if (!SIDES.includes(side)) return fail('side must be buy or sell');

  const type = String(body.type ?? 'market').toLowerCase();
  if (!ORDER_TYPES.includes(type)) return fail('Unsupported order type');

  const tif = String(body.timeInForce ?? body.time_in_force ?? 'day').toLowerCase();
  if (!TIME_IN_FORCE.includes(tif)) return fail('Unsupported time in force');

  const hasQty = present(body.qty);
  const hasNotional = present(body.notional);
  if (hasQty === hasNotional) return fail('Provide exactly one of qty or notional');

  const order = { symbol, side, type, time_in_force: tif };
  const price = (v, name) => {
    if (!present(v)) return { missing: true };
    const n = positive(v);
    if (n == null || n > MAX_PRICE) return { error: `Invalid ${name}` };
    return { value: n };
  };
  const limit = price(body.limitPrice ?? body.limit_price, 'limit price');
  const stop = price(body.stopPrice ?? body.stop_price, 'stop price');
  const trail = price(body.trailPercent ?? body.trail_percent, 'trail percent');
  for (const p of [limit, stop, trail]) if (p.error) return fail(p.error);

  if ((type === 'limit' || type === 'stop_limit') && limit.missing)
    return fail('limit price is required for this order type');
  if ((type === 'stop' || type === 'stop_limit') && stop.missing)
    return fail('stop price is required for this order type');
  if (type === 'trailing_stop' && trail.missing)
    return fail('trail percent is required for trailing stops');
  if (type === 'trailing_stop' && trail.value > 50) return fail('Invalid trail percent');
  if (!limit.missing) order.limit_price = String(limit.value);
  if (!stop.missing) order.stop_price = String(stop.value);
  if (!trail.missing) order.trail_percent = String(trail.value);

  if (hasNotional) {
    const n = positive(body.notional);
    if (n == null) return fail('Invalid notional');
    const cents = Math.round(n * 100) / 100;
    if (cents < 1) return fail('Minimum order is $1');
    if (cents > limits.maxOrderNotional)
      return fail(`Orders are limited to $${limits.maxOrderNotional.toLocaleString('en-US')}`);
    order.notional = cents.toFixed(2);
  } else {
    const q = positive(body.qty);
    if (q == null) return fail('Invalid qty');
    if (q > limits.maxOrderQty)
      return fail(`Orders are limited to ${limits.maxOrderQty.toLocaleString('en-US')} shares`);
    if (!/^\d+(\.\d{1,9})?$/.test(String(q))) return fail('qty has too many decimals');
    /* A priced order's size is known up front; cap it like a notional one. */
    const ref = limit.value ?? stop.value;
    if (ref != null && q * ref > limits.maxOrderNotional)
      return fail(`Orders are limited to $${limits.maxOrderNotional.toLocaleString('en-US')}`);
    order.qty = String(q);
  }
  return { ok: true, order };
}

/**
 * Validate a transfer request.
 * @returns {{ok: true, transfer: {amount: number, direction: string, relationshipId: string}} | {ok: false, error: string}}
 */
export function validateTransfer(body, limits = tradingLimits()) {
  if (!body || typeof body !== 'object') return fail('Invalid transfer');
  const relationshipId = typeof body.relationshipId === 'string' ? body.relationshipId.trim() : '';
  if (!/^[A-Za-z0-9-]{8,64}$/.test(relationshipId)) return fail('relationshipId required');
  const direction = String(body.direction ?? 'INCOMING').toUpperCase();
  if (!DIRECTIONS.includes(direction)) return fail('Invalid direction');
  const raw = positive(body.amount);
  if (raw == null) return fail('amount required');
  const amount = Math.round(raw * 100) / 100;
  if (Math.abs(amount - raw) > 1e-9) return fail('amount has too many decimals');
  if (amount < 1) return fail('Minimum transfer is $1');
  if (amount > limits.maxTransfer)
    return fail(`Transfers are limited to $${limits.maxTransfer.toLocaleString('en-US')}`);
  return { ok: true, transfer: { amount, direction, relationshipId } };
}

const DAY_MS = 86_400_000;

/**
 * Per-user order velocity. Uses the shared atomic limiter (fails closed), so
 * a burst of parallel submits cannot all pass.
 * @returns {Promise<string|null>} an error message when over the cap.
 */
export async function checkOrderVelocity(userId, { checkRateLimit, limits = tradingLimits() }) {
  const minute = await checkRateLimit(`trade-min:${userId}`, limits.maxOrdersPerMin, 60_000, {
    failClosed: true,
  });
  if (!minute.allowed)
    return minute.degraded ? 'Trading is briefly unavailable' : 'Too many orders; wait a minute';
  const day = await checkRateLimit(`trade-day:${userId}`, limits.maxOrdersPerDay, DAY_MS, {
    failClosed: true,
  });
  if (!day.allowed)
    return day.degraded ? 'Trading is briefly unavailable' : 'Daily order limit reached';
  return null;
}

/**
 * Per-user transfer velocity: a count cap on the atomic limiter plus a
 * dollar cap over the last 24 hours of this user's transfers (failed submits
 * excluded). A replay of an existing Idempotency-Key skips the checks.
 */
export async function checkTransferVelocity(
  admin,
  { userId, idempotencyKey, amount },
  { checkRateLimit, limits = tradingLimits(), now = Date.now() },
) {
  const { data: existing, error: exErr } = await admin
    .from('alpaca_transfers')
    .select('id')
    .eq('idempotency_key', `${userId}:${idempotencyKey}`)
    .maybeSingle();
  if (exErr) return 'Transfers are briefly unavailable';
  if (existing) return null;

  const since = new Date(now - DAY_MS).toISOString();
  const { data: recent, error } = await admin
    .from('alpaca_transfers')
    .select('amount, status')
    .eq('user_id', userId)
    .gte('created_at', since);
  if (error) return 'Transfers are briefly unavailable';
  const total = (recent || [])
    .filter((r) => r.status !== 'submit_failed')
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  if (total + amount > limits.maxTransferDaily)
    return `Daily transfer limit is $${limits.maxTransferDaily.toLocaleString('en-US')}`;

  const count = await checkRateLimit(`transfer-day:${userId}`, limits.maxTransfersPerDay, DAY_MS, {
    failClosed: true,
  });
  if (!count.allowed)
    return count.degraded ? 'Transfers are briefly unavailable' : 'Daily transfer count reached';
  return null;
}
