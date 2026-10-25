import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { withApiGuard } from '@/lib/api-guard';
import { alpaca } from '@/lib/alpaca';
import { claimBrokerageAccount, isDefiniteRejection } from '@/lib/trading/idempotent';
import { getClientIp } from '@/lib/client-ip';

import { awardELO } from '@/lib/elo';

export const dynamic = 'force-dynamic';

function buildAccountBody(kycData, user, ip) {
  return {
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
  };
}

export const POST = withApiGuard(
  async (request, user) => {
    try {
      const kycData = await request.json();

      const { data: profile } = await getAdminClient()
        .from('profiles')
        .select('checklist_completed')
        .eq('id', user.id)
        .single();

      if (!profile?.checklist_completed) {
        return NextResponse.json({ error: 'Complete all checklist tasks first' }, { status: 403 });
      }

      /* Claim first: only the request that inserts the 'creating' row calls
         Alpaca, so racing submits cannot open two brokerage accounts. */
      const admin = getAdminClient();
      const claim = await claimBrokerageAccount(admin, user.id);
      if (!claim.claimed) {
        const st = claim.existing?.account_status;
        return NextResponse.json(
          {
            error:
              st === 'creating'
                ? 'Your brokerage account is being created'
                : 'You already have a brokerage account',
            status: st || null,
          },
          { status: st === 'creating' ? 409 : 400 },
        );
      }

      const ip = getClientIp(request) || '0.0.0.0';

      let alpacaAccount;
      try {
        alpacaAccount = await alpaca.post('/v1/accounts', buildAccountBody(kycData, user, ip));
      } catch (e) {
        /* Alpaca refused it (4xx): no account exists, release the claim so
           the user can fix the form and retry. On a timeout or 5xx the
           account may exist, so the claim stays ('creating') rather than
           risk a second account; support resolves it. */
        if (isDefiniteRejection(e)) {
          const { error: delErr } = await admin
            .from('brokerage_accounts')
            .delete()
            .eq('id', claim.id)
            .eq('account_status', 'creating');
          if (delErr) console.error('[create-account] release claim failed:', delErr);
        } else {
          console.error('[create-account] ambiguous Alpaca failure; claim kept', claim.id);
        }
        throw e;
      }

      const status = alpacaAccount.status || 'SUBMITTED';
      const approved = status === 'APPROVED' || status === 'ACTIVE';

      const { error: insertErr } = await admin
        .from('brokerage_accounts')
        .update({
          alpaca_account_id: alpacaAccount.id,
          alpaca_account_number: alpacaAccount.account_number ?? null,
          account_status: status,
          kyc_status: approved ? 'APPROVED' : 'SUBMITTED',
          application_submitted_at: new Date().toISOString(),
          approved_at: approved ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', claim.id);

      if (insertErr) {
        /* The account exists at Alpaca; keep the claim row (status
           'creating') so no second account is opened, and surface it. */
        console.error('brokerage_accounts update after create:', insertErr, alpacaAccount.id);
        return NextResponse.json(
          { error: 'Account created but not saved; contact support', account_id: alpacaAccount.id },
          { status: 500 },
        );
      }

      try {
        const { data: existing } = await getAdminClient()
          .from('elo_transactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('category', 'activity')
          .eq('reason', 'Linked real brokerage account')
          .maybeSingle();

        if (!existing) {
          await awardELO(user.id, 75, 'Linked real brokerage account', 'activity', {
            event: 'alpaca_account_linked',
            provider: 'alpaca',
          });
        }
      } catch (eloErr) {
        console.error('[trading/create-account] awardELO failed (non-fatal):', eloErr);
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
        { status: error.status || 500 },
      );
    }
  },
  { requireAuth: true },
);
