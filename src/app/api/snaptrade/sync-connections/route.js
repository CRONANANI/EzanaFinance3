import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';
import {
  getSnapTradeClient,
  getSnapTradeCreds,
  snapshotAccount,
  backfillAccountActivities,
} from '@/lib/snaptrade';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const creds = await getSnapTradeCreds(user.id);
    if (!creds) {
      return NextResponse.json({ connections: [], accounts: [] });
    }
    const snaptrade = getSnapTradeClient();

    const authsRes = await snaptrade.connections.listBrokerageAuthorizations({
      userId: creds.userId,
      userSecret: creds.userSecret,
    });
    const auths = authsRes.data || [];

    const accountsRes = await snaptrade.accountInformation.listUserAccounts({
      userId: creds.userId,
      userSecret: creds.userSecret,
    });
    const accounts = accountsRes.data || [];

    const supabase = getAdminClient();

    for (const a of auths) {
      await supabase.from('snaptrade_connections').upsert(
        {
          user_id: user.id,
          brokerage_authorization_id: a.id,
          brokerage_name: a.brokerage?.name || 'Brokerage',
          is_disabled: !!a.disabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'brokerage_authorization_id' },
      );
    }

    const { data: connectionRows } = await supabase
      .from('snaptrade_connections')
      .select('id, brokerage_authorization_id')
      .eq('user_id', user.id);
    const authToConnectionId = Object.fromEntries(
      (connectionRows || []).map((r) => [r.brokerage_authorization_id, r.id]),
    );

    for (const acc of accounts) {
      const connId = authToConnectionId[acc.brokerage_authorization];
      if (!connId) continue;
      await supabase.from('snaptrade_accounts').upsert(
        {
          user_id: user.id,
          connection_id: connId,
          snaptrade_account_id: acc.id,
          account_number: acc.number || null,
          account_name: acc.name || null,
          institution_name: acc.institution_name || null,
          account_category: acc.account_category || null,
          raw_type: acc.raw_type || null,
          balance_total: acc.balance?.total?.amount ?? null,
          balance_currency: acc.balance?.total?.currency ?? null,
          is_paper: !!acc.is_paper,
          status: acc.status || null,
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'snaptrade_account_id' },
      );
    }

    const syncCreds = await getSnapTradeCreds(user.id);
    const { data: ourAccounts } = await supabase
      .from('snaptrade_accounts')
      .select('id, user_id, snaptrade_account_id')
      .eq('user_id', user.id);

    if (syncCreds && ourAccounts?.length) {
      Promise.allSettled(
        ourAccounts.map(async (acc) => {
          try {
            await snapshotAccount(acc, syncCreds);
            await backfillAccountActivities(acc, syncCreds, { fullBackfill: true });
          } catch (e) {
            console.error('[snaptrade/sync] backfill failed for', acc.id, e?.message);
          }
        }),
      );
    }

    return NextResponse.json({
      connections: auths.length,
      accounts: accounts.length,
    });
  } catch (err) {
    console.error('[snaptrade/sync-connections]', err);
    return NextResponse.json(
      { error: err?.response?.data?.detail || err?.message || 'Sync failed' },
      { status: 502 },
    );
  }
}
