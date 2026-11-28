/**
 * Ezana API v1 router: GET /v1/... (rewritten to /api/v1/...).
 *
 * Per request: request id, bearer key (Authorization, or
 * X-Forwarded-Authorization behind the Google API Gateway), then the shared
 * execution core (lib/ezana-api/execute.js): registry match, scope, per-key
 * rate limit, handler, metering. Every response carries X-Request-Id, the
 * rate-limit headers and Cache-Control: no-store. Chart routes may answer
 * with image/png or image/svg+xml instead of JSON. Server to server: no CORS.
 */
import { parseBearer } from '@/lib/ezana-api/keys';
import { authenticate, executeEndpoint, newRequestId } from '@/lib/ezana-api/execute';
import { jsonResponse, errorBody } from '@/lib/ezana-api/respond';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const requestId = newRequestId();
  const fail = (status, code, message) =>
    jsonResponse(errorBody(status, code, message, requestId), status, {
      'X-Request-Id': requestId,
    });

  const raw = parseBearer(request);
  if (!raw) return fail(401, 'invalid_key', 'Send your key as Authorization: Bearer ezk_...');
  const key = await authenticate(raw);
  if (!key) return fail(401, 'invalid_key', 'The API key is not valid, active or unexpired.');

  const pathname = `/v1/${(params?.path || []).map(encodeURIComponent).join('/')}`;
  const out = await executeEndpoint({
    key,
    pathname,
    searchParams: new URL(request.url).searchParams,
    request,
    requestId,
  });
  if (out.raw) {
    return new Response(out.raw.body, {
      status: out.status,
      headers: { 'Content-Type': out.raw.contentType, 'Cache-Control': 'no-store', ...out.headers },
    });
  }
  return jsonResponse(out.body, out.status, out.headers);
}

/* Server to server only: no CORS headers, so browsers cannot call it with a key. */
export function OPTIONS() {
  return new Response(null, { status: 204 });
}
