/**
 * Trustworthy client-IP resolution for rate limiting, brute-force lockout,
 * audit logging, and brokerage KYC records.
 *
 * WHY THIS EXISTS — the bug it fixes:
 *   The previous code derived the client IP as
 *       request.headers.get('x-forwarded-for')?.split(',')[0]
 *   i.e. the LEFTMOST entry of `X-Forwarded-For`. That entry is fully
 *   attacker-controlled: a client can send any `X-Forwarded-For` header it
 *   likes, and the hosting edge (Vercel) APPENDS the real connecting IP to
 *   the RIGHT of whatever the client sent. Reading the leftmost value
 *   therefore reads the spoofed value, so an attacker who rotates the header
 *   lands every request in a different rate-limit bucket and bypasses every
 *   IP-based control (global limiter, per-route limiter, auth limiter, login
 *   lockout) — and can forge the IP stored in KYC/agreement records.
 *
 * CORRECT SOURCE OF TRUTH:
 *   On Vercel, `x-real-ip` is set by the platform edge to the true client IP
 *   and cannot be forged through the proxy, so we prefer it. When it is
 *   absent (other hosts, local dev) we fall back to the LAST hop of
 *   `X-Forwarded-For` — the entry appended by the closest trusted proxy —
 *   never the leftmost, client-supplied hop.
 *
 * Pure header parsing only (no imports) so it is safe to use from both the
 * Edge middleware runtime and Node API routes.
 *
 * @param {{ headers: { get(name: string): string | null } }} request
 * @param {string} [fallback='unknown']
 * @returns {string}
 */
export function getClientIp(request, fallback = 'unknown') {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const hops = xff
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }

  return fallback;
}
