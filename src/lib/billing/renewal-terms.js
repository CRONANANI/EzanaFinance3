/**
 * Automatic-renewal terms, one source for every place they appear: beside each
 * subscribe button, on Stripe Checkout, in the pricing FAQ and in the Terms.
 * Required to sit next to the button by California's automatic renewal law and
 * Quebec's consumer protection act. Plain text here; RenewalTerms renders it.
 */

export const TRIAL_DAYS = 14;
export const BILLING_SETTINGS_PATH = '/settings?tab=billing';

const PERIOD = { month: 'month', year: 'year' };

export function formatPrice(amount) {
  const n = Number(amount);
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

/** "$19 per month" */
export function priceAndPeriod(plan) {
  return `${formatPrice(plan.price)} per ${PERIOD[plan.interval] || plan.interval}`;
}

/** The trial's last day, in the given (default: the visitor's) time zone. */
export function trialEndDate(now = new Date(), timeZone) {
  const end = new Date(now.getTime() + TRIAL_DAYS * 86400000);
  return end.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  });
}

/**
 * The renewal sentence as plain text.
 * @param {{ price: number, interval: 'month'|'year' }} plan
 * @param {{ trial?: boolean, endDate?: string }} [opts]
 */
export function renewalText(plan, { trial = true, endDate } = {}) {
  const billed = `${priceAndPeriod(plan)}, billed automatically until you cancel.`;
  if (!trial)
    return `${billed[0].toUpperCase()}${billed.slice(1)} You can cancel anytime in Settings, Billing.`;
  const before = endDate ? ` before ${endDate}` : ` before the ${TRIAL_DAYS}-day trial ends`;
  return `Free for ${TRIAL_DAYS} days, then ${billed} You can cancel anytime in Settings, Billing${before} and you won't be charged.`;
}

/** Generic wording for the Terms and FAQ (no specific plan). */
export const RENEWAL_POLICY_TEXT = `Paid plans start with a free ${TRIAL_DAYS}-day trial. A card is needed to start it. When the trial ends, the plan you chose is charged at the price shown when you subscribed, every month or every year depending on the billing period you picked, and it keeps renewing automatically until you cancel. You can cancel anytime in Settings, Billing, online and without calling or emailing us. If you cancel before the trial ends you are not charged. If you cancel later, the plan stays active until the end of the period you already paid for and is not charged again. Changing plans when you already have a subscription does not start a new trial.`;
