/**
 * Server-only Stripe client. Do not import from client components.
 */
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;

/** @type {Stripe | null} */
export const stripe = key
  ? new Stripe(key, {
      apiVersion: '2024-12-18.acacia',
    })
  : null;
