/**
 * Google OAuth via Supabase — configure Client ID & Secret in Supabase Dashboard
 * (Authentication → Providers → Google), not in this repo.
 */

/**
 * @param {{ variant?: 'user' | 'partner'; destination?: string }} opts
 * @returns {string} redirect URL passed to signInWithOAuth options.redirectTo
 */
export function buildOAuthCallbackUrl(opts = {}) {
  const { variant = 'user', destination = '/home-dashboard' } = opts;
  if (typeof window === 'undefined') {
    return '';
  }
  const oauthType = variant === 'partner' ? 'partner' : 'user';
  const oauthRedirect = variant === 'partner' ? '/partner-home' : destination;
  return `${window.location.origin}/auth/callback?type=${oauthType}&redirect=${encodeURIComponent(oauthRedirect)}`;
}
