/**
 * Plaid Client
 * Server-side only — used by all /api/plaid/* routes.
 *
 * ENV VARS required in .env.local:
 *   PLAID_CLIENT_ID       — from dashboard.plaid.com/developers/keys
 *   PLAID_SECRET           — sandbox or production secret
 *   PLAID_ENV              — sandbox | development | production
 *
 * For a service-role Supabase client use getAdminClient from '@/lib/supabase'.
 */

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

// ── Plaid client ──
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
      'PLAID-SECRET': process.env.PLAID_SECRET || '',
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

// ── Config ──
export const PLAID_PRODUCTS = ['investments', 'transactions'];
export const PLAID_COUNTRY_CODES = ['US'];
export const PLAID_REDIRECT_URI = process.env.PLAID_REDIRECT_URI || null;
export const PLAID_WEBHOOK_URL = process.env.PLAID_WEBHOOK_URL || null;
