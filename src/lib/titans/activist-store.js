/**
 * Schedule 13D/13G (activist) read layer: SERVER ONLY, cached 15 minutes
 * under the `titans` tag. The snapshot read (refresh_titans_activist) is no
 * longer rebuilt since its page was removed; the reads here add the per-investor,
 * per-target, per-filing and price-path views. Every function returns an
 * empty shape when the data is not there yet. Re-exported from store.js.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { whaleScore } from '@/lib/whale-score';
import { schedule13Kind } from '@/lib/sec-13f-parse';
import { getDailyBars } from '@/lib/prices/daily-bars';
import {
  PERSON_TYPE_LABEL,
  FUND_SOURCE_LABEL,
  PURPOSE_TAG_LABEL,
  SCHEDULE13_PARSER_VERSION,
  gBasis,
  labelled,
  purposeExcerpt,
  purposeSentences,
} from '@/lib/sec/schedule13-meta';
import {
  coFilingGraph,
  filterFilings,
  groupCampaigns,
  annotateCampaign,
  campaignStatus,
  medianPath,
  rebase,
  targetKey,
  windowRange,
} from '@/lib/titans/activist-model';
import { getActivistStakes, getFundHoldings, getSecurityHolders } from '@/lib/titans/store';

const CACHE = { revalidate: 900, tags: ['titans'] };
const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const DAY = 86400000;

function supaConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const POSITION_COLS =
  'accession_no, subject_name, subject_cik, subject_cusip, subject_ticker, percent_of_class, shares, form_type, event_date, reporting_persons, is_amendment, filer_name, filer_cik, filer_source, amendment_no, person_types, fund_sources, funds_source_text, transaction_purpose, purpose_tags, g_rules, member_of_group, sole_voting, shared_voting, sole_dispositive, shared_dispositive, parser_version';

/** One position row + its filing row to the page's filing shape. */
function shapeFiling(p, f) {
  const v2 = (p.parser_version || 0) >= SCHEDULE13_PARSER_VERSION;
  const persons = Array.isArray(p.reporting_persons) ? p.reporting_persons : [];
  return {
    accessionNo: p.accession_no,
    filer: v2 ? p.filer_name || null : null,
    filerCik: (v2 && p.filer_cik) || null,
    filerConfirmed: v2 && Boolean(p.filer_name),
    filerSource: v2 ? p.filer_source || null : null,
    subject: p.subject_name || null,
    ticker: p.subject_ticker ? String(p.subject_ticker).toUpperCase() : null,
    cusip: p.subject_cusip ? String(p.subject_cusip).trim().toUpperCase() : null,
    form: schedule13Kind(p.form_type || f?.form_type),
    isAmendment: !!p.is_amendment,
    amendmentNo: p.amendment_no ?? null,
    percentOfClass: num(p.percent_of_class),
    shares: num(p.shares),
    eventDate: p.event_date || null,
    filedAt: f?.filed_at || null,
    href: f?.index_url || f?.primary_doc_url || null,
    detailParsed: v2,
    purposeTags: (p.purpose_tags || []).map((t) => ({ tag: t, label: PURPOSE_TAG_LABEL[t] || t })),
    purposeExcerpt: purposeExcerpt(p.transaction_purpose),
    personTypes: labelled(p.person_types, PERSON_TYPE_LABEL),
    fundSources: labelled(p.fund_sources, FUND_SOURCE_LABEL),
    gBasis: gBasis(p.g_rules),
    voting: { sole: num(p.sole_voting), shared: num(p.shared_voting) },
    reportingPersons: persons.map((r) => ({
      name: r.name || null,
      cik: r.cik || null,
      shares: num(r.shares),
      types: labelled(r.types, PERSON_TYPE_LABEL),
    })),
  };
}

async function filingsWhere(admin, build) {
  const { data: rows, error } = await build(
    admin.from('sec_activist_positions').select(POSITION_COLS),
  );
  if (error) throw new Error(error.message);
  const list = rows || [];
  if (!list.length) return [];
  const byAcc = new Map();
  for (let i = 0; i < list.length; i += 200) {
    // eslint-disable-next-line no-await-in-loop
    const { data: fs } = await admin
      .from('sec_filings')
      .select('accession_no, filed_at, form_type, index_url, primary_doc_url')
      .in(
        'accession_no',
        list.slice(i, i + 200).map((r) => r.accession_no),
      );
    for (const f of fs || []) byAcc.set(f.accession_no, f);
  }
  return list
    .map((p) => shapeFiling(p, byAcc.get(p.accession_no)))
    .filter((r) => r.filedAt)
    .sort((a, b) => String(b.filedAt).localeCompare(String(a.filedAt)));
}

