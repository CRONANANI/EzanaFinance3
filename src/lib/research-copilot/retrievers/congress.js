import { getAdminClient } from '@/lib/supabase';
import { usd } from './shared';

/**
 * Congressional trades retriever — structured (not semantic). Filters
 * congressional_trades by ticker / politician name / year from the extracted
 * entities. Public corpus (RLS public-read). Returns human-readable rows tagged
 * corpus:'congress'; similarity is null (ranked by recency in the orchestrator).
 * Fires only when the query names a ticker or a person — never dumps the table.
 */
export const corpus = 'congress';
export const kind = 'structured';
export const scope = 'public';

/** Escape PostgREST or()-filter metacharacters in a free-text value. */
function clean(v) {
  return String(v || '').replace(/[,()%*]/g, ' ').trim();
}

export async function retrieve(query, ctx = {}, opts = {}) {
  const { limit = 6 } = opts;
  const e = ctx.entities || {};
  const admin = ctx.admin || getAdminClient();

  let q = admin
    .from('congressional_trades')
    .select(
      'id, politician_name, chamber, party, symbol, transaction_type, transaction_date, amount_min, amount_max, amount_midpoint',
    )
    .order('transaction_date', { ascending: false })
    .limit(limit);

  if (e.tickers?.length) {
    q = q.in(
      'symbol',
      e.tickers.map((t) => t.replace('$', '').toUpperCase()),
    );
  } else if (e.names?.length) {
    q = q.or(e.names.map((n) => `politician_name.ilike.%${clean(n)}%`).join(','));
  } else {
    // No ticker or person to anchor on — this corpus doesn't apply to the query.
    return [];
  }

  if (e.years?.length) {
    const y = Math.min(...e.years);
    q = q.gte('transaction_date', `${y}-01-01`);
  }

  const { data, error } = await q;
  if (error || !Array.isArray(data)) return [];

  return data.map((r) => {
    const who = `${r.chamber === 'senate' ? 'Sen.' : 'Rep.'} ${r.politician_name}`;
    const amount = usd(r.amount_midpoint ?? r.amount_max ?? r.amount_min);
    const action = String(r.transaction_type || 'traded').toLowerCase();
    return {
      corpus,
      id: String(r.id),
      title: `${who} — ${action} ${r.symbol || ''}`.trim(),
      snippet: [
        `${who} ${action} ${r.symbol || 'a security'}`,
        amount ? `(${amount})` : null,
        r.transaction_date ? `on ${r.transaction_date}` : null,
      ]
        .filter(Boolean)
        .join(' '),
      url: '/inside-the-capitol',
      similarity: null,
      date: r.transaction_date || null,
      meta: {
        politician: r.politician_name || null,
        party: r.party || null,
        symbol: r.symbol || null,
        transactionType: r.transaction_type || null,
      },
    };
  });
}
