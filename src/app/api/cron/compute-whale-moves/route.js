import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { whaleScore, MIN_POSITION_USD } from '@/lib/whale-score';
import { schedule13Kind } from '@/lib/sec-13f-parse';
import { recentPeriods, priorQuarterEnd, latestCompleteQuarter } from '@/lib/sec/quarters';

/**
 * Materialize Whale Moves. DERIVED from the parsed SEC tables (sec_13f_holdings /
 * sec_activist_positions), so it runs AFTER ingest-sec-holdings. For each filing
 * not yet scored it joins the filer's prior quarter, runs src/lib/whale-score.js,
 * and upserts rows with score > 0 into whale_moves. Dedicated (not folded into the
 * ingest cron) to keep each function short. Bounded per run; idempotent.
 *
 * Two quarters: a 13F is scored only for the running quarter or the latest
 * complete one (the quarter before that is the comparison base), and only once the same
 * filer's filing for the immediately prior quarter-end is parsed (latest
 * amendment wins). Without that prior every position would read "new", so the
 * filing waits instead. Filings that cannot produce a move (no position of
 * MIN_POSITION_USD or more this quarter or last) are skipped up front, so they
 * never occupy the per-run cap.
 *
 * At the end of each run, refresh_titans_institutional() rebuilds the
 * Institutional page snapshot for the latest complete quarter.
 *
 *   GET /api/cron/compute-whale-moves?maxFilings=60&maxActivist=60
 * Auth: CRON_SECRET bearer (or ?key=).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// Cap rows written per 13F filing: the gate already drops sub-$100M names, but a
// mega-fund can still hold hundreds above it — keep only the highest-scoring
// moves so one index-like filer can't flood the table.
const PER_FILING_KEEP = 25;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if ((request.headers.get('authorization') || '') === `Bearer ${secret}`) return true;
  try {
    return new URL(request.url).searchParams.get('key') === secret;
  } catch {
    return false;
  }
}

/** period_of_report ('YYYY-MM-DD', quarter end) → 'CYyyyyQn'. */
function quarterLabel(period) {
  const m = /^(\d{4})-(\d{2})/.exec(String(period || ''));
  if (!m) return null;
  return `CY${m[1]}Q${Math.ceil(Number(m[2]) / 3)}`;
}

/** Match a holding across quarters by CUSIP, falling back to issuer name. */
function holdingKey(h) {
  return (
    (h.cusip && h.cusip.trim()) ||
    String(h.name_of_issuer || '')
      .trim()
      .toUpperCase()
  );
}

/**
 * Normalize any Schedule 13D/13G spelling ('SC 13D', 'SCHEDULE 13D/A', …) to
 * '13D' or '13G'. The page renders it as "Schedule 13D" / "Schedule 13G".
 */
function activistForm(formType) {
  return schedule13Kind(formType) || '13G';
}

const IN_CHUNK = 30; // whale_moves keeps up to 25 rows per filing
const PROBE_BATCH = 20;

/** Accessions (of `accs`) that already have whale_moves rows. */
async function scoredSet(admin, accs) {
  const done = new Set();
  for (let i = 0; i < accs.length; i += IN_CHUNK) {
    // eslint-disable-next-line no-await-in-loop
    const { data } = await admin
      .from('whale_moves')
      .select('accession_no')
      .in('accession_no', accs.slice(i, i + IN_CHUNK));
    for (const r of data || []) if (r.accession_no) done.add(r.accession_no);
  }
  return done;
}

