import { getAdminClient } from '@/lib/supabase';
import { buildAccountFingerprint } from '../fingerprint';

const SOURCE = 'snaptrade';

export async function upsertSnapTradeAccount({ userId, snapAccount }) {
  const supabase = getAdminClient();

  let institutionId = null;
  if (snapAccount.institutionSlug) {
    const { data } = await supabase
      .from('institution_registry')
      .select('id')
      .eq('snaptrade_slug', snapAccount.institutionSlug)
      .maybeSingle();
    institutionId = data?.id || null;
  }

  const fingerprint = buildAccountFingerprint({
    institutionName: snapAccount.institutionName,
    accountMask: lastFour(snapAccount.accountNumber),
    accountType: snapAccount.accountCategory || snapAccount.rawType,
  });

  const row = {
    user_id: userId,
    source_provider: SOURCE,
    source_account_id: snapAccount.snapTradeAccountId,
    institution_id: institutionId,
    institution_name: snapAccount.institutionName,
    account_fingerprint: fingerprint,
    account_name: snapAccount.accountName,
    account_mask: lastFour(snapAccount.accountNumber),
    account_type: snapAccount.accountCategory,
    account_subtype: snapAccount.rawType,
    balance_total: snapAccount.balanceTotal,
    balance_cash: snapAccount.balanceCash,
    currency: snapAccount.balanceCurrency,
    is_paper: snapAccount.isPaper || false,
    status: snapAccount.status,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('unified_accounts')
    .upsert(row, { onConflict: 'source_provider,source_account_id' })
    .select()
    .single();

  if (error) {
    if (error.code === '23505' && error.message?.includes('unified_accounts_dedup_unique')) {
      const conflictErr = new Error('ACCOUNT_ALREADY_CONNECTED_VIA_OTHER_PROVIDER');
      conflictErr.code = 'cross_provider_conflict';
      conflictErr.fingerprint = fingerprint;
      throw conflictErr;
    }
    throw error;
  }

  return data;
}

export async function upsertSnapTradePositions({ userId, accountId, positions, snapshotDate }) {
  const supabase = getAdminClient();
  if (!positions || positions.length === 0) return { inserted: 0 };

  const rows = positions
    .map((p) => {
      const sym = p.symbol?.symbol?.raw_symbol || p.symbol?.symbol?.symbol || p.symbol?.raw_symbol;
      if (!sym) return null;
      const ticker = String(sym).toUpperCase();
      const quantity = Number(p.units || 0);
      const avgCost = Number(p.average_purchase_price || 0);
      const price = Number(p.price || 0);
      return {
        user_id: userId,
        account_id: accountId,
        source_provider: SOURCE,
        snapshot_date: snapshotDate,
        ticker,
        name: p.symbol?.symbol?.description || p.symbol?.description || ticker,
        currency: p.currency?.code || 'USD',
        quantity,
        avg_cost: avgCost || null,
        aggregate_cost_basis: avgCost && quantity ? avgCost * quantity : null,
        price: price || null,
        market_value: price && quantity ? price * quantity : null,
        security_type: classifySnapTradeSecurity(p),
        data_freshness: 'realtime',
      };
    })
    .filter(Boolean);

  if (rows.length === 0) return { inserted: 0 };

  const { error, count } = await supabase
    .from('unified_positions')
    .upsert(rows, { onConflict: 'account_id,snapshot_date,ticker', count: 'exact' });

  if (error) throw error;
  return { inserted: count || rows.length };
}

export async function upsertSnapTradeTransactions({ userId, accountId, activities }) {
  const supabase = getAdminClient();
  if (!activities || activities.length === 0) return { inserted: 0 };

  const rows = activities.map((a) => ({
    user_id: userId,
    account_id: accountId,
    source_provider: SOURCE,
    source_transaction_id: String(a.id),
    trade_date: (a.trade_date || a.transaction_date || '').slice(0, 10),
    settlement_date: a.settlement_date?.slice?.(0, 10) || a.settlement_date || null,
    type: normalizeSnapTradeActivityType(a.type),
    ticker: a.symbol?.raw_symbol || a.symbol?.symbol?.raw_symbol || null,
    name: a.symbol?.description || a.description || null,
    quantity: a.units != null ? Number(a.units) : null,
    price: a.price != null ? Number(a.price) : null,
    amount: a.amount != null ? Number(a.amount) : null,
    currency: a.currency?.code || 'USD',
    description: a.description || null,
    raw: a,
  }));

  const { error, count } = await supabase
    .from('unified_transactions')
    .upsert(rows, { onConflict: 'source_provider,source_transaction_id', count: 'exact' });

  if (error) throw error;
  return { inserted: count || rows.length };
}

function lastFour(s) {
  if (!s) return null;
  const str = String(s);
  return str.length >= 4 ? str.slice(-4) : str;
}

function classifySnapTradeSecurity(p) {
  const type = (p.symbol?.symbol?.type?.code || '').toLowerCase();
  if (type.includes('crypto')) return 'crypto';
  if (type.includes('etf')) return 'etf';
  if (type.includes('mutual')) return 'mutual_fund';
  if (type.includes('option')) return 'option';
  if (type.includes('bond')) return 'bond';
  return 'equity';
}

function normalizeSnapTradeActivityType(rawType) {
  const t = String(rawType || '').toUpperCase();
  if (['BUY', 'PURCHASE'].includes(t)) return 'buy';
  if (['SELL', 'SALE'].includes(t)) return 'sell';
  if (['DIVIDEND', 'DIV'].includes(t)) return 'dividend';
  if (['INTEREST'].includes(t)) return 'interest';
  if (['FEE', 'COMMISSION'].includes(t)) return 'fee';
  if (['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'CONVERSION'].includes(t)) return 'transfer';
  return 'other';
}
