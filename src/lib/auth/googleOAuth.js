/**
 * Google OAuth via Supabase — configure Client ID & Secret in Supabase Dashboard
 * (Authentication → Providers → Google), not in this repo.
 *
 * redirectTo MUST be your app callback URL (e.g. https://ezana.world/auth/callback?...),
 * NOT https://xxx.supabase.co/auth/v1/callback — Supabase uses that internally.
 */

/**
 * @param {{ variant?: 'user' | 'partner'; destination?: string; flow?: 'signup' | 'signin' }} opts
 * @returns {string} Full URL for signInWithOAuth `options.redirectTo`
 */
export function buildOAuthCallbackUrl(opts = {}) {
  const { variant = 'user', destination = '/home-dashboard', flow } = opts;
  if (typeof window === 'undefined') {
    return '';
  }
  const base = `${window.location.origin}/auth/callback`;
  const oauthType = variant === 'partner' ? 'partner' : 'user';
  const oauthRedirect = variant === 'partner' ? '/partner-home' : destination;
  const flowParam = flow === 'signup' ? '&flow=signup' : '';
  return `${base}?type=${oauthType}${flowParam}&redirect=${encodeURIComponent(oauthRedirect)}`;
}
