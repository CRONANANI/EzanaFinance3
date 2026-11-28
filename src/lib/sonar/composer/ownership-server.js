/**
 * Sonar: institutional ownership reads (Nov 27 2026). SERVER ONLY.
 *
 * rankInstitutionalOwnershipForUniverse(admin, { universe, metric, topN, comparePrior })
 *   ranks any universe of securities by how many 13F reporting managers hold them, in the
 *   latest adequately covered quarter, with the prior quarter compared on comparable filers.
 * universeForSubject(admin, subject)
 *   a member of Congress (estimated disclosed holdings) or a 13F filer (its own book) as an
 *   eligible universe, every exclusion labelled.
 *
 * Reads are bounded batches, never one query per security:
 *   1 the recent periods' effective filings (sec_13f_effective_filings, amendments applied)
 *     give each quarter's filer coverage, the comparable filer set and filer names;
 *   2 the holdings of the whole universe for a period in one database call
 *     (sonar_13f_ownership, migration 20261127090000) or, until that migration is applied,
 *     in accession-chunked pages of sec_13f_holdings on its (accession_no, cusip) index.
 * Results are cached in memory for 15 minutes per universe and period.
 * All numbers are computed in ./ownership.js; nothing here estimates a value.
 */

import {
  OWNERSHIP_VERSION,
  OWNERSHIP_LIMITATIONS,
  quarterEnds,
  selectCoveredPeriod,
  previousQuarter,
  normalizeUniverse,
  aggregateHoldings,
  fromDatabaseRows,
  rankOwnership,
  cleanTicker,
  TICKER_ALIASES,
} from './ownership.js';

const TTL = 15 * 60 * 1000;
const PAGE = 1000;
const ACC_CHUNK = 60;
const CONCURRENCY = 8;
const MAX_UNIVERSE = 50;
const cache = new Map();

function cached(key, fn) {
  const hit = cache.get(key);
  if (hit && hit.at > Date.now() - TTL) return hit.value;
  const value = Promise.resolve()
    .then(fn)
    .catch((e) => {
      cache.delete(key);
      throw e;
    });
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  return value;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await fn(items[k], k);
    }
  });
  await Promise.all(workers);
  return out;
}

/** Every row of a query, in pages, ordered by a unique key. */
async function pageAll(build, max = 40) {
  const rows = [];
  for (let p = 0; p < max; p++) {
    const { data, error } = await build().range(p * PAGE, p * PAGE + PAGE - 1);
    if (error) throw new Error(error.message || 'read failed');
    rows.push(...(data || []));
    if (!data || data.length < PAGE) return rows;
  }
  throw new Error('The read exceeded its page budget.');
}

/* ── periods and filers ─────────────────────────────────────────────── */

/**
 * Effective filings for the recent quarter-ends: coverage per period, accession to CIK,
 * filer names and books. One paged read, cached.
 */
function recentFilings(admin, today = new Date()) {
  const periods = quarterEnds(today, 4);
  return cached(`filings:${periods.join(',')}`, async () => {
    const rows = await pageAll(() =>
      admin
        .from('sec_13f_effective_filings')
        .select('accession_no, cik, filer_name, book, is_addon, period')
        .in('period', periods)
        .order('accession_no', { ascending: true }),
    );
    const byPeriod = {};
    for (const r of rows) {
      const p = String(r.period).slice(0, 10);
      const e = (byPeriod[p] = byPeriod[p] || {
        accessions: [],
        accCik: {},
        ciks: new Set(),
        names: {},
      });
      e.accessions.push(r.accession_no);
      e.accCik[r.accession_no] = r.cik;
      if (!r.is_addon) e.ciks.add(r.cik);
      const n = e.names[r.cik] || { name: null, book: 0 };
      if (r.filer_name) n.name = String(r.filer_name);
      if (!r.is_addon && Number(r.book) > 0) n.book = Number(r.book);
      e.names[r.cik] = n;
    }
    const coverage = Object.entries(byPeriod).map(([period, e]) => ({
      period,
      filers: e.ciks.size,
    }));
    return { byPeriod, coverage };
  });
}

/**
 * Sonar 6.1 (Nov 28 2026): the data epoch of an ownership ranking, read live. It changes
 * when a new disclosure for the holder arrives or when filings for a recent quarter-end
 * are loaded or amended, which is exactly when a stored ranking stops being current.
 * Count-only reads (head requests). Null on any error: no epoch, no reuse.
 */
