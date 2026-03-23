/**
 * Server-only Stripe client. Do not import from client components.
 */
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;

/** @type {Stripe | null} */
export const stripe = key
  ? new Stripe(key, {
      // Pin to the API version bundled with the installed `stripe` package
      apiVersion: '2026-02-25.clover',
    })
  : null;
