/**
 * Titans Shadow read layer: SERVER ONLY (admin client), cached for 15 minutes
 * under the `titans` tag, which the SEC crons revalidate after writing.
 *
 *   getInstitutionalOverview(): the latest complete 13F quarter, from the
 *     snapshot refresh_titans_institutional() stores each hour (filers ranked
 *     by reported value, most widely held securities, largest new positions).
 *   getActivistStakes({ limit }): newest Schedule 13D/13G stakes, with the
 *     parser v2 detail (investor, purpose tags and excerpt, funds, person
 *     types, voting power, 13G basis) once a row has been reparsed.
 *   getActivistFiling(accessionNo): one 13D/13G filing with its full Item 3
 *     and Item 4 text and every reporting person.
 *   getFundHoldings(cik): one filer's latest 13F holdings with the change
 *     versus its prior quarter.
 *
 * Tickers come from CUSIP via OpenFIGI; an unmapped security carries its
 * issuer name and a null ticker, never an invented one. Every function returns
 * an empty shape when the data is not there yet.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { classifyChange } from '@/lib/whale-score';
import { schedule13Kind } from '@/lib/sec-13f-parse';
import { getDailyBars } from '@/lib/prices/daily-bars';
import {
  SCHEDULE13_PARSER_VERSION,
  PERSON_TYPE_LABEL,
  FUND_SOURCE_LABEL,
  PURPOSE_TAG_LABEL,
  labelled,
  gBasis,
  purposeExcerpt,
} from '@/lib/sec/schedule13-meta';
import {
  filingDeadline,
  latestCompleteQuarter,
  currentReportQuarter,
  priorQuarterEnd,
  recentPeriods,
  quarterLabelLong,
} from '@/lib/sec/quarters';
import {
  effectiveN,
  filingDay,
  flowAdjustedChange,
  largestHolders,
  pctSince,
  topNWeight,
} from '@/lib/titans/institutional-model';

const CACHE = { revalidate: 900, tags: ['titans'] };
const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

function supaConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const secFilerUrl = (cik) =>
  cik
    ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(String(cik))}`
    : null;

/* ── Institutional overview ─────────────────────────────────────────── */

async function loadOverview(period = '') {
  if (!supaConfigured()) return null;
  const admin = getAdminClient();
  const wanted = `institutional:${period || latestCompleteQuarter(new Date())}`;
  let { data, error } = await admin
    .from('titans_snapshots')
    .select('key, payload, computed_at')
    .eq('key', wanted)
    .maybeSingle();
  if (error) throw new Error(error.message);
  // An explicitly requested period (the open quarter) has no fallback: a
  // missing snapshot is an honest "not computed yet".
  if (!data && period) return null;
  if (!data) {
    // Fall back to the newest snapshot on file (e.g. right after a quarter
    // completes, before the first refresh of the new one).
    const res = await admin
      .from('titans_snapshots')
      .select('key, payload, computed_at')
      .like('key', 'institutional:%')
      .order('key', { ascending: false })
      .limit(1);
    if (res.error) throw new Error(res.error.message);
    data = res.data?.[0] || null;
  }
  if (!data?.payload) return null;
  return mapInstitutionalPayload(data.payload, {
    key: data.key,
    computedAt: data.computed_at,
  });
}

/**
 * Map one institutional snapshot payload (or the dev fixture, which shares
 * its shape) to the page's camelCase overview. Exported so the sample path
 * renders through exactly the same mapping as the live one.
 */
