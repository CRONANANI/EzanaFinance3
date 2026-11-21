/**
 * The free one-month Starter trial for paid-plan waitlist members (Nov 21, 2026).
 *
 * Joining the waitlist from a paid plan saves a card on Stripe in setup mode
 * (/api/stripe/waitlist-checkout); nothing is charged and no subscription
 * exists yet. When the member accepts their invite, startWaitlistTrial opens
 * the Starter subscription with a TRIAL_DAYS trial on that saved card. The
 * member can move to Advanced at any time through the normal plan switch, or
 * keep Starter, and the Stripe webhook syncs whichever plan they end on.
 *
 * Server-only.
 */
import { PLANS } from '@/config/pricing';
import { TRIAL_DAYS } from '@/lib/billing/renewal-terms';
import { resolvePriceId } from '@/lib/billing/resolve-price';

/** Starter, at the billing period the member picked on /pricing (yearly by default). */
export function starterPlanKeyFor(billing) {
  if (billing === 'quarterly') return 'personal_quarterly';
  return billing === 'monthly' ? 'personal_monthly' : 'individual_annual';
}

export function starterPlanFor(billing) {
  return PLANS[starterPlanKeyFor(billing)];
}

/**
 * Start the Starter trial for a waitlist member who saved a card.
 * Never throws: the account already exists, so a billing failure is logged
 * and reported, and the member can still start a trial from /pricing.
 *
 * @returns {Promise<{ started: boolean, reason?: string, subscriptionId?: string }>}
 */
export async function startWaitlistTrial({ stripe, admin, invite, userId }) {
  const meta = invite?.metadata || {};
  const customerId = meta.stripe_customer_id;
  if (!customerId) return { started: false, reason: 'no_card_step' };
  if (!stripe) return { started: false, reason: 'stripe_not_configured' };

  try {
    const planKey = starterPlanKeyFor(meta.billing);
    const priceId = await resolvePriceId(stripe, planKey);
    if (!priceId) return { started: false, reason: 'starter_price_missing' };
    const plan = { ...PLANS[planKey], priceId };

    /* The card saved in setup mode is the customer's only payment method. */
    const methods = await stripe.paymentMethods.list({ customer: customerId, limit: 1 });
    const paymentMethod = methods.data?.[0]?.id;
    if (!paymentMethod) return { started: false, reason: 'no_saved_card' };

    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethod },
      metadata: { supabase_user_id: userId, waitlist_id: invite.id },
    });

    /* Link the customer first so the subscription webhook finds the profile. */
    const { error: linkErr } = await admin
      .from('profiles')
      .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (linkErr) console.error('[waitlist-trial] link customer failed:', userId, linkErr.message);

    const subscription = await stripe.subscriptions.create(
      {
        customer: customerId,
        items: [{ price: plan.priceId, quantity: 1 }],
        default_payment_method: paymentMethod,
        trial_period_days: TRIAL_DAYS,
        /* If the card is removed before the trial ends, cancel rather than
           leave an unpaid subscription behind. */
        trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
        metadata: { supabase_user_id: userId, plan_key: planKey, source: 'waitlist_trial' },
      },
      { idempotencyKey: `wl-trial:${invite.id}` },
    );
    return { started: true, subscriptionId: subscription.id };
  } catch (err) {
    console.error('[waitlist-trial] start failed:', invite?.id, err?.type, err?.message);
    return { started: false, reason: 'stripe_error' };
  }
}
