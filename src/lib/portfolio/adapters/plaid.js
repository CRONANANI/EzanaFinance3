import { getAdminClient } from '@/lib/supabase';
import { buildAccountFingerprint } from '../fingerprint';

const SOURCE = 'plaid';

export async function upsertPlaidAccount({
  userId,
  plaidAccount,
  institutionName,
  plaidInstitutionId,
}) {
  const supabase = getAdminClient();

  let institutionId = null;
  if (plaidInstitutionId) {
    const { data } = await supabase
      .from('institution_registry')
      .select('id')
      .eq('plaid_institution_id', plaidInstitutionId)
      .maybeSingle();
    institutionId = data?.id || null;
  }

  const fingerprint = buildAccountFingerprint({
    institutionName,
    accountMask: plaidAccount.mask,
    accountType: plaidAccount.subtype || plaidAccount.type,
  });

  const row = {
    user_id: userId,
    source_provider: SOURCE,
    source_account_id: plaidAccount.account_id,
    institution_id: institutionId,
    institution_name: institutionName,
    account_fingerprint: fingerprint,
    account_name: plaidAccount.name,
    account_mask: plaidAccount.mask || null,
    account_type: plaidAccount.type,
    account_subtype: plaidAccount.subtype,
    balance_total: plaidAccount.balances?.current ?? null,
    balance_cash: plaidAccount.balances?.available ?? null,
    currency: plaidAccount.balances?.iso_currency_code || 'USD',
    is_paper: false,
    status: 'active',
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

export async function upsertPlaidPositions({
  userId,
  accountId,
  holdings,
  securitiesByID,
  snapshotDate,
}) {
  const supabase = getAdminClient();
  if (!holdings || holdings.length === 0) return { inserted: 0 };

  const rows = holdings
    .map((h) => {
      const security = securitiesByID[h.security_id];
      if (!security) return null;
      const ticker = (security.ticker_symbol || security.symbol || '').toUpperCase();
      if (!ticker) return null;

      const quantity = Number(h.quantity || 0);
      const costBasis = h.cost_basis != null ? Number(h.cost_basis) : null;
      const price = h.institution_price != null ? Number(h.institution_price) : null;
      const marketValue =
        h.institution_value != null
          ? Number(h.institution_value)
          : price && quantity
            ? price * quantity
            : null;

      return {
        user_id: userId,
        account_id: accountId,
        source_provider: SOURCE,
        snapshot_date: snapshotDate,
        ticker,
        name: security.name || ticker,
        currency: h.iso_currency_code || 'USD',
        quantity,
        avg_cost: costBasis && quantity ? costBasis / quantity : null,
        aggregate_cost_basis: costBasis,
        price,
        market_value: marketValue,
        security_type: classifyPlaidSecurity(security),
        data_freshness: 'end_of_day',
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

export async function upsertPlaidTransactions({ userId, accountId, transactions }) {
  const supabase = getAdminClient();
  if (!transactions || transactions.length === 0) return { inserted: 0 };

  const rows = transactions.map((t) => ({
    user_id: userId,
    account_id: accountId,
    source_provider: SOURCE,
    source_transaction_id: t.investment_transaction_id,
    trade_date: t.date,
    settlement_date: null,
    type: normalizePlaidTransactionType(t.type, t.subtype),
    ticker: t.security?.ticker_symbol || null,
    name: t.security?.name || t.name || null,
    quantity: t.quantity != null ? Number(t.quantity) : null,
    price: t.price != null ? Number(t.price) : null,
    amount: t.amount != null ? Number(t.amount) : null,
    currency: t.iso_currency_code || 'USD',
    description: t.name || null,
    raw: t,
  }));

  const { error, count } = await supabase
    .from('unified_transactions')
    .upsert(rows, { onConflict: 'source_provider,source_transaction_id', count: 'exact' });

  if (error) throw error;
  return { inserted: count || rows.length };
}

function classifyPlaidSecurity(security) {
  const t = String(security.type || '').toLowerCase();
  if (t.includes('crypto')) return 'crypto';
  if (t.includes('etf')) return 'etf';
  if (t.includes('mutual')) return 'mutual_fund';
  if (t.includes('derivative')) return 'option';
  if (t.includes('fixed income')) return 'bond';
  if (t === 'cash') return 'cash';
  return 'equity';
}

function normalizePlaidTransactionType(type, subtype) {
  const t = String(type || '').toLowerCase();
  const s = String(subtype || '').toLowerCase();
  if (t === 'buy') return 'buy';
  if (t === 'sell') return 'sell';
  if (s.includes('dividend')) return 'dividend';
  if (s.includes('interest')) return 'interest';
  if (s.includes('fee')) return 'fee';
  if (t === 'transfer' || t === 'cash') return 'transfer';
  return 'other';
}
