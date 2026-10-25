/**
 * Server-authoritative mock (paper) portfolio (QA RET-10).
 *
 * The browser never sends a price, cash balance or portfolio JSON. A trade
 * request names a ticker, a side and a size (dollars or shares); the server
 * quotes the price itself, executes against the cash stored in
 * `mock_portfolios.portfolio`, writes the new portfolio and the `mock_trades`
 * log row, and returns the new portfolio for the page to render.
 *
 * Every write here runs on the service-role client the route passes in, after
 * `withApiGuard` has authenticated the caller; every query is filtered by that
 * caller's user id. `mock_portfolios` / `mock_trades` are owner-SELECT-only
 * under RLS (migration 20261026130000).
 *
 * Pure handlers over a Supabase-like client (scripts/check-retail-qa.mjs
 * drives them with scripts/lib/mock-supabase.mjs). Each returns { status, body }.
 */

export const STARTING_CASH = 100_000;
export const MIN_STARTING_CASH = 1_000;
export const MAX_STARTING_CASH = 10_000_000;
const HISTORY_LIMIT = 100;
const MAX_TRADE_DOLLARS = 100_000_000;
const DUST_QTY = 0.00001;
const CAS_ATTEMPTS = 5;
const UNIQUE_VIOLATION = '23505';
const REQ_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const TICKER_RE = /^[A-Z0-9.^=]{1,15}$/;

export function freshPortfolio(startingCash = STARTING_CASH) {
  return { cash: startingCash, positions: {}, history: [], startingCash };
}

const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

/** Coerce a stored portfolio JSON into the canonical shape (never throws). */
export function normalizePortfolio(raw) {
  if (!raw || typeof raw !== 'object' || Object.keys(raw).length === 0) return freshPortfolio();
  const startingCash = num(raw.startingCash, STARTING_CASH) || STARTING_CASH;
  const positions = {};
  if (raw.positions && typeof raw.positions === 'object' && !Array.isArray(raw.positions)) {
    for (const [sym, p] of Object.entries(raw.positions)) {
      const qty = num(p?.qty);
      if (qty > 0) positions[sym] = { ...p, symbol: p?.symbol || sym, qty };
    }
  }
  return {
    cash: num(raw.cash, startingCash),
    positions,
    history: Array.isArray(raw.history) ? raw.history.slice(0, HISTORY_LIMIT) : [],
    startingCash,
  };
}

/** Validate a trade request. Any client `price`/`total_amount` is ignored. */
export function parseTradeRequest(body) {
  if (!body || typeof body !== 'object') return null;
  const ticker = String(body.ticker || body.symbol || '')
    .trim()
    .toUpperCase();
  if (!TICKER_RE.test(ticker)) return null;
  const sideRaw = body.side || body.trade_type;
  if (sideRaw !== 'buy' && sideRaw !== 'sell') return null;
  const close = body.close === true && sideRaw === 'sell';
  const amount = body.amount != null ? Number(body.amount) : null;
  const quantity = body.quantity != null ? Number(body.quantity) : null;
  if (!close) {
    const hasAmount = amount != null && Number.isFinite(amount) && amount > 0;
    const hasQty = quantity != null && Number.isFinite(quantity) && quantity > 0;
    if (hasAmount === hasQty) return null; // exactly one size
    if (hasAmount && amount > MAX_TRADE_DOLLARS) return null;
  }
  const reqId = body.client_request_id ? String(body.client_request_id) : null;
  return {
    ticker,
    side: sideRaw,
    close,
    amount: close ? null : amount != null && amount > 0 ? amount : null,
    quantity: close ? null : quantity != null && quantity > 0 ? quantity : null,
    name: typeof body.name === 'string' ? body.name.slice(0, 120) : null,
    assetType: typeof body.asset_type === 'string' ? body.asset_type.slice(0, 32) : null,
    client_request_id: reqId && REQ_ID_RE.test(reqId) ? reqId : null,
  };
}

/**
 * Apply one trade at the server price. Returns
 * { ok: true, portfolio, trade: { quantity, total } } or { ok: false, error }.
 */
