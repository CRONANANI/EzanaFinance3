/**
 * Sonar adaptive research: the stored and provider data the executors read (Nov 2026).
 * Server only. Each reader returns plain rows or null and never throws; the executor decides
 * what an absence means. Reads use the service client the route already holds and public,
 * non-tenant tables only: no organization data is reachable from here.
 */
import { fetchValuationRaw, fetchDeepValuation, fetchPeerSet } from '@/lib/sonar/valuation/fetch';
import { normalizeInputs } from '@/lib/sonar/valuation/history';
import { getMacroRankings } from '@/lib/sonar/macro/store';

/* All-caps filer names are softened; mixed-case names are left as filed. */
function filerName(raw) {
  const s = String(raw || '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
  if (s !== s.toUpperCase()) return s;
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\b(Llc|Lp|Llp|Na|Fsb|Plc|Ag|Sa)\b/g, (w) => w.toUpperCase());
}
function quarterOf(iso) {
  const m = /^(\d{4})-(\d{2})/.exec(String(iso || ''));
  return m ? `Q${Math.ceil(Number(m[2]) / 3)} ${m[1]}` : null;
}

export function adaptiveDataDeps(admin) {
  return {
    valuation: (ticker, { now } = {}) => fetchDeepValuation(ticker, { now, ms: 6000 }),
    peerSet: (ticker) => fetchPeerSet(ticker),
    rankings: () => getMacroRankings(),
    async statements(ticker, { now } = {}) {
      const raw = await fetchValuationRaw(ticker, { now, ms: 6000 });
      if (!Array.isArray(raw?.income) || !raw.income.length) return null;
      return normalizeInputs(raw);
    },
    async holders13f(ticker) {
      if (!admin) return null;
      const { data, error } = await admin.rpc('sonar_top_13f', {
        p_ticker: String(ticker).toUpperCase(),
        p_limit: 15,
      });
      if (error || !Array.isArray(data?.top)) return null;
      return {
        period: data.period || null,
        quarter: quarterOf(data.period),
        rows: data.top.map((r) => ({
          filer: filerName(r.filer_name),
          valueUsd: r.value_usd == null ? null : Number(r.value_usd),
          changeType: r.change_type || null,
        })),
      };
    },
    /* [] when the index holds no trade for the ticker; null when it could not be read. */
    async congressTrades(ticker, { since }) {
      if (!admin) return null;
      const { data, error } = await admin
        .from('congress_trades')
        .select(
          'bioguide_id, chamber, type, transaction_date, disclosure_date, amount_min, amount_max',
        )
        .eq('ticker', String(ticker).toUpperCase())
        .gte('transaction_date', since)
        .order('transaction_date', { ascending: false })
        .limit(60);
      if (error) return null;
      const ids = [...new Set((data || []).map((r) => r.bioguide_id).filter(Boolean))];
      const { data: members } = ids.length
        ? await admin
            .from('congress_members')
            .select('bioguide_id, full_name')
            .in('bioguide_id', ids)
        : { data: [] };
      const nameOf = new Map((members || []).map((m) => [m.bioguide_id, m.full_name]));
      return (data || []).map((r) => ({
        member: String(nameOf.get(r.bioguide_id) || 'Member of Congress'),
        chamber: r.chamber,
        type: r.type,
        transactionDate: r.transaction_date,
        disclosureDate: r.disclosure_date || null,
        amountMin: r.amount_min == null ? null : Number(r.amount_min),
        amountMax: r.amount_max == null ? null : Number(r.amount_max),
      }));
    },
  };
}
