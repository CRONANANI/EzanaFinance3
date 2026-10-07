/**
 * Ezana API v1 router: GET /v1/... (rewritten to /api/v1/...).
 *
 * Per request: request id, bearer key (Authorization only), key lookup by
 * prefix with a timing-safe HMAC match, registry match, roadmap -> 501, scope,
 * per-key rate limit, handler. Every response carries X-Request-Id, the
 * rate-limit headers and Cache-Control: no-store. Usage is metered per key,
 * day and endpoint template, and one request-log row is written with the IP
 * stored only as a peppered hash. Server to server: no CORS.
 */
import { randomUUID } from 'node:crypto';
import { getAdminClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { matchEndpoint } from '@/lib/ezana-api/registry';
import { parseBearer, prefixOf, keyMatches, ipHash, pepperConfigured } from '@/lib/ezana-api/keys';
import { ApiError, parseParams, delayCutoff } from '@/lib/ezana-api/query';
import { HANDLERS } from '@/lib/ezana-api/handlers';
import { jsonResponse, errorBody } from '@/lib/ezana-api/respond';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function loadKey(raw) {
  const prefix = prefixOf(raw);
  if (!prefix || !pepperConfigured()) return null;
  const { data } = await getAdminClient()
    .from('api_keys')
    .select('id, key_hash, status, tier, scopes, rate_limit_per_min, delay_days, expires_at')
    .eq('key_prefix', prefix)
    .maybeSingle();
  if (!data || data.status !== 'active') return null;
  if (data.expires_at && Date.parse(data.expires_at) <= Date.now()) return null;
  return keyMatches(raw, data.key_hash) ? data : null;
}

async function meter({ key, endpoint, rows, status, started, request, requestId }) {
  const admin = getAdminClient();
  const isError = status >= 400;
  await Promise.all([
    admin
      .rpc('api_usage_increment', {
        p_key_id: key.id,
        p_endpoint: endpoint,
        p_rows: rows,
        p_error: isError,
      })
      .then(({ error }) => error && console.warn('[v1] usage', error.message)),
    admin
      .from('api_request_log')
      .insert({
        key_id: key.id,
        method: request.method,
        endpoint,
        status,
        duration_ms: Date.now() - started,
        ip_hash: ipHash(getClientIp(request)),
        request_id: requestId,
      })
      .then(({ error }) => error && console.warn('[v1] log', error.message)),
  ]).catch((e) => console.warn('[v1] metering', e?.message || e));
}

export async function GET(request, { params }) {
  const started = Date.now();
  const requestId = randomUUID();
  const base = { 'X-Request-Id': requestId };
  const fail = (status, code, message, headers = {}) =>
    jsonResponse(errorBody(status, code, message, requestId), status, { ...base, ...headers });

  const raw = parseBearer(request);
  if (!raw) {
    return fail(401, 'invalid_key', 'Send your key as Authorization: Bearer ezk_...');
  }
  let key;
  try {
    key = await loadKey(raw);
  } catch {
    key = null;
  }
  if (!key) return fail(401, 'invalid_key', 'The API key is not valid, active or unexpired.');

  const pathname = `/v1/${(params?.path || []).map(encodeURIComponent).join('/')}`;
  const match = matchEndpoint(pathname);
  if (!match) {
    const res = fail(404, 'not_found', 'No endpoint at this path.');
    await meter({ key, endpoint: 'unmatched', rows: 0, status: 404, started, request, requestId });
    return res;
  }
  const { endpoint, params: pathParams } = match;
  const template = endpoint.path;

  if (endpoint.status !== 'live') {
    await meter({ key, endpoint: template, rows: 0, status: 501, started, request, requestId });
    return fail(501, 'not_available', 'This endpoint is on the roadmap and not available yet.');
  }
  if (!(key.scopes || []).includes(endpoint.scope)) {
    await meter({ key, endpoint: template, rows: 0, status: 403, started, request, requestId });
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
    await meter({ key, endpoint: template, rows: 0, status: 429, started, request, requestId });
    return fail(429, 'rate_limited', 'Rate limit exceeded. Retry after the window resets.', {
      ...rlHeaders,
      'Retry-After': String(Math.max(1, resetSec - Math.floor(Date.now() / 1000))),
    });
  }

  let status = 200;
  let body;
  let rows = 0;
  try {
    const query = parseParams(endpoint, new URL(request.url).searchParams);
    const cutoff = endpoint.delayed ? delayCutoff(key.delay_days) : null;
    const out = await HANDLERS[endpoint.id]({ params: query, path: pathParams, cutoff, key });
    rows = Array.isArray(out.data) ? out.data.length : out.data ? 1 : 0;
    body = {
      data: out.data,
      ...(out.page ? { page: out.page } : {}),
      meta: {
        request_id: requestId,
        source: endpoint.source,
        delayed_days: endpoint.delayed ? key.delay_days : 0,
        ...(out.meta || {}),
      },
    };
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
  await meter({ key, endpoint: template, rows, status, started, request, requestId });
  return jsonResponse(body, status, { ...base, ...rlHeaders });
}

/* Server to server only: no CORS headers, so browsers cannot call it with a key. */
export function OPTIONS() {
  return new Response(null, { status: 204 });
}
