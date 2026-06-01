/**
 * POST /api/plaid/create-link-token
 * Body: { institutionId?: string }   — Plaid institution_id to prefill
 *
 * Returns: { link_token, expiration, institution_id }
 */
import { NextResponse } from 'next/server';
import { plaidClient, PLAID_PRODUCTS, PLAID_COUNTRY_CODES } from '@/lib/plaid';
import { getAuthUser } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
}
