import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { resolvePrefsAccess } from '@/lib/org-notification-prefs';

export const dynamic = 'force-dynamic';

/** GET /api/org/notification-prefs[?member_id=X] — omitted member_id = the caller's own prefs. */
export const GET = withApiGuard(
  async (request, user) => {
    const supabase = getUserClient();
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('member_id') || null;

    const gate = await resolvePrefsAccess(supabase, user.id, memberId);
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabase
      .from('org_notification_preferences')
      .select('notification_key, enabled, managed_by')
      .eq('org_member_id', gate.target.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const prefs = {};
    for (const row of data || []) {
      prefs[row.notification_key] = row.enabled;
    }
    return NextResponse.json({ prefs, memberId: gate.target.id });
  },
  { requireAuth: true },
);

/** POST — upsert a single toggle. Omitted target_member_id = the caller's own membership. */
export const POST = withApiGuard(
  async (request, user) => {
    const supabase = getUserClient();
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const {
      target_member_id: targetMemberId,
      notification_key: notificationKey,
      enabled,
    } = body || {};

    if (!notificationKey || typeof notificationKey !== 'string') {
      return NextResponse.json({ error: 'notification_key required' }, { status: 400 });
    }

    const gate = await resolvePrefsAccess(supabase, user.id, targetMemberId || null);
    if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // managed_by is always the acting supervisor (never client-supplied).
    const { error } = await supabase.from('org_notification_preferences').upsert(
      {
        org_member_id: gate.target.id,
        notification_key: notificationKey.slice(0, 80),
        enabled: !!enabled,
        managed_by: gate.isSelf ? null : gate.caller.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_member_id,notification_key' },
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, memberId: gate.target.id });
  },
  { requireAuth: true },
);
