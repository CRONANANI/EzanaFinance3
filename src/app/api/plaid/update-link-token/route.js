/**
 * POST /api/plaid/update-link-token
 * Body: { item_id } — Plaid item_id for re-auth (update mode)
 *
 * Returns: { link_token, expiration }
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import {
  plaidClient,
  supabaseAdmin,
  PLAID_COUNTRY_CODES,
  PLAID_REDIRECT_URI,
  PLAID_WEBHOOK_URL,
} from '@/lib/plaid';
import { getAuthUser } from '@/lib/auth-helpers';
import { decryptToken } from '@/lib/crypto/token-cipher';

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

      const { item_id: itemId } = body;
      if (!itemId) {
        return NextResponse.json({ error: 'item_id is required' }, { status: 400 });
      }

      const { data: item, error: itemError } = await supabaseAdmin
        .from('plaid_items')
        .select('access_token')
        .eq('user_id', user.id)
        .eq('item_id', itemId)
        .maybeSingle();

      if (itemError || !item?.access_token) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      const params = {
        user: { client_user_id: user.id },
        client_name: 'Ezana Finance',
        country_codes: PLAID_COUNTRY_CODES,
        language: 'en',
        access_token: decryptToken(item.access_token),
        ...(PLAID_REDIRECT_URI ? { redirect_uri: PLAID_REDIRECT_URI } : {}),
        ...(PLAID_WEBHOOK_URL ? { webhook: PLAID_WEBHOOK_URL } : {}),
      };

      const response = await plaidClient.linkTokenCreate(params);

      return NextResponse.json({
        link_token: response.data.link_token,
        expiration: response.data.expiration,
      });
    } catch (error) {
      console.error('[Plaid] update-link-token error:', error?.response?.data || error.message);
      return NextResponse.json(
        {
          error: 'Failed to create update link token',
          details: error?.response?.data?.error_message || error.message,
        },
        { status: 500 },
      );
    }
  },
  { requireAuth: true },
);
