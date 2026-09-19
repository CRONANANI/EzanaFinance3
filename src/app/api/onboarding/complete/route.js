import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/onboarding/complete
 *
 * Marks the caller's onboarding questionnaire complete.
 *
 * v2: the write runs on the SERVICE-ROLE client. withApiGuard has already
 * verified the caller (bearer token or cookie session), so writing that
 * user's own row with the admin client is safe, and it removes every
 * auth-context failure mode (stale route-handler cookies, RLS filtering the
 * update to zero rows) that could silently drop the flags. The route then
 * re-reads the row and returns `completed`, so the client navigates only on
 * VERIFIED persistence instead of hoping.
 *
 * Column resilience: if the full update fails with undefined-column
 * (Postgres 42703 — a migration not yet applied in this environment), it
 * retries with the minimal core flags and reports what is missing, so an
 * unapplied migration degrades to "user gets in, answers not stored" instead
 * of "user locked out", and the logs name the exact fix.
 *
 * Body (all optional): { answers: object, profile: object }
 * Idempotent: safe to call more than once for the same user.
 */
export const POST = withApiGuard(async (request, user) => {
  const admin = getAdminClient();

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* empty or non-JSON body is fine: flags-only completion */
  }

  const fullUpdates = {
    investor_questionnaire_completed: true,
    onboarding_completed: true,
    onboarding_step: 99,
    has_seen_tutorial: false,
    updated_at: new Date().toISOString(),
  };
  if (body && typeof body.answers === 'object' && body.answers !== null) {
    fullUpdates.investor_questionnaire = body.answers;
  }
  if (body && typeof body.profile === 'object' && body.profile !== null) {
    fullUpdates.investor_profile = body.profile;
  }
  const coreUpdates = {
    investor_questionnaire_completed: true,
    onboarding_completed: true,
  };

  const applyUpdate = async (updates) =>
    admin.from('profiles').update(updates).eq('id', user.id).select('id');

  let missingColumns = false;
  let { data: updated, error } = await applyUpdate(fullUpdates);

  if (error && error.code === '42703') {
    // A column from an unapplied migration. Log loudly, then persist the two
    // flags the middleware gate actually reads so the user is never trapped.
    missingColumns = true;
    console.error(
      '[api/onboarding/complete] undefined column — apply supabase/migrations/20260919130000_onboarding_columns_ensure.sql:',
      error.message,
    );
    ({ data: updated, error } = await applyUpdate(coreUpdates));
  }

  if (error) {
    console.error('[api/onboarding/complete] update failed:', error.code, error.message);
    return NextResponse.json(
      { ok: false, completed: false, error: error.message, code: error.code || null },
      { status: 500 },
    );
  }

  // update().eq() matching zero rows returns no error; a missing profiles row
  // means signup never created one. Create it with the flags (admin client, so
  // this cannot be an RLS failure).
  if (!updated || updated.length === 0) {
    const { error: insErr } = await admin.from('profiles').insert({
      id: user.id,
      email: user.email,
      ...(missingColumns ? coreUpdates : fullUpdates),
    });
    if (insErr) {
      console.error('[api/onboarding/complete] insert fallback failed:', insErr.message);
      return NextResponse.json(
        { ok: false, completed: false, error: insErr.message, code: insErr.code || null },
        { status: 500 },
      );
    }
  }

  // VERIFY: read back the one flag the middleware gate checks. `completed`
  // in the response is the client's green light to navigate.
  const { data: check, error: checkErr } = await admin
    .from('profiles')
    .select('investor_questionnaire_completed')
    .eq('id', user.id)
    .maybeSingle();

  const completed = check?.investor_questionnaire_completed === true;
  if (!completed) {
    console.error(
      '[api/onboarding/complete] verification failed:',
      checkErr?.message || 'flag not true after write',
    );
  }
  return NextResponse.json({ ok: completed, completed, degraded: missingColumns || undefined });
});
