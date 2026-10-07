/**
 * Footer for every email Ezana sends (see docs/EMAIL_RULES.md). Always the
 * postal address (CAN-SPAM, CASL sender identification); a one-click
 * unsubscribe link on every non-transactional email.
 */
import { NEWSLETTER_MAILING_ADDRESS } from '@/lib/newsletter/config';
import { escapeHtml } from '@/lib/sanitize';

export const EMAIL_MAILING_ADDRESS = NEWSLETTER_MAILING_ADDRESS;

/**
 * @param {object} [opts]
 * @param {string} [opts.unsubscribeUrl]  one-click link (non-transactional only)
 * @param {string} [opts.unsubscribeLabel]
 */
export function emailFooterHtml({ unsubscribeUrl, unsubscribeLabel } = {}) {
  const unsub = unsubscribeUrl
    ? `<br /><a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7280;text-decoration:underline;">${escapeHtml(
        unsubscribeLabel || 'Unsubscribe from these emails',
      )}</a>`
    : '';
  return `<p style="color:#6b7280;font-size:12px;line-height:1.6;text-align:center;margin:20px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">${escapeHtml(
    EMAIL_MAILING_ADDRESS,
  )}${unsub}</p>`;
}

/** Plain-text equivalent for text/plain bodies. */
export function emailFooterText({ unsubscribeUrl } = {}) {
  return `\n\n${EMAIL_MAILING_ADDRESS}${unsubscribeUrl ? `\nUnsubscribe: ${unsubscribeUrl}` : ''}`;
}