export function mapInstitutionalPayload(p, { key = '', computedAt = null } = {}) {
  const quarter = p.period || String(key).split(':')[1];
  const row = (r) => ({
    cik: r.cik || null,
    filer: r.filer_name || null,
    ticker: r.ticker || null,
    issuer: r.issuer || null,
    cusip: r.cusip || null,
    valueUsd: num(r.value_usd ?? r.total_value_usd),
    shares: num(r.shares),
    quarter,
  });
  return {
    quarter,
    quarterLabel: quarterLabelLong(quarter),
    priorQuarter: p.prior_period || priorQuarterEnd(quarter),
    computedAt,
    filers: num(p.filers) || 0,
    filersWithPrior: num(p.filers_with_prior) || 0,
    holdings: num(p.holdings) || 0,
    totalValueUsd: num(p.total_value_usd) || 0,
    topFilers: (p.top_filers || []).map((r) => ({
      ...row(r),
      positions: num(r.positions),
      filedAt: r.filed_at || null,
      topTicker: r.top_ticker || null,
      topWeight: num(r.top_weight),
      href: secFilerUrl(r.cik),
    })),
    widelyHeld: (p.widely_held || []).map((r) => ({
      ...row(r),
      holders: num(r.holders),
      holdersPrior: num(r.holders_prior),
      netBreadth: num(r.net_breadth),
    })),
    newPositions: (p.new_positions || []).map((r) => ({
      ...row(r),
      pctOfBook: num(r.pct_of_book),
    })),
    /* v2 snapshot keys (null-safe for a v1 snapshot still on file) */
    prior: p.prior
      ? {
          filers: num(p.prior.filers) || 0,
          holdings: num(p.prior.holdings) || 0,
          totalValueUsd: num(p.prior.total_value_usd) || 0,
        }
      : null,
    breadth: (p.breadth || []).map((r) => ({
      cusip: r.cusip,
      ticker: r.ticker || null,
      issuer: r.issuer || null,
      buyers: num(r.buyers) || 0,
      sellers: num(r.sellers) || 0,
      newCount: num(r.new) || 0,
      exited: num(r.exited) || 0,
      holdersNow: num(r.holders_now) || 0,
      holdersPrior: num(r.holders_prior) || 0,
    })),
    newlyEntering: (p.newly_entering || []).map((r) => ({
      cusip: r.cusip,
      ticker: r.ticker || null,
      issuer: r.issuer || null,
      newCount: num(r.new) || 0,
      holdersNow: num(r.holders_now) || 0,
    })),
    convictionMap: (p.conviction_map || []).map((r) => ({
      cusip: r.cusip,
      ticker: r.ticker || null,
      issuer: r.issuer || null,
      holders: num(r.holders) || 0,
      medianWeight: num(r.median_weight),
      valueUsd: num(r.value_usd),
      sector: r.sector || null,
    })),
    sectors: (p.sectors || []).map((r) => ({
      sector: r.sector || 'Unclassified',
      shareNow: num(r.share_now) || 0,
      sharePrior: num(r.share_prior) || 0,
      flowUsd: num(r.flow_usd) || 0,
    })),
    exits: (p.exits || []).map((r) => ({
      cik: r.cik,
      filer: r.filer_name || null,
      cusip: r.cusip,
      ticker: r.ticker || null,
      issuer: r.issuer || null,
      valuePrior: num(r.value_prior),
      sharesPrior: num(r.shares_prior),
      pctOfPriorBook: num(r.pct_of_prior_book),
    })),
    filerShape: (p.filer_shape || [])
      .map((a) => ({ cik: a?.[0], valueUsd: num(a?.[1]), effN: num(a?.[2]) }))
      .filter((f) => f.cik && f.valueUsd != null),
    effNMedian: num(p.eff_n_median),
    options: (p.options || []).map((r) => ({
      cusip: r.cusip,
      ticker: r.ticker || null,
      issuer: r.issuer || null,
      callUsd: num(r.call_usd) || 0,
      putUsd: num(r.put_usd) || 0,
      callFilers: num(r.call_filers) || 0,
      putFilers: num(r.put_filers) || 0,
    })),
    sectorWeights: (p.sector_weights || []).map((r) => ({
      sector: r.sector || 'Unclassified',
      weight: num(r.weight) || 0,
    })),
  };
}

export const getInstitutionalOverview = unstable_cache(
  loadOverview,
  ['titans-institutional-v2'],
  CACHE,
);

/** The snapshot for one explicit period (the open quarter); null when absent. */
const cachedOverviewFor = unstable_cache(loadOverview, ['titans-institutional-for-v1'], CACHE);
export function getInstitutionalOverviewFor(period) {
  return cachedOverviewFor(String(period || ''));
}

/* ── Filing season clock ────────────────────────────────────────────── */

async function loadFilingCurve(period) {
  const empty = {
    period: period || null,
    deadline: null,
    todayDay: null,
    open: [],
    prior: [],
    priorFinal: 0,
    earlyMovers: [],
  };
  if (!supaConfigured() || !period) return empty;
  const admin = getAdminClient();
  const { data, error } = await admin.rpc('titans_filing_curve', { p_period: period });
  if (error) throw new Error(error.message);
  if (!data) return empty;
  /* The effective deadline: day 45 rolled to the next business day. */
  const deadline = filingDeadline(period).effective;

  /* The four largest filers already in, each with its biggest move. */
  const movers = [];
  for (const m of data.early_movers || []) {
    let headline = null;
    try {
      // eslint-disable-next-line no-await-in-loop
      const fund = await getFundHoldings(m.cik);
      let best = null;
      for (const h of fund?.holdings || []) {
        if (!h.ticker || h.change == null) continue;
        const flow = flowAdjustedChange({
          sharesNow: h.shares,
          sharesPrior: h.priorShares,
          priceNow: h.shares && h.valueUsd ? h.valueUsd / h.shares : null,
        });
        if (flow == null) continue;
        if (!best || Math.abs(flow) > Math.abs(best.flow)) {
          best = { flow, ticker: h.ticker, change: h.change };
        }
      }
      if (best) {
        headline = {
          kind: best.change === 'new' ? 'new' : best.flow >= 0 ? 'largest_add' : 'largest_cut',
          ticker: best.ticker,
        };
      }
    } catch {
      headline = null;
    }
    movers.push({
      cik: m.cik,
      filer: m.filer_name || null,
      filedAt: m.filed_at || null,
      valueUsd: num(m.value_usd),
      positions: num(m.positions),
      headline,
    });
  }
  return {
    period,
    deadline,
    todayDay: filingDay(period, new Date().toISOString().slice(0, 10)),
    open: (data.open || []).map((d) => [num(d?.[0]) || 0, num(d?.[1]) || 0]),
    prior: (data.prior || []).map((d) => [num(d?.[0]) || 0, num(d?.[1]) || 0]),
    priorFinal: num(data.prior_final) || 0,
    earlyMovers: movers,
  };
}

