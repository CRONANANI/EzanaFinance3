import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { cronRoute } from '@/lib/cron/with-cron-lock';
import { getFilingIndexJson, edgarUrls, secFetchText, getSubmissions } from '@/lib/sec-edgar';
import { filingWindow, parseCover, submissionsRows } from '@/lib/sec/13f-backfill';
import { GET as ingestFilings } from '../ingest-sec-filings/route';
import { GET as ingestHoldings } from '../ingest-sec-holdings/route';

/**
 * 13F historical backfill driver (Nov 2026). Scheduled; CRON_SECRET only (cronRoute).
 *
 * Works the quarters an operator lists in sec_13f_backfill_quarters (service role only;
 * nothing runs until a row exists). Each run does ONE phase, so it stays inside one
 * function's time limit:
 *
 *   0. filers    every tracked 13F filer's EDGAR submissions feed, which lists each filing
 *                with its report date. This is the complete source: full-text search returns
 *                only a fraction of 13F filings (50 on the Nov 16, 2026 deadline day).
 *                New accession numbers are inserted; existing rows are left as they are.
 *   1. discover  filing days still pending: the existing filings route in its backfill mode,
 *                one day per call (?from=D&to=D&forms=13F-HR,13F-HR/A&pages=60). A day whose
 *                EDGAR total exceeds what was collected is marked 'truncated', not 'done'.
 *   2. parse     the existing holdings route with ?periods= for these quarters. A named-period
 *                run never applies retention, and retention elsewhere keeps these quarters.
 *   3. declare   parsed filings with no declared row count, and amendments with no amendment
 *                type: read the cover page only.
 *   4. check     sec_13f_materialise_if_complete(period): materialises only when every
 *                completeness check passes; otherwise records why and changes nothing.
 *
 * Idempotent: filings upsert on accession number; holdings for a filing are replaced in one
 * transaction; a failed day is retried up to four times and then left 'failed' (which keeps
 * the quarter from being materialised).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const DISCOVER_BUDGET_MS = 200_000;
const DECLARE_BUDGET_MS = 200_000;
const FILERS_BUDGET_MS = 200_000;
const MAX_ATTEMPTS = 4;

function internal(request, path) {
  return new Request(new URL(path, request.url), {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return { ok: false, error: `status ${res.status}` };
  }
}

async function seedDays(admin, periods) {
  for (const period of periods) {
    const rows = filingWindow(period).map((day) => ({ period, day }));
    // eslint-disable-next-line no-await-in-loop
    await admin
      .from('sec_13f_backfill_days')
      .upsert(rows, { onConflict: 'period,day', ignoreDuplicates: true });
  }
}

async function discover(request, admin, periods, started) {
  const { data: days, error } = await admin
    .from('sec_13f_backfill_days')
    .select('period, day, attempts')
    .in('period', periods)
    .in('status', ['pending', 'failed'])
    .lt('attempts', MAX_ATTEMPTS)
    .order('period', { ascending: false })
    .order('day', { ascending: true })
    .limit(60);
  if (error) throw new Error(`plan: ${error.message}`);
  const done = [];
  for (const d of days || []) {
    if (Date.now() - started > DISCOVER_BUDGET_MS) break;
    const qs = `from=${d.day}&to=${d.day}&forms=13F-HR,13F-HR/A&pages=60`;
    let out;
    try {
      // eslint-disable-next-line no-await-in-loop
      out = await readJson(
        await ingestFilings(internal(request, `/api/cron/ingest-sec-filings?${qs}`)),
      );
    } catch (e) {
      out = { ok: false, error: String(e?.message || e) };
    }
    const failed = !out || out.ok === false || out.error;
    const status = failed ? 'failed' : out.truncated ? 'truncated' : 'done';
    // eslint-disable-next-line no-await-in-loop
    await admin
      .from('sec_13f_backfill_days')
      .update({
        status,
        attempts: d.attempts + 1,
        edgar_total: out?.edgar_total ?? null,
        hits_seen: out?.hits_seen ?? null,
        indexed: out?.indexed ?? null,
        error: failed ? String(out?.error || (out?.errors || []).join('; ')).slice(0, 500) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('period', d.period)
      .eq('day', d.day);
    done.push({ day: d.day, status, indexed: out?.indexed ?? 0 });
  }
  return done;
}

async function discoverFilers(admin, periods, started) {
  const { data: filers, error } = await admin
    .from('sec_13f_backfill_filers')
    .select('cik, attempts')
    .is('checked_at', null)
    .lt('attempts', MAX_ATTEMPTS)
    .order('cik')
    .limit(1500);
  if (error) throw new Error(`filers: ${error.message}`);
  let checked = 0;
  let found = 0;
  let failed = 0;
  for (const f of filers || []) {
    if (Date.now() - started > FILERS_BUDGET_MS) break;
    let rows = [];
    let err = null;
    try {
      // eslint-disable-next-line no-await-in-loop
      rows = submissionsRows(await getSubmissions(f.cik), periods, edgarUrls);
      if (rows.length) {
        // eslint-disable-next-line no-await-in-loop
        const { error: e } = await admin
          .from('sec_filings')
          .upsert(rows, { onConflict: 'accession_no', ignoreDuplicates: true });
        if (e) err = e.message;
      }
    } catch (e) {
      err = String(e?.message || e);
    }
    // eslint-disable-next-line no-await-in-loop
    await admin
      .from('sec_13f_backfill_filers')
      .update({
        attempts: f.attempts + 1,
        checked_at: err ? null : new Date().toISOString(),
        filings_found: err ? null : rows.length,
        error: err ? err.slice(0, 300) : null,
      })
      .eq('cik', f.cik);
    if (err) failed += 1;
    else {
      checked += 1;
      found += rows.length;
    }
  }
  return { checked, found, failed, queued: (filers || []).length };
}

async function declareTotals(admin, periods, started) {
  const { data: rows } = await admin
    .from('sec_filings')
    .select('accession_no, cik')
    .eq('form_family', 'institutional')
    .in('period_of_report', periods)
    .or('table_entry_total.is.null,and(form_type.ilike.*/A,amendment_type.is.null)')
    .limit(400);
  let recorded = 0;
  let checked = 0;
  for (const f of rows || []) {
    if (Date.now() - started > DECLARE_BUDGET_MS) break;
    // Parsed filings only: an unparsed one gets its totals when it is parsed.
    // eslint-disable-next-line no-await-in-loop
    const { data: h } = await admin
      .from('sec_13f_holdings')
      .select('id')
      .eq('accession_no', f.accession_no)
      .limit(1);
    if (!h?.length) continue;
    checked += 1;
    try {
      // eslint-disable-next-line no-await-in-loop
      const index = await getFilingIndexJson({ cik: f.cik, accessionNo: f.accession_no });
      const doc = (index?.directory?.item || []).find((it) =>
        /primary_?doc\.xml$/i.test(it?.name || ''),
      );
      if (!doc) continue;
      const { base } = edgarUrls({ accessionNo: f.accession_no, cik: f.cik });
      // eslint-disable-next-line no-await-in-loop
      const cover = parseCover(await secFetchText(`${base}/${doc.name}`));
      const patch = {};
      if (cover.entries != null) {
        patch.table_entry_total = cover.entries;
        patch.table_value_total = cover.value;
      }
      if (cover.amendmentType) patch.amendment_type = cover.amendmentType;
      if (!Object.keys(patch).length) continue;
      // eslint-disable-next-line no-await-in-loop
      await admin.from('sec_filings').update(patch).eq('accession_no', f.accession_no);
      recorded += 1;
    } catch {
      /* next filing */
    }
  }
  return { checked, recorded, remaining: (rows || []).length - checked };
}

