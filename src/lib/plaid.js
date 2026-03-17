/**
 * Plaid Client + Supabase Admin Client
 * Server-side only — used by all /api/plaid/* routes.
 *
 * ENV VARS required in .env.local:
 *   PLAID_CLIENT_ID       — from dashboard.plaid.com/developers/keys
 *   PLAID_SECRET           — sandbox or production secret
 *   PLAID_ENV              — sandbox | development | production
 *   NEXT_PUBLIC_SUPABASE_URL     — your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY    — service role key (bypasses RLS)
 */

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { createClient } from '@supabase/supabase-js';

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

// ── Supabase admin client (service role — bypasses RLS) ──
// Used in API routes to insert/update Plaid data for any user
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Config ──
export const PLAID_PRODUCTS = ['investments', 'transactions'];
export const PLAID_COUNTRY_CODES = ['US'];
