/**
 * POST /api/alpaca/account — Create a new brokerage account
 * GET /api/alpaca/account — Check account status and balances
 */
import { NextResponse } from 'next/server';
import { alpacaRequest } from '@/lib/alpaca';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { firstName, lastName, dateOfBirth, taxId, phone,
            streetAddress, city, state, postalCode, fundingSource } = body;

    const account = await alpacaRequest('/v1/accounts', {
      method: 'POST',
      body: JSON.stringify({
        contact: {
          email_address: user.email,
          phone_number: phone,
          street_address: [streetAddress],
          city: city,
          state: state,
          postal_code: postalCode,
          country: 'USA',
        },
        identity: {
          given_name: firstName,
          family_name: lastName,
          date_of_birth: dateOfBirth,
          tax_id: taxId,
          tax_id_type: 'USA_SSN',
          country_of_citizenship: 'USA',
          country_of_birth: 'USA',
          country_of_tax_residence: 'USA',
          funding_source: [fundingSource || 'employment_income'],
        },
        disclosures: {
          is_control_person: false,
          is_affiliated_exchange_or_finra: false,
          is_politically_exposed: false,
          immediate_family_exposed: false,
        },
        agreements: [
          { agreement: 'margin_agreement', signed_at: new Date().toISOString(), ip_address: request.headers.get('x-forwarded-for') || '0.0.0.0' },
          { agreement: 'account_agreement', signed_at: new Date().toISOString(), ip_address: request.headers.get('x-forwarded-for') || '0.0.0.0' },
          { agreement: 'customer_agreement', signed_at: new Date().toISOString(), ip_address: request.headers.get('x-forwarded-for') || '0.0.0.0' },
        ],
      }),
    });

    await supabaseAdmin
      .from('alpaca_accounts')
      .upsert({
        user_id: user.id,
        alpaca_account_id: account.id,
        account_status: account.status,
        first_name: firstName,
        last_name: lastName,
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    return NextResponse.json({
      success: true,
      accountId: account.id,
      status: account.status,
    });
  } catch (error) {
    console.error('[Alpaca] Account creation error:', error);
    return NextResponse.json(
      { error: 'Account creation failed', details: error.details || error.message },
      { status: error.status || 500 }
    );
  }
}

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: record } = await supabaseAdmin
      .from('alpaca_accounts')
      .select('alpaca_account_id, account_status')
      .eq('user_id', user.id)
      .single();

    if (!record) {
      return NextResponse.json({ hasAccount: false });
    }

    const account = await alpacaRequest(`/v1/accounts/${record.alpaca_account_id}`);

    if (account.status !== record.account_status) {
      await supabaseAdmin
        .from('alpaca_accounts')
        .update({ account_status: account.status })
        .eq('user_id', user.id);
    }

    return NextResponse.json({
      hasAccount: true,
      accountId: account.id,
      status: account.status,
      currency: account.currency,
      buyingPower: account.buying_power,
      cash: account.cash,
      portfolioValue: account.portfolio_value,
      equity: account.equity,
    });
  } catch (error) {
    console.error('[Alpaca] Account check error:', error);
    return NextResponse.json(
      { error: 'Failed to check account', details: error.message },
      { status: 500 }
    );
  }
}
