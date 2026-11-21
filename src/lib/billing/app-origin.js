/**
 * The origin Stripe should send people back to (success, cancel, portal return).
 *
 * Nov 21, 2026: production checkout cancels landed on http://localhost:3000
 * because NEXT_PUBLIC_APP_URL held a local value. A localhost env value is
 * now ignored whenever the request itself did not come from localhost, so a
 * stray dev value can never leak into a live redirect.
 */
const LOCAL_RE = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i;
const FALLBACK = 'https://ezana.world';

const trimSlash = (u) => u.replace(/\/+$/, '');

export function getAppOrigin(request) {
  let reqOrigin = request?.headers?.get('origin') || '';
  if (!reqOrigin && request?.url) {
    try {
      reqOrigin = new URL(request.url).origin;
    } catch {
      reqOrigin = '';
    }
  }
  const requestIsLocal = LOCAL_RE.test(reqOrigin);

  const envCandidates = [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXT_PUBLIC_SITE_URL];
  for (const raw of envCandidates) {
    const v = (raw || '').trim();
    if (!/^https?:\/\//i.test(v)) continue;
    if (LOCAL_RE.test(v) && !requestIsLocal) continue;
    return trimSlash(v);
  }

  if (reqOrigin && (!requestIsLocal || process.env.NODE_ENV !== 'production')) {
    return trimSlash(reqOrigin);
  }
  return FALLBACK;
}

/**
 * A same-site path for a cancel/return URL: must start with a single "/"
 * (no "//host" or scheme), else the fallback is used.
 */
export function safeReturnPath(path, fallback = '/onboarding') {
  if (typeof path !== 'string') return fallback;
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return fallback;
  return path;
}

/** Appends a query parameter whether or not the path already has a query. */
export function withParam(path, key, value) {
  return `${path}${path.includes('?') ? '&' : '?'}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}