const cachedFilingCurve = unstable_cache(loadFilingCurve, ['titans-filing-curve-v1'], CACHE);
export function getFilingCurve(period) {
  return cachedFilingCurve(String(period || currentReportQuarter(new Date())));
}

/* ── Security X-ray ─────────────────────────────────────────────────── */

const XRAY_KEY_RE = /^[A-Z0-9.\-]{1,12}$/;

async function loadSecurityHolders(key, page) {
  if (!supaConfigured()) return null;
  const k = String(key || '')
    .trim()
    .toUpperCase();
  if (!XRAY_KEY_RE.test(k)) return null;
  const admin = getAdminClient();
  const period = latestCompleteQuarter(new Date());
  const pageN = Math.min(Math.max(Number(page) || 1, 1), 100);
  const { data, error } = await admin.rpc('titans_security_xray', {
    p_key: k,
    p_period: period,
    p_limit: 25,
    p_offset: (pageN - 1) * 25,
  });
  if (error) throw new Error(error.message);
  if (!data) return null;

  const ticker = data.ticker ? String(data.ticker).toUpperCase() : null;
  /* Largest holders: its own cached read, page 1 only, never fatal. */
  const largestP =
    pageN === 1 && data.cusip
      ? getLargestHolders(data.cusip, data.period, ticker).catch((e) => {
          console.error('[titans] largest holders:', e?.message || e);
          return { error: true };
        })
      : Promise.resolve(null);
  let sector = null;
  let priceChange = null;
  let cross = null;
  if (ticker) {
    const [{ data: sec }, bars] = await Promise.all([
      admin.from('ticker_sectors').select('sector').eq('ticker', ticker).maybeSingle(),
      getDailyBars(ticker, data.period).catch(() => ({ candles: [] })),
    ]);
    sector = sec?.sector || null;
    const candles = bars?.candles || [];
    if (candles.length >= 2) {
      priceChange = pctSince(candles[0]?.close, candles[candles.length - 1]?.close);
    }
    cross = await loadCrossSignals(admin, ticker, data.period);
  }

  const largest = await largestP;
  return {
    cusip: data.cusip,
    ticker,
    issuer: data.issuer || null,
    sector,
    largest,
    period: data.period,
    priorPeriod: data.prior_period,
    holdersNow: num(data.holders_now) || 0,
    holdersPrior: num(data.holders_prior) || 0,
    buyers: num(data.buyers) || 0,
    sellers: num(data.sellers) || 0,
    newCount: num(data.new) || 0,
    exited: num(data.exited) || 0,
    valueUsd: num(data.value_usd),
    shares: num(data.shares),
    sharesPrior: num(data.shares_prior),
    priceChangeSincePeriod: priceChange,
    ladderTotal: num(data.ladder_total) || 0,
    ladderPage: pageN,
    ladder: (data.ladder || []).map((r) => ({
      cik: r.cik,
      filer: r.filer_name || null,
      valueUsd: num(r.value_usd),
      weight: num(r.weight),
      change: r.class || null,
    })),
    joined: (data.joined || []).map((r) => ({
      cik: r.cik,
      filer: r.filer_name || null,
      valueUsd: num(r.value_usd),
    })),
    left: (data.left || []).map((r) => ({
      cik: r.cik,
      filer: r.filer_name || null,
      valuePrior: num(r.value_prior),
    })),
    cross,
  };
}

/** Insider, Congress, activist and ETF reads for one ticker; null per block
    when that dataset has nothing, whole thing null when no ticker. */
