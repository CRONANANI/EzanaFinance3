import { Snaptrade } from 'snaptrade-typescript-sdk';
import { getAdminClient } from '@/lib/supabase';

let _client = null;

export function getSnapTradeClient() {
  if (_client) return _client;
  const clientId = process.env.SNAPTRADE_CLIENT_ID;
  const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY;
  if (!clientId || !consumerKey) {
    throw new Error('SnapTrade credentials missing (SNAPTRADE_CLIENT_ID / SNAPTRADE_CONSUMER_KEY)');
  }
  _client = new Snaptrade({ clientId, consumerKey });
  return _client;
}

/**
 * Extract the relevant fields off a SnapTrade SDK error.
 * The SDK's SnaptradeError class has flat top-level properties
 * (`status`, `responseBody`, etc.), not the axios `err.response.*` shape.
 */
export function readSnapTradeError(err) {
  const status =
    typeof err?.status === 'number'
      ? err.status
      : typeof err?.response?.status === 'number'
        ? err.response.status
        : undefined;
  const body = err?.responseBody ?? err?.response?.data ?? null;
  let detail = null;
  if (body && typeof body === 'object') {
    detail = body.detail || body.message || body.error || null;
  } else if (typeof body === 'string') {
    detail = body.slice(0, 500);
  }
  return {
    status,
    detail,
    body,
    code: err?.code,
    statusText: err?.statusText,
    url: err?.url,
    requestId:
      err?.response?.headers?.['x-request-id'] ||
      (typeof err?.headers === 'object' ? err.headers['x-request-id'] : undefined),
  };
}

