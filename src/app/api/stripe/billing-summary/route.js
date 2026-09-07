/**
 * GET /api/stripe/billing-summary
 * Returns the user's default payment method (masked) and recent invoices.
 * { customer: bool, paymentMethod: { brand, last4, expMonth, expYear } | null,
 *   invoices: [{ id, date, description, amountCents, currency, status, hostedUrl }] }
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { stripe } from '@/lib/services/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withApiGuard(
  async (request, user) => {
    try {
      if (!stripe) {
        return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
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
        },
      );

      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .maybeSingle();

      const customerId = profile?.stripe_customer_id;
      if (!customerId) {
        return NextResponse.json({ customer: false, paymentMethod: null, invoices: [] });
      }

      const [customer, invoiceList] = await Promise.all([
        stripe.customers.retrieve(customerId, {
          expand: ['invoice_settings.default_payment_method'],
        }),
        stripe.invoices.list({ customer: customerId, limit: 12 }),
      ]);

      const pm = customer?.invoice_settings?.default_payment_method;
      const paymentMethod = pm?.card
        ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          }
        : null;

      const invoices = (invoiceList?.data || []).map((inv) => ({
        id: inv.id,
        date: inv.created * 1000,
        description: inv.lines?.data?.[0]?.description || 'Subscription',
        amountCents: inv.amount_paid || inv.amount_due || 0,
        currency: inv.currency,
        status: inv.status,
        hostedUrl: inv.hosted_invoice_url || null,
      }));

      return NextResponse.json({ customer: true, paymentMethod, invoices });
    } catch (error) {
      console.error('[Stripe] billing-summary error:', error.message);
      return NextResponse.json({ error: 'Failed to load billing summary' }, { status: 500 });
    }
  },
  { requireAuth: true },
);
