/**
 * POST /api/stripe/waitlist-checkout  { token }
 *
 * The card step of a paid-plan waitlist signup (Nov 21, 2026). The visitor has
 * just joined the waitlist from a paid plan on /pricing and has no account
 * yet, so this cannot use the signed-in checkout route. Instead it takes the
 * one-time `checkoutToken` /api/waitlist returned, finds that entry by the
 * token's hash, and opens Stripe Checkout in SETUP mode: the card is saved to
 * a Stripe customer and nothing is charged. When the entry is accepted,
 * /api/auth/accept-invite starts the free one-month Starter trial on that card.
 *
 * The token is good for two hours and can be reused inside that window, so a
 * visitor who backs out of Stripe can try again from the signup page.
 */
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { stripe } from '@/lib/services/stripe';
import { priceAndPeriod } from '@/lib/billing/renewal-terms';
import { starterPlanFor } from '@/lib/billing/waitlist-trial';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEAD = { error: 'This signup link has expired. Join the waitlist again to add a card.' };

export const POST = withApiGuard(
  async (request) => {
    if (!stripe) {
      return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 });
    }

    const body = await request.json().catch(() => null);
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    if (!token || token.length > 100) return NextResponse.json(DEAD, { status: 404 });

    const admin = getAdminClient();
    const hash = createHash('sha256').update(token).digest('hex');
    const { data: entry, error } = await admin
      .from('waitlist')
      .select('id, email, full_name, status, metadata')
      .eq('metadata->>checkout_token_hash', hash)
      .maybeSingle();
    if (error) {
      console.error('[waitlist-checkout] lookup failed:', error.message);
      return NextResponse.json({ error: 'Could not open checkout. Try again.' }, { status: 500 });
    }
    const meta = entry?.metadata || {};
    const expires = Date.parse(meta.checkout_token_expires_at || '');
    if (
      !entry ||
      !['pending', 'approved'].includes(entry.status) ||
      !Number.isFinite(expires) ||
      expires < Date.now()
    ) {
      return NextResponse.json(DEAD, { status: 404 });
    }

    try {
      let customerId = meta.stripe_customer_id || null;
      if (!customerId) {
        const customer = await stripe.customers.create(
          {
            email: entry.email,
            name: entry.full_name || undefined,
            metadata: { waitlist_id: entry.id, source: 'waitlist' },
          },
          { idempotencyKey: `wl-cust:${entry.id}` },
        );
        customerId = customer.id;
        const { error: saveErr } = await admin
          .from('waitlist')
          .update({ metadata: { ...meta, stripe_customer_id: customerId } })
          .eq('id', entry.id);
        if (saveErr) {
          console.error('[waitlist-checkout] save customer failed:', entry.id, saveErr.message);
          return NextResponse.json(
            { error: 'Could not open checkout. Try again.' },
            { status: 500 },
          );
        }
      }

      const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin');
      const starter = starterPlanFor(meta.billing);
      const message =
        'No charge today: Stripe saves your card. When you are accepted from the waitlist, ' +
        `your free 30-day Starter trial starts, then ${priceAndPeriod(starter)}, billed ` +
        'automatically until you cancel. You can move to Advanced at any time, and you can ' +
        'cancel in Settings, Billing before the trial ends without being charged.';

      const session = await stripe.checkout.sessions.create({
        mode: 'setup',
        customer: customerId,
        /* Dynamic payment methods: cards plus whatever is switched on in the
           Stripe dashboard (Link, Apple Pay, Google Pay). Setup mode needs the
           currency to choose them. */
        currency: 'usd',
        success_url: `${origin}/auth/signup?waitlist=card-saved`,
        cancel_url: `${origin}/auth/signup?waitlist=card-skipped&resume=1`,
        custom_text: { submit: { message } },
        setup_intent_data: {
          metadata: { waitlist_id: entry.id, purpose: 'waitlist_trial' },
        },
        metadata: { waitlist_id: entry.id, purpose: 'waitlist_trial' },
      });
      return NextResponse.json({ url: session.url });
    } catch (err) {
      console.error('[waitlist-checkout] stripe error:', err?.type, err?.message);
      return NextResponse.json({ error: 'Could not open checkout. Try again.' }, { status: 502 });
    }
  },
  { requireAuth: false, strict: true },
);