export async function ownershipDataEpoch(admin, subject, today = new Date()) {
  if (!admin || !subject?.id) return null;
  try {
    const periods = quarterEnds(today, 4);
    const filerCounts = await Promise.all(
      periods.map(async (p) => {
        const { count, error } = await admin
          .from('sec_13f_effective_filings')
          .select('accession_no', { count: 'exact', head: true })
          .eq('period', p);
        if (error) throw error;
        return [p, count ?? 0];
      }),
    );
    let holder = null;
    if (subject.kind === 'politician') {
      const [{ count, error }, last] = await Promise.all([
        admin
          .from('congress_trades')
          .select('bioguide_id', { count: 'exact', head: true })
          .eq('bioguide_id', subject.id),
        admin
          .from('congress_trades')
          .select('disclosure_date')
          .eq('bioguide_id', subject.id)
          .not('disclosure_date', 'is', null)
          .order('disclosure_date', { ascending: false })
          .limit(1),
      ]);
      if (error || last.error) throw error || last.error;
      holder = {
        trades: count ?? 0,
        latest: last.data?.[0]?.disclosure_date
          ? String(last.data[0].disclosure_date).slice(0, 10)
          : null,
      };
    } else if (subject.kind === 'institution') {
      const { count, error } = await admin
        .from('ezq_13f_holdings')
        .select('cusip', { count: 'exact', head: true })
        .eq('filer_cik', subject.id)
        .eq('is_current', true);
      if (error) throw error;
      holder = { rows: count ?? 0 };
    } else {
      return null;
    }
    return { kind: subject.kind, id: String(subject.id), holder, filers: Object.fromEntries(filerCounts) };
  } catch {
    return null;
  }
}

/* ── holdings for a universe ────────────────────────────────────────── */

let rpcAvailable = null; // null unknown, true, false

async function viaFunction(admin, cusips, period, prior, top) {
  if (rpcAvailable === false) return null;
  const { data, error } = await admin.rpc('sonar_13f_ownership', {
    p_cusips: cusips,
    p_period: period,
    p_prior: prior,
    p_top: top,
  });
  if (error) {
    /* Not applied yet (or not exposed): use the paged read from now on. */
    if (/function|does not exist|schema cache|PGRST202/i.test(`${error.code} ${error.message}`))
      rpcAvailable = false;
    return null;
  }
  rpcAvailable = true;
  return data;
}

async function holdingsRows(admin, period, entry, cusips, withValue = true) {
  if (!entry?.accessions?.length || !cusips.length) return [];
  const chunks = [];
  for (let i = 0; i < entry.accessions.length; i += ACC_CHUNK)
    chunks.push(entry.accessions.slice(i, i + ACC_CHUNK));
  const parts = await mapLimit(chunks, CONCURRENCY, (chunk) =>
    pageAll(() =>
      admin
        .from('sec_13f_holdings')
        .select(
          withValue
            ? 'id, accession_no, cusip, value_usd, shares'
            : 'id, accession_no, cusip, shares',
        )
        .in('accession_no', chunk)
        .in('cusip', cusips)
        .eq('share_type', 'SH')
        .is('put_call', null)
        .order('id', { ascending: true }),
    ),
  );
  return parts.flat().map((r) => ({
    cusip: r.cusip,
    cik: entry.accCik[r.accession_no],
    value_usd: r.value_usd,
    shares: r.shares,
  }));
}

/** Per-CUSIP figures for one period (and its prior), function first, paged read second. */
async function ownershipFor(admin, filings, cusips, period, prior, top = 5) {
  const key = `own:${period}:${prior || '-'}:${top}:${[...cusips].sort().join(',')}`;
  return cached(key, async () => {
    const fn = await viaFunction(admin, cusips, period, prior, top);
    if (fn?.rows) {
      const got = fromDatabaseRows(fn.rows, { hasPrior: Boolean(prior) });
      const have = new Set(got.map((r) => r.cusip));
      for (const c of cusips)
        if (!have.has(c))
          got.push({ cusip: c, managers: 0, value: 0, shares: 0, comparableNow: 0, top: [] });
      return {
        rows: got,
        comparable: Number(fn.comparable_filers) || 0,
        method: 'database function sonar_13f_ownership',
      };
    }
    const cur = filings.byPeriod[period];
    const pri = prior ? filings.byPeriod[prior] : null;
    const [now, before] = await Promise.all([
      holdingsRows(admin, period, cur, cusips, true),
      pri ? holdingsRows(admin, prior, pri, cusips, false) : [],
    ]);
    const filersPrior = pri?.ciks || new Set();
    const rows = aggregateHoldings({
      now,
      prior: before,
      filersNow: cur?.ciks || new Set(),
      filersPrior,
      names: cur?.names || {},
      cusips,
      top,
    });
    const comparable = [...(cur?.ciks || [])].filter((c) => filersPrior.has(c)).length;
    return { rows, comparable, method: 'batched read of sec_13f_holdings' };
  });
}

