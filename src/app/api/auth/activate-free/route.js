import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getCurrentUser, getAdminClient } from '@/lib/supabase';
import { enforceAuthRateLimit } from '@/lib/auth-rate-limit';
import { isTrialSignupAccount } from '@/lib/billing/feature-access';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/activate-free
 *
 * Sets the authenticated user's plan to "free" directly on their profile.
 * No Stripe checkout, no credit card required.
 * Idempotent — calling it again on a free user is a no-op.
 *
 * Nov 21, 2026: Free is waitlist-only for new people. An account made by the
 * Advanced trial signup (no waitlist invite) cannot switch itself to Free:
 * that was a way past both the waitlist and the Advanced checkout. Accounts
 * admitted through a waitlist invite, and existing accounts, are unchanged.
 */
export const POST = withApiGuard(
  async (request, user) => {
    const limited = await enforceAuthRateLimit(request, { endpointLabel: 'activate-free' });
    if (limited) return limited;

    if (isTrialSignupAccount(user)) {
      return NextResponse.json(
        {
          error:
            'Free is opening by waitlist. Your account was created for the Advanced trial: start it from Pricing, or join the Free waitlist.',
          code: 'waitlist_only',
        },
        { status: 403 },
      );
    }

    try {
      const supabase = getAdminClient();

      // Check if user already has a paid subscription — don't downgrade them
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_plan')
        .eq('id', user.id)
        .maybeSingle();

      if (
        profile?.subscription_status === 'active' ||
        profile?.subscription_status === 'trialing'
      ) {
        return NextResponse.json({
          ok: true,
          message: 'User already has a paid subscription.',
          plan: profile.subscription_plan,
        });
      }

      // Activate the free plan
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'free',
          subscription_plan: 'free',
        })
        .eq('id', user.id);

      if (error) {
        console.error('[activate-free] update failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log(`[activate-free] user ${user.id} activated free plan`);
      return NextResponse.json({ ok: true, plan: 'free' });
    } catch (err) {
      console.error('[activate-free]', err);
      return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
    }
  },
  { requireAuth: true, strict: true },
);
