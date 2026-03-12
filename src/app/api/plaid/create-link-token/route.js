import { NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient();

    // Get user from session (you'll need to implement auth)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const createTokenResponse = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: user.id,
      },
      client_name: 'Ezana Finance',
      products: ['investments', 'transactions'],
      country_codes: ['US'],
      language: 'en',
      // Optional: Enable account filtering
      account_filters: {
        investment: {
          account_subtypes: ['401k', 'ira', 'brokerage', 'roth', 'roth 401k'],
        },
      },
    });

    return NextResponse.json({
      link_token: createTokenResponse.data.link_token,
    });
  } catch (error) {
    console.error('Error creating link token:', error);
    return NextResponse.json(
      { error: 'Failed to create link token' },
      { status: 500 }
    );
  }
}
