/**
 * Shared marketing-newsletter constants + URL builders. One source of truth for
 * the absolute-URL base, the CASL sender address, the consent wording, and the
 * token links, so the subscribe / confirm / unsubscribe routes and the audience
 * helper never drift.
 */

export const NEWSLETTER_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ezana.world';

// CASL sender identification — required on every outbound newsletter.
export const NEWSLETTER_MAILING_ADDRESS = 'Ezana Finance · 85 S Race St, Georgetown, DE 19947';

// Falls back to a sensible default; RESEND_FROM_EMAIL wins when configured.
export const NEWSLETTER_FROM =
  process.env.RESEND_FROM_EMAIL || 'Ezana Finance <newsletter@ezanafinance.com>';

// The EXACT wording shown next to the consent checkbox. Sent to the API as
// consent_text and stored verbatim, so the consent record is self-documenting.
export const NEWSLETTER_CONSENT_TEXT =
  'Email me Ezana Echo articles and product updates. You can unsubscribe at any time.';

export function newsletterConfirmUrl(token) {
  return `${NEWSLETTER_SITE_URL}/api/newsletter/confirm?token=${encodeURIComponent(token)}`;
}

export function newsletterUnsubscribeUrl(token) {
  return `${NEWSLETTER_SITE_URL}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

/** RFC 2369 List-Unsubscribe header value for a subscriber's token. */
export function listUnsubscribeHeader(token) {
  return `<${newsletterUnsubscribeUrl(token)}>`;
}