export function applyTrade(portfolio, req, price, nowIso = new Date().toISOString()) {
  if (!(price > 0)) return { ok: false, error: 'Live price unavailable' };
  const p = normalizePortfolio(portfolio);
  const sym = req.ticker;
  const existing = p.positions[sym];

  if (req.side === 'buy') {
    const total = req.amount != null ? req.amount : req.quantity * price;
    const qty = total / price;
    if (total > p.cash + 1e-6) return { ok: false, error: 'Insufficient funds.' };
    const positions = { ...p.positions };
    if (existing) {
      const newQty = existing.qty + qty;
      positions[sym] = {
        ...existing,
        qty: newQty,
        avgCost: (num(existing.avgCost, price) * existing.qty + price * qty) / newQty,
        currentPrice: price,
      };
    } else {
      positions[sym] = {
        symbol: sym,
        name: req.name || sym,
        type: req.assetType || 'Stock',
        qty,
        avgCost: price,
        currentPrice: price,
        openedAt: nowIso,
      };
    }
    return {
      ok: true,
      portfolio: {
        ...p,
        cash: p.cash - total,
        positions,
        history: [
          { id: Date.parse(nowIso), side: 'buy', symbol: sym, qty, price, total, ts: nowIso },
          ...p.history,
        ].slice(0, HISTORY_LIMIT),
      },
      trade: { quantity: qty, total },
    };
  }

  if (!existing || existing.qty <= 0) return { ok: false, error: `No ${sym} position to sell.` };
  const wanted = req.close
    ? existing.qty
    : req.quantity != null
      ? req.quantity
      : req.amount / price;
  const qty = Math.min(wanted, existing.qty);
  const total = qty * price;
  const positions = { ...p.positions };
  const left = existing.qty - qty;
  if (left < DUST_QTY) delete positions[sym];
  else positions[sym] = { ...existing, qty: left, currentPrice: price };
  return {
    ok: true,
    portfolio: {
      ...p,
      cash: p.cash + total,
      positions,
      history: [
        { id: Date.parse(nowIso), side: 'sell', symbol: sym, qty, price, total, ts: nowIso },
        ...p.history,
      ].slice(0, HISTORY_LIMIT),
    },
    trade: { quantity: qty, total },
  };
}

