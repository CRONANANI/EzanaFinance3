import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { buildUserProfile } from '@/lib/notifications/interest-profile';
import { cronRoute } from '@/lib/cron/with-cron-lock';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function run(request) {
  const admin = getAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: activeUsers } = await admin
    .from('activity_breadcrumbs')
    .select('user_id')
    .gte('created_at', since);

  const uniqueIds = [...new Set((activeUsers || []).map((r) => r.user_id))];
  let processed = 0;

  for (const userId of uniqueIds) {
    try {
      await buildUserProfile(userId);
      processed += 1;
    } catch (e) {
      console.warn('[recompute-profiles] error for', userId, e?.message);
    }
  }

  console.log('[recompute-profiles]', { users_processed: processed });
  return NextResponse.json({ users_processed: processed, total_active: uniqueIds.length });
}

export const GET = cronRoute('recompute-profiles', run, { ttlSeconds: 120 });