/** Latest parsed 13F of a filer for one quarter-end (amendments included). */
async function filingFor(admin, cik, period) {
  const { data } = await admin
    .from('sec_filings')
    .select('accession_no, filed_at')
    .eq('form_family', 'institutional')
    .eq('cik', cik)
    .eq('period_of_report', period)
    .order('filed_at', { ascending: false })
    .limit(3);
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

/** True when a filing holds at least one position at or above the gate. */
async function hasGatePosition(admin, accessionNo) {
  const { data } = await admin
    .from('sec_13f_holdings')
    .select('id')
    .eq('accession_no', accessionNo)
    .gte('value_usd', MIN_POSITION_USD)
    .limit(1);
  return (data || []).length > 0;
}

/**
 * Recent-period 13Fs that are parsed, not yet scored, have a parsed prior
 * quarter, and can produce at least one move. Newest period first.
 */
async function scorableInstitutional(admin, cap, now) {
  // The oldest recent period is only the comparison base for the one after it.
  const periods = recentPeriods(now).slice(0, -1);
  const list = [];
  for (let from = 0; ; from += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('sec_filings')
      .select('accession_no, cik, filer_name, ticker, form_type, filed_at, period_of_report')
      .eq('form_family', 'institutional')
      .in('period_of_report', periods)
      .order('period_of_report', { ascending: false })
      .order('filed_at', { ascending: false })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    list.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const done = await scoredSet(
    admin,
    list.map((f) => f.accession_no),
  );
  const todo = list.filter((f) => !done.has(f.accession_no));

  const out = [];
  let waitingForPrior = 0;
  for (let i = 0; i < todo.length && out.length < cap; i += PROBE_BATCH) {
    const batch = todo.slice(i, i + PROBE_BATCH);
    // eslint-disable-next-line no-await-in-loop
    const checked = await Promise.all(
      batch.map(async (f) => {
        const parsed = await hasRows(admin, f.accession_no);
        if (!parsed) return null;
        const prior = await filingFor(admin, f.cik, priorQuarterEnd(f.period_of_report));
        if (!prior) return { wait: true };
        const eligible =
          (await hasGatePosition(admin, f.accession_no)) ||
          (await hasGatePosition(admin, prior.accession_no));
        return eligible ? { ...f, prior } : null;
      }),
    );
    for (const c of checked) {
      if (!c) continue;
      if (c.wait) waitingForPrior += 1;
      else out.push(c);
    }
  }
  return { filings: out.slice(0, cap), waitingForPrior };
}

async function hasRows(admin, accessionNo) {
  const { data } = await admin
    .from('sec_13f_holdings')
    .select('id')
    .eq('accession_no', accessionNo)
    .limit(1);
  return (data || []).length > 0;
}

/** Activist filings, newest first, parsed and not yet in whale_moves. */
async function unscoredActivist(admin, lookback, cap) {
  const { data: filings } = await admin
    .from('sec_filings')
    .select('accession_no, cik, filer_name, ticker, form_type, filed_at, period_of_report')
    .eq('form_family', 'activist')
    .order('filed_at', { ascending: false })
    .limit(lookback);
  const list = filings || [];
  if (!list.length) return [];
  const done = await scoredSet(
    admin,
    list.map((f) => f.accession_no),
  );
  return list.filter((f) => !done.has(f.accession_no)).slice(0, cap);
}

/** Read every holding row of one filing (large filers exceed one page). */
async function holdingsOf(admin, accessionNo, cols) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await admin
      .from('sec_13f_holdings')
      .select(cols)
      .eq('accession_no', accessionNo)
      .order('id')
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) return out;
  }
}

async function scoreInstitutional(admin, f) {
  const current = await holdingsOf(
    admin,
    f.accession_no,
    'name_of_issuer, cusip, ticker, value_usd, shares',
  );
  if (!current.length) return [];

  const fundTotalUsd = current.reduce((s, h) => s + (Number(h.value_usd) || 0), 0);
  const fundPositionCount = current.length;

  // The same filer's filing for the immediately prior quarter-end, chosen by
  // scorableInstitutional (latest parsed amendment wins).
  const priorMap = new Map();
  if (f.prior) {
    const pri = await holdingsOf(
      admin,
      f.prior.accession_no,
      'name_of_issuer, cusip, ticker, value_usd, shares',
    );
    for (const h of pri) priorMap.set(holdingKey(h), h);
  }

  const curMap = new Map(current.map((h) => [holdingKey(h), h]));
  const quarter = quarterLabel(f.period_of_report);
  const rows = [];

  for (const key of new Set([...curMap.keys(), ...priorMap.keys()])) {
    const c = curMap.get(key);
    const p = priorMap.get(key);
    // Held now → current value; fully exited → pass the PRIOR size as valueUsd so
    // a closed $100M+ name clears the gate instead of being dropped at value 0.
    const held = !!c;
    const valueUsd = held ? Number(c.value_usd) || 0 : Number(p.value_usd) || 0;
    const sharesNow = held ? Number(c.shares) || 0 : 0;
    const sharesPrior = p ? Number(p.shares) || 0 : 0;
    if (valueUsd < MIN_POSITION_USD) continue; // cheap pre-gate

    const res = whaleScore({
      kind: 'institutional',
      valueUsd,
      sharesNow,
      sharesPrior,
      fundTotalUsd,
      fundPositionCount,
    });
    if (!res.score) continue;

    const src = c || p;
    rows.push({
      kind: 'institutional',
      filer_name: f.filer_name,
      filer_cik: f.cik,
      ticker: src.ticker || null,
      cusip: src.cusip ? String(src.cusip).trim().toUpperCase() : null,
      issuer: src.name_of_issuer,
      accession_no: f.accession_no,
      quarter,
      value_usd: valueUsd,
      conviction_pct: res.factors.convictionPct ?? null,
      change_type: res.factors.changeType ?? null,
      percent_of_class: null,
      form: null,
      whale_score: res.score,
      tier: res.tier,
      factors: res.factors,
      filed_at: f.filed_at,
    });
  }

  rows.sort((a, b) => b.whale_score - a.whale_score);
  return rows.slice(0, PER_FILING_KEEP);
}

