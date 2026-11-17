/**
 * Sonar adaptive research: the stored and provider data the executors read (Nov 2026).
 * Server only. Each reader returns plain rows or null and never throws; the executor decides
 * what an absence means. Reads use the service client the route already holds and public,
 * non-tenant tables only: no organization data is reachable from here.
 *
 * Column and function shapes were checked against the live database on Nov 17, 2026
 * (docs/sonar/adaptive-research/DATA_COVERAGE.md).
 */
import { fetchValuationRaw, fetchDeepValuation, fetchPeerSet } from '@/lib/sonar/valuation/fetch';
import { normalizeInputs } from '@/lib/sonar/valuation/history';
import { getMacroRankings } from '@/lib/sonar/macro/store';
import { countryBrief, rankCountries, seriesHistory } from '@/lib/sonar/macro/series-store';
import { getCommoditySeries } from '@/lib/sonar/commodity-series';
import { fetchRevenueMix } from '@/lib/sonar/revenue-mix';
import { lobbyingProfile } from '@/lib/sonar/engine/sources-positioning';
import { resolvePolitician } from '@/lib/sonar/landing-politician';
import { fetchEarningsHistory } from '@/lib/earnings/fmp-client';
import { getEarningsEvents } from '@/lib/fmp/upcoming-events';

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
const n = (v) => (v == null ? null : Number(v));
const soft = async (fn) => {
  try {
    return await fn();
  } catch {
    return null;
  }
};
const TRADE_COLS =
  'bioguide_id, chamber, type, ticker, asset_name, transaction_date, disclosure_date, amount_min, amount_max, owner, source_url';
const tradeRow = (r, nameOf) => ({
  member: String(nameOf?.get(r.bioguide_id) || 'Member of Congress'),
  bioguideId: r.bioguide_id,
  chamber: r.chamber,
  type: r.type,
  ticker: r.ticker || null,
  asset: r.asset_name || null,
  transactionDate: r.transaction_date,
  disclosureDate: r.disclosure_date || null,
  amountMin: n(r.amount_min),
  amountMax: n(r.amount_max),
  owner: r.owner || null,
  sourceUrl: /^https:\/\//.test(String(r.source_url || '')) ? r.source_url : null,
});