export async function ensureSnapTradeUser(ezanaUserId) {
  const supabase = getAdminClient();

  const { data: existing } = await supabase
    .from('snaptrade_users')
    .select('snaptrade_user_id, user_secret')
    .eq('user_id', ezanaUserId)
    .maybeSingle();
  if (existing) {
    return { userId: existing.snaptrade_user_id, userSecret: existing.user_secret };
  }

  const snaptrade = getSnapTradeClient();
  const snapUserId = `ezana_${ezanaUserId}`;

  const persist = async (userSecret) => {
    await supabase.from('snaptrade_users').upsert(
      {
        user_id: ezanaUserId,
        snaptrade_user_id: snapUserId,
        user_secret: userSecret,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  };

  const registerAndSave = async () => {
    const res = await snaptrade.authentication.registerSnapTradeUser({ userId: snapUserId });
    const userSecret = res.data?.userSecret;
    if (!userSecret) throw new Error('SnapTrade did not return a userSecret');
    await persist(userSecret);
    return userSecret;
  };

  try {
    const userSecret = await registerAndSave();
    return { userId: snapUserId, userSecret };
  } catch (err) {
    const info = readSnapTradeError(err);
    const isAlreadyExists =
      info.status === 400 &&
      typeof info.detail === 'string' &&
      info.detail.toLowerCase().includes('already exist');

    if (!isAlreadyExists) {
      throw err;
    }

    console.warn('[ensureSnapTradeUser] orphaned SnapTrade user detected, recovering', {
      ezanaUserId,
      snapUserId,
    });

    try {
      await snaptrade.authentication.deleteSnapTradeUser({ userId: snapUserId });
    } catch (deleteErr) {
      const dInfo = readSnapTradeError(deleteErr);
      console.warn('[ensureSnapTradeUser] delete of orphan failed (continuing)', {
        snapUserId,
        status: dInfo.status,
        detail: dInfo.detail,
      });
    }

    await new Promise((r) => setTimeout(r, 750));

    const userSecret = await registerAndSave();
    return { userId: snapUserId, userSecret };
  }
}

export async function getSnapTradeCreds(ezanaUserId) {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('snaptrade_users')
    .select('snaptrade_user_id, user_secret')
    .eq('user_id', ezanaUserId)
    .maybeSingle();
  if (!data) return null;
  return { userId: data.snaptrade_user_id, userSecret: data.user_secret };
}

export async function snapshotAccount(snaptradeAccount, creds) {
  const { userId, userSecret } = creds;
  const snaptrade = getSnapTradeClient();
  const supabase = getAdminClient();

  const [detailRes, positionsRes] = await Promise.all([
    snaptrade.accountInformation.getUserAccountDetails({
      userId,
      userSecret,
      accountId: snaptradeAccount.snaptrade_account_id,
    }),
    snaptrade.accountInformation.getUserAccountPositions({
      userId,
      userSecret,
      accountId: snaptradeAccount.snaptrade_account_id,
    }),
  ]);

  const detail = detailRes.data;
  const positions = positionsRes.data || [];
  const today = new Date().toISOString().split('T')[0];

  if (detail?.balance?.total?.amount != null) {
    await supabase.from('portfolio_balance_snapshots').upsert(
      {
        user_id: snaptradeAccount.user_id,
        account_id: snaptradeAccount.id,
        snapshot_date: today,
        total_value: Number(detail.balance.total.amount),
        currency: detail.balance.total.currency || null,
      },
      { onConflict: 'account_id,snapshot_date' },
    );
  }

  if (positions.length > 0) {
    const rows = positions
      .map((p) => {
        const sym =
          p.symbol?.symbol?.raw_symbol || p.symbol?.symbol?.symbol || p.symbol?.raw_symbol;
        if (!sym) return null;
        const qty = Number(p.units || 0);
        const price = Number(p.price || 0);
        return {
          user_id: snaptradeAccount.user_id,
          account_id: snaptradeAccount.id,
          snapshot_date: today,
          ticker: String(sym).toUpperCase(),
          name: p.symbol?.symbol?.description || p.symbol?.description || null,
          quantity: qty,
          avg_cost: Number(p.average_purchase_price || 0) || null,
          price,
          market_value: qty * price,
          currency: p.currency?.code || detail?.balance?.total?.currency || null,
        };
      })
      .filter(Boolean);
    if (rows.length > 0) {
      await supabase
        .from('portfolio_position_snapshots')
        .upsert(rows, { onConflict: 'account_id,snapshot_date,ticker' });
    }
  }

  await supabase.from('snaptrade_account_sync_state').upsert(
    {
      account_id: snaptradeAccount.id,
      last_position_snapshot_date: today,
      last_balance_snapshot_date: today,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'account_id' },
  );

  return { positions: positions.length, balanceCaptured: !!detail?.balance?.total };
}

export async function backfillAccountActivities(snaptradeAccount, creds, opts = {}) {
  const { userId, userSecret } = creds;
  const snaptrade = getSnapTradeClient();
  const supabase = getAdminClient();

  const today = new Date();
  const toDate = today.toISOString().split('T')[0];
  let fromDate;
  if (opts.fullBackfill) {
    fromDate = null;
  } else {
    const { data: state } = await supabase
      .from('snaptrade_account_sync_state')
      .select('last_activity_synced_date, initial_backfill_completed_at')
      .eq('account_id', snaptradeAccount.id)
      .maybeSingle();
    if (!state?.initial_backfill_completed_at) {
      fromDate = null;
    } else if (state.last_activity_synced_date) {
      const d = new Date(state.last_activity_synced_date);
      d.setUTCDate(d.getUTCDate() - 7);
      fromDate = d.toISOString().split('T')[0];
    } else {
      fromDate = null;
    }
  }

  let inserted = 0;
  let offset = 0;
  const limit = 1000;

  while (true) {
    const res = await snaptrade.accountInformation.getAccountActivities({
      userId,
      userSecret,
      accountId: snaptradeAccount.snaptrade_account_id,
      startDate: fromDate || undefined,
      endDate: toDate,
      offset,
      limit,
    });
    const activities = res.data?.data || res.data || [];
    if (!activities.length) break;

    const rows = activities
      .map((a) => {
        if (!a?.id) return null;
        const tradeDate = (a.trade_date || a.transaction_date || a.settlement_date || '').slice(
          0,
          10,
        );
        if (!tradeDate) return null;
        return {
          user_id: snaptradeAccount.user_id,
          account_id: snaptradeAccount.id,
          snaptrade_activity_id: a.id,
          trade_date: tradeDate,
          settlement_date: a.settlement_date?.slice(0, 10) || null,
          type: (a.type || 'OTHER').toUpperCase(),
          ticker:
            a.symbol?.symbol?.raw_symbol ||
            a.symbol?.symbol?.symbol ||
            a.symbol?.raw_symbol ||
            null,
          name: a.symbol?.symbol?.description || a.description || null,
          quantity: a.units != null ? Number(a.units) : null,
          price: a.price != null ? Number(a.price) : null,
          amount: a.amount != null ? Number(a.amount) : null,
          currency: a.currency?.code || null,
          fx_rate: a.fx_rate != null ? Number(a.fx_rate) : null,
          description: a.description || null,
          raw: a,
        };
      })
      .filter(Boolean);

    if (rows.length > 0) {
      const { error } = await supabase
        .from('portfolio_transactions')
        .upsert(rows, { onConflict: 'account_id,snaptrade_activity_id' });
      if (error) {
        console.error('[snaptrade.backfill] upsert error', error);
      } else {
        inserted += rows.length;
      }
    }

    if (activities.length < limit) break;
    offset += limit;
    if (offset > 50_000) break;
  }

  const statePatch = {
    account_id: snaptradeAccount.id,
    last_activity_synced_date: toDate,
    updated_at: new Date().toISOString(),
  };
  if (opts.fullBackfill) {
    statePatch.initial_backfill_completed_at = new Date().toISOString();
  }
  await supabase.from('snaptrade_account_sync_state').upsert(statePatch, {
    onConflict: 'account_id',
  });

  return { inserted, fromDate, toDate };
}

/** Run SnapTrade snapshot + incremental activity sync for all connected accounts (cron). */
export async function runSnapTradeDailySync(supabase) {
  const { data: accounts } = await supabase
    .from('snaptrade_accounts')
    .select('id, user_id, snaptrade_account_id')
    .order('user_id');

  if (!accounts?.length) {
    return { accountsProcessed: 0, snapshotted: 0, activitiesSynced: 0, errors: 0 };
  }

  const credsCache = new Map();
  const stats = { snapshotted: 0, activitiesSynced: 0, errors: 0 };

  for (const acc of accounts) {
    try {
      let creds = credsCache.get(acc.user_id);
      if (!creds) {
        creds = await getSnapTradeCreds(acc.user_id);
        if (!creds) continue;
        credsCache.set(acc.user_id, creds);
      }
      await snapshotAccount(acc, creds);
      stats.snapshotted += 1;
      const result = await backfillAccountActivities(acc, creds);
      stats.activitiesSynced += result.inserted;
    } catch (e) {
      console.error('[snaptrade/daily-sync]', acc.id, e?.message);
      stats.errors += 1;
    }
  }

  return {
    accountsProcessed: accounts.length,
    ...stats,
  };
}

/**
 * Pull SnapTrade's canonical brokerage list and upsert it into our cache.
 * Idempotent — safe to call repeatedly. Returns { upserted, total }.
 */
export async function refreshBrokerageCache() {
  const snaptrade = getSnapTradeClient();
  const supabase = getAdminClient();

  const res = await snaptrade.referenceData.listAllBrokerages();
  const brokerages = res?.data || [];

  if (!Array.isArray(brokerages) || brokerages.length === 0) {
    return { upserted: 0, total: 0 };
  }

  const rows = brokerages
    .map((b) => {
      if (!b?.slug) return null;
      return {
        slug: b.slug,
        name: b.name || b.slug,
        display_name: b.display_name || b.name || b.slug,
        url: b.url || null,
        logo_url: b.aws_s3_logo_url || b.logo_url || null,
        square_logo_url: b.aws_s3_square_logo_url || b.square_logo_url || null,
        enabled: b.enabled !== false,
        maintenance_mode: !!b.maintenance_mode,
        allows_trading: !!b.allows_trading,
        allows_fractional_units: b.allows_fractional_units ?? null,
        open_url: b.open_url || null,
        brokerage_type: b.brokerage_type?.name || b.brokerage_type || null,
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  const { error } = await supabase
    .from('snaptrade_brokerages_cache')
    .upsert(rows, { onConflict: 'slug' });
  if (error) {
    console.error('[refreshBrokerageCache] upsert failed', error);
    throw error;
  }
  return { upserted: rows.length, total: brokerages.length };
}