async function loadCrossSignals(admin, ticker, period) {
  const since = period;
  const [insider, congress, activist, etf] = await Promise.all([
    admin
      .from('sec_insider_transactions')
      .select('transaction_date, transaction_code')
      .eq('issuer_ticker', ticker)
      .in('transaction_code', ['P', 'S'])
      .eq('table_kind', 'non_derivative')
      .gte('transaction_date', since)
      .order('transaction_date', { ascending: false })
      .limit(200)
      .then((r) => r.data || [])
      .catch(() => []),
    admin
      .from('congress_trades')
      .select('type')
      .eq('ticker', ticker)
      .gte('transaction_date', since)
      .limit(500)
      .then((r) => r.data || [])
      .catch(() => []),
    admin
      .from('sec_activist_positions')
      .select('percent_of_class, form_type')
      .eq('subject_ticker', ticker)
      .order('event_date', { ascending: false, nullsFirst: false })
      .limit(1)
      .then((r) => r.data?.[0] || null)
      .catch(() => null),
    admin
      .from('sec_etf_holdings')
      .select('series_id', { count: 'exact', head: true })
      .eq('ticker', ticker)
      .then((r) => r.count || 0)
      .catch(() => 0),
  ]);
  const insBuys = insider.filter((r) => r.transaction_code === 'P').length;
  const congressBuys = congress.filter((r) =>
    String(r.type || '')
      .toLowerCase()
      .startsWith('p'),
  ).length;
  const congressSells = congress.filter((r) =>
    String(r.type || '')
      .toLowerCase()
      .startsWith('s'),
  ).length;
  return {
    insider: insider.length
      ? {
          buys: insBuys,
          sells: insider.length - insBuys,
          latest: insider[0]?.transaction_date || null,
        }
      : null,
    congress: congress.length ? { buys: congressBuys, sells: congressSells } : null,
    activist:
      activist && num(activist.percent_of_class) != null
        ? { pct: num(activist.percent_of_class), form: schedule13Kind(activist.form_type) }
        : null,
    etf: etf ? { funds: etf } : null,
  };
}

/* ── Largest holders (the X-ray's first section) ─────────────────────── */

/* One quarter's class-share lines for a CUSIP from the materialised table
   (put_call is stored as '' for share lines). sh_shares (SH lines only,
   20261025120000_titans_sh_shares.sql) is preferred when the column exists
   and is populated; before that migration runs, `shares` is used, which on
   a few hundred CUSIPs also carries PRN (principal) lines. */
async function positionLines(admin, period, cusip, ciks = null) {
  const run = (cols) => {
    let q = admin
      .from('titans_13f_positions')
      .select(cols)
      .eq('period', period)
      .eq('cusip', cusip)
      .eq('put_call', '');
    if (ciks) q = q.in('cik', ciks);
    return q.limit(5000);
  };
  let res = await run('cik, shares, sh_shares, value_usd');
  let sh = true;
  if (res.error) {
    sh = false;
    res = await run('cik, shares, value_usd');
  }
  if (res.error) throw new Error(res.error.message);
  return (res.data || []).map((r) => ({
    cik: r.cik,
    shares: num(sh && r.sh_shares != null ? r.sh_shares : r.shares) || 0,
    valueUsd: num(r.value_usd) || 0,
  }));
}

async function loadLargestHolders(cusip, period, ticker) {
  if (!supaConfigured() || !cusip || !period) return null;
  const admin = getAdminClient();
  const prior = priorQuarterEnd(period);
  const [rows, latestFiled, outstanding] = await Promise.all([
    positionLines(admin, period, cusip),
    admin
      .from('titans_13f_filers')
      .select('filed_at')
      .eq('period', period)
      .order('filed_at', { ascending: false })
      .limit(1)
      .then((r) => r.data?.[0]?.filed_at || null),
    ticker
      ? admin
          .from('sec_fundamentals')
          .select('value, period_end, accession_no')
          .eq('concept', 'shares_outstanding')
          .eq('ticker', ticker)
          .order('period_end', { ascending: false })
          .limit(1)
          .then((r) => r.data?.[0] || null)
          .catch(() => null)
      : null,
  ]);
  /* Top candidates first, then only their prior lines and names. */
  const first = largestHolders({ rows, limit: 15 });
  const ciks = first.holders.map((h) => h.cik);
  const [priorRows, priorFilers, names] = ciks.length
    ? await Promise.all([
        positionLines(admin, prior, cusip, ciks),
        admin
          .from('titans_13f_filers')
          .select('cik')
          .eq('period', prior)
          .in('cik', ciks)
          .then((r) => (r.data || []).map((x) => x.cik)),
        admin
          .from('titans_13f_filers')
          .select('cik, filer_name')
          .eq('period', period)
          .in('cik', ciks)
          .then((r) => new Map((r.data || []).map((x) => [x.cik, x.filer_name]))),
      ])
    : [[], [], new Map()];
  const out = largestHolders({
    rows: rows.map((r) => ({ ...r, name: names.get(r.cik) || null })),
    priorRows,
    priorFilers,
    sharesOutstanding: outstanding ? num(outstanding.value) : null,
    limit: 15,
  });
  return {
    quarter: period,
    quarterLabel: quarterShortLabel(period),
    priorQuarter: prior,
    filedThrough: latestFiled,
    stillFiling: (() => {
      const d = filingDeadline(period)?.effective;
      return d ? new Date().toISOString().slice(0, 10) <= d : false;
    })(),
    sharesOutstandingAsOf: outstanding?.period_end || null,
    ...out,
    holders: out.holders.map((h) => ({ ...h, name: h.name ? filerLabelCase(h.name) : null })),
  };
}

