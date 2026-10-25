/**
 * Mock (paper) trade log, behind /api/mock-trades (reliability audit P0-4).
 * Pure handlers over a Supabase client so scripts/check-trading-idempotency.mjs
 * can drive them with a mock. Each returns { status, body }.
 */

const UNIQUE_VIOLATION = '23505';
const REQ_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export async function listMockTrades(client, userId) {
  const { data, error } = await client
    .from('mock_trades')
    .select('id, ticker, quantity, price, trade_type, total_amount, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return { status: 500, body: { error: error.message } };
  return { status: 200, body: { trades: data || [] } };
}

export function parseMockTrade(body) {
  const ticker = String(body?.ticker || '')
    .trim()
    .toUpperCase()
    .slice(0, 32);
  const quantity = Number(body?.quantity);
  const price = Number(body?.price);
  const trade_type = body?.trade_type === 'sell' ? 'sell' : 'buy';
  if (
    !ticker ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(price) ||
    price <= 0
  )
    return null;
  const total = body?.total_amount != null ? Number(body.total_amount) : quantity * price;
  const reqId = body?.client_request_id ? String(body.client_request_id) : null;
  return {
    ticker,
    quantity,
    price,
    trade_type,
    total_amount: Number.isFinite(total) ? total : quantity * price,
    client_request_id: reqId && REQ_ID_RE.test(reqId) ? reqId : null,
  };
}

export async function recordMockTrade(client, userId, body) {
  const t = parseMockTrade(body);
  if (!t) return { status: 400, body: { error: 'Invalid trade payload' } };
  const { data, error } = await client
    .from('mock_trades')
    .insert({ user_id: userId, ...t })
    .select('id, created_at')
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION && t.client_request_id) {
      const { data: existing, error: e2 } = await client
        .from('mock_trades')
        .select('id, created_at')
        .eq('user_id', userId)
        .eq('client_request_id', t.client_request_id)
        .maybeSingle();
      if (e2 || !existing) return { status: 500, body: { error: e2?.message || 'lookup failed' } };
      return {
        status: 200,
        body: { success: true, replay: true, id: existing.id, created_at: existing.created_at },
      };
    }
    return { status: 500, body: { error: error.message } };
  }
  return { status: 200, body: { success: true, id: data.id, created_at: data.created_at } };
}