/* ── the snapshot ────────────────────────────────────────────────────── */

async function loadActivistOverview() {
  if (!supaConfigured()) return null;
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('titans_snapshots')
    .select('key, payload, computed_at')
    .like('key', 'activist:%')
    .order('key', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row?.payload) return null;
  return { ...row.payload, computedAt: row.computed_at };
}

export const getActivistOverview = unstable_cache(
  loadActivistOverview,
  ['titans-activist-overview-v1'],
  CACHE,
);

/* ── the filings table ───────────────────────────────────────────────── */

async function loadActivistFilings(argsJson) {
  const { window, form, tag, type, basis, page } = JSON.parse(argsJson);
  const all = await getActivistStakes({ limit: 300 });
  const [start] = windowRange(window || 'all', new Date().toISOString().slice(0, 10));
  const inWindow = all.filter((r) => !start || String(r.filedAt).slice(0, 10) >= start);
  const rows = filterFilings(inWindow, { form, tag, type, basis }).map((r) => {
    const score =
      r.detailParsed && !r.isAmendment && r.percentOfClass != null
        ? whaleScore({
            kind: 'activist',
            form: r.form,
            percentOfClass: r.percentOfClass,
            priorPercentOfClass: null,
          })
        : null;
    return { ...r, score: score?.score ?? null, scoreFactors: score?.factors ?? null };
  });
  const p = Math.max(1, Number(page) || 1);
  return { total: rows.length, page: p, rows: rows.slice(0, p * 50) };
}

const cachedFilings = unstable_cache(loadActivistFilings, ['titans-activist-filings-v1'], CACHE);
export function getActivistFilings(args = {}) {
  return cachedFilings(
    JSON.stringify({
      window: args.window || 'all',
      form: args.form || null,
      tag: args.tag || null,
      type: args.type || null,
      basis: args.basis || null,
      page: args.page || 1,
    }),
  );
}

/* ── Investor Dossier ────────────────────────────────────────────────── */

async function loadInvestorDossier(cik) {
  if (!supaConfigured()) return null;
  const padded = String(cik || '')
    .replace(/\D/g, '')
    .padStart(10, '0');
  if (!/^\d{10}$/.test(padded)) return null;
  const admin = getAdminClient();
  const filings = await filingsWhere(admin, (q) =>
    q.eq('filer_cik', padded).order('accession_no').limit(400),
  );
  if (!filings.length) return null;
  const { campaigns } = groupCampaigns(filings);
  const latest = filings[0];
  const mix = (get) => {
    const by = new Map();
    for (const f of filings) {
      for (const item of get(f) || []) {
        const k = typeof item === 'string' ? item : item.tag || item.code || item.rule;
        if (!k) continue;
        by.set(k, (by.get(k) || 0) + 1);
      }
    }
    return [...by.entries()].map(([k, n]) => ({ key: k, n })).sort((a, b) => b.n - a.n);
  };
  let has13F = false;
  try {
    const fund = await getFundHoldings(padded);
    has13F = Boolean(fund?.holdings?.length);
  } catch {
    has13F = false;
  }
  return {
    cik: padded,
    name: latest.filer,
    confirmedFrom: latest.filerSource,
    types: latest.personTypes,
    firstFiled: filings[filings.length - 1].filedAt,
    lastFiled: latest.filedAt,
    filings: filings.length,
    has13F,
    campaigns: campaigns
      .map((c) => ({
        key: `${c.filerCik}:${c.targetKey}`,
        ticker: c.ticker,
        subject: c.subject,
        status: campaignStatus(c),
        latestPct: num(c.filings[c.filings.length - 1]?.percentOfClass),
        filings: annotateCampaign(c.filings),
      }))
      .sort((a, b) =>
        String(b.filings[b.filings.length - 1]?.filedAt || '').localeCompare(
          String(a.filings[a.filings.length - 1]?.filedAt || ''),
        ),
      ),
    mixes: {
      forms: mix((f) => [f.form]),
      tags: mix((f) => f.purposeTags),
      funds: mix((f) => f.fundSources.map((s) => s.code)),
    },
    graph: coFilingGraph(filings),
  };
}

