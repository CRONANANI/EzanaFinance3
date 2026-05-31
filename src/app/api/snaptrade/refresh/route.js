import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';
import { snapshotAccount, backfillAccountActivities, getSnapTradeCreds } from '@/lib/snaptrade';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const creds = await getSnapTradeCreds(user.id);
  if (!creds) return NextResponse.json({ error: 'No SnapTrade user' }, { status: 404 });

  const supabase = getAdminClient();
  const { data: accounts } = await supabase
    .from('snaptrade_accounts')
    .select('id, user_id, snaptrade_account_id')
    .eq('user_id', user.id);

  const results = await Promise.allSettled(
    (accounts || []).map(async (a) => {
      await snapshotAccount(a, creds);
      const r = await backfillAccountActivities(a, creds);
      return { accountId: a.id, newTransactions: r.inserted };
    }),
  );

  return NextResponse.json({
    refreshed: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  });
}