export function adaptiveDataDeps(admin) {
  const memberNames = async (ids) => {
    if (!ids.length) return new Map();
    const { data } = await admin
      .from('congress_members')
      .select('bioguide_id, full_name')
      .in('bioguide_id', ids);
    return new Map((data || []).map((m) => [m.bioguide_id, m.full_name]));
  };
  return {
    valuation: (ticker, { now } = {}) => fetchDeepValuation(ticker, { now, ms: 6000 }),
    peerSet: (ticker) => fetchPeerSet(ticker),
    rankings: () => getMacroRankings(),
    revenueMix: (ticker) => fetchRevenueMix(ticker, { ms: 4000 }),
    commodity: (id, from) => getCommoditySeries(id, from),
    countryBrief: (iso3, o) => countryBrief(admin, iso3, o),
    macroRank: (familyId, o) => rankCountries(admin, familyId, o),
    seriesHistory: (source, key, o) => seriesHistory(admin, source, key, o),
    /* The existing lobbying rollup (verified client-to-ticker links only). { byYear: [] } when
       no filing is linked to the ticker; null when the index could not be read. */
    async lobbying(ticker, name) {
      const out = await soft(() => lobbyingProfile({ ticker, name }, { admin }));
      if (!out) return null;
      return out.items?.[0]?.data || { byYear: [] };
    },
    async statements(ticker, { now } = {}) {
      const raw = await fetchValuationRaw(ticker, { now, ms: 6000 });
      if (!Array.isArray(raw?.income) || !raw.income.length) return null;
      return normalizeInputs(raw);
    },
    /* Reported results (with the estimate before each) and the next calendar date. */
    async earnings(ticker) {
      const t = String(ticker).toUpperCase();
      const [history, events] = await Promise.all([
        soft(() => fetchEarningsHistory(t, 12)),
        soft(() => getEarningsEvents([t])),
      ]);
      const upcoming = (events || []).filter((e) => String(e?.symbol).toUpperCase() === t);
      const rows = [...(history || []), ...upcoming];
      return rows.length ? rows : null;
    },

    /* 13F: the amendment-aware materialised positions (titans_13f_*), through the two
       SECURITY DEFINER functions the institutional pages already use. */
    async positioning13f(ticker) {
      if (!admin) return null;
      const t = String(ticker).toUpperCase();
      const [pos, style] = await Promise.all([
        admin.rpc('sonar_13f_positioning', { p_ticker: t }),
        admin.rpc('sonar_13f_style_trend', { p_ticker: t }),
      ]);
      if (pos.error || !pos.data?.period) return null;
      const d = pos.data;
      const { data: filed } = await admin
        .from('titans_13f_filers')
        .select('filed_at')
        .eq('period', d.period)
        .order('filed_at', { ascending: false })
        .limit(1);
      const move = (r) => ({
        filer: filerName(r.filer),
        shares: n(r.shares),
        changeShares: n(r.change_shares),
        status: r.status,
      });
      return {
        period: d.period,
        previousPeriod: d.previous_period || null,
        latestFiledAt: filed?.[0]?.filed_at ? String(filed[0].filed_at).slice(0, 10) : null,
        filersInPeriod: n(d.filers_in_period),
        comparedFilers: n(d.compared_filers),
        holders: n(d.holders),
        shares: n(d.shares),
        valueUsd: n(d.value_usd),
        top10Share: n(d.top10_share),
        counts: {
          opened: n(d.new_positions) || 0,
          exited: n(d.exits) || 0,
          added: n(d.added) || 0,
          reduced: n(d.reduced) || 0,
        },
        top: (d.top || []).map((r) => ({
          filer: filerName(r.filer),
          shares: n(r.shares),
          valueUsd: n(r.value_usd),
          shareOfReported: n(r.share_of_reported),
        })),
        adds: (d.adds || []).map(move),
        cuts: (d.cuts || []).map(move),
        trend: (style.data?.trend || []).map((p) => ({
          period: p.period,
          filers: n(p.filers),
          holders: n(p.holders),
          shares: n(p.shares),
          valueUsd: n(p.value_usd),
        })),
      };
    },
    /* Fund portfolio holdings from N-PORT filings. Holdings, not creations or redemptions. */
    async etfHolders(ticker) {
      if (!admin) return null;
      const { data, error } = await admin
        .from('sec_etf_holdings')
        .select('series_id, report_date, balance, value_usd, pct_value')
        .eq('ticker', String(ticker).toUpperCase())
        .order('value_usd', { ascending: false })
        .limit(40);
      if (error) return null;
      const ids = [...new Set((data || []).map((r) => r.series_id))];
      if (!ids.length) return [];
      const { data: funds } = await admin
        .from('sec_etf_funds')
        .select('series_id, ticker, fund_name, report_date')
        .in('series_id', ids);
      const fund = new Map((funds || []).map((f) => [f.series_id, f]));
      /* The latest report per fund only. */
      const seen = new Set();
      return (data || [])
        .filter((r) => fund.get(r.series_id)?.report_date === r.report_date)
        .filter((r) => (seen.has(r.series_id) ? false : seen.add(r.series_id)))
        .slice(0, 8)
        .map((r) => ({
          etf: fund.get(r.series_id).ticker,
          fund: fund.get(r.series_id).fund_name,
          reportDate: r.report_date,
          shares: n(r.balance),
          valueUsd: n(r.value_usd),
          pctOfFund: n(r.pct_value),
        }));
    },

    /* [] when the index holds no trade; null when it could not be read. */
    async congressTrades(ticker, { since }) {
      if (!admin) return null;
      const { data, error } = await admin
        .from('congress_trades')
        .select(TRADE_COLS)
        .eq('ticker', String(ticker).toUpperCase())
        .gte('transaction_date', since)
        .order('transaction_date', { ascending: false })
        .limit(200);
      if (error) return null;
      const names = await memberNames([...new Set((data || []).map((r) => r.bioguide_id))]);
      return (data || []).map((r) => tradeRow(r, names));
    },
    /* A named member: identity, committee seats and their disclosed trades. */
    async memberTrades(name, { since }) {
      if (!admin) return null;
      const member = await resolvePolitician(name, admin);
      if (!member?.bioguideId && !member?.bioguide_id) return { member: null, trades: [] };
      const id = member.bioguideId || member.bioguide_id;
      const [trades, seats] = await Promise.all([
        admin
          .from('congress_trades')
          .select(TRADE_COLS)
          .eq('bioguide_id', id)
          .gte('transaction_date', since)
          .order('transaction_date', { ascending: false })
          .limit(400),
        admin
          .from('congress_committee_members')
          .select('committee_thomas_id, title')
          .eq('bioguide_id', id)
          .limit(40),
      ]);
      if (trades.error) return null;
      const cids = [...new Set((seats.data || []).map((s) => s.committee_thomas_id))];
      const { data: committees } = cids.length
        ? await admin
            .from('congress_committees')
            .select('thomas_id, name, is_subcommittee')
            .in('thomas_id', cids)
        : { data: [] };
      const full = member.fullName || member.full_name || member.name;
      const names = new Map([[id, full]]);
      return {
        member: {
          id,
          name: full,
          chamber: member.chamber || null,
          party: member.party || null,
          state: member.state || null,
          inOffice: member.inOffice ?? member.in_office ?? null,
        },
        committees: (committees || []).filter((c) => !c.is_subcommittee).map((c) => c.name),
        trades: (trades.data || []).map((r) => tradeRow(r, names)),
      };
    },
    /* Every disclosed trade in a window, for chamber-level counts. Read in pages of 1,000
       (the API's row limit) after an exact count; the cap is reported when it is reached. */
    async chamberTrades({ since }) {
      if (!admin) return null;
      const PAGE = 1000;
      const MAX_PAGES = 12;
      const cols = 'bioguide_id, chamber, type, ticker, transaction_date, disclosure_date';
      const { count, error } = await admin
        .from('congress_trades')
        .select('id', { count: 'exact', head: true })
        .gte('transaction_date', since);
      if (error || count == null) return null;
      const pages = Math.min(MAX_PAGES, Math.ceil(count / PAGE));
      const got = await Promise.all(
        Array.from({ length: pages }, (_, i) =>
          admin
            .from('congress_trades')
            .select(cols)
            .gte('transaction_date', since)
            .order('transaction_date', { ascending: false })
            .order('id', { ascending: true })
            .range(i * PAGE, i * PAGE + PAGE - 1),
        ),
      );
      if (got.some((g) => g.error)) return null;
      return {
        capped: count > pages * PAGE,
        trades: got
          .flatMap((g) => g.data || [])
          .map((r) => ({
            member: r.bioguide_id,
            chamber: r.chamber,
            type: r.type,
            ticker: r.ticker || null,
            transactionDate: r.transaction_date,
            disclosureDate: r.disclosure_date || null,
          })),
      };
    },
    /* Forms 3, 4 and 5 as parsed from the filings. Coverage starts Sep 30, 2026. */
    async insiderTrades(ticker) {
      if (!admin) return null;
      const { data, error } = await admin
        .from('sec_insider_transactions')
        .select(
          'accession_no, form_type, filed_at, reporter_name, reporter_title, is_director, is_officer, is_ten_pct_owner, transaction_date, transaction_code, acquired_disposed, shares, price, value_usd, table_kind',
        )
        .eq('issuer_ticker', String(ticker).toUpperCase())
        .eq('table_kind', 'non_derivative')
        .order('transaction_date', { ascending: false })
        .limit(120);
      if (error) return null;
      return (data || []).map((r) => ({
        form: r.form_type,
        filedAt: r.filed_at,
        reporter: r.reporter_name,
        title:
          r.reporter_title ||
          (r.is_director
            ? 'Director'
            : r.is_ten_pct_owner
              ? '10% owner'
              : r.is_officer
                ? 'Officer'
                : null),
        date: r.transaction_date,
        code: r.transaction_code,
        side: r.acquired_disposed,
        shares: n(r.shares),
        price: n(r.price),
        valueUsd: n(r.value_usd),
      }));
    },

    /* Active sanctions list entries that name a subject (or, for a country, record it), from the
       OFAC SDN list and the EU, UK and UN consolidated lists. */
    async sanctions(subject, { country = null } = {}) {
      if (!admin) return null;
      const term = String(subject || '')
        .replace(/[%_,()*\\]/g, ' ')
        .trim()
        .slice(0, 80);
      if (term.length < 3) return { entries: [], byCountry: false };
      const CAP = 200;
      const ofac = country
        ? admin
            .from('sanctions_entries')
            .select('ent_num, name, entry_type, programs, countries, synced_at')
            .is('removed_on', null)
            .contains('countries', [country])
            .limit(CAP)
        : admin
            .from('sanctions_entries')
            .select('ent_num, name, entry_type, programs, countries, synced_at')
            .is('removed_on', null)
            .ilike('name', `%${term}%`)
            .limit(CAP);
      const intl = country
        ? admin
            .from('sanctions_intl_entries')
            .select('list_source, name, entry_type, regimes, listed_on, synced_at')
            .is('removed_on', null)
            .contains('countries', [country])
            .limit(CAP)
        : admin
            .from('sanctions_intl_entries')
            .select('list_source, name, entry_type, regimes, listed_on, synced_at')
            .is('removed_on', null)
            .ilike('name', `%${term}%`)
            .limit(CAP);
      const [a, b] = await Promise.all([ofac, intl]);
      if (a.error && b.error) return null;
      const nums = (a.data || []).map((r) => r.ent_num);
      const { data: dates } = nums.length
        ? await admin
            .from('sanctions_listing_dates')
            .select('ent_num, listed_on')
            .in('ent_num', nums.slice(0, 200))
        : { data: [] };
      const listed = new Map((dates || []).map((d) => [d.ent_num, d.listed_on]));
      const entries = [
        ...(a.data || []).map((r) => ({
          list: 'ofac',
          name: r.name,
          type: r.entry_type,
          programs: r.programs || [],
          listedOn: listed.get(r.ent_num) || null,
        })),
        ...(b.data || []).map((r) => ({
          list: r.list_source,
          name: r.name,
          type: r.entry_type,
          programs: r.regimes || [],
          listedOn: r.listed_on || null,
        })),
      ].sort((x, y) => String(y.listedOn || '').localeCompare(String(x.listedOn || '')));
      const synced = [...(a.data || []), ...(b.data || [])]
        .map((r) => r.synced_at)
        .filter(Boolean)
        .sort()
        .pop();
      return {
        entries,
        byCountry: Boolean(country),
        capped: (a.data || []).length >= CAP || (b.data || []).length >= CAP,
        syncedAt: synced ? String(synced).slice(0, 10) : null,
      };
    },

    /* Federal prime contract obligations mapped to a ticker, by fiscal year and agency. */
    async contracts(ticker) {
      if (!admin) return null;
      const t = String(ticker).toUpperCase();
      const [hist, top] = await Promise.all([
        admin
          .from('company_contract_history')
          .select('fiscal_year, awarding_agency, award_count, total_amount, synced_at')
          .eq('ticker', t)
          .limit(1000),
        admin
          .from('company_contract_top_awards')
          .select('recipient_name, awarding_agency, award_amount, action_date, fiscal_year')
          .eq('ticker', t)
          .order('award_amount', { ascending: false })
          .limit(6),
      ]);
      if (hist.error) return null;
      const byYear = new Map();
      for (const r of hist.data || []) {
        const y = byYear.get(r.fiscal_year) || {
          fiscalYear: r.fiscal_year,
          total: 0,
          count: 0,
          agencies: [],
        };
        y.total += Number(r.total_amount) || 0;
        y.count += Number(r.award_count) || 0;
        y.agencies.push({ agency: r.awarding_agency, total: Number(r.total_amount) || 0 });
        byYear.set(r.fiscal_year, y);
      }
      const years = [...byYear.values()]
        .map((y) => {
          const agencies = y.agencies.sort((a, b) => b.total - a.total);
          return { ...y, agencies, topAgency: agencies[0]?.agency || null };
        })
        .sort((a, b) => b.fiscalYear - a.fiscalYear);
      const synced =
        (hist.data || [])
          .map((r) => r.synced_at)
          .sort()
          .pop() || null;
      return {
        matched: t,
        syncedAt: synced ? String(synced).slice(0, 10) : null,
        years,
        topAwards: (top.data || []).map((a) => ({
          recipient: a.recipient_name,
          agency: a.awarding_agency,
          amount: n(a.award_amount),
          date: a.action_date,
          fiscalYear: a.fiscal_year,
        })),
      };
    },

    /* Reviewed statements quoted from the company's own filings (customers, purchase
       obligations, export risk), each with its filing URL. */
    async disclosures(ticker) {
      if (!admin) return null;
      const { data, error } = await admin
        .from('company_disclosures')
        .select('kind, party, period_label, quote, figures, source_url, form_type, filed_at')
        .eq('ticker', String(ticker).toUpperCase())
        .eq('review_status', 'approved')
        .order('filed_at', { ascending: false })
        .limit(40);
      if (error) return null;
      return (data || []).map((r) => ({
        kind: r.kind,
        party: r.party || null,
        period: r.period_label || null,
        quote: r.quote,
        figures: Array.isArray(r.figures) ? r.figures : [],
        url: /^https:\/\//.test(String(r.source_url || '')) ? r.source_url : null,
        form: r.form_type,
        filedAt: r.filed_at,
      }));
    },
    /* The Industry Registry's value chain for the company's industry, where one is mapped. */
    async valueChain(ticker) {
      if (!admin) return null;
      const { data: mine, error } = await admin
        .from('industry_companies')
        .select('industry_id, stage_id')
        .eq('ticker', String(ticker).toUpperCase())
        .limit(5);
      if (error) return null;
      const industry = mine?.[0]?.industry_id;
      if (!industry) return { industry: null, stages: [] };
      const [stages, companies] = await Promise.all([
        admin
          .from('industry_stages')
          .select('id, ord, label, description')
          .eq('industry_id', industry)
          .order('ord'),
        admin
          .from('industry_companies')
          .select('stage_id, company_name, ticker, business_model, hq_country, source_url, as_of')
          .eq('industry_id', industry)
          .limit(200),
      ]);
      const mineStages = new Set((mine || []).map((m) => m.stage_id));
      return {
        industry,
        stages: (stages.data || []).map((s) => ({
          id: s.id,
          label: s.label,
          description: s.description,
          isSubject: mineStages.has(s.id),
          companies: (companies.data || [])
            .filter((c) => c.stage_id === s.id)
            .map((c) => ({
              name: c.company_name,
              ticker: c.ticker || null,
              country: c.hq_country || null,
              model: c.business_model || null,
              url: /^https:\/\//.test(String(c.source_url || '')) ? c.source_url : null,
              asOf: c.as_of || null,
            })),
        })),
      };
    },
  };
}
