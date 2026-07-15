import { NEWSLETTER_MAILING_ADDRESS } from './config';

/**
 * Double opt-in confirmation email. Transactional (sent once, on signup) — NOT a
 * marketing send, but we still identify the sender (physical address) and carry
 * the unsubscribe link as good CASL practice.
 *
 * NOTE ON HEX: HTML email cannot use CSS custom properties (email clients don't
 * support them), so colours here are inline literals — the same convention the
 * existing /api/waitlist email uses. The "tokens only" guard applies to the app
 * UI (component CSS + status pages), which stay token-driven.
 *
 * @param {{ confirmUrl: string, unsubscribeUrl: string }} args
 * @returns {{ subject: string, html: string, text: string }}
 */
export function buildConfirmationEmail({ confirmUrl, unsubscribeUrl }) {
  const subject = 'Confirm your Ezana newsletter subscription';

  const text = [
    'Confirm your subscription to the Ezana newsletter',
    '',
    'You (or someone using this address) asked to receive Ezana Echo articles and',
    'product updates. Confirm to start receiving them:',
    '',
    confirmUrl,
    '',
    "If you didn't request this, ignore this email — you won't be subscribed.",
    '',
    NEWSLETTER_MAILING_ADDRESS,
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join('\n');

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background-color:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="color:#10b981;font-size:26px;margin:0;">Ezana Finance</h1>
        <p style="color:#6e7681;font-size:13px;margin-top:8px;">Follow the moves that matter</p>
      </div>

      <div style="background:linear-gradient(180deg,rgba(22,27,34,0.95) 0%,rgba(13,17,23,0.98) 100%);border:1px solid rgba(16,185,129,0.2);border-radius:16px;padding:36px;">
        <h2 style="color:#f0f6fc;font-size:22px;margin:0 0 14px;text-align:center;">Confirm your subscription</h2>
        <p style="color:#8b949e;font-size:15px;line-height:1.6;margin:0 0 24px;text-align:center;">
          You asked to receive Ezana Echo articles and product updates. Tap the button below to
          confirm — you won't receive anything until you do.
        </p>
        <div style="text-align:center;margin:0 0 24px;">
          <a href="${confirmUrl}" style="display:inline-block;background:#10b981;color:#0d1117;font-weight:700;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:10px;">
            Confirm subscription
          </a>
        </div>
        <p style="color:#6e7681;font-size:13px;line-height:1.6;margin:0;text-align:center;">
          If you didn't request this, you can ignore this email — you won't be subscribed.
        </p>
      </div>

      <div style="text-align:center;margin-top:28px;">
        <p style="color:#6e7681;font-size:12px;margin:0 0 6px;">${NEWSLETTER_MAILING_ADDRESS}</p>
        <p style="color:#6e7681;font-size:12px;margin:0;">
          <a href="${unsubscribeUrl}" style="color:#8b949e;text-decoration:underline;">Unsubscribe</a>
          &nbsp;·&nbsp; © ${new Date().getFullYear()} Ezana Finance
        </p>
      </div>
    </div>
  </body>
  </html>`;

  return { subject, html, text };
}
