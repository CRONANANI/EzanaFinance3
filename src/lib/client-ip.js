/**
 * The caller's IP, from headers the platform sets (reliability audit F/12).
 * Edge-safe: no Node imports, so middleware can use it.
 *
 * Order: x-vercel-forwarded-for (set by Vercel, not spoofable), x-real-ip,
 * then the LAST x-forwarded-for hop (the one our proxy appended; the first
 * hop is whatever the client sent). Returns null when none is present, so
 * callers choose their own fallback instead of every unknown caller sharing
 * one 'unknown' bucket by accident.
 */
export function getClientIp(request) {
  const h = request?.headers;
  if (!h?.get) return null;
  const first = (v) => (v ? String(v).split(',')[0].trim() : '');
  const vercel = first(h.get('x-vercel-forwarded-for'));
  if (vercel) return vercel;
  const real = first(h.get('x-real-ip'));
  if (real) return real;
  const xff = h.get('x-forwarded-for');
  if (xff) {
    const hops = String(xff)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  return null;
}