const quarterShortLabel = (iso) => {
  const m = /^(\d{4})-(\d{2})/.exec(String(iso || ''));
  return m ? `Q${Math.ceil(Number(m[2]) / 3)} ${m[1]}` : null;
};

/* "VANGUARD GROUP INC" -> "Vanguard Group Inc"; mixed case left as filed. */
function filerLabelCase(raw) {
  const s = String(raw || '').trim();
  if (s !== s.toUpperCase()) return s;
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\b(Llc|Lp|Llp|Na|Fsb|Plc|Ag|Sa|Ii|Iii)\b/g, (w) => w.toUpperCase());
}

const cachedLargestHolders = unstable_cache(
  loadLargestHolders,
  ['titans-largest-holders-v1'],
  CACHE,
);
export function getLargestHolders(cusip, period, ticker = null) {
  return cachedLargestHolders(String(cusip || ''), String(period || ''), ticker || null);
}

const cachedXray = unstable_cache(loadSecurityHolders, ['titans-security-xray-v2'], CACHE);
export function getSecurityHolders(key, { page = 1 } = {}) {
  return cachedXray(String(key || ''), Number(page) || 1);
}

/* ── Twin funds ─────────────────────────────────────────────────────── */

async function loadTwins(cik, period) {
  if (!supaConfigured() || !cik || !period) return [];
  const admin = getAdminClient();
  const { data, error } = await admin.rpc('titans_fund_twins', {
    p_cik: cik,
    p_period: period,
  });
  if (error) throw new Error(error.message);
  return (data || []).map((t) => ({
    cik: t.cik,
    filer: t.filer_name || null,
    valueUsd: num(t.book),
    overlap: num(t.overlap),
    shared: num(t.shared) || 0,
    sharedTickers: t.shared_tickers || [],
    onlyA: t.only_a || [],
    onlyB: t.only_b || [],
  }));
}

/* ── The lag tax: price change since the quarter end, per ticker ─────── */

async function loadLagTax(tickersCsv, period) {
  const tickers = String(tickersCsv || '')
    .split(',')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 12);
  const out = {};
  await Promise.all(
    tickers.map(async (t) => {
      try {
        const { candles } = await getDailyBars(t, period);
        if (candles.length >= 2) {
          out[t] = pctSince(candles[0]?.close, candles[candles.length - 1]?.close);
        }
      } catch {
        /* a ticker without price history is simply absent */
      }
    }),
  );
  return out;
}

const cachedLagTax = unstable_cache(loadLagTax, ['titans-lag-tax-v1'], CACHE);
export function getLagTax(tickers, period) {
  return cachedLagTax((tickers || []).join(','), String(period || ''));
}

/* ── Signal convergence: which other datasets point at a ticker ──────── */

async function loadConvergence(tickersCsv, period) {
  if (!supaConfigured()) return {};
  const admin = getAdminClient();
  const tickers = String(tickersCsv || '')
    .split(',')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 12);
  const out = {};
  await Promise.all(
    tickers.map(async (t) => {
      out[t] = await loadCrossSignals(admin, t, period);
    }),
  );
  return out;
}

const cachedConvergence = unstable_cache(loadConvergence, ['titans-convergence-v1'], CACHE);
export function getConvergence(tickers, period) {
  return cachedConvergence((tickers || []).join(','), String(period || ''));
}

const cachedTwins = unstable_cache(loadTwins, ['titans-fund-twins-v1'], CACHE);
export function getFundTwins(cik, period) {
  return cachedTwins(
    String(cik || '')
      .replace(/\D/g, '')
      .padStart(10, '0'),
    String(period || latestCompleteQuarter(new Date())),
  );
}

/* ── Activist stakes ────────────────────────────────────────────────── */

