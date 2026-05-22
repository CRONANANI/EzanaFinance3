/**
 * Beta v0 launch — single source of truth for which routes are locked
 * until v1.0. Used by:
 *   - BetaLockGate (client modal overlay)
 *   - Navbar (visual "v1.0" badge on locked items)
 *
 * To unlock a route for v1.0, just remove it from this list.
 *
 * Users in BETA_FULL_ACCESS_EMAILS bypass the lock entirely so they can
 * keep testing v1.0 features in production during the beta phase.
 */

/**
 * Emails that always have full access to every feature, including the
 * v1.0-locked ones. Case-insensitive comparison.
 *
 * To grant a user full access, add their email here.
 * To revoke access, remove the email.
 */
export const BETA_FULL_ACCESS_EMAILS = [
  'axmabeto@gmail.com',
  'isabel.lim546@gmail.com',
  'noah@raymondleigh.com',
];

/**
 * Returns true if the given user's email is in the full-access allowlist.
 * Case-insensitive, handles undefined/null user gracefully.
 *
 * @param {{ email?: string | null } | null | undefined} user
 * @returns {boolean}
 */
export function hasBetaFullAccess(user) {
  const email = user?.email?.toLowerCase()?.trim();
  if (!email) return false;
  return BETA_FULL_ACCESS_EMAILS.some((allowed) => allowed.toLowerCase() === email);
}

export const BETA_LOCKED_ROUTES = [
  '/alternative-markets',
  '/centaur-intelligence',
  '/kairos-signal',
  '/betting-markets',
  '/for-the-quants',
  '/inside-the-capitol',
  '/real-estate',
  '/empire-ranking',
  '/financial-analytics',
  '/terminal',
  '/leaderboard',
  '/badges',
];

/**
 * Returns true if the given pathname is locked behind the v1.0 gate.
 * Matches the route OR any nested page under it.
 */
export function isBetaLockedRoute(pathname) {
  if (!pathname) return false;
  return BETA_LOCKED_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/**
 * Human-readable description per locked route — shown inside the modal.
 */
export const BETA_LOCK_DESCRIPTIONS = {
  '/alternative-markets':
    'Crypto, commodities, and alternative asset markets — coming in v1.0 with full DeFi integration and real-time spot data.',
  '/centaur-intelligence':
    'AI-powered boardroom analysis with Buffett, Dalio, Lynch, and Munger persona models — launching with v1.0.',
  '/kairos-signal':
    'Weather and alternative macro data feeds for commodity traders — coming in v1.0 with full climate-impact modeling.',
  '/betting-markets':
    'Sports betting EV models, odds comparison, and prop bet analysis — launching with v1.0.',
  '/for-the-quants':
    'Strategy builder, backtesting engine, technical scanners, and pairs trading — coming in v1.0.',
  '/inside-the-capitol':
    'Congressional trades, lobbying activity, and government contract intelligence — launching with v1.0.',
  '/real-estate': 'Fractional real estate investments and REIT analysis tools — coming in v1.0.',
  '/empire-ranking':
    'Geopolitical empire rankings and country-level investment intelligence — launching with v1.0.',
  '/financial-analytics':
    'Advanced portfolio analytics and risk attribution tools — coming in v1.0.',
  '/terminal': 'Bloomberg-style integrated terminal for power users — launching with v1.0.',
  '/leaderboard': 'Community-wide portfolio performance leaderboards — coming in v1.0.',
  '/badges': 'Achievement badges and XP rewards system — launching with v1.0.',
};

export function getBetaLockedRouteDescription(pathname) {
  if (!pathname) return null;
  const match = BETA_LOCKED_ROUTES.find((r) => pathname === r || pathname.startsWith(`${r}/`));
  return match ? BETA_LOCK_DESCRIPTIONS[match] : null;
}
