import { assetLinks } from '@/lib/mobile/app-links';

/* Android App Links. 404 until ANDROID_CERT_SHA256 is set (the Play app
   signing certificate's SHA-256; several may be comma separated). */
export const dynamic = 'force-dynamic';

export function GET() {
  const doc = assetLinks(process.env.ANDROID_CERT_SHA256);
  if (!doc) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(doc), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
  });
}
