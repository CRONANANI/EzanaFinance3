import { buildOpenApi } from '@/lib/ezana-api/openapi';

/** GET /v1/openapi.json: the OpenAPI 3.1 spec, generated from the registry. Public. */
export const dynamic = 'force-static';
export const revalidate = 3600;

export function GET() {
  return new Response(JSON.stringify(buildOpenApi(), null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
