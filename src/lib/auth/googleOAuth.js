/**
 * Google OAuth via Supabase — configure Client ID & Secret in Supabase Dashboard
 * (Authentication → Providers → Google), not in this repo.
 */

/**
 * @param {{ variant?: 'user' | 'partner'; destination?: string; flow?: 'signup' | 'signin' }} opts
 * @returns {string} redirect URL passed to signInWithOAuth options.redirectTo
 */
export function buildOAuthCallbackUrl(opts = {}) {
  const { variant = 'user', destination = '/home-dashboard', flow } = opts;
  if (typeof window === 'undefined') {
    return '';
  }
  const oauthType = variant === 'partner' ? 'partner' : 'user';
  const oauthRedirect = variant === 'partner' ? '/partner-home' : destination;
  const flowParam = flow === 'signup' ? '&flow=signup' : '';
  return `${window.location.origin}/auth/callback?type=${oauthType}${flowParam}&redirect=${encodeURIComponent(oauthRedirect)}`;
}
