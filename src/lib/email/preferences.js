/**
 * Email preference gate (QA RET-7). Server only.
 *
 * The Settings › Email and Settings › Notifications panels save these
 * switches into `profiles.user_settings` (defaults in
 * src/lib/user-settings-defaults.js). Every sender declares a category, and
 * opt-out-able categories are checked against the recipient's switches before
 * sending.
 *
 * Classification (keep in sync with the senders, enforced by
 * scripts/check-retail-qa.mjs):
 *
 *   ALWAYS SENT (not opt-out-able):
 *     security     verification codes (auth/send-verification), account
 *                  deletion confirmation with the reactivation link
 *                  (account/delete). Password reset mail is sent by Supabase
 *                  Auth itself, not by this app.
 *     transactional  a direct reply to something the recipient did or asked
 *                  for: waitlist confirmation and approval invite, API access
 *                  decision, org provisioning invite, newsletter double
 *                  opt-in confirmation, and the copyright-removal notice
 *                  (legally required, admin/moderation).
 *     internal     mail to our own inboxes (support/contact,
 *                  help-center/platform-feedback, data-request): no user
 *                  recipient, no preference to check.
 *
 *   OPT-OUT-ABLE (checked here):
 *     community    new follower / community activity
 *                  → notifications_email_community (default off)
 *     marketing    newsletters, product news, promotions
 *                  → email_marketing AND notifications_email_newsletter
 *     security_alert  optional account alerts (new-login alerts and similar)
 *                  → email_security_alerts AND security_login_alerts
 *     confirmations   order / trade receipts
 *                  → email_transactional_confirmations AND notifications_email_trades
 *     price_alert  watchlist price alerts → notifications_email_alerts
 */
import { getDefaultUserSettings } from '@/lib/user-settings-defaults';

export const EMAIL_CATEGORIES = {
  security: { optOut: false },
  transactional: { optOut: false },
  internal: { optOut: false },
  community: { optOut: true, settings: ['notifications_email_community'] },
  marketing: { optOut: true, settings: ['email_marketing', 'notifications_email_newsletter'] },
  security_alert: { optOut: true, settings: ['email_security_alerts', 'security_login_alerts'] },
  confirmations: {
    optOut: true,
    settings: ['email_transactional_confirmations', 'notifications_email_trades'],
  },
  price_alert: { optOut: true, settings: ['notifications_email_alerts'] },
};

/**
 * Pure: may an email of `category` go to a user with `userSettings`
 * (profiles.user_settings, possibly partial)? Unknown categories are refused.
 * Every listed switch must be on, using the app defaults for unset keys.
 */
export function shouldSendEmail(userSettings, category) {
  const spec = EMAIL_CATEGORIES[category];
  if (!spec) return false;
  if (!spec.optOut) return true;
  const merged = { ...getDefaultUserSettings(), ...(userSettings || {}) };
  return spec.settings.every((key) => merged[key] === true);
}

/**
 * Read the recipient's switches with the service-role client and decide.
 * Fails closed for opt-out-able mail: if the preference can't be read, the
 * email is not sent.
 */
export async function canEmailUser(admin, userId, category) {
  const spec = EMAIL_CATEGORIES[category];
  if (!spec) return false;
  if (!spec.optOut) return true;
  if (!userId) return false;
  const { data, error } = await admin
    .from('profiles')
    .select('user_settings')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('[email/preferences] read failed; not sending', category, error.message);
    return false;
  }
  return shouldSendEmail(data?.user_settings, category);
}