async function loadActivist(limit) {
  if (!supaConfigured()) return [];
  const admin = getAdminClient();
  const lim = Math.min(Math.max(Number(limit) || 100, 1), 300);
  const { data: filings, error } = await admin
    .from('sec_filings')
    .select('accession_no, cik, filer_name, form_type, filed_at, index_url, primary_doc_url')
    .eq('form_family', 'activist')
    .order('filed_at', { ascending: false })
    .limit(lim * 3);
  if (error) throw new Error(error.message);
  const list = filings || [];
  if (!list.length) return [];
  const byAcc = new Map();
  for (let i = 0; i < list.length; i += 200) {
    // eslint-disable-next-line no-await-in-loop
    const { data: rows, error: pErr } = await admin
      .from('sec_activist_positions')
      .select(
        'accession_no, subject_name, subject_cik, subject_cusip, subject_ticker, percent_of_class, shares, form_type, event_date, reporting_persons, is_amendment, filer_name, filer_cik, filer_source, amendment_no, person_types, fund_sources, funds_source_text, transaction_purpose, purpose_tags, g_rules, member_of_group, sole_voting, shared_voting, sole_dispositive, shared_dispositive, parser_version',
      )
      .in(
        'accession_no',
        list.slice(i, i + 200).map((f) => f.accession_no),
      );
    if (pErr) throw new Error(pErr.message);
    for (const r of rows || []) byAcc.set(r.accession_no, r);
  }
  const out = [];
  for (const f of list) {
    const p = byAcc.get(f.accession_no);
    if (!p || (p.percent_of_class == null && p.shares == null)) continue;
    const persons = Array.isArray(p.reporting_persons) ? p.reporting_persons : [];
    const form = p.form_type || f.form_type;
    const v2 = (p.parser_version || 0) >= SCHEDULE13_PARSER_VERSION;
    /* Parser v2 stores the confirmed investor. A v2 row without one is NOT
       given the EDGAR index name, which can be the target company. Rows still
       waiting for their reparse keep the old fallback, flagged unconfirmed. */
    const filer = v2 ? p.filer_name || null : persons[0]?.name || f.filer_name || null;
    const filerConfirmed = v2 ? Boolean(p.filer_name) : Boolean(persons[0]?.name);
    out.push({
      accessionNo: f.accession_no,
      filer,
      filerCik: (v2 && p.filer_cik) || null,
      filerConfirmed,
      filerSource: v2 ? p.filer_source || null : null,
      reportingPersons: persons.length,
      subject: p.subject_name || null,
      ticker: p.subject_ticker || null,
      percentOfClass: num(p.percent_of_class),
      shares: num(p.shares),
      form: schedule13Kind(form),
      isAmendment: !!p.is_amendment,
      eventDate: p.event_date || null,
      filedAt: f.filed_at,
      href: f.index_url || f.primary_doc_url || null,
      /* Parser v2 detail; empty or null until the row is reparsed. */
      detailParsed: v2,
      amendmentNo: p.amendment_no ?? null,
      personTypes: labelled(p.person_types, PERSON_TYPE_LABEL),
      fundSources: labelled(p.fund_sources, FUND_SOURCE_LABEL),
      purposeTags: (p.purpose_tags || []).map((t) => ({
        tag: t,
        label: PURPOSE_TAG_LABEL[t] || t,
      })),
      purposeExcerpt: purposeExcerpt(p.transaction_purpose),
      hasPurpose: Boolean(p.transaction_purpose),
      hasFundsSource: Boolean(p.funds_source_text),
      gBasis: gBasis(p.g_rules),
      memberOfGroup: p.member_of_group ?? null,
      voting: {
        sole: num(p.sole_voting),
        shared: num(p.shared_voting),
        soleDispositive: num(p.sole_dispositive),
        sharedDispositive: num(p.shared_dispositive),
      },
    });
    if (out.length >= lim) break;
  }
  return out;
}

const cachedActivist = unstable_cache(loadActivist, ['titans-activist-v2'], CACHE);
export function getActivistStakes({ limit = 100 } = {}) {
  return cachedActivist(limit);
}

/* ── One 13D/13G filing in full (Stated Intent card, dossier panels) ─── */

const ACC_RE = /^\d{10}-\d{2}-\d{6}$/;

