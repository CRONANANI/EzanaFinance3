import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Guided-tour completion, per account (guests keep it in localStorage only).
 *
 *   GET  /api/onboarding/tour?key=politician_v1  -> { completed }
 *   POST /api/onboarding/tour { key }            -> { ok }
 *
 * Stored in the existing profiles.user_settings jsonb under `tours`, the
 * same column the theme preference uses, so no new table is needed. Every
 * failure answers as "not completed" / cookie-only: the tour must never
 * block a page.
 */

const KEY_RE = /^[a-z0-9_-]{1,64}$/;

async function readUser() {
  let supabase;
  try {
    supabase = getUserClient();
  } catch {
    return { supabase: null, user: null };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export const GET = withApiGuard(
  async (request) => {
    const key = new URL(request.url).searchParams.get('key') || '';
    if (!KEY_RE.test(key)) {
      return NextResponse.json({ completed: false }, { status: 200 });
    }
    try {
      const { supabase, user } = await readUser();
      if (!supabase || !user) return NextResponse.json({ completed: false, scope: 'local-only' });
      const { data } = await supabase
        .from('profiles')
        .select('user_settings')
        .eq('id', user.id)
        .maybeSingle();
      return NextResponse.json({
        completed: Boolean(data?.user_settings?.tours?.[key]),
        scope: 'account',
      });
    } catch {
      return NextResponse.json({ completed: false, scope: 'local-only' });
    }
  },
  { requireAuth: false, strict: true },
);

export const POST = withApiGuard(
  async (request) => {
    const body = await request.json().catch(() => null);
    const key = typeof body?.key === 'string' ? body.key : '';
    if (!KEY_RE.test(key)) {
      return NextResponse.json({ error: 'Invalid tour key' }, { status: 400 });
    }
    try {
      const { supabase, user } = await readUser();
      if (!supabase || !user) return NextResponse.json({ ok: true, scope: 'local-only' });
      const { data: existing } = await supabase
        .from('profiles')
        .select('user_settings')
        .eq('id', user.id)
        .maybeSingle();
      const settings = existing?.user_settings ?? {};
      const merged = {
        ...settings,
        tours: { ...(settings.tours ?? {}), [key]: new Date().toISOString() },
      };
      const { error } = await supabase
        .from('profiles')
        .update({ user_settings: merged, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) {
        console.error('[POST /api/onboarding/tour] write error:', error);
        return NextResponse.json({ ok: true, scope: 'local-only' });
      }
      return NextResponse.json({ ok: true, scope: 'account' });
    } catch (err) {
      console.error('[POST /api/onboarding/tour] unhandled:', err);
      return NextResponse.json({ ok: true, scope: 'local-only' });
    }
  },
  { requireAuth: false, strict: true },
);
