import { getAdminClient } from '@/lib/supabase';
import { TICKER_ALIASES, AGENCY_ALIASES } from '@/lib/rag/aliases';
import { usd } from './shared';
import { findCountries, findThemes } from '@/lib/sonar/macro/route';
import { findCurrency } from '@/lib/sonar/macro/currencies';

/**
 * Government contracts retriever — structured. Filters
 * usaspending_contract_awards by contractor ticker / recipient name / keyword
 * (recipient or agency) and year, from the extracted entities. Public corpus
 * (RLS public-read). corpus:'contracts'; similarity null (ranked by amount+recency).
 */
export const corpus = 'contracts';
export const kind = 'structured';
export const scope = 'public';

/* Nov 6 (A5): question scaffolding and generic words are never contract keywords. "under"
   matched THUNDERyard and THUNDERcat, so "Is Turkey's lira under pressure?" showed
   government contract cards. */
const SCAFFOLD = new Set(
  `under over about above below pressure pressures current currently latest recent recently which what whats
  doing happening really still today now there their this that these those with from into onto
  when where while will would should could does have been being much many more most less least
  very just also even only than then them they your yours ours here going goes heading toward towards
  stress sustainable undervalued overvalued strong weak weaker stronger crisis risk risks outlook
  economy economic economies inflation rates rate currency currencies exchange dollar dollars market markets
  country countries price prices trend trends doing look looks like tell show give explain`
    .split(/\s+/)
    .filter(Boolean),
);
/* A question about government money: contracts, awards, procurement, agencies. */
const CONTRACT_CUE =
  /\b(contracts?|contractors?|awards?|awarded|procurement|government spending|federal spending|pentagon|\bdod\b|department of defense|usaspending|obligations?|idiq|task orders?|grants?)\b/i;

const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Whole words only: "under" never matches THUNDERCAT. */
export function wholeWord(term) {
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${escapeRe(String(term).toLowerCase())}(?=[^\\p{L}\\p{N}]|$)`,
    'u',
  );
}

/* A country, currency or macro-theme word belongs to the macro router, not to a
   recipient-name search ("Turkey" must not find TURKEY HILL DAIRY). */
function macroOwned(term) {
  const t = String(term || '');
  const cap = t.charAt(0).toUpperCase() + t.slice(1);
  return findCountries(cap).length > 0 || Boolean(findCurrency(t)) || findThemes(t).length > 0;
}

/** The keyword terms a query may use against recipient and agency names. */
export function contractKeywords(query, keywords = []) {
  void query;
  return keywords
    .map((k) =>
      String(k || '')
        .toLowerCase()
        .replace(/'s$/, ''),
    )
    .filter((k) => k.length >= 4 && !SCAFFOLD.has(k) && !CONTRACT_CUE.test(k) && !macroOwned(k));
}

function clean(v) {
  return String(v || '')
    .replace(/[,()%*]/g, ' ')
    .trim();
}

export async function retrieve(query, ctx = {}, opts = {}) {
  const { limit = 6 } = opts;
  const e = ctx.entities || {};
  const admin = ctx.admin || getAdminClient();

  const base = () => {
    let b = admin
      .from('usaspending_contract_awards')
      .select(
        'generated_award_id, award_id_piid, recipient_name, award_amount, awarding_agency, awarding_sub_agency, action_date, award_type, ticker, fiscal_year',
      )
      .order('award_amount', { ascending: false })
      .limit(limit);
    if (e.years?.length) b = b.gte('action_date', `${Math.min(...e.years)}-01-01`);
    return b;
  };

  let q = base();

  // Bidirectional lexical alias expansion (RAG_SYSTEM.md §3 P4, always-on, no LLM):
  // a ticker query (LMT) also matches recipient-name rows ("Lockheed Martin") and
  // vice-versa, and agency codes (DOD) match agency-name rows. We union ticker.eq +
  // recipient_name.ilike + awarding_agency.ilike into one OR — a superset of the
  // prior priority chain (no-alias queries resolve to the same filter as before).
  const upper = String(query || '').toUpperCase();
  const tickers = new Set((e.tickers || []).map((t) => t.replace('$', '').toUpperCase()));
  const names = new Set(
    (e.names || [])
      .map((n) => clean(n))
      .filter((n) => n && !macroOwned(n) && !SCAFFOLD.has(n.toLowerCase())),
  );
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

  /* Keyword fallback across recipient + awarding agency (bounded set). Only for a
     question about contracts: without a company, ticker or agency, the query needs a
     contract word ("Thundercat contracts"), or a year with one. */
  const contractAsk = CONTRACT_CUE.test(String(query || ''));
  const terms = contractAsk ? contractKeywords(query, e.keywords || []).slice(0, 4) : [];
  const keywordFilter = () => {
    if (!terms.length) return null;
    return terms
      .flatMap((k) => [`recipient_name.ilike.%${clean(k)}%`, `awarding_agency.ilike.%${clean(k)}%`])
      .join(',');
  };

  const primary = orParts.length ? orParts.join(',') : null;
  const fallback = keywordFilter();
  if (!primary && !fallback) return [];
  q = q.or(primary || fallback);

  let { data, error } = await q;
  if (error || !Array.isArray(data)) return [];

  // An exact ticker/name anchor that matches nothing must not be worse than no
  // anchor at all. Before this, a name extracted from the query (now including
  // the title-cased retry in entities.js) took the keyword fallback off the
  // table entirely, so "tesla stock" could return nothing while the keyword
  // path would have found Tesla rows. Retry once on the keyword filter.
  if (primary && fallback && !data.length) {
    const retry = await base().or(fallback);
    if (!retry.error && Array.isArray(retry.data)) data = retry.data;
  }

  /* ilike is a substring match; keep only rows a term matches as whole words. */
  const wordRes = [...names, ...agencies, ...terms].filter(Boolean).map(wholeWord);
  data = data.filter((r) => {
    if (r.ticker && tickers.has(String(r.ticker).toUpperCase())) return true;
    const hay =
      `${r.recipient_name || ''} ${r.awarding_agency || ''} ${r.awarding_sub_agency || ''}`.toLowerCase();
    return wordRes.some((re) => re.test(hay));
  });

  return data.map((r) => {
    const amount = usd(r.award_amount);
    const agency = r.awarding_agency || r.awarding_sub_agency || null;
    return {
      corpus,
      id: String(r.generated_award_id),
      title: `${r.recipient_name}${amount ? `: ${amount}` : ''}`,
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