async function run(request) {
  const started = Date.now();
  const admin = getAdminClient();
  const { data: quarters, error } = await admin
    .from('sec_13f_backfill_quarters')
    .select('period, status')
    .in('status', ['backfilling', 'complete']);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const periods = (quarters || []).map((q) => String(q.period).slice(0, 10));
  if (!periods.length) return NextResponse.json({ ok: true, idle: true });

  await seedDays(admin, periods);

  // 0. Filers: the complete source for which filings exist.
  const { count: filersOpen } = await admin
    .from('sec_13f_backfill_filers')
    .select('cik', { count: 'exact', head: true })
    .is('checked_at', null)
    .lt('attempts', MAX_ATTEMPTS);
  if (filersOpen) {
    const filers = await discoverFilers(admin, periods, started);
    console.log('[sec-13f-backfill] filers', JSON.stringify(filers));
    return NextResponse.json({
      ok: true,
      phase: 'filers',
      periods,
      filers,
      open_before: filersOpen,
    });
  }

  // 1. Discover.
  const { count: open } = await admin
    .from('sec_13f_backfill_days')
    .select('day', { count: 'exact', head: true })
    .in('period', periods)
    .in('status', ['pending', 'failed'])
    .lt('attempts', MAX_ATTEMPTS);
  if (open) {
    const days = await discover(request, admin, periods, started);
    console.log(`[sec-13f-backfill] discover ${days.length} days`, JSON.stringify(days));
    return NextResponse.json({ ok: true, phase: 'discover', periods, days, open_before: open });
  }

  // 2. Parse.
  const parse = await readJson(
    await ingestHoldings(
      internal(
        request,
        `/api/cron/ingest-sec-holdings?periods=${periods.join(',')}&max13f=60&maxActivist=1&maxReparse=0`,
      ),
    ),
  );
  if (parse?.filings_13f > 0) {
    console.log(
      `[sec-13f-backfill] parsed ${parse.filings_13f} filings, ${parse.holdings_rows} rows`,
    );
    return NextResponse.json({ ok: true, phase: 'parse', periods, parse });
  }

  // 3. Declared totals for filings parsed before the parser recorded them.
  const declare = await declareTotals(admin, periods, Date.now());
  if (declare.recorded > 0 || declare.remaining > 0) {
    console.log('[sec-13f-backfill] declared totals', JSON.stringify(declare));
    return NextResponse.json({ ok: true, phase: 'declare', periods, declare, parse });
  }

  // 4. Check, and materialise what is complete.
  const checks = [];
  for (const period of periods) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error: e } = await admin.rpc('sec_13f_materialise_if_complete', {
      p_period: period,
    });
    checks.push({ period, ...(e ? { error: e.message } : data) });
  }
  console.log('[sec-13f-backfill] check', JSON.stringify(checks));
  return NextResponse.json({ ok: true, phase: 'check', periods, checks, parse });
}

export const GET = cronRoute('sec-13f-backfill', run, { ttlSeconds: 330 });
