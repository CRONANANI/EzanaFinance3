/**
 * POST /api/plaid/webhook — server-to-server Plaid data-update + item status webhooks.
 *
 * DASHBOARD SETUP (manual steps in dashboard.plaid.com):
 * 1. Complete application display info + company profile (some US institutions reject empty profiles).
 * 2. Add PLAID_REDIRECT_URI to Allowed redirect URIs (HTTPS, no query/hash).
 * 3. Complete OAuth registration (MSA, security questionnaire) for Production — Schwab can take ~6 weeks.
 * 4. OAuth can be tested in Sandbox first using Sandbox OAuth institutions.
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';
import { syncPlaidItem } from '@/lib/plaid-sync';
import { verifyPlaidWebhook } from '@/lib/plaid-webhook-verify';

export const dynamic = 'force-dynamic';

const VERIFY_WEBHOOKS = process.env.NODE_ENV === 'production';

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const verificationHeader = request.headers.get('plaid-verification');

    if (VERIFY_WEBHOOKS) {
      const valid = await verifyPlaidWebhook(rawBody, verificationHeader);
      if (!valid) {
        console.warn('[Plaid] webhook verification failed');
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      // TODO: enable PLAID_VERIFY_WEBHOOKS=true in production once Dashboard webhook URL is live.
      console.warn('[Plaid] webhook verification bypassed — set PLAID_VERIFY_WEBHOOKS=true');
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ received: true });
    }

    const { webhook_type: webhookType, webhook_code: webhookCode, item_id: itemId, error } = body;

    if (!itemId) {
      return NextResponse.json({ received: true });
    }

    const { data: item } = await supabaseAdmin
      .from('plaid_items')
      .select('id, user_id, access_token, institution_id, institution_name, status')
      .eq('item_id', itemId)
      .maybeSingle();

    if (!item) {
      return NextResponse.json({ received: true });
    }

    await supabaseAdmin
      .from('plaid_items')
      .update({
        last_webhook_code: webhookCode || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    const isHoldingsUpdate = webhookType === 'HOLDINGS' && webhookCode === 'DEFAULT_UPDATE';
    const isInvestmentsTxnUpdate =
      webhookType === 'INVESTMENTS_TRANSACTIONS' && webhookCode === 'DEFAULT_UPDATE';

    if (isHoldingsUpdate || isInvestmentsTxnUpdate) {
      if (item.status === 'active' && item.access_token) {
        try {
          await syncPlaidItem({
            userId: item.user_id,
            accessToken: item.access_token,
            institutionId: item.institution_id,
            institutionName: item.institution_name,
            plaidItemDbId: item.id,
          });
        } catch (syncErr) {
          console.error('[Plaid] webhook sync error:', syncErr?.message || syncErr);
        }
      }
      return NextResponse.json({ received: true });
    }

    const loginRequired =
      (webhookType === 'ITEM' &&
        webhookCode === 'ERROR' &&
        error?.error_code === 'ITEM_LOGIN_REQUIRED') ||
      webhookCode === 'PENDING_EXPIRATION' ||
      webhookCode === 'USER_PERMISSION_REVOKED';

    if (loginRequired) {
      const status = webhookCode === 'USER_PERMISSION_REVOKED' ? 'revoked' : 'login_required';
      await supabaseAdmin
        .from('plaid_items')
        .update({
          status,
          error_code: error?.error_code || webhookCode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Plaid] webhook error:', err?.message || err);
    return NextResponse.json({ received: true });
  }
}
