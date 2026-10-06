import { appleAppSiteAssociation } from '@/lib/mobile/app-links';

/* iOS Universal Links. Apple fetches this without following redirects and
   expects application/json. 404 until APPLE_TEAM_ID is set. */
export const dynamic = 'force-dynamic';

export function GET() {
  const doc = appleAppSiteAssociation(process.env.APPLE_TEAM_ID);
  if (!doc) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(doc), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
  });
}
