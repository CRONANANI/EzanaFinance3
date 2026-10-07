/**
 * Dimension hub reads: SERVER ONLY (admin client). Every export is wrapped in
 * unstable_cache for 15 minutes under the `hubs` tag; the ingest crons that
 * write these tables revalidate it.
 *
 * Two kinds of reads:
 *   getDatasetSummary(label)  the two or three numbers that summarise one
 *                             taxonomy dataset, its freshest date and a count
 *                             of its records.
 *   getLinkage(id)            one cross-dataset linkage card's rows.
 *
 * Nothing is estimated or filled in. A table with no rows returns
 * { empty: true } and the card says what fills it. PostgREST returns at most
 * 1,000 rows a request, so sums read the rows in parallel pages.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { latestCompleteQuarter, quarterLabelLong } from '@/lib/sec/quarters';
import { sectorsForTicker } from '@/lib/congress/policy-sector-map';
import { sectorsForCommittee, sectorLabel } from '@/lib/congress/committee-sectors';
import { shortCommitteeName } from '@/lib/congress/committee-data';
import {
  OECD_CURATED_SLUGS,
  OECD_SERIES_BY_SLUG,
  OECD_AGGREGATE_AREAS,
  PROJECTION_FROM_YEAR,
} from '@/lib/oecd-curated';
import { getInstitutionalOverview } from '@/lib/titans/store';
import { HUB_QUERIES as Q } from './hub-queries';

const CACHE = { revalidate: 900, tags: ['hubs'] };
const PAGE = 1000;
const PARALLEL = 8;

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const day = (v) => (v ? String(v).slice(0, 10) : null);
const isoDaysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const thisYear = () => new Date().getUTCFullYear();

/* An RPC that takes longer than this is abandoned; the card shows its retry
   state and the next request tries again. */
const RPC_TIMEOUT_MS = 9000;
const timed = (q) => q.abortSignal(AbortSignal.timeout(RPC_TIMEOUT_MS));

function configured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function count(build) {
  const { count: n, error } = await build();
  if (error) throw new Error(error.message);
  return n || 0;
}

/**
 * Every row of a query, read in parallel 1,000-row pages. `build` returns a
 * fresh, ordered query; `total` is its exact count.
 */
async function readAll(build, total, cap = 120) {
  const pages = Math.min(Math.ceil(total / PAGE), cap);
  const out = [];
  for (let start = 0; start < pages; start += PARALLEL) {
    const batch = [];
    for (let p = start; p < Math.min(start + PARALLEL, pages); p += 1) {
      batch.push(build().range(p * PAGE, p * PAGE + PAGE - 1));
    }
    // eslint-disable-next-line no-await-in-loop
    const results = await Promise.all(batch);
    for (const { data, error } of results) {
      if (error) throw new Error(error.message);
      out.push(...(data || []));
    }
  }
  return out;
}

function topBy(rows, keyFn, valFn = () => 1) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (k == null || k === '') continue;
    m.set(k, (m.get(k) || 0) + (valFn(r) || 0));
  }
  let best = null;
  for (const [k, v] of m) if (!best || v > best.value) best = { key: k, value: v };
  return best;
}

