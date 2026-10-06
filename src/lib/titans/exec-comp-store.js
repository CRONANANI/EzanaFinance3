/**
 * Executive Compensation (pay versus performance) reads: SERVER ONLY, cached
 * 15 minutes under the `titans` tag. Re-exported from @/lib/titans/store.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';

const CACHE = { revalidate: 900, tags: ['titans'] };
const supa = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const n = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v));

const COLS =
  'cik, fiscal_year, peo_key, ticker, entity_name, peo_name, peo_total_comp, peo_comp_actually_paid, non_peo_neo_avg_total_comp, non_peo_neo_avg_comp_actually_paid, company_tsr, peer_group_tsr, net_income, company_selected_measure_name, company_selected_measure_value, accession_no, filed_at';

export function proxyHref(r) {
  const cik = String(r.cik || '').replace(/\D/g, '');
  if (!cik || !r.accession_no) return null;
  return `https://www.sec.gov/Archives/edgar/data/${parseInt(cik, 10)}/${String(r.accession_no).replace(/-/g, '')}/${r.accession_no}-index.htm`;
}

function shape(r) {
  return {
    cik: r.cik,
    ticker: r.ticker,
    company: r.entity_name,
    fiscalYear: r.fiscal_year,
    peoKey: r.peo_key,
    peoName: r.peo_name,
    totalComp: n(r.peo_total_comp),
    paid: n(r.peo_comp_actually_paid),
    neoTotal: n(r.non_peo_neo_avg_total_comp),
    neoPaid: n(r.non_peo_neo_avg_comp_actually_paid),
    tsr: n(r.company_tsr),
    peerTsr: n(r.peer_group_tsr),
    netIncome: n(r.net_income),
    measureName: r.company_selected_measure_name,
    measureValue: n(r.company_selected_measure_value),
    href: proxyHref(r),
    filedAt: r.filed_at,
  };
}

async function loadTable() {
  if (!supa()) return [];
  const admin = getAdminClient();
  const all = [];
  for (let p = 0; p < 40; p += 1) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('sec_exec_comp')
      .select(COLS)
      .order('cik')
      .order('fiscal_year', { ascending: false })
      .range(p * 1000, p * 1000 + 999);
    if (error) throw new Error(error.message);
    all.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  // Latest fiscal year per company; when several PEOs served that year, the
  // one with the larger total pay (usually the full-year PEO) represents it.
  const latest = new Map();
  for (const r of all) {
    const cur = latest.get(r.cik);
    if (
      !cur ||
      r.fiscal_year > cur.fiscal_year ||
      (r.fiscal_year === cur.fiscal_year && n(r.peo_total_comp) > n(cur.peo_total_comp))
    ) {
      latest.set(r.cik, r);
    }
  }
  return [...latest.values()].map(shape).sort((a, b) => (b.totalComp || 0) - (a.totalComp || 0));
}
export const getExecCompTable = unstable_cache(loadTable, ['titans-exec-comp-v1'], CACHE);

async function loadCompany(cik) {
  if (!supa() || !cik) return [];
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('sec_exec_comp')
    .select(COLS)
    .eq('cik', String(parseInt(String(cik).replace(/\D/g, ''), 10)))
    .order('fiscal_year', { ascending: true })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data || []).map(shape);
}
const cachedCompany = unstable_cache(loadCompany, ['titans-exec-comp-company-v1'], CACHE);
export function getExecCompHistory(cik) {
  return cachedCompany(String(cik || ''));
}