const cachedDossier = unstable_cache(loadInvestorDossier, ['titans-activist-dossier-v1'], CACHE);
export function getInvestorDossier(cik) {
  return cachedDossier(String(cik || ''));
}

/* ── Target File ─────────────────────────────────────────────────────── */

async function loadTargetFile(key) {
  if (!supaConfigured()) return null;
  const k = String(key || '')
    .trim()
    .toUpperCase();
  if (!k || k.length > 12) return null;
  const admin = getAdminClient();
  const filings = await filingsWhere(admin, (q) =>
    q.or(`subject_cusip.eq.${k},subject_ticker.eq.${k}`).order('accession_no').limit(300),
  );
  if (!filings.length) return null;
  const latest = filings[0];
  const ticker = latest.ticker;
  const { campaigns } = groupCampaigns(filings);
  const holders = campaigns
    .map((c) => {
      const last = c.filings[c.filings.length - 1];
      return last && num(last.percentOfClass) >= 5 ? { campaign: c, filing: last } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (num(b.filing.percentOfClass) || 0) - (num(a.filing.percentOfClass) || 0));

  let sector = null;
  let priceSinceFirst = null;
  let response = null;
  if (ticker) {
    const first = filings[filings.length - 1];
    const [{ data: sec }, bars] = await Promise.all([
      admin.from('ticker_sectors').select('sector').eq('ticker', ticker).maybeSingle(),
      getDailyBars(ticker, String(first.filedAt).slice(0, 10)).catch(() => ({ candles: [] })),
    ]);
    sector = sec?.sector || null;
    const candles = bars?.candles || [];
    if (candles.length >= 2) {
      const a = num(candles[0]?.close);
      const b = num(candles[candles.length - 1]?.close);
      if (a) priceSinceFirst = (b - a) / a;
    }
    const latest13d = filings.find((f) => f.form === '13D');
    let insider = null;
    if (latest13d) {
      const from = String(latest13d.filedAt).slice(0, 10);
      const to = new Date(Date.parse(`${from}T00:00:00Z`) + 30 * DAY).toISOString().slice(0, 10);
      const { data: tr } = await admin
        .from('sec_insider_transactions')
        .select('transaction_date, transaction_code, reporter_name, reporter_title, shares')
        .eq('issuer_ticker', ticker)
        .in('transaction_code', ['P', 'S'])
        .eq('table_kind', 'non_derivative')
        .gte('transaction_date', from)
        .lte('transaction_date', to)
        .order('transaction_date')
        .limit(60);
      const list = tr || [];
      insider = list.length
        ? {
            after: from,
            buys: list.filter((t) => t.transaction_code === 'P').length,
            sells: list.filter((t) => t.transaction_code === 'S').length,
            marks: list.map((t) => ({
              date: t.transaction_date,
              buy: t.transaction_code === 'P',
              name: t.reporter_name || null,
              title: t.reporter_title || null,
              shares: num(t.shares),
            })),
          }
        : null;
    }
    let f13 = null;
    try {
      const x = await getSecurityHolders(ticker);
      if (x) f13 = { holdersNow: x.holdersNow, holdersPrior: x.holdersPrior, period: x.period };
    } catch {
      f13 = null;
    }
    response = { insider, f13 };
  }

  return {
    targetKey: targetKey({ cusip: latest.cusip, subject: latest.subject }),
    ticker,
    subject: latest.subject,
    cusip: latest.cusip,
    sector,
    priceSinceFirst,
    firstFiled: filings[filings.length - 1].filedAt,
    lastFiled: latest.filedAt,
    filingsOnFile: filings.length,
    holders: holders.map(({ campaign, filing }) => ({
      filerCik: campaign.filerCik,
      filer: campaign.filer,
      form: filing.form,
      pct: num(filing.percentOfClass),
      filed: filing.filedAt,
      tags: filing.purposeTags,
      basis: filing.gBasis,
      voting: filing.voting,
    })),
    timeline: filings,
    response,
  };
}

const cachedTarget = unstable_cache(loadTargetFile, ['titans-activist-target-v1'], CACHE);
export function getTargetFile(key) {
  return cachedTarget(String(key || ''));
}

/* ── After the Filing: price paths around the event date ─────────────── */

async function loadEventPricePaths(argsJson) {
  const { window, form, tag } = JSON.parse(argsJson);
  const empty = { paths: [], median: [], rows: [] };
  if (!supaConfigured()) return empty;
  const all = await getActivistStakes({ limit: 300 });
  const [start] = windowRange(window || '90d', new Date().toISOString().slice(0, 10));
  const rows = filterFilings(
    all.filter(
      (r) =>
        r.ticker &&
        r.eventDate &&
        !r.isAmendment &&
        (!start || String(r.filedAt).slice(0, 10) >= start),
    ),
    { form, tag },
  ).slice(0, 40);

  const paths = [];
  const tableRows = [];
  await Promise.all(
    rows.map(async (r) => {
      try {
        const event = String(r.eventDate).slice(0, 10);
        const from = new Date(Date.parse(`${event}T00:00:00Z`) - 9 * DAY)
          .toISOString()
          .slice(0, 10);
        const { candles } = await getDailyBars(r.ticker, from);
        if (candles.length < 3) return;
        const eventIdx = candles.findIndex((c) => c.date >= event);
        if (eventIdx < 0) return;
        const raw = candles.map((c, i) => [i - eventIdx, num(c.close)]);
        const windowed = raw.filter(([d]) => d >= -5 && d <= 60);
        const zero = windowed.findIndex(([d]) => d === 0);
        if (zero < 0) return;
        const path = rebase(windowed, zero).filter(([, v]) => v != null);
        if (path.length < 2) return;
        paths.push({ ticker: r.ticker, event, filed: String(r.filedAt).slice(0, 10), path });
        const filedPt = [...path].reverse().find(([d]) => {
          const date = candles[d + eventIdx]?.date;
          return date && date <= String(r.filedAt).slice(0, 10);
        });
        tableRows.push({
          ticker: r.ticker,
          eventToFiled: filedPt ? filedPt[1] : null,
          filedToToday:
            path[path.length - 1][1] != null && filedPt
              ? path[path.length - 1][1] - filedPt[1]
              : null,
        });
      } catch {
        /* a ticker without price history contributes no path */
      }
    }),
  );
  return { paths, median: medianPath(paths.map((p) => p.path)), rows: tableRows };
}

const cachedPaths = unstable_cache(loadEventPricePaths, ['titans-activist-after-v1'], CACHE);
export function getEventPricePaths(args = {}) {
  return cachedPaths(
    JSON.stringify({
      window: args.window || '90d',
      form: args.form || null,
      tag: args.tag || null,
    }),
  );
}

/* ── Filing Reader extras ────────────────────────────────────────────── */

/** The previous filing in the same campaign, for the "raised from" note. */
export async function raisedFrom(filing) {
  if (!supaConfigured() || !filing?.filerCik) return null;
  const key = targetKey({ cusip: filing.cusip, subject: filing.subject });
  if (!key || !filing.filedAt) return null;
  const admin = getAdminClient();
  const col = filing.cusip ? 'subject_cusip' : 'subject_name';
  const val = filing.cusip || filing.subject;
  const { data } = await admin
    .from('sec_activist_positions')
    .select('accession_no, percent_of_class, form_type')
    .eq('filer_cik', filing.filerCik)
    .eq(col, val)
    .neq('accession_no', filing.accessionNo)
    .limit(50);
  const { data: fs } = (data || []).length
    ? await admin
        .from('sec_filings')
        .select('accession_no, filed_at')
        .in(
          'accession_no',
          data.map((r) => r.accession_no),
        )
    : { data: [] };
  const filedBy = new Map((fs || []).map((f) => [f.accession_no, f.filed_at]));
  const prev = (data || [])
    .map((r) => ({ ...r, filed_at: filedBy.get(r.accession_no) }))
    .filter((r) => r.filed_at && r.filed_at < filing.filedAt)
    .sort((a, b) => String(b.filed_at).localeCompare(String(a.filed_at)))[0];
  if (!prev) return null;
  return {
    accessionNo: prev.accession_no,
    pct: num(prev.percent_of_class),
    form: schedule13Kind(prev.form_type),
    filedAt: prev.filed_at,
  };
}

export { purposeSentences };
