/**
 * POST /api/plaid/create-link-token
 * Requires: authenticated user (Bearer token in Authorization header)
 * Returns: { link_token }
 */
import { NextResponse } from 'next/server';
import { plaidClient, PLAID_PRODUCTS, PLAID_COUNTRY_CODES } from '@/lib/plaid';
import { getAuthUser } from '@/lib/auth-helpers';

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'Ezana Finance',
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: 'en',
    });

    return NextResponse.json({
      link_token: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (error) {
    console.error('[Plaid] create-link-token error:', error?.response?.data || error.message);
    return NextResponse.json(
      { error: 'Failed to create link token', details: error?.response?.data?.error_message || error.message },
      { status: 500 }
    );
  }
}