async function loadActivistFiling(accessionNo) {
  if (!supaConfigured() || !ACC_RE.test(String(accessionNo || ''))) return null;
  const admin = getAdminClient();
  const [{ data: p, error }, { data: f }] = await Promise.all([
    admin
      .from('sec_activist_positions')
      .select(
        'accession_no, subject_name, subject_ticker, subject_cusip, percent_of_class, shares, form_type, event_date, reporting_persons, is_amendment, filer_name, filer_cik, filer_source, amendment_no, person_types, fund_sources, funds_source_text, transaction_purpose, purpose_tags, g_rules, member_of_group, sole_voting, shared_voting, sole_dispositive, shared_dispositive, parser_version',
      )
      .eq('accession_no', accessionNo)
      .maybeSingle(),
    admin
      .from('sec_filings')
      .select('filed_at, form_type, index_url, primary_doc_url')
      .eq('accession_no', accessionNo)
      .maybeSingle(),
  ]);
  if (error) throw new Error(error.message);
  if (!p) return null;
  const v2 = (p.parser_version || 0) >= SCHEDULE13_PARSER_VERSION;
  return {
    accessionNo: p.accession_no,
    form: schedule13Kind(p.form_type || f?.form_type),
    isAmendment: !!p.is_amendment,
    amendmentNo: p.amendment_no ?? null,
    filedAt: f?.filed_at || null,
    eventDate: p.event_date || null,
    href: f?.index_url || f?.primary_doc_url || null,
    detailParsed: v2,
    filer: v2 ? p.filer_name || null : null,
    filerCik: v2 ? p.filer_cik || null : null,
    filerConfirmed: v2 && Boolean(p.filer_name),
    subject: p.subject_name || null,
    ticker: p.subject_ticker || null,
    cusip: p.subject_cusip || null,
    percentOfClass: num(p.percent_of_class),
    shares: num(p.shares),
    voting: {
      sole: num(p.sole_voting),
      shared: num(p.shared_voting),
      soleDispositive: num(p.sole_dispositive),
      sharedDispositive: num(p.shared_dispositive),
    },
    memberOfGroup: p.member_of_group ?? null,
    personTypes: labelled(p.person_types, PERSON_TYPE_LABEL),
    fundSources: labelled(p.fund_sources, FUND_SOURCE_LABEL),
    gBasis: gBasis(p.g_rules),
    purposeTags: (p.purpose_tags || []).map((t) => ({ tag: t, label: PURPOSE_TAG_LABEL[t] || t })),
    /* Verbatim filing text, never summarised. */
    transactionPurpose: p.transaction_purpose || null,
    fundsSourceText: p.funds_source_text || null,
    reportingPersons: (Array.isArray(p.reporting_persons) ? p.reporting_persons : []).map((r) => ({
      name: r.name || null,
      cik: r.cik || null,
      shares: num(r.shares),
      percent: num(r.percent),
      types: labelled(r.types, PERSON_TYPE_LABEL),
      fundSources: labelled(r.fund_sources, FUND_SOURCE_LABEL),
      citizenship: r.citizenship || null,
      voting: {
        sole: num(r.sole_voting),
        shared: num(r.shared_voting),
        soleDispositive: num(r.sole_dispositive),
        sharedDispositive: num(r.shared_dispositive),
      },
      group: r.group ?? null,
    })),
  };
}

const cachedActivistFiling = unstable_cache(
  loadActivistFiling,
  ['titans-activist-filing-v1'],
  CACHE,
);
export function getActivistFiling(accessionNo) {
  return cachedActivistFiling(String(accessionNo || ''));
}

/* ── One fund's holdings ────────────────────────────────────────────── */

