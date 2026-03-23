'use client';

import { loadStripe } from '@stripe/stripe-js';

let stripePromise;

export const getStripe = () => {
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!pk) return null;
  if (!stripePromise) {
    stripePromise = loadStripe(pk);
  }
  return stripePromise;
};