async function scoreActivist(admin, f) {
  const { data: pos } = await admin
    .from('sec_activist_positions')
    .select('subject_name, subject_ticker, subject_cusip, form_type, percent_of_class, shares')
    .eq('accession_no', f.accession_no)
    .maybeSingle();
  if (!pos || pos.percent_of_class == null) return [];

  // Prior stake by the same filer on the same subject, if any earlier filing.
  let priorPct = null;
  const { data: earlier } = await admin
    .from('sec_filings')
    .select('accession_no')
    .eq('form_family', 'activist')
    .eq('cik', f.cik)
    .lt('filed_at', f.filed_at)
    .order('filed_at', { ascending: false })
    .limit(5);
  const earlierAccs = (earlier || []).map((e) => e.accession_no);
  if (earlierAccs.length) {
    const { data: earlierPos } = await admin
      .from('sec_activist_positions')
      .select('accession_no, subject_name, subject_cusip, percent_of_class')
      .in('accession_no', earlierAccs);
    const subj = String(pos.subject_name || '')
      .trim()
      .toUpperCase();
    const same = (e) =>
      pos.subject_cusip && e.subject_cusip
        ? e.subject_cusip === pos.subject_cusip
        : String(e.subject_name || '')
            .trim()
            .toUpperCase() === subj;
    const match = (earlierPos || []).find((e) => same(e) && e.percent_of_class != null);
    if (match) priorPct = Number(match.percent_of_class);
  }

  const form = activistForm(pos.form_type || f.form_type);
  const res = whaleScore({
    kind: 'activist',
    form,
    percentOfClass: Number(pos.percent_of_class),
    priorPercentOfClass: priorPct,
  });
  if (!res.score) return [];

  return [
    {
      kind: 'activist',
      filer_name: f.filer_name,
      filer_cik: f.cik,
      ticker: pos.subject_ticker || f.ticker || null,
      cusip: pos.subject_cusip || null,
      issuer: pos.subject_name || null,
      accession_no: f.accession_no,
      quarter: null,
      value_usd: null,
      conviction_pct: null,
      change_type: null,
      percent_of_class: Number(pos.percent_of_class),
      form,
      whale_score: res.score,
      tier: res.tier,
      factors: res.factors,
      filed_at: f.filed_at,
    },
  ];
}

/** Replace a filing's whale_moves rows (idempotent on re-score). */
async function replaceRows(admin, accessionNo, rows, errors, label) {
  await admin.from('whale_moves').delete().eq('accession_no', accessionNo);
  if (!rows.length) return 0;
  const { error } = await admin.from('whale_moves').insert(rows);
  if (error) {
    errors.push(`${label} ${accessionNo}: ${error.message}`);
    return 0;
  }
  return rows.length;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  const outOfTime = () => Date.now() - started > 230_000;
  const { searchParams } = new URL(request.url);
  const maxFilings = Math.min(Math.max(Number(searchParams.get('maxFilings')) || 20, 1), 60);
  const maxActivist = Math.min(Math.max(Number(searchParams.get('maxActivist')) || 25, 1), 60);

  const admin = getAdminClient();
  const errors = [];
  const now = new Date();
  let instRows = 0;
  let actRows = 0;
  let waitingForPrior = 0;

  let inst = [];
  try {
    const res = await scorableInstitutional(admin, maxFilings, now);
    inst = res.filings;
    waitingForPrior = res.waitingForPrior;
  } catch (e) {
    errors.push(`inst queue: ${e?.message || e}`);
  }
  for (const f of inst) {
    if (outOfTime()) break;
    try {
      // eslint-disable-next-line no-await-in-loop
      const rows = await scoreInstitutional(admin, f);
      // eslint-disable-next-line no-await-in-loop
      instRows += await replaceRows(admin, f.accession_no, rows, errors, 'inst');
    } catch (e) {
      errors.push(`inst ${f.accession_no}: ${e?.message || e}`);
    }
  }

  const act = await unscoredActivist(admin, 400, maxActivist);
  for (const f of act) {
    if (outOfTime()) break;
    try {
      // eslint-disable-next-line no-await-in-loop
      const rows = await scoreActivist(admin, f);
      // eslint-disable-next-line no-await-in-loop
      actRows += await replaceRows(admin, f.accession_no, rows, errors, 'activist');
    } catch (e) {
      errors.push(`activist ${f.accession_no}: ${e?.message || e}`);
    }
  }

  // Institutional page snapshot for the latest complete quarter.
  const period = latestCompleteQuarter(now);
  const { data: snapshot, error: snapErr } = await admin.rpc('refresh_titans_institutional', {
    p_period: period,
    p_limit: 25,
  });
  if (snapErr) errors.push(`snapshot ${period}: ${snapErr.message}`);

  if (instRows || actRows || snapshot) revalidateTag('titans');

  return NextResponse.json({
    ok: errors.length === 0,
    institutional_moves: instRows,
    activist_moves: actRows,
    waiting_for_prior_quarter: waitingForPrior,
    snapshot: snapshot || null,
    errors: errors.slice(0, 20),
  });
}
