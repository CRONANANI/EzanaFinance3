/**
 * Pure pieces of the push fan-out, tested by scripts/check-mobile.mjs.
 */

/** At most this many pushes per user per UTC day. */
export const DAILY_PUSH_CAP = 20;

export const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);

/** The delivery-log fingerprint for one notification row on one day. */
export const pushFingerprint = (notificationId, day = utcDay()) => `push:${day}:${notificationId}`;

/** True when another push is allowed after `sentToday` pushes. */
export function underDailyCap(sentToday, cap = DAILY_PUSH_CAP) {
  return Number(sentToday) < cap;
}

/** Push text from a notification row: short title and body, no newlines. */
export function pushText({ title, content }) {
  const clip = (s, n) => {
    const t = String(s || '')
      .replace(/\s+/g, ' ')
      .trim();
    return t.length > n ? `${t.slice(0, n - 1)}…` : t;
  };
  return { title: clip(title, 80) || 'Ezana', body: clip(content, 180) };
}

/** First same-site path in the notification content ("↳ /path"), else a default. */
export function pushUrl(content, fallback = '/home') {
  const m = /(^|\s)(\/[A-Za-z0-9\-._~%!$&'()*+,;=:@/?]+)/.exec(String(content || ''));
  return m ? m[2] : fallback;
}
