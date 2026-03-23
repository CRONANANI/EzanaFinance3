import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/plaid';
import { getPlanKeyByPriceId } from '@/config/pricing';

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
        const userId = session.metadata?.supabase_user_id;
        const planKey = session.metadata?.plan_key;

        if (!userId) break;

        if (session.mode === 'subscription') {
          const subRef = session.subscription;
          if (!subRef) break;
          const subId = typeof subRef === 'string' ? subRef : subRef.id;
          const subscription = await stripe.subscriptions.retrieve(subId);
          const periodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;

          await supabaseAdmin.from('profiles').upsert(
            {
              id: userId,
              stripe_customer_id: session.customer,
              subscription_status: subscription.status,
              subscription_id: subscription.id,
              subscription_plan: planKey || getPlanKeyByPriceId(subscription.items?.data?.[0]?.price?.id),
              current_period_end: periodEnd,
              subscription_period_end: periodEnd,
              current_plan: subscription.items?.data?.[0]?.price?.id ?? null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        } else if (session.mode === 'payment') {
          await supabaseAdmin.from('profiles').upsert(
            {
              id: userId,
              stripe_customer_id: session.customer,
              one_time_plan: planKey,
              one_time_plan_purchased_at: new Date().toISOString(),
              subscription_status: 'active',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        let userId = subscription.metadata?.supabase_user_id;
        const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
        const planKeyFromPrice = getPlanKeyByPriceId(priceId);

        if (!userId) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', subscription.customer)
            .maybeSingle();
          if (profile) userId = profile.id;
        }

        if (!userId) break;

        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: subscription.status,
            subscription_id: subscription.id,
            subscription_plan: subscription.metadata?.plan_key || planKeyFromPrice,
            current_period_end: periodEnd,
            subscription_period_end: periodEnd,
            current_plan: priceId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', subscription.customer)
          .maybeSingle();

        if (profile) {
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_status: 'canceled',
              subscription_id: null,
              subscription_plan: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        console.log('[Stripe Webhook] Invoice paid:', invoice.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('[Stripe Webhook] Invoice payment failed:', invoice.id);
        let userId = null;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id
          );
          userId = sub.metadata?.supabase_user_id;
          if (!userId) {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('id')
              .eq('stripe_customer_id', sub.customer)
              .maybeSingle();
            if (profile) userId = profile.id;
          }
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
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('[Stripe Webhook] Handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
