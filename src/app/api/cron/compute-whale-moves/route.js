import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { whaleScore, MIN_POSITION_USD } from '@/lib/whale-score';

/**
 * Materialize Whale Moves. DERIVED from the parsed SEC tables (sec_13f_holdings /
 * sec_activist_positions), so it runs AFTER ingest-sec-holdings. For each filing
 * not yet scored it joins the filer's prior quarter, runs src/lib/whale-score.js,
 * and upserts rows with score > 0 into whale_moves. Dedicated (not folded into the
 * ingest cron) to keep each function short. Bounded per run; idempotent.
 *
 * Two-quarter dependency: until a filer has a prior quarter loaded, sharesPrior is
 * unknown and every position reads as `new`. That's acceptable for the first
 * loaded quarter — scores are only fully meaningful once two quarters exist. The
 * page's source copy states this.
 *
 *   GET /api/cron/compute-whale-moves?maxFilings=20&maxActivist=25
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
  return (h.cusip && h.cusip.trim()) || String(h.name_of_issuer || '').trim().toUpperCase();
}

/** Normalize a 13D/13G form_type (may carry an '/A' amendment suffix). */
function activistForm(formType) {
  return String(formType || '').startsWith('SC 13D') ? 'SC 13D' : 'SC 13G';
}

/** Filings of a family, newest first, not yet present in whale_moves. */
async function unscored(admin, family, lookback, cap) {
  const { data: filings } = await admin
    .from('sec_filings')
    .select('accession_no, cik, filer_name, ticker, form_type, filed_at, period_of_report')
    .eq('form_family', family)
    .order('filed_at', { ascending: false })
    .limit(lookback);
  const list = filings || [];
  if (!list.length) return [];
  const accs = list.map((f) => f.accession_no);
  const { data: done } = await admin.from('whale_moves').select('accession_no').in('accession_no', accs);
  const doneSet = new Set((done || []).map((r) => r.accession_no).filter(Boolean));
  return list.filter((f) => !doneSet.has(f.accession_no)).slice(0, cap);
}

async function scoreInstitutional(admin, f, errors) {
  const { data: cur } = await admin
    .from('sec_13f_holdings')
    .select('name_of_issuer, cusip, ticker, value_usd, shares')
    .eq('accession_no', f.accession_no);
  const current = cur || [];
  if (!current.length) return [];

  const fundTotalUsd = current.reduce((s, h) => s + (Number(h.value_usd) || 0), 0);
  const fundPositionCount = current.length;

  // Prior quarter for the same filer (earlier period_of_report), if loaded.
  const { data: priorFilings } = await admin
    .from('sec_filings')
    .select('accession_no, period_of_report')
    .eq('form_family', 'institutional')
    .eq('cik', f.cik)
    .lt('period_of_report', f.period_of_report)
    .order('period_of_report', { ascending: false })
    .limit(1);
  const priorFiling = priorFilings?.[0] || null;
  const priorMap = new Map();
  if (priorFiling) {
    const { data: pri } = await admin
      .from('sec_13f_holdings')
      .select('name_of_issuer, cusip, value_usd, shares')
      .eq('accession_no', priorFiling.accession_no);
    for (const h of pri || []) priorMap.set(holdingKey(h), h);
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
      ticker: (c && c.ticker) || null,
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

async function scoreActivist(admin, f, errors) {
  const { data: pos } = await admin
    .from('sec_activist_positions')
    .select('subject_name, subject_ticker, percent_of_class, shares')
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
      .select('accession_no, subject_name, percent_of_class')
      .in('accession_no', earlierAccs);
    const subj = String(pos.subject_name || '').trim().toUpperCase();
    const match = (earlierPos || []).find(
      (e) => String(e.subject_name || '').trim().toUpperCase() === subj && e.percent_of_class != null,
    );
    if (match) priorPct = Number(match.percent_of_class);
  }

  const form = activistForm(f.form_type);
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

  const { searchParams } = new URL(request.url);
  const maxFilings = Math.min(Math.max(Number(searchParams.get('maxFilings')) || 20, 1), 40);
  const maxActivist = Math.min(Math.max(Number(searchParams.get('maxActivist')) || 25, 1), 60);

  const admin = getAdminClient();
  const errors = [];
  let instRows = 0;
  let actRows = 0;

  const inst = await unscored(admin, 'institutional', 80, maxFilings);
  for (const f of inst) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const rows = await scoreInstitutional(admin, f, errors);
      // eslint-disable-next-line no-await-in-loop
      instRows += await replaceRows(admin, f.accession_no, rows, errors, 'inst');
    } catch (e) {
      errors.push(`inst ${f.accession_no}: ${e?.message || e}`);
    }
  }

  const act = await unscored(admin, 'activist', 80, maxActivist);
  for (const f of act) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const rows = await scoreActivist(admin, f, errors);
      // eslint-disable-next-line no-await-in-loop
      actRows += await replaceRows(admin, f.accession_no, rows, errors, 'activist');
    } catch (e) {
      errors.push(`activist ${f.accession_no}: ${e?.message || e}`);
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    institutional_moves: instRows,
    activist_moves: actRows,
    errors: errors.slice(0, 20),
  });
}
