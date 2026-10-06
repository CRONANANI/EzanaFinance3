/**
 * Native app awareness. The iOS and Android apps are a Capacitor shell around
 * ezana.world; everything native-only is gated on these helpers so the website
 * behaves exactly as before in a normal browser.
 *
 *   isNativeApp()          client: true inside the app (Capacitor bridge present)
 *   nativePlatform()       client: 'ios' | 'android' | null
 *   isNativeRequest(h)     server: the request came from the app's WebView
 *                          (capacitor.config.json appends "EzanaApp/<version>")
 *
 * Local development only: `?native=1` (remembered for the tab) makes the web
 * page behave as the app does, so the hidden-feature rules can be checked in
 * a browser. Never active in production.
 */

export const NATIVE_UA = /\bEzanaApp\/(\d+(?:\.\d+)*)\s*\((iOS|Android)\)/;

const DEV = process.env.NODE_ENV !== 'production';

function devOverride() {
  if (!DEV || typeof window === 'undefined') return false;
  try {
    const q = new URLSearchParams(window.location.search).get('native');
    if (q === '1') window.sessionStorage.setItem('ezana.native', '1');
    if (q === '0') window.sessionStorage.removeItem('ezana.native');
    return window.sessionStorage.getItem('ezana.native') === '1';
  } catch {
    return false;
  }
}

export function isNativeApp() {
  if (typeof window === 'undefined') return false;
  if (window.Capacitor?.isNativePlatform?.()) return true;
  return devOverride();
}

export function nativePlatform() {
  if (typeof window === 'undefined') return null;
  const p = window.Capacitor?.getPlatform?.();
  if (p === 'ios' || p === 'android') return p;
  return devOverride() ? 'ios' : null;
}

/** Parse the app's user-agent suffix: { platform, version } or null. */
export function parseNativeUserAgent(ua) {
  const m = NATIVE_UA.exec(String(ua || ''));
  if (!m) return null;
  return { version: m[1], platform: m[2].toLowerCase() };
}

/** Server side: headers (a Headers object or a plain object) from the app. */
export function isNativeRequest(headers) {
  const ua =
    typeof headers?.get === 'function'
      ? headers.get('user-agent')
      : headers?.['user-agent'] || headers?.['User-Agent'];
  return parseNativeUserAgent(ua) != null;
}

/**
 * Routes the v1 app does not offer, and where the app sends them instead.
 * Real-money trading and account linking stay on the web (regulated financial
 * services review); web checkout and pricing are replaced by in-app purchase.
 * The landing page is replaced by Home.
 */
export const NATIVE_REDIRECTS = [
  { match: (p) => p === '/', to: '/home' },
  { match: (p) => p === '/pricing' || p.startsWith('/pricing/'), to: '/upgrade' },
  { match: (p) => p === '/subscribe' || p.startsWith('/subscribe/'), to: '/upgrade' },
  { match: (p) => p === '/select-plan', to: '/upgrade' },
  { match: (p) => p === '/payment' || p.startsWith('/payment/'), to: '/upgrade' },
  { match: (p) => p === '/trading', to: '/web-only' },
  { match: (p) => p.startsWith('/trading/dashboard'), to: '/web-only' },
  { match: (p) => p.startsWith('/trading/open-account'), to: '/web-only' },
  { match: (p) => p.startsWith('/brokerages-integrations'), to: '/web-only' },
  { match: (p) => p.startsWith('/plaid/'), to: '/web-only' },
  { match: (p) => p.startsWith('/portfolio/connect-callback'), to: '/web-only' },
];

export function nativeRedirectFor(pathname) {
  const hit = NATIVE_REDIRECTS.find((r) => r.match(pathname));
  return hit ? hit.to : null;
}

/** API prefixes refused to app requests (real money, linking, web checkout). */
export const NATIVE_BLOCKED_API = [
  '/api/stripe/create-checkout-session',
  '/api/stripe/customer-portal',
  '/api/plaid/create-link-token',
  '/api/plaid/update-link-token',
  '/api/plaid/exchange-token',
  '/api/snaptrade/connect-url',
  '/api/trading/create-account',
  '/api/trading/orders',
  '/api/alpaca/order',
  '/api/alpaca/fund',
];

export function isNativeBlockedApi(pathname) {
  return NATIVE_BLOCKED_API.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