async function loadRow(admin, userId) {
  return admin
    .from('mock_portfolios')
    .select('portfolio, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
}

/**
 * Compare-and-swap write of the portfolio JSON: succeeds only if the row
 * still carries `prevUpdatedAt` (or, with no row, if the insert wins).
 * Returns { ok, conflict, error, updated_at }.
 */
async function casWrite(admin, userId, prevRow, portfolio) {
  const updated_at = new Date().toISOString();
  if (!prevRow) {
    const { error } = await admin
      .from('mock_portfolios')
      .insert({ user_id: userId, portfolio, updated_at });
    if (error) {
      if (error.code === UNIQUE_VIOLATION) return { ok: false, conflict: true };
      return { ok: false, error };
    }
    return { ok: true, updated_at };
  }
  let q = admin.from('mock_portfolios').update({ portfolio, updated_at }).eq('user_id', userId);
  q = prevRow.updated_at == null ? q : q.eq('updated_at', prevRow.updated_at);
  const { data, error } = await q.select('updated_at');
  if (error) return { ok: false, error };
  if (!Array.isArray(data) || data.length === 0) return { ok: false, conflict: true };
  return { ok: true, updated_at };
}

async function currentPortfolioBody(admin, userId, extra = {}) {
  const { data } = await loadRow(admin, userId);
  return {
    success: true,
    ...extra,
    portfolio: normalizePortfolio(data?.portfolio),
    updated_at: data?.updated_at ?? null,
  };
}

/**
 * POST /api/mock-trades. `deps.getQuote(ticker)` → { price } | null.
 */
export async function executeMockTrade(admin, userId, body, deps) {
  const req = parseTradeRequest(body);
  if (!req) return { status: 400, body: { error: 'Invalid trade request' } };

  if (req.client_request_id) {
    const { data: prior, error: priorErr } = await admin
      .from('mock_trades')
      .select('id, created_at')
      .eq('user_id', userId)
      .eq('client_request_id', req.client_request_id)
      .maybeSingle();
    if (priorErr) return { status: 500, body: { error: priorErr.message } };
    if (prior) {
      return {
        status: 200,
        body: await currentPortfolioBody(admin, userId, { replay: true, id: prior.id }),
      };
    }
  }

  const quote = await deps.getQuote(req.ticker);
  const price = Number(quote?.price);
  if (!(price > 0)) {
    return { status: 503, body: { error: 'Live price unavailable. Try again shortly.' } };
  }

  let claimed = null; // mock_trades row, inserted once to claim client_request_id
  const release = async () => {
    if (claimed)
      await admin.from('mock_trades').delete().eq('id', claimed.id).eq('user_id', userId);
  };

  for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
    const { data: row, error: loadErr } = await loadRow(admin, userId);
    if (loadErr) {
      await release();
      return { status: 500, body: { error: loadErr.message } };
    }
    const nowIso = new Date().toISOString();
    const result = applyTrade(row?.portfolio, req, price, nowIso);
    if (!result.ok) {
      await release();
      return { status: 400, body: { error: result.error } };
    }

    const tradeRow = {
      ticker: req.ticker,
      quantity: result.trade.quantity,
      price,
      trade_type: req.side,
      total_amount: result.trade.total,
    };
    if (!claimed) {
      const { data: ins, error: insErr } = await admin
        .from('mock_trades')
        .insert({ user_id: userId, ...tradeRow, client_request_id: req.client_request_id })
        .select('id, created_at')
        .single();
      if (insErr) {
        if (insErr.code === UNIQUE_VIOLATION && req.client_request_id) {
          return {
            status: 200,
            body: await currentPortfolioBody(admin, userId, { replay: true }),
          };
        }
        return { status: 500, body: { error: insErr.message } };
      }
      claimed = { ...ins, ...tradeRow };
    } else if (
      claimed.quantity !== tradeRow.quantity ||
      claimed.total_amount !== tradeRow.total_amount
    ) {
      const { error: updErr } = await admin
        .from('mock_trades')
        .update(tradeRow)
        .eq('id', claimed.id)
        .eq('user_id', userId);
      if (updErr) {
        await release();
        return { status: 500, body: { error: updErr.message } };
      }
      claimed = { ...claimed, ...tradeRow };
    }

    const w = await casWrite(admin, userId, row, result.portfolio);
    if (w.ok) {
      return {
        status: 200,
        body: {
          success: true,
          id: claimed.id,
          created_at: claimed.created_at,
          trade: { ticker: req.ticker, side: req.side, price, ...result.trade },
          portfolio: result.portfolio,
          updated_at: w.updated_at,
        },
      };
    }
    if (!w.conflict) {
      await release();
      return { status: 500, body: { error: w.error?.message || 'Portfolio write failed' } };
    }
  }
  await release();
  return { status: 409, body: { error: 'Portfolio changed during the trade. Try again.' } };
}

/**
 * POST /api/mock-portfolio. Only `{ action: 'reset' }` (optionally with a
 * `startingCash` between MIN_STARTING_CASH and MAX_STARTING_CASH) is accepted.
 */
export async function resetMockPortfolio(admin, userId, body) {
  if (!body || typeof body !== 'object' || body.action !== 'reset') {
    return { status: 400, body: { error: "Only { action: 'reset' } is accepted" } };
  }
  const allowed = new Set(['action', 'startingCash']);
  if (Object.keys(body).some((k) => !allowed.has(k))) {
    return { status: 400, body: { error: "Only { action: 'reset' } is accepted" } };
  }
  let startingCash = STARTING_CASH;
  if (body.startingCash != null) {
    const n = Number(body.startingCash);
    if (!Number.isFinite(n) || n < MIN_STARTING_CASH || n > MAX_STARTING_CASH) {
      return { status: 400, body: { error: 'Starting cash out of range' } };
    }
    startingCash = Math.round(n);
  }
  const portfolio = freshPortfolio(startingCash);
  const updated_at = new Date().toISOString();
  const { error } = await admin
    .from('mock_portfolios')
    .upsert({ user_id: userId, portfolio, updated_at }, { onConflict: 'user_id' });
  if (error) return { status: 500, body: { error: error.message } };
  return { status: 200, body: { success: true, portfolio, updated_at } };
}
