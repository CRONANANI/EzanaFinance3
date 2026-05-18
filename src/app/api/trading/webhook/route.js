import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Verify Alpaca webhook HMAC (raw body, hex digest). Header name may vary by
 * product; we accept common variants.
 */
function verifyAlpacaWebhook(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret || typeof rawBody !== 'string') return false;
  const expectedHex = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  let sig = signatureHeader.trim();
  if (sig.includes('=')) {
    sig = sig.split('=').pop().trim();
  }
  if (sig.length !== expectedHex.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expectedHex, 'utf8'));
  } catch {
    return false;
  }
}

function getWebhookSignature(request) {
  return (
    request.headers.get('x-alpaca-signature') ||
    request.headers.get('X-Alpaca-Signature') ||
    request.headers.get('alpaca-signature') ||
    ''
  );
}

export async function POST(request) {
  const webhookSecret = process.env.ALPACA_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[trading webhook] ALPACA_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  let bodyText;
  try {
    bodyText = await request.text();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const signature = getWebhookSignature(request);
  if (!verifyAlpacaWebhook(bodyText, signature, webhookSecret)) {
    console.warn('[trading webhook] Invalid or missing signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const supabaseAdmin = getAdminClient();

    if (event.account_id && event.status_to) {
      const patch = {
        account_status: event.status_to,
        updated_at: new Date().toISOString(),
      };
      if (event.status_to === 'APPROVED' || event.status_to === 'ACTIVE') {
        patch.approved_at = new Date().toISOString();
      }

      await supabaseAdmin
        .from('brokerage_accounts')
        .update(patch)
        .eq('alpaca_account_id', event.account_id);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Alpaca webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
