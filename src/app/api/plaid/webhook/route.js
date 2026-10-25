/**
 * POST /api/plaid/webhook — server-to-server Plaid data-update + item status webhooks.
 *
 * DASHBOARD SETUP (manual steps in dashboard.plaid.com):
 * 1. Complete application display info + company profile (some US institutions reject empty profiles).
 * 2. Add PLAID_REDIRECT_URI to Allowed redirect URIs (HTTPS, no query/hash).
 * 3. Complete OAuth registration (MSA, security questionnaire) for Production — Schwab can take ~6 weeks.
 * 4. OAuth can be tested in Sandbox first using Sandbox OAuth institutions.
 */
import { getAdminClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

import { verifyPlaidWebhook } from '@/lib/plaid-webhook-verify';
import { recordFailedJob } from '@/lib/cron/failed-jobs';
import { logger, requestIdOf } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/*
 * Reliability audit P1-10:
 *  - the JWT is verified in every environment (no NODE_ENV gate);
 *  - holdings/transactions updates are QUEUED in pending_plaid_syncs (one
 *    row per item) and drained by the plaid-sync-drain cron, so this answers
 *    fast instead of syncing inline;
 *  - a failed write answers 500 so Plaid retries; events we ignore on
 *    purpose (unknown item, unparsable) still answer 200.
 */
async function write(query) {
  const { error } = await query;
  if (error) throw new Error(error.message);
}

export async function POST(request) {
  const rawBody = await request.text();
  const valid = await verifyPlaidWebhook(rawBody, request.headers.get('plaid-verification'));
  if (!valid) {
    console.warn('[Plaid] webhook verification failed');
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ received: true, ignored: 'unparsable' });
  }

  const { webhook_type: webhookType, webhook_code: webhookCode, item_id: itemId, error } = body;
  if (!itemId) return NextResponse.json({ received: true, ignored: 'no item' });

  try {
    const admin = getAdminClient();
    const { data: item, error: readErr } = await admin
      .from('plaid_items')
      .select('id, status')
      .eq('item_id', itemId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!item) return NextResponse.json({ received: true, ignored: 'unknown item' });

    /* Bookkeeping only: never fails the webhook. */
    const { error: noteErr } = await admin
      .from('plaid_items')
      .update({ last_webhook_code: webhookCode || null, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (noteErr) console.warn('[Plaid] last_webhook_code:', noteErr.message);

    const isDataUpdate =
      (webhookType === 'HOLDINGS' || webhookType === 'INVESTMENTS_TRANSACTIONS') &&
      webhookCode === 'DEFAULT_UPDATE';
    if (isDataUpdate) {
      if (item.status === 'active') {
        await write(
          admin.from('pending_plaid_syncs').upsert(
            {
              plaid_item_db_id: item.id,
              webhook_code: `${webhookType}:${webhookCode}`,
              requested_at: new Date().toISOString(),
            },
            { onConflict: 'plaid_item_db_id' },
          ),
        );
      }
      return NextResponse.json({ received: true, queued: item.status === 'active' });
    }

    const loginRequired =
      (webhookType === 'ITEM' &&
        webhookCode === 'ERROR' &&
        error?.error_code === 'ITEM_LOGIN_REQUIRED') ||
      webhookCode === 'PENDING_EXPIRATION' ||
      webhookCode === 'USER_PERMISSION_REVOKED';

    if (loginRequired) {
      const status = webhookCode === 'USER_PERMISSION_REVOKED' ? 'revoked' : 'login_required';
      await write(
        admin
          .from('plaid_items')
          .update({
            status,
            error_code: error?.error_code || webhookCode,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id),
      );
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error('webhook failed', {
      webhook: 'plaid',
      requestId: requestIdOf(request),
      error: err?.message || String(err),
    });
    await recordFailedJob({
      job: 'webhook:plaid',
      error: err,
      payload: { item_id: itemId, webhook_type: webhookType, webhook_code: webhookCode },
    });
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
