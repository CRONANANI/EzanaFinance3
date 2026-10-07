# Email rules

Ezana is run from Montreal, so Canada's anti-spam law (CASL) applies on top of CAN-SPAM. These rules are binding for every email the app sends.

## Who may receive a launch, product or marketing email

Only:

1. confirmed newsletter subscribers (`marketing_subscribers.status = 'confirmed'`, double opt-in, consent wording stored in `consent_text`), or
2. waitlist rows with `metadata.marketing_consent = true` (the optional, unticked box on the waitlist form; the exact wording is in `metadata.marketing_consent_text`, the time in `metadata.marketing_consent_at`).

A "we launched" email to the whole waitlist is not allowed. Joining the waitlist is not consent to marketing.

## What every email carries

| Class                             | Postal address | One-click unsubscribe link | `List-Unsubscribe` and `List-Unsubscribe-Post` headers |
| --------------------------------- | -------------- | -------------------------- | ------------------------------------------------------ |
| Marketing                         | yes            | yes                        | yes                                                    |
| Notification                      | yes            | yes                        | yes                                                    |
| Transactional                     | yes            | no                         | no                                                     |
| Internal (to Ezana's own inboxes) | no             | no                         | no                                                     |

- **Marketing:** promotes Ezana or its content.
- **Notification:** not triggered by the recipient's own action or account security, such as community activity or digests.
- **Transactional:** triggered by the recipient's own action or needed for their account, such as codes, resets, deletion, invites and confirmations.

- The address line comes from `emailFooterHtml()` in `src/lib/email/footer.js` (`NEWSLETTER_MAILING_ADDRESS`).
- Notification unsubscribe links come from `unsubscribeUrl(userId, category)` in `src/lib/email/unsubscribe.js`: an HMAC-signed token that works without signing in, served by `/api/email/unsubscribe` (GET for the link, POST for RFC 8058 one-click). Each category maps to the matching email switch in Settings (`profiles.user_settings`), so the link and the switch are one preference.
- Newsletter unsubscribes use `/api/newsletter/unsubscribe` with the subscriber's token.
- Unsubscribes take effect immediately, not within the 10 business days the law allows.
- Notification emails are only sent when the matching Settings switch is on.
- Transactional emails must not carry promotional content.

## Every template

| Email                                                  | Sender (file)                                                                         | Class                               | Footer                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------- |
| Waitlist confirmation ("You're on the Ezana waitlist") | `src/app/api/waitlist/route.js`                                                       | Transactional                       | address                                                                               |
| Waitlist invite ("Your Ezana invite is ready")         | `src/app/api/admin/waitlist/[id]/approve/route.js`                                    | Transactional                       | address                                                                               |
| Email verification code                                | `src/app/api/auth/send-verification/route.js`                                         | Transactional                       | address                                                                               |
| Account scheduled for deletion                         | `src/app/api/account/delete/route.js`                                                 | Transactional                       | address                                                                               |
| API request declined                                   | `src/app/api/admin/api-requests/[id]/route.js`                                        | Transactional                       | address                                                                               |
| API key ready to claim                                 | `src/app/api/admin/api-requests/[id]/route.js`                                        | Transactional                       | address                                                                               |
| Newsletter confirmation (double opt-in)                | `src/app/api/newsletter/marketing/subscribe/route.js`, `src/lib/newsletter/emails.js` | Transactional (consent request)     | address, unsubscribe, headers                                                         |
| Newsletter issues                                      | `src/lib/newsletter/audience.js` (sending helper)                                     | Marketing                           | address, unsubscribe, headers                                                         |
| New follower                                           | `src/app/api/community/follow/route.js`                                               | Notification (category `community`) | address, unsubscribe, headers; only when "Community replies and mentions" email is on |
| Support contact form                                   | `src/app/api/support/contact/route.js`                                                | Internal (to the support inbox)     | none                                                                                  |
| Help centre feedback                                   | `src/app/api/help-center/platform-feedback/route.js`                                  | Internal                            | none                                                                                  |
| Privacy data request                                   | `src/app/api/data-request/route.js`                                                   | Internal (to the privacy inbox)     | none                                                                                  |
| Password reset, sign-in links                          | Supabase Auth templates (Supabase dashboard, not in this repo)                        | Transactional                       | add the postal address line in the dashboard templates                                |

## Adding an email

1. Classify it with the table above.
2. Add `emailFooterHtml()` to the body; for marketing or notification emails pass `unsubscribeUrl` and set `headers: listUnsubscribeHeaders(url)` on the send.
3. For a new notification category, add it to `UNSUBSCRIBE_CATEGORIES` with the Settings key it switches off, and check that key before sending.
4. Add the row to this file.
