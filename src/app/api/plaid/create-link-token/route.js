/**
 * POST /api/plaid/create-link-token
 * Body: { institutionId?: string }   — Plaid institution_id to prefill
 *
 * Returns: { link_token, expiration, institution_id }
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import {
  plaidClient,
  PLAID_PRODUCTS,
  PLAID_COUNTRY_CODES,
  PLAID_REDIRECT_URI,
  PLAID_WEBHOOK_URL,
} from '@/lib/plaid';
import { getAuthUser } from '@/lib/supabase';
import { isTokenKeyConfigured } from '@/lib/crypto/token-cipher';

export const dynamic = 'force-dynamic';

export const POST = withApiGuard(
  async (request, user) => {
    try {
      /* Nov 2026: check before Plaid Link opens. exchange-token already
         refuses without the key, but only after the user has logged in to
         their bank, which wastes the whole flow. */
      if (!isTokenKeyConfigured()) {
        console.error('[Plaid] create-link-token: TOKEN_ENCRYPTION_KEY missing or invalid');
        return NextResponse.json(
          {
            error: 'Brokerage linking is temporarily unavailable. Please try again later.',
            code: 'connection_unavailable',
          },
          { status: 503 },
        );
      }

      let body = {};
      try {
        body = await request.json();
      } catch {
        /* empty body */
      }

      const params = {
        user: { client_user_id: user.id },
        client_name: 'Ezana Finance',
        products: PLAID_PRODUCTS,
        country_codes: PLAID_COUNTRY_CODES,
        language: 'en',
        ...(PLAID_REDIRECT_URI ? { redirect_uri: PLAID_REDIRECT_URI } : {}),
        ...(PLAID_WEBHOOK_URL ? { webhook: PLAID_WEBHOOK_URL } : {}),
      };

      const response = await plaidClient.linkTokenCreate(params);

      return NextResponse.json({
        link_token: response.data.link_token,
        expiration: response.data.expiration,
        institution_id: body.institutionId || null,
      });
    } catch (error) {
      console.error('[Plaid] create-link-token error:', error?.response?.data || error.message);
      return NextResponse.json(
        {
          error: 'Failed to create link token',
          details: error?.response?.data?.error_message || error.message,
        },
        { status: 500 },
      );
    }
  },
  { requireAuth: true },
);
