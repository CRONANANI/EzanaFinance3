/**
 * Partner hub uses the same URLs as members for settings + research tools.
 * These helpers keep PartnerNavbar, mobile nav, layout inset, and theming in sync
 * whenever pathname is not strictly under /partner-*.
 */

/** Routes where signed-in partners should see partner chrome (nav, theme, trial skip). */
export const PARTNER_SHARED_APP_ROUTES = [
  '/settings',
  '/inside-the-capitol',
  '/company-research',
  '/market-analysis',
  '/for-the-quants',
  '/betting-markets',
  '/ezana-echo',
  '/alternative-markets',
  '/financial-analytics',
  '/centaur-intelligence',
  '/kairos-signal',
];

/** Research surfaces that show partner-only UI (ribbon, quick links). */
export const PARTNER_RESEARCH_ROUTES = [
  '/inside-the-capitol',
  '/company-research',
  '/market-analysis',
  '/for-the-quants',
  '/betting-markets',
  '/ezana-echo',
  '/alternative-markets',
  '/financial-analytics',
  '/centaur-intelligence',
  '/kairos-signal',
];

export function matchesPartnerRouteList(pathname, routes) {
  if (!pathname) return false;
  return routes.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export function isPartnerAppExperience(pathname, isPartner) {
  if (!pathname) return false;
  if (pathname.startsWith('/partner-')) return true;
  return Boolean(isPartner && matchesPartnerRouteList(pathname, PARTNER_SHARED_APP_ROUTES));
}

export function isPartnerResearchRoute(pathname) {
  return matchesPartnerRouteList(pathname, PARTNER_RESEARCH_ROUTES);
}