async function holdingsOf(admin, accessionNo) {
  const out = [];
  for (let from = 0; from < 20000; from += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('sec_13f_holdings')
      .select('name_of_issuer, cusip, ticker, value_usd, shares, put_call')
      .eq('accession_no', accessionNo)
      .order('id')
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function latestParsedFiling(admin, cik, periods) {
  const { data } = await admin
    .from('sec_filings')
    .select('accession_no, filer_name, period_of_report, filed_at, index_url')
    .eq('form_family', 'institutional')
    .eq('cik', cik)
    .in('period_of_report', periods)
    .order('period_of_report', { ascending: false })
    .order('filed_at', { ascending: false })
    .limit(6);
  for (const f of data || []) {
    // eslint-disable-next-line no-await-in-loop
    const { data: probe } = await admin
      .from('sec_13f_holdings')
      .select('id')
      .eq('accession_no', f.accession_no)
      .limit(1);
    if ((probe || []).length) return f;
  }
  return null;
}

async function loadFund(cik) {
  if (!supaConfigured() || !cik) return null;
  const admin = getAdminClient();
  const padded = String(cik).replace(/\D/g, '').padStart(10, '0');
  const cur = await latestParsedFiling(admin, padded, recentPeriods(new Date()));
  if (!cur) return null;
  const prior = await latestParsedFiling(admin, padded, [priorQuarterEnd(cur.period_of_report)]);
  const [now, before] = await Promise.all([
    holdingsOf(admin, cur.accession_no),
    prior ? holdingsOf(admin, prior.accession_no) : Promise.resolve([]),
  ]);
  const key = (h) =>
    (h.cusip || h.name_of_issuer || '').toUpperCase() + (h.put_call ? `|${h.put_call}` : '');
  const priorMap = new Map(before.map((h) => [key(h), h]));
  const total = now.reduce((s, h) => s + (Number(h.value_usd) || 0), 0);
  const rows = now
    .map((h) => {
      const p = priorMap.get(key(h));
      return {
        issuer: h.name_of_issuer,
        ticker: h.ticker || null,
        cusip: h.cusip || null,
        putCall: h.put_call || null,
        valueUsd: num(h.value_usd),
        shares: num(h.shares),
        weightPct: total ? ((Number(h.value_usd) || 0) / total) * 100 : null,
        priorShares: p ? num(p.shares) : null,
        change: prior ? classifyChange(Number(h.shares) || 0, p ? Number(p.shares) || 0 : 0) : null,
      };
    })
    .sort((a, b) => (b.valueUsd || 0) - (a.valueUsd || 0));

  /* Fingerprint figures (v2, non-breaking): all computed from the rows above. */
  const eqRows = rows.filter((h) => !h.putCall);
  const weights = eqRows.map((h) => (total ? (h.valueUsd || 0) / total : 0));
  const turnover = { new: 0, doubled: 0, added: 0, trimmed: 0, flat: 0, exited: 0 };
  for (const h of rows) if (h.change && turnover[h.change] != null) turnover[h.change] += 1;
  if (prior) {
    const nowKeys = new Set(now.map(key));
    for (const h of before) if (!nowKeys.has(key(h)) && !h.put_call) turnover.exited += 1;
  }

  /* Flow-adjusted moves: share change at the current implied price. */
  const priceOf = (h) => (h.shares && h.valueUsd ? h.valueUsd / h.shares : null);
  const moves = eqRows
    .filter((h) => h.change && h.change !== 'flat' && h.ticker)
    .map((h) => ({
      ticker: h.ticker,
      change: h.change,
      flowUsd: flowAdjustedChange({
        sharesNow: h.shares,
        sharesPrior: h.priorShares,
        priceNow: priceOf(h),
      }),
    }))
    .filter((m) => m.flowUsd != null);
  const topAdds = moves
    .filter((m) => m.flowUsd > 0)
    .sort((a, b) => b.flowUsd - a.flowUsd)
    .slice(0, 5);
  const topCuts = moves
    .filter((m) => m.flowUsd < 0)
    .sort((a, b) => a.flowUsd - b.flowUsd)
    .slice(0, 5);

  /* The manager's own sector weights, from the same editorial sector map. */
  let sectorWeights = [];
  const tickers = [...new Set(eqRows.map((h) => h.ticker).filter(Boolean))];
  if (tickers.length) {
    const sectorBy = new Map();
    for (let i = 0; i < tickers.length; i += 200) {
      // eslint-disable-next-line no-await-in-loop
      const { data: secs } = await admin
        .from('ticker_sectors')
        .select('ticker, sector')
        .in('ticker', tickers.slice(i, i + 200));
      for (const s of secs || []) sectorBy.set(s.ticker, s.sector);
    }
    const agg = new Map();
    for (const h of eqRows) {
      const sector = (h.ticker && sectorBy.get(h.ticker)) || 'Unclassified';
      agg.set(sector, (agg.get(sector) || 0) + (h.valueUsd || 0));
    }
    const eqTotal = eqRows.reduce((s, h) => s + (h.valueUsd || 0), 0);
    sectorWeights = [...agg.entries()]
      .map(([sector, v]) => ({ sector, weight: eqTotal ? v / eqTotal : 0 }))
      .sort((a, b) => b.weight - a.weight);
  }

  return {
    cik: padded,
    filer: cur.filer_name,
    quarter: cur.period_of_report,
    quarterLabel: quarterLabelLong(cur.period_of_report),
    priorQuarter: prior ? prior.period_of_report : null,
    totalValueUsd: total,
    positions: rows.length,
    href: cur.index_url || null,
    holdings: rows,
    filedAt: cur.filed_at || null,
    effN: effectiveN(weights),
    top10Weight: topNWeight(weights, 10),
    sectorWeights,
    turnover,
    topAdds,
    topCuts,
  };
}

const cachedFund = unstable_cache(loadFund, ['titans-fund-v1'], CACHE);
export function getFundHoldings(cik) {
  return cachedFund(String(cik || ''));
}

/* ── Activist page reads (campaign model, dossier, target, paths) ───── */
export {
  getActivistOverview,
  getActivistFilings,
  getInvestorDossier,
  getTargetFile,
  getEventPricePaths,
  raisedFrom,
} from './activist-store';

/* ── Titans Shadow steps 2 to 4 (each in its own module) ───────────── */
export { getInsiderOverview, searchInsider } from './insider-store';
export { getFundamentalsTable, getFundamentalsHistory } from './fundamentals-store';
export { getExecCompTable, getExecCompHistory } from './exec-comp-store';
export { getEtfFunds, getEtfFund, getEtfHolders, getEtfOverlap } from './etf-store';
