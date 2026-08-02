import { getAdminClient } from '@/lib/supabase';
import { TICKER_ALIASES, AGENCY_ALIASES } from '@/lib/rag/aliases';
import { usd } from './shared';

/**
 * Government contracts retriever — structured. Filters
 * usaspending_contract_awards by contractor ticker / recipient name / keyword
 * (recipient or agency) and year, from the extracted entities. Public corpus
 * (RLS public-read). corpus:'contracts'; similarity null (ranked by amount+recency).
 */
export const corpus = 'contracts';
export const kind = 'structured';
export const scope = 'public';

function clean(v) {
  return String(v || '').replace(/[,()%*]/g, ' ').trim();
}

export async function retrieve(query, ctx = {}, opts = {}) {
  const { limit = 6 } = opts;
  const e = ctx.entities || {};
  const admin = ctx.admin || getAdminClient();

  let q = admin
    .from('usaspending_contract_awards')
    .select(
      'generated_award_id, award_id_piid, recipient_name, award_amount, awarding_agency, awarding_sub_agency, action_date, award_type, ticker, fiscal_year',
    )
    .order('award_amount', { ascending: false })
    .limit(limit);

  // Bidirectional lexical alias expansion (RAG_SYSTEM.md §3 P4, always-on, no LLM):
  // a ticker query (LMT) also matches recipient-name rows ("Lockheed Martin") and
  // vice-versa, and agency codes (DOD) match agency-name rows. We union ticker.eq +
  // recipient_name.ilike + awarding_agency.ilike into one OR — a superset of the
  // prior priority chain (no-alias queries resolve to the same filter as before).
  const upper = String(query || '').toUpperCase();
  const tickers = new Set((e.tickers || []).map((t) => t.replace('$', '').toUpperCase()));
  const names = new Set((e.names || []).map((n) => clean(n)).filter(Boolean));
  const agencies = new Set();
  for (const [key, alist] of Object.entries(TICKER_ALIASES)) {
    const hitKey = new RegExp(`\\b${key}\\b`).test(upper);
    const hitName = alist.some((n) => upper.includes(n.toUpperCase()));
    if (hitKey || hitName) {
      tickers.add(key);
      alist.forEach((n) => names.add(clean(n)));
    }
  }
  for (const [key, alist] of Object.entries(AGENCY_ALIASES)) {
    const hitKey = new RegExp(`\\b${key}\\b`).test(upper);
    const hitName = alist.some((n) => upper.includes(n.toUpperCase()));
    if (hitKey || hitName) [...alist, key].forEach((n) => agencies.add(clean(n)));
  }

  const orParts = [
    ...[...tickers].map((t) => `ticker.eq.${t}`),
    ...[...names].map((n) => `recipient_name.ilike.%${n}%`),
    ...[...agencies].filter(Boolean).map((a) => `awarding_agency.ilike.%${a}%`),
  ];

  if (orParts.length) {
    q = q.or(orParts.join(','));
  } else if (e.keywords?.length) {
    // Keyword fallback across recipient + awarding agency (bounded set).
    const terms = e.keywords.slice(0, 4).filter((k) => k.length >= 4);
    if (!terms.length) return [];
    q = q.or(
      terms
        .flatMap((k) => [`recipient_name.ilike.%${clean(k)}%`, `awarding_agency.ilike.%${clean(k)}%`])
        .join(','),
    );
  } else {
    return [];
  }

  if (e.years?.length) {
    const y = Math.min(...e.years);
    q = q.gte('action_date', `${y}-01-01`);
  }

  const { data, error } = await q;
  if (error || !Array.isArray(data)) return [];

  return data.map((r) => {
    const amount = usd(r.award_amount);
    const agency = r.awarding_agency || r.awarding_sub_agency || null;
    return {
      corpus,
      id: String(r.generated_award_id),
      title: `${r.recipient_name}${amount ? ` — ${amount}` : ''}`,
      snippet: [
        r.recipient_name,
        amount ? `awarded ${amount}` : 'awarded a contract',
        agency ? `by ${agency}` : null,
        r.action_date ? `on ${r.action_date}` : null,
      ]
        .filter(Boolean)
        .join(' '),
      url: '/datasets/government/contracts',
      similarity: null,
      matchType: 'structured',
      date: r.action_date || null,
      meta: {
        recipient: r.recipient_name || null,
        agency,
        amount: r.award_amount != null ? Number(r.award_amount) : null,
        ticker: r.ticker || null,
        awardId: r.award_id_piid || null,
      },
    };
  });
}
