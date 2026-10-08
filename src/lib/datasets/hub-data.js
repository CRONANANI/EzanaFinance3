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
export const timed = (q) => q.abortSignal(AbortSignal.timeout(RPC_TIMEOUT_MS));

export function configured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function count(build) {
  const { count: n, error } = await build();
  if (error) throw new Error(error.message);
  return n || 0;
}

/**
 * Every row of a query, read in parallel 1,000-row pages. `build` returns a
 * fresh, ordered query; `total` is its exact count.
 */
export async function readAll(build, total, cap = 120) {
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
    const { data, error } = await timed(admin.rpc('hub_lobbying_summary', { p_year: year }));
    if (error) throw new Error(error.message);
    const s = data?.[0];
    if (!s || !Number(s.records)) return { empty: true, records: 0 };
    return {
      records: Number(s.records),
      freshest: day(s.freshest),
      numbers: [
        n(`Filings in ${year}`, Number(s.filings)),
        n(`Reported spend, ${year}`, num(s.spend), 'usd'),
        n('Top spender', s.top_client || null, 'text'),
      ],
    };
  },

  async 'Government Contracts'(admin) {
    const { data, error } = await timed(admin.rpc('hub_contracts_summary', { p_days: 90 }));
    if (error) throw new Error(error.message);
    const s = data?.[0];
    if (!s || !Number(s.records)) return { empty: true, records: 0 };
    return {
      records: Number(s.records),
      freshest: day(s.freshest),
      numbers: [
        n('Awards, last 90 days', Number(s.awards)),
        n('Total value', num(s.award_value), 'usd'),
        n('Top recipient', s.top_recipient || null, 'text'),
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

  /* ── Eyes Above ──────────────────────────────────────────────────── */

  async 'Supply Chain Monitoring'(admin) {
    const [portDays, chokeDays, choke, ports, gscpi] = await Promise.all([
      count(() =>
        admin.from('eyes_port_activity').select('portid', { count: 'exact', head: true }),
      ),
      count(() =>
        admin.from('eyes_chokepoint_transits').select('portid', { count: 'exact', head: true }),
      ),
      timed(admin.rpc('eyes_chokepoint_change', { p_days: 7 })),
      count(() =>
        admin
          .from('eyes_ports')
          .select('portid', { count: 'exact', head: true })
          .eq('tracked', true),
      ),
      eyesSeriesLatest(admin, 'GSCPI'),
    ]);
    if (choke.error) throw new Error(choke.error.message);
    const records = portDays + chokeDays;
    if (!records && !gscpi) return { empty: true, records: 0 };
    const rows = choke.data || [];
    const mover = rows.find((c) => num(c.change_pct) != null);
    return {
      records,
      freshest: day(rows[0]?.last_date) || day(gscpi?.date),
      numbers: [
        n(
          mover ? `${mover.portname}, 7 days vs 1 year` : 'Biggest chokepoint move',
          mover ? num(mover.change_pct) : null,
          'signed-pct',
        ),
        n('Ports tracked', ports),
        n('Supply chain pressure (GSCPI)', gscpi ? gscpi.value : null, 'signed'),
      ],
    };
  },

  async 'Commercial Real Estate Activity'(admin) {
    const { data: series, error } = await admin
      .from('eyes_series')
      .select('series_id, last_date')
      .eq('dataset', 'cre');
    if (error) throw new Error(error.message);
    if (!series?.length) return { empty: true, records: 0 };
    const [records, delinquency, prices] = await Promise.all([
      count(() =>
        admin
          .from('eyes_series_obs')
          .select('series_id', { count: 'exact', head: true })
          .in(
            'series_id',
            series.map((x) => x.series_id),
          ),
      ),
      eyesSeriesLatest(admin, 'DRCRELEXFACBS'),
      eyesSeriesLatest(admin, 'COMREPUSQ159N'),
    ]);
    return {
      records,
      freshest: series.reduce(
        (m, x) => (x.last_date && x.last_date > (m || '') ? x.last_date : m),
        null,
      ),
      numbers: [
        n('Indicators tracked', series.length),
        n('CRE loan delinquency rate', delinquency ? delinquency.value : null, 'pct'),
        n('CRE prices, year over year', prices ? prices.value : null, 'signed-pct'),
      ],
    };
  },

  async 'Patent Activity'(admin) {
    const head = () =>
      admin.from('eyes_patents').select('patent_id', { count: 'exact', head: true });
    const records = await count(head);
    if (!records) return { empty: true, records };
    const [year, matched, latest, top] = await Promise.all([
      count(() => head().gt('patent_date', isoDaysAgo(365))),
      count(() => head().not('ticker', 'is', null)),
      admin
        .from('eyes_patents')
        .select('patent_date')
        .order('patent_date', { ascending: false })
        .limit(1),
      timed(admin.rpc('eyes_patent_momentum', { p_limit: 1, p_min_grants: 1 })),
    ]);
    const lead = top.data?.[0];
    return {
      records,
      freshest: day(latest.data?.[0]?.patent_date),
      numbers: [
        n('Grants, last 12 months', year),
        n('Matched to a ticker', matched),
        n('Most granted', lead ? `${lead.ticker} (${lead.grants_12m})` : null, 'text'),
      ],
    };
  },

  async 'Satellite Imagery'(admin) {
    const records = await count(() =>
      admin.from('eyes_night_lights').select('region_id', { count: 'exact', head: true }),
    );
    if (!records) return { empty: true, records };
    const { data: last, error } = await admin
      .from('eyes_night_lights')
      .select('month')
      .order('month', { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    const month = last?.[0]?.month;
    const prior = `${Number(month.slice(0, 4)) - 1}${month.slice(4, 10)}`;
    const [now, then, regions] = await Promise.all([
      admin.from('eyes_night_lights').select('region_id, mean_radiance').eq('month', month),
      admin.from('eyes_night_lights').select('region_id, mean_radiance').eq('month', prior),
      admin.from('eyes_regions').select('region_id, name'),
    ]);
    const base = new Map((then.data || []).map((r) => [r.region_id, num(r.mean_radiance)]));
    const names = new Map((regions.data || []).map((r) => [r.region_id, r.name]));
    let best = null;
    for (const r of now.data || []) {
      const a = num(r.mean_radiance);
      const b = base.get(r.region_id);
      if (a == null || !b) continue;
      const ch = (100 * (a - b)) / b;
      if (!best || Math.abs(ch) > Math.abs(best.ch)) best = { id: r.region_id, ch };
    }
    return {
      records,
      freshest: day(month),
      numbers: [
        n('Regions with a reading', (now.data || []).filter((r) => r.mean_radiance != null).length),
        n('Latest month', monthLabel(month), 'text'),
        n(
          'Largest change vs a year ago',
          best
            ? `${names.get(best.id) || best.id} ${best.ch > 0 ? '+' : ''}${best.ch.toFixed(1)}%`
            : null,
          'text',
        ),
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

/* ── Eyes Above helpers ─────────────────────────────────────────────── */

/** The latest non-null observation of one Eyes series, or null. */
async function eyesSeriesLatest(admin, id) {
  const { data, error } = await admin
    .from('eyes_series_obs')
    .select('date, value')
    .eq('series_id', id)
    .not('value', 'is', null)
    .order('date', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const r = data?.[0];
  return r ? { date: r.date, value: num(r.value) } : null;
}

/** The last `n` non-null observations of one Eyes series, oldest first. */
async function eyesSeriesTail(admin, id, nn) {
  const { data, error } = await admin
    .from('eyes_series_obs')
    .select('date, value')
    .eq('series_id', id)
    .not('value', 'is', null)
    .order('date', { ascending: false })
    .limit(nn);
  if (error) throw new Error(error.message);
  return (data || []).map((r) => ({ date: r.date, value: num(r.value) })).reverse();
}

function monthLabel(iso) {
  const m = /^(\d{4})-(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const CPC_SECTION_NAMES = {
  A: 'Human necessities',
  B: 'Operations and transport',
  C: 'Chemistry and metallurgy',
  D: 'Textiles and paper',
  E: 'Fixed constructions',
  F: 'Mechanical engineering',
  G: 'Physics',
  H: 'Electricity',
  Y: 'Emerging cross-sectional',
};

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

/* The Eyes Above summaries also carry the `eyes` tag, so the Eyes ingest
   crons (which revalidate `eyes`) refresh the hub as well as the pages. */
const EYES_SUMMARY_LABELS = new Set([
  'Supply Chain Monitoring',
  'Commercial Real Estate Activity',
  'Patent Activity',
  'Satellite Imagery',
]);
const cachedEyesSummary = unstable_cache(loadSummaryOrThrow, ['hub-summary-eyes-v1'], {
  ...CACHE,
  tags: ['hubs', 'eyes'],
});

export async function getDatasetSummary(label) {
  try {
    return await (EYES_SUMMARY_LABELS.has(label) ? cachedEyesSummary : cachedSummary)(label);
  } catch (e) {
    console.error('[hub-data] summary', label, e?.message || e);
    return { error: true };
  }
}

/* ── linkage cards ──────────────────────────────────────────────────── */

/**
 * Every full committee with at least one member who still holds each ticker
 * (inferred from disclosures), as [{ id, name, chamber, seats, holders,
 * share, names }] sorted by share of the committee holding, highest first.
 */
/* Panels smaller than this (Senate Ethics, select panels, caucuses and
   commissions of 6 to 9 members) are left out: one holder there reads as a
   double-digit share and would top every ticker's confidence. Every standing
   committee has at least this many seats. */
const MIN_COMMITTEE_SEATS = 10;

async function committeeHoldersByTicker(admin, tickers) {
  const out = new Map();
  if (!tickers.length) return out;
  const { data, error } = await timed(
    admin.rpc('hub_ticker_committee_holders', { p_tickers: tickers }),
  );
  if (error) throw new Error(error.message);
  for (const r of data || []) {
    if (!r.seats || r.seats < MIN_COMMITTEE_SEATS) continue;
    const t = String(r.ticker).toUpperCase();
    if (!out.has(t)) out.set(t, []);
    out.get(t).push({
      id: r.committee_thomas_id,
      name: shortCommitteeName(r.committee),
      chamber: r.chamber,
      seats: r.seats,
      holders: r.holders,
      share: r.seats ? r.holders / r.seats : 0,
      names: r.holder_names || [],
    });
  }
  for (const list of out.values()) {
    list.sort((x, y) => y.share - x.share || y.holders - x.holders || x.name.localeCompare(y.name));
  }
  return out;
}

const ACTOR_LABEL = {
  politician: 'Politician',
  insider: 'Insider',
  institution: 'Institution',
  whale: 'Whale',
};

/** Daily closes for one award chart: 30 days before the earlier of the trade
    and the award to 40 days after the later one. */
async function awardChartSeries(admin, r) {
  const t0 = r.trade_date < r.award_date ? r.trade_date : r.award_date;
  const t1 = r.trade_date > r.award_date ? r.trade_date : r.award_date;
  const from = new Date(Date.parse(t0) - 30 * 86400000).toISOString().slice(0, 10);
  const to = new Date(Date.parse(t1) + 40 * 86400000).toISOString().slice(0, 10);
  const { data, error } = await admin
    .from('price_data_cache')
    .select('date, close')
    .eq('ticker', r.ticker)
    .gte('date', from)
    .lte('date', to)
    .order('date');
  if (error) throw new Error(error.message);
  return (data || [])
    .filter((p) => Number.isFinite(Number(p.close)))
    .map((p) => [p.date, Number(p.close)]);
}

function actorHref(r) {
  if (r.actor_type === 'politician') {
    return `/datasets/politician-tracker?member=${encodeURIComponent(r.actor_id)}`;
  }
  if (r.actor_type === 'insider') return '/datasets/insider';
  if (r.actor_type === 'institution') return '/datasets/institutional';
  return '/datasets/whale-moves';
}

const LINKAGES = {
  /* Capitol 1: the best-returning trades by a politician, insider,
     institution or whale within 30 days of a federal contract award to the
     same company, each with its price chart around the award. */
  async 'capitol-near-contracts'(admin) {
    const { data, error } = await timed(admin.rpc('hub_award_window_top', { p_limit: 10 }));
    if (error) throw new Error(error.message);
    const rows = data || [];
    const series = await Promise.all(rows.map((r) => awardChartSeries(admin, r)));
    return rows.map((r, i) => ({
      key: `${r.actor_type}-${r.source_id}`,
      ticker: r.ticker,
      title: r.actor_name || r.actor_id,
      party: r.actor_type === 'politician' ? r.actor_detail : null,
      tag: ACTOR_LABEL[r.actor_type] || r.actor_type,
      cells: [
        { label: 'Ticker', value: r.ticker, kind: 'ticker' },
        { label: r.side === 'buy' ? 'Bought' : 'Sold', value: r.trade_date, kind: 'date' },
        { label: '30-day return', value: num(r.ret_30d_pct), kind: 'signed-pct' },
        { label: 'Award', value: num(r.award_amount), kind: 'usd' },
        { label: 'Award date', value: r.award_date, kind: 'date' },
        { label: 'Agency', value: r.awarding_agency, kind: 'text' },
      ],
      chart: {
        ticker: r.ticker,
        side: r.side,
        points: series[i],
        tradeDate: r.trade_date,
        awardDate: r.award_date,
        entryDate: r.entry_date,
        exitDate: r.exit_date,
        retPct: num(r.ret_30d_pct),
        basis: r.date_basis,
      },
      query: Q.tickerAwards(r.ticker),
      href: actorHref(r),
    }));
  },

  /* Capitol 1b: who reads contract awards best, and which companies' stock
     moves after their awards. */
  async 'capitol-award-leaders'(admin) {
    const [leaders, companies] = await Promise.all([
      timed(admin.rpc('hub_award_leaders', { p_limit: 10, p_min_trades: 1 })),
      timed(admin.rpc('hub_award_companies', { p_limit: 8 })),
    ]);
    if (leaders.error) throw new Error(leaders.error.message);
    if (companies.error) throw new Error(companies.error.message);
    const rows = (leaders.data || []).map((r) => ({
      key: `${r.actor_type}-${r.actor_id}`,
      ticker: r.best_ticker,
      title: r.actor_name || r.actor_id,
      party: r.actor_type === 'politician' ? r.actor_detail : null,
      tag: ACTOR_LABEL[r.actor_type] || r.actor_type,
      badge: r.quick_step ? 'quick-step' : null,
      cells: [
        { label: 'Insight score', value: num(r.score), kind: 'num' },
        { label: 'Trades', value: r.trades, kind: 'int' },
        { label: 'Avg 30-day return', value: num(r.avg_ret_pct), kind: 'signed-pct' },
        {
          label: 'Hit rate',
          value: num(r.hit_rate) == null ? null : num(r.hit_rate) * 100,
          kind: 'pct',
        },
        { label: 'Best', value: r.best_ticker, kind: 'ticker' },
      ],
      query: r.best_ticker ? Q.tickerAwards(r.best_ticker) : null,
      href: actorHref(r),
    }));
    const extra = {
      companies: (companies.data || []).map((c) => ({
        ticker: c.ticker,
        awardDates: c.award_dates,
        awardValue: num(c.award_value),
        avgMovePct: num(c.avg_move_pct),
        hitRate: num(c.hit_rate),
        agency: c.top_agency,
        badge: c.quick_step ? 'quick-step' : null,
      })),
    };
    return { rows, extra };
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
    /* One candidate per ticker: its most recent trade by a member whose
       committee oversees the ticker's sector. */
    const byTicker = new Map();
    for (const t of trades) {
      const ticker = String(t.ticker).toUpperCase();
      if (byTicker.has(ticker)) continue;
      const m = oversight.get(String(t.bioguide_id || '').toUpperCase());
      if (!m) continue;
      const hit = sectorsForTicker(ticker).find((k) => m.has(k));
      if (!hit) continue;
      byTicker.set(ticker, { t, hit, committee: m.get(hit) });
      if (byTicker.size >= 60) break;
    }
    const holders = await committeeHoldersByTicker(admin, [...byTicker.keys()]);
    const out = [...byTicker.entries()].map(([ticker, { t, hit, committee }]) => {
      const committees = holders.get(ticker) || [];
      const top = committees[0] || null;
      return {
        key: ticker,
        ticker,
        title: ticker,
        confidence: top ? top.share : 0,
        cells: [
          {
            label: 'Latest trade',
            value: `${t.member_name || t.bioguide_id}${t.party ? ` (${t.party})` : ''}`,
            kind: 'text',
          },
          { label: 'Trade', value: t.type, kind: 'text' },
          { label: 'Date', value: t.transaction_date, kind: 'date' },
          { label: 'Oversight', value: shortCommitteeName(committee.name), kind: 'text' },
          { label: 'Sector', value: sectorLabel(hit), kind: 'text' },
        ],
        committees,
        /* Structured fields for the Capitol hub's top signals. */
        member: {
          bioguideId: String(t.bioguide_id || '').toUpperCase() || null,
          name: t.member_name || t.bioguide_id,
          party: t.party || null,
        },
        side: t.type,
        date: t.transaction_date,
        committee: shortCommitteeName(committee.name),
        sector: sectorLabel(hit),
        query: Q.tickerHolders(ticker),
        href: `/datasets/committees?member=${encodeURIComponent(t.bioguide_id)}`,
      };
    });
    /* Confidence: the highest share of any one committee holding the ticker. */
    out.sort(
      (x, y) =>
        y.confidence - x.confidence ||
        (y.committees[0]?.holders || 0) - (x.committees[0]?.holders || 0) ||
        x.ticker.localeCompare(y.ticker),
    );
    return out.slice(0, 10);
  },

  /* Capitol 3: verified public lobbying clients with contracts too. */
  async 'capitol-lobbying-contracts'(admin) {
    const year = thisYear();
    const { data, error } = await timed(
      admin.rpc('hub_lobbying_contracts', { p_year: year, p_limit: 10 }),
    );
    if (error) throw new Error(error.message);
    return (data || []).map((r) => {
      const label = r.company_label || r.client_name;
      const spend = num(r.spend) || 0;
      const awardsN = r.awards || 0;
      const awardsV = num(r.award_value) || 0;
      return {
        key: r.ticker,
        ticker: r.ticker,
        title: label,
        company: label,
        client: r.client_name,
        year,
        spend,
        awardsN,
        awardsV,
        cells: [
          { label: 'Ticker', value: r.ticker, kind: 'ticker' },
          { label: `Lobbying, ${year}`, value: spend, kind: 'usd' },
          { label: 'Awards, 12 months', value: awardsN, kind: 'int' },
          { label: 'Award value', value: awardsV, kind: 'usd' },
        ],
        query: Q.lobbyingClient(r.client_name),
        href: '/datasets/government/lobbying',
      };
    });
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

  /* Eyes 1: chokepoints furthest from their 1-year average. */
  async 'eyes-chokepoints'(admin) {
    const { data, error } = await timed(admin.rpc('eyes_chokepoint_change', { p_days: 7 }));
    if (error) throw new Error(error.message);
    return (data || [])
      .filter((c) => num(c.change_pct) != null)
      .slice(0, 6)
      .map((c) => ({
        key: c.portid,
        title: c.portname,
        cells: [
          { label: 'Change', value: num(c.change_pct), kind: 'signed-pct' },
          { label: 'Transits / day, 7 days', value: num(c.recent_avg), kind: 'num' },
          { label: '1-year average', value: num(c.base_avg), kind: 'num' },
          { label: 'Data through', value: c.last_date, kind: 'date' },
        ],
        query: Q.eyesChokepoint(c.portname),
        href: '/datasets/supply-chain',
      }));
  },

  /* Eyes 2: patent momentum leaders, with how many members hold each. */
  async 'eyes-patent-leaders'(admin) {
    const { data, error } = await timed(
      admin.rpc('eyes_patent_momentum', { p_limit: 500, p_min_grants: 50 }),
    );
    if (error) throw new Error(error.message);
    const top = (data || [])
      .filter((m) => num(m.change_pct) != null)
      .sort((a, b) => num(b.change_pct) - num(a.change_pct))
      .slice(0, 10);
    if (!top.length) return [];
    const { data: held, error: hErr } = await timed(
      admin
        .from('congress_open_positions')
        .select('bioguide_id, ticker')
        .in(
          'ticker',
          top.map((m) => m.ticker),
        )
        .limit(5000),
    );
    if (hErr) throw new Error(hErr.message);
    const holders = new Map();
    for (const h of held || []) {
      const t = String(h.ticker || '').toUpperCase();
      if (!holders.has(t)) holders.set(t, new Set());
      holders.get(t).add(h.bioguide_id);
    }
    return top.map((m) => ({
      key: m.ticker,
      ticker: m.ticker,
      title: m.assignee || m.ticker,
      cells: [
        { label: 'Ticker', value: m.ticker, kind: 'ticker' },
        { label: 'Grants, 12 mo', value: num(m.grants_12m), kind: 'int' },
        { label: '12 mo before', value: num(m.grants_prior_12m), kind: 'int' },
        { label: 'Change', value: num(m.change_pct), kind: 'signed-pct' },
        {
          label: 'Top field',
          value: m.top_cpc ? CPC_SECTION_NAMES[m.top_cpc] || m.top_cpc : null,
          kind: 'text',
        },
        {
          label: 'Held by members of Congress (inferred)',
          value: holders.get(String(m.ticker).toUpperCase())?.size || 0,
          kind: 'int',
        },
      ],
      query: Q.eyesPatentsTicker(m.ticker),
      href: '/datasets/patents',
    }));
  },

  /* Eyes 3: supply chain pressure in one card. */
  async 'eyes-pressure'(admin) {
    const [gscpi, ship, choke] = await Promise.all([
      eyesSeriesTail(admin, 'GSCPI', 13),
      eyesSeriesTail(admin, 'FRGSHPUSM649NCIS', 13),
      timed(admin.rpc('eyes_chokepoint_change', { p_days: 7 })),
    ]);
    if (choke.error) throw new Error(choke.error.message);
    const rows = [];
    const gLast = gscpi[gscpi.length - 1];
    if (gLast) {
      const gYear = gscpi.length === 13 ? gscpi[0] : null;
      rows.push({
        key: 'gscpi',
        title: 'Global Supply Chain Pressure Index',
        cells: [
          { label: 'Latest', value: gLast.value, kind: 'signed' },
          { label: 'Month', value: monthLabel(gLast.date), kind: 'text' },
          { label: '12 months earlier', value: gYear ? gYear.value : null, kind: 'signed' },
          {
            label: '12-month trend',
            value: gYear ? gLast.value - gYear.value : null,
            kind: 'signed',
          },
        ],
        query: null,
        href: '/datasets/supply-chain',
      });
    }
    const sLast = ship[ship.length - 1];
    if (sLast) {
      const sYear = ship.find(
        (p) => p.date === `${Number(sLast.date.slice(0, 4)) - 1}${sLast.date.slice(4)}`,
      );
      rows.push({
        key: 'cass',
        title: 'Cass Freight Index, shipments',
        cells: [
          { label: 'Index', value: sLast.value, kind: 'num' },
          {
            label: 'Year over year',
            value: sYear?.value ? (100 * (sLast.value - sYear.value)) / sYear.value : null,
            kind: 'signed-pct',
          },
          { label: 'Month', value: monthLabel(sLast.date), kind: 'text' },
        ],
        query: null,
        href: '/datasets/supply-chain',
      });
    }
    const cp = choke.data || [];
    if (cp.length) {
      rows.push({
        key: 'chokepoints-below',
        title: 'Chokepoints more than 20% below normal',
        cells: [
          {
            label: 'Chokepoints',
            value: cp.filter((c) => num(c.change_pct) != null && num(c.change_pct) < -20).length,
            kind: 'int',
          },
          { label: 'Of tracked', value: cp.length, kind: 'int' },
          { label: 'Data through', value: cp[0]?.last_date, kind: 'date' },
        ],
        query: null,
        href: '/datasets/supply-chain',
      });
    }
    return rows;
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
  const out = await fn(getAdminClient());
  /* A loader returns its rows, or { rows, extra } when its card shows more. */
  return Array.isArray(out) ? { rows: out } : { rows: out?.rows || [], extra: out?.extra || null };
}

/* v4, row shapes changed. Errors are thrown inside the cache and caught outside, so a timeout is
   retried on the next request instead of being served for 15 minutes. */
const cachedLinkage = unstable_cache(loadLinkageOrThrow, ['hub-linkage-v4'], CACHE);

const cachedEyesLinkage = unstable_cache(loadLinkageOrThrow, ['hub-linkage-eyes-v1'], {
  ...CACHE,
  tags: ['hubs', 'eyes'],
});

export async function getLinkage(id) {
  try {
    return await (String(id).startsWith('eyes-') ? cachedEyesLinkage : cachedLinkage)(id);
  } catch (e) {
    console.error('[hub-data] linkage', id, e?.message || e);
    return { rows: [], error: true };
  }
}