/* ── universe ───────────────────────────────────────────────────────── */

/** Security-master candidates per ticker (OpenFIGI map), one read. */
async function securityMaster(admin, tickers) {
  const list = [...new Set(tickers.map(cleanTicker).filter(Boolean))];
  const want = [...new Set([...list, ...list.map((t) => TICKER_ALIASES[t]).filter(Boolean)])];
  if (!want.length) return {};
  const { data, error } = await admin
    .from('sec_cusip_map')
    .select('cusip, ticker, security_type, market_sector, name, status')
    .in('ticker', want)
    .limit(1000);
  if (error) throw new Error('Security identifiers could not be read');
  const map = {};
  for (const r of data || []) {
    if (r.status && r.status !== 'mapped') continue;
    const t = cleanTicker(r.ticker);
    (map[t] = map[t] || []).push({
      cusip: r.cusip,
      securityType: r.security_type || null,
      marketSector: r.market_sector || null,
      name: r.name || null,
    });
  }
  return map;
}

/**
 * The subject's eligible universe:
 *   politician   politician_portfolio (estimated open positions at range midpoints)
 *   institution  the filer's own latest 13F book (CUSIPs from the filing itself)
 */
export async function universeForSubject(admin, subject) {
  if (subject?.kind === 'politician') {
    const { data, error } = await admin.rpc('politician_portfolio', {
      p_bioguide: subject.id,
      p_limit: MAX_UNIVERSE,
    });
    if (error) throw new Error('Estimated holdings could not be read');
    const holdings = (Array.isArray(data?.holdings) ? data.holdings : []).map((h) => ({
      ticker: h.ticker,
      issuer: h.company
        ? String(h.company)
            .replace(/\s+-\s+.*$/, '')
            .replace(/^sP\s+/i, '')
            .trim()
        : h.ticker,
      est: Number(h.est) || null,
      share: h.share == null ? null : Number(h.share),
    }));
    const master = await securityMaster(
      admin,
      holdings.map((h) => h.ticker),
    );
    const { eligible, excluded } = normalizeUniverse(holdings, master);
    const { data: last } = await admin
      .from('congress_trades')
      .select('disclosure_date')
      .eq('bioguide_id', subject.id)
      .not('disclosure_date', 'is', null)
      .order('disclosure_date', { ascending: false })
      .limit(1);
    const asOf = last?.[0]?.disclosure_date ? String(last[0].disclosure_date).slice(0, 10) : null;
    const untickered = Math.max(
      0,
      (Number(data?.positions) || 0) - (Number(data?.stockPositions) || 0),
    );
    return {
      eligible,
      excluded,
      total: holdings.length,
      untickered,
      asOf,
      kind: 'politician',
      weightLabel: 'Est. weight',
      source: `${subject.name}'s estimated open positions from STOCK Act disclosures at range midpoints${asOf ? `, latest disclosure ${asOf}` : ''}`,
    };
  }
  if (subject?.kind === 'institution') {
    const { data, error } = await admin
      .from('ezq_13f_holdings')
      .select('ticker, cusip, issuer, value_usd, put_call, share_type')
      .eq('filer_cik', subject.id)
      .eq('period_of_report', subject.period)
      .eq('is_current', true)
      .is('put_call', null)
      .order('value_usd', { ascending: false })
      .limit(400);
    if (error) throw new Error('The 13F book could not be read');
    const byCusip = new Map();
    let book = 0;
    for (const r of data || []) {
      if (String(r.share_type || 'SH').toUpperCase() !== 'SH' || !r.cusip) continue;
      book += Number(r.value_usd) || 0;
      const x = byCusip.get(r.cusip) || {
        cusip: r.cusip,
        ticker: cleanTicker(r.ticker) || null,
        issuer: String(r.issuer || r.ticker || r.cusip).replace(/&amp;/g, '&'),
        value: 0,
      };
      x.value += Number(r.value_usd) || 0;
      byCusip.set(r.cusip, x);
    }
    const all = [...byCusip.values()].sort((a, b) => b.value - a.value);
    const eligible = all.slice(0, MAX_UNIVERSE).map((x) => ({
      ...x,
      ticker: x.ticker || x.cusip,
      weight: book > 0 ? x.value / book : null,
      est: null,
      floor: false,
    }));
    return {
      eligible,
      excluded: [],
      total: all.length,
      untickered: 0,
      asOf: subject.period,
      kind: 'institution',
      weightLabel: 'Book weight',
      source: `${subject.name}'s Form 13F for period ${subject.period}${all.length > MAX_UNIVERSE ? ` (its ${MAX_UNIVERSE} largest positions of ${all.length})` : ''}`,
    };
  }
  throw new Error('Institutional ownership needs a member of Congress or a 13F filer.');
}

