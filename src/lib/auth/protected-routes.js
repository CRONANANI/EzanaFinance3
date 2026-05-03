/**
 * Routes that require a signed-in Supabase session (middleware redirect to sign-in).
 * Partner-only routes use /auth/partner-login when unauthenticated.
 */

export const USER_DASHBOARD_ROUTES = [
  '/onboarding',
  '/select-plan',
  '/payment',
  '/home-dashboard',
  '/home',
  '/watchlist',
  '/market-analysis',
  '/community',
  '/user-profile-settings',
  '/company-research',
  '/learning-center',
  '/trading',
  '/for-the-quants',
  '/betting-markets',
  '/financial-analytics',
  '/inside-the-capitol',
  '/alternative-markets',
  '/centaur-intelligence',
  '/kairos-signal',
  '/settings',
  '/org-team-hub',
];

/** Logged-in partners; unauthenticated users go to partner login */
export const PARTNER_DASHBOARD_ROUTES = [
  '/partner-home',
  '/partner-dashboard',
  '/partner-community',
  '/partner-learning',
];

export function matchesRoutePrefix(pathname, routes) {
  return routes.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}
