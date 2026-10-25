/**
 * Server-side plan gate (QA RET-1). The dashboard's plan gate is browser-only
 * and fails open; routes that should be paid-only call this instead.
 *
 *   const denied = await requirePlan(user.id, { minTier: 1 });
 *   if (denied) return denied;
 *
 * Tiers come from getPlanTier (0 free, 1 personal, 2 advanced, 3 family,
 * 4 professional). The free-plan LIMITS themselves (how many watchlists,
 * slots, whether community is read-only) are a product decision that has
 * not been made, so no route calls this yet: see docs/QA_REMEDIATION_2026-10-26.md
 * for the call-site TODO list.
 *
 * Fails CLOSED on a profile read error (503), so an outage never grants a
 * paid feature.
 */
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { planDecision } from '@/lib/plan-gate';

export { planDecision };

export async function requirePlan(userId, opts = {}, admin = getAdminClient()) {
  const { data: profile, error } = await admin
    .from('profiles')
    .select('subscription_status, subscription_plan, one_time_plan, one_time_plan_purchased_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { error: 'Plan check unavailable. Please try again shortly.' },
      { status: 503 },
    );
  }
  const d = planDecision(profile, opts);
  return d ? NextResponse.json(d.body, { status: d.status }) : null;
}
