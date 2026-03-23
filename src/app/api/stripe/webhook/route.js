import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/plaid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        let userId = session.metadata?.supabase_user_id;

        const subRef = session.subscription;
        if (subRef && !userId) {
          const subId = typeof subRef === 'string' ? subRef : subRef.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          userId = sub.metadata?.supabase_user_id;
        }

        if (userId) {
          const subId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id || null;

          await supabaseAdmin.from('profiles').upsert(
            {
              id: userId,
              stripe_customer_id: session.customer,
              subscription_status: 'active',
              subscription_id: subId,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          const priceId = sub.items?.data?.[0]?.price?.id ?? null;
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_status: sub.status,
              current_plan: priceId,
              subscription_period_end: sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_status: 'canceled',
              current_plan: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        let userId = null;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          userId = sub.metadata?.supabase_user_id;
        }
        if (userId) {
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
        }
        break;
      }

      default:
        break;
    }
  } catch (e) {
    console.error('[Stripe Webhook] Handler error:', e);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
