import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { buildUserProfile } from '@/lib/notifications/interest-profile';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const auth = request.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: users } = await admin
    .from('activity_breadcrumbs')
    .select('user_id')
    .lt('created_at', cutoff);

  const uniqueIds = [...new Set((users || []).map((r) => r.user_id))];
  let usersPruned = 0;
  let rowsDeleted = 0;

  for (const userId of uniqueIds) {
    try {
      await buildUserProfile(userId);

      const { error, count } = await admin
        .from('activity_breadcrumbs')
        .delete({ count: 'exact' })
        .eq('user_id', userId)
        .lt('created_at', cutoff);

      if (error) {
        console.warn('[prune-breadcrumbs] delete error', userId, error.message);
      } else {
        rowsDeleted += count || 0;
        usersPruned += 1;
      }
    } catch (e) {
      console.warn('[prune-breadcrumbs] error for', userId, e?.message);
    }
  }

  console.log('[prune-breadcrumbs]', { users_pruned: usersPruned, rows_deleted: rowsDeleted });
  return NextResponse.json({ users_pruned: usersPruned, rows_deleted: rowsDeleted });
}
