import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

async function assertCanAccessPrefs(supabase, callerUserId, targetMemberId) {
  const { data: caller } = await supabase
    .from('org_members')
    .select('id, role, team_id, org_id')
    .eq('user_id', callerUserId)
    .eq('is_active', true)
    .maybeSingle();
  const { data: target } = await supabase
    .from('org_members')
    .select('id, role, team_id, org_id')
    .eq('id', targetMemberId)
    .eq('is_active', true)
    .maybeSingle();
  if (!caller || !target || caller.org_id !== target.org_id) return { ok: false };
  if (caller.id === target.id) return { ok: true, caller, target };
  const downScope =
    (caller.role === 'executive' && target.role === 'portfolio_manager') ||
    (caller.role === 'portfolio_manager' &&
      target.role === 'analyst' &&
      caller.team_id === target.team_id);
  return downScope ? { ok: true, caller, target } : { ok: false };
}

/** GET /api/org/notification-prefs?member_id=X */
export async function GET(request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ prefs: {} });

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('member_id');
  if (!memberId) return NextResponse.json({ prefs: {} });

  const gate = await assertCanAccessPrefs(supabase, user.id, memberId);
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data } = await supabase
    .from('org_notification_preferences')
    .select('notification_key, enabled, managed_by')
    .eq('org_member_id', memberId);

  const prefs = {};
  for (const row of data || []) {
    prefs[row.notification_key] = row.enabled;
  }
  return NextResponse.json({ prefs });
}

/** POST — upsert a single toggle */
export async function POST(request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { target_member_id: targetMemberId, notification_key: notificationKey, enabled, managed_by: managedByBody } = body;

  if (!targetMemberId || !notificationKey) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const gate = await assertCanAccessPrefs(supabase, user.id, targetMemberId);
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const isSelf = gate.caller.id === targetMemberId;
  const managedBy = isSelf ? null : (managedByBody || gate.caller.id);

  const { error } = await supabase.from('org_notification_preferences').upsert(
    {
      org_member_id: targetMemberId,
      notification_key: notificationKey,
      enabled: !!enabled,
      managed_by: managedBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'org_member_id,notification_key' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
