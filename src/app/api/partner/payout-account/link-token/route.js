/**
 * POST /api/partner/payout-account/link-token
 * Creates a Plaid Link token scoped to the auth product for ACH payout linking.
 * Partners only (403 otherwise).
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { plaidClient, PLAID_COUNTRY_CODES, PLAID_REDIRECT_URI } from '@/lib/plaid';
import { isActivePartner } from '@/lib/partner-payouts';

export const dynamic = 'force-dynamic';

export const POST = withApiGuard(
  async (request, user) => {
    try {
      if (!(await isActivePartner(user.id))) {
        return NextResponse.json({ error: 'Partner access required' }, { status: 403 });
      }

      const response = await plaidClient.linkTokenCreate({
        user: { client_user_id: user.id },
        client_name: 'Ezana Finance',
        products: ['auth'],
        country_codes: PLAID_COUNTRY_CODES,
        language: 'en',
        ...(PLAID_REDIRECT_URI ? { redirect_uri: PLAID_REDIRECT_URI } : {}),
      });

      return NextResponse.json({ link_token: response.data.link_token });
    } catch (error) {
      console.error('[Plaid] payout link-token error:', error?.response?.data || error.message);
      return NextResponse.json({ error: 'Failed to create link token' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
