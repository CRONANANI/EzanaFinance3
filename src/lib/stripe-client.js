'use client';

import { loadStripe } from '@stripe/stripe-js';

let stripePromise;

/**
 * Stripe.js for Payment Element / future client-side flows.
 * Checkout redirect uses session URL from the server — this is still useful for embedded flows.
 */
export function getStripe() {
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!pk) return null;
  if (!stripePromise) {
    stripePromise = loadStripe(pk);
  }
  return stripePromise;
}
