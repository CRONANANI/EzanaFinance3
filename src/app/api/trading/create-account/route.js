import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { alpaca } from '@/lib/alpaca';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const kycData = await request.json();

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch {
                /* ignore */
              }
            });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('checklist_completed')
      .eq('id', user.id)
      .single();

    if (!profile?.checklist_completed) {
      return NextResponse.json({ error: 'Complete all checklist tasks first' }, { status: 403 });
    }

    const { data: existing } = await supabaseAdmin
      .from('brokerage_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'You already have a brokerage account' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';

    const alpacaAccount = await alpaca.post('/v1/accounts', {
      contact: {
        email_address: user.email,
        phone_number: kycData.phone,
        street_address: [kycData.street_address],
        unit: kycData.unit || undefined,
        city: kycData.city,
        state: kycData.state,
        postal_code: kycData.postal_code,
      },
      identity: {
        given_name: kycData.given_name,
        family_name: kycData.family_name,
        date_of_birth: kycData.date_of_birth,
        tax_id_type: 'USA_SSN',
        tax_id: kycData.tax_id,
        country_of_citizenship: kycData.country_of_citizenship || 'USA',
        country_of_birth: kycData.country_of_birth || 'USA',
        country_of_tax_residence: kycData.country_of_tax_residence || 'USA',
        funding_source: [kycData.funding_source || 'employment_income'],
        annual_income_min: Number(kycData.annual_income_min),
        annual_income_max: Number(kycData.annual_income_max),
        liquid_net_worth_min: Number(kycData.liquid_net_worth_min),
        liquid_net_worth_max: Number(kycData.liquid_net_worth_max),
        investment_experience_with_stocks: kycData.investment_experience,
        risk_tolerance: kycData.risk_tolerance,
        investment_objective: kycData.investment_objective,
        investment_time_horizon: kycData.investment_time_horizon,
      },
      disclosures: {
        is_control_person: kycData.is_control_person || false,
        is_affiliated_exchange_or_finra: kycData.is_affiliated_exchange || false,
        is_politically_exposed: kycData.is_politically_exposed || false,
        immediate_family_exposed: kycData.immediate_family_exposed || false,
      },
      agreements: [
        {
          agreement: 'customer_agreement',
          signed_at: new Date().toISOString(),
          ip_address: ip,
        },
        {
          agreement: 'margin_agreement',
          signed_at: new Date().toISOString(),
          ip_address: ip,
        },
        {
          agreement: 'account_agreement',
          signed_at: new Date().toISOString(),
          ip_address: ip,
        },
      ],
    });

    const status = alpacaAccount.status || 'SUBMITTED';
    const approved = status === 'APPROVED' || status === 'ACTIVE';

    const { error: insertErr } = await supabaseAdmin.from('brokerage_accounts').insert({
      user_id: user.id,
      alpaca_account_id: alpacaAccount.id,
      alpaca_account_number: alpacaAccount.account_number ?? null,
      account_status: status,
      kyc_status: approved ? 'APPROVED' : 'SUBMITTED',
      application_submitted_at: new Date().toISOString(),
      approved_at: approved ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    });

    if (insertErr) {
      console.error('brokerage_accounts insert:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status,
      account_number: alpacaAccount.account_number,
    });
  } catch (error) {
    console.error('Alpaca account creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Account creation failed' },
      { status: error.status || 500 }
    );
  }
}
