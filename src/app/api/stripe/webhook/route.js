import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
  const headersList = headers();
  const sig = headersList.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        const planKey = session.metadata?.plan_key;

        if (!userId) {
          console.error('No supabase_user_id in checkout session metadata');
          break;
        }

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
              subscription_plan: planKey,
              current_period_end: periodEnd,
              subscription_period_end: periodEnd,
              current_plan: subscription.items?.data?.[0]?.price?.id ?? null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
          console.log(`Subscription activated for user ${userId}, plan: ${planKey}`);
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
          console.log(`One-time payment completed for user ${userId}, plan: ${planKey}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;

        const updateData = {
          subscription_status: subscription.status,
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          subscription_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        };

        if (userId) {
          await supabaseAdmin.from('profiles').update(updateData).eq('id', userId);
        } else {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', subscription.customer)
            .maybeSingle();

          if (profile) {
            await supabaseAdmin.from('profiles').update(updateData).eq('id', profile.id);
          }
        }
        console.log(`Subscription updated: ${subscription.id}, status: ${subscription.status}`);
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
        console.log(`Subscription canceled: ${subscription.id}`);
        break;
      }

      case 'invoice.paid': {
        console.log('Invoice paid:', event.data.object.id);
        break;
      }

      case 'invoice.payment_failed': {
        console.log('Invoice payment failed:', event.data.object.id);
        break;
      }

      default:
        console.log(`Unhandled event: ${event.type}`);
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
