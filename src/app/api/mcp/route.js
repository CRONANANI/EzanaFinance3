/**
 * Ezana MCP server, remote (Streamable HTTP, stateless): POST /api/mcp.
 *
 * Auth: the caller's Ezana API key as Authorization: Bearer ezk_... (the
 * same keys as the REST API). Every tool call runs through the shared
 * execution core, so scopes, per-key rate limits and metering apply exactly
 * as they do for GET /v1/... (logged with method MCP).
 *
 * Connect from Claude Code, Codex, Grok CLI, Cursor and other MCP clients;
 * setup is on /ezana-api#ai-tools.
 */
import { parseBearer } from '@/lib/ezana-api/keys';
import { authenticate, executeEndpoint, newRequestId } from '@/lib/ezana-api/execute';
import { handleMessage } from '@/lib/ezana-mcp/protocol';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });

const rpcError = (status, code, message) =>
  json({ jsonrpc: '2.0', id: null, error: { code, message } }, status);

export async function POST(request) {
  const raw = parseBearer(request);
  const key = raw ? await authenticate(raw) : null;
  if (!key) {
    return rpcError(
      401,
      -32001,
      'Send your Ezana API key as Authorization: Bearer ezk_... (create one in Settings > API).',
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return rpcError(400, -32700, 'Parse error');
  }

  const ctx = {
    key,
    run: (pathname, params) =>
      executeEndpoint({
        key,
        pathname,
        searchParams: new URLSearchParams(params),
        request,
        requestId: newRequestId(),
        method: 'MCP',
      }),
    renderPng: async (model, theme) => {
      const { renderPng } = await import('@/lib/ezana-api/charts/png');
      return renderPng(model, theme);
    },
  };

  if (Array.isArray(payload)) {
    const out = (await Promise.all(payload.map((m) => handleMessage(m, ctx)))).filter(Boolean);
    return out.length ? json(out) : new Response(null, { status: 202 });
  }
  const out = await handleMessage(payload, ctx);
  return out ? json(out) : new Response(null, { status: 202 });
}

/* No server-initiated stream: this server only answers requests. */
export function GET() {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}

export function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}
