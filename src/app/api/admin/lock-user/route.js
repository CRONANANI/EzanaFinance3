import { NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  isServerSupabaseConfigured,
} from '@/lib/supabase-service-role';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Bearer secret: set `ADMIN_LOCK_SECRET` in .env.local / Vercel (never commit values).
 * Uses service role: `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL` from createServerSupabaseClient.
 * Revokes sessions like auth.admin.signOut(jwt, 'global') via RPC revoke_auth_sessions_for_user
 * (admin signOut requires that user's JWT, not their user id).
 */
const ADMIN_SECRET = process.env.ADMIN_LOCK_SECRET;

/**
 * POST /api/admin/lock-user
 *
 * Locks or unlocks a profile by email and (on lock) revokes every Auth session
 * for that user — equivalent in effect to POST /logout?scope='global' per device,
 * implemented via revoke_auth_sessions_for_user (admin.signOut needs a user JWT).
 *
 * Authorization: Authorization: Bearer <ADMIN_LOCK_SECRET>
 * Body: { email, reason?, unlock?: boolean }
 */
export async function POST(request) {
  const authHeader = request.headers.get('authorization') || '';
  const provided = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!ADMIN_SECRET || provided !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isServerSupabaseConfigured()) {
    return NextResponse.json({ error: 'Service role not configured' }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = (body?.email || '').trim().toLowerCase();
  const reason = body?.reason || 'Account access has been suspended.';
  const unlock = body?.unlock === true;

  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }

  const admin = createServerSupabaseClient();

  try {
    let targetUser = null;
    let page = 1;
    const perPage = 1000;

    while (!targetUser && page <= 50) {
      const { data: listData, error: listErr } = await admin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (listErr) {
        console.error('[admin/lock-user] listUsers failed:', listErr);
        return NextResponse.json({ error: listErr.message }, { status: 500 });
      }
      const users = listData?.users ?? [];
      targetUser = users.find((u) => u.email?.toLowerCase() === email);
      if (targetUser) break;
      if (users.length < perPage) break;
      page += 1;
    }

    if (!targetUser) {
      return NextResponse.json({ error: `No user found with email ${email}` }, { status: 404 });
    }

    const userId = targetUser.id;

    const updates = unlock
      ? { is_disabled: false, disabled_reason: null, disabled_at: null }
      : {
          is_disabled: true,
          disabled_reason: reason,
          disabled_at: new Date().toISOString(),
        };

    const { error: profileErr } = await admin.from('profiles').update(updates).eq('id', userId);

    if (profileErr) {
      console.error('[admin/lock-user] profile update failed:', profileErr);
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    let revokedSessions = false;
    if (!unlock) {
      const { error: rpcErr } = await admin.rpc('revoke_auth_sessions_for_user', {
        _user_id: userId,
      });
      if (rpcErr) {
        console.warn('[admin/lock-user] revoke_auth_sessions_for_user failed (non-fatal):', rpcErr);
      } else {
        revokedSessions = true;
      }
    }

    return NextResponse.json({
      success: true,
      action: unlock ? 'unlocked' : 'locked',
      userId,
      email: targetUser.email,
      revokedAllSessions: revokedSessions,
      reason: unlock ? null : reason,
    });
  } catch (err) {
    console.error('[admin/lock-user] unexpected error:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
