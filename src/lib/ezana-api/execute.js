/**
 * Ezana API execution core (server only), shared by the v1 HTTP router and
 * the MCP server so both enforce exactly the same rules:
 *
 *   authenticate(raw)      bearer key -> key row (prefix lookup, timing-safe
 *                          HMAC match, active, unexpired) or null
 *   executeEndpoint(...)   registry match -> scope -> per-key rate limit ->
 *                          typed params -> handler -> metering
 *
 * Handlers return { data, page?, meta? } for JSON, or { raw: { body,
 * contentType }, meta? } for binary or text formats (chart PNG and SVG).
 */
import { randomUUID } from 'node:crypto';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { matchEndpoint } from '@/lib/ezana-api/registry';
import { prefixOf, keyMatches, ipHash, pepperConfigured } from '@/lib/ezana-api/keys';
import { ApiError, parseParams, delayCutoff } from '@/lib/ezana-api/query';
import { HANDLERS } from '@/lib/ezana-api/handlers';
import { errorBody } from '@/lib/ezana-api/respond';

export const newRequestId = () => randomUUID();

export async function authenticate(raw) {
  const prefix = prefixOf(raw);
  if (!prefix || !pepperConfigured()) return null;
  try {
    const { data } = await getAdminClient()
      .from('api_keys')
      .select('id, key_hash, status, tier, scopes, rate_limit_per_min, delay_days, expires_at')
      .eq('key_prefix', prefix)
      .maybeSingle();
    if (!data || data.status !== 'active') return null;
    if (data.expires_at && Date.parse(data.expires_at) <= Date.now()) return null;
    return keyMatches(raw, data.key_hash) ? data : null;
  } catch {
    return null;
  }
}

async function meter({ key, endpoint, rows, status, started, request, requestId, method }) {
  const admin = getAdminClient();
  await Promise.all([
    admin
      .rpc('api_usage_increment', {
        p_key_id: key.id,
        p_endpoint: endpoint,
        p_rows: rows,
        p_error: status >= 400,
      })
      .then(({ error }) => error && console.warn('[v1] usage', error.message)),
    admin
      .from('api_request_log')
      .insert({
        key_id: key.id,
        method: method || request.method,
        endpoint,
        status,
        duration_ms: Date.now() - started,
        ip_hash: ipHash(getClientIp(request)),
        request_id: requestId,
      })
      .then(({ error }) => error && console.warn('[v1] log', error.message)),
  ]).catch((e) => console.warn('[v1] metering', e?.message || e));
}

/**
 * Run one endpoint for an authenticated key.
 * Returns { status, headers, body } (JSON) or { status, headers, raw } where
 * raw = { body, contentType } for binary or text formats.
 * `method` labels the request log row (GET for HTTP, MCP for tool calls).
 */
export async function executeEndpoint({ key, pathname, searchParams, request, requestId, method }) {
  const started = Date.now();
  const base = { 'X-Request-Id': requestId };
  const fail = (status, code, message, headers = {}) => ({
    status,
    headers: { ...base, ...headers },
    body: errorBody(status, code, message, requestId),
  });

  const match = matchEndpoint(pathname);
  if (!match) {
    await meter({
      key,
      endpoint: 'unmatched',
      rows: 0,
      status: 404,
      started,
      request,
      requestId,
      method,
    });
    return fail(404, 'not_found', 'No endpoint at this path.');
  }
  const { endpoint, params: pathParams } = match;
  const template = endpoint.path;

  if (!(key.scopes || []).includes(endpoint.scope)) {
    await meter({
      key,
      endpoint: template,
      rows: 0,
      status: 403,
      started,
      request,
      requestId,
      method,
    });
    return fail(403, 'not_in_scope', `This key is not scoped for ${endpoint.scope} data.`);
  }

  const rl = await checkRateLimit(`api:key:${key.id}`, {
    limit: key.rate_limit_per_min,
    window: '60 s',
  });
  const resetSec = rl.reset ? Math.ceil(rl.reset / 1000) : Math.ceil(Date.now() / 1000) + 60;
  const rlHeaders = {
    'X-RateLimit-Limit': String(key.rate_limit_per_min),
    'X-RateLimit-Remaining': String(Math.max(0, rl.remaining ?? 0)),
    'X-RateLimit-Reset': String(resetSec),
  };
  if (!rl.success) {
    await meter({
      key,
      endpoint: template,
      rows: 0,
      status: 429,
      started,
      request,
      requestId,
      method,
    });
    return fail(429, 'rate_limited', 'Rate limit exceeded. Retry after the window resets.', {
      ...rlHeaders,
      'Retry-After': String(Math.max(1, resetSec - Math.floor(Date.now() / 1000))),
    });
  }

  let status = 200;
  let body;
  let raw = null;
  let rows = 0;
  try {
    const query = parseParams(endpoint, searchParams);
    const cutoff = endpoint.delayed ? delayCutoff(key.delay_days) : null;
    const out = await HANDLERS[endpoint.id]({ params: query, path: pathParams, cutoff, key });
    if (out.raw) {
      raw = out.raw;
      rows = 1;
    } else {
      rows = Array.isArray(out.data) ? out.data.length : out.data ? 1 : 0;
      body = {
        data: out.data,
        ...(out.page ? { page: out.page } : {}),
        meta: {
          request_id: requestId,
          source: endpoint.source,
          delayed_days: endpoint.delayed ? key.delay_days : 0,
          ...(endpoint.kind === 'insight' && endpoint.method ? { method: endpoint.method } : {}),
          ...(out.meta || {}),
        },
      };
    }
  } catch (e) {
    if (e instanceof ApiError) {
      status = e.status;
      body = errorBody(e.status, e.code, e.message, requestId);
    } else {
      console.error('[v1]', template, e?.message || e);
      status = 500;
      body = errorBody(
        500,
        'internal_error',
        'Something went wrong on our side. Retry with backoff.',
        requestId,
      );
    }
  }
  await meter({ key, endpoint: template, rows, status, started, request, requestId, method });
  return raw
    ? { status, headers: { ...base, ...rlHeaders }, raw }
    : { status, headers: { ...base, ...rlHeaders }, body };
}
