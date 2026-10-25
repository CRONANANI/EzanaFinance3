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

  /* Replay guard: the HMAC has no timestamp, so a captured delivery could be
     replayed. Each event id is recorded once (alpaca_events); a repeat is
     acknowledged without processing. The id falls back to a hash of the
     signed body for events that carry none. */
  const eventId = String(
    event.event_id ?? event.id ?? crypto.createHash('sha256').update(bodyText).digest('hex'),
  );
  const supabaseAdmin = getAdminClient();
  const { error: seenErr } = await supabaseAdmin
    .from('alpaca_events')
    .insert({ id: eventId, account_id: event.account_id || null });
  if (seenErr) {
    if (seenErr.code === '23505') return NextResponse.json({ received: true, duplicate: true });
    if (seenErr.code !== '42P01') {
      console.error('[trading webhook] replay guard:', seenErr.message);
      return NextResponse.json({ error: 'Storage unavailable' }, { status: 500 });
    }
  }

  try {
    if (event.account_id && event.status_to) {
      const patch = {
        account_status: event.status_to,
        updated_at: new Date().toISOString(),
      };
      if (event.status_to === 'APPROVED' || event.status_to === 'ACTIVE') {
        patch.approved_at = new Date().toISOString();
      }

      const { error: upErr } = await supabaseAdmin
        .from('brokerage_accounts')
        .update(patch)
        .eq('alpaca_account_id', event.account_id);
      if (upErr) throw new Error(upErr.message);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Alpaca webhook error:', error);
    /* Forget the id so Alpaca's retry is processed, not dropped as a replay. */
    await supabaseAdmin.from('alpaca_events').delete().eq('id', eventId);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
