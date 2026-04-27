import { NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  isServerSupabaseConfigured,
} from '@/lib/supabase-service-role';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/account/reactivate — body: { token }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const token = String(body?.token || '').trim();
    if (!token) {
      return NextResponse.json({ error: 'token required' }, { status: 400 });
    }

    if (!isServerSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Service unavailable. Please contact support.' },
        { status: 500 },
      );
    }

    const admin = createServerSupabaseClient();

    const { data: profile, error: readErr } = await admin
      .from('profiles')
      .select('id, subscription_id, deleted_at, deletion_scheduled_for')
      .eq('reactivation_token', token)
      .maybeSingle();

    if (readErr || !profile) {
      return NextResponse.json(
        { error: 'Invalid or expired reactivation link' },
        { status: 404 },
      );
    }

    if (profile.deletion_scheduled_for && new Date(profile.deletion_scheduled_for) < new Date()) {
      return NextResponse.json(
        {
          error:
            'This reactivation link has expired. Your account has been permanently deleted.',
        },
        { status: 410 },
      );
    }

    if (!profile.deleted_at) {
      return NextResponse.json({
        success: true,
        already_active: true,
      });
    }

    let stripeResumed = false;
    if (profile.subscription_id && stripe) {
      try {
        await stripe.subscriptions.update(profile.subscription_id, {
          cancel_at_period_end: false,
        });
        stripeResumed = true;
      } catch (stripeErr) {
        console.error('[account/reactivate] Stripe resume failed:', stripeErr);
      }
    }

    const { data: userData } = await admin.auth.admin.getUserById(profile.id);
    const email = userData?.user?.email || null;

    const { error: updateErr } = await admin
      .from('profiles')
      .update({
        deleted_at: null,
        deletion_scheduled_for: null,
        reactivation_token: null,
      })
      .eq('id', profile.id);

    if (updateErr) {
      console.error('[account/reactivate] profile update failed:', updateErr);
      return NextResponse.json({ error: 'Could not reactivate' }, { status: 500 });
    }

    await admin.from('account_deletion_log').insert({
      user_id: profile.id,
      event: 'reactivated',
      metadata: { stripe_resumed: stripeResumed },
    });

    return NextResponse.json({
      success: true,
      email,
      stripe_resumed: stripeResumed,
    });
  } catch (err) {
    console.error('[account/reactivate] unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Unknown error' },
      { status: 500 },
    );
  }
}