/* ── the ranking ────────────────────────────────────────────────────── */

/**
 * Rank a universe ({ eligible, excluded, total, source, ... }) by institutional ownership.
 * Returns the typed result the report and the writer read (see ownership.js for fields).
 */
export async function rankInstitutionalOwnershipForUniverse(
  admin,
  {
    universe,
    metric = 'managers',
    topN = null,
    comparePrior = true,
    subject = null,
    today = new Date(),
  },
) {
  const started = Date.now();
  const filings = await recentFilings(admin, today);
  const pick = selectCoveredPeriod(filings.coverage, today);
  if (!pick?.period) throw new Error('No adequately covered 13F quarter is loaded.');
  const prior = comparePrior && pick.prior ? pick.prior : null;
  const cusips = universe.eligible.map((x) => x.cusip);
  const own = cusips.length
    ? await ownershipFor(admin, filings, cusips, pick.period, prior, 5)
    : { rows: [], comparable: 0, method: 'none' };
  const meta = new Map(universe.eligible.map((x) => [x.cusip, x]));
  let rows = rankOwnership(
    own.rows.map((r) => ({ ...meta.get(r.cusip), ...r })),
    metric,
  );
  if (topN) rows = rows.filter((r) => r.rank == null || r.rank <= topN);

  /* Breadth across reporting periods for the five leaders (one more batched read). */
  let trend = null;
  const older = prior ? previousQuarter(prior) : null;
  const leaders = rows.filter((r) => r.rank != null).slice(0, 5);
  if (older && filings.byPeriod[older] && leaders.length) {
    try {
      const ids = leaders.map((r) => r.cusip);
      const [o, p] = await Promise.all([
        ownershipFor(admin, filings, ids, older, null, 0),
        ownershipFor(admin, filings, ids, prior, null, 0),
      ]);
      const oc = new Map(o.rows.map((r) => [r.cusip, r.managers]));
      const pc = new Map(p.rows.map((r) => [r.cusip, r.managers]));
      const periods = [older, prior, pick.period];
      trend = {
        periods,
        filers: periods.map((x) => filings.coverage.find((c) => c.period === x)?.filers || 0),
        series: leaders.map((r) => ({
          cusip: r.cusip,
          ticker: r.ticker,
          values: [oc.get(r.cusip) ?? null, pc.get(r.cusip) ?? null, r.managers],
        })),
      };
    } catch {
      trend = null;
    }
  }

  /* The largest reporting managers across the universe (by their summed value in it). */
  const mgr = new Map();
  for (const r of rows)
    for (const t of r.top || []) {
      const m = mgr.get(t.cik) || { cik: t.cik, name: t.name, value: 0, holdings: [] };
      m.value += t.value;
      m.holdings.push(r.ticker);
      mgr.set(t.cik, m);
    }
  const managers = [...mgr.values()]
    .sort((a, b) => b.value - a.value || (a.cik < b.cik ? -1 : 1))
    .slice(0, 6);

  return {
    version: OWNERSHIP_VERSION,
    metric,
    subject: subject ? { name: subject.name, kind: subject.kind } : null,
    period: pick.period,
    prior,
    coverage: {
      filers: pick.filers,
      priorFilers: prior ? pick.priorFilers : 0,
      comparable: own.comparable,
      ratio: pick.ratio,
      best: pick.best,
      skipped: pick.skipped,
    },
    universe: {
      total: universe.total,
      eligible: universe.eligible.length,
      excluded: universe.excluded.length,
      untickered: universe.untickered || 0,
      source: universe.source,
      asOf: universe.asOf,
      kind: universe.kind,
      weightLabel: universe.weightLabel,
    },
    excluded: universe.excluded,
    rows,
    trend,
    managers,
    method: own.method,
    ownershipPct: null,
    limitations: OWNERSHIP_LIMITATIONS,
    durationMs: Date.now() - started,
  };
}
