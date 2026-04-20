import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'ezana.theme';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * PATCH /api/user/preferences
 *
 * Body: { theme?: 'light' | 'dark' }
 *
 * Behaviour:
 *   - Validates the incoming preference.
 *   - Writes the `ezana.theme` cookie so the blocking head script on the
 *     next load can apply the right theme before first paint (no flash).
 *   - If the request is authenticated, merges `{ theme }` into
 *     `profiles.user_settings` so the preference persists across devices.
 *   - Anonymous callers get cookie-only persistence; response signals scope.
 *
 * Returns 200 on success, 400 on invalid body, 500 on server errors.
 */
export async function PATCH(request) {
  try {
    const raw = await request.json().catch(() => null);
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const patch = {};
    if (raw.theme === 'dark' || raw.theme === 'light') {
      patch.theme = raw.theme;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No valid preference in body' }, { status: 400 });
    }

    if (patch.theme) {
      cookies().set(COOKIE_NAME, patch.theme, {
        path: '/',
        maxAge: COOKIE_MAX_AGE,
        sameSite: 'lax',
        // httpOnly: false — the blocking <script> in <head> needs to read this
        secure: process.env.NODE_ENV === 'production',
      });
    }

    let supabase;
    try {
      supabase = createServerSupabase();
    } catch {
      return NextResponse.json({ ok: true, scope: 'cookie-only' });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: true, scope: 'cookie-only' });
    }

    const { data: existing, error: readError } = await supabase
      .from('profiles')
      .select('user_settings')
      .eq('id', user.id)
      .maybeSingle();

    if (readError) {
      console.error('[PATCH /api/user/preferences] read error:', readError);
      // Cookie already set — return ok with cookie-only scope so the caller
      // knows the preference took effect for this browser even if the DB
      // write was skipped.
      return NextResponse.json({ ok: true, scope: 'cookie-only' });
    }

    const merged = { ...(existing?.user_settings ?? {}), ...patch };

    const { error: writeError } = await supabase
      .from('profiles')
      .update({
        user_settings: merged,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (writeError) {
      console.error('[PATCH /api/user/preferences] write error:', writeError);
      return NextResponse.json({ ok: true, scope: 'cookie-only' });
    }

    return NextResponse.json({ ok: true, scope: 'account', preferences: { theme: merged.theme } });
  } catch (err) {
    console.error('[PATCH /api/user/preferences] unhandled:', err);
    return NextResponse.json({ error: 'Failed to save preference' }, { status: 500 });
  }
}
