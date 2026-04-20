/**
 * Route shell helpers — derive the body classes that key off route
 * segments, so the root layout can apply them in SSR (eliminating the
 * first-paint race that used to happen when the dashboard layout added
 * them inside a `useEffect`).
 *
 * This runs server-side from `src/app/layout.js` using the pathname
 * forwarded by middleware. It must stay in plain JS with no React / Next
 * imports so it can be shared by the client-side dashboard layout below
 * for idempotent synchronization during client-side navigation.
 */

import {
  matchesRoutePrefix,
  PARTNER_DASHBOARD_ROUTES,
  USER_DASHBOARD_ROUTES,
} from '@/lib/auth/protected-routes';

/* Dashboard = the logged-in app shell (everything inside src/app/(dashboard)).
   Kept in sync with USER_DASHBOARD_ROUTES + PARTNER_DASHBOARD_ROUTES so any
   new protected route automatically gets the right body classes. */
const DASHBOARD_ROUTE_PREFIXES = Array.from(
  new Set([...USER_DASHBOARD_ROUTES, ...PARTNER_DASHBOARD_ROUTES])
);

/* Partner chrome is used on dedicated /partner-* routes. Shared partner
   routes (settings, research) are detected at render time in the client
   layout because they depend on the user's partner status — cannot be
   known from the URL alone. */
const PARTNER_ROUTE_PREFIX = '/partner-';

const MARKET_ANALYSIS_PATH = '/market-analysis';

export function isDashboardRoute(pathname) {
  if (!pathname) return false;
  return matchesRoutePrefix(pathname, DASHBOARD_ROUTE_PREFIXES);
}

export function isPartnerChromeRoute(pathname) {
  return !!pathname && pathname.startsWith(PARTNER_ROUTE_PREFIX);
}

export function isMarketAnalysisRoute(pathname) {
  return pathname === MARKET_ANALYSIS_PATH;
}

/**
 * Given a request pathname, return the list of body classes that the
 * dashboard layout would normally add via useEffect. Used server-side to
 * bake them into the SSR HTML so the nav / page shell never paint without
 * them on Home or Dashboard.
 *
 * Deliberately omits `light-mode` — that's owned by `getServerTheme()`
 * and applied separately in the root layout.
 */
export function resolveRouteShellClasses(pathname) {
  const classes = [];
  const onDashboard = isDashboardRoute(pathname);
  if (onDashboard) {
    classes.push('dashboard-page');
    /* `route-regular-dashboard` excludes dedicated partner routes; shared
       partner routes can't be detected here (needs user context) so they
       remain "regular dashboard" on SSR and the client layout will
       correct the class on hydration if the viewer is a partner. Since
       the regular/partner distinction only affects chrome positioning —
       not the nav/page background color — any brief mismatch is invisible. */
    if (!isPartnerChromeRoute(pathname)) {
      classes.push('route-regular-dashboard');
    }
  }
  if (isMarketAnalysisRoute(pathname)) {
    classes.push('route-market-analysis');
  }
  return classes;
}
