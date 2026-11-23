/**
 * Example billing history for the admin demo account (Nov 23 2026, owner's request).
 *
 * Only the account below sees it, in Settings > Billing, so the billing cards can be shown
 * with ten months of history. Every invoice is marked `demo`, has no Stripe link, and the
 * panel labels the section as example data. Amounts follow the real retail prices in
 * config/plan-features: Starter $15 a quarter, Advanced $57 a quarter, with the Stripe-style
 * prorated charge for a mid-quarter upgrade.
 */
import { RETAIL_PLANS } from '@/config/plan-features';

export const DEMO_BILLING_EMAILS = ['axmabeto@gmail.com'];

export function isDemoBillingUser(user) {
  const email = user?.email?.toLowerCase()?.trim();
  return Boolean(email) && DEMO_BILLING_EMAILS.includes(email);
}

const at = (iso) => Date.parse(`${iso}T14:00:00Z`);
const cents = (dollars) => Math.round(dollars * 100);

export function demoBillingSummary() {
  const starter = RETAIL_PLANS.starter.price.quarter.amount;
  const advanced = RETAIL_PLANS.advanced.price.quarter.amount;
  // Upgrade on Apr 14 with 18 of the quarter's 89 days left: the difference, prorated.
  const proration = ((advanced - starter) * 18) / 89;
  const rows = [
    ['2026-02-02', 'Ezana Starter, quarterly (Feb 2 to May 2, 2026)', starter],
    ['2026-04-14', 'Upgrade to Ezana Advanced, prorated (Apr 14 to May 2, 2026)', proration],
    ['2026-05-02', 'Ezana Advanced, quarterly (May 2 to Aug 2, 2026)', advanced],
    ['2026-08-02', 'Ezana Advanced, quarterly (Aug 2 to Nov 2, 2026)', advanced],
    ['2026-11-02', 'Ezana Advanced, quarterly (Nov 2, 2026 to Feb 2, 2027)', advanced],
  ];
  const invoices = rows
    .map(([date, description, amount], i) => ({
      id: `demo_inv_${i + 1}`,
      number: `EZDEMO-${String(i + 1).padStart(4, '0')}`,
      date: at(date),
      description,
      amountCents: cents(amount),
      currency: 'usd',
      status: 'paid',
      hostedUrl: null,
      demo: true,
    }))
    .reverse();
  return {
    customer: true,
    demo: true,
    paymentMethod: { brand: 'visa', last4: '4242', expMonth: 8, expYear: 2029 },
    invoices,
  };
}
