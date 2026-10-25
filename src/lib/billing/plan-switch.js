/**
 * Plan purchase vs plan switch (QA RET-3).
 *
 * A user who already has a live Stripe subscription must never be sent to a
 * second Checkout: that creates a second subscription and both bill. Instead
 * the existing subscription's single item is swapped to the new price (with
 * proration) and the webhook (customer.subscription.updated) writes the new
 * plan to the profile, deriving it from the price id (RET-4).
 *
 * Dependencies are passed in so scripts/check-plan-switch.mjs drives this
 * with a mocked Stripe client.
 */

/** Stripe statuses that still bill or will bill: a switch, not a new checkout. */
export const LIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due']);

async function retrieveLive(stripe, subscriptionId) {
  if (!subscriptionId) return null;
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    return sub && LIVE_SUBSCRIPTION_STATUSES.has(sub.status) ? sub : null;
  } catch (e) {
    // A profile pointing at a deleted subscription falls through to checkout.
    if (e?.code === 'resource_missing' || e?.statusCode === 404) return null;
    throw e;
  }
}

/**
 * @param {object} args
 * @param {object} args.stripe                 Stripe client (or a mock)
 * @param {string|null} args.subscriptionId    profiles.subscription_id
 * @param {string} args.planKey                key in PLANS
 * @param {string} args.priceId                the plan's Stripe price id
 * @param {string} args.origin                 app origin for the return URL
 * @param {() => object} args.checkoutParams   builds the Checkout params (only called on the checkout path)
 * @param {string} [args.checkoutIdempotencyKey]
 * @param {() => number} [args.now]
 * @returns {Promise<{ status: number, body: object }>}
 */
export async function startOrSwitchSubscription({
  stripe,
  subscriptionId,
  planKey,
  priceId,
  origin,
  checkoutParams,
  checkoutIdempotencyKey,
  now = Date.now,
}) {
  const sub = await retrieveLive(stripe, subscriptionId);
  if (sub) {
    const item = sub.items?.data?.[0];
    if (item?.price?.id === priceId) {
      return { status: 200, body: { alreadySubscribed: true, planKey } };
    }
    if (!item?.id) {
      throw new Error(`subscription ${sub.id} has no items to switch`);
    }
    await stripe.subscriptions.update(
      sub.id,
      {
        items: [{ id: item.id, price: priceId }],
        proration_behavior: 'create_prorations',
        metadata: { ...(sub.metadata || {}), plan_key: planKey },
      },
      /* A double click within the same minute is one switch; a later switch
         back and forth is not replayed from Stripe's 24 h idempotency cache. */
      { idempotencyKey: `switch:${sub.id}:${priceId}:${Math.floor(now() / 60_000)}` },
    );
    return {
      status: 200,
      body: { switched: true, planKey, url: `${origin}/home?checkout=switched` },
    };
  }

  const session = await stripe.checkout.sessions.create(
    checkoutParams(),
    checkoutIdempotencyKey ? { idempotencyKey: checkoutIdempotencyKey } : undefined,
  );
  return { status: 200, body: { url: session.url } };
}
