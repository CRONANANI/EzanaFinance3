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
import { getAuthUser } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export const POST = withApiGuard(
  async (request, user) => {
    try {
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
