/**
 * The Sonar guest ping cookie, shared by the landing route and the research
 * engine route (Nov 2026). Same contract as before: an HMAC-signed httpOnly
 * session cookie `snr_guest` = "<count>.<sig>", GUEST_LIMIT pings per browser
 * session; the ledger (reserve_sonar_ping, per salted IP hash) is the
 * authoritative backstop.
 *
 * Refund tokens: a streamed research run must set the cookie before it knows
 * whether it will succeed. If it fails, the stream ends with a signed refund
 * token; POST /api/sonar/research/refund verifies it against the run's failed
 * status and puts the count back, so a failed run never costs a guest a ping.
 */
import crypto from 'crypto';

export const GUEST_LIMIT = 5;
export const GUEST_COOKIE = 'snr_guest';

export function guestSecret() {
  return process.env.SONAR_GUEST_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

export function sign(value) {
  return crypto.createHmac('sha256', guestSecret()).update(String(value)).digest('base64url');
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export function readGuestCount(request) {
  const raw = request.cookies?.get?.(GUEST_COOKIE)?.value || '';
  const [countStr, sig] = raw.split('.');
  if (!countStr || !sig || !safeEqual(sig, sign(countStr))) return 0;
  const n = parseInt(countStr, 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, GUEST_LIMIT) : 0;
}

/** Set-Cookie header value (for streamed responses built by hand). */
export function guestCookieHeader(n) {
  const v = String(Math.max(0, n));
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${GUEST_COOKIE}=${v}.${sign(v)}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function refundToken(runId, count) {
  return `${count}.${sign(`refund:${runId}:${count}`)}`;
}

/** The count to restore, or null when the token does not verify. */
export function verifyRefund(runId, token) {
  const [countStr, sig] = String(token || '').split('.');
  const n = parseInt(countStr, 10);
  if (!Number.isFinite(n) || !sig) return null;
  return safeEqual(sig, sign(`refund:${runId}:${n}`)) ? n : null;
}

/** True when the request carries a Supabase session (cookie or bearer). */
export function hasSessionCredentials(request) {
  const auth = request.headers?.get?.('authorization') || '';
  if (/^Bearer\s+\S+/i.test(auth)) return true;
  const all = request.cookies?.getAll?.() || [];
  return all.some((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name) && c.value);
}
