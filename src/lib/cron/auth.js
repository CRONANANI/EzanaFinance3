/**
 * Cron authorisation (reliability audit P2-14): the CRON_SECRET as an
 * `Authorization: Bearer` header only, compared in constant time. The old
 * `?key=` query fallback put the secret in URLs and access logs; it is gone.
 * Vercel Cron sends the Bearer header itself.
 */
import { timingSafeEqual } from 'node:crypto';

export function safeEqual(a, b) {
  const x = Buffer.from(String(a ?? ''));
  const y = Buffer.from(String(b ?? ''));
  if (x.length !== y.length) {
    timingSafeEqual(x, x); // same work either way
    return false;
  }
  return timingSafeEqual(x, y);
}

export function isCronAuthorized(request, secret = process.env.CRON_SECRET) {
  if (!secret) return false;
  const header = request?.headers?.get?.('authorization') || '';
  return safeEqual(header, `Bearer ${secret}`);
}
