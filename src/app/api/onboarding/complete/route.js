import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/onboarding/complete
 *
 * Marks the caller's onboarding questionnaire complete SERVER-SIDE.
 *
 * This exists for the same reason as /api/org/status: the browser Supabase
 * client can deadlock on its auth lock and hang `supabase.from(...)` calls
 * forever. The questionnaire completion path used to await two such writes
 * before letting the user into the platform, which is how users got stuck
 * after answering the last question. Here the caller is authenticated from
 * cookies and the write runs through the server client, so it cannot wedge
 * behind a browser-side lock.
 *
 * Body (all optional):
 *   { answers: object, profile: object }
 * `answers` is written to profiles.investor_questionnaire and `profile` to
 * profiles.investor_profile only when provided, so a flags-only call (the
 * shared handleComplete for org/partner flows) never clobbers saved answers.
 *
 * Idempotent: safe to call more than once for the same user.
 */
export const POST = withApiGuard(async (request, user) => {
  const supabase = getUserClient();

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* empty or non-JSON body is fine: flags-only completion */
  }

  const updates = {
    investor_questionnaire_completed: true,
    onboarding_completed: true,
    onboarding_step: 99,
    has_seen_tutorial: false,
    updated_at: new Date().toISOString(),
  };
  if (body && typeof body.answers === 'object' && body.answers !== null) {
    updates.investor_questionnaire = body.answers;
  }
  if (body && typeof body.profile === 'object' && body.profile !== null) {
    updates.investor_profile = body.profile;
  }

  const { data: updated, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select('id');

  if (error) {
    console.error('[api/onboarding/complete] update failed:', error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // `.update().eq()` matching zero rows returns NO error: it just writes
  // nothing. Detect that case (missing profiles row) and create the row so
  // the middleware gate flags actually exist. Mirrors the insert in
  // src/app/auth/callback/AuthCallbackClient.js; RLS policy
  // "Users insert own profile" permits it.
  if (!updated || updated.length === 0) {
    const { error: insErr } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      ...updates,
    });
    if (insErr) {
      console.error('[api/onboarding/complete] insert fallback failed:', insErr.message);
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
});
