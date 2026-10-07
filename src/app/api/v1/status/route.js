import { LIVE_ENDPOINTS } from '@/lib/ezana-api/registry';

/** GET /v1/status: no key needed. */
export const dynamic = 'force-dynamic';

export function GET() {
  return new Response(
    JSON.stringify({
      ok: true,
      version: '1.0.0',
      live_endpoints: LIVE_ENDPOINTS.length,
      time: new Date().toISOString(),
    }),
    { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } },
  );
}
