/**
 * Signed one-click unsubscribe links for notification emails (server only).
 * The link works without signing in: the token is the user id and category,
 * HMAC-SHA256 signed, so it cannot be forged for someone else's account.
 *
 * Categories map to the email toggles in Settings (profiles.user_settings),
 * so the link and the Settings switch are the same preference.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { NEWSLETTER_SITE_URL } from '@/lib/newsletter/config';

export const UNSUBSCRIBE_CATEGORIES = {
  community: {
    setting: 'notifications_email_community',
    label: 'community notification emails (new followers and activity)',
  },
};

function secret() {
  const s = process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('No secret configured for unsubscribe links.');
  return s;
}

const sign = (payload) =>
  createHmac('sha256', secret()).update(`email-unsubscribe:${payload}`).digest('base64url');

export function unsubscribeToken(userId, category) {
  if (!UNSUBSCRIBE_CATEGORIES[category]) throw new Error(`Unknown category ${category}`);
  const payload = Buffer.from(`${userId}:${category}`).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** { userId, category } for a valid token, else null. */
export function verifyUnsubscribeToken(token) {
  const [payload, sig] = String(token || '').split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const [userId, category] = Buffer.from(payload, 'base64url').toString('utf8').split(':');
  if (!userId || !UNSUBSCRIBE_CATEGORIES[category]) return null;
  return { userId, category };
}

export function unsubscribeUrl(userId, category) {
  return `${NEWSLETTER_SITE_URL}/api/email/unsubscribe?token=${encodeURIComponent(
    unsubscribeToken(userId, category),
  )}`;
}

/** RFC 2369 and RFC 8058 headers for one-click unsubscribe in mail apps. */
export function listUnsubscribeHeaders(url) {
  return {
    'List-Unsubscribe': `<${url}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
