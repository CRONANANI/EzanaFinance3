import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { PLANS } from '@/config/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function originFromRequest(request) {
  return process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'https://ezana.world';
}

export async function POST(request) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
    }

    const body = await request.json();
    const planKey = body.planKey;
    const plan = planKey ? PLANS[planKey] : null;

    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    if (!plan.priceId || plan.priceId.includes('REPLACE')) {
      return NextResponse.json(
        { error: 'Plan price ID not configured. Set NEXT_PUBLIC_STRIPE_PRICE_* in your environment.' },
        { status: 400 }
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
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // ignore when not writable
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      await supabase.from('profiles').upsert(
        {
          id: user.id,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    }

    const base = originFromRequest(request);

    const sessionParams = {
      customer: customerId,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      mode: plan.mode,
      success_url: `${base}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/pricing?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        plan_key: planKey,
      },
      allow_promotion_codes: true,
    };

    if (plan.mode === 'subscription') {
      sessionParams.subscription_data = {
        metadata: {
          supabase_user_id: user.id,
          plan_key: planKey,
        },
      };
      sessionParams.payment_method_collection = 'always';
    }

    if (plan.mode === 'payment') {
      sessionParams.invoice_creation = { enabled: true };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
