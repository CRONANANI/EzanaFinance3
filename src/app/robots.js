import { USER_DASHBOARD_ROUTES, PARTNER_DASHBOARD_ROUTES } from '@/lib/auth/protected-routes';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ezana.world';

/* Public on purpose although they sit under a signed-in prefix (middleware lets them
   through): the trading landing and the mock trading demo. */
const PUBLIC_UNDER_PROTECTED = new Set(['/trading']);

/**
 * robots.txt: allow public content, keep API routes and the signed-in app out of the
 * crawl, and point crawlers at the sitemap.
 *
 * Nov 23, 2026: the signed-in areas (the same prefixes middleware sends to sign-in) are
 * disallowed, so crawlers spend their time on the public pages instead of following links
 * into redirects. This does not loosen anything: the routes stay protected by middleware.
 */
export default function robots() {
  /* Rules match path prefixes: '/sonar' covers /sonar and everything under it. The trading
     landing stays crawlable; the rest of /trading is the signed-in app except the mock
     demo, which the more specific allow keeps open. */
  const privatePaths = [...USER_DASHBOARD_ROUTES, ...PARTNER_DASHBOARD_ROUTES]
    .filter((p) => !PUBLIC_UNDER_PROTECTED.has(p))
    .concat(['/trading/', '/auth/', '/account', '/settings', '/payment', '/admin']);
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/trading/mock'],
        disallow: ['/api/', ...new Set(privatePaths)],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
