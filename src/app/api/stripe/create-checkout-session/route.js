import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { PLANS } from '@/config/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
    }

    const { planKey, cancelPath } = await request.json();
    const plan = planKey ? PLANS[planKey] : null;

    if (!plan || !plan.priceId) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    if (!String(plan.priceId).startsWith('price_')) {
      console.error(
        `Invalid price ID for plan ${planKey}: ${plan.priceId}. Expected price_... (Stripe Price ID), not a Product ID (prod_...). Check NEXT_PUBLIC_STRIPE_PRICE_* environment variables.`
      );
      return NextResponse.json(
        { error: 'Payment configuration error. Please contact support.' },
        { status: 500 }
      );
    }

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
                // ignore
              }
            });
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'You must be signed in to subscribe' }, { status: 401 });
    }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_status, subscription_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr) {
      console.error('create-checkout-session profile fetch:', profileErr.message);
    }

    const hasExistingSubscription =
      profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing';

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      const { error: saveErr } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (saveErr) {
        console.error('Failed to save stripe_customer_id:', saveErr);
      }
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin');

    const safeCancel = cancelPath || '/onboarding';

    /** All catalog plans use recurring Stripe Prices (monthly or yearly) in subscription mode. */
    const sessionParams = {
      customer: customerId,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/home?checkout=success`,
      cancel_url: `${origin}${safeCancel}?canceled=true`,
      payment_method_collection: 'always',
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan_key: planKey,
        },
        ...(hasExistingSubscription ? {} : { trial_period_days: 14 }),
      },
      metadata: {
        supabase_user_id: user.id,
        plan_key: planKey,
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout session error:', {
      message: error?.message,
      type: error?.type,
      code: error?.code,
      statusCode: error?.statusCode,
    });

    if (error?.type === 'StripeAuthenticationError') {
      return NextResponse.json(
        { error: 'Billing authentication failed. Please contact support.' },
        { status: 503 }
      );
    }
    if (error?.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: error.message || 'Invalid checkout request.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