function median(values) {
  const v = values.filter((x) => x != null).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/* A number on a card: { label, value, kind } where kind picks the formatter
   (int, usd, date, text). Values stay raw; the page formats them. */
const n = (label, value, kind = 'int') => ({ label, value, kind });

/* ── dataset summaries, keyed by taxonomy item label ─────────────────── */

const SUMMARIES = {
  async 'Politician Tracker'(admin) {
    const since = isoDaysAgo(30);
    const q = () =>
      admin
        .from('congress_trades_enriched')
        .select('id, bioguide_id, ticker, disclosure_date')
        .gte('disclosure_date', since)
        .order('id');
    const total = await count(() =>
      admin
        .from('congress_trades_enriched')
        .select('id', { count: 'exact', head: true })
        .gte('disclosure_date', since),
    );
    const records = await count(() =>
      admin.from('congress_trades').select('id', { count: 'exact', head: true }),
    );
    if (!records) return { empty: true, records };
    const rows = total ? await readAll(q, total) : [];
    const members = new Set(rows.map((r) => r.bioguide_id).filter(Boolean)).size;
    const top = topBy(rows, (r) => (r.ticker ? String(r.ticker).toUpperCase() : null));
    const { data: latest } = await admin
      .from('congress_trades')
      .select('disclosure_date')
      .not('disclosure_date', 'is', null)
      .order('disclosure_date', { ascending: false })
      .limit(1);
    return {
      records,
      freshest: day(latest?.[0]?.disclosure_date),
      numbers: [
        n('Trades disclosed, last 30 days', total),
        n('Members trading', members),
        n('Most traded this month', top ? `${top.key} (${top.value})` : null, 'text'),
      ],
    };
  },

  async 'Campaign Finance Records'(admin) {
    const { data: cyc } = await admin
      .from('ezq_campaign_finance')
      .select('cycle')
      .order('cycle', { ascending: false })
      .limit(1);
    const cycle = cyc?.[0]?.cycle;
    if (!cycle) return { empty: true, records: 0 };
    const total = await count(() =>
      admin
        .from('ezq_campaign_finance')
        .select('bioguide_id', { count: 'exact', head: true })
        .eq('cycle', cycle),
    );
    const rows = await readAll(
      () =>
        admin
          .from('ezq_campaign_finance')
          .select('bioguide_id, member_name, receipts, coverage_end_date')
          .eq('cycle', cycle)
          .order('bioguide_id'),
      total,
    );
    const raised = rows.reduce((s, r) => s + (num(r.receipts) || 0), 0);
    const top = rows.reduce(
      (b, r) => (num(r.receipts) != null && (!b || num(r.receipts) > num(b.receipts)) ? r : b),
      null,
    );
    const freshest = rows.reduce(
      (m, r) => (r.coverage_end_date && r.coverage_end_date > (m || '') ? r.coverage_end_date : m),
      null,
    );
    return {
      records: total,
      freshest: day(freshest),
      numbers: [
        n(`Members with FEC filings, ${cycle} cycle`, total),
        n('Total raised', raised, 'usd'),
        n('Top raiser', top ? top.member_name : null, 'text'),
      ],
    };
  },

  async 'Lobbying Activity'(admin) {
    const year = thisYear();
    const records = await count(() =>
      admin.from('lobbying_filings').select('uuid', { count: 'exact', head: true }),
    );
    if (!records) return { empty: true, records };
    const total = await count(() =>
      admin
        .from('lobbying_filings')
        .select('uuid', { count: 'exact', head: true })
        .eq('filing_year', year),
    );
    const rows = await readAll(
      () =>
        admin
          .from('lobbying_filings')
          .select('uuid, amount, client_name')
          .eq('filing_year', year)
          .order('uuid'),
      total,
    );
    const spend = rows.reduce((s, r) => s + (num(r.amount) || 0), 0);
    const top = topBy(
      rows,
      (r) => r.client_name,
      (r) => num(r.amount),
    );
    const { data: latest } = await admin
      .from('lobbying_filings')
      .select('dt_posted')
      .not('dt_posted', 'is', null)
      .order('dt_posted', { ascending: false })
      .limit(1);
    return {
      records,
      freshest: day(latest?.[0]?.dt_posted),
      numbers: [
        n(`Filings in ${year}`, total),
        n(`Reported spend, ${year}`, spend, 'usd'),
        n('Top spender', top ? top.key : null, 'text'),
      ],
    };
  },

  async 'Government Contracts'(admin) {
    const since = isoDaysAgo(90);
    const records = await count(() =>
      admin
        .from('usaspending_contract_awards')
        .select('generated_award_id', { count: 'exact', head: true }),
    );
    if (!records) return { empty: true, records };
    const total = await count(() =>
      admin
        .from('usaspending_contract_awards')
        .select('generated_award_id', { count: 'exact', head: true })
        .gte('action_date', since),
    );
    const rows = await readAll(
      () =>
        admin
          .from('usaspending_contract_awards')
          .select('generated_award_id, award_amount, recipient_name')
          .gte('action_date', since)
          .order('generated_award_id'),
      total,
    );
    const value = rows.reduce((s, r) => s + (num(r.award_amount) || 0), 0);
    const top = topBy(
      rows,
      (r) => r.recipient_name,
      (r) => num(r.award_amount),
    );
    const { data: latest } = await admin
      .from('usaspending_contract_awards')
      .select('action_date')
      /* Some awards carry a future action date; freshness is what has happened. */
      .lte('action_date', isoDaysAgo(0))
      .order('action_date', { ascending: false })
      .limit(1);
    return {
      records,
      freshest: day(latest?.[0]?.action_date),
      numbers: [
        n('Awards, last 90 days', total),
        n('Total value', value, 'usd'),
        n('Top recipient', top ? top.key : null, 'text'),
      ],
    };
  },

  async 'Committee Assignments'(admin) {
    const [committees, subs, seats, latest] = await Promise.all([
      count(() =>
        admin
          .from('congress_committees')
          .select('thomas_id', { count: 'exact', head: true })
          .eq('is_subcommittee', false),
      ),
      count(() =>
        admin
          .from('congress_committees')
          .select('thomas_id', { count: 'exact', head: true })
          .eq('is_subcommittee', true),
      ),
      count(() =>
        admin
          .from('congress_committee_members')
          .select('bioguide_id', { count: 'exact', head: true }),
      ),
      admin
        .from('congress_committee_members')
        .select('synced_at')
        .order('synced_at', { ascending: false })
        .limit(1),
    ]);
    if (!seats) return { empty: true, records: 0 };
    const synced = day(latest.data?.[0]?.synced_at);
    return {
      records: seats,
      freshest: synced,
      numbers: [
        n('Committees and subcommittees', `${committees} and ${subs}`, 'text'),
        n('Seats', seats),
        n('Last sync', synced, 'date'),
      ],
    };
  },

  async Institutional(admin) {
    const quarter = latestCompleteQuarter(new Date());
    const records = await count(() =>
      admin.from('sec_13f_holdings').select('accession_no', { count: 'exact', head: true }),
    );
    if (!records) return { empty: true, records };
    const filings = await readAll(
      () =>
        admin
          .from('sec_filings')
          .select('accession_no, cik')
          .eq('form_family', 'institutional')
          .eq('period_of_report', quarter)
          .order('accession_no'),
      await count(() =>
        admin
          .from('sec_filings')
          .select('accession_no', { count: 'exact', head: true })
          .eq('form_family', 'institutional')
          .eq('period_of_report', quarter),
      ),
    );
    const filers = new Set(filings.map((f) => f.cik)).size;
    /* Total value and the most widely held security come from the quarterly
       snapshot; until it exists they are left unreported, not summed from a
       partial read. */
    let overview = null;
    try {
      overview = await getInstitutionalOverview();
    } catch {
      overview = null;
    }
    const top = overview?.widelyHeld?.[0];
    return {
      records,
      freshest: quarter,
      numbers: [
        n(`13F filers, ${quarterLabelLong(quarter)}`, filers),
        n('Total reported value', overview ? overview.totalValueUsd : null, 'usd'),
        n(
          'Most widely held',
          top ? `${top.ticker || top.issuer} (${top.holders} funds)` : null,
          'text',
        ),
      ],
      note: overview ? null : 'Value and most widely held appear once the quarterly snapshot runs.',
    };
  },

  async Activist(admin) {
    const since = isoDaysAgo(90);
    const [records, recent, newest] = await Promise.all([
      count(() =>
        admin.from('ezq_activist_stakes').select('accession_no', { count: 'exact', head: true }),
      ),
      count(() =>
        admin
          .from('ezq_activist_stakes')
          .select('accession_no', { count: 'exact', head: true })
          .gte('filed_at', since),
      ),
      admin
        .from('ezq_activist_stakes')
        .select('filer_name, subject_name, ticker, percent_of_class, filed_at')
        .order('filed_at', { ascending: false })
        .limit(1),
    ]);
    if (!records) return { empty: true, records };
    const s = newest.data?.[0];
    return {
      records,
      freshest: day(s?.filed_at),
      numbers: [
        n('13D and 13G stakes, last 90 days', recent),
        n(
          'Newest stake',
          s
            ? `${s.filer_name || 'Filer'} in ${s.ticker || s.subject_name || 'a company'}${
                num(s.percent_of_class) != null ? ` (${num(s.percent_of_class)}%)` : ''
              }`
            : null,
          'text',
        ),
      ],
    };
  },

  async 'Fund Holdings Data'(admin) {
    return SUMMARIES['SEC EDGAR'](admin);
  },

  async 'SEC EDGAR'(admin) {
    const since = isoDaysAgo(30);
    const fam = (family) =>
      count(() =>
        admin
          .from('sec_filings')
          .select('accession_no', { count: 'exact', head: true })
          .eq('form_family', family)
          .gte('filed_at', since),
      );
    const [records, inst, act, ins, latest] = await Promise.all([
      count(() => admin.from('sec_filings').select('accession_no', { count: 'exact', head: true })),
      fam('institutional'),
      fam('activist'),
      fam('insider'),
      admin.from('sec_filings').select('filed_at').order('filed_at', { ascending: false }).limit(1),
    ]);
    if (!records) return { empty: true, records };
    return {
      records,
      freshest: day(latest.data?.[0]?.filed_at),
      numbers: [
        n('13F filings, last 30 days', inst),
        n('13D and 13G, last 30 days', act),
        n('Form 4, last 30 days', ins),
      ],
    };
  },

  async 'Whale Moves'(admin) {
    const { data: q } = await admin
      .from('whale_moves')
      .select('quarter')
      .not('quarter', 'is', null)
      .order('quarter', { ascending: false })
      .limit(1);
    const quarter = q?.[0]?.quarter;
    const records = await count(() =>
      admin.from('whale_moves').select('id', { count: 'exact', head: true }),
    );
    if (!records || !quarter) return { empty: true, records };
    const [moves, top, latest] = await Promise.all([
      count(() =>
        admin
          .from('whale_moves')
          .select('id', { count: 'exact', head: true })
          .eq('quarter', quarter),
      ),
      admin
        .from('whale_moves')
        .select('filer_name, ticker, issuer, whale_score, change_type')
        .eq('quarter', quarter)
        .order('whale_score', { ascending: false, nullsFirst: false })
        .limit(1),
      admin.from('whale_moves').select('filed_at').order('filed_at', { ascending: false }).limit(1),
    ]);
    const t = top.data?.[0];
    return {
      records,
      freshest: day(latest.data?.[0]?.filed_at),
      numbers: [
        n(`Scored moves, ${quarter.replace(/^CY(\d{4})Q(\d)$/, 'Q$2 $1')}`, moves),
        n(
          'Top scored move',
          t
            ? `${t.filer_name || 'Filer'}: ${t.ticker || t.issuer} (${Math.round(num(t.whale_score) || 0)})`
            : null,
          'text',
        ),
      ],
    };
  },

  async 'Insider Trading'(admin) {
    const since = isoDaysAgo(30);
    const records = await count(() =>
      admin.from('sec_insider_transactions').select('accession_no', { count: 'exact', head: true }),
    );
    if (!records)
      return {
        empty: true,
        records,
        fills: 'Fills as the daily Form 4 ingest and the quarterly SEC insider data sets load.',
      };
    const q = (code) => () =>
      admin
        .from('sec_insider_transactions')
        .select('accession_no, table_kind, line_no, value_usd')
        .eq('transaction_code', code)
        .eq('table_kind', 'non_derivative')
        .gte('transaction_date', since)
        .order('accession_no')
        .order('line_no');
    const side = async (code) => {
      const total = await count(() =>
        admin
          .from('sec_insider_transactions')
          .select('accession_no', { count: 'exact', head: true })
          .eq('transaction_code', code)
          .eq('table_kind', 'non_derivative')
          .gte('transaction_date', since),
      );
      const rows = await readAll(q(code), total, 40);
      return { total, value: rows.reduce((s, r) => s + (num(r.value_usd) || 0), 0) };
    };
    const [buys, sells, latest] = await Promise.all([
      side('P'),
      side('S'),
      admin
        .from('sec_insider_transactions')
        .select('filed_at')
        .order('filed_at', { ascending: false })
        .limit(1),
    ]);
    return {
      records,
      freshest: day(latest.data?.[0]?.filed_at),
      numbers: [
        n('Open-market buys (P), 30 days', `${buys.total} worth ${fmtUsd(buys.value)}`, 'text'),
        n('Open-market sells (S), 30 days', `${sells.total} worth ${fmtUsd(sells.value)}`, 'text'),
      ],
    };
  },

  async 'Executive Compensation'(admin) {
    const records = await count(() =>
      admin.from('sec_exec_comp').select('cik', { count: 'exact', head: true }),
    );
    if (!records)
      return {
        empty: true,
        records,
        fills: 'Fills as the daily proxy ingest reads pay versus performance disclosures.',
      };
    const rows = await readAll(
      () =>
        admin
          .from('sec_exec_comp')
          .select('cik, fiscal_year, peo_key, peo_total_comp, synced_at')
          .order('cik')
          .order('fiscal_year')
          .order('peo_key'),
      records,
      20,
    );
    const latestYear = rows.reduce((m, r) => Math.max(m, r.fiscal_year || 0), 0);
    const pay = median(
      rows.filter((r) => r.fiscal_year === latestYear).map((r) => num(r.peo_total_comp)),
    );
    const synced = rows.reduce((m, r) => (r.synced_at > (m || '') ? r.synced_at : m), null);
    return {
      records,
      freshest: day(synced),
      numbers: [
        n('Companies covered', new Set(rows.map((r) => r.cik)).size),
        n('Latest fiscal year', latestYear || null, 'text'),
        n(`Median CEO total pay, ${latestYear}`, pay, 'usd'),
      ],
    };
  },

  async 'ETF Holdings'(admin) {
    const records = await count(() =>
      admin.from('sec_etf_holdings').select('series_id', { count: 'exact', head: true }),
    );
    if (!records)
      return {
        empty: true,
        records,
        fills: 'Fills as the daily N-PORT ingest loads the tracked funds.',
      };
    const [funds, latest] = await Promise.all([
      count(() =>
        admin
          .from('sec_etf_funds')
          .select('series_id', { count: 'exact', head: true })
          .not('report_date', 'is', null),
      ),
      admin
        .from('sec_etf_holdings')
        .select('report_date')
        .order('report_date', { ascending: false })
        .limit(1),
    ]);
    const d = day(latest.data?.[0]?.report_date);
    return {
      records,
      freshest: d,
      numbers: [n('ETFs covered', funds), n('Latest report date', d, 'date')],
    };
  },

  async 'Prices & Fundamentals'(admin) {
    const records = await count(() =>
      admin.from('sec_fundamentals').select('cik', { count: 'exact', head: true }),
    );
    if (!records)
      return {
        empty: true,
        records,
        fills: 'Fills as the daily XBRL frames ingest runs. Prices are pending a licensed source.',
      };
    const [companies, latest] = await Promise.all([
      count(() =>
        admin
          .from('sec_fundamentals')
          .select('cik', { count: 'exact', head: true })
          .eq('concept', 'revenue')
          .eq('period_type', 'annual'),
      ),
      admin
        .from('sec_fundamentals')
        .select('frame, period_end')
        .eq('period_type', 'annual')
        .order('frame', { ascending: false })
        .limit(1),
    ]);
    const frame = latest.data?.[0]?.frame || null;
    return {
      records,
      freshest: day(latest.data?.[0]?.period_end),
      numbers: [
        n('Companies with annual revenue', companies),
        n('Latest fiscal year loaded', frame ? frame.replace(/^CY/, '') : null, 'text'),
        n('Prices', 'Pending', 'text'),
      ],
    };
  },

  async 'OECD Macro Data'(admin) {
    const obs = await oecdLatest(admin);
    if (!obs.length) return { empty: true, records: 0 };
    const records = await count(() =>
      admin.from('oecd_series_observations').select('ezana_slug', { count: 'exact', head: true }),
    );
    const countries = new Set(
      obs.filter((o) => !OECD_AGGREGATE_AREAS.includes(o.ref_area)).map((o) => o.ref_area),
    ).size;
    const series = new Set(obs.map((o) => o.ezana_slug)).size;
    const latestYear = obs.reduce((m, o) => Math.max(m, o.latest_year || 0), 0);
    return {
      records,
      freshest: latestYear ? `${latestYear}-12-31` : null,
      numbers: [
        n('Countries', countries),
        n('Series', series),
        n(
          'Latest observation',
          latestYear
            ? `${latestYear}${latestYear >= PROJECTION_FROM_YEAR ? ' (OECD projection)' : ''}`
            : null,
          'text',
        ),
      ],
    };
  },

  async 'Prediction Markets'(admin) {
    const open = await count(() =>
      admin
        .from('prediction_market_index')
        .select('market_id', { count: 'exact', head: true })
        .eq('status', 'active'),
    );
    if (!open) return { empty: true, records: 0 };
    const [rows, top, latest] = await Promise.all([
      readAll(
        () =>
          admin
            .from('prediction_market_index')
            .select('market_id, volume')
            .eq('status', 'active')
            .order('market_id'),
        open,
        30,
      ),
      admin
        .from('prediction_market_index')
        .select('question, volume')
        .eq('status', 'active')
        .order('volume', { ascending: false, nullsFirst: false })
        .limit(1),
      admin
        .from('prediction_market_index')
        .select('indexed_at')
        .order('indexed_at', { ascending: false })
        .limit(1),
    ]);
    const volume = rows.reduce((s, r) => s + (num(r.volume) || 0), 0);
    return {
      records: open,
      freshest: day(latest.data?.[0]?.indexed_at),
      numbers: [
        n('Open markets', open),
        n('Total volume', volume, 'usd'),
        n('Largest by volume', top.data?.[0]?.question || null, 'text'),
      ],
    };
  },
};

function fmtUsd(v) {
  const a = Math.abs(v);
  if (a >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

async function oecdLatest(admin) {
  const { data, error } = await admin.rpc('oecd_latest_observations', {
    p_slugs: OECD_CURATED_SLUGS,
  });
  if (error) throw new Error(error.message);
  return data || [];
}

/** Labels that have a summary loader (the rest render as not live). */
export const SUMMARY_LABELS = Object.keys(SUMMARIES);

async function loadSummaryOrThrow(label) {
  const fn = SUMMARIES[label];
  if (!fn || !configured()) return null;
  return fn(getAdminClient());
}

/* v2: errors are thrown inside the cache and caught outside, so a failure is
   retried on the next request instead of being served for 15 minutes. */
const cachedSummary = unstable_cache(loadSummaryOrThrow, ['hub-summary-v2'], CACHE);

export async function getDatasetSummary(label) {
  try {
    return await cachedSummary(label);
  } catch (e) {
    console.error('[hub-data] summary', label, e?.message || e);
    return { error: true };
  }
}

/* ── linkage cards ──────────────────────────────────────────────────── */

/**
 * For each row's (committee, ticker): how many of the committee's members
 * hold the ticker (inferred from disclosures) and how many bought or sold it
 * since `since`. A failure here leaves the rows without numbers rather than
 * failing the card.
 */
async function attachCommitteeStats(admin, rows, since) {
  const pairs = [];
  const seen = new Set();
  for (const r of rows) {
    const k = `${r._committee.id}|${r.ticker}`;
    if (seen.has(k)) continue;
    seen.add(k);
    pairs.push({ committee: r._committee.id, ticker: r.ticker });
  }
  let stats = new Map();
  if (pairs.length) {
    const { data, error } = await timed(
      admin.rpc('hub_committee_ticker_stats', { p_pairs: pairs, p_since: since }),
    );
    if (error) {
      console.error('[hub-data] committee stats', error.message);
    } else {
      stats = new Map(
        (data || []).map((s) => [`${s.committee_thomas_id}|${String(s.ticker).toUpperCase()}`, s]),
      );
    }
  }
  return rows.map(({ _committee, ...r }) => {
    const s = stats.get(`${String(_committee.id).toUpperCase()}|${r.ticker}`);
    if (!s || !s.seats) return r;
    return {
      ...r,
      stat: {
        committee: _committee.name,
        ticker: r.ticker,
        seats: s.seats,
        holders: s.holders,
        share: s.holders / s.seats,
        holderNames: s.holder_names || [],
        buyers: s.buyers,
        sellers: s.sellers,
        windowDays: 180,
      },
    };
  });
}

const LINKAGES = {
  /* Capitol 1: members who traded a stock within 30 days of a federal contract
     award to the same company. */
  async 'capitol-near-contracts'(admin) {
    const { data, error } = await timed(
      admin.rpc('hub_capitol_trades_near_contracts', {
        p_since: isoDaysAgo(365),
        p_window_days: 30,
        p_limit: 10,
      }),
    );
    if (error) throw new Error(error.message);
    return (data || []).map((r) => ({
      key: `${r.bioguide_id}-${r.ticker}`,
      ticker: r.ticker,
      title: r.member_name || r.bioguide_id,
      party: r.party,
      cells: [
        { label: 'Ticker', value: r.ticker, kind: 'ticker' },
        { label: 'Trades', value: r.trades, kind: 'int' },
        { label: 'Awards in window', value: r.awards, kind: 'int' },
        { label: 'Award value', value: num(r.award_value), kind: 'usd' },
        { label: 'Top agency', value: r.top_agency, kind: 'text' },
      ],
      query: Q.memberTicker(r.bioguide_id, r.ticker),
      href: `/datasets/politician-tracker?member=${encodeURIComponent(r.bioguide_id)}`,
    }));
  },

  /* Capitol 2: trades in sectors the member's committees oversee. */
  async 'capitol-committee-sectors'(admin) {
    const since = isoDaysAgo(180);
    const [committees, seatsTotal, tradesTotal] = await Promise.all([
      readAll(
        () =>
          admin
            .from('congress_committees')
            .select('thomas_id, parent_thomas_id, name')
            .order('thomas_id'),
        500,
      ),
      count(() =>
        admin.from('ezq_committee_seats').select('bioguide_id', { count: 'exact', head: true }),
      ),
      count(() =>
        admin
          .from('congress_trades_enriched')
          .select('id', { count: 'exact', head: true })
          .gte('transaction_date', since)
          .not('ticker', 'is', null),
      ),
    ]);
    const [seats, trades] = await Promise.all([
      readAll(
        () =>
          admin
            .from('ezq_committee_seats')
            .select('committee_thomas_id, bioguide_id')
            .order('committee_thomas_id')
            .order('bioguide_id'),
        seatsTotal,
      ),
      readAll(
        () =>
          admin
            .from('congress_trades_enriched')
            .select('id, bioguide_id, member_name, party, ticker, type, transaction_date')
            .gte('transaction_date', since)
            .not('ticker', 'is', null)
            .order('transaction_date', { ascending: false })
            .order('id'),
        tradesTotal,
      ),
    ]);
    const byId = new Map(committees.map((c) => [c.thomas_id, c]));
    const oversight = new Map(); // bioguide -> Map(sector -> committee)
    for (const s of seats) {
      const c = byId.get(s.committee_thomas_id);
      if (!c) continue;
      const parent = c.parent_thomas_id ? byId.get(c.parent_thomas_id) : null;
      for (const key of sectorsForCommittee(c.thomas_id, c.parent_thomas_id)) {
        if (!oversight.has(s.bioguide_id)) oversight.set(s.bioguide_id, new Map());
        const m = oversight.get(s.bioguide_id);
        if (!m.has(key)) m.set(key, parent || c);
      }
    }
    const out = [];
    const seen = new Set();
    for (const t of trades) {
      const ticker = String(t.ticker).toUpperCase();
      const m = oversight.get(String(t.bioguide_id || '').toUpperCase());
      if (!m) continue;
      const hit = sectorsForTicker(ticker).find((k) => m.has(k));
      if (!hit) continue;
      const k = `${t.bioguide_id}-${ticker}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const committee = m.get(hit);
      out.push({
        key: k,
        ticker,
        // Not rendered: the (committee, ticker) pair attachCommitteeStats reads.
        _committee: { id: committee.thomas_id, name: shortCommitteeName(committee.name) },
        title: t.member_name || t.bioguide_id,
        party: t.party,
        cells: [
          { label: 'Ticker', value: ticker, kind: 'ticker' },
          { label: 'Trade', value: t.type, kind: 'text' },
          { label: 'Date', value: t.transaction_date, kind: 'date' },
          { label: 'Committee', value: shortCommitteeName(committee.name), kind: 'text' },
          { label: 'Sector', value: sectorLabel(hit), kind: 'text' },
        ],
        query: Q.memberRecent(t.bioguide_id),
        href: `/datasets/committees?member=${encodeURIComponent(t.bioguide_id)}`,
      });
      if (out.length >= 10) break;
    }
    return attachCommitteeStats(admin, out, since);
  },

  /* Capitol 3: verified public lobbying clients with contracts too. */
  async 'capitol-lobbying-contracts'(admin) {
    const year = thisYear();
    const { data: clients, error } = await admin
      .from('lobbying_client_tickers')
      .select('client_name, ticker, company_label')
      .eq('verified', true);
    if (error) throw new Error(error.message);
    if (!clients?.length) return [];
    const names = [...new Set(clients.map((c) => c.client_name))];
    const tickers = [...new Set(clients.map((c) => String(c.ticker).toUpperCase()))];
    const since = isoDaysAgo(365);
    const [lobbyTotal, awardTotal] = await Promise.all([
      count(() =>
        admin
          .from('lobbying_filings')
          .select('uuid', { count: 'exact', head: true })
          .eq('filing_year', year)
          .in('client_name', names),
      ),
      count(() =>
        admin
          .from('usaspending_contract_awards')
          .select('generated_award_id', { count: 'exact', head: true })
          .gte('action_date', since)
          .in('ticker', tickers),
      ),
    ]);
    const [lobby, awards] = await Promise.all([
      readAll(
        () =>
          admin
            .from('lobbying_filings')
            .select('uuid, client_name, amount')
            .eq('filing_year', year)
            .in('client_name', names)
            .order('uuid'),
        lobbyTotal,
      ),
      readAll(
        () =>
          admin
            .from('usaspending_contract_awards')
            .select('generated_award_id, ticker, award_amount')
            .gte('action_date', since)
            .in('ticker', tickers)
            .order('generated_award_id'),
        awardTotal,
      ),
    ]);
    const spend = new Map();
    for (const r of lobby)
      spend.set(r.client_name, (spend.get(r.client_name) || 0) + (num(r.amount) || 0));
    const awarded = new Map();
    for (const r of awards) {
      const t = String(r.ticker).toUpperCase();
      const a = awarded.get(t) || { n: 0, v: 0 };
      a.n += 1;
      a.v += num(r.award_amount) || 0;
      awarded.set(t, a);
    }
    const byTicker = new Map();
    for (const c of clients) {
      const t = String(c.ticker).toUpperCase();
      const cur = byTicker.get(t) || {
        ticker: t,
        label: c.company_label || c.client_name,
        spend: 0,
        clients: [],
      };
      cur.spend += spend.get(c.client_name) || 0;
      cur.clients.push(c.client_name);
      byTicker.set(t, cur);
    }
    return [...byTicker.values()]
      .map((r) => ({ ...r, awards: awarded.get(r.ticker) || { n: 0, v: 0 } }))
      .filter((r) => r.spend > 0 && r.awards.n > 0)
      .sort((a, b) => b.awards.v - a.awards.v)
      .slice(0, 10)
      .map((r) => ({
        key: r.ticker,
        ticker: r.ticker,
        title: r.label,
        cells: [
          { label: 'Ticker', value: r.ticker, kind: 'ticker' },
          { label: `Lobbying, ${year}`, value: r.spend, kind: 'usd' },
          { label: 'Awards, 12 months', value: r.awards.n, kind: 'int' },
          { label: 'Award value', value: r.awards.v, kind: 'usd' },
        ],
        query: Q.lobbyingClient(r.clients[0]),
        href: '/datasets/government/lobbying',
      }));
  },

  /* Capitol 4: top raisers this cycle with their disclosed trades. */
  async 'capitol-raisers-trade'(admin) {
    const { data: cyc } = await admin
      .from('ezq_campaign_finance')
      .select('cycle')
      .order('cycle', { ascending: false })
      .limit(1);
    const cycle = cyc?.[0]?.cycle;
    if (!cycle) return [];
    const { data: top, error } = await admin
      .from('ezq_campaign_finance')
      .select('bioguide_id, member_name, party, state, receipts, cash_on_hand')
      .eq('cycle', cycle)
      .not('receipts', 'is', null)
      .order('receipts', { ascending: false })
      .limit(40);
    if (error) throw new Error(error.message);
    const since = isoDaysAgo(365);
    const counts = await Promise.all(
      (top || []).map((m) =>
        count(() =>
          admin
            .from('congress_trades_enriched')
            .select('id', { count: 'exact', head: true })
            .eq('bioguide_id', m.bioguide_id)
            .gte('transaction_date', since),
        ),
      ),
    );
    return (top || [])
      .map((m, i) => ({ ...m, trades: counts[i] }))
      .filter((m) => m.trades > 0)
      .slice(0, 10)
      .map((m) => ({
        key: m.bioguide_id,
        title: m.member_name || m.bioguide_id,
        party: m.party,
        cells: [
          { label: `Raised, ${cycle}`, value: num(m.receipts), kind: 'usd' },
          { label: 'Cash on hand', value: num(m.cash_on_hand), kind: 'usd' },
          { label: 'Trades, 12 months', value: m.trades, kind: 'int' },
        ],
        query: Q.raiserTrades(m.bioguide_id),
        href: `/datasets/politician-tracker?member=${encodeURIComponent(m.bioguide_id)}`,
      }));
  },

  /* Titans 1: funds adding plus another group active. */
  async 'titans-confluence'(admin) {
    const { data, error } = await admin.rpc('hub_titans_confluence', { p_days: 90, p_limit: 10 });
    if (error) throw new Error(error.message);
    return (data || []).map((r) => titansRow(r));
  },

  /* Titans 2: insider buying into fund adds. */
  async 'titans-insider-adds'(admin) {
    const { data, error } = await admin.rpc('hub_titans_confluence', { p_days: 90, p_limit: 100 });
    if (error) throw new Error(error.message);
    const rows = (data || []).filter((r) => (r.insider_buys || 0) > 0).slice(0, 10);
    if (!rows.length) return [];
    const { data: buys } = await admin
      .from('sec_insider_transactions')
      .select('issuer_ticker, reporter_name, value_usd')
      .in(
        'issuer_ticker',
        rows.map((r) => r.ticker),
      )
      .eq('transaction_code', 'P')
      .gte('transaction_date', isoDaysAgo(90))
      .order('value_usd', { ascending: false, nullsFirst: false })
      .limit(500);
    const names = new Map();
    for (const b of buys || []) {
      const t = String(b.issuer_ticker).toUpperCase();
      if (!names.has(t)) names.set(t, []);
      if (b.reporter_name && !names.get(t).includes(b.reporter_name))
        names.get(t).push(b.reporter_name);
    }
    return rows.map((r) => ({
      ...titansRow(r),
      cells: [
        { label: 'Ticker', value: r.ticker, kind: 'ticker' },
        { label: 'Funds adding', value: r.whale_filers, kind: 'int' },
        { label: 'Insider buys', value: r.insider_buys, kind: 'int' },
        { label: 'Bought', value: num(r.insider_buy_value), kind: 'usd' },
        {
          label: 'Insiders',
          value: (names.get(r.ticker) || []).slice(0, 3).join(', ') || null,
          kind: 'text',
        },
      ],
    }));
  },

  /* Titans 3: most crowded adds this quarter. */
  async 'titans-crowded'(admin) {
    const { data: q } = await admin
      .from('whale_moves')
      .select('quarter')
      .not('quarter', 'is', null)
      .order('quarter', { ascending: false })
      .limit(1);
    const quarter = q?.[0]?.quarter;
    if (!quarter) return [];
    const { data, error } = await admin
      .from('whale_moves')
      .select('ticker, issuer, filer_cik, value_usd, change_type')
      .eq('quarter', quarter)
      .neq('change_type', 'trimmed')
      .not('ticker', 'is', null)
      .limit(1000);
    if (error) throw new Error(error.message);
    const m = new Map();
    for (const r of data || []) {
      const t = String(r.ticker).toUpperCase();
      const cur = m.get(t) || { ticker: t, issuer: r.issuer, filers: new Set(), value: 0 };
      cur.filers.add(r.filer_cik);
      cur.value += num(r.value_usd) || 0;
      m.set(t, cur);
    }
    return [...m.values()]
      .sort((a, b) => b.filers.size - a.filers.size || b.value - a.value)
      .slice(0, 10)
      .map((r) => ({
        key: r.ticker,
        ticker: r.ticker,
        title: r.issuer || r.ticker,
        cells: [
          { label: 'Ticker', value: r.ticker, kind: 'ticker' },
          { label: 'Funds adding', value: r.filers.size, kind: 'int' },
          { label: 'Reported value', value: r.value, kind: 'usd' },
          { label: 'Quarter', value: quarter.replace(/^CY(\d{4})Q(\d)$/, 'Q$2 $1'), kind: 'text' },
        ],
        query: Q.whaleTicker(r.ticker),
        href: '/datasets/whale-moves',
      }));
  },

  /* Titans 4: activist targets, and whether insiders sold after. */
  async 'titans-activist-targets'(admin) {
    const [stakes, insiderRows] = await Promise.all([
      admin
        .from('ezq_activist_stakes')
        .select(
          'accession_no, filer_name, subject_name, ticker, percent_of_class, filed_at, form_type',
        )
        .order('filed_at', { ascending: false })
        .limit(10),
      count(() =>
        admin
          .from('sec_insider_transactions')
          .select('accession_no', { count: 'exact', head: true }),
      ),
    ]);
    if (stakes.error) throw new Error(stakes.error.message);
    const list = stakes.data || [];
    /* Whether insiders sold is only answerable once Form 4 data is loaded. */
    const sold = insiderRows
      ? await Promise.all(
          list.map((s) => {
            if (!s.ticker || !s.filed_at) return null;
            const from = day(s.filed_at);
            const to = new Date(Date.parse(from) + 30 * 86400000).toISOString().slice(0, 10);
            return count(() =>
              admin
                .from('sec_insider_transactions')
                .select('accession_no', { count: 'exact', head: true })
                .eq('issuer_ticker', s.ticker)
                .eq('transaction_code', 'S')
                .gte('transaction_date', from)
                .lte('transaction_date', to),
            );
          }),
        )
      : list.map(() => null);
    return list.map((s, i) => ({
      key: s.accession_no,
      ticker: s.ticker || null,
      title: s.subject_name || s.ticker || 'Company',
      cells: [
        { label: 'Ticker', value: s.ticker, kind: 'ticker' },
        { label: 'Filer', value: s.filer_name, kind: 'text' },
        { label: 'Stake', value: num(s.percent_of_class), kind: 'pct' },
        { label: 'Filed', value: s.filed_at, kind: 'date' },
        {
          label: 'Insider sells, next 30 days',
          value: insiderRows ? sold[i] : 'Not loaded yet',
          kind: insiderRows ? 'int' : 'text',
        },
      ],
      query: s.ticker ? Q.activistTicker(s.ticker) : null,
      href: '/datasets/activist',
    }));
  },

  /* Lighthouse 1: largest moves in the latest OECD release. */
  async 'lighthouse-oecd-moves'(admin) {
    const obs = await oecdLatest(admin);
    return obs
      .filter(
        (o) =>
          !OECD_AGGREGATE_AREAS.includes(o.ref_area) &&
          o.latest_value != null &&
          o.prior_value != null &&
          o.prior_year != null,
      )
      .map((o) => ({ ...o, change: Number(o.latest_value) - Number(o.prior_value) }))
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 10)
      .map((o) => {
        const s = OECD_SERIES_BY_SLUG[o.ezana_slug];
        const proj = o.latest_year >= PROJECTION_FROM_YEAR;
        return {
          key: `${o.ezana_slug}-${o.ref_area}`,
          title: `${o.ref_area_name || o.ref_area}: ${s?.label || o.ezana_slug}`,
          cells: [
            {
              label: 'Years',
              value: `${o.prior_year} to ${o.latest_year}${proj ? ' (proj.)' : ''}`,
              kind: 'text',
            },
            { label: 'From', value: Number(o.prior_value), kind: 'num' },
            { label: 'To', value: Number(o.latest_value), kind: 'num' },
            { label: 'Change', value: o.change, kind: 'signed' },
            { label: 'Unit', value: o.unit_label || s?.unitLabel || null, kind: 'text' },
          ],
          query: Q.oecdSeries(o.ezana_slug, o.ref_area),
          href: `/datasets/oecd-macro?ind=${encodeURIComponent(o.ezana_slug)}`,
        };
      });
  },

  /* Hive 1: biggest open markets. */
  async 'hive-biggest'(admin) {
    const { data, error } = await admin
      .from('prediction_market_index')
      .select('market_id, question, probability, volume, end_date, link')
      .eq('status', 'active')
      .order('volume', { ascending: false, nullsFirst: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return (data || []).map((m) => ({
      key: m.market_id,
      title: m.question,
      cells: [
        {
          label: 'Probability',
          value: num(m.probability) != null ? num(m.probability) * 100 : null,
          kind: 'pct',
        },
        { label: 'Volume', value: num(m.volume), kind: 'usd' },
        { label: 'Ends', value: m.end_date, kind: 'date' },
      ],
      query: Q.market(m.market_id),
      href: m.link || '/datasets/prediction-markets',
      external: !!m.link,
    }));
  },

  /* Hive 2: markets tied to tickers. */
  async 'hive-tickers'(admin) {
    const { data, error } = await admin
      .from('prediction_market_index')
      .select('market_id, question, adj_ticker, probability, volume')
      .not('adj_ticker', 'is', null)
      .eq('status', 'active')
      .order('volume', { ascending: false, nullsFirst: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return (data || []).map((m) => ({
      key: m.market_id,
      ticker: String(m.adj_ticker).toUpperCase(),
      title: m.question,
      cells: [
        { label: 'Ticker', value: String(m.adj_ticker).toUpperCase(), kind: 'ticker' },
        {
          label: 'Probability',
          value: num(m.probability) != null ? num(m.probability) * 100 : null,
          kind: 'pct',
        },
        { label: 'Volume', value: num(m.volume), kind: 'usd' },
      ],
      query: Q.market(m.market_id),
      href: '/datasets/prediction-markets',
    }));
  },

  /* Regulatory preview: bills with the newest actions. */
  async 'regulatory-bills'(admin) {
    const { data, error } = await admin
      .from('congress_bills')
      .select(
        'id, congress, type, number, title, latest_action_text, latest_action_date, policy_area',
      )
      .order('latest_action_date', { ascending: false, nullsFirst: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return (data || []).map((b) => ({
      key: b.id,
      title: b.title || `${String(b.type || '').toUpperCase()} ${b.number}`,
      cells: [
        { label: 'Bill', value: `${String(b.type || '').toUpperCase()} ${b.number}`, kind: 'text' },
        { label: 'Policy area', value: b.policy_area, kind: 'text' },
        { label: 'Latest action', value: b.latest_action_date, kind: 'date' },
      ],
      query: null,
      href: billUrl(b),
      external: true,
    }));
  },

  /* Regulatory preview: committee meetings. */
  async 'regulatory-meetings'(admin) {
    const { data, error } = await admin
      .from('congress_meetings')
      .select('event_id, chamber, committee, meeting_date, title')
      .order('meeting_date', { ascending: false, nullsFirst: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return (data || []).map((m) => ({
      key: m.event_id,
      title: m.title || 'Committee meeting',
      cells: [
        { label: 'Committee', value: m.committee, kind: 'text' },
        { label: 'Chamber', value: m.chamber, kind: 'text' },
        { label: 'Date', value: m.meeting_date, kind: 'date' },
      ],
      query: null,
      href: null,
    }));
  },
};

const BILL_TYPES = {
  hr: 'house-bill',
  s: 'senate-bill',
  hres: 'house-resolution',
  sres: 'senate-resolution',
  hjres: 'house-joint-resolution',
  sjres: 'senate-joint-resolution',
  hconres: 'house-concurrent-resolution',
  sconres: 'senate-concurrent-resolution',
};
function ordinal(nn) {
  const t = nn % 100;
  if (t >= 11 && t <= 13) return `${nn}th`;
  return `${nn}${{ 1: 'st', 2: 'nd', 3: 'rd' }[nn % 10] || 'th'}`;
}
/** congress.gov page for a bill, or null when the type is not one it lists. */
function billUrl(b) {
  const kind = BILL_TYPES[String(b.type || '').toLowerCase()];
  if (!b.congress || !kind || !b.number) return null;
  return `https://www.congress.gov/bill/${ordinal(b.congress)}-congress/${kind}/${b.number}`;
}

function titansRow(r) {
  return {
    key: r.ticker,
    ticker: r.ticker,
    title: r.ticker,
    cells: [
      { label: 'Ticker', value: r.ticker, kind: 'ticker' },
      { label: 'Funds adding', value: r.whale_filers, kind: 'int' },
      { label: 'Insider buys', value: r.insider_buys, kind: 'int' },
      { label: 'Activist stakes', value: r.activist_stakes, kind: 'int' },
      { label: 'Member buys', value: r.congress_buys, kind: 'int' },
      { label: 'Signals', value: r.signals, kind: 'int' },
    ],
    query: Q.whaleTicker(r.ticker),
    href: '/datasets/whale-moves',
  };
}

async function loadLinkageOrThrow(id) {
  const fn = LINKAGES[id];
  if (!fn || !configured()) return { rows: [] };
  return { rows: await fn(getAdminClient()) };
}

/* v2: errors are thrown inside the cache and caught outside, so a timeout is
   retried on the next request instead of being served for 15 minutes. */
const cachedLinkage = unstable_cache(loadLinkageOrThrow, ['hub-linkage-v2'], CACHE);

export async function getLinkage(id) {
  try {
    return await cachedLinkage(id);
  } catch (e) {
    console.error('[hub-data] linkage', id, e?.message || e);
    return { rows: [], error: true };
  }
}
